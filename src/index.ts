// src/index.ts
import { Opcode, Program, runProgram, TraceRow } from "./vm";

function formatRow(i: number, row: TraceRow): string {
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

function runDemo(): void {
  // Demo program: א → ב → ג → ד → סבב
  const program: Program = [
    Opcode.Aleph,
    Opcode.Bet,
    Opcode.Gimel,
    Opcode.Dalet,
    Opcode.Sovev,
  ];

  const r0 = readInt("r0-input", 1);
  const r1 = readInt("r1-input", 2);
  const r2 = readInt("r2-input", 3);
  const r3 = readInt("r3-input", 4);

  const trace = runProgram(program, { programCommit: 123456789 }, [
    r0,
    r1,
    r2,
    r3,
  ]);

  const container = document.getElementById("app");
  if (!container) return;

  const pre = document.createElement("pre");
  pre.textContent = trace.map((row, i) => formatRow(i + 1, row)).join("\n");

  container.innerHTML = "";
  container.appendChild(pre);
}

// 🔑 Make it globally callable so HTML can say window.runIvritCode()
;(window as any).runIvritCode = runDemo;

// Optional: populate the trace once when the page loads
window.addEventListener("DOMContentLoaded", runDemo);
