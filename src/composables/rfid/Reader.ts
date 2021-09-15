/* eslint-disable no-underscore-dangle */
/// <reference types="w3c-web-serial" />
import { RFIDError } from './Errors';
import { SerialToFrame, FrameToData } from './Transformers';
import { ComPort } from './Interfaces';
import {
  RFIDFrame,
  ModelInfo,
  RfidResponse,
} from './Comands';

export default class RfidReader {
  private port: ComPort;

  connected = false;

  private writable_: WritableStream<Uint8Array> | null = null;

  private readable_: ReadableStream<RfidResponse> | null = null;

  ready: Promise<void>;

  private baudRate = 38400;

  constructor(port: ComPort) {
    this.port = port;
    this.ready = this.connect();
  }

  public async connect(): Promise<void> {
    try {
      await this.port.open({ baudRate: this.baudRate });
      const isValidReader = await this.validateReader();
      if (isValidReader) {
        this.connected = true;
      } else {
        throw new RFIDError('The reader is not the correct model.');
      }
    } catch (error) {
      if (error instanceof DOMException) {
        throw error;
      }
      console.error(error);
      this.port.close();
    }
  }

  public get readable(): ReadableStream<RfidResponse> | null {
    if (!this.readable_ && this.port.readable) {
      this.readable_ = this.port.readable
        .pipeThrough(new TransformStream(new SerialToFrame()))
        .pipeThrough(new TransformStream(new FrameToData()));
    }
    return this.readable_;
  }

  public get writable(): WritableStream<Uint8Array> | null {
    if (!this.writable_ && this.port.writable) {
      this.writable_ = this.port.writable;
    }
    return this.writable_;
  }

  async disconnect(): Promise<void> {
    if (this.readable) await this.readable.getReader().cancel('Disconnecting');
    if (this.writable) await this.writable.getWriter().close();
    await this.port.close();
    this.connected = false;
  }

  async writeRequest(frame: RFIDFrame): Promise<RfidResponse> {
    if (this.writable == null) throw new RFIDError('writable is null');
    if (this.readable == null) throw new RFIDError('readable was null');
    const f = frame.frame();

    const writer = this.writable.getWriter();
    await writer.write(Uint8Array.from([0xAA, 0xDD, 0x00, f.length, ...f]));
    writer.releaseLock();

    const reader = this.readable.getReader();
    const { done, value } = await reader.read();
    reader.releaseLock();

    if (done || value === undefined) throw new RFIDError('reader returned undefined value');
    return value;
  }

  /**
   * Validates the reader
   * @returns A promise that resolves when the reader has been validated.
   */
  async validateReader(): Promise<boolean> {
    const { data } = await this.writeRequest(new ModelInfo());
    const id = new TextDecoder().decode(data);
    return id === 'ID card reader & writer';
  }
}
