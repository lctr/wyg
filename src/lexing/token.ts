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
  LET = "let", IF = "if", THEN = "then", ELSE = "else", TRUE = "true", FALSE = "false"
}

export const KW = [ "let", "if", "then", "else", "true", "false",
  // type names  
  "Number", "String", "Closure", "List", "Tuple" ];

export type Prim = string | number | boolean;

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
  constructor (
    public type: Type,
    public value: Prim,
    public position: Position,
    literal?: string,
  ) {
    if (!literal) this.literal = value + "";
    else this.literal = literal;
    if (this.validate(Type.KW, "true", "false")) {
      // if (type === Type.KW && /^(true|false)$/.test(value as string)) {
      this.type = Type.BOOL;
      this.value = value as string === "true";
    }
  }
  get end () {
    return this.position.col + this.literal.length;
  }
  typeIs (t: string | Type) {
    return (this.type === t);
  }
  typeIn (...types: Type[]) {
    for (const t of types) {
      if (this.type === t) {
        return true;
      }
    }
    return false;
  }
  validate (...literal: string[]): boolean;
  validate (type: Type, ...literal: string[]): boolean {
    if (!type) for (const val of literal) if (val === this.literal) return true;
    if (type !== this.type) return false;
    for (const val of literal) {
      if (val === this.literal) return true;
    }
    return false;
  }
  // TODO: unify shape of objects shown in error logging
  _json () {
    const { line, col } = this.position;
    return { type: Type[ this.type ], value: this.value, line, col };
    // return  //`{ type: ${ Type[ this.type ] }, value: ${ this.value }, line: ${ this.line }, col: ${ this.col } }`;
  }
  toJSON () {
    return `${ this.type } \`${ this.literal }\` @ (${ this.position.line }:${ this.position.col }`;
  }

  [ Deno.customInspect ] () {
    return 'Token:' + this.type + ' { value: ' + this.value + ', (' + this.position.line + ':' + this.position.col + ') }';
  }
}



export default { Type, Comment, Op, KW, Token };
