import type { Prim } from "../lexing/mod.ts";

export const nil = Symbol();
export type Fn = (...args: any[]) => any;

// TODO: define Value type for accessing scoped values
export type WygValue = Prim
  | Fn
  | WygValue[]
  | Iterable<WygValue>
  | { (): WygValue; }
  | { (_?: Fn | WygValue): WygValue; };

interface Profile extends Record<string, any> {
  name: string,
  value: WygValue,
  type?: string,
  kind?: string,
  // for type overloading?
  alts?: Profile[],
}
export interface Args<T> extends Record<string, T> {
  [ t: string ]: T;
}

export interface Context {
  args?: Args<Profile>;
  parent?: Scope;
}

// when we enter a lambda/function, we introduce closures by creating a new scope environment `Envr` with its prototype set to that of its parent environment and evaluating said function's body in the new scope environment `Envr` instance.
export class Scope implements Context {
  static interrupted: boolean;
  static message: Error;

  args: Args<Profile>;
  parent?: Scope;
  constructor ();
  constructor (parent: Scope);
  constructor (parent?: Scope) {
    this.args = Object.create(parent ? parent.args : null);
    this.parent = parent;
  }
  get snapshot(): string {
    return Object.entries(this.args)
      .reduce((s, [ k, t ]) => ` ${ s.length
        + (typeof t).length > 77
        ? s + '\n  '
        : s + '' } ${ k }::${ typeof t },`,
        '(Scope)> \n').trim();
  }

  // TODO: communicate with parser/lexer to report location
  error(msg: string) {
    throw new EvalError(`${ msg }\n${ this.snapshot }`);
  }
  extend() {
    return new Scope(this);
  }
  // look up bindings along prototype chain
  lookup(name: string) {
    // deno-lint-ignore no-this-alias
    let scope: (Scope | undefined) = this;
    while (scope) {
      if (Object.prototype.hasOwnProperty.call(scope.args, name)) {
        return scope;
      }
      scope = scope.parent;
    }
  }
  get(name: string): Profile | never {
    if (name in this.args) {
      return this.args[ name ];
    }
    throw this.error(`Cannot get undefined variable '${ name }'`);
  }
  // restricting assignment
  // TODO: implement constants
  set(name: string, value: WygValue, type?: string): WygValue {
    const scope = this.lookup(name);
    if (!scope && this.parent) {
      this.error(`Cannot set undefined variable '${ name }'`);
    }
    const ref = (scope ?? this).args[ name ];
    if (type) {
      if (ref.type == type) {
        return ref.value = value;
      } else {
        if (!ref.alts) ref.alts = [ ref ];
        else ref.alts.push(ref), ref.value = value;
        return value;
      }
    } else
      return ((scope ?? this).args[ name ] = { name, value, type }).value;
  }
  def(name: string, value: WygValue, type?: string) {
    return (this.args[ name ] = { name, value, type }).value;
  }
  // mostly for debugging, but potentially for CPS or related
  // 
  static get stackmax() {
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
  }
}


