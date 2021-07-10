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
    if (char == "\n") this.col = 0, this.line++;
    else this.col++;
    return char;
  }
  eof () {
    return this.peek() == "";
  }
  error (msg: string) {
    // Stream.streamError(this, msg);
    const message = `${ msg } at (${ this.line }:${ this.col })`;
    const snippet = `\n\n  [${ this.line }] · ${ this.source.slice(this.pos - this.col, this.col) }\n  ${ '-'.repeat((this.line + '').length + 4 + this.col) }^`;

    throw new Error(`${ message }${ snippet }`);
  }
  // get line up to corrent position for logging
  row () {
    return this.source.slice(this.pos - this.col, this.col);
  }
  // static async streamError (stream: Stream, message: string) {
  //   const { red, ii, blue0, gray } = await import("../printing.ts");

  //   const indicator = [
  //     " ".repeat(stream.col), red("^"),
  //   ].join("");
  //   const row = stream.source.slice(0, stream.col);
  //   const loc = `${ ii("at") } (${ blue0(stream.line + ":" + stream.col)
  //     })`;
  //   const gutter = (stream.line + "   ").split("").map((_) => " ").join("");
  //   return [
  //     message + ", instead got " + stream.peek(),
  //     // gutter and vert divider
  //     "",
  //     // line number | source code slice
  //     " " + stream.line + "|  " + row,
  //     // arrow pointing to stream position of source code slice
  //     gutter + " " + indicator,
  //     " ".repeat((indicator).length) + gray("... ") + loc,
  //   ].join("\n");
  // }
}
