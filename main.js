// main.js
//
// Front-end wiring for the IvritCode VM (v1.0).
// - Builds register UI
// - Runs programs through vm.runProgram
// - Renders execution trace and Kabbalistic commentary

import { LETTERS, INDEX_A, runProgram } from "./vm.js";

// --- DOM references ---------------------------------------------------------

const grid = document.getElementById("registerGrid");
const programInput = document.getElementById("programInput");
const output = document.getElementById("output");
const kabbalahOutput = document.getElementById("kabbalahOutput");
const opcodeRef = document.getElementById("opcodeRef");
const runBtn = document.getElementById("runBtn");
const resetBtn = document.getElementById("resetBtn");

// --- Gematria map (standard Mispar Hechrechi) ------------------------------

const GEMATRIA = {
  "א": 1,   "ב": 2,   "ג": 3,   "ד": 4,   "ה": 5,
  "ו": 6,   "ז": 7,   "ח": 8,   "ט": 9,   "י": 10,
  "כ": 20,  "ך": 20,  "ל": 30,  "מ": 40,  "ם": 40,
  "נ": 50,  "ן": 50,  "ס": 60,  "ע": 70,  "פ": 80,
  "ף": 80,  "צ": 90,  "ץ": 90,  "ק": 100, "ר": 200,
  "ש": 300, "ת": 400
};

// --- Opcode descriptions (aligned to v1.0 23-wide semantics) ---------------

const OPCODE_INFO = {
  "א": {
    name: "Alef",
    summary: "Identity / frame (no-op)",
    detail: "Does nothing to any register; useful as a visual or logical frame marker."
  },
  "ב": {
    name: "Bet",
    summary: "Pairwise addition (first → second half)",
    detail: "For each i=0..10, adds r[i] into r[i+11], leaving the first half unchanged."
  },
  "ג": {
    name: "Gimel",
    summary: "Pairwise multiplication (first → second half)",
    detail: "For each i=0..10, multiplies r[i+11] by r[i]."
  },
  "ד": {
    name: "Dalet",
    summary: "Difference pairs across halves",
    detail: "For each pair (r[i], r[i+11]), replaces them with (r[i+11]−r[i], r[i]−r[i+11])."
  },
  "ה": {
    name: "Hei",
    summary: "Sign map, A = net sign",
    detail: "Replaces each letter register with sign(r[i]) in Z22 and sets A to the sum of signs."
  },
  "ו": {
    name: "Vav",
    summary: "Swap halves",
    detail: "Swaps r[i] with r[i+11] for all i=0..10."
  },
  "ז": {
    name: "Zayin",
    summary: "Increment all letters",
    detail: "Adds 1 to every letter-register (mod 22), and adds 22 to A (which is 0 mod 22, but tracked conceptually)."
  },
  "ח": {
    name: "Chet",
    summary: "Decrement all letters",
    detail: "Subtracts 1 from every letter-register (mod 22), and subtracts 22 from A."
  },
  "ט": {
    name: "Tet",
    summary: "Square all letters, A = sum of squares",
    detail: "Squares each letter-register (mod 22) and sets A to the sum of raw squares, reduced mod 22."
  },
  "י": {
    name: "Yod",
    summary: "Broadcast A to all letters",
    detail: "Sets every letter-register r[i] equal to A, leaving A unchanged."
  },
  "כ": {
    name: "Kaf",
    summary: "Sliding window sum (size 4)",
    detail: "Each r[i] becomes the sum of itself and the next three letters (indices modulo 22)."
  },
  "ל": {
    name: "Lamed",
    summary: "Global sum to A and recentering",
    detail: "Computes a balanced sum of all letters into A and recenters each r[i] by subtracting the mean (all mod 22)."
  },
  "מ": {
    name: "Mem",
    summary: "Moving average (3-point)",
    detail: "Each r[i] becomes the average of its previous, current, and next neighbor in a balanced sense; A becomes the average of the smoothed field."
  },
  "נ": {
    name: "Nun",
    summary: "Global negation",
    detail: "Negates all letter-registers and A in balanced form, then maps back into Z22."
  },
  "ס": {
    name: "Samekh",
    summary: "Rotation by A",
    detail: "Rotates the alphabet by A steps (using A as a signed rotation amount)."
  },
  "ע": {
    name: "Ayin",
    summary: "Max correlation of halves → A",
    detail: "Computes dot-product-like correlations between first and second halves under shifts and stores the maximum into A."
  },
  "פ": {
    name: "Pe",
    summary: "Expose Alef locally and globally",
    detail: "Copies register Alef into A, and adds Alef into Bet and Tav."
  },
  "צ": {
    name: "Tsadi",
    summary: "Compare halves; expose extremes",
    detail: "Compares total of first vs. second half, writes sign(S1−S2) into A, and exposes the maximal half at Alef or Tav."
  },
  "ק": {
    name: "Qof",
    summary: "Mirror & tilt",
    detail: "Mirrors the alphabet (r[i] ← r[21−i]) and adds i as a small index-based tilt."
  },
  "ר": {
    name: "Resh",
    summary: "Reseed from A with stride",
    detail: "Uses A as a base and Bet as stride to reseed all letters as A + i·stride (mod 22)."
  },
  "ש": {
    name: "Shin",
    summary: "Nonlinear mix in blocks of four",
    detail: "Applies the classical (a,b,g,d) → (a²+b, b²+g, g²+d, d²+a) map to blocks of four letters across the alphabet; A becomes the maximum absolute value."
  },
  "ת": {
    name: "Tav",
    summary: "Quartet rotation in blocks of four",
    detail: "Rotates each block of four letters as (a,b,c,d) → (c,d,a,b); A is unchanged."
  }
};

