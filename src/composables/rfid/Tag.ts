import { TagError } from './Errors';

export default class Tag {
  data: Array<number>;

  constructor(tag: Array<number> | Uint8Array = [0x00, 0x00, 0x00, 0x00, 0x00]) {
    if (tag.length !== 5) throw new TagError(`Wrong tag length. Expected 5, got ${tag.length}`);
    this.data = Array.from(tag);
  }

  tag(): Array<number> {
    return this.data.slice();
  }

  public get length() : number {
    return this.data.length;
  }

  equals(tag: Tag): boolean {
    return (
      tag.length === this.length
      && this.data.every((value, index) => value === tag.data[index])
    );
  }

  toString(): string {
    return this.data.reduce((s, byte) => `${s} ${byte.toString(16).padStart(2, '0')}`, '');
  }
}
