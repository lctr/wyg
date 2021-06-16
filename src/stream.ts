export class Stream {
  pos = 0;
  line = 1;
  col = 0;
  end: number;
  constructor (private source: string) {
    // to handle unicode chars with combining characters as 1 char if possible
    // source = source.normalize();
    this.source = source;
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
    else this.col++; 
    return char;
  }
  eof () {
    return this.peek() == '';
  }
  error (msg: string) {
    const message = `${ msg } at (${ this.line }:${ this.col })`;
    const snippet = `\n\n  [${ this.line }] · ${ this.source.slice(this.pos - this.col, this.col) }\n`;
    
    throw new Error(`${message}${snippet}`);
  }
  // get line up to corrent position for logging
  row () {
    return this.source.slice(this.pos - this.col, this.col);
  }
}