/* eslint-disable no-plusplus */
/* eslint-disable no-bitwise */
/* eslint-disable max-classes-per-file */

// import RfidIOError from './Errors';
import { LedColor, ReturnStatus } from './Interfaces';
import Tag from './Tag';

export class RfidResponse {
  opCode: Uint8Array;

  status: ReturnStatus;

  data: Uint8Array;

  constructor(opCode: Uint8Array, status: number, data: Uint8Array) {
    this.opCode = opCode;
    this.status = status;
    this.data = data;
  }
}

export abstract class RFIDFrame {
  name: string;

  private opCode: Uint8Array;

  private requestData: Uint8Array = new Uint8Array();

  constructor(name: string, opCode: Array<number>, data: Array<number> = []) {
    this.name = name;
    this.opCode = new Uint8Array(opCode);
    this.requestData = new Uint8Array(data);
  }

  static checksum(v: Uint8Array): number {
    return v.reduce((prev, curr) => prev ^ curr, 0);
  }

  public frame() : Uint8Array {
    const buffer = new Uint8Array(255);
    buffer.set(this.opCode);
    let i = 2;
    for (let j = 0; j < this.requestData.length; j++) {
      const byte = this.requestData[j];
      buffer[i++] = byte;
      if (byte === 0xAA) {
        buffer[i++] = 0xAA;
      }
    }
    buffer[i++] = RFIDFrame.checksum(buffer.slice(0, i));
    return buffer.slice(0, i);
  }
}

/**
 * Class representing the request model info command.
 */
export class ModelInfo extends RFIDFrame {
  constructor() {
    super('Model info', [0x01, 0x02]);
  }
}

/**
 * Class representing the beep command.
 */
export class Beep extends RFIDFrame {
  /**
   * @param duration - Duration of beep between 0 and 255, where 0 is continuously.
   */
  constructor(duration = 5) {
    if (duration > 255 || duration < 0) {
      throw new RangeError(`Duration must be between 0 and 255. Was ${duration}.`);
    }
    super('Beep', [0x01, 0x03], [duration]);
  }
}

/**
 * Class representing a request to set LED color
 */
export class SetLedColor extends RFIDFrame {
  /**
   * @param color - set color
   */
  constructor(color: LedColor) {
    super('Set led color', [0x01, 0x04], [color]);
  }
}

/**
 * Class representing request to read tag.
 */
export class ReadTag extends RFIDFrame {
  constructor() {
    super('Read tag', [0x01, 0x0C]);
  }
}

/**
 * Abstract class for request to write tag.
 */
abstract class WriteTag extends RFIDFrame {
  private tag: Tag;

  private locked: boolean;

  constructor(name: string, tag: Tag, opcode: Array<number>, locked = false) {
    const lock = locked ? 0x01 : 0x00;
    super(name, opcode, [lock, ...tag.tag()]);
    this.tag = tag;
    this.locked = locked;
  }
}

/**
 * Class to represent first tag write method.
 */
export class WriteTag2 extends WriteTag {
  /**
   * @param tag - tag to write
   * @param locked - make tag to read only
   */
  constructor(tag: Tag, locked = false) {
    super('Write tag 2', tag, [0x02, 0x0C], locked);
  }
}

/**
 * Class to represent second tag write method.
 */
export class WriteTag3 extends WriteTag {
  /**
   * @param tag - tag to write
   * @param locked - make tag to read only
   */
  constructor(tag: Tag, locked = false) {
    super('Write tag 3', tag, [0x03, 0x0C], locked);
  }
}
