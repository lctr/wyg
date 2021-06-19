import { Token, Type } from './token.ts';
import { Lexer } from './lexer.ts';

import { Ast, Rule } from './nodeType.ts'
import type { Expr, Block, Lambda, Call, Assign, BinExpr, UnExpr, Literal } from './nodeType.ts';
export { Type, Ast, Rule } from './nodeType.ts';
export type { Expr } from './nodeType.ts';

export class Parser {
  lexer: Lexer;
  tokens: Token[] = [];
  constructor (source: string) {
    this.lexer = new Lexer(source);
  }
  eof () {
    return this.lexer.eof();
  }
  peek () { return this.lexer.peek(); }
  after () { return this.lexer.peekNext(); }
  next () {
    const token = this.lexer.next();
    if (token.type !== Type.EOF) this.tokens.push(token);
    return token;
  }
  error (message: string) {
    this.lexer.error(message);
  }
  eat (literal: string) {
    const ch = this.peek().literal;
    if (ch !== literal)
      this.error(`Expected the literal ${ literal } but instead got ${ ch }`);
    this.next();
  }
  // parse the entire stream from the top
  parse (): Block {
    const body: Expr[] = [];
    while (!this.eof()) {
      body.push(this.expression());
      // console.log(body);
      if (!this.lexer.eof())
        this.eat(';');
    }
    return { type: Ast.Block, rule: Rule.Block, body };
  }
  // handler for _expr
  expression (): Expr {
    return this.callish(() => this._expr(this.atom));
  }
  _expr (parser: () => Expr): Expr {
    const token = this.peek();
    if (!token.typeIs(Type.OP)) {
      return this.assign();
    } else {
      return parser.call(this);
    }
  }
  
  // identifies a `call` node after a parsed expression
  callish (parsed: () => Expr): Expr {
    const expr: Expr = parsed.call(this);
    console.log(expr);
    return this.peek().validate(Type.PUNCT, '(', '<-') ? this.invoke(expr) : expr;
  }
  // unsure as to whether calling this method `apply` or `call` will affect later use of Object prototype call/apply methods in evaluator, though theoretically it shouldn't matter since the apply/call nodes will have {} as prototypes
  invoke (fn: Expr): Expr {
    this.eat('(');
    let token = this.peek();
    const args = [];
    while (token.literal != ')') {
      const expr = this.expression();
      args.push(expr);
      this.next();
      if (this.peek().literal == ',')
        this.eat(',');
      token = this.peek();
    }
    this.eat(')');
    return { type: Ast.Call, rule: Rule.Call, fn, args };
  }
  lambda (): Lambda {
    this.eat('|');
    let token = this.peek();
    const args = [];
    while (token.literal !== '|') {
      if (!token.typeIs(Type.SYM))
        this.error("Lambda parameters must be unbound symbols!");

      args.push(token.literal);
      this.next();
      if (this.peek().literal === ',') {
        this.eat(',');
      }
      token = this.peek();
    }
    this.eat('|');
    let body: Expr;
    token = this.peek();
    if (token.validate(Type.OP, '{')) {
      body = this.block();
    } else {
      body = this.expression();
    }
    return { type: Ast.Lambda, rule: Rule.Lambda, args, body };
  }
  block (): Block | Expr {
    this.eat('{');
    let token = this.peek();
    const body: Expr[] = [];
    while (token.literal !== '}') {
      const expr = this.expression();
      body.push(expr);
      this.next();
      if (this.peek().literal === ';') {
        this.eat(';');
      }
      token = this.peek();
    }
    this.eat('}');

    if (body.length === 0) return this.lexer.false;
    if (body.length === 1) return body[ 0 ];
    return {type: Ast.Block, rule: Rule.Block, body};
  }
  atom (): Expr {
    return this.callish(() => {
      const token = this.peek();

      if (token.validate(Type.PUNCT, '(')) {
        this.next();
        const expr: Expr = this.expression();
        // this.eat(')');
        return expr;
      }
      if (token.validate(Type.PUNCT, '{')) {
        const expr = this.block();
        this.next();
        return expr;
      }
      if (token.validate(Type.KW, 'let')) {
        // SHOULD BECOME VARIABLE DEF NODE LATER
        this.eat('let');
        return this.assign();
      }
      if (token.validate(Type.KW, 'true') || token.validate(Type.KW, 'false')) {
        const value = token.value == 'true';
        this.next();
        return this.literal(Type.BOOL, value);
      }
      if (token.validate(Type.PUNCT, '|')) {
        const expr: Expr = this.lambda();
        this.next();
        // TODO: check for apply?
        return expr;
      }

      if (token.type === Type.NUM || token.type === Type.STR || token.type === Type.SYM) {
        this.next();
        return token;
      }

      throw this.error("Unable to parse " + JSON.stringify(token._json(), null, 2));
      // return token;
    });
  }
  variable() {}
  assign (): Assign | Expr {
    return this.binary(this.or, Rule.Assign, '=');
  }
  binary (parser: () => Expr, rule: Rule, ...ops: string[]): Expr {
    // since we may lose context as we pass parsers around, we call the parser using the prototype's call method
    let expr: Expr = parser.call(this);
    let token = this.peek();
    while (token.validate(Type.OP, ...ops)) {
      this.next();
      const right = parser.call(this);
      expr = { type: Ast.Binary, rule, operator: token.literal, left: expr, right };
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
      return { type: Ast.Unary, rule: Rule.Unary, operator: token.literal, right };
    }
    return this.atom();
  }
  literal (type: Type, value: number | string | boolean): Literal {
    return { type, rule: Rule.Literal, value };
  }
}

export function parse (program: string) {
  return new Parser(program).parse();
}