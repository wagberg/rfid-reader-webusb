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

  private writeable: WritableStream<Uint8Array> | null = null;

  private readable: ReadableStream<RfidResponse> | null = null;

  ready: Promise<void>;

  private baudRate = 38400;

  constructor(port: ComPort) {
    this.port = port;
    this.ready = this.connect();
  }

  async connect(): Promise<void> {
    try {
      await this.port.open({ baudRate: this.baudRate });
      if (
        this.port.readable == null
        || this.port.writable == null
      ) throw new RFIDError('Redable or writeable is null');
      this.readable = this.port.readable
        .pipeThrough(new TransformStream(new SerialToFrame()))
        .pipeThrough(new TransformStream(new FrameToData()));
      this.writeable = this.port.writable;
      const isValidReader = await this.validateReader();
      if (isValidReader) {
        this.connected = true;
      } else {
        throw new RFIDError('The reader is not the correct model.');
      }
    } catch (error) {
      console.error(error);
      this.port.close();
    }
  }

  async disconnect(): Promise<void> {
    if (this.readable) await this.readable.getReader().cancel();
    if (this.writeable) await this.writeable.getWriter().close();
    await this.port.close();
    this.connected = false;
  }

  async writeRequest(req: RFIDFrame): Promise<RfidResponse> {
    if (this.writeable == null) throw new RFIDError('writable is null');
    if (this.readable == null) throw new RFIDError('readable was null');
    const reader = this.readable.getReader();
    const writer = this.writeable.getWriter();
    const frame = req.frame();
    await writer.write(Uint8Array.from([0xAA, 0xDD, 0x00, frame.length]));
    await writer.write(frame);
    writer.releaseLock();
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
