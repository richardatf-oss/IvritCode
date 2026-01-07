import { opcodeMap, digitMap, Op } from "./opcodes.js";
import { Token } from "./tokenizer.js";

export type Instr =
  | { op: Exclude<Op, "PUSH" | "JMP" | "JZ">; mods: string[] }
  | { op: "PUSH"; value: number; mods: string[] }
  | { op: "JMP"; offset: number; mods: string[] }
  | { op: "JZ"; offset: number; mods: string[] };

export function assemble(tokens: Token[]): Instr[] {
  const program: Instr[] = [];

  const fail = (msg: string, tok?: Token): never => {
    const where = tok ? ` at token#${tok.index} (${tok.raw})` : "";
    throw new Error(`${msg}${where}`);
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const op = opcodeMap[t.base];
    if (!op) fail("Unknown opcode", t);

    // PUSH: א <digit>
    if (op === "PUSH")
