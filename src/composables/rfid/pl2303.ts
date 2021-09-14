/* eslint-disable no-underscore-dangle */
/* eslint-disable max-classes-per-file */
/* eslint no-use-before-define: ["error", { "classes": false }] */
/*
 * Copyright for portions of usbserial are held by Andreas Gal (2017) as part
 * of pl2303. Based on pl2303 by Tidepool Project (2018). Copyright of additional
 * changes are held by Folleon GmbH.
 *
 * Prolific PL2303 user-space USB driver for WebUSB.
 *
 * SPDX-License-Identifier: MIT
 */
/// <reference types="w3c-web-usb" />

import { ComPort } from './Interfaces';

class Pl2303UnderlyingSink implements UnderlyingSink<Uint8Array> {
  // eslint-disable-next-line no-use-before-define
  private device_: Pl2303WebUsbSerial;

  private onError_: () => void;

  constructor(device: Pl2303WebUsbSerial, onError: () => void) {
    this.device_ = device;
    this.onError_ = onError;
  }

  async write(
    chunk: Uint8Array,
    controller: WritableStreamDefaultController,
  ): Promise<void> {
    try {
      const result = await this.device_.send(chunk);
      if (result.status !== 'ok') {
        controller.error(result.status);
        this.onError_();
      }
    } catch (error) {
      controller.error(error.toString());
      this.onError_();
    }
  }
}

class Pl2303UnderlyingSource implements UnderlyingSource<Uint8Array> {
  // eslint-disable-next-line no-use-before-define
  private device_: Pl2303WebUsbSerial;

  private onError_: () => void;

  constructor(device: Pl2303WebUsbSerial, onError: () => void) {
    this.device_ = device;
    this.onError_ = onError;
  }

  pull(controller: ReadableStreamDefaultController<Uint8Array>): void {
    (async (): Promise<void> => {
      try {
        const result = await this.device_.read(255);
        if (result.status !== 'ok') {
          controller.error(`USB error: ${result.status}`);
          this.onError_();
        }
        if (result.data?.buffer) {
          const chunk = new Uint8Array(
            result.data.buffer, result.data.byteOffset,
            result.data.byteLength,
          );
          controller.enqueue(chunk);
        }
      } catch (error) {
        controller.error(error.toString());
        this.onError_();
      }
    })();
  }
}

export default class Pl2303WebUsbSerial implements ComPort {
  device_: USBDevice;

  readable_: ReadableStream<Uint8Array> | null = null;

  writable_: WritableStream<Uint8Array> | null = null;

  constructor(device: USBDevice) {
    this.device_ = device;
  }

  public get readable(): ReadableStream<Uint8Array> | null {
    if (!this.readable_ && this.device_.opened) {
      this.readable_ = new ReadableStream<Uint8Array>(
        new Pl2303UnderlyingSource(this, () => { this.readable_ = null; }),
      );
    }
    return this.readable_;
  }

  public get writable(): WritableStream<Uint8Array> | null {
    if (!this.writable_ && this.device_.opened) {
      this.writable_ = new WritableStream(
        new Pl2303UnderlyingSink(
          this,
          () => { this.writable_ = null; },
        ),
      );
    }
    return this.writable_;
  }

  async open({ baudRate = 38400 }: { baudRate: number }) : Promise<void> {
    await this.device_.open();
    await this.device_.selectConfiguration(1);
    if (this.device_.configuration === undefined) throw new Error('error');
    await this.device_.claimInterface(
      this.device_.configuration.interfaces[0].interfaceNumber,
    );

    await this.vendorRead(0x8484, 0);
    await this.vendorWrite(0x0404, 0);
    await this.vendorRead(0x8484, 0);
    await this.vendorRead(0x8383, 0);
    await this.vendorRead(0x8484, 0);
    await this.vendorWrite(0x0404, 1);
    await this.vendorRead(0x8484, 0);
    await this.vendorRead(0x8383, 0);
    await this.vendorWrite(0, 1);
    await this.vendorWrite(1, 0);
    await this.vendorWrite(2, 0x44);
    await this.setBaudRate(baudRate);
    await this.vendorWrite(0x0, 0x0); // no flow control
    await this.vendorWrite(8, 0); // reset upstream data pipes
    await this.vendorWrite(9, 0);
  }

  async setBaudRate(baudRate: number): Promise<void> {
    const currentConfiguration = await this.device_.controlTransferIn(
      {
        recipient: 'interface',
        requestType: 'class',
        request: 0x21, // get configuration command
        value: 0,
        index: 0,
      },
      7, // read 7 bytes
    );

    if (currentConfiguration.data === undefined) throw new Error('error');
    const baudRateConfiguration = new DataView(
      currentConfiguration.data.buffer,
    );
    baudRateConfiguration.setInt32(0, baudRate, true); // baud rate, little-endian
    baudRateConfiguration.setInt8(4, 0); // 1 stop bit
    baudRateConfiguration.setInt8(5, 0); // no parity
    baudRateConfiguration.setInt8(6, 8); // 8 bit characters

    await this.device_.controlTransferOut(
      {
        recipient: 'interface',
        requestType: 'class',
        request: 0x20, // configuration command
        value: 0,
        index: 0,
      },
      baudRateConfiguration.buffer,
    );
  }

  async vendorRead(value: number, index: number): Promise<USBInTransferResult> {
    return this.device_.controlTransferIn(
      {
        requestType: 'vendor',
        recipient: 'device',
        request: 0x01,
        value,
        index,
      },
      1,
    );
  }

  async vendorWrite(value: number, index: number): Promise<USBOutTransferResult> {
    return this.device_.controlTransferOut({
      requestType: 'vendor',
      recipient: 'device',
      request: 0x01,
      value,
      index,
    });
  }

  async read(numberOfBytes: number, endpointNumber = 3): Promise<USBInTransferResult> {
    return this.device_.transferIn(endpointNumber, numberOfBytes);
  }

  async send(dataAsBytes: BufferSource, endpointNumber = 2): Promise<USBOutTransferResult> {
    return this.device_.transferOut(endpointNumber, dataAsBytes);
  }

  async close(): Promise<void> {
    return this.device_.close();
  }
}
