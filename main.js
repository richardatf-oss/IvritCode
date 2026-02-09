// main.js
// Self-contained IvritCode demo VM + letter flow + GPT Chavruta.

// ---------- Small helpers ----------

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(str = "") {
  return String(str).replace(/[<>&]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      default: return c;
    }
  });
}

// ---------- DOM references ----------

const programInput   = $("program-input");
const runButton      = $("run-button");
const sampleButton   = $("sample-button");
const resetButton    = $("reset-button");

const traceOutput    = $("trace-output");
const registerOutput = $("register-output");

const letterStreamEl = $("letter-stream");
const wordListEl     = $("word-list");
const gateListEl     = $("gate-list");

const gptInput       = $("gpt-input");
const gptSendButton  = $("gpt-send-button");
const gptClearButton = $("gpt-clear-button");
const gptOutput      = $("gpt-output");

// ---------- Base-22 letter mapping ----------

const HEBREW_LETTERS = [
  "א","ב","ג","ד","ה","ו","ז","ח","ט","י","כ","ל",
  "מ","נ","ס","ע","פ","צ","ק","ר","ש","ת"
];

const ALEPH_OLAM_SYMBOL = "ׇ";

function valueToLetter(v) {
  if (Number.isNaN(v) || !Number.isFinite(v)) {
    return ALEPH_OLAM_SYMBOL;
  }
  const n = ((Math.trunc(v) % 22) + 22) % 22;
  return HEBREW_LETTERS[n] ?? ALEPH_OLAM_SYMBOL;
}

// ---------- Tiny demo VM ----------
//
// This is NOT your full cryptographic VM; it's a deterministic toy so the UI
// can breathe and show letter flows.
//
// Program: string of Hebrew letters.
// State: 23 registers R0..R22, start at 0.
// Semantics (very simple):
//  - For each letter at index i:
//      idx   = position in HEBREW_LETTERS (0..21), or 0 if not found
//      slot  = i % 23
//      R[slot] = (R[slot] + idx + 1) * (idx + 3) mod 137
//  - We also produce a human-readable trace for each step.

function executeProgram(letters) {
  const regs = new Array(23).fill(0);
  const traceLines = [];

  const chars = Array.from(letters);
  chars.forEach((ch, i) => {
    const idx = HEBREW_LETTERS.indexOf(ch);
    const opIndex = idx === -1 ? 0 : idx;
    const slot = i % 23;

    const before = regs[slot];
    const after = (((before + opIndex + 1) * (opIndex + 3)) % 137);

    regs[slot] = after;

    traceLines.push(
      `t=${i}  op=${ch} (idx=${opIndex})  slot=R${slot}  ${before} → ${after}`
    );
  });

  if (traceLines.length === 0) {
    traceLines.push("No instructions executed (empty program).");
  }

  return { regs, traceLines };
}

// ---------- Word & gate extraction ----------

function registersToLetterStream(regs) {
  if (!Array.isArray(regs) || regs.length === 0) return "";
  return regs.map(valueToLetter).join("");
}

function extractWordCandidates(stream, minLen = 3, maxLen = 5) {
  const out = [];
  for (let len = minLen; len <= maxLen; len++) {
    for (let i = 0; i + len <= stream.length; i++) {
      out.push({ word: stream.slice(i, i + len), start: i, len });
    }
  }
  return out;
}

function computeGateFrequencies(stream) {
  const counts = new Map();
  for (let i = 0; i + 1 < stream.length; i++) {
    const pair = stream[i] + "־" + stream[i + 1];
    counts.set(pair, (counts.get(pair) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([gate, count]) => ({ gate, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------- Rendering ----------

function renderTrace(msgOrLines) {
  if (!traceOutput) return;
  if (Array.isArray(msgOrLines)) {
    traceOutput.textContent = msgOrLines.join("\n");
  } else {
    traceOutput.textContent = msgOrLines;
  }
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

  // highlight longest windows (len 5) just as visual hints
  const hits = new Set(
    wordCandidates
      .filter((w) => w.len === 5)
      .map((w) => `${w.start}:${w.len}`)
  );

  let html = "";
  for (let i = 0; i < stream.length; i++) {
    const matchKey = [...hits].find((k) => k.startsWith(i + ":"));
    if (matchKey) {
      const len = parseInt(matchKey.split(":")[1], 10) || 1;
      const word = stream.slice(i, i + len);
      html += `<span class="letter hit">${escapeHtml(word)}</span>`;
      i += len - 1;
    } else {
      html += `<span class="letter">${escapeHtml(stream[i])}</span>`;
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

  const counts = new Map();
  for (const c of candidates) {
    counts.set(c.word, (counts.get(c.word) || 0) + 1);
  }

  const sorted = [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || b.word.length - a.word.length)
    .slice(0, 20);

  let html = "<h3>Candidate words</h3>";
  for (const { word, count } of sorted) {
    html += `<div class="list-item"><strong>${escapeHtml(
      word
    )}</strong> · ${count}</div>`;
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
    )}</strong> · ${count}</div>`;
  }
  gateListEl.innerHTML = html;
}

// ---------- Engine execution ----------

function handleRunProgram() {
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

  const { regs, traceLines } = executeProgram(programLetters);

  renderTrace(traceLines);
  renderRegisters(regs);

  const stream     = registersToLetterStream(regs);
  const candidates = extractWordCandidates(stream, 3, 5);
  const gates      = computeGateFrequencies(stream);

  renderLetterStream(stream, candidates);
  renderWordList(candidates);
  renderGateList(gates);
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

// Wire PROGRAM UI
if (runButton) {
  runButton.addEventListener("click", handleRunProgram);
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
      handleRunProgram();
    }
  });
}

// Initial state
renderRegisters(null);
renderLetterStream("", []);
renderWordList([]);
renderGateList([]);

// ---------- GPT Chavruta wiring ----------

// Central brain on LuminaNexus.org.
// Change to "/.netlify/functions/ivritcode-gpt" if you move it local.
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

    const data        = await res.json();
    const code        = data.code || "";
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
  gptSendButton.addEventListener("click", askChavruta);
}
if (gptClearButton) {
  gptClearButton.addEventListener("click", clearChavruta);
}
if (gptInput) {
  gptInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      askChavruta();
    }
  });
}
