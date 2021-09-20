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

export class NoTagError extends TagError {
  constructor(message = 'No tag present') {
    super(message);
    this.name = 'NoTagError';
  }
}

export class CommTagError extends TagError {
  constructor(message = 'Error communicating with tag') {
    super(message);
    this.name = 'CommTagError';
  }
}
