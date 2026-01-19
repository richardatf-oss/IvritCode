// src/vm.ts
import type { Instr, OpCode } from "./assembler.js";

// -------------------------
// Basic numeric VM
// -------------------------

export type VMOptions = {
  trace?: boolean;
  maxSteps?: number;
};

export function run(program: Instr[], opts: VMOptions = {}): number[] {
  const stack: number[] = [];
  const out: number[] = [];
  let ip = 0;
  let steps = 0;
  const maxSteps = opts.maxSteps ?? 100_000;

  const pop = () => {
    if (stack.length === 0) throw new Error("Stack underflow");
    return stack.pop() as number;
  };

  while (ip >= 0 && ip < program.length) {
    if (steps++ > maxSteps) {
      throw new Error("Max steps exceeded (possible infinite loop)");
    }

    const ins = program[ip];

    if (opts.trace) {
      console.log(`NUMERIC ip=${ip} op=${ins.op} stack=[${stack.join(",")}]`);
    }

    switch (ins.op as OpCode) {
      case "PUSH":
        stack.push(ins.value ?? 0);
        ip++;
        break;

      case "ADD": {
        const b = pop(), a = pop();
        stack.push(a + b);
        ip++;
        break;
      }

      case "SUB": {
        const b = pop(), a = pop();
        stack.push(a - b);
        ip++;
        break;
      }

      case "MUL": {
        const b = pop(), a = pop();
        stack.push(a * b);
        ip++;
        break;
      }

      case "DIV": {
        const b = pop(), a = pop();
        if (b === 0) throw new Error("Division by zero");
        stack.push(a / b);
        ip++;
        break;
      }

      case "OUT": {
        const v = pop();
        out.push(v);
        ip++;
        break;
      }

      case "JMP":
        ip = ins.target ?? ip + 1;
        break;

      case "JZ": {
        const v = pop();
        if (v === 0) ip = ins.target ?? ip + 1;
        else ip++;
        break;
      }

      case "HALT":
        return out;

      // Ramchal opcodes are ignored in plain run()
      case "MITZVAH":
      case "AVEIRAH":
      case "TICK":
        ip++;
        break;

      default:
        throw new Error(`Unknown opcode: ${ins.op}`);
    }
  }

  return out;
}

// -------------------------
// Ramchal layer
// -------------------------

export type Stage = "OlamHaZeh" | "YemotHaMashiach" | "OlamHaBa";

export interface Soul {
  id: string;
  freeWillLevel: number; // 0–1
  clarity: number;       // 0–1
  merit: number;
  debt: number;
}

export interface WorldState {
  light: number;
  concealment: number;
  stage: Stage;
  tick: number;
}

export interface ChoiceEvent {
  soulId: string;
  action: "mitzvah" | "aveirah" | "neutral";
  clarityAtChoice: number;
}

