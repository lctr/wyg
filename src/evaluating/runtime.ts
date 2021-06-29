import { parse } from "../parsing/parser.ts";
import { evaluate, globalEnv, } from "./environment.ts";

export function run (program: string) {
  try {
    const ast = parse(program);
    return evaluate(ast, globalEnv);
    // return { error: false, result: evaluate(ast, globalEnv) };
  } catch (e) {
    // return { error: true, result: e };
    return Deno.inspect(e, { depth: 5 });
  }
}
