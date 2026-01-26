// main.js
// Tiny in-browser IvritCode demo VM. No build step required.

function safeParseInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cloneRegs(regs) {
  return regs.slice();
}

// Define the "program" as a list of letter-steps.
const PROGRAM = [
  {
    letter: "א",
    name: "Alef",
    description: "Prepare / lock in this run (no change to numbers).",
    apply(regs) {
      // No-op for the demo; real semantics could absorb randomness or context.
      return cloneRegs(regs);
    },
  },
  {
    letter: "ב",
    name: "Bet",
    description: "Add first two numbers into R2.",
    apply(regs) {
      const next = cloneRegs(regs);
      next[2] = regs[0] + regs[1];
      return next;
    },
  },
  {
    letter: "ג",
    name: "Gimel",
    description: "Multiply first two numbers into R3.",
    apply(regs) {
      const next = cloneRegs(regs);
      next[3] = regs[0] * regs[1];
      return next;
    },
  },
  {
    letter: "ת",
    name: "Tav",
    description: "Stir: rotate the registers (R0,R1,R2,R3) → (R2,R3,R0,R1).",
    apply(regs) {
      const [r0, r1, r2, r3] = regs;
      return [r2, r3, r0, r1];
    },
  },
  {
    letter: "סבב",
    name: "Sovav",
    description:
      "Deep mix: combine adds, subtracts, and scaled values for a cryptographic-style round.",
    apply(regs) {
      const [r0, r1, r2, r3] = regs;

      // Simple, readable mixing — not real cryptography, just a taste.
      const m0 = r0 + 3 * r2;
      const m1 = r1 + 5 * r3;
      const n0 = m0 + m1;
      const n1 = m0 - m1;
      const n2 = m0 * 3 - m1;
      const n3 = m1 * 2 + r0;

      return [n0, n1, n2, n3];
    },
  },
];

function formatRegs(regs) {
  return `R0=${regs[0]}  R1=${regs[1]}  R2=${regs[2]}  R3=${regs[3]}`;
}

function runIvritCode(initialRegs) {
  const traceLines = [];

  traceLines.push("IvritCode demo VM");
  traceLines.push("-----------------");
  traceLines.push("");
  traceLines.push("Step 0 — Start");
  traceLines.push(formatRegs(initialRegs));
  traceLines.push("");

  let regs = cloneRegs(initialRegs);

  PROGRAM.forEach((step, index) => {
    const stepNo = index + 1;
    regs = step.apply(regs);

    traceLines.push(
      `Step ${stepNo} — ${step.letter} (${step.name})`,
    );
    traceLines.push(step.description);
    traceLines.push(formatRegs(regs));
    traceLines.push("");
  });

  traceLines.push("End of program.");
  return { finalRegs: regs, traceText: traceLines.join("\n") };
}

function wireUi() {
  const form = document.getElementById("register-form");
  const runButton = document.getElementById("run-program");
  const traceOutput = document.getElementById("trace-output");

  const r0El = document.getElementById("r0");
  const r1El = document.getElementById("r1");
  const r2El = document.getElementById("r2");
  const r3El = document.getElementById("r3");

  if (!form || !runButton || !traceOutput || !r0El || !r1El || !r2El || !r3El) {
    console.error("IvritCode: missing one or more DOM elements.");
    return;
  }

  function handleRun(event) {
    if (event) event.preventDefault();

    const regs = [
      safeParseInt(r0El.value, 0),
      safeParseInt(r1El.value, 0),
      safeParseInt(r2El.value, 0),
      safeParseInt(r3El.value, 0),
    ];

    const { traceText } = runIvritCode(regs);
    traceOutput.textContent = traceText;

    // Keep focus on the first register so you can quickly change and press Enter.
    r0El.focus();
    r0El.select();
  }

  form.addEventListener("submit", handleRun);
  runButton.addEventListener("click", handleRun);

  // Allow pressing Enter in any box to run the program.
  [r0El, r1El, r2El, r3El].forEach((input) => {
    input.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        handleRun(evt);
      }
    });
  });

  // Auto-focus on load.
  r0El.focus();
}

document.addEventListener("DOMContentLoaded", wireUi);
