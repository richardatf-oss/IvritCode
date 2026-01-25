// src/vm.ts
// IvritCode VM core + AIR-like transition checker.

import { add, mul, mod } from "./field";
import { miniRound3, round5, MiniState3, State5 } from "./round";

// Opcodes for selected letters.
// You can add more later; just keep the numbers stable once "locked".
export enum Opcode {
  Aleph = 1,   // א
  Bet   = 2,   // ב
  Gimel = 3,   // ג
  Dalet = 4,   // ד
  Sovev = 10,  // סבב - round function
}

// One row in the execution / AIR trace.
export interface TraceRow {
  pc: number;         // program counter
  op: Opcode;         // current op (letter)
  mod: number;        // modifier bits (niqqud/trope etc., unused for now)
  regs: [number, number, number, number]; // R0..R3
  c: number;          // hidden capacity register
  h: number;          // hidden history register
  z: number;          // extra hidden word for miniRound3
}

// Program is just a list of opcodes for now.
export type Program = Opcode[];

// "Program commitment" for Aleph binding.
// For now we just pass a number; in future this is a hash of the bytecode.
export interface VmParams {
  programCommit: number;
}

// ---- VM execution ----

export function initialRow(): TraceRow {
  return {
    pc: 0,
    op: Opcode.Aleph,
    mod: 0,
    regs: [0, 0, 0, 0],
    c: 0,
    h: 0,
    z: 0,
  };
}

export function step(prev: TraceRow, op: Opcode, params: VmParams, roundIndex: number): TraceRow {
  const { programCommit } = params;

  switch (op) {
    case Opcode.Bet: {
      // Bet: R0 <- R0 + R1 ; PC++
      const [r0, r1, r2, r3] = prev.regs;
      const nextR0 = add(r0, r1);
      return {
        pc: prev.pc + 1,
        op,
        mod: 0,
        regs: [nextR0, r1, r2, r3],
        c: prev.c,
        h: prev.h,
        z: prev.z,
      };
    }

    case Opcode.Gimel: {
      // Gimel: R0 <- R0 * R1 ; PC++
      const [r0, r1, r2, r3] = prev.regs;
      const nextR0 = mul(r0, r1);
      return {
        pc: prev.pc + 1,
        op,
        mod: 0,
        regs: [nextR0, r1, r2, r3],
        c: prev.c,
        h: prev.h,
        z: prev.z,
      };
    }

    case Opcode.Dalet: {
      // Dalet: linear mix of R0..R2 into R0..R2; R3 unchanged.
      const [r0, r1, r2, r3] = prev.regs;
      const m0 = mod(r0 + r1 + r2);
      const m1 = mod(r0 + 2 * r1 + 3 * r2);
      const m2 = mod(r0 + 3 * r1 + 5 * r2);
      return {
        pc: prev.pc + 1,
        op,
        mod: 0,
        regs: [m0, m1, m2, r3],
        c: prev.c,
        h: prev.h,
        z: prev.z,
      };
    }

    case Opcode.Sovev: {
      // סבב: full 5-word cryptographic round on [R0..R3,C].
      const [r0, r1, r2, r3] = prev.regs;
      const state: State5 = [r0, r1, r2, r3, prev.c];
      const [nr0, nr1, nr2, nr3, nc] = round5(state, roundIndex);

      return {
        pc: prev.pc + 1,
        op,
        mod: 0,
        regs: [nr0, nr1, nr2, nr3],
        c: nc,
        h: prev.h,
        z: prev.z,
      };
    }

    case Opcode.Aleph:
    default: {
      // Aleph: visible no-op; updates hidden (c,h,z) via miniRound3.
      const [c, h, z]: MiniState3 = [prev.c, prev.h, prev.z];
      const inputWord = mod(prev.pc + programCommit);
      const [nc, nh, nz] = miniRound3([c, h, z], inputWord);

      return {
        pc: prev.pc + 1,
        op: Opcode.Aleph,
        mod: 0,
        regs: prev.regs,
        c: nc,
        h: nh,
        z: nz,
      };
    }
  }
}

// Run a whole program and collect the trace.
export function runProgram(program: Program, params: VmParams): TraceRow[] {
  const trace: TraceRow[] = [];
  let row = initialRow();

  for (let i = 0; i < program.length; i++) {
    const op = program[i];
    const next = step(row, op, params, i);
    trace.push(next);
    row = next;
  }

  return trace;
}

// ---- AIR-style checker ----
// In real AIR you'd have explicit polynomial constraints;
// here we re-run step() and check equality, which is equivalent for our VM.

export function checkAirTransition(
  prev: TraceRow,
  next: TraceRow,
  params: VmParams,
  roundIndex: number
): boolean {
  const expected = step(prev, next.op, params, roundIndex);

  return (
    expected.pc === next.pc &&
    expected.op === next.op &&
    expected.mod === next.mod &&
    expected.c === next.c &&
    expected.h === next.h &&
    expected.z === next.z &&
    expected.regs[0] === next.regs[0] &&
    expected.regs[1] === next.regs[1] &&
    expected.regs[2] === next.regs[2] &&
    expected.regs[3] === next.regs[3]
  );
}
