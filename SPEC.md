## 4. IvritCode v1.1 — 23-Wide Letter Semantics

This section defines an alternative, 23-wide semantics for each letter operator.

The machine state is:

- R = (r₀,…,r₂₁,A) ∈ ℤ²³
- r₀…r₂₁ correspond to registers א…ת
- A = r₂₂ is Aleph-Olam

Indices for the 22 letter registers wrap modulo 22:

- prev(i) = (i − 1 + 22) mod 22  
- next(i) = (i + 1) mod 22  

We also refer to:

- First half: indices 0..10 (א..כ)
- Second half: indices 11..21 (ל..ת)

Unless stated otherwise, A is unchanged by the operation.

Each instruction L ∈ {א,…,ת} transforms the state R deterministically into R′.

---

### א — Alef (Identity / Frame)

No-operation over the full state.

- For all i ∈ {0..21}: r′ᵢ = rᵢ  
- A′ = A  

---

### ב — Bet (Pairwise Addition, Halves)

Pairwise addition from first half into second half.

For each i ∈ {0..10}:

- r′ᵢ      = rᵢ
- r′ᵢ₊₁₁ = rᵢ₊₁₁ + rᵢ

A′ = A.

---

### ג — Gimel (Pairwise Multiplication, Halves)

Pairwise multiplication from first half into second half.

For each i ∈ {0..10}:

- r′ᵢ      = rᵢ
- r′ᵢ₊₁₁ = rᵢ₊₁₁ · rᵢ

A′ = A.

---

### ד — Dalet (Difference Pair, Halves)

Symmetric differences between paired registers of the two halves.

For each i ∈ {0..10}, let x = rᵢ, y = rᵢ₊₁₁:

- r′ᵢ      = y − x
- r′ᵢ₊₁₁ = x − y

A′ = A.

---

### ה — Hei (Sign Map)

Write the sign of every letter register; A collects the net sign.

For all i ∈ {0..21}:

- r′ᵢ = sign(rᵢ) where  
  sign(x) = 1 if x > 0, 0 if x = 0, −1 if x < 0

A′ = ∑ᵢ r′ᵢ.

---

### ו — Vav (Swap Halves)

Swap each first-half register with its partner in the second half.

For each i ∈ {0..10}:

- swap rᵢ ↔ rᵢ₊₁₁

A′ = A.

---

### ז — Zayin (Increment All Letters)

Increment every letter register by 1.

For all i ∈ {0..21}:

- r′ᵢ = rᵢ + 1

A′ = A + 22 (the total increase in the sum of letters).

---

### ח — Chet (Decrement All Letters)

Decrement every letter register by 1.

For all i ∈ {0..21}:

- r′ᵢ = rᵢ − 1

A′ = A − 22.

---

### ט — Tet (Square All Letters)

Square each letter register; A records the total squared “energy”.

For all i ∈ {0..21}:

- r′ᵢ = rᵢ²

A′ = ∑ᵢ r′ᵢ.

---

### י — Yod (Broadcast Aleph-Olam)

Broadcast A into all letter registers.

For all i ∈ {0..21}:

- r′ᵢ = A

A′ = A.

---

### כ — Kaf (Sliding Window Sum of 4)

Each register absorbs a windowed sum over itself and the next three letters (indices modulo 22).

Let window(i) = {i, i+1, i+2, i+3} (mod 22). For all i ∈ {0..21}:

- r′ᵢ = rᵢ + rₙₑₓₜ(ᵢ) + rₙₑₓₜ(ₙₑₓₜ(ᵢ)) + rₙₑₓₜ(ₙₑₓₜ(ₙₑₓₜ(ᵢ)))

A′ = A.

---

### ל — Lamed (Global Sum & Recentering)

Compute sum S and mean μ of the 22 letter registers.

- S = ∑ᵢ rᵢ  
- μ = ⌊S / 22⌋  

Then:

- A′ = S
- For all i ∈ {0..21}: r′ᵢ = rᵢ − μ

Thus the letters are recentered around their mean.

---

