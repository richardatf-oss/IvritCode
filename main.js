// main.js

// ---------- tokenizer & assembler ----------

function tokenize(source) {
  const lines = source.split(/\r?\n/);
  const tokens = [];

  for (const rawLine of lines) {
    const line = rawLine.split(";")[0].split("#")[0].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (!parts.length) continue;

    if (parts[0].endsWith(":")) {
      const name = parts[0].slice(0, -1);
      if (name) tokens.push({ kind: "label", name });
      if (parts.length > 1) {
        const op = parts[1].toUpperCase();
        const args = parts.slice(2);
        tokens.push({ kind: "instr", op, args });
      }
      continue;
    }

    const op = parts[0].toUpperCase();
    const args = parts.slice(1);
    tokens.push({ kind: "instr", op, args });
  }

  return tokens;
}

function assemble(source) {
  const tokens = tokenize(source);
  const program = [];
  const labels = new Map();

  // pass 1: labels
  let pc = 0;
  for (const tok of tokens) {
    if (tok.kind === "label") {
      labels.set(tok.name, pc);
    } else if (tok.kind === "instr") {
      pc++;
    }
  }

  // pass 2: instructions
  for (const tok of tokens) {
    if (tok.kind === "label") continue;

    const op = tok.op.toUpperCase();
    const args = tok.args;

    switch (op) {
      case "PUSH": {
        if (args.length !== 1) throw new Error("PUSH expects 1 argument");
        const value = parseFloat(args[0]);
        if (Number.isNaN(value)) throw new Error("PUSH expects numeric");
        program.push({ op, value });
        break;
      }
      case "ADD":
      case "SUB":
      case "MUL":
      case "DIV":
      case "OUT":
      case "MITZVAH":
      case "AVEIRAH":
      case "TICK":
      case "HALT":
        program.push({ op });
        break;
      case "JMP":
      case "JZ": {
        if (args.length !== 1) throw new Error(`${op} expects 1 label argument`);
        const label = args[0];
        const target = labels.get(label);
        if (target == null) throw new Error(`Unknown label: ${label}`);
        program.push({ op, target });
        break;
      }
      default:
        throw new Error(`Unknown opcode: ${op}`);
    }
  }

  return program;
}

// ---------- numeric VM ----------

function run(program, opts = {}) {
  const stack = [];
  const out = [];
  let ip = 0;
  let steps = 0;
  const maxSteps = opts.maxSteps ?? 100000;

  const pop = () => {
    if (!stack.length) throw new Error("Stack underflow");
    return stack.pop();
  };

  while (ip >= 0 && ip < program.length) {
    if (steps++ > maxSteps) throw new Error("Max steps exceeded");
    const ins = program[ip];

    switch (ins.op) {
      case "PUSH":
        stack.push(ins.value ?? 0);
        ip++;
        break;
      case "ADD": {
        const b = pop(), a = pop();
        stack.push(a + b);
        ip++;
        break;
      }
      case "SUB": {
        const b = pop(), a = pop();
        stack.push(a - b);
        ip++;
        break;
      }
      case "MUL": {
        const b = pop(), a = pop();
        stack.push(a * b);
        ip++;
        break;
      }
      case "DIV": {
        const b = pop(), a = pop();
        if (b === 0) throw new Error("Division by zero");
        stack.push(a / b);
        ip++;
        break;
      }
      case "OUT": {
        const v = pop();
        out.push(v);
        ip++;
        break;
      }
      case "JMP":
        ip = ins.target ?? ip + 1;
        break;
      case "JZ": {
        const v = pop();
        if (v === 0) ip = ins.target ?? ip + 1;
        else ip++;
        break;
      }
      case "MITZVAH":
      case "AVEIRAH":
      case "TICK":
        // no-op in numeric mode
        ip++;
        break;
      case "HALT":
        return out;
      default:
        throw new Error(`Unknown opcode: ${ins.op}`);
    }
  }

  return out;
}

// ---------- Ramchal VM ----------

