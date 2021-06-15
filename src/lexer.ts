import { Stream } from './stream.ts';

// lexeme kinds, used by lexer, parser, and interpreter
export enum Type {
  KW, BOOL, STR, NUM, SYM, OP, PUNCT, EOF
}


export class Token {
  literal: string;
  // start: number;
  end: number;
  line: number;
  col: number;
  constructor (
    lexer: Lexer | null,
    public type: Type,
    public value: string | number | boolean,
    literal?: string
  ) {
    if (!literal) this.literal = value + '';
    else this.literal = literal;
    if (!lexer) {
      this.line = -1;
      this.col = -1;
      // this.start = -1;
      this.end = -1;
    }
    else {
      const { start, line, col } = lexer.pos();
      this.line = line;
      this.col = col;
      // this.start = start;
      this.end = start + this.literal.length;
    }
  }
  typeIs (t: string | Type) {
    return (this.type === t);
  }
  validate (type: Type, ...literal: string[]) {
    if (type !== this.type) return false;
    for (const val of literal) {
      if (val === this.literal) return true;
    }
    return false;
  }
  toJSON () {
    return `{ type: ${ Type[ this.type ] }, value: ${ this.value }, line: ${ this.line }, col: ${ this.col } }`;
  }
}

export const EOF = new Token(null, Type.EOF, '');

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
  private static readonly keywords = " let if then else true false ";
  constructor (source: string | Stream) {
    if (source instanceof Stream) this.stream = source;
    else this.stream = new Stream(source);
  }
  // state methods
  error (message: string) {
    this.stream.error(message);
  }
  peek () {
    return this.current || (this.current = this.peekNext());
  }
  next () {
    const token = this.current;
    this.current = null;
    return token || this.peekNext();
  }
  eof () {
    return this.peekNext().type === Type.EOF;
  }
  pos () {
    const { pos: start, line, col } = this.stream;
    return { start, line, col };
  }
  peekNext (): Token {
    this.eatWhile(Lexer.isSpace);

    if (this.stream.eof()) return EOF;

    const char = this.stream.peek();

    switch (true) {
      case Lexer.isComment(char, this.stream.after()):
        this.comment();
        return this.peekNext();
      
      case (char == '"'):
        return this.string();
      
      case Lexer.isDigit(char):
        return this.number();
      
      case Lexer.startsWord(char):
        return this.word();
      
      case Lexer.isPunct(char):
        if (char == '|' && this.stream.after() == '|') return this.operator();
        else return this.punct();
      
      case Lexer.isOperator(char):
        return this.operator();
      
      default:
        throw this.error("Unable to tokenize " + char);
    }
  }
  
  // consumption methods
  // TODO: add support for bases 2, 8, 16
  private number () {
    let infixed = false;
    // let base: number;
    const number = this.eatWhile((c) => {
      if (c == '.') {
        if (infixed) {
          infixed = true;
          return true;
        }
      }
      return Lexer.isDigit(c);
    });
    return new Token(this, Type.NUM, parseFloat(number), number);
  }
  private string () {
    const string = this.escaped('"');
    return new Token(this, Type.STR, string);
  }
  private word () {
    const word = this.eatWhile(Lexer.isWord);
    return new Token(this, Lexer.isKeyword(word) ? Type.KW : Type.SYM, word);
  }
  private comment () {
    if (this.stream.after() == '~')
      this.eatWhile((c) => c != '\n');
    else {
      let penult = false;
      this.eatWhile(c => {
        if (penult)
          if (c == '~')
            return false;
          else penult = false;
        else if (c == '*') penult = true;
        return true;
      });
    }
    this.stream.next();
  }
  private punct () {
    return new Token(this, Type.PUNCT, this.stream.next());
  }
  private operator () {
    return new Token(this, Type.OP, this.eatWhile(Lexer.isOperator))
  }

  // modulating consumption of tokens
  private escaped (terminal: string) {
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
  private static startsWord (char: string) {
    return /[a-z_\:]/i.test(char);
  }
  private static isWord (word: string) {
    return Lexer.startsWord(word) || /[a-z\d]/i.test(word);
  }
  private static isPunct (char: string) {
    return ",;()[]{}|".indexOf(char) > -1;
  }
  private static isComment (left: string, right: string) {
    return " ~~ ~* ".indexOf(left + right) > -1;
  }
}

export default { Type, Token, Lexer, EOF };