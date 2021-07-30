import { Atom } from "../lexing/token.ts";
import type { Prim, Lexeme, Types } from "../lexing/token.ts";
export { Atom } from "../lexing/token.ts";
export type { Prim, Lexeme } from "../lexing/token.ts";

// TODO: change to non-string enums, using mapped enums for external representation

export enum Kind {
  Block = "Block",
  Conditional = "Conditional",
  Vector = "Vector",
  Tuple = "Tuple",
  Variable = "Variable",
  Lambda = "Lambda",
  Call = "Call",
  Assign = "Assign",
  Binary = "Binary",
  Unary = "Unary",
  Literal = "Literal",
  Index = "Index",
  Pipe = "Pipe"
}


export enum Rule {
  Index,
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
  Tuple,
  Pipe
}

/**
 * Every Expression node 
 */
export interface ExprBase {
  type: Atom | Kind,
}

export interface ExprNode extends ExprBase {
  rule: Rule,
}

export interface Binary<L, R> extends ExprNode {
  operator: string,
  left: L,
  right: R,
}

export function isBinary(node: Expr): node is Binary<Expr, Expr> {
  return node.type === Kind.Binary;
}

export interface Unary extends ExprNode {
  type: Kind.Unary,
  operator: string,
  left: Literal<Prim>,
  right: Expr,
}

export function isUnary(node: Expr): node is Unary {
  return node.type === Kind.Unary;
}

export interface Literal<T> extends ExprNode {
  value: T, //Prim,
}

export function isLiteral(node: Expr): node is Literal<Prim> {
  return node && 'value' in node && node.type === Kind.Literal;
}

export interface Lambda extends ExprNode {
  args: Parameter[],
  body: Expr,
  name?: string | null,
  sign?: string[],
}

// export interface Signature extends Binary<Lexeme |> {

// }

export function isLambda(node: Expr): node is Lambda {
  return node.type === Kind.Lambda;
}

export interface Arguments {
  def: Expr,
  type?: string | null,
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

export function isVariable(node: Expr): node is Variable {
  return node.type === Kind.Variable;
}

export interface Call<T extends (Arguments | Expr)> extends ExprNode {
  fn: Expr,
  args: T[],
  typed?: boolean,
}

export function isCall<T extends Expr>(node: Expr): node is Call<T> {
  return node.type === Kind.Call;
}

export interface Assign extends ExprNode {
  operator: string,
  left: Name,
  right: Expr,
}

export function isAssign(node: Expr): node is Assign {
  return node.type === Kind.Assign;
}

export interface Block extends ExprNode {
  body: Expr[],
}

export function isBlock(node: Expr): node is Block {
  return node.type === Kind.Block;
}

export interface Conditional extends ExprNode {
  cond: Expr;
  then: Expr;
  else?: Expr;
}

export function isConditional(node: Expr): node is Conditional {
  return node.type === Kind.Conditional;
}

/**
 * An expression containing a collection of expressions. Unlike Blocks, a Vector does not resolve to an atomic value, but rather holds (possibly by iteration) a collection of values.
 */
export interface Vector extends ExprNode {
  body: Expr[];
}

export function isVector(node: Expr): node is Vector {
  return node.type === Kind.Vector;
}

export interface Index<T> extends ExprNode {
  body: T,
  idx: Expr,
}

export function isIndex<T extends Expr>(node: Expr): node is Index<T> {
  return node.type === Kind.Index;
}

export interface Tuple<T> extends ExprNode {
  parts: T[];
}

export interface Cons<S, T> extends ExprNode {
  head: S,
  tail: T | Cons<S, T>,
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
  | Call<Binding | Arguments | Expr>
  | Assign
  | Binary<Expr, Expr>
  | Unary
  | Literal<Prim>
  | Lexeme
  | Arguments
  | Name;
