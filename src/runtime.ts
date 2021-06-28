import { parse } from "./parser.ts";
import { evaluate, globalEnv } from "./environment.ts";

export function run(program: string) {
  try {
    const ast = parse(program);
    return evaluate(ast, globalEnv);
  } catch (e) {
    return e;
  }
}
