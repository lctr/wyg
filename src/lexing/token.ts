// lexeme kinds, used by lexer, parser, and interpreter
export enum Atom {
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
  TILDE = "~",
  STAR = "*",
}

// string enums for operators since they pop up across (lexer,) parser and evaluator
export enum Op {
  DEF = "=", ASSIGN = "<-",
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
  LET = "let", IF = "if", THEN = "then", ELSE = "else", TRUE = "true", FALSE = "false", WITH = "with", IN = "in", OF = "of"
}

export const KW = [ "let", "if", "then", "else", "true", "false", "with", "in", "of",
  // type names  
  "Number", "String", "Closure", "List", "Tuple" ];

export type Prim = string | number | boolean;

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
    this.literal = !literal ? `${ value }` : literal;
    if (this.validate(Atom.KW, "true", "false")) {
      this.type = Atom.BOOL;
      this.value = value as string === "true";
    }
  }
  get end () {
    return this.position.col + this.literal.length;
  }
  typeIs (t: string | Atom) {
    return (this.type === t);
  }
  typeIn (...types: Atom[]) {
    for (const t of types)
      if (this.type === t)
        return true;
    return false;
  }
  is (literal: string) {
    for (const val of literal)
      if (val === this.literal)
        return true;
    return false;
  }
  validate (...literal: string[]): boolean;
  validate (type: Atom, ...literal: string[]): boolean {
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
  toJSON () {
    return `${ this.type } \`${ this.literal }\` @ (${ this.position.line }:${ this.position.col }`;
  }
}


export default { Atom, Comment, Op, KW, Token };
