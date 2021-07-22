import { Atom } from "../src/lexing/mod.ts";
import { Kind } from "../src/parsing/mod.ts";

function genPredicates () {
  const impts = [];
  const lines = [];

  for (const k in Kind) {
    lines.push(`\nexport function is${ k } (node: Expr): node is ${ k === "Binary" ? k + "<Expr, Expr>" : k } {\n  return node.type === Kind.${ k };\n}\n`);
    impts.push(k);
  }

  [ `import type { Expr, ${ impts.join(', ') } } from "./mod.ts";\n`,
    `import { Atom, Kind } from "./mod.ts";\n`,
    `/** GENERATED BASED ON ENUMS \`Kind\` **/\n\n`
  ].forEach((line) => lines.unshift(line));

  console.log('Lines generated: ', lines.join(''));
  return lines.join('');
}

async function writeContent (path: string, content: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  await Deno.writeFile(path, data);
  console.log("Done! File generated at " + path);
}

await writeContent('src/parsing/predicates.ts', genPredicates());