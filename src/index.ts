import { tokenize } from "./tokenizer.js";
import { assemble } from "./assembler.js";
import { run } from "./vm.js";

// Example: push 5, push 7, add, print, halt
// digits: ו=5, ח=7
// program: א ו א ח ב כ ל
const example = "א ו א ח ב כ ל";

const source = process.argv.slice(2).join(" ").trim() || example;

const tokens = tokenize(source);
const prog = assemble(tokens);
const out = run(prog, { trace: false });

console.log(out.join("\n"));
