// src/index.ts
// Browser demo: run a tiny IvritCode program and dump the trace.

import { Opcode, Program, runProgram, initialRow } from "./vm";

function formatRow(i: number, row: ReturnType<typeof initialRow>): string {
  const [r0, r1, r2, r3] = row.regs;
  return [
    `t=${i}`,
    `pc=${row.pc}`,
    `op=${Opcode[row.op]}`,
    `regs=[${r0}, ${r1}, ${r2}, ${r3}]`,
    `c=${row.c}`,
    `h=${row.h}`,
    `z=${row.z}`,
  ].join(" | ");
}

export function main() {
  // Simple program:
  //  0: Aleph    (bind context)
  //  1: Bet      R0 = R0 + R1
  //  2: Gimel    R0 = R0 * R1
  //  3: Dalet    mix R0..R2
  //  4: Sovev    full cryptographic round
  const program: Program = [
    Opcode.Aleph,
    Opcode.Bet,
    Opcode.Gimel,
    Opcode.Dalet,
    Opcode.Sovev,
  ];

  const params = { programCommit: 123456789 };

  const trace = runProgram(program, params);

  const root = document.getElementById("app");
  if (!root) return;

  const pre = document.createElement("pre");
  pre.textContent = trace.map((row, i) => formatRow(i + 1, row)).join("\n");
  root.appendChild(pre);
}

// Auto-run in browser
main();
