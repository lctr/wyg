import { parse } from "../parsing/mod.ts";
import { Scope } from "../evaluating/environment.ts";
import { evaluate } from "../evaluating/evaluator.ts";
import type { WygValue, Fn } from "../evaluating/environment.ts";


const Runtime = new Scope();

// TODO: IO will likely constitute its own separate section, e.g., StdLib = { IO, ...libs }
Runtime.def("print", (v: WygValue) => {
  console.log(v);
  return v;
});

Runtime.def("t'sec", Date.now);

Runtime.def("t'delta", (fn: Fn) => {
  if (typeof fn != "function") return (() => {
    console.log('Callable expression not provided.');
    return fn;
  })();

  const label = `ʃ ${ fn.name } dt`;
  try {
    console.time(label);
    return fn();
  } finally {
    console.timeEnd(label);
  }
});

Runtime.def("t'pause", (duration = 100, fn = () => false) => {
  let value = false;
  setTimeout(() => value = fn(), duration);
  return value;
});

Runtime.def("file'read", (path: string) => {
  try {
    return Deno.readTextFileSync(path);
  } catch (e) {
    console.error(e);
    return '';
  }
});

Runtime.def("type'of", (arg: WygValue) => {
  switch (typeof arg) {
    case "number":
      return "Number";
    case "string":
      return "String";
    case "function":
      if (" cons nil cdr ".includes(arg.name)) return "List";
      return "Closure";
    case "object":
      if (Array.isArray(arg)) return "Vector";
      return "List";
    default:
      return false;
  }
});

Runtime.def("wyg'max'frames", () => {
  let i = 0;
  const inc = () => {
    ++i;
    inc();
  };
  try {
    inc();
  } catch {
    return i;
  }
  return i;
});



const BASIC = `
~~ Basic built-in utilities
cons <- |a, b| |c| c(a, b);
car <- |cell| cell(|a, b| a);
cdr <- |cell| cell(|a, b| b);
nil <- |f| f(nil, nil);

for'each <- |list, f| if list != nil
  then {
    f(car(list));
    for'each(cdr(list), f)
};

range <- |a, b| if
  a <= b then cons(a, range(a + 1, b))
  else nil;

math'abs <- |n| if n >= 0 then n else -n;

`;


evaluate(parse(BASIC), Runtime);
export { Runtime };