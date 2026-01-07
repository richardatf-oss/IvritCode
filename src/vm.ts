import { Instr } from "./assembler.js";

export type VMOptions = {
  trace?: boolean;
  maxSteps?: number;
};

export function run(program: Instr[], opts: VMOptions = {}): number[] {
  const stack: number[] = [];
  const out: number[] = [];
  let ip = 0;
  let steps = 0;
  const maxSteps = opts.maxSteps ?? 100_000;

  const pop = () => {
    if (stack.length === 0) throw new Error("Stack underflow");
    return stack.pop() as number;
  };

  while (ip >= 0 && ip < program.length) {
    if (steps++ > maxSteps) throw new Error("Max steps exceeded (possible infinite loop)");

    const ins = program[ip];
    if (opts.trace) {
      console.log(`ip=${ip} op=${ins.op} stack=[${stack.join(",")}]`);
    }

    switch (ins.op) {
      case "PUSH":
        stack.push(ins.value);
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
        stack.push(Math.trunc(a / b));
        ip++;
        break;
      }

      case "DUP": {
        const a = pop();
        stack.push(a, a);
        ip++;
        break;
      }

      case "SWAP": {
        const b = pop(), a = pop();
        stack.push(b, a);
        ip++;
        break;
      }

      case "DROP":
        pop();
        ip++;
        break;

      case "PRINT": {
        const a = pop();
        out.push(a);
        ip++;
        break;
      }

      case "JMP":
        ip = ip + 1 + ins.offset; // relative forward jump (v0)
        break;

      case "JZ": {
        const a = pop();
        ip = (a === 0) ? (ip + 1 + ins.offset) : (ip + 1);
        break;
      }

      case "HALT":
        return out;

      default:
        throw new Error(`Unknown instruction ${(ins as any).op}`);
    }
  }

  return out;
}
