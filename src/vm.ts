// vm.ts
// IvritCode v0.0 — core VM implementing the base letter semantics (no Niqqud yet).

export const HEBREW_LETTERS = "אבגדהוזחטיכלמנסעפצקרשת" as const;
export const NUM_HEBREW_REGS = 22;
export const AO_INDEX = 22; // Aleph-Olam register index (global)

// Register indices for the working quartet
const ALEF = 0;
const BET = 1;
const GIMEL = 2;
const DALET = 3;

export interface IvritState {
  /** Registers r0..r21 = א..ת, r22 = A (Aleph-Olam) */
  regs: number[]; // length 23
}

/** Mapping from register index to its “name” (א..ת, A). */
export const REGISTER_NAMES: string[] = [
  ...HEBREW_LETTERS.split(""),
  "A",
];

/** Create a fresh state, optionally seeding specific registers by name or index. */
export function createState(seed?: {
  byIndex?: Partial<Record<number, number>>;
  byName?: Partial<Record<string, number>>;
}): IvritState {
  const regs = new Array<number>(NUM_HEBREW_REGS + 1).fill(0);

  if (seed?.byIndex) {
    for (const [k, v] of Object.entries(seed.byIndex)) {
      const idx = Number(k);
      if (Number.isInteger(idx) && idx >= 0 && idx < regs.length) {
        regs[idx] = v!;
      }
    }
  }

  if (seed?.byName) {
    for (const [name, v] of Object.entries(seed.byName)) {
      if (name === "A") {
        regs[AO_INDEX] = v!;
        continue;
      }
      const idx = letterToIndex(name);
      if (idx !== null) {
        regs[idx] = v!;
      }
    }
  }

  return { regs };
}

/** Shallow clone of state (we clone the register array). */
export function cloneState(state: IvritState): IvritState {
  return { regs: state.regs.slice() };
}

/** Convert a single Hebrew letter to its register/index (א..ת → 0..21). */
export function letterToIndex(ch: string): number | null {
  const idx = HEBREW_LETTERS.indexOf(ch);
  return idx === -1 ? null : idx;
}

/** Sign function used for ה and צ. */
function sign(x: number): number {
  if (x > 0) return 1;
  if (x < 0) return -1;
  return 0;
}

