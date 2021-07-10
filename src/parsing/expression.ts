import { Type } from "../lexing/token.ts";
import type { Prim, Lexeme } from "../lexing/token.ts";
export { Type } from "../lexing/token.ts";
export type { Prim, Lexeme } from "../lexing/token.ts";

// TODO: change to non-string enums, using mapped enums for external representation
export enum Node {
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
  Variable,
  Call,
  Block,
  Condition,
  Lambda,
  Assign,
  Or,
  And,
  Equality,
  Compare,
  Term,
  Factor,
  Unary,
  Literal,
}


export interface ExprBase {
  type: Node | Type;
}

export interface ExprNode extends ExprBase {
  type: Node;
  rule: Rule;
}

export interface BinExpr<L, R> extends ExprNode {
  type: Node;
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
  type: Node;
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
  type: Node;
  rule: Rule;
  args: Binding[];
  body: Expr;
}

export interface Call extends ExprBase {
  type: Node;
  rule: Rule;
  fn: Expr;
  args: Expr[];
}

export interface Name extends ExprBase {
  type: Type;
  value: string;
}

export interface Assign extends ExprBase {
  type: Node;
  rule: Rule;
  operator: string;
  left: Name;
  right: Expr;
}

export interface Block {
  type: Node;
  rule: Rule;
  body: Expr[];
}

export interface Conditional {
  type: Node;
  rule: Rule;
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
  | Lexeme
  | Name;

export type Keys<T> = { [ P in keyof T ]: T[ P ] };

export function $<T extends ExprBase> (expr: ExprBase): T {
  return <T> expr;
}

export function stringify (expr: Expr) {
  return Deno.inspect(expr, { depth: 5 });
}

export class Expression<T extends ExprBase> implements ExprBase {
  type!: Node | Type;
  constructor (
    node: T,
  ) {
    Object.assign(this, node);
  }
  [ Deno.customInspect ] () {
    Deno.inspect(this, { depth: 15 });
  }
}
