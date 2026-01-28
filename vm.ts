// vm.js
// IvritCode v0.0 — core VM implementing the base letter semantics (no Niqqud yet).

export const HEBREW_LETTERS = "אבגדהוזחטיכלמנסעפצקרשת";
export const NUM_HEBREW_REGS = 22;
export const AO_INDEX = 22; // Aleph-Olam register index (global)

// register indices for the working quartet
const ALEF = 0;
const BET = 1;
const GIMEL = 2;
const DALET = 3;

/** Hebrew register names + global A. */
export const REGISTER_NAMES = [
  ..."אבגדהוזחטיכלמנסעפצקרשת",
  "A",
];

/** Create fresh state, all zeros. */
export function createState() {
  return { regs: new Array(NUM_HEBREW_REGS + 1).fill(0) };
}

/** Shallow clone. */
export function cloneState(state) {
  return { regs: state.regs.slice() };
}

/** Map single Hebrew letter to index 0..21, or null. */
export function letterToIndex(ch) {
  const idx = HEBREW_LETTERS.indexOf(ch);
  return idx === -1 ? null : idx;
}

function sign(x) {
  if (x > 0) return 1;
  if (x < 0) return -1;
  return 0;
}

/** Apply one letter-op to a state. */
export function step(state, op) {
  const r = state.regs;
  const next = r.slice();

  const a = r[ALEF];
  const b = r[BET];
  const g = r[GIMEL];
  const d = r[DALET];
  const AO = r[AO_INDEX];

  switch (op) {
    case "א":
      // Identity (no-op)
      return state;

    case "ב":
      // g' = a + b
      next[GIMEL] = a + b;
      break;

    case "ג":
      // d' = a ⋅ b
      next[DALET] = a * b;
      break;

    case "ד":
      // g' = b − a ; d' = a − b
      next[GIMEL] = b - a;
      next[DALET] = a - b;
      break;

    case "ה": {
      // Hei — sign of Alef
      const HEI = letterToIndex("ה");
      if (HEI !== null) next[HEI] = sign(a);
      break;
    }

    case "ו":
      // Swap (a,b)
      next[ALEF] = b;
      next[BET] = a;
      break;

    case "ז":
      // Increment Alef
      next[ALEF] = a + 1;
      break;

    case "ח":
      // Decrement Alef
      next[ALEF] = a - 1;
      break;

    case "ט":
      // g' = a^2
      next[GIMEL] = a * a;
      break;

    case "י":
      // a' = AO
      next[ALEF] = AO;
      break;

    case "כ":
      // AO' = a + b + g + d
      next[AO_INDEX] = a + b + g + d;
      break;

    case "ל": {
      // AO' = sum of all Hebrew registers (0..21)
      let sum = 0;
      for (let i = 0; i < NUM_HEBREW_REGS; i++) sum += r[i];
      next[AO_INDEX] = sum;
      break;
    }

    case "מ":
      // g' = floor((a + b + g + d)/4)
      next[GIMEL] = Math.floor((a + b + g + d) / 4);
      break;

    case "נ":
      // Negate Alef
      next[ALEF] = -a;
      break;

    case "ס":
      // Cyclic rotation of 22 Hebrew registers
      for (let i = 0; i < NUM_HEBREW_REGS; i++) {
        const from = (i - 1 + NUM_HEBREW_REGS) % NUM_HEBREW_REGS;
        next[i] = r[from];
      }
      next[AO_INDEX] = AO;
      break;

    case "ע": {
      // Dot product (א..כ) · (ל..ת)
      let sum = 0;
      for (let i = 0; i <= 10; i++) {
        const u = r[i];
        const v = r[i + 11];
        sum += u * v;
      }
      next[AO_INDEX] = sum;
      break;
    }

    case "פ":
      // Expose Alef
      next[AO_INDEX] = a;
      break;

    case "צ":
      // Comparison: AO' = sign(a - b)
      next[AO_INDEX] = sign(a - b);
      break;

    case "ק":
      // Mirror Hebrew registers, AO unchanged
      for (let i = 0; i < NUM_HEBREW_REGS; i++) {
        next[i] = r[NUM_HEBREW_REGS - 1 - i];
      }
      next[AO_INDEX] = AO;
      break;

    case "ר":
      // Reseed quartet from AO
      next[ALEF] = AO;
      next[BET] = AO + 1;
      next[GIMEL] = AO + 2;
      next[DALET] = AO + 3;
      break;

    case "ש":
      // Nonlinear mix
      next[ALEF] = a * a + b;
      next[BET] = b * b + g;
      next[GIMEL] = g * g + d;
      next[DALET] = d * d + a;
      break;

    case "ת":
      // Rotate quartet (g,d,a,b)
      next[ALEF] = g;
      next[BET] = d;
      next[GIMEL] = a;
      next[DALET] = b;
      break;

    default:
      // Unknown char: ignore
      return state;
  }

  return { regs: next };
}

/**
 * Run a program string. Non-Hebrew characters are ignored.
 * opts.trace = true will return a per-step trace.
 */
export function runProgram(program, opts = {}) {
  const trace = [];
  let state = createState();
  const maxSteps = opts.maxSteps ?? 10000;

  let steps = 0;
  let executedOps = "";

  for (const ch of program) {
    if (HEBREW_LETTERS.includes(ch)) {
      if (opts.trace) {
        // push state BEFORE this op
        trace.push(cloneState(state));
      }

      state = step(state, ch);
      executedOps += ch;
      steps++;

      if (steps >= maxSteps) break;
    }
  }

  if (opts.trace) {
    // push final state after last op
    trace.push(cloneState(state));
  }

  return { final: state, trace, steps, executedOps };
}
