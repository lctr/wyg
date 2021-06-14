import { Lexer, Token, Type} from './lexer.ts';

enum Rule {
  Or, And, Equality, Compare, Term, Factor, Unary, Literal
}

interface BinExpr {
  type: Rule,
  operator: string,
  left: Expr,
  right: Expr,
}
interface UnExpr {
  type: Rule,
  operator: string,
  right: Expr,
}

interface Literal {
  type: Rule,
  kind: Type,
  value: unknown,
}

type Expr = UnExpr | BinExpr | Literal | Token;

class Parser {
  lexer: Lexer;
  constructor(source: string) {
    this.lexer = new Lexer(source);
  }
  peek () { return this.lexer.peek(); }
  next () { return this.lexer.next(); }
  consume (literal: string) {
    const ch = this.peek().literal;
    if (ch !== literal)
      this.lexer.error(`Expected the literal ${ literal } but instead got ${ ch }`);
    this.next();
  }
  atom (): Expr {
    let token = this.peek();
    if (token.type === Type.NUM || token.type === Type.STR) {
      this.next();
      return this.literal(token);
    }
    else if (token.validate(Type.PUNCT, '(')) {
      this.next();
      const expr: Expr = this.or();
      this.consume(')');
      return expr;
    }
    return token;
  }
  binary (parser: () => Expr, type: Rule, ...ops: string[]): Expr {
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
    let token = this.peek();
    if (token.validate(Type.OP, '!', '-')) {
      this.next();
      const right = this.unary();
      return { type: Rule.Unary, operator: token.literal, right };
    }
    return this.atom();
  }
  literal (token: Token) {
    return { type: Rule.Literal, kind: token.type, value: token.value };
  }
}


