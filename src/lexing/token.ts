// lexeme kinds, used by lexer, parser, and interpreter
export enum Atom {
  KW = "Keyword",
  META = "Meta",
  BOOL = "Bool",
  STR = "String",
  NUM = "Number",
  REF = "Reference",
  SYM = "Symbol",
  OP = "Operator",
  PUNCT = "Punctuation",
  EOF = "EOF",
}

// line comment `~~`, block comment `~* <lines> *~`
export enum Comment {
  TILDE = "~",
  STAR = "*",
}

// string enums for operators since they pop up across (lexer,) parser and evaluator
export enum Op {
  DEF = "=", ASSIGN = "=", // changing this to something else ASSIGN = "<-",
  TYPE = "::", RET = "->",
  CONC = "<>", PIPE = "|>",
  OR = "||",
  AND = "&&",
  EQ = "==", NEQ = "!=",
  LT = "<", LEQ = "<=", GT = ">", GEQ = ">=",
  PLUS = "+", MINUS = "-",
  TIMES = "*", DIV = "/", MOD = "%",
  // unary operators
  NEG = "-", NOT = "!"
}

export enum Kw {
  LET = "let", IF = "if", THEN = "then", ELSE = "else", TRUE = "true", FALSE = "false", FN = "fn", AT = "at", WITH = "with", IN = "in", OF = "of", IS = "is"
}

export const Reserved = new Set([
  "let", "if", "then", "else", "true", "false", "at", "with", "in", "of", "fn", "is"
]);

export const Types = new Set([ "No", "Int", "Num", "Str", "Bool", "Vec", "Fn", "Box" ]);

export const OpChars = new Set([ ...":=&|<>!+-*/^%" ]);

export const Puncts = new Set([ ...",:;()[]{}|" ]);

export const Bases = new Set([ ..."box" ]);

export const Octals = new Set([ ..."01234567" ]);

export const PreComment = new Set([ "~~", "~*" ]);

export type Prim = string | number | boolean | symbol;

export interface Position {
  line: number;
  col: number;
}

export interface Lexeme {
  type: Atom;
  value: Prim;
  literal: string;
  position: Position;
}

export class Token implements Lexeme {
  literal: string;
  constructor (
    public type: Atom,
    public value: Prim,
    public position: Position,
    literal?: string,
  ) {
    this.literal = typeof literal != 'string' ? value.toString() : literal;
    if (this.match(Atom.KW, "true", "false")) {
      this.type = Atom.BOOL;
      this.value = value as string === "true";
    }
    Object.freeze(this);
  }
  get end() {
    return this.position.col + this.literal.length;
  }
  typeIs(t: Atom & string) {
    return (this.type === t);
  }
  typeIn(...types: (Atom & string)[]) {
    for (const t of types)
      if (this.type === t)
        return true;
    return false;
  }
  is(literal: string) {
    for (const val of literal)
      if (val === this.literal)
        return true;
    return false;
  }
  /**
   * Match token value against one or more string literals
   * @param literal The string value(s) to be tested against in order.
   */
  match(...literal: string[]): boolean;
  match(type: Atom, ...literal: string[]): boolean;
  match(type: Atom, ...literal: string[]): boolean {
    if (!type) for (const val of literal)
      if (val === this.literal)
        return true;
    if (type !== this.type)
      return false;
    for (const val of literal)
      if (val === this.literal)
        return true;
    return false;
  }
  toString(includePos?: boolean) {
    return `${ this.type }::[ ${ this.literal } ]`
      + (includePos
        ? `(${ this.position.line }:${ this.position.col })`
        : '');
  }
}


// export default 