export interface JudgmentResult {
  deltaMerit: number;
  deltaDebt: number;
  deltaClarity: number;
  deltaLight: number;
  deltaConcealment: number;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function isBechiraZone(clarity: number): boolean {
  return clarity >= 0.25 && clarity <= 0.85;
}

export function judgeChoice(ev: ChoiceEvent): JudgmentResult {
  if (!isBechiraZone(ev.clarityAtChoice)) {
    return {
      deltaMerit: 0,
      deltaDebt: 0,
      deltaClarity: 0,
      deltaLight: 0,
      deltaConcealment: 0,
    };
  }

  switch (ev.action) {
    case "mitzvah":
      return {
        deltaMerit: +1,
        deltaDebt: 0,
        deltaClarity: +0.05,
        deltaLight: +0.1,
        deltaConcealment: -0.02,
      };
    case "aveirah":
      return {
        deltaMerit: 0,
        deltaDebt: +1,
        deltaClarity: -0.05,
        deltaLight: -0.05,
        deltaConcealment: +0.1,
      };
    default:
      return {
        deltaMerit: 0,
        deltaDebt: 0,
        deltaClarity: 0,
        deltaLight: 0,
        deltaConcealment: 0,
      };
  }
}

export function applyJudgment(
  soul: Soul,
  world: WorldState,
  res: JudgmentResult
): { soul: Soul; world: WorldState } {
  const updatedSoul: Soul = {
    ...soul,
    merit: soul.merit + res.deltaMerit,
    debt: soul.debt + res.deltaDebt,
    clarity: clamp01(soul.clarity + res.deltaClarity),
  };

  const updatedWorld: WorldState = {
    ...world,
    light: world.light + res.deltaLight,
    concealment: Math.max(0, world.concealment + res.deltaConcealment),
  };

  return { soul: updatedSoul, world: updatedWorld };
}

export function advanceHistory(world: WorldState): WorldState {
  const tick = world.tick + 1;
  let stage = world.stage;

  if (world.light > 100 && world.stage === "OlamHaZeh") {
    stage = "YemotHaMashiach";
  }
  if (world.light > 1000 && world.stage === "YemotHaMashiach") {
    stage = "OlamHaBa";
  }

  return { ...world, tick, stage };
}

// -------------------------
// Ramchal VM
// -------------------------

export type RamchalVMOptions = VMOptions & {
  initialWorld?: Partial<WorldState>;
  initialSouls?: Soul[];
};

export interface RamchalVMResult {
  out: number[];
  world: WorldState;
  souls: Record<string, Soul>;
}

export function runRamchal(
  program: Instr[],
  opts: RamchalVMOptions = {}
): RamchalVMResult {
  const stack: number[] = [];
  const out: number[] = [];
  let ip = 0;
  let steps = 0;
  const maxSteps = opts.maxSteps ?? 100_000;

  const pop = () => {
    if (stack.length === 0) throw new Error("Stack underflow");
    return stack.pop() as number;
  };

  let world: WorldState = {
    light: 0,
    concealment: 0,
    stage: "OlamHaZeh",
    tick: 0,
    ...opts.initialWorld,
  };

  const souls: Record<string, Soul> = {};
  for (const s of opts.initialSouls ?? []) {
    souls[s.id] = { ...s };
  }

  const trace = opts.trace ?? false;

  while (ip >= 0 && ip < program.length) {
    if (steps++ > maxSteps) {
      throw new Error("Max steps exceeded (possible infinite loop)");
    }

    const ins = program[ip];

    if (trace) {
      console.log(
        `RAMCHAL ip=${ip} op=${ins.op} stack=[${stack.join(
          ","
        )}] tick=${world.tick} stage=${world.stage}`
      );
    }

    switch (ins.op as OpCode) {
      // numeric ops
      case "PUSH":
        stack.push(ins.value ?? 0);
        ip++;
        break;

      case "ADD": {
        const b = pop(), a = pop();
        stack.push(a + b);
        ip++;
        break;
      }

      case "SUB": {
        const b = pop(), a = pop();
        stack.push(a - b);
        ip++;
        break;
      }

      case "MUL": {
        const b = pop(), a = pop();
        stack.push(a * b);
        ip++;
        break;
      }

      case "DIV": {
        const b = pop(), a = pop();
        if (b === 0) throw new Error("Division by zero");
        stack.push(a / b);
        ip++;
        break;
      }

      case "OUT": {
        const v = pop();
        out.push(v);
        ip++;
        break;
      }

      case "JMP":
        ip = ins.target ?? ip + 1;
        break;

      case "JZ": {
        const v = pop();
        if (v === 0) ip = ins.target ?? ip + 1;
        else ip++;
        break;
      }

      // Ramchal ops
      // stack: [soulId, clarity]
      case "MITZVAH": {
        const clarity = pop();
        const soulIdNum = pop();
        const soulId = String(soulIdNum);

        const soul = souls[soulId];
        if (!soul) throw new Error(`Unknown soul in MITZVAH: ${soulId}`);

        const ev: ChoiceEvent = {
          soulId,
          action: "mitzvah",
          clarityAtChoice: clarity,
        };

        const judgment = judgeChoice(ev);
        const updated = applyJudgment(soul, world, judgment);
        souls[soulId] = updated.soul;
        world = updated.world;

        ip++;
        break;
      }

      case "AVEIRAH": {
        const clarity = pop();
        const soulIdNum = pop();
        const soulId = String(soulIdNum);

        const soul = souls[soulId];
        if (!soul) throw new Error(`Unknown soul in AVEIRAH: ${soulId}`);

        const ev: ChoiceEvent = {
          soulId,
          action: "aveirah",
          clarityAtChoice: clarity,
        };

        const judgment = judgeChoice(ev);
        const updated = applyJudgment(soul, world, judgment);
        souls[soulId] = updated.soul;
        world = updated.world;

        ip++;
        break;
      }

      case "TICK":
        world = advanceHistory(world);
        ip++;
        break;

      case "HALT":
        return { out, world, souls };

      default:
        throw new Error(`Unknown opcode: ${ins.op}`);
    }
  }

  return { out, world, souls };
}
