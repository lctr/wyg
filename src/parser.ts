import { Lexer, Token, Type } from './lexer.ts';

interface Expr {
  type: Op | Type;
  operator?: string,
  left?: Expr | Token;
  right?: Expr | Token;
  value?: number | string;
}

// enum Punct {
//   LParen, RParen, LCurly, RCurly, LSquare, RSquare, Vert, Slash, Semi, Comma
// }

enum Op {
  Sequence, Unary, Multiplicative, Additive, Boolean, Comparison, Equality, Assign, Primary
}


export interface ParseError {
  i: number,
  message: string,
}

export class Parser {
  program: Expr[] = [];
  expr!: Expr | any;
  failed!: boolean;
  errors!: ParseError[];
  private lexer: Lexer;
  constructor (source: string | Lexer) {
    if (source instanceof Lexer) this.lexer = source;
    else this.lexer = new Lexer(source);
  }
  eof () {
    return !this.lexer.peekNext();
  }
  parse (): Expr[] {
    if (this.eof()) {
      const expr = this.parseAdditive();
      if (expr) {
        this.expr = expr;
        this.program.push(this.expr);
        return this.parse();
      }
    }
    return this.program;
  }
  static test (token: Token | null, type: Type, ...values: string[]) {
    if (token == null) return false;
    if ((token) && (token.type === type) && (typeof token.value == 'string') && (values.indexOf(token?.value + '') > -1))
      return true;
    else
      return false;
  }
  parseExpr () {
    return this.parseComparison();
    // return this.parseAdditive();
    // return this.parseEquality();
  }
  private parsePrimary () {
    const token = this.lexer.peek();
    switch (token?.type) {
      case Type.PUNCT:
        return this.parseGroup();
      case Type.KW:
        break
      case Type.STR:
      case Type.NUM:
      case Type.SYM:
        this.lexer.next();
        return token;
      default:
        console.log(token?.toString());
        console.error('error');
    }
  }
  
  private parseGroup () {
    const expr = this.parseComparison();
    this.skipNext(Type.PUNCT, ')');
    // const ch = this.lexer.peek()?.value;
    // if (ch !== ')') {
    //   this.throwError("Expected ')', got " + ch);
    // }
    // this.lexer.next();
    return expr;
  }
  // for sequences and lambda args
  private collect (open: string, mid: string, close: string, parser: () => Expr): Expr[] {
    const exprs: Expr[] = [];
    // const peek = () => this.lexer.peek();
    let init = true;
    this.skipNext(Type.PUNCT, open);
    while (!this.lexer.eof()) {
      if (Parser.test(this.lexer.peek(), Type.PUNCT, close)) break;
      if (init) init = false; else this.skipNext(Type.PUNCT, mid);
      if (Parser.test(this.lexer.peek(), Type.PUNCT, close)) break;
      exprs.push(parser());
    }
    this.skipNext(Type.PUNCT, close);
    return exprs;
  }
  // expect (type: Type, ...values: string[]) {
  //   const token = this.lexer.peek();
  //   if (!Parser.test(token, type, ...values))
  //     this.throwError(`Expected '${ values.join("', or '") }', but instead got token: ${ token }`);
  //   else
  //     this.lexer.next();
  // }
  private skipNext (type: Type, value: string) {
    if (Parser.test(this.lexer.peek(), type, value)) this.lexer.next();
    else
      this.throwError(`Expecting token {type ${ Type[ type ] }, value ${ value }}, but got
    ${ JSON.stringify(this.lexer.peek(), null, 2) }`);
  }
  private parseLambda() {}
  private parseComparison<E> (): E {
    if (this.eof())
      this.throwError(`Unexpected end of input!`);

    let expr = this.parseAdditive();
    let tkn = this.lexer.peek();
    while (tkn && expr && Parser.test(tkn, Type.OP, '<', '>', '<=', '>=')) {
      this.lexer.next();
      const rhs = this.parseAdditive();
      expr = { type: Op.Comparison, operator: <string> tkn.value, left: expr, right: rhs };
      tkn = this.lexer.peek();
    }
    return expr as E;
  }
  private parseAdditive<E> (): E {
    if (this.eof())
      this.throwError(`Unexpected end of input!`);

    let expr = this.parseMultiplicative();
    let tkn = this.lexer.peek();
    while (tkn && expr && Parser.test(tkn, Type.OP, '+', '-')) {
      this.lexer.next();
      const rhs = this.parseMultiplicative();
      expr = { type: Op.Additive, operator: <string>tkn.value, left: expr, right: rhs };
      tkn = this.lexer.peek();
    }
    return expr as E;
  }
  private parseMultiplicative () {
    if (this.eof())
      return this.throwError(`Unexpected end of input!`);
    
    let expr = this.parsePrimary();
    let tkn = this.lexer.peek();
    while (tkn && expr && Parser.test(tkn, Type.OP, '*', '/')) {
      this.lexer.next();
      const rhs = this.parsePrimary();
      expr = { type: Op.Multiplicative, operator: <string>tkn.value, left: expr, right: rhs };
      tkn = this.lexer.peek();
    }
    return expr;
  }

  // TODO: debugging and errors
  private logError (message: string) {
    if (!this.failed) this.errors = [];
    this.errors.push({ i: this.errors.length + 1, message});
  }
  private throwError (message: string) {
    // const { line, col } = this.lexer.pos;
    const msg = message + `\n\tat (${ this.lexer.pos.line }:${ this.lexer.pos.col })`;
    this.logError(msg);
    console.log('Error log: ', this.errors);
    this.lexer.error(msg);
  }
}


