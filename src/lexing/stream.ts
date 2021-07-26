export interface Position {
  line: number;
  col: number;
  pos: number;
}

export interface Streamable<T> {
  eof(): boolean,
  peek(): T,
  next(): T,
  error(message: string): void,
  after?(): T,
}

export class Stream implements Streamable<string> {
  pos = 0;
  line = 1;
  col = 0;
  #eol: Position = { pos: this.pos, line: this.line, col: this.col };
  readonly end: number;

  constructor (private source: string) {
    // to handle unicode chars with combining characters as 1 char if possibl
    this.source = source.replace(/(?:\r?\n)/g, "\n").normalize();
    this.end = this.source.length;
  }
  peek() {
    return this.source.charAt(this.pos);
  }
  after() {
    return this.source.charAt(this.pos + 1);
  }
  next() {
    const char = this.source.charAt(this.pos++);
    if (char == "\n") this.col = 0,
      this.line++,
      this.#eol = { pos: this.pos, line: this.line, col: this.col };
    else this.col++;
    return char;
  }
  eof() {
    return this.peek() == "";
  }
  get eol() {
    return (({ pos, line, col }) => ({ pos, line, col }))(this);
  }
  set eol({ pos, line, col }: Position) {
    this.#eol = { pos, line, col };
  }
  error(msg: string) {
    // TODO: test for edge cases
    const pre = this.#eol, curr = this.eol;
    const wNum = ({ line }: Position) => `${ line }`.length;

    const pRow = this.source.slice(pre.pos - pre.col, pre.pos);
    const cRow = this.source.slice(pre.pos, curr.pos);
    const gutter = [ pre, curr ].map(x => `[${ x.line + ' '.repeat(wNum(curr) - wNum(x)) }] · `);
    const divider = '-'.repeat(gutter[ 1 ].length - 2 + (curr.col > 0
      ? curr.col : pre.col));
    const indicator = '^'.repeat(((w) => w[ w.length - 1 ])(cRow.split(/\s/)).length || 1);
    const message = `${ msg } at (${ curr.line }:${ curr.col })`;
    let quoted = gutter[ 1 ] + cRow;
    if (pre.line != curr.line) quoted = gutter[ 0 ] + pRow + "\n" + quoted;
    const snippet = [
      "\n",
      quoted,
      divider + indicator
    ].join("\n");
    throw new Error(`${ message }${ snippet }`);
  }
  row() {
    return this.source.slice(this.pos - this.col, this.col);
  }
}