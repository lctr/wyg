import * as E from "./mod.ts";
import * as P from "../parsing/mod.ts";
import { assertEquals } from "../deps.ts";
// updated environment using Maps

Deno.test({
  name: "call infix 'at'",
  fn: () => {
    const actual = E.Evaluator.run(P.parse('fn inc |n| n <- n + 1 at (1); '));
    assertEquals(actual, 2);
  }
});

Deno.test({
  name: "list cons",
  fn: () => {
    const actual = E.evaluate(P.parse(`
    1 <> 2 <> 3 <> [["hello"]] == [1, 2, 3, ["hello"]]
    `), new E.Scope());
    console.log(actual);
    assertEquals(actual, true);
  }
});

Deno.test({
  name: "list head",
  fn: () => {
    const actual = E.evaluate(P.parse(`
    [1, 2, 3, 4][5 - 3]
    `), new E.Scope());
    assertEquals(actual, 3);
  }
});

Deno.test({
  name: "list index ",
  fn: () => {
    const actual = E.evaluate(((ast) => {
      console.log(Deno.inspect(ast, { depth: 10, colors: true }));
      return ast;
    })(P.parse(`
    [1, 2, 3, 4][4 - 3];
    `)), new E.Scope());
    console.log(actual);
    assertEquals(actual, 2);
  }
});

Deno.test({
  name: "nested let-scopes",
  fn: () => {
    const src = `let (a = 1, b = 2) { 
      let (c = a + b, d = |n| n / 4) in
        if d(c) < d(2 * b)
        then b = 4 else b = 3;
      b = b * 2 + 1;
      [a, b];
    };`;
    let scope;
    const actual = E.Evaluator.run(P.parse(src), scope = new E.Scope());
    console.log(actual);
    console.log(scope);
    assertEquals(actual, [ 1, 9 ]);
  }
});

Deno.test({
  name: "Out of scope failure",
  fn: () => {
    const src = `let (a = 1, b = 2) { 
      let (c = a + b, d = |n| n / 4) in
        if d(c) < d(2 * b)
        then b = 4 else b = a / 3;
      b = b * 2 + 1;
      [a, b, c];
    };`;
    // @ts-ignore asdegh
    const actual = E.Evaluator.run(P.parse(src));
    console.log(actual);
  }
});

Deno.test({
  name: "Recursively loop 1000 times",
  fn() {
    const actual = E.Evaluator.run(P.parse(`let loop (n = 10e3)
           if n == 0    then 0
           else    loop(n - 1);`));

    assertEquals(actual, 0);
  }
});