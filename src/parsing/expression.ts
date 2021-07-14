import { Type } from "../lexing/token.ts";
import type { Prim, Lexeme } from "../lexing/token.ts";
export { Type } from "../lexing/token.ts";
export type { Prim, Lexeme } from "../lexing/token.ts";

// TODO: change to non-string enums, using mapped enums for external representation
export enum Kind {
  Block = "block",
  Condition = "condition",
  Vector = "vector",
  Variable = "variable",
  Lambda = "lambda",
  Call = "call",
  Assign = "assign",
  Binary = "binary",
  Unary = "unary",
}

export enum Rule {
  Or,
  And,
  Equality,
  Compare,
  Term,
  Factor,
  Unary,
  Literal,
  Block = Kind.Block,
  Variable = Kind.Variable,
  Call = Kind.Call,
  Condition = Kind.Condition,
  Lambda = Kind.Lambda,
  Vector = Kind.Vector,
  Assign = Kind.Assign,
}

/**
 * Every Expression node 
 */
export interface ExprBase {
  type: Kind | Type;
}

export interface ExprNode extends ExprBase {
  rule?: Rule;
}

export interface BinExpr<L, R> extends ExprNode {
  operator: string;
  left: L;
  right: R;
}

export interface UnExpr extends ExprNode {
  operator: string;
  left: Literal;
  right: Expr;
}

export interface Literal extends ExprNode {
  value: Prim;
}

export interface Lambda extends ExprNode {
  name?: string | null;
  args: string[];
  body: Expr;
}

export interface Binding {
  name: string;
  def: Expr;
}

export interface Name extends ExprBase {
  value: string;
}

export interface Variable extends ExprNode {
  args: Binding[];
  body: Expr;
}

export interface Call extends ExprNode {
  fn: Expr;
  args: Expr[];
}

export interface Assign extends ExprNode {
  operator: string;
  left: Name;
  right: Expr;
}

export interface Block extends ExprNode {
  body: Expr[];
}

export interface Conditional extends ExprNode {
  cond: Expr;
  then: Expr;
  else?: Expr;
}

export interface Vector extends ExprBase {

}

type Branch<T> = T extends ExprBase ? T : Expr;



export type Expr =
  | Block
  | Conditional
  | Lambda
  | Variable
  | Call
  | Assign
  | BinExpr<Expr, Expr>
  | UnExpr
  | Literal
  | Lexeme
  | Name;

export type Keys<T> = { [ P in keyof T ]: T[ P ] };


export function stringify (expr: Expr, depth = 5) {
  return Deno.inspect(expr, { colors: true, depth });
}

export class Expression<T extends ExprBase> implements ExprBase {
  type!: Kind | Type;
  constructor (
    node: T,
  ) {
    Object.assign(this, node);
  }
  [ Deno.customInspect ] () {
    Deno.inspect(this, { depth: 15 });
  }
}

export class Ast<T> {

}