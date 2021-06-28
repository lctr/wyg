import { Token, Type } from "./token.ts";
export { Type } from "./token.ts";
export type { Atom, Prim } from "./token.ts";
export enum Ast {
  Block = "block",
  Condition = "condition",
  Variable = "variable",
  Lambda = "lambda",
  Call = "call",
  Assign = "assign",
  Binary = "binary",
  Unary = "unary",
}

export enum Rule {
  Variable = "variable",
  Call = "call",
  Block = "sequence",
  Condition = "condition",
  Lambda = "lambda",
  Assign = "assign",
  Or = "or",
  And = "and",
  Equality = "equality",
  Compare = "compare",
  Term = "term",
  Factor = "factor",
  Unary = "unary",
  Literal = "literal",
}

export interface ExprBase {
  type: Ast | Type;
}

export interface BinExpr extends ExprBase {
  type: Ast;
  rule: Rule;
  operator: string;
  left: Expr;
  right: Expr;
}
export interface UnExpr extends ExprBase {
  type: Ast;
  rule: Rule;
  operator: string;
  right: Expr;
}

export interface Literal extends ExprBase {
  type: Type;
  rule: Rule;
  value: string | number | boolean;
}

export interface Lambda extends ExprBase {
  type: Ast;
  rule: Rule;
  name?: string | null;
  args: string[];
  body: Expr;
}

export interface Binding {
  name: string;
  def: Expr;
}

export interface Variable {
  type: Ast;
  rule: Rule;
  args: Binding[];
  body: Expr;
}

export interface Call extends ExprBase {
  type: Ast;
  rule: Rule;
  fn: Expr;
  args: Expr[];
}

export interface Assign extends ExprBase {
  type: Ast;
  rule: Rule;
  operator: string;
  left: { type: Type; value: string };
  right: Expr;
}

export interface Block {
  type: Ast;
  rule: Rule;
  body: Expr[];
}

export interface Conditional {
  type: Ast,
  cond: Expr,
  then: Expr,
  else?: Expr,
}

export type Expr =
  | Block
  | Conditional
  | Lambda
  | Variable
  | Call
  | Assign
  | BinExpr
  | UnExpr
  | Literal
  | Token;
