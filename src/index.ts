// src/index.ts
import { assemble } from "./assembler.js";
import { run, runRamchal, type Soul } from "./vm.js";

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

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

document.addEventListener("DOMContentLoaded", () => {
  const textarea = $("program-input") as HTMLTextAreaElement;
  const outputPanel = $("output-panel");
  const status = $("status");
  const modeToggle = $("mode-toggle");
  const btnRun = $("btn-run");
  const btnScroll = $("btn-scroll-playground");
  const heroTrace = $("hero-trace");
  const year = $("year");

  textarea.value = defaultProgram;
  year.textContent = new Date().getFullYear().toString();

  // scroll button
  btnScroll.addEventListener("click", () => {
    document.getElementById("playground")?.scrollIntoView({ behavior: "smooth" });
  });

  // mode toggle
  let mode: "numeric" | "ramchal" = "numeric";
  modeToggle.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      modeToggle.querySelectorAll<HTMLButtonElement>("button").forEach((b) =>
        b.classList.remove("active")
      );
      btn.classList.add("active");
      mode = (btn.dataset.mode as "numeric" | "ramchal") ?? "numeric";
      status.textContent = `Mode: ${mode === "numeric" ? "Numeric VM" : "Ramchal VM"}`;
    });
  });

  // run button
  btnRun.addEventListener("click", () => {
    const src = textarea.value;
    status.textContent = "Assembling…";
    status.style.color = "";

    try {
      const program = assemble(src);

      if (mode === "numeric") {
        const out = run(program, { trace: false });
        outputPanel.innerHTML =
          `<strong>Numeric VM output</strong>\n\n` +
          (out.length ? out.join(", ") : "(no values emitted with OUT)");
      } else {
        const initialSouls: Soul[] = [
          { id: "1", freeWillLevel: 0.8, clarity: 0.5, merit: 0, debt: 0 },
        ];

        const traceLines: string[] = [];
        const programWithTrace = program.map((ins, idx) => ({
          ...ins,
          _index: idx,
        })) as any[];

        // quick hack: runRamchal already has an internal trace option; if you
        // want a custom trace, you can instrument vm.ts later. For now we just run:
        const result = runRamchal(programWithTrace as any, {
          trace: true,
          initialSouls,
        });

        const world = result.world;
        const soul1 = result.souls["1"];

        const worldText =
          `stage: ${world.stage}\n` +
          `tick: ${world.tick}\n` +
          `light: ${world.light.toFixed(3)}\n` +
          `concealment: ${world.concealment.toFixed(3)}\n`;

        const soulText = soul1
          ? `soul 1 → merit=${soul1.merit}, debt=${soul1.debt}, clarity=${soul1.clarity.toFixed(3)}`
          : "no soul with id=1";

        outputPanel.innerHTML =
          `<strong>Ramchal VM state</strong>\n\n` +
          worldText +
          `\n` +
          soulText;

        // keep hero trace simple for now – just mirror the output area header
        heroTrace.textContent = `MITZVAH and AVEIRAH applied.\n` + worldText + soulText;
      }

      status.textContent = "Program finished.";
    } catch (err: any) {
      console.error(err);
      status.textContent = "Error: " + (err?.message ?? String(err));
      (status as HTMLElement).style.color = "var(--danger)";
      outputPanel.textContent = "Error while running program.\n\n" + (err?.stack ?? String(err));
    }
  });
});
