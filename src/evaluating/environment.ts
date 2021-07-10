import { Node, Expr, Type, Op } from "../parsing/parser.ts";
import type { Prim } from "../parsing/parser.ts";
import type {
  Assign,
  BinExpr,
  Block,
  Call,
  Conditional,
  Lambda,
  Literal,
  UnExpr,
  Variable,
} from "../parsing/expression.ts";

export type Fn = (..._: unknown[]) => unknown;

// TODO: define Value type for accessing scoped values
export type Value = any | Prim | Fn;

interface Args<T> extends Record<string, T> {
  [ t: string ]: T;
}

type Key<T> = T extends Prim ? string : string;

export interface Context {
  args?: Args<unknown>;
  parent?: Envr;
}

// when we enter a lambda/function, we introduce closures by creating a new scope environment `Envr` with its prototype set to that of its parent environment and evaluating said function's body in the new scope environment `Envr` instance.
export class Envr implements Context {
  static interrupted: boolean;
  static message: string | Error;
  static set error (msg: string | Error) {
    this.interrupted = true;
    this.message = msg;
  }
  args: Args<unknown>;
  parent?: Envr;
  /**
   * Instantiates an `Envr` object corresponding to a level of scope. If the constructor is provided with a parent object to inherit from
   */
  constructor ();
  constructor (parent: Envr);
  constructor (parent?: Envr) {
    this.args = Object.create(parent ? parent.args : null);
    this.parent = parent;
  }
  get ctx () {
    return this;
  }
  get snapshot () {
    return "(ENV)> " + Deno.inspect(this, { depth: 5 });
  }
  // TODO: communicate with parser/lexer to report location
  error (msg: string) {
    throw new EvalError(`${ msg }\n${ this.snapshot }`);
  }
  extend () {
    return new Envr(this);
  }
  // look up bindings along prototype chain
  lookup<E> (name: Key<E>) {
    let scope: (Envr | undefined) = this.ctx;
    while (scope) {
      // if the current scope's prototype has the binding as a property, we've found it
      if (Object.prototype.hasOwnProperty.call(scope.args, name)) {
        return scope;
      }
      // otherwise, we go into the parent scope and try again
      scope = scope.parent;
    }
  }
  get<E> (name: Key<E>) {
    if (name in this.args) {
      return this.args[ name ];
    }
    this.error("Cannot get undefined variable " + name);
  }
  // restricting assignment
  // TODO: narrow down assignment not only to \subset current scope, but also to specifically mutable structures
  set<E> (name: Key<E>, value: Value) {
    const scope = this.lookup(name);
    if (!scope && this.parent) {
      this.error("Cannot set undefined variable " + name);
    }

    return (scope ?? this).args[ name ] = value;
  }
  def (name: string, value: Value) {
    return this.args[ name ] = value;
  }
}

export type MetaChar = typeof Type.KW
  | typeof Type.OP
  | typeof Type.PUNCT
  | typeof Type.EOF;
export type Valued = Exclude<Type, MetaChar>;

type Morpheme<T> = T extends Valued ? (string | number | boolean) : Node;

export function evaluate (expr: Expr, env: Envr): Value {
  switch (expr.type) {
    case Type.NUM:
    case Type.STR:
    case Type.BOOL:
      return expr.value;
    case Type.SYM:
      return env.get(expr.value as string);
    case Node.Assign:
      return evalAssign(expr as Assign, env);
    case Node.Unary:
    case Node.Binary:
      return evalBinary(expr as BinExpr<Expr, Expr>, env);
    case Node.Lambda:
      return evalLambda(expr as Lambda, env);
    case Node.Condition:
      return evalConditional(expr as Conditional, env);
    case Node.Block:
      return evalBlock(expr as Block, env);
    case Node.Call:
      return evalCall(expr as Call, env);
    case Node.Variable:
      return evalVariable(expr as Variable, env);
    default:
      throw new Error("Unable to evaluate " + JSON.stringify(expr, null, 2));
  }
}

function evalConditional (expr: Conditional, env: Envr) {
  if (evaluate(expr.cond, env) !== false) {
    return evaluate(expr.then, env);
  }
  return expr.else ? evaluate(expr.else, env) : false;
}

function evalVariable (expr: Variable, env: Envr) {
  let scope: Envr = env;
  for (const arg of expr.args) {
    scope = Object.assign(scope, env.extend());
    scope.def(arg.name, arg.def ? evaluate(arg.def, env) : false);
    // console.log("evalVariable: scope ", scope);
  }
  return evaluate(expr.body, scope);
}

function evalAssign (expr: Assign, env: Envr) {
  if (expr.left.type != Type.SYM) {
    throw new TypeError(
      "Cannot assign to the non-variable " + JSON.stringify(expr.left, null, 2),
    );
  }
  return env.set(expr.left.value, evaluate(expr.right, env));
}

function evalBlock (expr: Block, env: Envr) {
  let result: Value = false;
  for (const arg of expr.body) {
    result = evaluate(arg, env);
  }
  return result;
}
function evalCall (expr: Call, env: Envr) {
  const fn = evaluate(expr.fn, env);
  return fn.apply(null, expr.args.map((arg) => evaluate(arg, env), fn));
}

function evalLambda (expr: Lambda, env: Envr) {
  if (expr.name) {
    env = env.extend();
    env.def(expr.name, lambda);
  }
  function lambda () {
    const names = expr.args;
    const scope = env.extend();
    for (let i = 0; i < names.length; ++i) {
      scope.def(names[ i ], i < arguments.length ? arguments[ i ] : false);
    }
    return evaluate(expr.body, scope);
  }
  return lambda;
}

function evalBinary (expr: BinExpr<Expr, Expr> | UnExpr, env: Envr): Prim {
  return evalBinaryOp(
    expr.operator,
    evaluate(expr.left, env),
    evaluate(expr.right, env),
  );
}

export function evalBinaryOp (op: string, a: Prim, b: Prim) {
  switch (op) {
    case Op.PLUS:
      return _n(a) + _n(b);
    case Op.MINUS:
      return _n(a) - _n(b);
    case Op.TIMES:
      return _n(a) * _n(b);
    case Op.DIV:
      return _n(a) / _d(<number> b);
    case Op.MOD:
      return _n(a) % _d(<number> b);
    case Op.AND:
      return a !== false && b;
    case Op.OR:
      return a !== false ? a : b;
    case Op.LT:
      return _n(a) < _n(b);
    case Op.GT:
      return _n(a) > _n(b);
    case Op.LEQ:
      return _n(a) <= _n(b);
    case Op.GEQ:
      return _n(a) >= _n(b);
    case Op.EQ:
      return a === b;
    case Op.NEQ:
      return a !== b;
    default:
      throw new Error("Unable to recognize operator " + op);
  }
  function _n<K> (x: K) {
    if (typeof x != "number") {
      throw new TypeError("Expected a number, but got " + x);
    }
    else return x;
  }
  function _d<K> (x: K) {
    if (_n(x) === 0) {
      throw new EvalError("Trying to divide by zero!");
    }
    else return x as K;
  }
}
