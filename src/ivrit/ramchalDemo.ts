// src/ivrit/ramchalDemo.ts
import type { Instr } from "../assembler.js";
import { runRamchal } from "../vm.js";

export function runRamchalDemo() {
  // Program:
  // soul "1" does a mitzvah with clarity 0.6
  // advance history
  // soul "1" does an aveirah with clarity 0.6
  // advance history
  // halt
  const program: Instr[] = [
    { op: "PUSH", value: 1 },     // soulId
    { op: "PUSH", value: 0.6 },   // clarity
    { op: "MITZVAH" },

    { op: "TICK" },

    { op: "PUSH", value: 1 },     // soulId
    { op: "PUSH", value: 0.6 },   // clarity
    { op: "AVEIRAH" },

    { op: "TICK" },

    { op: "HALT" },
  ];

  const result = runRamchal(program, {
    trace: true,
    initialWorld: { light: 0, concealment: 0, stage: "OlamHaZeh", tick: 0 },
    initialSouls: [
      { id: "1", freeWillLevel: 0.8, clarity: 0.5, merit: 0, debt: 0 },
    ],
  });

  console.log("WORLD:", result.world);
  console.log("SOUL 1:", result.souls["1"]);
  console.log("OUT:", result.out);

  return result;
}
