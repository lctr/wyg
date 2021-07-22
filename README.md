# Wyg

[WIP]

Wyg (_/wɪg/_): A high-level scripting language taking advantage of the TypeScript runtime provided by Deno with no dependencies outside of the Deno std library.
Wyg would like to be usable, but is primarily an excursion in language design.

## Overview

Everything in Wyg tries to be an expression. Most things so far are *like* S-expressions, as Wyg was inspired by Rust with a Lisp. While currently weakly (and dynamically) typed, Wyg aspires to implement optional static typing.

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

Lambda expressions are identified by parameters wrapped in vertical bars `|...|`, followed by either a standalone `expression`, or a `body`. A `body`, surrounded by curly brackets, is an expression whose value is defined by the value of the **last** expression in a sequence of expressions.

```
~~ this lambda takes the sum of two elements
|a, b| a + b;

~~ this lambda is a curried function of the above
|a| |b| a + b; 
(|a| |b| a + b)(2)(3);                    ~~> 5

~~ and is applied by wrapping it adjacent to its arguments
(|a, b| a + b) (1, 2);                    ~~> 3
(|a| |b| a + b)(3)(4);                    ~~> 7

~* since lambdas can get gnarly, we can opt to use a `let` 
   expression to define parameters *~
(|a, b| let (c = a + b) 2 * c) (1, 2);    ~~> 6
let (a = 1, b = 2, c = a + b) in 2 * c;   ~~> 6

```
A `let` expression binds a value to a symbol, holds it for 
   use from within the body of the expression, and is a form 
   of syntactic sugar over lambda closures and allow for an 
   optional keyword `in` after parameter definitions but 
   before expression body
```
let (sum = (|a, b| a + b)) 
  sum (1, 2) + sum (2, 3);        ~~> 8
```
`let` expressions may also be named, paving the way for 
   named lambda expressions necessary for recursion. 
   Here is an example of the fibonacci sequence.
```
let (fib = |n| if n < 2 then n 
  else fib(n - 1) + fib(n - 2)) 
in fib(8);                        ~~> 21
```

Alternatively, we could move our definition to the body  using (scoped!) assignment.
```
let (fib) {
  ~~ notice that parameter definitions use `=` (and are 
  ~~ restricted in where they may appear), while variable 
  ~~ assignment uses `<-`.
  fib <- |n| 
    if n < 2 then n 
    else fib(n - 1) + fib(n - 2);
  fib (8)
};

```





# TODO
Certain items are premarked: 
**(?)** := optional or uncertain, **(!)** := food for thought.

- [x] Clean up module imports/exports
- [ ] Unit tests
- [x] Add variable bindings
- [x] Add support for binary, octal, hex, and decimal numbers
- [x] Implement parsing + evaluating unary op expressions
- [ ] **(!)** Implement arbitrary floating point precision
- [x] Add list literals
- [x] Implement cons, list operations
- [x] **(!)** Syntactic sugar
- [ ] **(?)** Static typing
- [ ] Implement AST analyzer
- [x] **(!)** Improve error handling
- [ ] Code generation
- [ ] Standard library
