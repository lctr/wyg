import type { Expr } from "../parsing/mod.ts";
import { parse } from "../parsing/mod.ts";
import { evaluate } from "../evaluating/mod.ts";
import { Scope } from "../evaluating/environment.ts";
import type { WygValue } from "../evaluating/environment.ts";
import { Runtime } from "./builtin.ts";
import { Tree } from "../util/printing.ts";

// FOR REPL
let prev: WygValue | null;
export function previous () {
  return prev ?? '';
}

export function stackMax () {
  return evaluate(parse(`(wyg'max'frames)`), Runtime);
}

export function run (program: string) {
  let ast;
  try {
    ast = parse(program);
    try {
      prev = evaluate(ast, Runtime);
      return Tree.beautify(prev);
    } catch (e) {
      prev = null;
      console.error('Evaluation error!');
      throw e;
    }
  } catch (e) {
    Tree.beautify(ast);
    throw e;
  }
}

export function show (program: string) {
  try {
    const ast = parse(program);
    return Tree.beautify(ast);
  } catch (e) {
    return Tree.beautify(e.message);
  }
}

export class Program {
  readonly #src: string;
  #env: Scope;
  ast!: Expr;
  result!: WygValue;
  hasError = false;
  error!: Error;
  static async fromFile (path: string) {
    try {
      return new Program(await Deno.readTextFile(path));
      // catch the Deno exception, throw corresponding Wyg exception
      // TODO: move IO confirmation out to controller
    } catch (e) {
      console.log(e);
      if (!confirm("Would you like to try again?")) {
        Deno.exit(0);
      }
      return new Program('false');
    }
  }
  constructor (public body: string) {
    this.#src = body;
    this.#env = Runtime;
  }
  parse () {
    try {
      this.ast = parse(this.#src);
    } catch (e) {
      this.hasError = true;
      this.error = e;
      console.log(e);

    }
    return this;
  }
  evaluate () {
    try {
      this.result = evaluate(this.ast, this.#env);
    } catch (e) {
      this.hasError = true;
      this.error = e;
      console.log(e);
    }
    return this;
  }
  printAst () {
    if (!this.ast) this.parse();
    console.log(Tree.beautify(this.ast));
    return this;
  }
  printEnv () {
    if (!this.ast) this.parse().evaluate();
    console.log(Tree.beautify(this.#env));
    return this;
  }
}