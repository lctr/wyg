import { Atom } from "../lexing/token.ts";
import type { Prim, Lexeme } from "../lexing/token.ts";
export { Atom } from "../lexing/token.ts";
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
  Literal = "literal"
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
  Block,
  Variable,
  Call,
  Condition,
  Lambda,
  Vector,
  Assign,
}

/**
 * Every Expression node 
 */
export interface ExprBase {
  type: Atom | Kind;
}

export interface ExprNode extends ExprBase {
  rule: Rule;
}

export interface BinExpr<L, R> extends ExprNode {
  operator: string,
  left: L,
  right: R,
}

export interface UnExpr extends ExprNode {
  type: Kind.Unary,
  operator: string,
  left: Literal,
  right: Expr,
}

export interface Literal extends ExprNode {
  value: Prim,
}

export interface Lambda extends ExprNode {
  name?: string | null,
  args: string[],
  body: Expr,
  arity?: number;
}

export interface Binding {
  name: string,
  def: Expr,
}

export interface Name extends ExprBase {
  value: string,
}

export interface Variable extends ExprNode {
  args: Binding[],
  body: Expr,
}

export interface Call extends ExprNode {
  fn: Expr,
  args: Expr[],
}

export interface Assign extends ExprNode {
  operator: string,
  left: Name,
  right: Expr,
}

export interface Block extends ExprNode {
  body: Expr[],
}

export interface Conditional extends ExprNode {
  cond: Expr;
  then: Expr;
  else?: Expr;
}

export interface Vector extends ExprNode {
  body: Expr[];
  head: Expr,
  tail: Expr[],
}

export interface List extends Vector {
  pred: Expr[],
}

export type Expr =
  | Block
  | Vector
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
