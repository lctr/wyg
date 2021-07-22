import { Lexer, Atom } from "./mod.ts";
import { assertEquals } from "../deps.ts";

Deno.test({
  name: "wildcard _ is SYM",
  fn () {
    const token = new Lexer('_').next();
    assertEquals(token.type, Atom.SYM);
  }
});

Deno.test({
  name: "single-word string",
  fn () {
    const token = new Lexer(`"cars"`).next();
    assertEquals(token.type, Atom.STR);
  }
});

Deno.test({
  name: "multi-word string", fn () {
    const token = new Lexer(`"these are some cars"`).next();
    assertEquals(token.type, Atom.STR);
  }
});

Deno.test({
  name: "decimal",
  fn () {
    const token = new Lexer('3.14').next();
    assertEquals(token.value, 3.14);
  }
});

Deno.test({
  name: "float", fn () {
    const token = new Lexer('12e3').next();
    assertEquals(token.value, 12e3);
  }
});

Deno.test({
  name: "hex 170",
  fn: () => {
    const token = new Lexer('0xAA').next();
    assertEquals(token.value, 0xAA);
  }
});

Deno.test({
  name: "exp 100", fn: () => {
    const token = new Lexer("10e2").next();
    assertEquals(token.value, 10e2);
  }
});

Deno.test({
  name: "exp 100", fn: () => {
    const token = new Lexer("10e+2").next();
    assertEquals(token.value, 10e+2);
  }
});


Deno.test({
  name: "bin 0b11", fn: () => {
    const token = new Lexer("0b11").next();
    assertEquals(token.value, 0b11);
  }
});


Deno.test({
  name: "hex 0x11",
  fn: () => {
    const token = new Lexer("0x11").next();
    assertEquals(token.value, 0x11);
  }
});

Deno.test({
  name: "lambda parameters",
  fn () {
    const lexer = new Lexer(`|a, b|`);
    const expected = [ Atom.PUNCT, Atom.SYM, Atom.PUNCT, Atom.SYM, Atom.PUNCT ];
    const tokens = expected.map(() => lexer.next().type);
    assertEquals(tokens, expected);
  }
});

Deno.test({
  name: "single vertical bar is PUNCT",
  fn () {
    const token = new Lexer("|").next();
    assertEquals(token, Atom.PUNCT);
  }
});

Deno.test({
  name: "double vertical bars is OP",
  fn () {
    const token = new Lexer("||").next();
    assertEquals(token, Atom.OP);
  }
});

