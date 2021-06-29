import { Token, Type } from "../lexing/token.ts";
import { Lexer } from "../lexing/lexer.ts";

import { Ast, Rule } from "./expression.ts";
import type {
  Assign,
  Binding,
  BinExpr,
  Block,
  Call,
  Conditional,
  Expr,
  Lambda,
  Literal,
  UnExpr,
  Variable,
} from "./expression.ts";
export { Ast, Rule, Type } from "./expression.ts";
export type { Expr } from "./expression.ts";

class Feed {
  constructor () { }
}


export class Parser {
  lexer: Lexer;
  tokens: Token[] = [];
  constructor (source: string | Lexer) {
    this.lexer = (source instanceof Lexer) ? source : new Lexer(source);
  }
  eof () {
    return this.peek().type === Type.EOF;
  }
  peek () {
    return this.lexer.peek();
  }
  after () {
    return this.lexer.after();
  }
  next () {
    const token = this.lexer.next();
    if (token.type !== Type.EOF) this.tokens.push(token);
    return token;
  }
  error (message: string) {
    console.log("tokens parsed: ", this.tokens);
    this.lexer.error(message);
  }
  eat (literal: string) {
    const ch = this.peek().literal;
    if (ch !== literal) {
      this.error(`Expected the literal ${ literal } but instead got ${ ch }`);
    }
    this.next();
  }
  // parse the entire stream from the top
  parse (): Block {
    const body: Expr[] = [];
    while (!this.eof()) {
      body.push(this.expression());
      if (!this.lexer.eof()) {
        this.eat(";");
      }
    }
    return { type: Ast.Block, rule: Rule.Block, body };
  }
  // handler for group
  //
  expression (): Expr {
    return this.callish(() => this.group(this.atom));
  }
  group (parser: () => Expr): Expr {
    const token = this.peek();
    if (!token.typeIs(Type.OP)) {
      return this.callish(this.assign);
    } else {
      return parser.call(this);
    }
  }
  // identifies a `call` node after a parser expression
  callish (parser: () => Expr): Expr {
    const expr: Expr = parser.call(this);
    const token = this.peek();
    // console.log(expr);
    return token.validate(Type.PUNCT, "(") ? this.call(expr) : expr;
  }
  call (fn: Expr): Call {
    const args = this.wrapped("(", ",", ")", this.expression);
    this.next();
    return { type: Ast.Call, rule: Rule.Call, fn, args };
  }
  conditional (): Conditional {
    this.eat("if");
    const cond = this.expression();
    if (!this.peek().validate(Type.PUNCT, "{")) this.eat("then");
    const then = this.expression();
    const expr: Conditional = { type: Ast.Condition, cond, then };
    if (this.peek().validate(Type.KW, "else")) {
      this.next();
      expr.else = this.expression();
    }
    return expr;
  }
  wrapped<E> (left: string, mid: string, right: string, parser: () => E): E[] {
    const nodes = [];
    const done = () => this.peek().validate(Type.PUNCT, right);
    let first = true;
    this.eat(left);
    while (!this.eof()) {
      if (done()) break;
      if (first) first = false;
      else this.eat(mid);
      if (done()) break;
      nodes.push(parser.call(this));
    }
    this.eat(right);
    return nodes;
  }
  variable (): Call | Variable {
    this.eat("let");

    if (this.peek().typeIs(Type.SYM)) {
      const name = this.next().literal;
      const defs = this.wrapped("(", ",", ")", this.binding);
      return {
        type: Ast.Call,
        rule: Rule.Call,
        fn: {
          type: Ast.Lambda,
          rule: Rule.Lambda,
          name,
          args: defs.map((def) => def.name),
          body: this.expression(),
        },
        args: defs.map((def) => def.def ?? this.lexer.false),
      };
    }
    return {
      type: Ast.Variable,
      rule: Rule.Variable,
      args: this.wrapped("(", ",", ")", this.binding),
      body: this.expression(),
    };
  }
  binding (): Binding {
    const name = this.peek().literal;
    let def!: Expr;
    this.next();
    if (this.peek().literal == "=") {
      this.next();
      def = this.expression();
    }
    return { name, def };
  }
  lambda (): Lambda {
    let token = this.peek();
    const name = token.typeIs(Type.SYM) ? token.literal : null;
    if (name) this.next();
    this.eat("|");
    token = this.peek();
    const args = [];
    while (token.literal !== "|") {
      if (!token.typeIs(Type.SYM)) {
        this.error("Lambda parameters must be unbound symbols!");
      }

      args.push(token.literal);
      this.next();
      if (this.peek().literal === ",") {
        this.eat(",");
      }
      token = this.peek();
    }
    this.eat("|");
    let body: Expr;
    token = this.peek();
    if (token.validate(Type.OP, "{")) {
      body = this.block();
    } else {
      body = this.expression();
    }
    return { type: Ast.Lambda, rule: Rule.Lambda, name, args, body };
  }
  block (): Block | Expr {
    const body = this.wrapped("{", ";", "}", this.expression);
    switch (body.length) {
      case 0:
        return this.lexer.false;
      case 1:
        return body[ 0 ];
      default:
        return { type: Ast.Block, rule: Rule.Block, body };
    }
  }
  atom (): Expr {
    return this.callish(() => {
      let token = this.peek();
      if (token.validate(Type.PUNCT, ")")) {
        this.next();
        return this.lexer.false;
      }
      if (token.validate(Type.PUNCT, "(")) {
        this.next();
        const expr: Expr = this.expression();
        // console.log(expr);
        // this.eat(')');
        return expr;
      }
      if (token.validate(Type.PUNCT, "{")) {
        const expr = this.block();
        this.next();
        return expr;
      }
      if (token.validate(Type.KW, "if")) {
        return this.conditional();
      }
      if (token.validate(Type.KW, "let")) {
        const expr = this.variable();
        // this.next();
        return expr;
      }
      if (token.validate(Type.KW, "true", "false")) {
        const value = token.value == "true";
        this.next();
        return this.literal(Type.BOOL, value);
      }
      if (token.validate(Type.PUNCT, "|")) {
        const expr: Expr = this.lambda();
        this.next();
        // TODO: check for call?
        return expr;
      }
      token = this.next();
      if (
        token.type === Type.NUM || token.type === Type.STR ||
        token.type === Type.SYM
      ) {
        // this.next();
        return token;
      }
      throw this.error(
        "Unable to parse " + JSON.stringify(token._json(), null, 2),
      );
      // return token;
    });
  }
  assign (): Assign | Expr {
    return this.binary(this.or, Rule.Assign, "=");
  }
  binary (parser: () => Expr, rule: Rule, ...ops: string[]): Expr {
    // since we may lose context as we pass parsers around
    let expr: Expr = parser.call(this);
    let token = this.peek();
    while (token.validate(Type.OP, ...ops)) {
      this.next();
      expr = {
        type: Ast.Binary,
        rule,
        operator: token.literal,
        left: expr,
        right: parser.call(this),
      };
      token = this.peek();
    }
    return expr;
  }
  or (): Expr {
    return this.binary(this.and, Rule.Or, "||");
  }
  and (): Expr {
    return this.binary(this.equality, Rule.And, "&&");
  }
  equality (): Expr {
    return this.binary(this.compare, Rule.Equality, "==", "!=");
  }
  compare (): Expr {
    return this.binary(this.term, Rule.Compare, "<", "<=", ">", ">=");
  }
  term (): Expr {
    return this.binary(this.factor, Rule.Term, "+", "-");
  }
  factor (): Expr {
    return this.binary(this.unary, Rule.Factor, "*", "/", "%");
  }
  unary (): Expr {
    const token = this.peek();
    if (token.validate(Type.OP, "!", "-")) {
      this.next();
      const right = this.atom();
      // if ()
      return {
        type: Ast.Unary,
        rule: Rule.Unary,
        operator: token.literal,
        right,
      };
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


