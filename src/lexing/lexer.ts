import { Stream, Streamable } from "./stream.ts";
export type { Streamable } from "./stream.ts";
import { Comment, Reserved, Prim, Token, Atom, Types, OpChars, Puncts, Bases, Octals, PreComment } from "./token.ts";
export { Token, Atom, Op } from "./token.ts";
export type { Lexeme, Prim } from "./token.ts";

export class Lexer implements Streamable<Token> {
  stream: Stream;
  #current: Token | null = null;
  constructor (source: string | Stream) {
    this.stream = (source instanceof Stream)
      ? source : new Stream(source);
  }
  get false() {
    return this.#tokenize(Atom.BOOL, false, "\u2205");
  }
  // state methods
  error(message: string) {
    this.stream.error(message);
  }
  peek() {
    return this.#current ?? (this.#current = this.after());
  }
  next() {
    const token = this.#current;
    this.#current = null;
    return token ?? this.after();
  }
  eof() {
    return this.peek().type === Atom.EOF;
  }
  pos() {
    return { line: this.stream.line, col: this.stream.col };
  }
  after(): Token {
    this.#eatWhile(isSpace);

    if (this.stream.eof()) return this.#tokenize(Atom.EOF, "\\0");

    const char = this.stream.peek();

    switch (true) {
      case isComment(char, this.stream.after()):
        this.#comment();
        return this.after();

      case (char == '"'):
        return this.#string();

      case isDigit(char):
        return this.#number();

      case startsWord(char):
        return this.#word();

      case char == '@':
        return this.#special();

      case char == ':':
        if (this.stream.after() == ":") return this.#operator();
        else return this.#punct();
      case isPunct(char):
        // whitespace important for distinguishing `|` from `||`
        if (char == '|' && isOperator(this.stream.after()))
          return this.#operator();
        else return this.#punct();

      case isOperator(char):
        return this.#operator();

      default:
        throw this.error(`Unable to tokenize « ${ char } »`);
    }
  }

  #tokenize(type: Atom, value: Prim, literal?: string) {
    return new Token(type, value, this.pos(), literal);
  }

  // TODO: add support for bases 2, 8, 16
  #number() {
    let infixed = false;
    let float = false;
    let base;
    let digit = isDigit;
    const number: string = this.#eatWhile((c) => {
      if (c == ".") {
        if (infixed) return false;
        infixed = true;
        return true;
      }
      if (isBase(c)) {
        if (infixed) return false;
        infixed = true;
        switch (c) {
          case 'b': digit = isBin; base = 2; break;
          case 'o': digit = isOct; base = 8; break;
          case 'x': digit = isHex; base = 16; break;
        }
        return true;
      }
      if (c == "e") {
        if (infixed) return false;
        infixed = true;
        float = true;
        return true;
      }
      if (c == "+" || c == "-") {
        if (!float && infixed) return false;
        return true;
      }
      return digit(c);
    });

    return this.#tokenize(Atom.NUM, base ? this.#integer(number, base) : parseFloat(number), number);
  }
  #integer(num: string, base: number) {
    if (/^0[box]/.test(num.slice(0, 2)))
      return parseInt(num.slice(2), base);
    else {
      this.error(`Unable to parse integer '${ num }' with base '${ base }'`);
      return 0;
    }
  }
  #string() {
    const string = this.#escaped('"');
    return this.#tokenize(Atom.STR, string);
  }
  #word() {
    const word = this.#eatWhile(isWord);
    return this.#tokenize(isKeyword(word)
      ? Atom.KW
      : isMeta(word)
        ? Atom.META
        : Atom.REF, word);
  }
  #special() {
    return this.#tokenize(Atom.SYM, this.#eatWhile(isSpecial));
  }
  #comment() {
    if (this.stream.after() == Comment.TILDE) {
      this.#eatWhile((c) => c != "\n");
    } else {
      let penult = false;
      this.#eatWhile((c) => {
        if (penult) {
          if (c == "~") return false;
          else penult = false;
        } else if (c == "*") penult = true;
        return true;
      });
    }
    this.stream.next();
  }
  #punct() {
    return this.#tokenize(Atom.PUNCT, this.stream.next());
  }
  #operator() {
    const punctOp = this.#eatWhile(isOperator);
    return this.#tokenize(Atom.OP, punctOp);
  }

  #escaped(terminal: string) {
    let escaped = false, match = "";
    this.stream.next();
    while (!this.stream.eof()) {
      const c = this.stream.next();
      if (escaped) {
        match += c;
        escaped = false;
      } else if (c == "\\") {
        escaped = true;
      } else if (c == terminal) {
        break;
      } else {
        match += c;
      }
    }
    return match;
  }
  #eatWhile(charPred: (ch: string) => boolean) {
    let word = "";
    while (!this.stream.eof() && charPred(this.stream.peek())) {
      word += this.stream.next();
    }
    return word;
  }
}

// pattern matching utils as functions instead of static methods
function isKeyword(word: string) {
  return Reserved.has(word);
}
function isMeta(word: string) {
  return Types.has(word);
}
function isSpace(char: string) {
  return /\s/.test(char);
}
function isDigit(char: string) {
  return /[0-9]/i.test(char);
}
function isOperator(char: string) {
  return OpChars.has(char);
}
function isSpecial(word: string) {
  return word.charAt(0) == "@" || isWord(word);
}
function startsWord(char: string) {
  return /[\p{L}_]/ui.test(char);
}
function isWord(word: string) {
  return startsWord(word) || /[\p{L}\d']/ui.test(word);
}
function isPunct(char: string) {
  return Puncts.has(char);
}
function isComment(left: string, right: string) {
  return PreComment.has(left + right);
}
function isHex(char: string) {
  return /[0-9a-f]/i.test(char);
}
function isBin(char: string) {
  return char == "0" || char == "1";
}
function isOct(char: string) {
  return Octals.has(char);
}
function isBase(char: string) {
  return Bases.has(char);
}

