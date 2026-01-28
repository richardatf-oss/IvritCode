// main.js
// Browser wiring for IvritCode v0.0 playground.
// Uses vm.js (ES module) in the same directory.

import {
  AO_INDEX,
  REGISTER_NAMES,
  runProgram,
} from "./vm.js";

function renderRegisters(state, tbody) {
  const regs = state.regs;
  const rows = [];

  for (let i = 0; i < regs.length; i++) {
    const name = REGISTER_NAMES[i] ?? `r${i}`;
    const isGlobal = i === AO_INDEX;

    rows.push(`
      <tr>
        <td class="reg-name ${isGlobal ? "global" : ""}">
          ${name}
        </td>
        <td class="value-cell">${i}</td>
        <td class="value-cell">${regs[i]}</td>
      </tr>
    `);
  }

  tbody.innerHTML = rows.join("");
}

function setup() {
  const programEl = document.getElementById("program");
  const runBtn = document.getElementById("runBtn");
  const registersBody = document.getElementById("registersBody");
  const stepsCount = document.getElementById("stepsCount");
  const lastProgram = document.getElementById("lastProgram");

  if (!programEl || !runBtn || !registersBody || !stepsCount || !lastProgram) {
    console.error("IvritCode UI elements not found.");
    return;
  }

  // Tiny example program if textarea is empty.
  if (!programEl.value.trim()) {
    programEl.value = "אבבגת";
  }

  const runOnce = () => {
    const src = programEl.value || "";
    const result = runProgram(src, { trace: false });

    renderRegisters(result.final, registersBody);
    stepsCount.textContent = String(result.steps);
    lastProgram.textContent = result.executedOps || "(no valid letters)";
  };

  runBtn.addEventListener("click", runOnce);

  // Ctrl+Enter / Cmd+Enter to run from the textarea.
  programEl.addEventListener("keydown", (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
      ev.preventDefault();
      runOnce();
    }
  });

  // Initial render with all-zero state (result of running empty program).
  runOnce();
}

document.addEventListener("DOMContentLoaded", setup);
