
// lexeme kinds, used by lexer, parser, and interpreter
export enum Type {
  KW = "KW",
  BOOL = "BOOL",
  STR = "STR",
  NUM = "NUM",
  SYM = "SYM",
  OP = "OP",
  PUNCT = "PUNCT",
  EOF = "EOF",
}

// line comment `~~`, block comment `~* <lines> *~`
export enum Comment {
  TILDE = '~', STAR = '*'
}

export const KW = [ "let", "if", "then", "else", "true", "false" ];

export type Prim = string | number | boolean;

export type Atom<T> = Token & { value: T & Prim };

export interface Position {
  line: number;
  col: number;
}

export interface Lexeme {
  type: Type;
  value: Prim;
  literal: string;
  position: Position;
}

export class Token implements Lexeme {
  literal: string;
  constructor(
    public type: Type,
    public value: Prim,
    public position: Position,
    literal?: string,
  ) {
    if (!literal) this.literal = value + "";
    else this.literal = literal;
  }
  get end() {
    return this.position.col + this.literal.length;
  }
  typeIs(t: string | Type) {
    return (this.type === t);
  }
  typeIn(...types: Type[]) {
    for (const t of types) {
      if (this.type === t) {
        return true;
      }
    }
    return false;
  }
  validate(type: Type, ...literal: string[]) {
    if (type !== this.type) return false;
    for (const val of literal) {
      if (val === this.literal) return true;
    }
    return false;
  }
  // TODO: unify shape of objects shown in error logging
  _json() {
    const { line, col } = this.position;
    return { type: Type[this.type], value: this.value, line, col };
    // return  //`{ type: ${ Type[ this.type ] }, value: ${ this.value }, line: ${ this.line }, col: ${ this.col } }`;
  }
  toJSON() {
    return `${this.type} \`${this.literal}\` @ (${this.position.line}:${this.position.col}`;
  }
}

export default { Type, KW, Token };
