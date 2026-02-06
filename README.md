# IvritCode Engine v1.0

IvritCode is a deterministic symbolic engine where the **22 Hebrew letters (א–ת)** act as **operators** over a **23-register state vector**, evolving entirely in **base 22**.

- Letters (א–ת) are **opcodes**
- Registers (א–ת, A) are **storage**
- Aleph-Olam `A` is a **distinguished global register**
- Niqqud and cantillation are reserved for **future modifiers and structure**

This repository contains the **web demo** and **core VM** for IvritCode v1.0.

---

## 1. Machine Model

### 1.1 Registers

The machine state is a fixed-length vector of 23 registers:

- `r[0]..r[21]` → Hebrew letters **א..ת**
- `r[22]`       → **A (Aleph-Olam)**, a global “hidden” register

We write the state as:

\[
R = (r_0,\dots,r_{21},A)
\]

### 1.2 Numeric Domain (Base 22)

All registers hold values in the finite ring:

\[
\mathbb{Z}_{22} = \{0,\dots,21\}
\]

- Every addition, subtraction, and multiplication is done **mod 22**
- After every operation, the result is reduced to `0..21`

You can think of each register as a **single base-22 digit**.  
Multi-digit base-22 numbers can be built from sequences of registers at a higher level.

---

## 2. Programs

An IvritCode program is just a string of Unicode text.

- Only the letters **א–ת** are executed as instructions.
- Niqqud (vowel marks), cantillation (trop), spaces, punctuation, and other characters are currently **ignored** by the core VM (v1.0).
- Future versions will treat niqqud as **instruction modifiers** and trop as **structural syntax**, but that is not wired in yet.

Example program:

```text
בראשית
