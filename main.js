// main.js
// Browser wiring for IvritCode v0.0 with execution trace.

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
        <td class="reg-name ${isGlobal ? "global" : ""}">${name}</td>
        <td class="value-cell">${i}</td>
        <td class="value-cell">${regs[i]}</td>
      </tr>
    `);
  }

  tbody.innerHTML = rows.join("");
}

function renderTrace(result, traceListEl) {
  const { trace, executedOps } = result;

  // If no steps, just say “no instructions executed”
  if (!executedOps || !trace || trace.length === 0) {
    traceListEl.innerHTML = `<li>No executable IvritCode letters (א–ת) were found.</li>`;
    return;
  }

  const items = [];
  const maxShown = 64;
  const stepsToShow = Math.min(executedOps.length, maxShown);

  for (let i = 0; i < stepsToShow; i++) {
    const op = executedOps[i];
    const stateAfter = trace[i + 1] || trace[trace.length - 1];
    const r = stateAfter.regs;

    const a = r[0];
    const b = r[1];
    const g = r[2];
    const d = r[3];
    const A = r[AO_INDEX];

    items.push(`
      <li>
        <code>[${i + 1}] ${op}</code>
        → א=${a}, ב=${b}, ג=${g}, ד=${d}, A=${A}
      </li>
    `);
  }

  if (executedOps.length > maxShown) {
    items.push(
      `<li>… (${executedOps.length - maxShown} additional steps not shown)</li>`
    );
  }

  traceListEl.innerHTML = items.join("");
}

function setup() {
  const programEl = document.getElementById("program");
  const runBtn = document.getElementById("runBtn");
  const registersBody = document.getElementById("registersBody");
  const stepsCount = document.getElementById("stepsCount");
  const lastProgram = document.getElementById("lastProgram");
  const traceList = document.getElementById("traceList");

  if (!programEl || !runBtn || !registersBody || !stepsCount || !lastProgram || !traceList) {
    console.error("IvritCode UI elements not found.");
    return;
  }

  // Seed with a tiny example.
  if (!programEl.value.trim()) {
    programEl.value = "אבבגת";
  }

  const runOnce = () => {
    const src = programEl.value || "";
    const result = runProgram(src, { trace: true });

    renderRegisters(result.final, registersBody);
    renderTrace(result, traceList);

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

  // Initial render.
  runOnce();
}

document.addEventListener("DOMContentLoaded", setup);