// --- Build register grid ----------------------------------------------------

function buildRegisterGrid() {
  if (!grid) return;
  grid.innerHTML = "";

  // Letter registers (א–ת)
  LETTERS.forEach((letter, i) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.innerHTML = `
      <label>${letter}</label>
      <input type="number" value="0" data-index="${i}" />
    `;
    grid.appendChild(cell);
  });

  // Aleph-Olam (A)
  const aCell = document.createElement("div");
  aCell.className = "cell global";
  aCell.innerHTML = `
    <label>A</label>
    <input type="number" value="0" data-index="${INDEX_A}" />
  `;
  grid.appendChild(aCell);
}

// --- Opcode reference list --------------------------------------------------

function renderOpcodeReference() {
  if (!opcodeRef) return;
  const frag = document.createDocumentFragment();

  LETTERS.forEach(letter => {
    const info = OPCODE_INFO[letter];
    if (!info) return;
    const div = document.createElement("div");
    div.className = "opcode-item";
    div.innerHTML = `
      <span class="letter">${letter}</span>
      <span class="name">${info.name}</span>
      <span class="summary">— ${info.summary}</span>
    `;
    div.title = info.detail;
    frag.appendChild(div);
  });

  opcodeRef.innerHTML = "";
  opcodeRef.appendChild(frag);
}

// --- State helpers ----------------------------------------------------------

function collectState() {
  const state = new Array(23).fill(0);
  if (!grid) return state;
  grid.querySelectorAll("input").forEach(input => {
    const idx = Number(input.dataset.index);
    const raw = Number(input.value);
    const val = Number.isFinite(raw) ? raw : 0;
    // Let the VM handle mod 22; we just feed integers
    state[idx] = val;
  });
  return state;
}

function setState(state) {
  if (!grid) return;
  grid.querySelectorAll("input").forEach(input => {
    const idx = Number(input.dataset.index);
    const value = state[idx] ?? 0;
    input.value = String(value);
  });
}

function resetUI() {
  if (grid) {
    grid.querySelectorAll("input").forEach(input => {
      input.value = "0";
    });
  }
  if (programInput) programInput.value = "";
  if (output) output.textContent = "(trace and final state will appear here)";
  if (kabbalahOutput) {
    kabbalahOutput.textContent = "(gematria and symbolic breakdown will appear here)";
  }
}

// --- Step explanation -------------------------------------------------------

