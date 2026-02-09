// main.js
// IvritCode Letter Flow Console
// Front-end glue: program → VM → registers → letters → words & gates → Chavruta.

import { assemble // main.js
// IvritCode Letter Flow Console
// Front-end glue: program → VM → registers → letters → words & gates → Chavruta.

import { assemble } from "./assembler.js";
import { run } from "./vm.js";

// ---------- Small helpers ----------

const $ = (id) => document.getElementById(id);

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

// ---------- DOM references ----------

const programInput = $("program-input");
const runButton = $("run-button");
const sampleButton = $("sample-button");
const resetButton = $("reset-button");

const traceOutput = $("trace-output");
const registerOutput = $("register-output");

const letterStreamEl = $("letter-stream");
const wordListEl = $("word-list");
const gateListEl = $("gate-list");

const gptInput = $("gpt-input");
const gptSendButton = $("gpt-send-button");
const gptClearButton = $("gpt-clear-button");
const gptOutput = $("gpt-output");

// ---------- Base-22 letter mapping ----------

// 0..21 → א..ת
const HEBREW_LETTERS = [
  "א","ב","ג","ד","ה","ו","ז","ח","ט","י","כ","ל",
  "מ","נ","ס","ע","פ","צ","ק","ר","ש","ת"
];

// Optionally, Aleph Olam as a special symbol
const ALEPH_OLAM_SYMBOL = "ׇ"; // you can swap to any glyph you like

function valueToLetter(v) {
  if (Number.isNaN(v) || !Number.isFinite(v)) {
    return ALEPH_OLAM_SYMBOL;
  }
  // safe mod for negatives
  const n = ((Math.trunc(v) % 22) + 22) % 22;
  return HEBREW_LETTERS[n] ?? ALEPH_OLAM_SYMBOL;
}

function registersToLetterStream(regs) {
  if (!Array.isArray(regs) || regs.length === 0) return "";
  return regs.map(valueToLetter).join("");
}

// ---------- Word & gate extraction ----------

/**
 * Sliding windows of length 3..5 over the stream.
 * For now we don't filter by lexicon; we just show candidates.
 */
function extractWordCandidates(stream, minLen = 3, maxLen = 5) {
  const out = [];
  for (let len = minLen; len <= maxLen; len++) {
    for (let i = 0; i + len <= stream.length; i++) {
      const word = stream.slice(i, i + len);
      out.push({ word, start: i, len });
    }
  }
  return out;
}

/**
 * Count letter pairs (gates) א־ב, ב־ג, etc.
 */
function computeGateFrequencies(stream) {
  const counts = new Map();
  for (let i = 0; i + 1 < stream.length; i++) {
    const pair = stream[i] + "־" + stream[i + 1]; // use maqaf-like separator
    counts.set(pair, (counts.get(pair) || 0) + 1);
  }
  // convert to sorted array
  return [...counts.entries()]
    .map(([gate, count]) => ({ gate, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------- Rendering ----------

function renderTrace(msg) {
  if (!traceOutput) return;
  traceOutput.textContent = msg;
}

function renderRegisters(regs) {
  if (!registerOutput) return;

  if (!Array.isArray(regs) || regs.length === 0) {
    registerOutput.innerHTML =
      '<div class="kv-row"><span>No state yet. Run a program.</span></div>';
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

function renderLetterStream(stream, wordCandidates) {
  if (!letterStreamEl) return;

  if (!stream) {
    letterStreamEl.textContent = "(No flow yet. Run a program.)";
    return;
  }

  // For now we just highlight the longest words by length
  const hits = new Set(
    wordCandidates.filter((w) => w.len === 5).map((w) => w.start + ":" + w.len)
  );

  let html = "";
  for (let i = 0; i < stream.length; i++) {
    const ch = stream[i];
    // see whether this index is the start of a highlighted word
    const hitKey = Array.from(hits).find((k) => k.startsWith(i + ":"));
    if (hitKey) {
      const len = parseInt(hitKey.split(":")[1], 10) || 1;
      const word = stream.slice(i, i + len);
      html += `<span class="letter hit">${escapeHtml(word)}</span>`;
      i += len - 1;
    } else {
      html += `<span class="letter">${escapeHtml(ch)}</span>`;
    }
  }

  letterStreamEl.innerHTML = html;
}

function renderWordList(candidates) {
  if (!wordListEl) return;

  if (!candidates || candidates.length === 0) {
    wordListEl.innerHTML =
      "<h3>Candidate words</h3><div class=\"list-item\">No candidates.</div>";
    return;
  }

  // collapse duplicates and count
  const counts = new Map();
  for (const c of candidates) {
    counts.set(c.word, (counts.get(c.word) || 0) + 1);
  }

  const sorted = [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || b.word.length - a.word.length)
    .slice(0, 20);

  let html = "<h3>Candidate words</h3>";
  if (sorted.length === 0) {
    html += '<div class="list-item">No candidates.</div>';
  } else {
    for (const { word, count } of sorted) {
      html += `<div class="list-item"><strong>${escapeHtml(
        word
      )}</strong> &middot; ${count}</div>`;
    }
  }

  wordListEl.innerHTML = html;
}

function renderGateList(gates) {
  if (!gateListEl) return;

  if (!gates || gates.length === 0) {
    gateListEl.innerHTML =
      "<h3>231 Gates (letter pairs)</h3><div class=\"list-item\">No gates yet.</div>";
    return;
  }

  const top = gates.slice(0, 20);
  let html = "<h3>231 Gates (letter pairs)</h3>";
  for (const { gate, count } of top) {
    html += `<div class="list-item"><strong>${escapeHtml(
      gate
    )}</strong> &middot; ${count}</div>`;
  }
  gateListEl.innerHTML = html;
}

// ---------- Engine execution ----------

async function handleRunProgram() {
  if (!programInput) return;

  const raw = programInput.value || "";
  const lines = raw
    .split(/\r?\n/)
    .map((ln) => ln.replace(/#.*/, "").trim())
    .filter((ln) => ln.length > 0);

  const programLetters = lines.join("").replace(/\s+/g, "");

  if (!programLetters) {
    renderTrace("No IvritCode letters given. Type a program first.");
    renderRegisters(null);
    renderLetterStream("", []);
    renderWordList([]);
    renderGateList([]);
    return;
  }

  try:
  try {
    renderTrace("Running program… (detailed trace may appear in console)");
    const instrs = assemble(programLetters);
    const regs = await run(instrs, { trace: true, maxSteps: 2000 });

    renderTrace("Execution complete. VM reported trace to console.");
    renderRegisters(regs);

    const stream = registersToLetterStream(regs);
    const candidates = extractWordCandidates(stream, 3, 5);
    const gates = computeGateFrequencies(stream);

    renderLetterStream(stream, candidates);
    renderWordList(candidates);
    renderGateList(gates);
  } catch (err) {
    console.error("Error running IvritCode program:", err);
    renderTrace("Error: " + String(err));
    renderRegisters(null);
    renderLetterStream("", []);
    renderWordList([]);
    renderGateList([]);
  }
}

function handleLoadSample() {
  if (!programInput) return;
  programInput.value =
    "שנבגקכעיחלצמפ\n" +
    "# Example IvritCode sequence\n" +
    "# One opcode letter per instruction.";
  renderTrace("Sample program loaded. Press Run.");
}

function handleReset() {
  if (programInput) programInput.value = "";
  renderTrace("Cleared. Enter a new IvritCode program.");
  renderRegisters(null);
  renderLetterStream("", []);
  renderWordList([]);
  renderGateList([]);
}

// Wire buttons & shortcuts
if (runButton) {
  runButton.addEventListener("click", () => void handleRunProgram());
}
if (sampleButton) {
  sampleButton.addEventListener("click", handleLoadSample);
}
if (resetButton) {
  resetButton.addEventListener("click", handleReset);
}
if (programInput) {
  programInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      void handleRunProgram();
    }
  });
}

// Initial UI state
renderRegisters(null);
renderLetterStream("", []);
renderWordList([]);
renderGateList([]);

// ---------- GPT Chavruta wiring ----------

// Central brain on LuminaNexus.org.
// Change this to "/.netlify/functions/ivritcode-gpt" if you host it locally.
const GPT_ENDPOINT =
  "https://lumianexus.org/.netlify/functions/ivritcode-gpt";

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
        "Backend error:<br><pre>" + escapeHtml(text) + "</pre>";
      return;
    }

    const data = await res.json();
    const code = data.code || "";
    const explanation = data.explanation || "";

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
    console.error("Error calling Chavruta:", err);
    gptOutput.innerHTML =
      "Network / JS error:<br><pre>" + escapeHtml(String(err)) + "</pre>";
  }
}

function clearChavruta() {
  if (gptInput) gptInput.value = "";
  if (gptOutput) {
    gptOutput.innerHTML =
      "Cleared. Describe a new intention for the machine.";
  }
}

if (gptSendButton) {
  gptSendButton.addEventListener("click", () => void askChavruta());
}
if (gptClearButton) {
  gptClearButton.addEventListener("click", clearChavruta);
}
if (gptInput) {
  gptInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      void askChavruta();
    }
  });
}
} from "./assembler.js";
import { run } from "./vm.js";

