// vm.js
// IvritCode v0.0 core VM — attaches to window.IvritVM (no modules).

(function (global) {
  const HEBREW_LETTERS = "אבגדהוזחטיכלמנסעפצקרשת";
  const NUM_HEBREW_REGS = 22;
  const AO_INDEX = 22; // Aleph-Olam

  const ALEF = 0;
  const BET = 1;
  const GIMEL = 2;
  const DALET = 3;

  const REGISTER_NAMES = [...HEBREW_LETTERS.split(""), "A"];

  function createState() {
    return { regs: new Array(NUM_HEBREW_REGS + 1).fill(0) };
  }

  function cloneState(state) {
    return { regs: state.regs.slice() };
  }

  function letterToIndex(ch) {
    const idx = HEBREW_LETTERS.indexOf(ch);
    return idx === -1 ? null : idx;
  }

  function sign(x) {
    if (x > 0) return 1;
    if (x < 0) return -1;
    return 0;
  }

  function step(state, op) {
    const r = state.regs;
    const next = r.slice();

    const a = r[ALEF];
    const b = r[BET];
    const g = r[GIMEL];
    const d = r[DALET];
    const AO = r[AO_INDEX];

    switch (op) {
      case "א":
        // identity
        return state;

      case "ב":
        next[GIMEL] = a + b;
        break;

      case "ג":
        next[DALET] = a * b;
        break;

      case "ד":
        next[GIMEL] = b - a;
        next[DALET] = a - b;
        break;

      case "ה": {
        const HEI = letterToIndex("ה");
        if (HEI !== null) next[HEI] = sign(a);
        break;
      }

      case "ו":
        next[ALEF] = b;
        next[BET] = a;
        break;

      case "ז":
        next[ALEF] = a + 1;
        break;

      case "ח":
        next[ALEF] = a - 1;
        break;

      case "ט":
        next[GIMEL] = a * a;
        break;

      case "י":
        next[ALEF] = AO;
        break;

      case "כ":
        next[AO_INDEX] = a + b + g + d;
        break;

      case "ל": {
        let sum = 0;
        for (let i = 0; i < NUM_HEBREW_REGS; i++) sum += r[i];
        next[AO_INDEX] = sum;
        break;
      }

      case "מ":
        next[GIMEL] = Math.floor((a + b + g + d) / 4);
        break;

      case "נ":
        next[ALEF] = -a;
        break;

      case "ס":
        for (let i = 0; i < NUM_HEBREW_REGS; i++) {
          const from = (i - 1 + NUM_HEBREW_REGS) % NUM_HEBREW_REGS;
          next[i] = r[from];
        }
        next[AO_INDEX] = AO;
        break;

      case "ע": {
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
        next[AO_INDEX] = a;
        break;

      case "צ":
        next[AO_INDEX] = sign(a - b);
        break;

      case "ק":
        for (let i = 0; i < NUM_HEBREW_REGS; i++) {
          next[i] = r[NUM_HEBREW_REGS - 1 - i];
        }
        next[AO_INDEX] = AO;
        break;

      case "ר":
        next[ALEF] = AO;
        next[BET] = AO + 1;
        next[GIMEL] = AO + 2;
        next[DALET] = AO + 3;
        break;

      case "ש":
        next[ALEF] = a * a + b;
        next[BET] = b * b + g;
        next[GIMEL] = g * g + d;
        next[DALET] = d * d + a;
        break;

      case "ת":
        next[ALEF] = g;
        next[BET] = d;
        next[GIMEL] = a;
        next[DALET] = b;
        break;

      default:
        return state;
    }

    return { regs: next };
  }

  function runProgram(program, opts) {
    opts = opts || {};
    const trace = [];
    let state = createState();
    const maxSteps = opts.maxSteps != null ? opts.maxSteps : 10000;

    let steps = 0;
    let executedOps = "";

    for (const ch of program) {
      if (HEBREW_LETTERS.includes(ch)) {
        if (opts.trace) {
          trace.push(cloneState(state)); // before op
        }
        state = step(state, ch);
        executedOps += ch;
        steps++;
        if (steps >= maxSteps) break;
      }
    }

    if (opts.trace) {
      trace.push(cloneState(state)); // after last op
    }

    return { final: state, trace, steps, executedOps };
  }

  global.IvritVM = {
    HEBREW_LETTERS,
    NUM_HEBREW_REGS,
    AO_INDEX,
    REGISTER_NAMES,
    createState,
    cloneState,
    letterToIndex,
    step,
    runProgram,
  };
})(window);
