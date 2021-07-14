export interface Streamable<T> {
  peek (): T;
  after?(): T;
  next (): T;
  error (message: string): void;
}

export class Stream implements Streamable<string> {
  pos = 0;
  line = 1;
  col = 0;
  readonly end: number;
  constructor (private source: string) {
    // to handle unicode chars with combining characters as 1 char if possibl
    this.source = source.normalize();
    this.end = this.source.length;
  }
  peek () {
    return this.source.charAt(this.pos);
  }
  after () {
    return this.source.charAt(this.pos + 1);
  }
  next () {
    const char = this.source.charAt(this.pos++);
    if (char == "\n") this.col = 0, this.line++;
    else this.col++;
    return char;
  }
  eof () {
    return this.peek() == "";
  }
  get #row () {
    return this.source.slice(this.pos - this.col, this.col);
  }
  get #divider () {
    return '-'.repeat(`${ this.line }`.length + this.col + 4);
  }
  get #indicator () {
    return '^'.repeat(Math.max(1, this.pos - this.#row.lastIndexOf(' ') - 1));
  }
  error (msg: string) {
    // Stream.streamError(this, msg);
    const message = `${ msg } at (${ this.line }:${ this.col })`;
    const snippet = '\n\n  ['
      + this.line + '] · '
      + this.#row + '\n  '
      + this.#divider
      + this.#indicator;

    throw new Error(`${ message }${ snippet }`);
  }
  // get line up to corrent position for logging
  row () {
    return this.source.slice(this.pos - this.col, this.col);
  }
}

