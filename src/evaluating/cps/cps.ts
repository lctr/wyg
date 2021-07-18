import { Type, Op } from "../../lexing/mod.ts";
import { Prim } from "../../lexing/mod.ts";
import { Kind, parse, stringify } from "../../parsing/mod.ts";
import type {
  Assign,
  BinExpr,
  Block,
  Call,
  Conditional,
  Lambda,
  Literal,
  // UnExpr,
  Variable,
  Expr,
  Name,
} from "../../parsing/mod.ts";
import { Envr, evalBinaryOp } from "../environment.ts";
import type { WygValue } from "../environment.ts";
// The end of the prototype chain for the scope(s) to come

type Continuation = (...args: any[]) => void;
type Key = keyof Prim;

function isLiteral (expr: Literal | Exclude<Expr, Literal>): expr is Literal {
  const { type } = (expr as Literal);
  return (type === Type.BOOL) || (type === Type.NUM) || (type === Type.STR);
}


function evaluate (expr: Expr, env: Envr, ctn: Continuation) {

  switch (expr.type) {
    case Type.BOOL:
    case Type.NUM:
    case Type.STR:
      ctn((expr as Literal).value);
      return;
    case Type.SYM:
      ctn(env.get((expr as Literal).value + ''));
      return;
    case Kind.Assign:
      evalAssign(<Assign> expr, env, ctn);
      return;
    case Kind.Binary:
      evalBinary(<BinExpr<Expr, Expr>> expr, env, ctn);
      return;
    case Kind.Variable:
      evalVariable(expr as Variable, env, ctn);
      return;
    case Kind.Lambda:
      evalLambda(env, expr as Lambda);
      return;
    case Kind.Condition:
      evalConditional(expr as Conditional, env, ctn);
      return;
    case Kind.Block:
      evalBlock(expr as Block, env, ctn);
      return;
    case Kind.Call:
      evalCall(expr as Call, env, ctn);
      break;
    default:
      throw new EvalError("Unable to evaluate: " + expr.type);

  }
}
function evalVariable (expr: Variable, env: Envr, ctn: Continuation) {
  (function iter (env: Envr, i: number) {
    if (i < expr.args.length) {
      const v = expr.args[ i ];
      if (v.def) evaluate(v.def, env, value => {
        const scope = env.extend();
        scope.def(v.name, value);
        iter(scope, i + 1);
      }); else {
        const scope = env.extend();
        scope.def(v.name, false);
        iter(scope, i + 1);
      }
    } else evaluate(expr.body, env, ctn);
  })(env, 0);
  return;
}

function evalConditional (expr: Conditional, env: Envr, ctn: Continuation) {
  evaluate(expr.cond, env, cond => {
    if (cond !== false) evaluate(expr.then, env, ctn);
    else if (expr.else) evaluate(expr.else, env, ctn);
    else ctn(false);
    return;
  });
}

function evalBlock (expr: Block, env: Envr, ctn: Continuation) {
  (function loop (last, i: number) {
    if (i < expr.body.length) {
      evaluate(expr.body[ i ], env, (v: WygValue) => loop(v, i + 1));
    } else {
      ctn(last);
    }
  })(false, 0);
  return;
}

function evalCall (expr: Call, env: Envr, ctn: Continuation) {
  evaluate(
    expr.fn, env, (fn) => (function loop (args, i) {
      if (i < expr.args.length) {
        evaluate(expr.args[ i ], env, (arg) => {
          args[ i + 1 ] = arg;
          loop(args, i + 1);
        });
      } else {
        fn.apply(null);
      }
    })([ ctn ], 0)
  );
}

function evalLambda (env: Envr, expr: Lambda) {
  if (expr.name) {
    env = env.extend();
    env.def(expr.name, lambda);
  }
  function lambda (ctn: Continuation) {
    const { args } = expr;
    const scope = env.extend();
    // able to use regular loop here since arguments have already been computed in Call node
    for (let i = 0, len = args.length; i < len; ++i) {
      scope.def(args[ i ], (i + 1) < arguments.length ? arguments[ i + 1 ] : false);
      evaluate(expr.body, scope, ctn);
    }
  }
  return lambda;
}

function evalAssign (expr: BinExpr<Name, Expr>, env: Envr, ctn: Continuation) {
  if (expr.left.type != Type.SYM) {
    throw new Error(`Cannot assign to ${ stringify(expr.left) }`);
  }
  evaluate(expr.right, env, right => ctn(env.set(expr.left.value, right)));
  return;
}
function evalBinary (expr: BinExpr<Expr, Expr>, env: Envr, ctn: Continuation) {
  evaluate(expr.left, env,
    (left: Prim) => evaluate(expr.right, env,
      (right: Prim) => ctn(evalBinaryOp(expr.operator, left, right))));
  return;
}

Deno.test({
  name: "CPS evaluator: sum", fn: () => {
    const scope = new Envr();
    type CC = (newValue: any) => void;
    scope.def("print", (ctn: CC, txt: string) => {
      console.log(txt);
      ctn(false);
    });
    const ast = parse(`
      print(3 + 4);
      fib <- |n| if n < 2 then n
        else fib(n - 1) + fib(n - 2);
      print(fib(27));`);
    console.log(Deno.inspect(ast, { colors: true, depth: 10 }));
    console.time('cps');
    try {
      console.log(evaluate(ast, scope, result => {
        console.log(result);
        throw result;
      }));
      console.timeEnd('cps');
    } catch (e) {
      console.log(e);
    }
  }
});

