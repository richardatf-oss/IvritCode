// ivritcode_vm.ts
// IvritCode v0.1 unified VM: letters + niqqud
//
// - State: 23 registers (א–ת + A for Aleph-Olam)
// - Base ops: all Hebrew letters + composite "סבב"
// - Niqqud:
//     - none  : default letter semantics
//     - sheva : pure/query mode (effect compressed into A)
//     - hiriq : immediate-argument mode for selected letters
//
// This is a reference implementation, not a crypto primitive.
//
// ------------------------------------------------------------
// Types & constants
// ------------------------------------------------------------

export type HebrewLetter =
  | "א" | "ב" | "ג" | "ד" | "ה" | "ו" | "ז" | "ח" | "ט" | "י" | "כ" | "ל"
  | "מ" | "נ" | "ס" | "ע" | "פ" | "צ" | "ק" | "ר" | "ש" | "ת";

export type AlephOlamName = "A";

export type LetterOp = HebrewLetter | "סבב"; // include composite Sovav

export type RegisterName = HebrewLetter | AlephOlamName;

// 23 registers: 0–21 = א–ת, 22 = A (Aleph-Olam)
export const REGISTER_ORDER: RegisterName[] = [
  "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כ", "ל",
  "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת",
  "A",
];

export const REG_INDEX: Record<RegisterName, number> = Object.fromEntries(
  REGISTER_ORDER.map((name, idx) => [name, idx]),
) as Record<RegisterName, number>;

// Working quartet and Aleph-Olam aliases
const RA  = REG_INDEX["א"];
const RB  = REG_INDEX["ב"];
const RG  = REG_INDEX["ג"];
const RD  = REG_INDEX["ד"];
const RAO = REG_INDEX["A"]; // Aleph-Olam

export type State = number[]; // must be length 23

// Niqqud modes
export type Niqqud = "none" | "sheva" | "hiriq";

// A full instruction = letter + optional niqqud + optional immediate
export interface Instr {
  letter: LetterOp;
  niqqud?: Niqqud;     // default "none"
  immediate?: number;  // for hiriq (ִ) variants
}

// For tracing
export interface TraceStep {
  index: number;
  instr: Instr;
  before: State;
  after: State;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

export function createZeroState(): State {
  return new Array(REGISTER_ORDER.length).fill(0);
}

export function cloneState(state: State): State {
  return state.slice();
}

function signOf(x: number): number {
  if (x > 0) return 1;
  if (x < 0) return -1;
  return 0;
}

// Pretty-print state (for console / debugging)
export function formatState(state: State): string {
  return REGISTER_ORDER
    .map((name, idx) => `${name}=${state[idx]}`)
    .join("  ");
}

// ------------------------------------------------------------
// Base letter semantics (no niqqud)
// ------------------------------------------------------------
//
// All functions below implement the SPEC.md v0.0 core behavior.
//

export function applyLetter(state: State, letter: LetterOp): State {
  switch (letter) {
    case "א": return opAlef(state);
    case "ב": return opBet(state);
    case "ג": return opGimel(state);
    case "ד": return opDalet(state);
    case "ה": return opHei(state);
    case "ו": return opVav(state);
    case "ז": return opZayin(state);
    case "ח": return opChet(state);
    case "ט": return opTet(state);
    case "י": return opYod(state);
    case "כ": return opKaf(state);
    case "ל": return opLamed(state);
    case "מ": return opMem(state);
    case "נ": return opNun(state);
    case "ס": return opSamekh(state);
    case "ע": return opAyin(state);
    case "פ": return opPe(state);
    case "צ": return opTsadi(state);
    case "ק": return opQof(state);
    case "ר": return opResh(state);
    case "ש": return opShin(state);
    case "ת": return opTav(state);
    case "סבב": return opSovav(state); // composite round
    default:
      throw new Error(`Unknown letter op: ${letter}`);
  }
}

// א — Alef: identity / no-op
function opAlef(state: State): State {
  return cloneState(state);
}

// ב — Bet: g = a + b
function opBet(state: State): State {
  const next = cloneState(state);
  const a = state[RA];
  const b = state[RB];
  next[RG] = a + b;
  return next;
}

// ג — Gimel: d = a * b
function opGimel(state: State): State {
  const next = cloneState(state);
  const a = state[RA];
  const b = state[RB];
  next[RD]] = a * b;
  return next;
}

// ד — Dalet: g = b - a, d = a - b
function opDalet(state: State): State {
  const next = cloneState(state);
  const a = state[RA];
  const b = state[RB];
  next[RG] = b - a;
  next[RD] = a - b;
  return next;
}

// ה — Hei: h = sign(a)
function opHei(state: State): State {
  const next = cloneState(state);
  const a = state[RA];
  const idxH = REG_INDEX["ה"];
  next[idxH] = signOf(a);
  return next;
}

