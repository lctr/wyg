import { Atom } from "../lexing/token.ts";
import type { Prim, Lexeme, Types } from "../lexing/token.ts";
export { Atom } from "../lexing/token.ts";
export type { Prim, Lexeme } from "../lexing/token.ts";

// TODO: change to non-string enums, using mapped enums for external representation

export enum Kind {
  Block = "block",
  Conditional = "conditional",
  Vector = "vector",
  Variable = "variable",
  Lambda = "lambda",
  Call = "call",
  Assign = "assign",
  Binary = "binary",
  Unary = "unary",
  Literal = "literal",
  Index = "index",
  Pipe = "pipe"
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
  Conditional,
  Lambda,
  Vector,
  Assign,
  Index,
  Pipe
}

/**
 * Every Expression node 
 */
export interface ExprBase {
  type: Atom | Kind | string;
}

export interface ExprNode extends ExprBase {
  rule: Rule;
}

export interface Binary<L, R> extends ExprNode {
  operator: string,
  left: L,
  right: R,
}

export interface Unary extends ExprNode {
  type: Kind.Unary,
  operator: string,
  left: Literal<Prim>,
  right: Expr,
}

export interface Literal<T> extends ExprNode {
  value: T, //Prim,
}

export interface Lambda extends ExprNode {
  name?: string | null,
  args: Parameter[],
  body: Expr,
}

export interface Arguments {
  def: Expr,
  type: string | null,
}

export interface Parameter {
  name: string,
  type?: string | null,
}

export interface Binding extends Parameter {
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
  args: Expr[] | Arguments[],
  typed?: boolean,
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

/**
 * An expression containing a collection of expressions. Unlike Blocks, a Vector does not resolve to an atomic value, but rather holds (possibly by iteration) a collection of values.
 */
export interface Vector extends ExprNode {
  body: Expr[];
}

export interface Index<T> extends ExprNode {
  body: T,
  idx: Expr,
}

export interface List extends Vector {
  pred: Expr[],
}

export interface Pipe extends ExprNode {
  fns: Expr[],
  arg: Expr,
}


export type Expr =
  | Block
  | Vector
  | Index<Expr | Expr[] | Prim[]>
  | Pipe
  | Conditional
  | Lambda
  | Variable
  | Call
  | Assign
  | Binary<Expr, Expr>
  | Unary
  | Literal<Prim>
  | Lexeme
  | Arguments
  | Name;