function explainStep(step) {
  const { letter, before, after, index } = step;
  const info = OPCODE_INFO[letter] || {};
  const name = info.name || "?";
  const summary = info.summary || "";
  const detail = info.detail || "";

  let text = "";
  text += `Step ${index} — Letter ${letter} (${name}): ${summary}\n`;
  if (detail) {
    text += `  ${detail}\n`;
  }

  const changes = [];
  for (let i = 0; i < after.length; i++) {
    if (before[i] !== after[i]) {
      const regName = i === INDEX_A ? "A" : LETTERS[i];
      changes.push({
        index: i,
        regName,
        before: before[i],
        after: after[i]
      });
    }
  }

  if (changes.length === 0) {
    text += "  No registers changed.\n\n";
    return text;
  }

  text += "  Changes:\n";
  for (const c of changes) {
    text += `    ${c.regName} (index ${c.index}): ${c.before} → ${c.after}\n`;
  }
  text += "\n";
  return text;
}

// --- Kabbalistic commentary -------------------------------------------------

function computeProgramGematria(instructions) {
  let total = 0;
  const perLetter = [];
  instructions.forEach(ch => {
    const value = GEMATRIA[ch] ?? 0;
    total += value;
    perLetter.push({ letter: ch, value });
  });
  return { total, perLetter };
}

function sumLetters(state) {
  let sum = 0;
  for (let i = 0; i < LETTERS.length; i++) sum += state[i] ?? 0;
  return sum;
}

function interpretNumber(n) {
  // Very small, symbolic dictionary
  switch (n) {
    case 1: return "1 — אחד (echad): unity, Keter, the indivisible source.";
    case 2: return "2 — duality, giver/receiver, upper/lower, heaven/earth.";
    case 3: return "3 — tiferet of a line: thesis–antithesis–synthesis.";
    case 4: return "4 — דלת (dalet): structure, directions, the house’s frame.";
    case 5: return "5 — ה (hei): revelation, window, the breath that opens.";
    case 6: return "6 — ו (vav): connection, the hook between realms.";
    case 7: return "7 — ז (zayin): struggle and Shabbat; sword and rest.";
    case 8: return "8 — ח (chet): beyond nature, the doorway past 7.";
    case 9: return "9 — ט (tet): hidden goodness, concealed within form.";
    case 10: return "10 — י (yod): point of creation, seed of all expansion.";
    case 12: return "12 — tribes, configuration of wholeness in time/space.";
    case 13: return "13 — אחד / אהבה (echad/ahavah): oneness through love.";
    case 18: return "18 — חי (chai): life-force, living motion.";
    case 22: return "22 — the full Aleph-Bet, all channels open.";
    case 26: return "26 — value of the Tetragrammaton (Havayah) in gematria.";
    case 32: return "32 — ל\"ב נתיבות חכמה: thirty-two paths of Wisdom.";
    case 40: return "40 — מ (mem): waters, transition, womb, forty days.";
    case 50: return "50 — שערי בינה (gates of Binah), jubilee, transcendence.";
    default:
      if (n <= 0) return `${n} — movement into contraction / concealment.`;
      if (n > 400) return `${n} — composite light (sum of many letters).`;
      return `${n} — a composite value; can be factored into letter-gates.`;
  }
}

