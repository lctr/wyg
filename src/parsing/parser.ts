import type { Lexeme } from "../lexing/token.ts";
import { Lexer, Type, Op } from "../lexing/lexer.ts";
export { Op } from "../lexing/lexer.ts";

import { Node, Rule } from "./expression.ts";
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
export { Node, Rule, Type } from "./expression.ts";
export type { Prim, Expr } from "./expression.ts";


export class Parser {
  #lexer: Lexer;
  #tokens: Lexeme[] = [];
  constructor (source: string | Lexer) {
    this.#lexer = (source instanceof Lexer) ? source : new Lexer(source);
  }
  eof () {
    return this.peek().typeIs(Type.EOF);
  }
  peek () {
    return this.#lexer.peek();
  }
  after () {
    return this.#lexer.after();
  }
  next () {
    const token = this.#lexer.next();
    if (!token.typeIs(Type.EOF)) this.#tokens.push(token);
    return token;
  }
  error (message: string) {
    // console.log("#tokens parsed: ", this.#tokens);
    this.#lexer.error(message);
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
      if (!this.#lexer.eof()) {
        this.eat(";");
      }
    }
    return { type: Node.Block, rule: Rule.Block, body };
  }
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
  /**
   * Identify a `call` node after a parser expression, applying the method `Parser.call` instance method if not a `CALL` node, and a `CALL` node otherwise. 
   * Note: This has to do with the following production rule: 
   * ```
   * Expr   -> Call | Expr
   * Call   -> Expr <PUNCT> (Exprs)* <PUNCT>
   * Exprs  -> Expr (<PUNCT> Expr)+ | Expr
   * ```
   * @param parser `Parser` instance method to be used for parsing the non-call expression.
   * @returns {Expr} Expression node.
   */
  callish (parser: () => Expr): Expr {
    const expr: Expr = parser.call(this);
    const token = this.peek();
    // console.log(expr);
    return token.validate(Type.PUNCT, "(") ? this.call(expr) : expr;
  }
  call (fn: Expr): Call {
    const args = this.circumscribed("(", ",", ")", this.expression);
    this.next();
    return { type: Node.Call, rule: Rule.Call, fn, args };
  }
  conditional (): Conditional {
    this.eat("if");
    const cond = this.expression();
    if (!this.peek().validate(Type.PUNCT, "{")) this.eat("then");
    const then = this.expression();
    const expr: Conditional = { type: Node.Condition, rule: Rule.Condition, cond, then };
    if (this.peek().validate(Type.KW, "else")) {
      this.next();
      expr.else = this.expression();
    }
    return expr;
  }
  /**
   * Parses a sequence of #tokens according to the production rules specified by the method `parser` generic parameter, thereby restricting the `parser` parameter to have a well-defined return type. 
   *  of ` where the array is defined by three affix parameters `prefix`, `infix`, and `suffix`.  
   * @param prefix The string literal denoting the beginning of the sequence.
   * @param infix The string literal delimiting expressions throughout the sequence.
   * @param suffix The string literal denoting the end of the sequence.
   * @param parser The parser function/method corresponding to the production rule, to be applied to each expression in the sequence.
   * @returns An array of expressions with type corresponding to `parser` parameter return type.
   */
  circumscribed<E> (prefix: string, infix: string, suffix: string, parser: () => E): E[] {
    const nodes = [];
    const onRight = () => this.peek().validate(Type.PUNCT, suffix);
    let first = true;
    this.eat(prefix);
    while (!this.eof()) {
      if (onRight()) break;
      if (first) first = false;
      else this.eat(infix);
      if (onRight()) break;
      nodes.push(parser.call(this));
    }
    this.eat(suffix);
    return nodes;
  }
  variable (): Call | Variable {
    this.eat("let");

    if (this.peek().typeIs(Type.SYM)) {
      const name = this.next().literal;
      const defs = this.circumscribed("(", ",", ")", this.binding);
      return {
        type: Node.Call,
        rule: Rule.Call,
        fn: {
          type: Node.Lambda,
          rule: Rule.Lambda,
          name,
          args: defs.map((def) => def.name),
          body: this.expression(),
        },
        args: defs.map((def) => def.def ?? this.#lexer.false),
      };
    }
    return {
      type: Node.Variable,
      rule: Rule.Variable,
      args: this.circumscribed("(", ",", ")", this.binding),
      body: this.expression(),
    };
  }
  binding (): Binding {
    const name = this.peek().literal;
    let def!: Expr;
    this.next();
    if (this.peek().validate(Type.OP, Op.DEF)) {
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
    return { type: Node.Lambda, rule: Rule.Lambda, name, args, body };
  }
  block (): Block | Expr {
    const body = this.circumscribed("{", ";", "}", this.expression);
    switch (body.length) {
      case 0:
        return this.#lexer.false;
      case 1:
        return body[ 0 ];
      default:
        return { type: Node.Block, rule: Rule.Block, body };
    }
  }
  atom (): Expr {
    return this.callish(() => {
      let token = this.peek();
      if (token.validate(Type.PUNCT, "(")) {
        this.next();
        const expr: Expr = this.expression();
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
      if (token.validate(Type.PUNCT, "|")) {
        const expr: Expr = this.lambda();
        this.next();
        // TODO: check for call?
        return expr;
      }
      token = this.next();
      if (token.typeIn(Type.BOOL, Type.NUM, Type.STR, Type.SYM)) {
        // this.next();
        return token;
      }
      if (token.validate(Type.PUNCT, ';') && this.eof()) {
        throw this.error('Unexpected end of input!');
      }
      throw this.error(
        "Unable to parse " + JSON.stringify(token._json(), null, 2),
      );
    });
  }
  assign (): Assign | Expr {
    return this.binary(this.or, Rule.Assign, Op.ASSIGN);
  }
  binary (
    parser: () => Expr,
    rule: Rule,
    ...ops: string[]
  ): Expr | BinExpr<Expr, Expr> {
    // since we may lose context as we pass parsers around
    let expr: Expr = parser.call(this);
    let token = this.peek();
    while (token.validate(Type.OP, ...ops)) {
      this.next();
      expr = {
        type: rule !== Rule.Assign ? Node.Binary : Node.Assign,
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
    return this.binary(this.and, Rule.Or, Op.OR);
  }
  and (): Expr {
    return this.binary(this.equality, Rule.And, Op.AND);
  }
  equality (): Expr {
    return this.binary(this.compare, Rule.Equality, Op.EQ, Op.NEQ);
  }
  compare (): Expr {
    return this.binary(this.term, Rule.Compare, Op.LT, Op.LEQ, Op.GT, Op.GEQ);
  }
  term (): Expr {
    return this.binary(this.factor, Rule.Term, Op.PLUS, Op.MINUS);
  }
  factor (): Expr {
    return this.binary(this.unary, Rule.Factor, Op.TIMES, Op.DIV, Op.MOD);
  }
  unary (): Expr {
    const token = this.peek();
    if (token.validate(Type.OP, Op.NOT, Op.NEG)) {
      this.next();
      const right = this.atom();
      // if ()
      return {
        type: Node.Unary,
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
