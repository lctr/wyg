import { Type, Token, Atom, Prim } from './token.ts';
export { Type } from './token.ts';
export type { Atom, Prim } from './token.ts';
export enum Ast {
  Block = 'block', Lambda = 'lambda', Call = 'call', Assign ='assign', Binary='binary', Unary='unary',
}

export enum Rule {
  Call = 'call', Block = 'sequence', Lambda = 'lambda', Assign = 'assign', Or = 'or', And = 'and', Equality = 'equality', Compare = 'compare', Term = 'term', Factor = 'factor', Unary = 'unary', Literal = 'literal'
}

export interface ExprBase {
  type: Ast | Type;
}

export interface BinExpr extends ExprBase {
  type: Ast,
  rule: Rule,
  operator: string,
  left: Expr,
  right: Expr,
}
export interface UnExpr extends ExprBase {
  type: Ast,
  rule: Rule,
  operator: string,
  right: Expr,
}

export interface Literal extends ExprBase {
  type: Type,
  rule: Rule,
  value: string | number | boolean,
}

export interface Lambda extends ExprBase {
  type: Ast,
  rule: Rule,
  args: string[],
  body: Expr,
}

export interface Call extends ExprBase {
  type: Ast,
  rule: Rule,
  fn: Expr,
  args: Expr[],
}

export interface Assign extends ExprBase {
  type: Ast,
  rule: Rule,
  operator: string,
  left: {type: Type, value: string },
  right: Expr;
}

export interface Block {
  type: Ast,
  rule: Rule,
  body: Expr[],
}

export type Expr = Block | Lambda | Call | Assign | BinExpr | UnExpr | Literal | Token;