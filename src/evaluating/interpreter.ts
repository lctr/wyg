import { Type } from "../lexing/token.ts";
import { Expr, Ast, Assign, BinExpr, Lambda, Conditional, Block, Call, Variable } from "../parsing/expression.ts";
import { Envr, Value } from "./environment.ts";

export function evaluate (expr: Expr, env: Envr): Value {
  switch (expr.type) {
    case Type.NUM:
    case Type.STR:
    case Type.BOOL:
      return expr.value;
    case Type.SYM:
      return env.get(expr.value as string);
    case Ast.Assign:
      return evalAssign(expr as Assign, env);
    case Ast.Binary:
      return evalBinary(expr as BinExpr<Expr, Expr>, env);
    // case Ast.Unary:
    case Ast.Lambda:
      return evalLambda(expr as Lambda, env);
    case Ast.Condition:
      return evalConditional(expr as Conditional, env);
    case Ast.Block:
      return evalBlock(expr as Block, env);
    case Ast.Call:
      return evalCall(expr as Call, env);
    case Ast.Variable:
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
    scope = env.extend();
    scope.def(arg.name, arg.def ? evaluate(arg.def, env) : false);
    console.log("evalVariable: scope ", scope);
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
  let result = false;
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

function evalBinary (expr: BinExpr<Expr, Expr>, env: Envr): number | boolean {
  return evalBinaryOp(
    expr.operator,
    evaluate(expr.left, env),
    evaluate(expr.right, env),
  );
}

function evalBinaryOp (op: string, a: number | boolean, b: number) {
  switch (op) {
    case "+":
      return _n(a) + _n(b);
    case "-":
      return _n(a) - _n(b);
    case "*":
      return _n(a) * _n(b);
    case "/":
      return _n(a) / _d(b);
    case "%":
      return _n(a) % _d(b);
    case "&&":
      return a !== false && b;
    case "||":
      return a !== false ? a : b;
    case "<":
      return _n(a) < _n(b);
    case ">":
      return _n(a) > _n(b);
    case "<=":
      return _n(a) <= _n(b);
    case ">=":
      return _n(a) >= _n(b);
    case "==":
      return a === b;
    case "!=":
      return a !== b;
    default:
      throw new Error("Unable to recognize operator " + op);
  }
  function _n<K> (x: K) {
    if (typeof x != "number") {
      throw new TypeError("Expected a number, but got " + x);
    } else return x;
  }
  function _d<K> (x: K) {
    if (_n(x) == 0) throw new EvalError("Trying to divide by zero!");
    else return x;
  }
}