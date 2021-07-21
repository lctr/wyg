import { Atom, Op } from "../lexing/mod.ts";
import { Kind } from "../parsing/mod.ts";
import type {
  Assign,
  BinExpr,
  Block,
  Call,
  Conditional,
  Index,
  Lambda,
  Literal,
  // UnExpr,
  Variable,
  Vector,
  Expr,
} from "../parsing/mod.ts";
import { Scope } from "./environment.ts";
import type { WygValue, Fn } from "./environment.ts";


export function evaluate (expr: Expr, env: Scope): WygValue {
  switch (expr.type) {
    case Atom.NUM:
    case Atom.STR:
    case Atom.BOOL:
      return (expr as Literal).value;
    case Atom.SYM:
      return env.get((expr as Literal).value as string);
    case Kind.Assign:
      return evalAssign(expr as Assign, env);
    // unary operators have presets atm, so no special evaluation needed
    case Kind.Unary:
    case Kind.Binary:
      return evalBinary(expr as BinExpr<Expr, Expr>, env);
    case Kind.Lambda:
      return evalLambda(expr as Lambda, env);
    case Kind.Condition:
      return evalConditional(expr as Conditional, env);
    case Kind.Block:
      return evalBlock(expr as Block, env);
    case Kind.Call:
      return evalCall(expr as Call, env);
    case Kind.Variable:
      return evalVariable(expr as Variable, env);
    case Kind.Vector:
      return evalVector(expr as Vector, env);
    case Kind.Index:
      return evalIndex(expr as Index, env);
    default:
      throw new Error("Unable to evaluate " + JSON.stringify(expr, null, 2));
  }
}

function evalIndex (expr: Index, env: Scope) {
  const idx = evaluate(expr.idx, env);
  if (typeof idx !== "number") {
    throw new TypeError(`Only numbers may be used as indices for vectors/lists, however ${ idx } was provided`);
  }
  return evaluate(expr.body.body[ idx ], env);
}

function evalVector (expr: Vector, env: Scope) {
  if (expr.body.length === 0) return false;
  return expr.body.map(el => evaluate(el, env));
}

function evalConditional (expr: Conditional, env: Scope) {
  if (evaluate(expr.cond, env) !== false) {
    return evaluate(expr.then, env);
  }
  return expr.else ? evaluate(expr.else, env) : false;
}

function evalVariable (expr: Variable, env: Scope) {
  let scope: Scope = env;
  for (const arg of expr.args) {
    scope = Object.assign(scope, env.extend());
    scope.def(arg.name, arg.def ? evaluate(arg.def, env) : false);
  }
  return evaluate(expr.body, scope);
}

function evalAssign (expr: Assign, env: Scope) {
  if (expr.left.type != Atom.SYM) {
    throw new TypeError(
      "Cannot assign to the non-variable " + JSON.stringify(expr.left, null, 2),
    );
  }
  return env.set(expr.left.value, evaluate(expr.right, env));
}

function evalBlock (expr: Block, env: Scope) {
  let result: WygValue = false;
  for (const arg of expr.body) {
    result = evaluate(arg, env);
  }
  return result;
}

function evalCall (expr: Call, env: Scope) {
  const fn = <WygValue> evaluate(expr.fn, env) as Fn;
  return fn.apply(null, expr.args.map(arg => evaluate(arg, env), fn));
}

function evalLambda (expr: Lambda, env: Scope): WygValue {
  function lambda (...args: WygValue[]) {
    const names = expr.args, scope = env.extend();
    for (let i = 0; i < names.length; ++i) {
      scope.def(names[ i ], i < args.length ? args[ i ] : false);
    }
    return evaluate(expr.body, scope);
  }
  if (expr.name) {
    env = env.extend();
    env.def(expr.name, lambda);
  }
  lambda.toString = function () {
    return `Lambda ${ expr.name ? expr.name : '_' } { ${ expr.args.reduce((a, n, i) => `${ a }${ i }: ${ n }, `, '')
      }}`;
  };
  return lambda;
}

function evalBinary (
  expr: BinExpr<Expr, Expr>,
  env: Scope
): WygValue {
  return evalBinaryOp(expr.operator,
    evaluate(expr.left, env),
    evaluate(expr.right, env),
  );
}

function evalConc (a: WygValue, b: WygValue) {
  if (typeof a == 'string' && typeof b == 'string') {
    return `${ a + b }`;
  } else if (Array.isArray(a) && Array.isArray(b)) {
    return [ ...a, ...b ];
  } else if (Array.isArray(a) && !Array.isArray(b)) {
    return [ ...a, b ];
  } else if (!Array.isArray(a) && Array.isArray(b)) {
    return [ a, ...b ];
  } else if (!Array.isArray(a) && !Array.isArray(b)) {
    return [ a, b ];
  } else {
    throw new Error("Unable to handle arguments '" + a + "' and '" + b + "' for concat operator '<> '");
  }
}

function evalEq (a: WygValue, b: WygValue): boolean {
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    else return a.every((x, i) => evalEq(x, b[ i ]));
  }
  return a === b;
}

export function evalBinaryOp (op: string, a: WygValue, b: WygValue) {
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
      return evalEq(a, b);
    case Op.NEQ:
      return !evalEq(a, b);
    case Op.CONC:
      return evalConc(a, b);
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



// TODO: encapsulate computation in its own monoid
class Computation {
  #num () {

  }
}