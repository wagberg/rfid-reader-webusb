/* eslint-disable no-underscore-dangle */
/// <reference types="w3c-web-serial" />
import { CommTagError, NoTagError, RFIDError } from './Errors';
import { SerialToFrame, FrameToData } from './Transformers';
import { ComPort, LedColor, ReturnStatus } from './Interfaces';
import Tag from './Tag';
import {
  RFIDFrame,
  ModelInfo,
  RfidResponse,
  ReadTag,
  SetLedColor,
  Beep,
  WriteTag2,
  WriteTag3,
} from './Comands';
import Semaphore from './Semaphore';

export default class RfidReader {
  private port: ComPort;

  private connected_ = false;

  private writable_: WritableStream<Uint8Array> | null = null;

  private readable_: ReadableStream<RfidResponse> | null = null;

  private semaphore = new Semaphore(1);

  private static baudRate = 38400;

  static productId = 0x2303;

  static vendorId = 0x067b;

  constructor(port: ComPort) {
    this.port = port;
  }

  public async connect(): Promise<void> {
    try {
      await this.port.open({ baudRate: RfidReader.baudRate });
      const isValidReader = await this.validateReader();
      if (isValidReader) {
        this.connected_ = true;
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

  public get isConnected(): boolean {
    return this.connected_;
  }

  private get readable(): ReadableStream<RfidResponse> | null {
    if (!this.readable_ && this.port.readable) {
      this.readable_ = this.port.readable
        .pipeThrough(new TransformStream(new SerialToFrame()))
        .pipeThrough(new TransformStream(new FrameToData()));
    }
    return this.readable_;
  }

  private get writable(): WritableStream<Uint8Array> | null {
    if (!this.writable_ && this.port.writable) {
      this.writable_ = this.port.writable;
    }
    return this.writable_;
  }

  public async disconnect(): Promise<void> {
    if (this.readable_) {
      try {
        await this.readable_.cancel('Disconnecting');
      } catch (e) {
        if (e instanceof DOMException && e.code === 19) {
          console.error(e.message);
        } else {
          throw e;
        }
      }
    }
    if (this.writable_) {
      try {
        await this.writable_.abort('Disconnecting');
      } catch (e) {
        console.error(e);
      }
    }
    await this.port.close();
    this.connected_ = false;
  }

  /**
   * Set device led color
   * @param color color
   * @returns status code
   */
  private async setLedColor(color: LedColor): Promise<ReturnStatus> {
    const { status } = await this.writeFrame(new SetLedColor(color));
    return status;
  }

  /**
   * Make device beep for approximately `time`/255 seconds.
   * @param time beep time. 0 for continuously.
   * @returns status code
   */
  private async beep(time: number): Promise<ReturnStatus> {
    const { status } = await this.writeFrame(new Beep(time));
    return status;
  }

  /**
   * Read a tag from device.
   * @param playSound play confirmation sound on device
   * @returns tag
   */
  public async readTag(playSound = false) : Promise<Tag> {
    const { status, data } = await this.writeFrame(new ReadTag());
    switch (status) {
      case ReturnStatus.OK:
        await this.setLedColor(LedColor.GREEN);
        if (playSound) await this.beep(5);
        // setTimeout(async () => this.setLedColor(LedColor.NONE), 300);
        return new Tag(data);
      case ReturnStatus.NoToken:
        await this.setLedColor(LedColor.RED);
        if (playSound) await this.beep(20);
        // setTimeout(async () => this.setLedColor(LedColor.NONE), 500);
        throw new NoTagError();
      default:
        throw new CommTagError();
    }
  }

  /**
   * Write tag `tag`. Tries two different methods and reads the tag to confirm
   * sucessful write.
   * @param tag tag to write
   * @param playSound play confirmation sound on device
   */
  public async writeTag(tag: Tag, playSound = false): Promise<void> {
    let tagWritten;
    let status;
    ({ status } = await this.writeFrame(new WriteTag2(tag)));
    if (status !== ReturnStatus.OK) throw new RFIDError('Error executing WriteTag2');
    tagWritten = await this.readTag(false);
    if (tagWritten.equals(tag)) {
      await this.setLedColor(LedColor.GREEN);
      if (playSound) await this.beep(5);
      setInterval(() => this.setLedColor(LedColor.NONE), 1000);
      return;
    }
    ({ status } = await this.writeFrame(new WriteTag3(tag)));
    if (status !== ReturnStatus.OK) throw new RFIDError('WriteTag3');
    tagWritten = await this.readTag(false);
    if (tagWritten.equals(tag)) {
      await this.setLedColor(LedColor.GREEN);
      if (playSound) await this.beep(5);
      setInterval(() => this.setLedColor(LedColor.NONE), 1000);
      return;
    }
    await this.setLedColor(LedColor.RED);
    if (playSound) await this.beep(20);
    setInterval(() => this.setLedColor(LedColor.NONE), 1000);
  }

  /**
   * Request model string from device.
   * @returns model string
   */
  public async getModelInfo(): Promise<string> {
    const { data } = await this.writeFrame(new ModelInfo());
    return new TextDecoder().decode(data);
  }

  /**
   * Write a frame to device.
   * @param data Raw binary data to write.
   */
  private async writeRaw(data: Uint8Array): Promise<void> {
    if (this.writable == null) throw new RFIDError('Writer is null');
    const writer = this.writable.getWriter();
    await writer.ready;
    try {
      await writer.write(Uint8Array.from(data));
    } finally {
      writer.releaseLock();
    }
  }

  /**
   * Read a frame from the device.
   * @returns rfid response.
   */
  private async readRaw(): Promise<RfidResponse> {
    if (this.readable == null) throw new RFIDError('reader is null');
    const reader = this.readable.getReader();
    try {
      const { done, value } = await reader.read();
      if (done || value === undefined) throw new RFIDError('Reader returned undefined value');
      return value;
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Write frame to device and wait for resonse.
   * Uses a semaphore to only queue writes before response has been read.
   * @param frame Frame to write
   * @returns Rfid response
   */
  public async writeFrame(frame: RFIDFrame): Promise<RfidResponse> {
    return this.semaphore.with(async () => {
      const f = frame.frame();
      await this.writeRaw(Uint8Array.from([0xAA, 0xDD, 0x00, f.length, ...f]));
      const value = await this.readRaw();
      return value;
    });
  }

  /**
   * Validates the reader
   * @returns A promise that resolves when the reader has been validated.
   */
  private async validateReader(): Promise<boolean> {
    const id = await this.getModelInfo();
    return (id === 'ID card reader & writer');
  }
}
