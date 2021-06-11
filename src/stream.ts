export class Stream {
  pos = 0;
  line = 1;
  col = 0;
  end: number;
  constructor (private source: string) {
    this.end = source.length;
  }
  peek () {
    return this.source.charAt(this.pos);
  }
  after () {
    return this.source.charAt(this.pos + 1);
  }
  next () {
    const char = this.source.charAt(this.pos++);
    if (char == '\n') this.col = 0, this.line++;
    return char;
  }
  eof () {
    return this.pos >= this.end;
  }
  error (msg: string) {
    throw new Error(`${ msg } at (${ this.line }:${ this.col })`);
  }
}