/** Apply one instruction (single Hebrew letter) to a state, returning the next state. */
export function step(state: IvritState, op: string): IvritState {
  const r = state.regs;
  const next = r.slice(); // compute updates “simultaneously”

  const a = r[ALEF];
  const b = r[BET];
  const g = r[GIMEL];
  const d = r[DALET];
  const AO = r[AO_INDEX];

  switch (op) {
    case "א":
      // Alef — Identity (no-op)
      // δא(S) = S
      return state;

    case "ב":
      // Bet — Addition: g' = a + b
      next[GIMEL] = a + b;
      break;

    case "ג":
      // Gimel — Multiplication: d' = a ⋅ b
      next[DALET] = a * b;
      break;

    case "ד":
      // Dalet — Difference Pair:
      // g' = b − a ; d' = a − b
      next[GIMEL] = b - a;
      next[DALET] = a - b;
      break;

    case "ה":
      // Hei — Sign of Alef: h' = sign(a)
      // h is the register named ה
      {
        const HEI = letterToIndex("ה")!;
        next[HEI] = sign(a);
      }
      break;

    case "ו":
      // Vav — Swap: (a', b') = (b, a)
      next[ALEF] = b;
      next[BET] = a;
      break;

    case "ז":
      // Zayin — Increment Alef: a' = a + 1
      next[ALEF] = a + 1;
      break;

    case "ח":
      // Chet — Decrement Alef: a' = a - 1
      next[ALEF] = a - 1;
      break;

    case "ט":
      // Tet — Square: g' = a^2
      next[GIMEL] = a * a;
      break;

    case "י":
      // Yod — Load from Aleph-Olam: a' = AO
      next[ALEF] = AO;
      break;

    case "כ":
      // Kaf — Quartet Sum: AO' = a + b + g + d
      next[AO_INDEX] = a + b + g + d;
      break;

    case "ל":
      // Lamed — Global Sum: AO' = sum of all Hebrew registers (0..21)
      {
        let sum = 0;
        for (let i = 0; i < NUM_HEBREW_REGS; i++) sum += r[i];
        next[AO_INDEX] = sum;
      }
      break;

    case "מ":
      // Mem — Mean: g' = floor((a + b + g + d)/4)
      next[GIMEL] = Math.floor((a + b + g + d) / 4);
      break;

    case "נ":
      // Nun — Negation: a' = −a
      next[ALEF] = -a;
      break;

    case "ס":
      // Samekh — Cyclic rotation of 22 Hebrew registers, AO unchanged.
      for (let i = 0; i < NUM_HEBREW_REGS; i++) {
        const from = (i - 1 + NUM_HEBREW_REGS) % NUM_HEBREW_REGS;
        next[i] = r[from];
      }
      next[AO_INDEX] = AO;
      break;

    case "ע":
      // Ayin — Dot product of first and second halves of the alphabet.
      // u_i = r_i, i=0..10 (א..כ)
      // v_i = r_{i+11}, i=0..10 (ל..ת)
      {
        let sum = 0;
        for (let i = 0; i <= 10; i++) {
          const u = r[i];
          const v = r[i + 11];
          sum += u * v;
        }
        next[AO_INDEX] = sum;
      }
      break;

    case "פ":
      // Pe — Expose Alef: AO' = a
      next[AO_INDEX] = a;
      break;

    case "צ":
      // Tsadi — Comparison:
      // AO' = 1 if a>b, 0 if a=b, -1 if a<b
      next[AO_INDEX] = sign(a - b);
      break;

    case "ק":
      // Qof — Mirror: r_i' = r_{21−i} for i in 0..21, AO unchanged.
      for (let i = 0; i < NUM_HEBREW_REGS; i++) {
        next[i] = r[NUM_HEBREW_REGS - 1 - i];
      }
      next[AO_INDEX] = AO;
      break;

    case "ר":
      // Resh — Reseed Quartet from Aleph-Olam:
      // a' = AO, b' = AO+1, g' = AO+2, d' = AO+3
      next[ALEF] = AO;
      next[BET] = AO + 1;
      next[GIMEL] = AO + 2;
      next[DALET] = AO + 3;
      break;

    case "ש":
      // Shin — Nonlinear Mix:
      // a' = a^2 + b
      // b' = b^2 + g
      // g' = g^2 + d
      // d' = d^2 + a
      next[ALEF] = a * a + b;
      next[BET] = b * b + g;
      next[GIMEL] = g * g + d;
      next[DALET] = d * d + a;
      break;

    case "ת":
      // Tav — Quartet Rotation:
      // (a', b', g', d') = (g, d, a, b)
      next[ALEF] = g;
      next[BET] = d;
      next[GIMEL] = a;
      next[DALET] = b;
      break;

    default:
      // Unknown character => ignore (Niqqud, whitespace, comments, etc.)
      return state;
  }

  return { regs: next };
}

export interface RunOptions {
  trace?: boolean;
  maxSteps?: number;
}

export interface RunResult {
  final: IvritState;
  trace: IvritState[];
  steps: number;
  executedOps: string;
}

/**
 * Run a whole IvritCode “program” (string of characters).
 *
 * Non-letter characters (including Niqqud, whitespace, punctuation)
 * are ignored in v0. Only base letters א..ת act as instructions.
 */
export function runProgram(
  program: string,
  opts: RunOptions = {}
): RunResult {
  const trace: IvritState[] = [];
  let state = createState();
  const maxSteps = opts.maxSteps ?? 10000;

  let steps = 0;
  let executedOps = "";

  for (const ch of program) {
    if (HEBREW_LETTERS.includes(ch)) {
      if (opts.trace) {
        trace.push(cloneState(state));
      }

      state = step(state, ch);
      executedOps += ch;
      steps++;

      if (steps >= maxSteps) {
        break;
      }
    }
  }

  if (opts.trace) {
    trace.push(cloneState(state));
  }

  return { final: state, trace, steps, executedOps };
}