// ו — Vav: swap a <-> b
function opVav(state: State): State {
  const next = cloneState(state);
  const a = state[RA];
  const b = state[RB];
  next[RA] = b;
  next[RB] = a;
  return next;
}

// ז — Zayin: a = a + 1
function opZayin(state: State): State {
  const next = cloneState(state);
  next[RA] = state[RA] + 1;
  return next;
}

// ח — Chet: a = a - 1
function opChet(state: State): State {
  const next = cloneState(state);
  next[RA] = state[RA] - 1;
  return next;
}

// ט — Tet: g = a^2
function opTet(state: State): State {
  const next = cloneState(state);
  const a = state[RA];
  next[RG] = a * a;
  return next;
}

// י — Yod: a = AO
function opYod(state: State): State {
  const next = cloneState(state);
  const AO = state[RAO];
  next[RA] = AO;
  return next;
}

// כ — Kaf: AO = a + b + g + d
function opKaf(state: State): State {
  const next = cloneState(state);
  const a = state[RA];
  const b = state[RB];
  const g = state[RG];
  const d = state[RD];
  next[RAO] = a + b + g + d;
  return next;
}

// ל — Lamed: AO = sum(all 22 Hebrew registers)
function opLamed(state: State): State {
  const next = cloneState(state);
  let sum = 0;
  for (let i = 0; i < 22; i++) {
    sum += state[i];
  }
  next[RAO] = sum;
  return next;
}

// מ — Mem: g = floor((a + b + g + d)/4)
function opMem(state: State): State {
  const next = cloneState(state);
  const a = state[RA];
  const b = state[RB];
  const g = state[RG];
  const d = state[RD];
  const mean = Math.trunc((a + b + g + d) / 4);
  next[RG] = mean;
  return next;
}

// נ — Nun: a = -a
function opNun(state: State): State {
  const next = cloneState(state);
  next[RA] = -state[RA];
  return next;
}

// ס — Samekh: rotate all 22 Hebrew registers (cyclic)
function opSamekh(state: State): State {
  const next = cloneState(state);
  for (let i = 0; i < 22; i++) {
    const src = (i - 1 + 22) % 22;
    next[i] = state[src];
  }
  // Aleph-Olam unchanged
  return next;
}

// ע — Ayin: dot product of first and second halves into AO
function opAyin(state: State): State {
  const next = cloneState(state);
  let acc = 0;
  // first half: 0–10 (א–כ), second half: 11–21 (ל–ת)
  for (let i = 0; i <= 10; i++) {
    const u = state[i];
    const v = state[i + 11];
    acc += u * v;
  }
  next[RAO] = acc;
  return next;
}

// פ — Pe: AO = a
function opPe(state: State): State {
  const next = cloneState(state);
  next[RAO] = state[RA];
  return next;
}

// צ — Tsadi: AO = sign(a - b)
function opTsadi(state: State): State {
  const next = cloneState(state);
  const a = state[RA];
  const b = state[RB];
  next[RAO] = signOf(a - b);
  return next;
}

// ק — Qof: reverse the 22 Hebrew registers
function opQof(state: State): State {
  const next = cloneState(state);
  for (let i = 0; i < 22; i++) {
    const mirror = 21 - i;
    next[i] = state[mirror];
  }
  // Aleph-Olam unchanged
  return next;
}

// ר — Resh: reseed quartet from AO
function opResh(state: State): State {
  const next = cloneState(state);
  const AO = state[RAO];
  next[RA] = AO;
  next[RB] = AO + 1;
  next[RG] = AO + 2;
  next[RD] = AO + 3;
  return next;
}

// ש — Shin: nonlinear mix of quartet
function opShin(state: State): State {
  const next = cloneState(state);
  const a = state[RA];
  const b = state[RB];
  const g = state[RG];
  const d = state[RD];
  next[RA] = a * a + b;
  next[RB] = b * b + g;
  next[RG] = g * g + d;
  next[RD] = d * d + a;
  return next;
}

// ת — Tav: rotate quartet (a,b,g,d) -> (g,d,a,b)
function opTav(state: State): State {
  const next = cloneState(state);
  const a = state[RA];
  const b = state[RB];
  const g = state[RG];
  const d = state[RD];
  next[RA] = g;
  next[RB] = d;
  next[RG] = a;
  next[RD] = b;
  return next;
}

// סבב — Sovav: deep mix round on quartet
function opSovav(state: State): State {
  const next = cloneState(state);
  const a = state[RA];
  const b = state[RB];
  const g = state[RG];
  const d = state[RD];

  const M0 = a + 3 * g;
  const M1 = b + 5 * d;

  const N0 = M0 + M1;
  const N1 = M0 - M1;
  const N2 = 3 * M0 - M1;
  const N3 = 2 * M1 + a;

  next[RA] = N0;
  next[RB] = N1;
  next[RG] = N2;
  next[RD] = N3;

  return next;
}

