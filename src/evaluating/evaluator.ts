import { Atom, Op } from "../lexing/mod.ts";
import {
  Kind,
  isAssign,
  isBinary,
  isBlock,
  isCall,
  isConditional,
  isIndex,
  isLambda,
  isLiteral,
  isUnary,
  isVariable,
  isVector
} from "../parsing/mod.ts";
import type {
  Arguments,
  Assign,
  Binding,
  Binary,
  Block,
  Call,
  Conditional,
  Index,
  Lambda,
  Literal,
  // UnExpr,
  Parameter,
  Pipe,
  Variable,
  Vector,
  Expr,
} from "../parsing/mod.ts";
import { Scope } from "./environment.ts";
import type { WygValue, Fn } from "./environment.ts";

export class EvaluatorError extends EvalError {
  constructor (type: string, message: string) {
    super(message);
    this.name = type;
  }
}

export class Evaluator {
  scope = new Scope();
  stdout = [] as WygValue[] & Iterable<WygValue>;
  static error<T>(type: string, message: string): T extends undefined ? never : number {
    throw new EvaluatorError(type, message);
  }
  static number<X>(x: X): number {
    return typeof x != 'number'
      ? Evaluator.error("Type", `Expected a number, but got ${ x }`) | 0
      : x;
  }
  static nonzero<X>(x: X) {
    return (this.number(x) === 0)
      ? Evaluator.error("Eval", "Unable to divide by 0!")
      : x;
  }
  evaluate(expr: Expr, env: Scope): WygValue | Fn {
    switch (expr.type) {
      case Atom.SYM:
      case Atom.NUM:
      case Atom.STR:
      case Atom.BOOL:
        return (expr as Literal<number | string | boolean>).value;
      case Atom.REF:
        return env.get((expr as Literal<string>).value as string);
      case Kind.Assign:
        return this.assign(expr as Assign, env);
      // unary operators have presets atm, so no special evaluation needed
      case Kind.Unary:
      case Kind.Binary:
        return this.branch(expr as Binary<Expr, Expr>, env);
      case Kind.Lambda:
        return this.evalLambda(expr as Lambda, env);
      case Kind.Conditional:
        return this.conditional(expr as Conditional, env);
      case Kind.Block:
        return this.evalBlock(expr as Block, env);
      case Kind.Call:
        return this.evalCall(expr as Call, env);
      case Kind.Variable:
        return this.variable(expr as Variable, env);
      case Kind.Vector:
        return this.vector(expr as Vector, env);
      case Kind.Index:
        return this.index(expr as Index<Vector | Literal<string>>, env);
      // case Kind.Pipe:
      // return this.pipe(expr as Pipe, env);
      default:
        throw new Error("Unable to evaluate " + JSON.stringify(expr, null, 2));
    }
  }
  static run(expr: Expr, runtime?: Scope) {
    const interpreter = new Evaluator();
    if (runtime) interpreter.scope = runtime;
    return [ interpreter.evaluate(expr, interpreter.scope) ];
  }
  index(expr: Index<Vector | Literal<string>>, env: Scope) {
    const idx = this.evaluate(expr.idx, env);
    if (typeof idx !== "number") {
      throw new EvaluatorError("Type", `Only numbers may be used as indices for vectors/lists, however ${ idx } was provided`);
    }
    if (isVector(expr.body) && Array.isArray(expr.body.body))
      return this.evaluate(expr.body.body[ idx ], env);
    else {
      const body = this.evaluate(expr.body, env);
      if (Array.isArray(body)) return body[ idx ];
      else if (typeof body == "string") return body.charAt(idx);
      else throw new EvaluatorError("Type", `Unable to index non-list/vector/string ${ body }`);
    }
  }
  vector(expr: Vector, env: Scope) {
    if (expr.body.length === 0) return [];
    return expr.body.map(el => this.evaluate(el, env));
  }

  conditional(expr: Conditional, env: Scope) {
    if (this.evaluate(expr.cond, env) !== false) {
      return this.evaluate(expr.then, env);
    }
    return expr.else ? this.evaluate(expr.else, env) : false;
  }

