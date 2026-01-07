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
    if (op === "PUSH") {
      const next = tokens[i + 1];
      if (!next) fail("PUSH expects a digit letter after א", t);

      const v = digitMap[next.base];
      if (v === undefined) fail("Invalid digit letter after PUSH", next);

      program.push({ op: "PUSH", value: v, mods: t.marks });
      i++; // consume digit token
      continue;
    }

    // JMP/JZ: ט <digit> / י <digit>
    if (op === "JMP" || op === "JZ") {
      const next = tokens[i + 1];
      if (!next) fail(`${op} expects a digit letter offset after the opcode`, t);

      const off = digitMap[next.base];
      if (off === undefined) fail("Invalid offset digit letter", next);

      // v0: relative forward offset in *instructions*
      program.push({ op, offset: off, mods: t.marks } as any);
      i++; // consume digit token
      continue;
    }

    // All other single-letter ops
    program.push({ op, mods: t.marks } as any);
  }

  return program;
}
