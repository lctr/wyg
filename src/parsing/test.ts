import { Parser, parse } from "../parsing/mod.ts";
import { assertEquals } from "../deps.ts";

const print = (arg: any) => {
  console.log(arg);
  return arg;
};

Deno.test({
  name: "parentheses",
  fn () {
    const ast = new Parser(`(foo(bar(baz))) + 2`);
    print(ast.atom());
    print(ast.peek());
  }
});

Deno.test({
  name: "brackets",
  fn () {
    const ast = new Parser(`[1, 2, 3]`);
    print(ast.circumscribed('[', ',', ']', ast.expression));
  }
});