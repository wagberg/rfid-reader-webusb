/* eslint-disable max-classes-per-file */

export class RFIDError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RFIDError';
  }
}

export class IOError extends RFIDError {
  constructor(message: string) {
    super(message);
    this.name = 'IOError';
  }
}

export class ChecksumError extends RFIDError {
  constructor(message: string) {
    super(message);
    this.name = 'ChecksumError';
  }
}

export class TagError extends RFIDError {
  constructor(message: string) {
    super(message);
    this.name = 'TagError';
  }
}
