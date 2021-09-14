/* eslint-disable no-shadow */
export const enum LedColor {
    NONE = 0x00,
    RED = 0x01,
    GREEN = 0x02,
}

export const enum ReturnStatus {
    OK = 0x00,
    NoToken = 0x01,
    CommError = 0x02,
    CommError2 = 0x03,
}

export interface ComPort {
    open: (options: {baudRate: number}) => Promise<void>;
    writable: WritableStream<Uint8Array> | null;
    readable: ReadableStream<Uint8Array> | null;
    close: () => Promise<void>;
  }