  variable(expr: Variable, env: Scope) {
    let scope: Scope = env;
    for (const arg of expr.args) {
      scope = Object.assign(scope, env.extend());
      scope.def(arg.name, arg.def ? this.evaluate(arg.def, env) : false);
    }
    return this.evaluate(expr.body, scope);
  }

  assign(expr: Assign, env: Scope) {
    if (expr.left.type != Atom.REF) {
      throw new TypeError(
        "Cannot assign to the non-variable " + JSON.stringify(expr.left, null, 2),
      );
    }
    return env.set(expr.left.value, this.evaluate(expr.right, env));
  }

  evalBlock(expr: Block, env: Scope) {
    let result: WygValue = false;
    for (const arg of expr.body) {
      result = this.evaluate(arg, env);
    }
    return result;
  }

  evalCall(expr: Call, env: Scope) {
    const fn = <WygValue> this.evaluate(expr.fn, env) as Fn;
    return fn.apply(null, expr.args.map(arg => {
      return this.evaluate(arg, env);
    }, fn));
  }
  isType<T>(arg: T) {
    switch (typeof arg) {
      case "boolean":
        return "Bool";
      case "number":
        return "Num";
      case "string":
        return "Str";
      case "symbol":
        return "Box";
      case "function":
        return "Fn";
      case "object":
        if (Array.isArray(arg)) return "Vec";
        return "Box";
      default:
        return "Any";
    }
  }
  evalLambda(expr: Lambda, env: Scope): WygValue {
    const lambda = (...args: WygValue[]) => {
      const names = expr.args, scope = env.extend();
      for (let i = 0; i < names.length; ++i) {
        scope.def(names[ i ].name,
          ((n: Parameter, a: WygValue) => {
            if (i < args.length) {
              if (n.type) {
                if (n.type == this.isType(a)) {
                  return a;
                } else {
                  throw new EvaluatorError("Type", `Incorrect parameter type for ${ n.name }. Expected ${ n.type } but got ${ this.isType(a) == 'Str' ? '"' + a + '"' : a.toString() }`);
                  // return false;
                }
              }
              return args[ i ];
            }
            return false;
          })(names[ i ], args[ i ]));
      }
      return this.evaluate(expr.body, scope);
    };
    if (expr.name) {
      env = env.extend();
      env.def(expr.name, lambda);
    }
    lambda.toString = function () {
      return `${ expr.name
        ? expr.name
        : '#<lambda>'
        } |${ expr.args.join(', ')
        }|`;
    };
    return lambda;
  }
  branch(
    expr: Binary<Expr, Expr>,
    env: Scope
  ): WygValue {
    return this.binary(expr.operator,
      this.evaluate(expr.left, env),
      this.evaluate(expr.right, env),
    );
  }
  binary(op: string, a: WygValue, b: WygValue) {
    switch (op) {
      case Op.PLUS:
        return Evaluator.number(a) + Evaluator.number(b);
      case Op.MINUS:
        return Evaluator.number(a) - Evaluator.number(b);
      case Op.TIMES:
        return Evaluator.number(a) * Evaluator.number(b);
      case Op.DIV:
        return Evaluator.number(a) / Evaluator.nonzero(<number> b);
      case Op.MOD:
        return Evaluator.number(a) % Evaluator.nonzero(<number> b);
      case Op.AND:
        return a !== false && b;
      case Op.OR:
        return a !== false ? a : b;
      case Op.LT:
        return Evaluator.number(a) < Evaluator.number(b);
      case Op.GT:
        return Evaluator.number(a) > Evaluator.number(b);
      case Op.LEQ:
        return Evaluator.number(a) <= Evaluator.number(b);
      case Op.GEQ:
        return Evaluator.number(a) >= Evaluator.number(b);
      case Op.EQ:
        return this.equality(a, b);
      case Op.NEQ:
        return !this.equality(a, b);
      case Op.CONC:
        return this.concatenate(a, b);
      default:
        throw new Error("Unable to recognize operator " + op);
    }
  }
  equality(a: WygValue, b: WygValue): boolean {
    if (typeof a !== typeof b) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      else return a.every((x, i) => this.equality(x, b[ i ]));
    }
    return a === b;
  }
  concatenate(a: WygValue, b: WygValue) {
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
}

export function evaluate(expr: Expr, env: Scope): WygValue {
  return Evaluator.run(expr, env);
}