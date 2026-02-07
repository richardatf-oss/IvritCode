// main.js
// Front-end glue for IvritCode Engine + GPT Chavruta.

// ---- Imports --------------------------------------------------------------
// Adjust these imports to match your actual module names/exports.
import { assemble } from "./assembler.js";
import { run } from "./vm.js";

// If you have an explicit initial-state helper, you can import it, e.g.:
// import { makeInitialState } from "./vm.js";

// ---- DOM Helpers ----------------------------------------------------------

function $(id) {
  return document.getElementById(id);
}

const programInput = $("program-input");
const runButton = $("run-button");
const sampleButton = $("sample-button");
const resetButton = $("reset-button");
const traceOutput = $("trace-output");
const registerOutput = $("register-output");

const gptInput = $("gpt-input");
const gptSendButton = $("gpt-send-button");
const gptClearButton = $("gpt-clear-button");
const gptOutput = $("gpt-output");

// Basic HTML escaping so we can safely inject text into innerHTML
function escapeHtml(str = "") {
  return String(str).replace(/[<>&]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      default:
        return c;
    }
  });
}

// ---- IvritCode Engine Playground -----------------------------------------

/**
 * Render the register array R0..R22 into the register panel.
 * @param {number[] | null} regs
 */
function renderRegisters(regs) {
  if (!registerOutput) return;

  if (!Array.isArray(regs) || regs.length === 0) {
    registerOutput.innerHTML =
      '<div class="kv-row"><span>No registers yet. Run a program.</span></div>';
    return;
  }

  const chips = regs
    .map(
      (val, idx) =>
        `<span>R${idx} = ${escapeHtml(val.toString())}</span>`
    )
    .join("");

  registerOutput.innerHTML = `<div class="kv-row">${chips}</div>`;
}

/**
 * Render a trace summary. Since the core VM may only log to console,
 * this UI string is intentionally simple.
 * @param {string} msg
 */
function renderTrace(msg) {
  if (!traceOutput) return;
  traceOutput.textContent = msg;
}

/**
 * Run the current IvritCode program via assembler + VM.
 */
async function handleRunProgram() {
  if (!programInput) return;

  const raw = programInput.value || "";
  const letters = raw.replace(/\s+/g, "");

  if (!letters) {
    renderTrace("No program given. Type some IvritCode letters first.");
    renderRegisters(null);
    return;
  }

  try {
    renderTrace("Running program… (check console for detailed trace)");
    // Assemble the program: string → Instr[]
    const program = assemble(letters);

    // Run on the VM. VMOptions here assumes { trace?: boolean; maxSteps?: number }
    const regs = await run(program, { trace: true, maxSteps: 1000 });

    renderTrace("Done. Trace printed to console by the VM.");
    renderRegisters(regs);
  } catch (err) {
    console.error("Error running IvritCode program:", err);
    renderTrace("Error: " + String(err));
    renderRegisters(null);
  }
}

/**
 * Load a sample program into the textarea.
 */
function handleLoadSample() {
  if (!programInput) return;

  programInput.value =
    "שנבגקכעיחלצמפ\n" +
    "# Example IvritCode program\n" +
    "# One Hebrew letter per instruction; niqqud/taamim ignored for now.";

  renderTrace("Sample program loaded. Press “Run Program”.");
}

/**
 * Reset UI state (does not reset VM internals unless you add a hook).
 */
function handleReset() {
  if (programInput) programInput.value = "";
  renderTrace("Cleared program and output. VM will start fresh on next run.");
  renderRegisters(null);
}

// Wire engine UI events
if (runButton) {
  runButton.addEventListener("click", () => {
    void handleRunProgram();
  });
}

if (sampleButton) {
  sampleButton.addEventListener("click", handleLoadSample);
}

if (resetButton) {
  resetButton.addEventListener("click", handleReset);
}

// Allow Ctrl+Enter inside the program textarea to run the program.
if (programInput) {
  programInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      void handleRunProgram();
    }
  });
}

// Initial render
renderRegisters(null);
renderTrace("Enter IvritCode letters, then press “Run Program”.");


// ---- GPT Chavruta Helper (via LuminaNexus.org) ---------------------------

// Change this if you later move the function local to this site.
const GPT_ENDPOINT =
  "https://lumianexus.org/.netlify/functions/ivritcode-gpt";

/**
 * Ask the backend GPT helper for a code suggestion + explanation.
 */
async function askChavruta() {
  if (!gptInput || !gptOutput) return;

  const prompt = gptInput.value.trim();
  if (!prompt) return;

  gptOutput.innerHTML = "Asking the Chavruta…";

  try {
    const res = await fetch(GPT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const text = await res.text();
      gptOutput.innerHTML =
        "Error from backend:<br><pre>" + escapeHtml(text) + "</pre>";
      return;
    }

    const data = await res.json();
    const code = data.code || "";
    const explanation = data.explanation || "";

    // If GPT returns code, put it into the program box as a starting point
    if (code && programInput) {
      programInput.value = code;
    }

    gptOutput.innerHTML =
      `<strong>IvritCode:</strong><br>` +
      `<pre style="white-space: pre-wrap; margin: 0.25rem 0;">${escapeHtml(
        code
      )}</pre>` +
      `<br><strong>Explanation:</strong><br>` +
      `<div>${escapeHtml(explanation).replace(/\n/g, "<br>")}</div>`;
  } catch (err) {
    console.error("Error talking to Chavruta:", err);
    gptOutput.innerHTML =
      "Network / JS error:<br><pre>" + escapeHtml(String(err)) + "</pre>";
  }
}

/**
 * Clear the Chavruta panel.
 */
function clearChavruta() {
  if (gptInput) gptInput.value = "";
  if (gptOutput) {
    gptOutput.innerHTML =
      "<strong>Cleared.</strong> Ask a new question to the Chavruta.";
  }
}

// Wire GPT UI events
if (gptSendButton) {
  gptSendButton.addEventListener("click", () => {
    void askChavruta();
  });
}

if (gptClearButton) {
  gptClearButton.addEventListener("click", clearChavruta);
}

// Allow Ctrl+Enter in the Chavruta textarea to send.
if (gptInput) {
  gptInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      void askChavruta();
    }
  });
}
