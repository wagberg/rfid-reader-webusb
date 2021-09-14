/* eslint-disable no-plusplus */
/* eslint-disable max-classes-per-file */

import { RfidResponse } from './Comands';
import { IOError, ChecksumError } from './Errors';

/**
 * Class to transform complete frames of data to `RfidResponse`
 */
export class FrameToData extends TransformStream<Uint8Array> {
  // eslint-disable-next-line class-methods-use-this
  transform(
    chunk: Uint8Array,
    controller: TransformStreamDefaultController,
  ): void {
    const opCode = chunk.slice(0, 2);
    const status = chunk[2];
    const data = chunk.slice(3, -1);
    // eslint-disable-next-line no-bitwise
    if (chunk.reduce((prev, curr) => prev ^ curr, 0) !== 0) {
      throw new ChecksumError('Got the wrong checksum');
    }
    const response = new RfidResponse(opCode, status, data);
    controller.enqueue(response);
  }
}

/**
 * Class to transform raw serial data from rader to complete frames.
 */
export class SerialToFrame extends TransformStream<Uint8Array> {
  private buffer = new Uint8Array(255)

  private bufferPointer = 0;

  private currentDataLength = -1

  async transform(
    chunk: Uint8Array,
    controller: TransformStreamDefaultController<Uint8Array>,
  ): Promise<void> {
    // Save data to buffer
    this.buffer.set(chunk, this.bufferPointer);
    this.bufferPointer += chunk.length;

    // Set cuurentDataLength if we have read at least 4 bytes
    if (this.currentDataLength === -1 && this.bufferPointer >= 4) {
      if (this.buffer[0] !== 0xAA || this.buffer[1] !== 0xDD) {
        throw new IOError(`Message from reader does not start with [0xAA, 0xDD]. Got [${this.buffer.slice(0, 2)}`);
      }
      this.currentDataLength = 255 * this.buffer[2] + this.buffer[3] + 4;
    }

    if (this.currentDataLength !== -1 && this.bufferPointer >= this.currentDataLength) {
      // We have read the complete dataframe,
      // Replace [0xAA 0x00] with [0xAA].
      const frame = [];
      let j = 4;
      while (j < this.currentDataLength) {
        const byte = this.buffer[j++];
        frame.push(byte);
        if (byte === 0xAA && this.buffer[j] === 0x00) j++;
      }
      controller.enqueue(new Uint8Array(frame));

      this.buffer.set(this.buffer.slice(this.currentDataLength));
      this.buffer.fill(0, this.currentDataLength);
      this.bufferPointer -= this.currentDataLength;
      this.currentDataLength = -1;
    }
  }

  flush(controller: TransformStreamDefaultController): void {
    controller.enqueue(this.buffer.slice(0, this.bufferPointer));
  }
}

export class HexToBinaryTransformer extends TransformStream {
  public static transform(chunk: string, controller: TransformStreamDefaultController): void {
    const v = chunk.toUpperCase().match(/[0-9A-F]{1,2}/g)?.map(
      (byte) => parseInt(byte, 16),
    );
    if (v !== undefined) controller.enqueue(Uint8Array.from(v));
  }
}

export class BinaryToHexTransformer extends TransformStream {
  public static transform(
    chunk: Uint8Array,
    controller: TransformStreamDefaultController,
  ): void {
    const s = chunk.reduce(
      (str: string, byte: number) => str + String(byte.toString(16).padStart(2, '0').toUpperCase()),
      '',
    );
    controller.enqueue(s);
  }
}