function clamp01(x) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function isBechiraZone(clarity) {
  return clarity >= 0.25 && clarity <= 0.85;
}

function judgeChoice(ev) {
  if (!isBechiraZone(ev.clarityAtChoice)) {
    return {
      deltaMerit: 0,
      deltaDebt: 0,
      deltaClarity: 0,
      deltaLight: 0,
      deltaConcealment: 0
    };
  }

  if (ev.action === "mitzvah") {
    return {
      deltaMerit: +1,
      deltaDebt: 0,
      deltaClarity: +0.05,
      deltaLight: +0.1,
      deltaConcealment: -0.02
    };
  } else if (ev.action === "aveirah") {
    return {
      deltaMerit: 0,
      deltaDebt: +1,
      deltaClarity: -0.05,
      deltaLight: -0.05,
      deltaConcealment: +0.1
    };
  } else {
    return {
      deltaMerit: 0,
      deltaDebt: 0,
      deltaClarity: 0,
      deltaLight: 0,
      deltaConcealment: 0
    };
  }
}

function applyJudgment(soul, world, res) {
  const updatedSoul = {
    ...soul,
    merit: soul.merit + res.deltaMerit,
    debt: soul.debt + res.deltaDebt,
    clarity: clamp01(soul.clarity + res.deltaClarity)
  };

  const updatedWorld = {
    ...world,
    light: world.light + res.deltaLight,
    concealment: Math.max(0, world.concealment + res.deltaConcealment)
  };

  return { soul: updatedSoul, world: updatedWorld };
}

function advanceHistory(world) {
  const tick = world.tick + 1;
  let stage = world.stage;

  if (world.light > 100 && world.stage === "OlamHaZeh") {
    stage = "YemotHaMashiach";
  }
  if (world.light > 1000 && world.stage === "YemotHaMashiach") {
    stage = "OlamHaBa";
  }

  return { ...world, tick, stage };
}

function runRamchal(program, opts = {}) {
  const stack = [];
  const out = [];
  let ip = 0;
  let steps = 0;
  const maxSteps = opts.maxSteps ?? 100000;

  const pop = () => {
    if (!stack.length) throw new Error("Stack underflow");
    return stack.pop();
  };

  let world = {
    light: 0,
    concealment: 0,
    stage: "OlamHaZeh",
    tick: 0,
    ...(opts.initialWorld || {})
  };

  const souls = {};
  (opts.initialSouls || []).forEach((s) => {
    souls[s.id] = { ...s };
  });

  while (ip >= 0 && ip < program.length) {
    if (steps++ > maxSteps) throw new Error("Max steps exceeded");
    const ins = program[ip];

    switch (ins.op) {
      // numeric ops
      case "PUSH":
        stack.push(ins.value ?? 0);
        ip++;
        break;
      case "ADD": {
        const b = pop(), a = pop();
        stack.push(a + b);
        ip++;
        break;
      }
      case "SUB": {
        const b = pop(), a = pop();
        stack.push(a - b);
        ip++;
        break;
      }
      case "MUL": {
        const b = pop(), a = pop();
        stack.push(a * b);
        ip++;
        break;
      }
      case "DIV": {
        const b = pop(), a = pop();
        if (b === 0) throw new Error("Division by zero");
        stack.push(a / b);
        ip++;
        break;
      }
      case "OUT": {
        const v = pop();
        out.push(v);
        ip++;
        break;
      }
      case "JMP":
        ip = ins.target ?? ip + 1;
        break;
      case "JZ": {
        const v = pop();
        if (v === 0) ip = ins.target ?? ip + 1;
        else ip++;
        break;
      }
      // Ramchal ops: stack [soulId, clarity]
      case "MITZVAH": {
        const clarity = pop();
        const soulIdNum = pop();
        const soulId = String(soulIdNum);
        const soul = souls[soulId];
        if (!soul) throw new Error(`Unknown soul in MITZVAH: ${soulId}`);

        const ev = { soulId, action: "mitzvah", clarityAtChoice: clarity };
        const judgment = judgeChoice(ev);
        const updated = applyJudgment(soul, world, judgment);
        souls[soulId] = updated.soul;
        world = updated.world;
        ip++;
        break;
      }
      case "AVEIRAH": {
        const clarity = pop();
        const soulIdNum = pop();
        const soulId = String(soulIdNum);
        const soul = souls[soulId];
        if (!soul) throw new Error(`Unknown soul in AVEIRAH: ${soulId}`);

        const ev = { soulId, action: "aveirah", clarityAtChoice: clarity };
        const judgment = judgeChoice(ev);
        const updated = applyJudgment(soul, world, judgment);
        souls[soulId] = updated.soul;
        world = updated.world;
        ip++;
        break;
      }
      case "TICK":
        world = advanceHistory(world);
        ip++;
        break;
      case "HALT":
        return { out, world, souls };
      default:
        throw new Error(`Unknown opcode: ${ins.op}`);
    }
  }

  return { out, world, souls };
}