// ---------- Small helpers ----------

const $ = (id) => document.getElementById(id);

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

// ---------- DOM references ----------

const programInput = $("program-input");
const runButton = $("run-button");
const sampleButton = $("sample-button");
const resetButton = $("reset-button");

const traceOutput = $("trace-output");
const registerOutput = $("register-output");

const letterStreamEl = $("letter-stream");
const wordListEl = $("word-list");
const gateListEl = $("gate-list");

const gptInput = $("gpt-input");
const gptSendButton = $("gpt-send-button");
const gptClearButton = $("gpt-clear-button");
const gptOutput = $("gpt-output");

// ---------- Base-22 letter mapping ----------

// 0..21 → א..ת
const HEBREW_LETTERS = [
  "א","ב","ג","ד","ה","ו","ז","ח","ט","י","כ","ל",
  "מ","נ","ס","ע","פ","צ","ק","ר","ש","ת"
];

// Optionally, Aleph Olam as a special symbol
const ALEPH_OLAM_SYMBOL = "ׇ"; // you can swap to any glyph you like

function valueToLetter(v) {
  if (Number.isNaN(v) || !Number.isFinite(v)) {
    return ALEPH_OLAM_SYMBOL;
  }
  // safe mod for negatives
  const n = ((Math.trunc(v) % 22) + 22) % 22;
  return HEBREW_LETTERS[n] ?? ALEPH_OLAM_SYMBOL;
}