### מ — Mem (Moving Average)

Apply a 3-point moving average over the alphabet.

For all i ∈ {0..21}:

- r′ᵢ = ⌊(rₚᵣₑᵥ(ᵢ) + rᵢ + rₙₑₓₜ(ᵢ)) / 3⌋

A′ = ⌊(∑ᵢ r′ᵢ) / 22⌋ (average of the smoothed letters).

---

### נ — Nun (Global Negation)

Negate all letter registers and A.

For all i ∈ {0..21}:

- r′ᵢ = −rᵢ

A′ = −A.

---

### ס — Samekh (Rotation by A)

Rotate the alphabet by A steps.

Let k = A mod 22 (normalized into 0..21). For all i ∈ {0..21}:

- r′ᵢ = r[(i − k + 22) mod 22]

A′ = A.

---

### ע — Ayin (Correlation Between Halves)

Measure alignment between first and second halves under circular shifts.

First, define the dot product at shift s ∈ {0..10}:

- Cₛ = ∑_{i=0}^{10} r[i] · r[(i + 11 + s) mod 22]

Then:

- A′ = maxₛ Cₛ
- For all i ∈ {0..21}: r′ᵢ = rᵢ

Letters are unchanged; A stores the maximum correlation.

---

### פ — Pe (Expose Alef Locally and Globally)

Copy Alef’s register into A and into its immediate neighbors.

Let Alef be index 0:

- A′ = r₀
- r′₀  = r₀          (unchanged)
- r′₁  = r₁  + r₀   (Bet receives from Alef)
- r′₂₁ = r₂₁ + r₀   (Tav receives from Alef)
- All other r′ᵢ = rᵢ

---

### צ — Tsadi (Compare Halves and Push Extremes)

Compare total weight of first and second halves.

- S₁ = ∑_{i=0}^{10} rᵢ  
- S₂ = ∑_{i=11}^{21} rᵢ  

Set:

- A′ =  1 if S₁ > S₂  
- A′ =  0 if S₁ = S₂  
- A′ = −1 if S₁ < S₂  

Additionally:

- If S₁ > S₂:
  - let m = max_{i=0..10} rᵢ; set r′₀ = m (expose first-half max at Alef).
- If S₁ < S₂:
  - let m = max_{i=11..21} rᵢ; set r′₂₁ = m (expose second-half max at Tav).

All other unchanged r′ᵢ = rᵢ.

---

### ק — Qof (Mirror & Tilt)

Mirror the 22 letter registers and add a small index-based tilt.

For all i ∈ {0..21}:

- r′ᵢ = r₂₁₋ᵢ + i

A′ = A.

---

### ר — Resh (Reseed from Aleph-Olam with Stride)

Reseed all letters from A with a configurable stride taken from Bet.

Let stride s = r₁ if r₁ ≠ 0, otherwise s = 1.

For all i ∈ {0..21}:

- r′ᵢ = A + i · s

A′ = A.

---

### ש — Shin (Nonlinear Mix Over Alphabet)

Apply the classical quartet-mix pattern blockwise across the alphabet.

For each block of 4 indices (i, i+1, i+2, i+3), stepped by 4
(e.g. 0,4,8,12,16,20; indices taken modulo 22), let:

- a = rᵢ
- b = rᵢ₊₁
- g = rᵢ₊₂
- d = rᵢ₊₃

Then:

- r′ᵢ     = a² + b
- r′ᵢ₊₁ = b² + g
- r′ᵢ₊₂ = g² + d
- r′ᵢ₊₃ = d² + a

After processing all blocks:

- A′ = max_{i} |r′ᵢ|

---

### ת — Tav (Quartet Rotation Over Alphabet)

Rotate each block of 4 registers in quartet fashion.

For each block of 4 indices (i, i+1, i+2, i+3), stepped by 4 (mod 22):

- (r′ᵢ, r′ᵢ₊₁, r′ᵢ₊₂, r′ᵢ₊₃) = (rᵢ₊₂, rᵢ₊₃, rᵢ, rᵢ₊₁)

A′ = A.