// ------------------------------------------------------------
// Niqqud-aware layer
// ------------------------------------------------------------
//
// Niqqud modes:
//   - none  : base semantics
//   - sheva : pure/query mode (write effect summary into A)
//   - hiriq : immediate-aware variants for selected letters
//

export function applyInstr(state: State, instr: Instr): State {
  const mode: Niqqud = instr.niqqud ?? "none";

  switch (mode) {
    case "none":
      return applyLetter(state, instr.letter);

    case "sheva":
      return applySheva(state, instr.letter);

    case "hiriq":
      return applyHiriq(state, instr);

    default:
      throw new Error(`Unknown niqqud mode: ${mode}`);
  }
}

// sheva ְ — pure/query mode
//
// Semantics v0.1:
// - Let virtualNext = applyLetter(state, letter)
// - Compute deltaSum = Σ (virtualNext[i] - state[i])
// - Write deltaSum into Aleph-Olam (A)
// - Leave all other registers unchanged
//
function applySheva(state: State, letter: LetterOp): State {
  const virtualNext = applyLetter(state, letter);
  let deltaSum = 0;

  for (let i = 0; i < state.length; i++) {
    deltaSum += virtualNext[i] - state[i];
  }

  const next = cloneState(state);
  next[RAO] = deltaSum;
  return next;
}

// hiriq ִ — immediate mode
//
// For v0.1 we define hiriq for:
//   בִ  k : g = a + b + k
//   גִ  k : d = a * b + k
//   תִ  k : rotate quartet, then add k to a,b,g,d
//   סבבִ k: Sovav with M0 and M1 offset by k
//
// All other letters with hiriq fall back to base semantics.
//
function applyHiriq(state: State, instr: Instr): State {
  const k = instr.immediate ?? 0;

  switch (instr.letter) {
    case "ב":
      return opBetHiriq(state, k);
    case "ג":
      return opGimelHiriq(state, k);
    case "ת":
      return opTavHiriq(state, k);
    case "סבב":
      return opSovavHiriq(state, k);
    default:
      return applyLetter(state, instr.letter);
  }
}

// בִ — Bet-hiriq: g = a + b + k
function opBetHiriq(state: State, k: number): State {
  const next = cloneState(state);
  const a = state[RA];
  const b = state[RB];
  next[RG] = a + b + k;
  return next;
}

// גִ — Gimel-hiriq: d = a * b + k
function opGimelHiriq(state: State, k: number): State {
  const next = cloneState(state);
  const a = state[RA];
  const b = state[RB];
  next[RD] = a * b + k;
  return next;
}

// תִ — Tav-hiriq:
//   1. Rotate quartet (a,b,g,d) -> (g,d,a,b)
//   2. Add k to each of a,b,g,d
function opTavHiriq(state: State, k: number): State {
  const next = cloneState(state);
  const a = state[RA];
  const b = state[RB];
  const g = state[RG];
  const d = state[RD];

  next[RA] = g + k;
  next[RB] = d + k;
  next[RG] = a + k;
  next[RD] = b + k;

  return next;
}

// סבבִ — Sovav-hiriq:
//   M0 = a + 3*g + k
//   M1 = b + 5*d + k
function opSovavHiriq(state: State, k: number): State {
  const next = cloneState(state);
  const a = state[RA];
  const b = state[RB];
  const g = state[RG];
  const d = state[RD];

  const M0 = a + 3 * g + k;
  const M1 = b + 5 * d + k;

  const N0 = M0 + M1;
  const N1 = M0 - M1;
  const N2 = 3 * M0 - M1;
  const N3 = 2 * M1 + a;

  next[RA] = N0;
  next[RB] = N1;
  next[RG] = N2;
  next[RD] = N3;

  return next;
}

// ------------------------------------------------------------
// Program runners
// ------------------------------------------------------------

// Plain letter sequence (no niqqud)
export function runProgramLetters(initial: State, program: LetterOp[]): State {
  return program.reduce((st, op) => applyLetter(st, op), initial);
}

// Full niqqud-aware program
export function runProgramInstr(initial: State, program: Instr[]): State {
  return program.reduce((st, instr) => applyInstr(st, instr), initial);
}

// With trace
export function runWithTrace(initial: State, program: Instr[]): TraceStep[] {
  const steps: TraceStep[] = [];
  let state = cloneState(initial);

  program.forEach((instr, idx) => {
    const before = cloneState(state);
    const after = applyInstr(state, instr);
    steps.push({ index: idx, instr, before, after });
    state = after;
  });

  return steps;
}
