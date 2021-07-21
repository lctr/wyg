import type { Streamable, Lexeme } from "../lexing/mod.ts";
import { Lexer, Atom, Op } from "../lexing/mod.ts";

import { Kind, Rule } from "./expression.ts";
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
  Prim,
  UnExpr,
  Variable,
} from "./expression.ts";

export class Parser extends Lexer implements Streamable<Lexeme> {
  // #lexer: Lexer;
  #tokens: Lexeme[] = [];
  #expr: WeakSet<Expr> = new WeakSet();
  constructor (source: string | Lexer) {
    super(source instanceof Lexer ? source.stream : source);
    // this.#lexer = (source instanceof Lexer) ? source : new Lexer(source);
  }
  eof () {
    return super.peek().typeIs(Atom.EOF);
  }
  error (message: string) {
    // console.log(Deno.inspect(this.#expr, { colors: true, depth: 10 }));
    super.error(message);
  }
  eat (chars: string) {
    const { literal } = this.peek();
    if (literal !== chars) {
      this.error(
        `Expected the literal « ${ chars } » but instead got « ${ literal } »`);
    }
    this.next();
  }
  // parse the entire stream from the top
  parse (): Block {
    const body: Expr[] = [];
    while (!this.eof()) {
      body.push(this.expression());
      if (!super.eof()) {
        this.eat(";");
      }
    }
    return { type: Kind.Block, rule: Rule.Block, body };
  }
  expression (): Expr {
    return this.callish(() => this.group(this.atom));
  }
  group (parser: () => Expr): Expr {
    const token = this.peek();
    if (!token.typeIs(Atom.OP)) {
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
    this.#expr.add(expr);
    return token.validate(Atom.PUNCT, "(") ? this.call(expr) : expr;
  }
  call (fn: Expr): Call {
    const args = this.circumscribed("(", ",", ")", this.expression);
    return { type: Kind.Call, rule: Rule.Call, fn, args };
  }
  conditional (): Conditional {
    this.eat("if");
    const cond = this.expression();
    if (!this.peek().validate(Atom.PUNCT, "{")) this.eat("then");
    const then = this.expression();
    const expr: Conditional = { type: Kind.Condition, rule: Rule.Condition, cond, then };
    if (this.peek().validate(Atom.KW, "else")) {
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
  circumscribed<E> (
    prefix: string,
    infix: string,
    suffix: string,
    parser: () => E
  ): E[] {
    const nodes = [];
    const end = () => this.peek().validate(Atom.PUNCT, suffix);
    let first = true;
    this.eat(prefix);
    while (!this.eof()) {
      if (end()) break;
      if (first) first = false;
      else this.eat(infix);
      if (end()) break;
      nodes.push(parser.call(this));
    }
    this.eat(suffix);
    return nodes;
  }
  variable (): Call | Variable {
    const skipIn = () => {
      if (this.peek().validate(Atom.KW, "in"))
        this.eat("in");
    };
    this.eat("let");
    if (this.peek().typeIs(Atom.SYM)) {
      const name = this.next().literal;
      let defs;
      if (this.peek().validate(Atom.KW, "be")) { }
      defs = this.circumscribed("(", ",", ")", this.binding);
      skipIn();
      const body = this.expression();
      return {
        type: Kind.Call,
        rule: Rule.Call,
        fn: {
          type: Kind.Lambda,
          rule: Rule.Lambda,
          name,
          args: defs.map(({ name }) => name),
          body,
        },
        args: defs.map(({ def }) => def ?? super.false),
      };
    }
    const args = this.circumscribed("(", ",", ")", this.binding);
    skipIn();
    const body = this.expression();
    return {
      type: Kind.Variable,
      rule: Rule.Variable,
      args,
      body,
    };
  }
  binding (): Binding {
    const name = this.peek().literal;
    let def!: Expr;
    this.next();
    if (this.peek().validate(Atom.OP, Op.DEF)) {
      this.next();
      def = this.expression();
    }
    return { name, def };
  }
  lambda (): Lambda | Call {

    let token = this.peek();
    const name = token.typeIs(Atom.SYM) ? token.literal : null;
    if (name) this.next();

    this.eat("|");
    token = this.peek();
    const args: string[] = [];
    while (token.literal !== "|") {
      if (token.validate(Atom.PUNCT, ',')) {
        this.eat(',');
        break;
      }
      if (token.typeIs(Atom.KW)) {
        this.error("Lambda parameters may not be keywords!");
      }
      else if (!token.typeIs(Atom.SYM)) {
        this.error("Lambda parameters must be unbound symbols!");
      }
      args.push(token.literal);
      this.next();
      if (this.peek().validate(Atom.PUNCT, ",")) {
        this.eat(",");
      }
      token = this.peek();
    }
    this.eat("|");
    let body: Expr;
    token = this.peek();
    if (token.validate(Atom.OP, "{")) {
      body = this.block();
    } else {
      body = this.expression();
    }
    if (this.peek().validate(Atom.KW, "at")) {
      this.eat("at");
      return this.call({
        type: Kind.Lambda,
        rule: Rule.Lambda,
        name, args, body
      });
    }
    return {
      type: Kind.Lambda,
      rule: Rule.Lambda,
      name, args, body
    };
  }
  parameter () {
    const name = this.peek().literal;
    return name;
  }
  block (): Block | Expr {
    const body = this.circumscribed("{", ";", "}", this.expression);
    switch (body.length) {
      case 0:
        return super.false;
      case 1:
        return body[ 0 ];
      default:
        return { type: Kind.Block, rule: Rule.Block, body };
    }
  }
  // vectors correspond to 
  vector () {
    const body = this.circumscribed('[', ',', ']', this.expression);

    return { type: Kind.Vector, rule: Rule.Vector, body };
  }
  list () { }
  index () {
    let nth;
    if (this.peek().validate(Atom.PUNCT, '[')) {
      nth = this.expression();

    } else {

    }
  }
  atom (): Expr {
    return this.callish(() => {
      const token = this.peek();
      if (token.validate(Atom.PUNCT, "(")) {
        this.next();
        const expr: Expr = this.expression();
        this.eat(')');
        return expr;
      }
      if (token.validate(Atom.OP, Op.NEG, Op.NOT)) {
        return this.unary(token);
      }
      if (token.validate(Atom.PUNCT, "{")) {
        return this.block();
      }
      if (token.validate(Atom.KW, "if")) {
        return this.conditional();
      }
      if (token.validate(Atom.KW, "let")) {
        return this.variable();
      }
      if (token.validate(Atom.KW, "fn")) {
        this.eat("fn");
        return this.lambda();
      }
      if (token.validate(Atom.PUNCT, '|')) {
        return this.lambda();
      }
      if (token.validate(Atom.PUNCT, "[")) {
        return this.vector();
      }

      if (token.typeIn(Atom.BOOL, Atom.NUM, Atom.STR, Atom.SYM)) {
        this.next();
        return token;
      }
      if (this.eof()) {
        throw this.error('Unexpected end of input!');
      }
      throw this.error(
        "Unable to parse " + JSON.stringify(token.toJSON(), null, 2),
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
    // since we lose context as we pass parsers around
    let expr: Expr = parser.call(this);
    let token = this.peek();
    while (token.validate(Atom.OP, ...ops)) {
      this.next();
      expr = {
        type: rule !== Rule.Assign ? Kind.Binary : Kind.Assign,
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
    return this.binary(this.conc, Rule.Factor, Op.TIMES, Op.DIV, Op.MOD);
  }
  conc (): Expr {
    return this.binary(this.atom, Rule.Factor, Op.CONC);
  }
  literal (type: Atom, value: Prim): Literal {
    return { type, rule: Rule.Literal, value };
  }
  unary (token: Lexeme): UnExpr {
    const [ type, init, operator ] = (token.literal === Op.NEG)
      // negation 
      ? [ Atom.NUM, 0, Op.MINUS ]
      : [ Atom.BOOL, false, Op.EQ ];
    this.next();
    return {
      type: Kind.Unary,
      rule: Rule.Unary,
      operator,
      left: this.literal(type, init),
      right: this.expression()
    };
  }

}

export function parse (program: string) {
  return new Parser(program).parse();
}
