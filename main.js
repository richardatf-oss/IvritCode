// main.js
// Tiny in-browser IvritCode demo wired to the same semantics as src/vm.ts.
// 23 registers: א–ת + A (Aleph-Olam). Program: א → ב → ג → ת → סבב.

(function () {
  // -------------------------------
  // VM core (mirror of src/vm.ts)
  // -------------------------------

  const REGISTER_ORDER = [
    "א",
    "ב",
    "ג",
    "ד",
    "ה",
    "ו",
    "ז",
    "ח",
    "ט",
    "י",
    "כ",
    "ל",
    "מ",
    "נ",
    "ס",
    "ע",
    "פ",
    "צ",
    "ק",
    "ר",
    "ש",
    "ת",
    "A", // Aleph-Olam
  ];

  const REG_INDEX = Object.fromEntries(
    REGISTER_ORDER.map((name, i) => [name, i])
  );

  const RA = REG_INDEX["א"];
  const RB = REG_INDEX["ב"];
  const RG = REG_INDEX["ג"];
  const RD = REG_INDEX["ד"];
  const RAO = REG_INDEX["A"];

  function createZeroState() {
    return new Array(REGISTER_ORDER.length).fill(0);
  }

  function cloneState(state) {
    return state.slice();
  }

  function signOf(x) {
    if (x > 0) return 1;
    if (x < 0) return -1;
    return 0;
  }

  function formatState(state) {
    return REGISTER_ORDER.map((name, i) => `${name}=${state[i]}`).join("  ");
  }

  // --- base letter semantics (no niqqud) ---

  function applyLetter(state, letter) {
    switch (letter) {
      case "א":
        return opAlef(state);
      case "ב":
        return opBet(state);
      case "ג":
        return opGimel(state);
      case "ד":
        return opDalet(state);
      case "ה":
        return opHei(state);
      case "ו":
        return opVav(state);
      case "ז":
        return opZayin(state);
      case "ח":
        return opChet(state);
      case "ט":
        return opTet(state);
      case "י":
        return opYod(state);
      case "כ":
        return opKaf(state);
      case "ל":
        return opLamed(state);
      case "מ":
        return opMem(state);
      case "נ":
        return opNun(state);
      case "ס":
        return opSamekh(state);
      case "ע":
        return opAyin(state);
      case "פ":
        return opPe(state);
      case "צ":
        return opTsadi(state);
      case "ק":
        return opQof(state);
      case "ר":
        return opResh(state);
      case "ש":
        return opShin(state);
      case "ת":
        return opTav(state);
      case "סבב":
        return opSovav(state);
      default:
        throw new Error("Unknown letter op: " + letter);
    }
  }

  // א — identity
  function opAlef(state) {
    return cloneState(state);
  }

  // ב — g = a + b
  function opBet(state) {
    const next = cloneState(state);
    next[RG] = state[RA] + state[RB];
    return next;
  }

  // ג — d = a * b
  function opGimel(state) {
    const next = cloneState(state);
    next[RD] = state[RA] * state[RB];
    return next;
  }

  // ד — g = b - a, d = a - b
  function opDalet(state) {
    const next = cloneState(state);
    const a = state[RA];
    const b = state[RB];
    next[RG] = b - a;
    next[RD] = a - b;
    return next;
  }

  // ה — h = sign(a)
  function opHei(state) {
    const next = cloneState(state);
    next[REG_INDEX["ה"]] = signOf(state[RA]);
    return next;
  }

  // ו — swap a <-> b
  function opVav(state) {
    const next = cloneState(state);
    const a = state[RA];
    const b = state[RB];
    next[RA] = b;
    next[RB] = a;
    return next;
  }

  // ז — a++
  function opZayin(state) {
    const next = cloneState(state);
    next[RA] = state[RA] + 1;
    return next;
  }

  // ח — a--
  function opChet(state) {
    const next = cloneState(state);
    next[RA] = state[RA] - 1;
    return next;
  }

  // ט — g = a^2
  function opTet(state) {
    const next = cloneState(state);
    const a = state[RA];
    next[RG] = a * a;
    return next;
  }

  // י — a = A
  function opYod(state) {
    const next = cloneState(state);
    next[RA] = state[RAO];
    return next;
  }

  // כ — A = a + b + g + d
  function opKaf(state) {
    const next = cloneState(state);
    const a = state[RA];
    const b = state[RB];
    const g = state[RG];
    const d = state[RD];
    next[RAO] = a + b + g + d;
    return next;
  }

  // ל — A = sum(all 22)
  function opLamed(state) {
    const next = cloneState(state);
    let sum = 0;
    for (let i = 0; i < 22; i++) sum += state[i];
    next[RAO] = sum;
    return next;
  }

  // מ — g = floor((a + b + g + d)/4)
  function opMem(state) {
    const next = cloneState(state);
    const a = state[RA];
    const b = state[RB];
    const g = state[RG];
    const d = state[RD];
    next[RG] = Math.trunc((a + b + g + d) / 4);
    return next;
  }

  // נ — a = -a
  function opNun(state) {
    const next = cloneState(state);
    next[RA] = -state[RA];
    return next;
  }

  // ס — rotate א–ת
  function opSamekh(state) {
    const next = cloneState(state);
    for (let i = 0; i < 22; i++) {
      const src = (i - 1 + 22) % 22;
      next[i] = state[src];
    }
    return next;
  }

  // ע — dot product (first half vs second half) into A
  function opAyin(state) {
    const next = cloneState(state);
    let acc = 0;
    for (let i = 0; i <= 10; i++) {
      acc += state[i] * state[i + 11];
    }
    next[RAO] = acc;
    return next;
  }

  // פ — A = a
  function opPe(state) {
    const next = cloneState(state);
    next[RAO] = state[RA];
    return next;
  }

  // צ — A = sign(a - b)
  function opTsadi(state) {
    const next = cloneState(state);
    next[RAO] = signOf(state[RA] - state[RB]);
    return next;
  }

  // ק — reverse א–ת
  function opQof(state) {
    const next = cloneState(state);
    for (let i = 0; i < 22; i++) {
      next[i] = state[21 - i];
    }
    return next;
  }

  // ר — reseed quartet from A
  function opResh(state) {
    const next = cloneState(state);
    const A = state[RAO];
    next[RA] = A;
    next[RB] = A + 1;
    next[RG] = A + 2;
    next[RD] = A + 3;
    return next;
  }

  // ש — nonlinear mix on quartet
  function opShin(state) {
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

  // ת — rotate quartet (a,b,g,d)->(g,d,a,b)
  function opTav(state) {
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

  // סבב — deep mix round on quartet
  function opSovav(state) {
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

  // Run fixed demo program and produce a textual trace.
  function runDemo(initialState) {
    const program = ["א", "ב", "ג", "ת", "סבב"];
    const trace = [];
    let state = cloneState(initialState);

    trace.push("Initial state:");
    trace.push(formatState(state), "");

    program.forEach((letter, idx) => {
      const before = cloneState(state);
      const after = applyLetter(state, letter);

      trace.push(`Step ${idx + 1} — ${letter}`);
      trace.push("Before: " + formatState(before));
      trace.push("After : " + formatState(after), "");

      state = after;
    });

    trace.push("End of program.");
    trace.push("Final state:");
    trace.push(formatState(state));

    return trace.join("\n");
  }

  // -------------------------------
  // UI wiring
  // -------------------------------

  function safeParseInt(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function handleRunClick() {
    const r0Input = document.getElementById("r0");
    const r1Input = document.getElementById("r1");
    const r2Input = document.getElementById("r2");
    const r3Input = document.getElementById("r3");
    const traceEl = document.getElementById("trace-output");

    if (!r0Input || !r1Input || !r2Input || !r3Input || !traceEl) {
      console.error("IvritCode: missing one or more expected DOM elements.");
      return;
    }

    const a0 = safeParseInt(r0Input.value, 0);
    const b0 = safeParseInt(r1Input.value, 0);
    const g0 = safeParseInt(r2Input.value, 0);
    const d0 = safeParseInt(r3Input.value, 0);

    const state = createZeroState();
    state[RA] = a0;
    state[RB] = b0;
    state[RG] = g0;
    state[RD] = d0;

    const output = runDemo(state);
    traceEl.textContent = output;
  }

  function init() {
    const btn = document.getElementById("run-btn");
    if (!btn) {
      console.error("IvritCode: run button #run-btn not found.");
      return;
    }
    btn.addEventListener("click", handleRunClick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
