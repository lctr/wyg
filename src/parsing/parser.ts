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
  parsed: Expr[] = [];
  set expr(expr: Expr) {
    this.parsed.push(expr);
  }
  constructor (source: string | Lexer) {
    super(source instanceof Lexer ? source.stream : source);
  }
  eof() {
    return super.peek().typeIs(Atom.EOF);
  }
  error(message: string) {
    super.error(message);
  }
  eat(chars: string) {
    if (this.peek().literal !== chars) {
      this.error(
        `Expected the literal « ${ chars } » but instead got « ${ this.peek().literal } »`);
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
  /**
   * Entry point for recursive descent.
   * @returns The next legal epression.
   */
  expression(): Expr {
    return this.callish(() => this.group(this.atom));
  }
  /**
   * Decision point between how to handle upcoming "(" based on current token.
   * 
   * Consider `x -> a "(" b "+" c ")"` for an expression `x`, 
   *     where we consider `x` to be *complete* if `"(" 
   *  
   * If `a` is an operator, then `(b + c)` must indicate that `x` is NOT a complete expression, as `+(3 + 4)` alone is not a legal expression, and therefore must be a subexpression of the expression parsed by the provided `parser` argument.
   * 
   * If `a` is NOT an operator, then `x` is a valid expression and therefore has a value identical to that of `"(" x ")"`.
   * For example, `3`, `print`, and `print(3)` are valid expressions, since 
   * * `3 = (3)`
   * * `print = (print)`
   * * `print(3) = (print(3))`
   * * `print(3) = ((print)(3))`
   * 
   * @param parser Parser instance method to execute if the current token is not valid as its own standalone expression. 
   * @returns 
   */
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
   * **Ex:** Given the pattern `x _ ...`. where `x` is the expression produced by calling the `parser` argument.  
   * * If `_` is `"("`, then we have 
   * ```
   * x ( ...
   * ```, 
   * indicating `x` is a subexpression of a *Call* expression; 
   * * * E.g., `print` in the expression `print("hello")`.
   * * Otherwise, return the expression produced by the `parser` argument.
   * Thus reducing this decision to the production instance `x _ -> x "(" | x`.
   * 
   * **Note**: This method corresponds to the following production rules dictated by the grammar:
   * ```
   * Expr   -> Call | Expr
   * Call   -> Expr <PUNCT> (Exprs)* <PUNCT>
   * Exprs  -> Expr (<PUNCT> Expr)+ | Expr
   * ```
   * @param parser - The `Parser` instance method used to produce the expression that, when preceding a `"("` would be the `fn` of a `Call` expression, or returned otherweise.
   * @returns {Expr} Expression produced by `parser`, either as a standalone expression or as the `fn` property of a `Call` expression (corresponding to the function being called).
   */
  callish(parser: () => Expr): Expr {
    const expr: Expr = parser.call(this);
    const token = this.peek();
    return token.match(Atom.PUNCT, "(") ? this.call(expr) : expr;
  }

  call(fn: Expr): Call<Expr> {
    const args = this.circumscribed("(", ",", ")", this.expression);
    return { type: Kind.Call, rule: Rule.Call, fn, args };
  }
  /**
   * 
   * @returns {Conditional} Expression whose value depends on the boolean valued `cond` subexpression (i.e., object property). All `Conditional` expressions must have a `cond` and a `then` subexpression. If a `Conditional` expression has an `else` node, it will only be evaluated if the `cond` node does not evaluate to true. A `Conditional` expression whose `cond` node evaluates to false and does not have an 'else' node will evaluate by default to `false`**[1].
   */
  conditional(): Conditional {
    this.eat("if");
    const cond = this.expression();
    if (!this.peek().match(Atom.PUNCT, "{")) this.eat("then");
    const then = this.expression();
    const expr: Conditional = {
      type: Kind.Conditional,
      rule: Rule.Conditional,
      cond, then
    };
    if (this.peek().match(Atom.KW, "else")) {
      this.next();
      expr.else = this.expression();
    }
    return expr;
  }
  /**
   * Parses a sequence of #tokens according to the production rules specified by the method `parser` generic parameter, thereby restricting the `parser` parameter to have a well-defined return type. 
   *  of ` where the array is defined by three affix parameters `prefix`, `infix`, and `suffix`.  
   * @param {string} prefix - The string literal denoting the beginning of the sequence.
   * @param {string} infix - The string literal delimiting expressions throughout the sequence.
   * @param {string} suffix - The string literal denoting the end of the sequence.
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
    const end = () => this.peek().is(suffix);
    this.eat(prefix);
    let first = true;
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
  word() {
    return this.peek().literal;
  }
  match(literal: string, type?: Atom) {
    if (type) return this.peek().match(type, literal);
    else return literal == this.word();
  }
  matchT(...types: Atom[]) {
    return this.peek().typeIn(...types);
  }

  ignore(literal: string): void;
  ignore(literal: string, type?: Atom): void;
  ignore(literal: string, type?: Atom): void {
    // if (type && this.peek().match(type, literal)) this.eat(literal);
    // else if (this.word() == literal) this.eat(literal);
    if (this.match(literal, type)) this.eat(literal);
  }
  variable(): Call<Arguments | Expr> | Variable {
    this.eat("let");
    if (this.peek().typeIs(Atom.REF)) {
      const name = this.next().literal;
      const [ prams, args ]: [
        Parameter[],
        (Arguments | Expr)[]
      ] = [ [], [] ];
      this.circumscribed("(", ",", ")", this.binding)
        .forEach(({ name, def, type }) => {
          prams.push({ name, type });
          args.push(def ?? super.false);
        });
      this.ignore("in");
      const body = this.expression();
      return {
        type: Kind.Call,
        rule: Rule.Call,
        fn: {
          type: Kind.Lambda,
          rule: Rule.Lambda,
          name,
          args: prams,
          body,
        },
        args,
      };
    }
    const args = this.circumscribed("(", ",", ")", this.binding);
    this.ignore("in");
    const body = this.expression();
    return {
      type: Kind.Variable,
      rule: Rule.Variable,
      args, body,
    };
  }
  binding(): Binding {
    const name = this.peek().literal;
    let def!: Expr, type!: string;
    this.next();
    if (this.peek().is(":")) {
      this.next();
      if (this.peek().typeIs(Atom.META))
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
    const token = this.peek();
    const name = token.typeIs(Atom.REF) ? token.literal : null;
    if (name) this.next();
    const args = this.circumscribed('|', ',', '|', this.parameter);
    const body = this.peek().match(Atom.OP, "{")
      ? this.block()
      : this.expression();
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
        return {
          type: Kind.Block,
          rule: Rule.Block,
          body
        };
    }
  }
  vector() {
    const body = this.circumscribed('[', ',', ']', this.expression);
    return {
      type: Kind.Vector,
      rule: Rule.Vector,
      body
    };
  }
  indexish(parser: () => Expr): Index<Expr> | Expr {
    const body = parser.call(this);
    const token = this.peek();
    return token.match(Atom.PUNCT, '[') ? this.index(body) : body;
  }
  index(body: Expr) {
    this.eat('[');
    return this.indexish(() => {
      const idx = this.expression();
      this.eat(']');
      return {
        type: Kind.Index,
        rule: Rule.Index,
        body, idx
      };
    });
  }

  atom(): Expr {
    return this.callish(() => {
      const token = this.peek();
      if (token.match(Atom.PUNCT, "(")) {
        this.next();
        const expr = this.expression();
        this.eat(')');
        return expr;
      }
      if (token.match(Atom.OP, Op.NEG, Op.NOT)) {
        return this.unary(token);
      }
      if (token.match(Atom.PUNCT, "{")) {
        return this.block();
      }
      if (token.match(Atom.KW, "if")) {
        return this.conditional();
      }
      if (token.match(Atom.KW, "let")) {
        return this.variable();
      }
      if (token.match(Atom.KW, "fn")) {
        this.eat("fn");

        const name = this.peek();
        if (!name.typeIs(Atom.REF)) {
          this.error("Expected a function name, but instead got " + name);
        }

        this.next();
        let sign;
        if (this.match(Op.TYPE)) {
          this.next();
          // sign = this.circumscribed(Op.TYPE, Op.RET)
          //@ts-ignore wfqdwq
          sign = this.binary(() => {
            if (this.match('(')) {
              return {
                type: Kind.Vector,
                rule: Kind.Vector,
                body: this.circumscribed('(', ',', ')', this.next)
              };
            }
            return this.next();
          }, Rule.Call, Op.RET);
        }
        const right = this.lambda();
        right.name ??= name.literal;
        return {
          type: Kind.Assign,
          rule: Rule.Assign,
          operator: Op.ASSIGN,
          left: name,
          right,
          sign
        };
        // return this.lambda();
      }
      if (token.match(Atom.PUNCT, '|')) {
        const lambda = this.lambda();
        if (this.peek().match(Atom.KW, "at")) {
          this.eat("at");
          return this.call(lambda);
        }
        return lambda;
      }
      if (token.match(Atom.PUNCT, "[")) {
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
    while (token.match(Atom.OP, ...ops)) {
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

  *[ Symbol.iterator ]() {
    let expr;
    while (!this.eof()) {
      expr = this.expression();
      if (!super.eof()) this.eat(';');
      yield expr;
      this.expr = expr;
    }
  }
}

export function parse(program: string) {
  return new Parser(program).parse();
}
