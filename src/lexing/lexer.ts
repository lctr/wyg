import { Stream, Streamable } from "./stream.ts";
export type { Streamable } from "./stream.ts";
import { Comment, KW, Prim, Token, Type } from "./token.ts";
export { Token, Type, Op, Kw } from "./token.ts";
export type { Lexeme, Prim } from "./token.ts";

export class Lexer implements Streamable<Token> {
  stream: Stream;
  #current: Token | null = null;
  constructor (source: string | Stream) {
    this.stream = (source instanceof Stream) ? source : new Stream(source);
  }
  get false () {
    return this.tokenize(Type.BOOL, false, "<FALSE>");
  }
  // state methods
  error (message: string) {
    this.stream.error(message);
  }
  peek () {
    return this.#current ?? (this.#current = this.after());
  }
  next () {
    const token = this.#current;
    this.#current = null;
    return token ?? this.after();
  }
  eof () {
    return this.peek().type === Type.EOF;
  }
  pos () {
    return { line: this.stream.line, col: this.stream.col };
  }
  after (): Token {
    this.eatWhile(isSpace);

    if (this.stream.eof()) return this.tokenize(Type.EOF, "\\0");

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

      case isPunct(char):
        if (char == "|" && this.stream.after() == "|") {
          return this.#operator();
        } else {
          return this.#punct();
        }

      case isOperator(char):
        return this.#operator();

      default:
        throw this.error("Unable to tokenize " + char);
    }
  }

  private tokenize (type: Type, value: Prim, literal?: string) {
    return new Token(type, value, this.pos(), literal);
  }

  // TODO: add support for bases 2, 8, 16
  #number () {
    let infixed = false;
    // let base: number;
    const number = this.eatWhile((c) => {
      if (c == ".") {
        if (infixed) return false;
        infixed = true;
        return true;
      }
      return isDigit(c);
    });
    return this.tokenize(Type.NUM, parseFloat(number), number);
  }
  #string () {
    const string = this.escaped('"');
    return this.tokenize(Type.STR, string);
  }
  #word () {
    const word = this.eatWhile(isWord);
    return this.tokenize(isKeyword(word) ? Type.KW : Type.SYM, word);
  }
  #comment () {
    if (this.stream.after() == Comment.TILDE) {
      this.eatWhile((c) => c != "\n");
    } else {
      let penult = false;
      this.eatWhile((c) => {
        if (penult) {
          if (c == "~") return false;
          else penult = false;
        } else if (c == "*") penult = true;
        return true;
      });
    }
    this.stream.next();
  }
  #punct () {
    return this.tokenize(Type.PUNCT, this.stream.next());
  }
  #operator () {
    return this.tokenize(Type.OP, this.eatWhile(isOperator));
  }

  // modulating consumption of tokens
  private escaped (terminal: string) {
    let escaped = false, match = "";
    this.stream.next();
    while (!this.stream.eof()) {
      const c = this.stream.next();
      if (escaped) {
        match += c, escaped = false;
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
  private eatWhile (charPred: (ch: string) => boolean) {
    let word = "";
    while (!this.stream.eof() && charPred(this.stream.peek())) {
      word += this.stream.next();
    }
    return word;
  }
}

// pattern matching utils as functions instead of static methods
function isKeyword (word: string) {
  return KW.indexOf(word) > -1;
}
function isSpace (char: string) {
  return /\s/.test(char);
}
function isDigit (char: string) {
  return /[0-9]/i.test(char);
}
function isOperator (char: string) {
  return "=&|<>!+-*/^%".indexOf(char) > -1;
}
function startsWord (char: string) {
  return /[\p{L}_]/ui.test(char);
}
function isWord (word: string) {
  return startsWord(word) || /[\p{L}\d']/ui.test(word);
}
function isPunct (char: string) {
  return ",;()[]{}|#".indexOf(char) > -1;
}
function isComment (left: string, right: string) {
  return " ~~ ~* ".indexOf(" " + left + right + " ") > -1;
}


// export default { Type, Token, Lexer };
