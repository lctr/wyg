# Wyg

[WIP]

Wyg (_/wɪg/_): A high-level scripting language taking advantage of the TypeScript runtime provided by Deno with no dependencies outside of the Deno std library.
Wyg would like to be usable, but is primarily an excursion in language design.

## Overview

Everything in Wyg tries to be an expression. Most things so far are S-expressions, as Wyg was inspired by Rust with a Lisp.

### Comments

Line comments are prefixed with `~~`, while block comments are prefixed with `~*` and postfixed with `*~`.

```
~~ this is a line comment
~~> it makes for a squiggly arrow
~~: or any other arbitrary comment delimiter/bullet 
~~~ anything after `~~` in the same line is ignored
```

```
~* this is 
   a block
   comment! *~
```

### Lambdas

Since lambdas are anonymous functions, it follows that lambdas are written as such. Lambda expressions syntactically are followed by either a standalone *expression*, or a *body*, defined as the expression whose value is defined by the **last** expression in a sequence of contained expressions.


```
~~ this lambda takes the sum of two elements
(|a, b| a + b);

~~ and is applied by wrapping it with its arguments
((|a, b| a + b) (1, 2));  ~~> 3

~~ since lambdas can get gnarly
((|a, b| let (c = a + b) 2 * c) (1, 2)); ~~> 6

~~ a `let` binding is syntactic sugar for lambda closures
let (sum = (|a, b| a + b)) sum (1, 2);  ~~> 3
```

Otherwise, lambda parameters are followed by a body -- a sequence of expressions
-- enclosed in curly braces `{`, `}` with each sequential expression delimited
by a semicolon `;`. Notice that 

```
(|a, b| {
  let (x = 0) a + b > x
});
```



# TODO
Certain items are premarked 
**(?)** := optional or uncertain, **(!)** := food for thought.
- [ ] Update private member fields
- [ ] Clean up module imports/exports
- [ ] Unit tests
- [x] Add variable bindings
- [ ] Add support for binary, octal, hex, and decimal numbers
- [ ] Implement parsing + evaluating unary op expressions
- [ ] **(!)** Implement arbitrary floating point precision
- [ ] Add array and hash types
- [ ] Implement array and hash literals
- [ ] **(!)** Syntactic sugar
- [ ] **(?)** Static typing
- [ ] Implement AST analyzer
- [ ] Improve error handling
- [ ] Code generation
- [ ] Standard library
