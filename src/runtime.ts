import { parse } from './parser.ts';
import { evaluate } from './evaluator.ts';
import { global } from './prelude.ts';

export function run (program: string) {
  try {
    const ast = parse(program);
    return evaluate(ast, global);
  } catch (e) {
    return e;
  }
}