import type { Streamable, Lexeme } from "../lexing/mod.ts";
import { Lexer, Atom, Op } from "../lexing/mod.ts";

import { Kind, Rule } from "./expression.ts";
import type {
  Arguments,
  Assign,
  Binding,
  Binary,
  Block,
  Call,
  Conditional,
  Expr,
  Index,
  Lambda,
  Literal,
  Parameter,
  Pipe,
  Prim,
  Unary,
  Variable,
  Vector,
} from "./expression.ts";

export class Parser extends Lexer implements Streamable<Lexeme> {
  // #lexer: Lexer;
  #tokens: Lexeme[] = [];
  #expr: WeakSet<Expr> = new WeakSet();
  constructor (source: string | Lexer) {
    super(source instanceof Lexer ? source.stream : source);
    // this.#lexer = (source instanceof Lexer) ? source : new Lexer(source);
  }
  eof() {
    return super.peek().typeIs(Atom.EOF);
  }
  error(message: string) {
    // console.log(Deno.inspect(this.#expr, { colors: true, depth: 10 }));
    super.error(message);
  }
  eat(chars: string) {
    const { literal } = this.peek();
    if (literal !== chars) {
      this.error(
        `Expected the literal « ${ chars } » but instead got « ${ literal } »`);
    }
    this.next();
  }
  // parse the entire stream from the top
  parse(): Block {
    const body: Expr[] = [];
    while (!this.eof()) {
      body.push(this.expression());
      if (!super.eof()) {
        this.eat(";");
      }
    }
    return { type: Kind.Block, rule: Rule.Block, body };
  }
  expression(): Expr {
    return this.callish(() => this.group(this.atom));
  }
  group(parser: () => Expr): Expr {
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
  callish(parser: () => Expr): Expr {
    const expr: Expr = parser.call(this);
    const token = this.peek();
    this.#expr.add(expr);
    return token.validate(Atom.PUNCT, "(") ? this.call(expr) : expr;
  }
  call(fn: Expr): Call {
    const args = this.circumscribed("(", ",", ")", this.expression);
    return { type: Kind.Call, rule: Rule.Call, fn, args };
  }
  conditional(): Conditional {
    this.eat("if");
    const cond = this.expression();
    if (!this.peek().validate(Atom.PUNCT, "{")) this.eat("then");
    const then = this.expression();
    const expr: Conditional = { type: Kind.Conditional, rule: Rule.Conditional, cond, then };
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
  circumscribed<E>(
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
  skip(literal: string, type?: Atom): void {
    const current = this.peek();
    if (type) if (current.validate(type, literal)) this.eat(literal);
    else if (current.literal === literal) this.eat(literal);
  }
  variable(): Call | Variable {
    this.eat("let");
    if (this.peek().typeIs(Atom.REF)) {
      const name = this.next().literal;
      const [ inner, outer ]: [ Parameter[], Arguments[] ] = [ [], [] ];
      const bindings = this.circumscribed("(", ",", ")", this.binding);
      bindings.forEach(({ name, def, type }) => {
        inner.push({ name, type });
        outer.push({ def: def ?? super.false, type: type ?? '' });
      });
      this.skip("in");
      const body = this.expression();
      return {
        type: Kind.Call,
        rule: Rule.Call,
        fn: {
          type: Kind.Lambda,
          rule: Rule.Lambda,
          name,
          args: inner,
          body,
        },
        args: outer,
      };
    }
    const args = this.circumscribed("(", ",", ")", this.binding);
    this.skip("in");
    const body = this.expression();
    return {
      type: Kind.Variable,
      rule: Rule.Variable,
      args,
      body,
    };
  }
  binding(): Binding {
    const name = this.peek().literal;
    let def!: Expr, type!: string;
    this.next();
    if (this.peek().typeIs(Atom.META)) {
      type = this.peek().literal;
      this.next();
    }
    if (this.peek().is(Op.DEF)) {
      this.next();
      def = this.expression();
    }
    return { name, def, type };
  }
  lambda(): Lambda {

    let token = this.peek();
    const name = token.typeIs(Atom.REF) ? token.literal : null;
    if (name) this.next();
    const args = this.circumscribed('|', ',', '|', this.parameter);
    // this.eat("|");
    // token = this.peek();
    // const args: Parameter[] = [];
    // while (token.literal !== "|") {
    //   if (token.validate(Atom.PUNCT, ',')) {
    //     this.eat(',');
    //     break;
    //   }
    //   else if (!token.typeIs(Atom.REF)) {
    //     this.error("Lambda parameters must be unbound symbols!");
    //   }

    //   args.push(this.parameter(token));
    //   if (this.peek().validate(Atom.PUNCT, ",")) {
    //     this.eat(",");
    //   }
    //   token = this.peek();
    // }
    // this.eat("|");
    let body: Expr;
    token = this.peek();
    if (token.validate(Atom.OP, "{")) {
      body = this.block();
    } else {
      body = this.expression();
    }
    return {
      type: Kind.Lambda,
      rule: Rule.Lambda,
      name, args, body
    };
  }
  parameter() {
    const name = this.peek().literal;
    let type;
    this.next();
    if (this.peek().is(":")) {
      this.next();
      if (this.peek().typeIs(Atom.META)) {
        type = this.peek().literal;
        this.next();
      } else {
        this.error("Expected a type for this type annotation, but instead got " + this.peek().literal);
      }
    }
    return { name, type };
  }
  block(): Block | Expr {
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
  vector() {
    const body = this.circumscribed('[', ',', ']', this.expression);
    return { type: Kind.Vector, rule: Rule.Vector, body };
  }
  indexish(parser: () => Expr) {
    const body = parser.call(this);
    const token = this.peek();
    return token.validate(Atom.PUNCT, '[') ? this.index(body) : body;
  }
  index<E>(body: E): Index<E> {
    this.eat('[');
    const idx = this.expression();
    this.eat(']');
    return { type: Kind.Index, rule: Rule.Index, body, idx };
  }

  atom(): Expr {
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
        this.skip(":");
        return this.lambda();
      }
      if (token.validate(Atom.PUNCT, '|')) {
        const lambda = this.lambda();
        if (this.peek().validate(Atom.KW, "at")) {
          this.eat("at");
          return this.call(lambda);
        }
        return lambda;
      }
      if (token.validate(Atom.PUNCT, "[")) {
        return this.indexish(this.vector);
        // return this.vector();
      }
      if (token.typeIn(Atom.REF, Atom.STR)) {
        this.next();
        return this.indexish(() => token);
      }
      if (token.typeIn(Atom.BOOL, Atom.NUM, Atom.SYM)) {
        this.next();
        return token;
      }
      if (this.eof()) {
        throw this.error('Unexpected end of input!');
      }
      throw this.error(`Unable to parse ${ token.toString() }`);
    });
  }
  assign(): Assign | Expr {
    return this.binary(this.or, Rule.Assign, Op.ASSIGN);
  }
  binary(
    parser: () => Expr,
    rule: Rule,
    ...ops: string[]
  ): Expr | Binary<Expr, Expr> {
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
  or(): Expr | Binary<Expr, Expr> {
    return this.binary(this.and, Rule.Or, Op.OR);
  }
  and(): Expr | Binary<Expr, Expr> {
    return this.binary(this.equality, Rule.And, Op.AND);
  }
  equality(): Expr | Binary<Expr, Expr> {
    return this.binary(this.compare, Rule.Equality, Op.EQ, Op.NEQ);
  }
  compare(): Expr | Binary<Expr, Expr> {
    return this.binary(this.term, Rule.Compare, Op.LT, Op.LEQ, Op.GT, Op.GEQ);
  }
  term(): Expr | Binary<Expr, Expr> {
    return this.binary(this.factor, Rule.Term, Op.PLUS, Op.MINUS);
  }
  factor(): Expr | Binary<Expr, Expr> {
    return this.binary(this.conc, Rule.Factor, Op.TIMES, Op.DIV, Op.MOD);
  }
  conc(): Expr | Binary<Expr, Expr> {
    return this.binary(this.atom, Rule.Vector, Op.CONC);
  }
  literal(type: Atom, value: Prim): Literal<Prim> {
    return { type, rule: Rule.Literal, value };
  }
  unary(token: Lexeme): Unary {
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

export function parse(program: string) {
  return new Parser(program).parse();
}