function registersToLetterStream(regs) {
  if (!Array.isArray(regs) || regs.length === 0) return "";
  return regs.map(valueToLetter).join("");
}

// ---------- Word & gate extraction ----------

/**
 * Sliding windows of length 3..5 over the stream.
 * For now we don't filter by lexicon; we just show candidates.
 */
function extractWordCandidates(stream, minLen = 3, maxLen = 5) {
  const out = [];
  for (let len = minLen; len <= maxLen; len++) {
    for (let i = 0; i + len <= stream.length; i++) {
      const word = stream.slice(i, i + len);
      out.push({ word, start: i, len });
    }
  }
  return out;
}

/**
 * Count letter pairs (gates) א־ב, ב־ג, etc.
 */
function computeGateFrequencies(stream) {
  const counts = new Map();
  for (let i = 0; i + 1 < stream.length; i++) {
    const pair = stream[i] + "־" + stream[i + 1]; // use maqaf-like separator
    counts.set(pair, (counts.get(pair) || 0) + 1);
  }
  // convert to sorted array
  return [...counts.entries()]
    .map(([gate, count]) => ({ gate, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------- Rendering ----------

function renderTrace(msg) {
  if (!traceOutput) return;
  traceOutput.textContent = msg;
}

function renderRegisters(regs) {
  if (!registerOutput) return;

  if (!Array.isArray(regs) || regs.length === 0) {
    registerOutput.innerHTML =
      '<div class="kv-row"><span>No state yet. Run a program.</span></div>';
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

function renderLetterStream(stream, wordCandidates) {
  if (!letterStreamEl) return;

  if (!stream) {
    letterStreamEl.textContent = "(No flow yet. Run a program.)";
    return;
  }

  // For now we just highlight the longest words by length
  const hits = new Set(
    wordCandidates.filter((w) => w.len === 5).map((w) => w.start + ":" + w.len)
  );

  let html = "";
  for (let i = 0; i < stream.length; i++) {
    const ch = stream[i];
    // see whether this index is the start of a highlighted word
    const hitKey = Array.from(hits).find((k) => k.startsWith(i + ":"));
    if (hitKey) {
      const len = parseInt(hitKey.split(":")[1], 10) || 1;
      const word = stream.slice(i, i + len);
      html += `<span class="letter hit">${escapeHtml(word)}</span>`;
      i += len - 1;
    } else {
      html += `<span class="letter">${escapeHtml(ch)}</span>`;
    }
  }

  letterStreamEl.innerHTML = html;
}

function renderWordList(candidates) {
  if (!wordListEl) return;

  if (!candidates || candidates.length === 0) {
    wordListEl.innerHTML =
      "<h3>Candidate words</h3><div class=\"list-item\">No candidates.</div>";
    return;
  }

  // collapse duplicates and count
  const counts = new Map();
  for (const c of candidates) {
    counts.set(c.word, (counts.get(c.word) || 0) + 1);
  }

  const sorted = [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || b.word.length - a.word.length)
    .slice(0, 20);

  let html = "<h3>Candidate words</h3>";
  if (sorted.length === 0) {
    html += '<div class="list-item">No candidates.</div>';
  } else {
    for (const { word, count } of sorted) {
      html += `<div class="list-item"><strong>${escapeHtml(
        word
      )}</strong> &middot; ${count}</div>`;
    }
  }

  wordListEl.innerHTML = html;
}

function renderGateList(gates) {
  if (!gateListEl) return;

  if (!gates || gates.length === 0) {
    gateListEl.innerHTML =
      "<h3>231 Gates (letter pairs)</h3><div class=\"list-item\">No gates yet.</div>";
    return;
  }

  const top = gates.slice(0, 20);
  let html = "<h3>231 Gates (letter pairs)</h3>";
  for (const { gate, count } of top) {
    html += `<div class="list-item"><strong>${escapeHtml(
      gate
    )}</strong> &middot; ${count}</div>`;
  }
  gateListEl.innerHTML = html;
}

// ---------- Engine execution ----------

async function handleRunProgram() {
  if (!programInput) return;

  const raw = programInput.value || "";
  const lines = raw
    .split(/\r?\n/)
    .map((ln) => ln.replace(/#.*/, "").trim())
    .filter((ln) => ln.length > 0);

  const programLetters = lines.join("").replace(/\s+/g, "");

  if (!programLetters) {
    renderTrace("No IvritCode letters given. Type a program first.");
    renderRegisters(null);
    renderLetterStream("", []);
    renderWordList([]);
    renderGateList([]);
    return;
  }

  try:
  try {
    renderTrace("Running program… (detailed trace may appear in console)");
    const instrs = assemble(programLetters);
    const regs = await run(instrs, { trace: true, maxSteps: 2000 });

    renderTrace("Execution complete. VM reported trace to console.");
    renderRegisters(regs);

    const stream = registersToLetterStream(regs);
    const candidates = extractWordCandidates(stream, 3, 5);
    const gates = computeGateFrequencies(stream);

    renderLetterStream(stream, candidates);
    renderWordList(candidates);
    renderGateList(gates);
  } catch (err) {
    console.error("Error running IvritCode program:", err);
    renderTrace("Error: " + String(err));
    renderRegisters(null);
    renderLetterStream("", []);
    renderWordList([]);
    renderGateList([]);
  }
}

function handleLoadSample() {
  if (!programInput) return;
  programInput.value =
    "שנבגקכעיחלצמפ\n" +
    "# Example IvritCode sequence\n" +
    "# One opcode letter per instruction.";
  renderTrace("Sample program loaded. Press Run.");
}

function handleReset() {
  if (programInput) programInput.value = "";
  renderTrace("Cleared. Enter a new IvritCode program.");
  renderRegisters(null);
  renderLetterStream("", []);
  renderWordList([]);
  renderGateList([]);
}

// Wire buttons & shortcuts
if (runButton) {
  runButton.addEventListener("click", () => void handleRunProgram());
}
if (sampleButton) {
  sampleButton.addEventListener("click", handleLoadSample);
}
if (resetButton) {
  resetButton.addEventListener("click", handleReset);
}
if (programInput) {
  programInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      void handleRunProgram();
    }
  });
}

// Initial UI state
renderRegisters(null);
renderLetterStream("", []);
renderWordList([]);
renderGateList([]);

// ---------- GPT Chavruta wiring ----------

// Central brain on LuminaNexus.org.
// Change this to "/.netlify/functions/ivritcode-gpt" if you host it locally.
const GPT_ENDPOINT =
  "https://lumianexus.org/.netlify/functions/ivritcode-gpt";

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
        "Backend error:<br><pre>" + escapeHtml(text) + "</pre>";
      return;
    }

    const data = await res.json();
    const code = data.code || "";
    const explanation = data.explanation || "";

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
    console.error("Error calling Chavruta:", err);
    gptOutput.innerHTML =
      "Network / JS error:<br><pre>" + escapeHtml(String(err)) + "</pre>";
  }
}

function clearChavruta() {
  if (gptInput) gptInput.value = "";
  if (gptOutput) {
    gptOutput.innerHTML =
      "Cleared. Describe a new intention for the machine.";
  }
}

if (gptSendButton) {
  gptSendButton.addEventListener("click", () => void askChavruta());
}
if (gptClearButton) {
  gptClearButton.addEventListener("click", clearChavruta);
}
if (gptInput) {
  gptInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      void askChavruta();
    }
  });
}
