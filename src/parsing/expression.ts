import { Prim, Token, Type } from "../lexing/token.ts";
export { Type } from "../lexing/token.ts";
export type { Atom, Prim } from "../lexing/token.ts";
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
  Block = "block",
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

interface Bool {
  type: Type.BOOL,
  value: boolean;
}

export interface Booln<E> {
  type: Rule.Literal;
  rule?: Rule.Literal,
  value: boolean;
}

export interface ExprNode extends ExprBase {
  type: Ast,
  rule: Rule;
}

export interface BinExpr<L, R> extends ExprNode {
  type: Ast;
  rule: Rule;
  operator: string;
  left: L;
  right: R;
}
export interface UnExpr extends ExprNode {
  operator: string;
  right: Expr;
}

export interface Literal extends ExprBase {
  type: Type;
  rule: Rule;
  value: Prim;
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
  left: { type: Type; value: string; };
  right: Expr;
}

export interface Block {
  type: Ast;
  rule: Rule;
  body: Expr[];
}

export interface Conditional {
  type: Ast;
  cond: Expr;
  then: Expr;
  else?: Expr;
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
  | Token;

type Keys<T> = { [ P in keyof T ]: T[ P ] };

export class Expression<T extends ExprBase> implements ExprBase {
  type!: Ast | Type;
  constructor (
    node: T,
  ) {
    Object.assign(this, node);
  }
  [ Deno.customInspect ] () {
    Deno.inspect(this, { depth: 15 });
  }
}
