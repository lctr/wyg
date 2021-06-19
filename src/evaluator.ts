import { Type, Ast, Rule, Expr } from './parser.ts';
import type { Lambda, Block, Call, Assign, BinExpr, UnExpr, Literal } from './nodeType.ts';

type Value = any;

// when we enter a function, create a new Scope with its prototype set to that of its parent environment, evaluating the function's body in this new Scope
export class Scope {
  args: Record<string, Value>;
  parent!: Scope;
  // constructor ();
  // constructor (parent: Scope);
  constructor(parent?: Scope) {
    this.args = Object.create(parent ? parent.args : null);
    this.parent = parent || Object.getPrototypeOf(this);
  }
  get ctx (): Scope {
    return this;
  }
  error (msg: string) {
    throw new EvalError (msg + "\n");
  }
  extend () {
    return new Scope(this);
  }
  // look up prototype chain
  lookup (name: string) {
    let scope = this.ctx;
    while (scope) {
      if (Object.prototype.hasOwnProperty.call(scope.args, name))
        return scope;
      scope = scope.parent;
    }
   }
  get (name: string) {
    if (name in this.args) 
      return this.args[ name ];
    throw this.error("Undefined variable " + name);
  }
  set (name: string, value: Value) {
    const scope = this.lookup(name);
    if (!scope && this.parent) 
      throw this.error("Undefined variable " + name);
    
    return (scope || this).args[ name ] = value;
  }
  def (name: string, value: Value) {
    return this.args[ name ] = value;
  }
}

export function evaluate(expr: Expr, env: Scope): Value {
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
      return evalBinary(expr as BinExpr, env);
    case Ast.Unary:
    case Ast.Lambda:
      return evalLambda(expr as Lambda, env);
    case Ast.Block:
      return evalBlock(expr as Block, env);
    case Ast.Call:
      return evalCall(expr as Call, env);
    default:
      throw new Error("Unable to evaluate " + JSON.stringify(expr, null, 2));
  }
}

function evalAssign (expr: Assign, env: Scope) {
  if (expr.left.type != Type.SYM)
    throw new TypeError("Cannot assign to the non-variable " + JSON.stringify(expr.left, null, 2));
  return env.set(expr.left.value, evaluate(expr.right, env));
}

function evalBlock (expr: Block, env: Scope) {
  let result = false;
  // expr.body.forEach(function (arg) { result = evaluate(arg, env)});
  for (const step of expr.body) {
    result = evaluate(step, env);
  }
  return result;
}
function evalCall (expr: Call, env: Scope) {
  const fn = evaluate(expr.fn, env);
  return fn.apply(null, expr.args.map((arg) => evaluate(arg, env)))
}

function evalLambda (expr: Lambda, env: Scope) {
  const names = expr.args;
  const scope = env.extend();
  return function () {
    for (let i = 0; i < names.length; ++i)
      scope.def(names[ i ], i < arguments.length ? arguments[ i ] : false);
    return evaluate(expr.body, scope);
  }
}

function evalBinary (expr: BinExpr, env: Scope): number | boolean {
  return evalBinaryOp(expr.operator, evaluate(expr.left, env), evaluate(expr.right, env));
}

function evalBinaryOp (op: string, a: number | boolean, b: number) {
  switch (op) {
    case "+": return _n(a) + _n(b);
    case "-": return _n(a) - _n(b);
    case "*": return _n(a) * _n(b);
    case "/": return _n(a) / _d(b);
    case "%": return _n(a) % _d(b);
    case "&&": return a !== false && b;
    case "||": return a !== false ? a : b;
    case "<": return _n(a) < _n(b);
    case ">": return _n(a) > _n(b);
    case "<=": return _n(a) <= _n(b);
    case ">=": return _n(a) >= _n(b);
    case "==": return a === b;
    case "!=": return a !== b;
    default:
      throw new Error("Unable to recognize operator " + op);
  }
  function _n<K> (x: K) {
    if (typeof x != 'number') throw new TypeError("Expected a number, but got " + x);
    else return x;
  }
  function _d<K> (x: K) {
    if (_n(x) == 0) throw new EvalError("Trying to divide by zero!");
    else return x;
  }
}

export default { Scope, evaluate };