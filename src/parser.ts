import { Lexer, Token, Type} from './lexer.ts';

export enum Rule {
  Sequence = 'sequence', Lambda = 'lambda', Assign='assign', Or = 'or', And = 'and', Equality = 'equality', Compare = 'compare', Term = 'term', Factor = 'factor', Unary = 'unary', Literal ='literal'
}

export interface BinExpr {
  type: Rule,
  operator: string,
  left: Expr,
  right: Expr,
}
export interface UnExpr {
  type: Rule,
  operator: string,
  right: Expr,
}

export interface Literal {
  type: Rule,
  atom: Token,
}

export interface Lambda {
  type: Rule,
  args: string[] | Token[],
  body: Expr[],
}

export interface Assign {
  type: Rule,
  id: string,
  value: Expr,
}

export interface Sequence {
  type: Rule,
  body: Expr[],
}

export type Expr = Sequence | Lambda | Assign | BinExpr | UnExpr | Literal | Token;

export class Parser {
  lexer: Lexer;
  constructor(source: string) {
    this.lexer = new Lexer(source);
  }
  eof () {
    return this.lexer.peek().type === Type.EOF;
  }
  peek () { return this.lexer.peek(); }
  after () { return this.lexer.peekNext(); }
  next () { return this.lexer.next(); }
  error (message: string) {
    const { col, line } = this.lexer.pos();
    throw new Error(`${message} at (${line}:${col})`)
  }
  eat (literal: string) {
    const ch = this.peek().literal;
    if (ch !== literal)
      this.error(`Expected the literal ${ literal } but instead got ${ ch }`);
    this.next();
  }
  lambda () {
    this.eat('|');
    let token = this.peek();
    const args = [];
    while (token.literal !== '|') {
      args.push(token);
      this.next();
      if (this.peek().literal === ',') {
        this.eat(',');
      }
      token = this.peek();
    }
    this.eat('|');
    let body: Expr[];
    token = this.next();
    if (token.validate(Type.OP, '->')) {
      body = [this.or()];
      this.eat(';');
    } else {
      body = this.block();
    }
    return { type: Rule.Lambda, args, body };
  }
  block () {
    this.eat('{');
    let token = this.peek();
    const body = [];
    while (!token.validate(Type.PUNCT, '}')) {
      const expr = this.after().literal === '=' ? this.assign() : this.or();
      body.push(expr);
      this.eat(';');
      if (this.peek().literal === '}') {
        this.eat('}');
        break;
      }
      token = this.next();
    }
    // if (body.length === 0) body.push({type: Rule.Literal})
    return body;
  }
  atom (): Expr {
    const token = this.peek();
    if (token.type === Type.NUM || token.type === Type.STR || token.type === Type.SYM) {
      this.next();
      return this.literal(token);
    }
    else if (token.validate(Type.PUNCT, '(')) {
      this.next();
      const expr: Expr = this.or();
      this.eat(')');
      return expr;
    }
    else if (token.validate(Type.PUNCT, '|')) {
      const expr: Expr = this.lambda();
      this.next();
      return expr;
     }
    else if (token.validate(Type.PUNCT, '{')) {
      const expr = this.block();
      this.next();
      return { type: Rule.Sequence, body: expr };
    }
    return token;
  }
  assign () {
    const token = this.peek();
    this.next();
    this.eat('=');
    const value = this.or();
    return { type: Rule.Assign, operator: '=', id: token.literal, value };
  }
  binary (parser: () => Expr, type: Rule, ...ops: string[]): Expr {
    // since we may lose context as we pass parsers around, we call the parser using the prototype's call method
    let expr: Expr = parser.call(this);
    let token = this.peek();
    while (token.validate(Type.OP, ...ops)) {
      this.next();
      const right = parser.call(this);
      expr = { type, operator: token.literal, left: expr, right };
      token = this.peek();
    }
    return expr;
  }
  or (): Expr { return this.binary(this.and, Rule.Or, '||'); }
  and (): Expr { return this.binary(this.equality, Rule.And, '&&'); }
  equality (): Expr { return this.binary(this.compare, Rule.Equality, '==', '!='); }
  compare (): Expr { return this.binary(this.term, Rule.Compare, '<', '<=', '>', '>='); }
  term (): Expr { return this.binary(this.factor, Rule.Term, '+', '-'); }
  factor (): Expr { return this.binary(this.unary, Rule.Factor, '*', '/', '%'); }
  unary (): Expr {
    const token = this.peek();
    if (token.validate(Type.OP, '!', '-')) {
      this.next();
      const right = this.unary();
      return { type: Rule.Unary, operator: token.literal, right };
    }
    return this.atom();
  }
  literal (token: Token) {
    return { type: Rule.Literal, atom: token };
  }
}


