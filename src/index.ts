// src/ind// src/index.ts
// Browser demo: interactive IvritCode VM trace.

import { Opcode, Program, runProgram } from "./vm";

function formatRow(i: number, row: ReturnType<typeof runProgram>[number]): string {
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

function readInt(id: string, fallback: number): number {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) return fallback;
  const v = parseInt(el.value, 10);
  return Number.isNaN(v) ? fallback : v;
}

function renderTrace(
  program: Program,
  initialRegs: [number, number, number, number]
) {
  const params = { programCommit: 123456789 };
  const trace = runProgram(program, params, initialRegs);

  const container = document.getElementById("app");
  if (!container) return;

  const pre = document.createElement("pre");
  pre.textContent = trace.map((row, i) => formatRow(i + 1, row)).join("\n");

  // Clear previous contents and insert new trace
  container.innerHTML = "";
  container.appendChild(pre);
}

export function main() {
  // Demo program: א → ב → ג → ד → סבב
  const program: Program = [
    Opcode.Aleph,
    Opcode.Bet,
    Opcode.Gimel,
    Opcode.Dalet,
    Opcode.Sovev,
  ];

  const runWithCurrentInputs = () => {
    const r0 = readInt("r0-input", 1);
    const r1 = readInt("r1-input", 2);
    const r2 = readInt("r2-input", 3);
    const r3 = readInt("r3-input", 4);
    renderTrace(program, [r0, r1, r2, r3]);
  };

  // Wire up button
  const button = document.getElementById("run-btn");
  if (button) {
    button.addEventListener("click", runWithCurrentInputs);
  }

  // Run once on load with default values
  runWithCurrentInputs();
}

// Auto-run in the browser
main();
ex.ts
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
