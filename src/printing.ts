import * as Colors from "https://deno.land/std/fmt/colors.ts";
export { Colors };

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
  gray,
  bold: bb,
  underline: uu,
  italic: ii,
} = Colors;
// export const red = Colors.brightRed;
// export const red2 = Colors.red;
// export const green = Colors.brightGreen;
// export const blue = Colors.brightBlue;
// export const cyan = Colors.cyan;
// export const yellow = Colors.yellow;
// export const emph = Colors.italic;

export const $type = function (str: string | Record<string, any>) {
  let strr = (typeof str == "object")
    ? Deno.inspect(str, { depth: 10 }) : str;

  const color = (style: (s: string) => string) => (_: string, p1: string, p2: string) => p1 + style(p2);
  const rules = [
    [ /(\w*: )"(lambda|variable|call|assign)"/g, color(red) ],
    [ /(\w*: )"(NUM|STR|SYM|OP|KEY)"/g, color(blue0) ],
    [ /(\w*: )"(block|binary)"/g, color(green) ],
    [ /(\w*: )"(and|or|comparison|equality|term|factor)"/g, color(yellow) ],
    [ /(\w*: )(null)/g, color(ii) ],
    [ /(\w*: )(\d+)/g, color(green0) ],
  ];
  rules.forEach(([ p, c ]) => {
    strr = strr.replace(<RegExp> p, <{ (...s: string[]): string; }> c);
  });

  return strr;
};

// cli
export const MAX_COLUMNS = 78;
export const PROMPT = "w> ";
export const INTRO = ` ${ Colors.brightRed("w") }yg ~ ${ Colors.italic(":q | :s | :r")
  }`;
