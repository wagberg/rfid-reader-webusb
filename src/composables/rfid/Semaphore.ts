export default class Semaphore {
  /**
   * Number of allocated resources
   */
  private counter = 0;

  /**
   * Queued processes
   */
  private waiting: Array<{
    resolve: (value: void | PromiseLike<void>) => void,
    err: (reason?: string) => void }> = [];

  private max: number;

  constructor(max = 1) {
    this.max = max;
  }

  take(): void {
    if (this.waiting.length > 0 && this.counter < this.max) {
      this.counter += 1;
      const promise = this.waiting.shift();
      if (promise) promise.resolve();
    }
  }

  acuire(): Promise<void> {
    if (this.counter < this.max) {
      this.counter += 1;
      const promise = new Promise<void>((resolve) => { resolve(); });
      return promise;
    }
    return new Promise<void>((resolve, err) => { this.waiting.push({ resolve, err }); });
  }

  release(): void {
    this.counter -= 1;
    this.take();
  }

  /**
   * Purge all waiting processes.
   * @returns number of purges processes
   */
  purge(): number {
    const unresolved = this.waiting.length;

    this.waiting.forEach((promise) => {
      promise.err('Task has been purged');
    });
    this.counter = 0;
    this.waiting = [];

    return unresolved;
  }

  async with<T>(cb: () => T): Promise<T> {
    await this.acuire();
    try {
      return cb();
    } finally {
      this.release();
    }
  }
}
