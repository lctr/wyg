import { Colors, BufReader, BufWriter, TextProtoReader } from "../deps.ts";

// theme?
export const {
  red,
  brightRed: red0,
  blue,
  brightBlue: blue0,
  green,
  brightGreen: green0,
  cyan,
  brightCyan: cyan0,
  yellow,
  brightYellow: yellow0,
  black,
  brightBlack: black0,
  gray,
  brightWhite: white0,
  bold: bb,
  underline: uu,
  italic: ii,
  magenta,
  brightMagenta: magenta0,
  reset, rgb8, rgb24
} = Colors;


export class Tree {
  static depth = 10;
  #obj: { [ s: string ]: unknown; } | string;
  #exception!: Error;
  get depth () {
    return (Object.entries(this.#obj).length > 5)
      ? 5 : Tree.depth;
  }
  set depth (n) {
    Tree.depth = n ?? 5;
  }
  constructor (obj = {}) {
    if (typeof obj == 'function') {
      this.#obj = `<${ obj.name }>`;
    }
    else {
      this.#obj = obj;
    }
    if (obj instanceof Error) {
      this.#exception = obj;
    }
  }
  get type () {
    if (typeof this.obj == "object") {
      if (!('type' in this.obj)) {
        return null;
      } else {
        return this.obj.type;
      }
    }
    return null;
  }
  get obj () {
    return this.#obj;
  }
  [ Deno.customInspect ] () {
    type Forms<K> = number | string | boolean | K[] | K;
    const table = <K> (arg: K) => typeof arg != "object" ? arg : Array.isArray(arg) ? arg : Object.entries(arg);
    let level = table(this.#obj);

  }
  print () {
    return this.type ? Deno.inspect(this.obj, { colors: true, depth: this.depth }) : <string> this.#obj;
  }
  beautify (log = false) {
    if (this.type != 'Error') {
      let printed = this.print();
      type Fold = (...s: string[]) => string;
      type Style = (s: string) => string;
      const color = (style: Style) => (...s: string[]) => s[ 1 ] + style(s[ 2 ]);
      const rules = [
        [ /(\w*: )"(lambda|variable|call|assign|block|binary)"/g, red ],
        [ /(\w*: )"(NUM|STR|SYM|OP|KEY|BOOL)"/g, green ],
        [ /(\w*: )"(and|or|comparison|equality|term|factor)"/g, red0 ],
        [ /(\w*: )(null|undefined|Fn)/g, gray ],
        [ /(\w*: )(\d+)/g, green0 ],
        [ /(\w*: )("[^"]*?")/g, black0 ],
        [ /(\-+)(\^+)/, red ],
      ];

      rules.forEach(([ p, c ]) => {
        printed = printed.replace(<RegExp> p, color(<Fold> c));
      });

      if (log) console.log(printed);

      return printed;
    }
    else return this.#exception;
  }
  static print (e = {}) {
    return new Tree(e).print();
  }
  static beautify (e = {}) {
    return new Tree(e).beautify();
  }
}

export enum EOL {
  LF = "\n",
  CRLF = "\r\n",
}
const NL = /(?:\r?\n)/g;
export const match = (input: string): EOL | null => {
  const match = input.match(NL);
  if (!match || match.length === 0) return null;
  return match.some((str) => str === EOL.CRLF)
    ? EOL.CRLF : EOL.LF;
};
export const fmtEol = (input: string, eol: EOL) => {
  return input.replace(NL, eol);
};

export function stringify<T> (expr: T, depth = 5) {
  return Deno.inspect(expr, { colors: true, depth });
}