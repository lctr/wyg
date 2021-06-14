
# Wyg
[WIP] 

Wyg (*/wɪg/*): A high-level scripting language taking advantage of the TS runtime provided by Deno with no dependencies outside of the Deno std library.

## Overview
Everything in Wyg tries to be an expression. 

### Comments
Line comments are prefixed with `~~`, while block comments are prefixed with `~*` and postfixed with `*~`.
```
~~ this is a line comment 
```
```
~* this is 
   a block
   comment! *~
```

### Lambdas
Lambdas come in two flavors. For a single output expression, the arrow `->` followed by the returned expression and `;` is accepted.
```
~~ this lambda takes the sum of two elements
|a, b| -> a + b; 
```

Otherwise, lambda parameters are followed by a body -- a sequence of expressions -- enclosed in curly braces `{`, `}` with each sequential expression delimited by a semicolon `;`. Note the last expression is *not* followed by a semicolon.
```
|a, b| {let x = 0; a + b > x}
```