function generateKabbalisticCommentary(initialState, finalState, instructions) {
  if (!instructions || instructions.length === 0) {
    return "No IvritCode letters (א–ת) were executed, so no Kabbalistic pattern was written into the state.";
  }

  let text = "";

  // 1. Program gematria
  const { total, perLetter } = computeProgramGematria(instructions);
  text += "Program Gematria:\n";
  text += "  Letters: " + instructions.join("") + "\n";
  text += "  Breakdown:\n";
  perLetter.forEach(item => {
    if (!item.letter) return;
    const value = item.value;
    text += `    ${item.letter}: ${value}\n`;
  });
  text += `  Total gematria of program: ${total}\n`;
  text += "  Interpretation: " + interpretNumber(total) + "\n\n";

  // 2. Global movement of the letters
  const sumInit = sumLetters(initialState);
  const sumFinal = sumLetters(finalState);
  const deltaLetters = sumFinal - sumInit;

  text += "Letter-Registers (א–ת) — Global Movement:\n";
  text += `  Initial sum of letters: ${sumInit}\n`;
  text += `  Final sum of letters:   ${sumFinal}\n`;
  text += `  Change (Δ):             ${deltaLetters}\n`;
  if (deltaLetters !== 0) {
    text += "  Reading: the total 'weight of letters' ";
    text += deltaLetters > 0
      ? "increased — an intensification of expressed light.\n"
      : "decreased — a contraction or focusing of the light.\n";
    text += "  Δ Interpretation: " + interpretNumber(Math.abs(deltaLetters)) + "\n\n";
  } else {
    text += "  Reading: the total weight is unchanged — transformation by rearrangement rather than net gain/loss.\n\n";
  }

  // 3. Aleph-Olam movement
  const aInit = initialState[INDEX_A];
  const aFinal = finalState[INDEX_A];
  const deltaA = aFinal - aInit;

  text += "Aleph-Olam (A) — Global Register:\n";
  text += `  Initial A: ${aInit}\n`;
  text += `  Final A:   ${aFinal}\n`;
  text += `  Change (ΔA): ${deltaA}\n`;

  if (deltaA !== 0) {
    text += deltaA > 0
      ? "  Reading: Aleph-Olam accumulated additional content from the letters.\n"
      : "  Reading: Aleph-Olam released or exposed content back into the letters.\n";
    text += "  |ΔA| Interpretation: " + interpretNumber(Math.abs(deltaA)) + "\n\n";
  } else {
    text += "  Reading: A remained numerically the same — the global seed was consulted, but not displaced.\n\n";
  }

  // 4. Simple per-letter quartet focus (for intuition)
  text += "Sample of State (א..ד and A):\n";
  const names = ["א", "ב", "ג", "ד"];
  names.forEach((name, idx) => {
    const before = initialState[idx];
    const after = finalState[idx];
    if (before === after) {
      text += `  ${name}: ${before} → ${after} (no net change)\n`;
    } else {
      const diff = after - before;
      text += `  ${name}: ${before} → ${after} (Δ=${diff})\n`;
    }
  });
  text += `  A: ${aInit} → ${aFinal} (Δ=${deltaA})\n\n`;

  text += "Narrative Sketch:\n";
  text += "  • The program’s gematria defines an overall 'tone' or intention.\n";
  text += "  • The change in the sum of the letters (א–ת) reflects how much of that tone became structured in the vessels.\n";
  text += "  • The movement in A (Aleph-Olam) shows how the hidden global register was either loaded from, or poured into, the visible letters.\n";
  text += "  • The local movements in א..ד give a quick window into where the computation was most concentrated.\n";

  return text;
}

// --- Run & reset handlers ---------------------------------------------------

function handleRun() {
  const initialState = collectState();
  const program = programInput ? programInput.value || "" : "";

  const { finalState, trace, instructions } = runProgram(initialState, program, 1000);

  // Update UI with final state
  setState(finalState);

  if (!output) return;

  if (trace.length === 0) {
    output.textContent =
      "No executable letters (א–ת) found in program.\n\n" +
      "Initial and final state are identical:\n\n" +
      JSON.stringify(initialState, null, 2);
    if (kabbalahOutput) {
      kabbalahOutput.textContent =
        "No IvritCode letters (א–ת) were executed, so no Kabbalistic pattern was written into the state.";
    }
    return;
  }

  let text = "";
  text += "Program (interpreted letters only):\n";
  text += instructions.join("") + "\n\n";

  text += "Initial State R(23):\n";
  text += JSON.stringify(initialState, null, 2) + "\n\n";

  text += "Execution Trace (base letters only; niqqud/trop ignored for now):\n\n";
  for (const step of trace) {
    text += explainStep(step);
  }

  text += "Final State R(23):\n";
  text += JSON.stringify(finalState, null, 2);

  output.textContent = text;

  if (kabbalahOutput) {
    const kabbalisticText = generateKabbalisticCommentary(initialState, finalState, instructions);
    kabbalahOutput.textContent = kabbalisticText;
  }
}

// --- Init -------------------------------------------------------------------

buildRegisterGrid();
renderOpcodeReference();

if (runBtn) runBtn.addEventListener("click", handleRun);
if (resetBtn) resetBtn.addEventListener("click", resetUI);
