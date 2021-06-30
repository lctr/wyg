# Wyg

[WIP]

Wyg (_/wɪg/_): A high-level scripting language taking advantage of the TS
runtime provided by Deno with no dependencies outside of the Deno std library. Wyg would like to be usable, but is primarily an excursion in language design.

## Overview

Everything in Wyg tries to be an expression.

### Comments

Line comments are prefixed with `~~`, while block comments are prefixed with
`~*` and postfixed with `*~`.

```
~~ this is a line comment
```

```
~* this is 
   a block
   comment! *~
```

### Lambdas

Lambda notation was inspired by Rust with a slight Lisp. Since lambdas are anonymous functions, it follows that lambdas are written as such.

```
~~ this lambda takes the sum of two elements
(|a, b| a + b);
```

Otherwise, lambda parameters are followed by a body -- a sequence of expressions
-- enclosed in curly braces `{`, `}` with each sequential expression delimited
by a semicolon `;`. 

```
(|a, b| {
  let x = 0; 
  a + b > x
});
```

# TODO
*?* := optional.

- [ ] Unit tests
- [x] Add variable bindings
- [ ] Add support for binary, octal, hex, and decimal numbers
- [ ] Implement parsing + evaluating unary op expressions
- [ ] Add array and hash types
- [ ] Implement array and hash literals
- [ ] Syntactic sugar
- [ ] Static typing (?)
- [ ] Implement AST analyzer
- [ ] Improve error handling
- [ ] Code generation
- [ ] Standard library
