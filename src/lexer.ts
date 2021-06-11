import { Stream } from './stream.ts';

// lexeme kinds
export enum Type {
  KW, STR, NUM, SYM, OP, PUNCT, EOF
}

export class Token {
  constructor (public type: Type, public value: string | number) { }
  toString () {
    return `${ Type[ this.type ] }[ ${ this.value } ]`;
  }
}

/**
 * Generates a stream of tokens from a given string input. Upon completion of stream, all following token value calls will return `null`.
 * 
 * Peek to see where we're at
 * PeekNext to lookahead 
 * Next to update stream position
 */
export class Lexer {
  stream: Stream;
  private current!: Token | null;
  private static readonly keywords = " if then else fn true false ";
  constructor (source: string | Stream) {
    if (source instanceof Stream) this.stream = source;
    else this.stream = new Stream(source);
  }
  // state methods
  error (message: string) {
    this.stream.error(message);
  }
  // for non-blocking errors to be used by parser(s)
  get pos () {
    const { pos: start, line, col } = this.stream;
    return { start, line, col };
  }
  peek () {
    return this.current || (this.current = this.peekNext());
  }
  peekNext (): Token | null {
    this.eatWhile(Lexer.isSpace);

    if (this.stream.eof()) return null;

    const char = this.stream.peek();

    switch (true) {
      case (char == '~'):
        this.skipComment();
        return this.peekNext();
      case (char == '"'):
        return this.eatString();
      case Lexer.isDigit(char):
        return this.eatNumber();
      case Lexer.isWordStart(char):
        return this.eatWord();
      case Lexer.isPunct(char):
        return this.eatPunct();
      case Lexer.isOperator(char):
        return this.eatOperator();
      default:
        this.error("Unable to tokenize " + char);
    }

    // for type-checking purposes, TODO: look at later
    return new Token(Type.EOF, "\0");
  }
  next () {
    const token = this.current;
    this.current = null;
    return token || this.peekNext();
  }
  eof () {
    return this.current == null;
  }
  // consumption methods
  private eatNumber () {
    let infixed = false;
    const number = this.eatWhile((c) => {
      if (c == '.') {
        if (infixed) {
          infixed = true;
          return true;
        }
      }
      return Lexer.isDigit(c);
    });
    return new Token(Type.NUM, parseFloat(number));
  }
  private eatString () {
    return new Token(Type.STR, this.eatEscaped('"'));
  }
  private eatWord () {
    const word = this.eatWhile(Lexer.isWord);
    return new Token(Lexer.isKeyword(word) ? Type.KW : Type.SYM, word);
  }
  private skipComment () {
    this.eatWhile((c) => c != '\n');
    this.stream.next();
  }
  private eatPunct () {
    return new Token(Type.PUNCT, this.stream.next());
  }
  private eatOperator () {
    return new Token(Type.OP, this.eatWhile(Lexer.isOperator))
  }

  // modulating consumption of tokens
  // TODO: add support for bases 2, 8, 16
  private eatEscaped (terminal: string) {
    let escaped = false, match = '';
    this.stream.next();
    while (!this.stream.eof()) {
      const c = this.stream.next();
      if (escaped) {
        match += c, escaped = false;
      } else if (c == '\\') {
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
    let word = '';
    while (!this.stream.eof() && charPred(this.stream.peek())) {
      word += this.stream.next();
    }
    return word;
  }

  // lexeme pattern matching utilities
  private static isKeyword (word: string) {
    return Lexer.keywords.indexOf(` ${ word } `) > -1;
  }
  private static isSpace (char: string) {
    return /\s/.test(char);
  }
  private static isDigit (char: string) {
    return /[0-9]/i.test(char);
  }
  private static isOperator (char: string) {
    return "=&|<>!+-*/^%".indexOf(char) > -1;
  }
  private static isWordStart (char: string) {
    return /[a-z_\:]/i.test(char);
  }
  private static isWord (word: string) {
    return Lexer.isWordStart(word) || /[a-z\d]/i.test(word);
  }
  private static isPunct (char: string) {
    return ",;()[]{}".indexOf(char) > -1;
  }
}

export default { Type, Token, Lexer };