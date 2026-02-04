# IvritCode — Full Language Specification  
## SPEC.md  
### Version 1.0 (Canonical)

> _“The letters act.  
> The breath shapes.  
> The melody decides when.”_

IvritCode is a symbolic machine language in which:

- Hebrew letters (א–ת) act as **operators (instructions)**,  
- Hebrew letters (א–ת) also name **registers (storage locations)**,  
- **Niqqud** (vowel points) act as **instruction modifiers**, and  
- A special register **A** represents **Aleph-Olam**, a hidden global register.

This document defines **IvritCode v1.0**, including:

1. Machine state and registers  
2. Base (unmodified) semantics of each letter-operator  
3. Niqqud (vowel) modifier semantics  
4. Trop (cantillation) structural and control-flow semantics  
5. The unified execution pipeline

---

## 1. Machine State

### 1.1 State Space

The IvritCode machine state is a fixed-length vector:

\[
S \in R^{23}
\]

where \(R\) is a ring (the reference implementation uses integers; future versions may use a finite field).

Write:

\[
S = (r_\text{א}, r_\text{ב}, \dots, r_\text{ת}, r_A)
\]

### 1.2 Registers

There are 23 registers:

- **22 letter registers**: one per Hebrew letter א–ת (indices 0–21)
- **1 global register**: A (index 22), Aleph-Olam

| Index | Name | Description                     |
|-------|------|---------------------------------|
| 0–21  | א–ת  | One register per Hebrew letter  |
| 22    | A    | Aleph-Olam (hidden/global)      |

The register named **A** is not a letter; it is a distinguished global register used for aggregation, inspection, and seeding.

All registers are mutable unless a modifier enforces purity for a given operation.

---

### 1.3 Roles (α, β, γ, δ)

To express base semantics cleanly, IvritCode uses **logical roles** instead of hard-wiring a “working quartet” forever:

- **α** — primary source
- **β** — secondary source
- **γ** — primary result
- **δ** — secondary result

A **role binding** maps roles to letter registers for each instruction:

\[
\text{bind} : \{\alpha, \beta, \gamma, \delta\} \to \{\text{א} \dots \text{ת}\}
\]

#### Default role binding

By default (with no addressing modifiers):

- α → א  
- β → ב  
- γ → ג  
- δ → ד  

This preserves the original “working quartet” behavior while allowing niqqud to rebind roles so that **any** register can serve as α, β, γ, δ.

We also denote:

- \(a = r_{\alpha}\)
- \(b = r_{\beta}\)
- \(g = r_{\gamma}\)
- \(d = r_{\delta}\)
- \(A_O = r_A\) (Aleph-Olam)

---

## 2. Instruction Structure

Each **instruction** in IvritCode is a single **letter with optional marks**:

- A base letter-operator \(L \in \{\text{א}, \dots, \text{ת}\}\)
- Zero or more **niqqud** marks attached to that letter
- Zero or more **trop** marks attached to that letter

Conceptually:

```text
Instruction = {
  base: Letter,          // א..ת
  niqqud: [NiqqudMark],  // vowel points and related marks
  trop: [TropMark],      // cantillation marks
  pos: SourceLocation    // (line/column) for debugging (optional)
}
