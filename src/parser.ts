import { Lexer, Token, Type } from './lexer.ts';
export { Token, Type } from './lexer.ts';

export enum Ast {
  Block, Lambda, Call, Assign, Binary, Unary,
} 

export enum Rule {
  Call = 'call', Block = 'sequence', Lambda = 'lambda', Assign = 'assign', Or = 'or', And = 'and', Equality = 'equality', Compare = 'compare', Term = 'term', Factor = 'factor', Unary = 'unary', Literal = 'literal'
}

export interface ExprBase {
  type: Ast | Type
}

export interface BinExpr extends ExprBase {
  type: Ast,
  rule: Rule,
  operator: string,
  left: Expr,
  right: Expr,
}
export interface UnExpr extends ExprBase {
  type: Ast,
  rule: Rule,
  operator: string,
  right: Expr,
}

export interface Literal extends ExprBase {
  type: Type,
  rule: Rule,
  value: string | number | boolean,
}

export interface Lambda extends ExprBase {
  type: Ast, rule: Rule,
  args: string[],
  body: Expr[],
}

export interface Call extends ExprBase {
  type: Ast,
  rule: Rule,
  fn: Expr,
  args: Expr[],
}

export interface Assign extends ExprBase {
  type: Ast,
  rule: Rule,
  operator: string,
  left: Expr,
  right: Expr
}

export interface Block {
  type: Ast,
  rule: Rule,
  body: Expr[],
}


export type Expr = Block | Lambda | Call | Assign | BinExpr | UnExpr | Literal | Token;

const FALSE = { type: Type.BOOL, value: false, literal: 'false', start: -1, end: -1, line: -1, col: -1 } as unknown as Token; 

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
  parse () {
    const body = [];
    while (!this.eof()) {
      body.push(this.expression());
      if (!this.lexer.eof())
        this.eat(';');
    }
    return { type: Ast.Block, body };
  }
  // handler for _expr
  expression (): Expr {

    return this.callish(() => this._expr(this.atom));
  }
  _expr (parser: () => Expr): Expr {
    let token = this.peek();
    if (!token.typeIs(Type.OP)) {
      
      return this.assign();
    } else {
      return parser.call(this);
    }
  }
  
  // identifies a `call` node after a parsed expression
  callish (parsed: () => Expr): Expr {
    const expr: Expr = parsed.call(this);
    return this.peek().validate(Type.PUNCT, '(') ? this.invoke(expr) : expr;
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
    let body: Expr[];
    token = this.peek();
    if (token.validate(Type.OP, '{')) {
      body = this.block().body;
    } else {
      body = [this.expression()];
    }
    return { type: Ast.Lambda, rule: Rule.Lambda, args, body };
  }
  block (): Block {
    this.eat('{');
    let token = this.peek();
    const body = [];
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

    if (body.length === 0) body.push(FALSE);
    return {type: Ast.Block, rule: Rule.Block, body};
  }
  atom (): Expr {
    return this.callish(() => {
      let token = this.peek();

      if (token.validate(Type.PUNCT, '(')) {
        this.next();
        const expr: Expr = this.expression();
        this.eat(')');
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
        // TODO: check for apply
        return expr;
      }

      if (token.type === Type.NUM || token.type === Type.STR || token.type === Type.SYM) {
        this.next();
        return token;
      }

      throw this.error("Unable to parse " + token.toJSON());
      // return token;
    });
  }
  variable() {}
  assign (): Assign | Expr {
    // let token = this.peek();
    // if (token.typeIs(Type.SYM)) {
    //   if (this.after().validate(Type.OP, '=')) {
    //     const left = token;
    //     this.next();
    //     this.eat('=');
    //     const right = this.callish(this.assign);
    //     token = this.peek();
    //     return { type: Ast.Assign, rule: Rule.Assign, operator: '=', left, right };
    //   }
    // }
    // else if (token.validate(Type.PUNCT, '(')) {
    //   const parser = () => {
    //     if (this.peek().typeIs(Type.OP))
    //     this.next();
    //     const expr = this.or();
    //     this.eat(')');
    //     return expr;
    //   }
    //   return this.callish(parser);
    // }
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




