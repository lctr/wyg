import { Colors } from "./printing.ts";
import { readLines } from "https://deno.land/std@0.97.0/io/bufio.ts";
import { run } from "./evaluating/runtime.ts";

let EXIT = false;
let COUNT: number | string = 0;
const MENU = [ "q", "o", "s" ].map((s) => ":" + Colors.italic(s)).join(
  Colors.brightBlue(" | "),
);
const HEADER = ` ${ Colors.brightRed("\\ʎ/") }yg  ~  ${ MENU }`; //${ Colors.italic(":q | :s | :r") }`;
const PROMPT = `(${ Colors.brightBlue(++COUNT + "") })> `;
const LEAVING = "Would you like to quit? " + Colors.brightRed("[y/N]");
const FAREWELL = `${ Colors.italic("Goodbye!") }`;

export async function read () {
  // Listen to stdin input, once a new line is entered return
  for await (const line of readLines(Deno.stdin)) {
    return await parseInput(line);
  }
}

async function parseInput<E> (line: string) {
  switch (await line.trim()) {
    case ":q":
      return await quit(":q");
    case ":q!":
      break;
    case ":s":
    case ":r":
    default:
      try {
        return await run(line);
      } catch (e) {
        return e;
      }
  }
  await write(`${ Colors.red("Force") } quitting. `);
  console.log(FAREWELL);
  Deno.exit(0);
}

export async function write (message: string) {
  return await Deno.stdout.write(new TextEncoder().encode(message));
}

export async function repl () {
  console.log(HEADER);
  while (true) {
    await write(PROMPT);

    const input = await read() ?? null;

    if (EXIT) break;
    try {
      if (input) console.log(Colors.yellow((input + "").trim()));
    } catch (e) {
      await quit(Colors.red(e));
    }
  }
  Deno.exit();
}

export async function quit (message: string) {
  console.log(message);
  console.log(LEAVING);
  const resp = await read();

  if (resp && /1|y|t|qq/i.test(resp)) {
    EXIT = true;
  } else return "";
}
