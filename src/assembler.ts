// src/assembler.ts
import { tokenize, type Token } from "./tokenizer.js";

export type OpCode =
  | "PUSH"
  | "ADD"
  | "SUB"
  | "MUL"
  | "DIV"
  | "OUT"
  | "JMP"
  | "JZ"
  | "HALT"
  | "MITZVAH"
  | "AVEIRAH"
  | "TICK";

export interface Instr {
  op: OpCode;
  value?: number;   // used by PUSH
  target?: number;  // used by JMP/JZ
}

export function assemble(source: string): Instr[] {
  const tokens = tokenize(source);
  return assembleTokens(tokens);
}

export function assembleTokens(tokens: Token[]): Instr[] {
  const program: Instr[] = [];
  const labels = new Map<string, number>();

  // pass 1: collect labels
  let pc = 0;
  for (const tok of tokens) {
    if (tok.kind === "label") {
      labels.set(tok.name, pc);
    } else if (tok.kind === "instr") {
      pc++;
    }
  }

  // pass 2: build instructions
  for (const tok of tokens) {
    if (tok.kind === "label") continue;

    const op = tok.op.toUpperCase() as OpCode;
    const args = tok.args;

    switch (op) {
      case "PUSH": {
        if (args.length !== 1) {
          throw new Error(`PUSH expects 1 argument`);
        }
        const value = parseFloat(args[0]);
        if (Number.isNaN(value)) {
          throw new Error(`PUSH expects numeric, got: ${args[0]}`);
        }
        program.push({ op, value });
        break;
      }

      case "ADD":
      case "SUB":
      case "MUL":
      case "DIV":
      case "OUT":
      case "MITZVAH":
      case "AVEIRAH":
      case "TICK":
      case "HALT": {
        program.push({ op });
        break;
      }

      case "JMP":
      case "JZ": {
        if (args.length !== 1) {
          throw new Error(`${op} expects 1 label argument`);
        }
        const label = args[0];
        const target = labels.get(label);
        if (target == null) {
          throw new Error(`Unknown label: ${label}`);
        }
        program.push({ op, target });
        break;
      }

      default:
        throw new Error(`Unknown opcode in assembler: ${op}`);
    }
  }

  return program;
}