// ---------- UI wiring ----------

const defaultProgram = `; soul 1 does a mitzvah at clarity 0.6
PUSH 1
PUSH 0.6
MITZVAH
TICK

; same soul does an aveirah at clarity 0.6
PUSH 1
PUSH 0.6
AVEIRAH
TICK

HALT
`;

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error("Missing element #" + id);
  return el;
}

document.addEventListener("DOMContentLoaded", () => {
  const textarea = /** @type {HTMLTextAreaElement} */ ($("program-input"));
  const outputPanel = $("output-panel");
  const status = $("status");
  const modeToggle = $("mode-toggle");
  const btnRun = $("btn-run");
  const btnScroll = $("btn-scroll-playground");
  const heroTrace = $("hero-trace");
  const year = $("year");

  textarea.value = defaultProgram;
  year.textContent = String(new Date().getFullYear());

  btnScroll.addEventListener("click", () => {
    document.getElementById("playground")?.scrollIntoView({ behavior: "smooth" });
  });

  let mode = "numeric";

  modeToggle.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      modeToggle.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode || "numeric";
      status.textContent =
        "Mode: " + (mode === "numeric" ? "Numeric VM" : "Ramchal VM");
    });
  });

  btnRun.addEventListener("click", () => {
    const src = textarea.value;
    status.textContent = "Assembling…";
    status.style.color = "";

    try {
      const program = assemble(src);

      if (mode === "numeric") {
        const out = run(program);
        outputPanel.innerHTML =
          `<strong>Numeric VM output</strong>\n\n` +
          (out.length ? out.join(", ") : "(no values emitted with OUT)");
        heroTrace.textContent = "Numeric VM executed.\nOutput: " + out.join(", ");
      } else {
        const result = runRamchal(program, {
          initialSouls: [{ id: "1", freeWillLevel: 0.8, clarity: 0.5, merit: 0, debt: 0 }]
        });

        const world = result.world;
        const soul1 = result.souls["1"];

        const worldText =
          `stage: ${world.stage}\n` +
          `tick: ${world.tick}\n` +
          `light: ${world.light.toFixed(3)}\n` +
          `concealment: ${world.concealment.toFixed(3)}\n`;

        const soulText = soul1
          ? `soul 1 → merit=${soul1.merit}, debt=${soul1.debt}, clarity=${soul1.clarity.toFixed(
              3
            )}`
          : "no soul with id=1";

        outputPanel.innerHTML =
          `<strong>Ramchal VM state</strong>\n\n` + worldText + `\n` + soulText;
        heroTrace.textContent = `MITZVAH and AVEIRAH applied.\n` + worldText + soulText;
      }

      status.textContent = "Program finished.";
    } catch (err) {
      console.error(err);
      status.textContent = "Error: " + (err && err.message ? err.message : String(err));
      status.style.color = "var(--danger)";
      outputPanel.textContent =
        "Error while running program.\n\n" + (err && err.stack ? err.stack : String(err));
    }
  });
});
