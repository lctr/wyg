/** GENERATED BASED ON ENUMS `Kind` **/

import { Atom, Kind } from "./mod.ts";
import type { Expr, Block, Conditional, Vector, Variable, Lambda, Call, Assign, Binary, Unary, Literal, Index } from "./mod.ts";

export function isBlock (node: Expr): node is Block {
  return node.type === Kind.Block;
}

export function isConditional (node: Expr): node is Conditional {
  return node.type === Kind.Conditional;
}

export function isVector (node: Expr): node is Vector {
  return node.type === Kind.Vector;
}

export function isVariable (node: Expr): node is Variable {
  return node.type === Kind.Variable;
}

export function isLambda (node: Expr): node is Lambda {
  return node.type === Kind.Lambda;
}

export function isCall (node: Expr): node is Call {
  return node.type === Kind.Call;
}

export function isAssign (node: Expr): node is Assign {
  return node.type === Kind.Assign;
}

export function isBinary (node: Expr): node is Binary<Expr, Expr> {
  return node.type === Kind.Binary;
}

export function isUnary (node: Expr): node is Unary {
  return node.type === Kind.Unary;
}

export function isLiteral (node: Expr): node is Literal {
  return node.type === Kind.Literal;
}

export function isIndex (node: Expr): node is Index {
  return node.type === Kind.Index;
}
