import { Type, Op } from "../lexing/mod.ts";
import { Prim } from "../lexing/mod.ts";
import { Kind, parse, stringify } from "../parsing/mod.ts";
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
} from "../parsing/mod.ts";
import { Envr, evalBinaryOp } from "./environment.ts";
import type { WygValue } from "./environment.ts";
// The end of the prototype chain for the scope(s) to come

type Continuation = (...args: unknown[]) => WygValue;
type Key = keyof Prim;


function evaluate (expr: Expr, env: Envr, ctn: Continuation) {
  switch (expr.type) {
    case Type.BOOL:
    case Type.NUM:
    case Type.STR:
      ctn(expr.value);
      return;
    case Type.SYM:
      ctn(env.get(<keyof Prim> expr.value));
      return;
    case Kind.Assign:
      evalAssign(<Assign> expr, env, ctn);
      return;
    case Kind.Binary:
      evalBinary(<BinExpr<Expr, Expr>> expr, env, ctn);
      return;

  }
}

function applyOp (op: string, left: Expr, right: Expr) {

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
    (left: any) => evaluate(expr.right, env,
      (right: any) => ctn(applyOp(expr.operator, left, right))));
  return;
}