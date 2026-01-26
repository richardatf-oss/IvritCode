IvritCode Specification (v0.0)
1. Overview

IvritCode is a symbolic machine language in which:

Hebrew letters (א–ת) act as operators (instructions),

Hebrew letters (א–ת) also name registers (storage locations),

Niqqud (vowel points) act as instruction modifiers, and

A special register A represents Aleph-Olam, a hidden global register.

This document defines IvritCode v0.0, including the machine state, register layout, and the base (unmodified) semantics of each letter-operator.

Niqqud modifiers are specified separately and layer cleanly on top of this base instruction set.

2. Machine State
2.1 State Space

The IvritCode machine state is a fixed-length vector:

𝑆
∈
𝑅
23
S∈R
23

where 
𝑅
R is a ring (v0 reference implementation uses integers; future versions may use a finite field).

2.2 Registers

The 23 registers are named as follows:

Index	Name	Description
0–21	א–ת	One register per Hebrew letter
22	A	Aleph-Olam (hidden/global register)

The register named A is not a Hebrew letter; it is a distinguished global register used for aggregation, inspection, and seeding.

2.3 Working Quartet

In v0, several instructions operate specifically on the working quartet:

(
א
,
ב
,
ג
,
ד
)
(א,ב,ג,ד)

These correspond to registers:

א = primary input

ב = secondary input

ג = derived value

ד = derived value

All other registers remain unchanged unless explicitly stated.

3. Instructions
3.1 Instruction Structure

An instruction consists of:

A letter operator 
𝐿
∈
{
א
,
…
,
ת
}
L∈{א,…,ת}

Optional niqqud modifiers (not covered in this section)

This section defines the default (unmodified) semantics of each letter operator.

4. Letter Semantics (Base Forms)

Let the current machine state be:

𝑆
=
(
𝑟
א
,
𝑟
ב
,
…
,
𝑟
ת
,
𝑟
𝐴
)
S=(r
א
	​

,r
ב
	​

,…,r
ת
	​

,r
A
	​

)

For brevity below:

𝑎
=
𝑟
א
a=r
א
	​


𝑏
=
𝑟
ב
b=r
ב
	​


𝑔
=
𝑟
ג
g=r
ג
	​


𝑑
=
𝑟
ד
d=r
ד
	​


𝐴
𝑂
=
𝑟
𝐴
AO=r
A
	​


All registers not mentioned explicitly remain unchanged.

א — Alef (Identity)

Description: No-operation; establishes a frame.

𝛿
א
(
𝑆
)
=
𝑆
δ
א
	​

(S)=S
ב — Bet (Addition)

Description: Add Alef and Bet, store in Gimel.

𝑔
′
=
𝑎
+
𝑏
g
′
=a+b
ג — Gimel (Multiplication)

Description: Multiply Alef and Bet, store in Dalet.

𝑑
′
=
𝑎
⋅
𝑏
d
′
=a⋅b
ד — Dalet (Difference Pair)

Description: Compute forward and reverse differences.

𝑔
′
	
=
𝑏
−
𝑎


𝑑
′
	
=
𝑎
−
𝑏
g
′
d
′
	​

=b−a
=a−b
	​

ה — Hei (Sign of Alef)

Description: Store the sign of Alef in Hei.

ℎ
′
=
{
1
	
𝑎
>
0


0
	
𝑎
=
0


−
1
	
𝑎
<
0
h
′
=
⎩
⎨
⎧
	​

1
0
−1
	​

a>0
a=0
a<0
	​

ו — Vav (Swap)

Description: Swap Alef and Bet.

(
𝑎
′
,
𝑏
′
)
=
(
𝑏
,
𝑎
)
(a
′
,b
′
)=(b,a)
ז — Zayin (Increment)

Description: Increment Alef.

𝑎
′
=
𝑎
+
1
a
′
=a+1
ח — Chet (Decrement)

Description: Decrement Alef.

𝑎
′
=
𝑎
−
1
a
′
=a−1
ט — Tet (Square)

Description: Square Alef into Gimel.

𝑔
′
=
𝑎
2
g
′
=a
2
י — Yod (Load from Aleph-Olam)

Description: Load Aleph-Olam into Alef.

𝑎
′
=
𝐴
𝑂
a
′
=AO
כ — Kaf (Quartet Sum)

Description: Sum the working quartet into Aleph-Olam.

𝐴
𝑂
′
=
𝑎
+
𝑏
+
𝑔
+
𝑑
AO
′
=a+b+g+d
ל — Lamed (Global Sum)

Description: Sum all Hebrew letter registers into Aleph-Olam.

𝐴
𝑂
′
=
∑
𝑖
=
0
21
𝑟
𝑖
AO
′
=
i=0
∑
21
	​

r
i
	​

מ — Mem (Mean)

Description: Compute the integer mean of the working quartet into Gimel.

𝑔
′
=
⌊
𝑎
+
𝑏
+
𝑔
+
𝑑
4
⌋
g
′
=⌊
4
a+b+g+d
	​

⌋
נ — Nun (Negation)

Description: Negate Alef.

𝑎
′
=
−
𝑎
a
′
=−a
ס — Samekh (Cyclic Rotation)

Description: Rotate all 22 Hebrew registers cyclically.

𝑟
𝑖
′
=
𝑟
(
𝑖
−
1
)
 
m
o
d
 
22
r
i
′
	​

=r
(i−1)mod22
	​


Aleph-Olam is unchanged.

ע — Ayin (Dot Product)

Description: Dot product of the first and second halves of the alphabet.

Let:

𝑢
𝑖
=
𝑟
𝑖
u
i
	​

=r
i
	​

 for 
𝑖
=
0..10
i=0..10 (א–כ)

𝑣
𝑖
=
𝑟
𝑖
+
11
v
i
	​

=r
i+11
	​

 for 
𝑖
=
0..10
i=0..10 (ל–ת)

𝐴
𝑂
′
=
∑
𝑖
=
0
10
𝑢
𝑖
⋅
𝑣
𝑖
AO
′
=
i=0
∑
10
	​

u
i
	​

⋅v
i
	​

פ — Pe (Expose Alef)

Description: Copy Alef into Aleph-Olam.

𝐴
𝑂
′
=
𝑎
AO
′
=a
צ — Tsadi (Comparison)

Description: Compare Alef and Bet.

𝐴
𝑂
′
=
{
1
	
𝑎
>
𝑏


0
	
𝑎
=
𝑏


−
1
	
𝑎
<
𝑏
AO
′
=
⎩
⎨
⎧
	​

1
0
−1
	​

a>b
a=b
a<b
	​

ק — Qof (Mirror)

Description: Reverse all Hebrew registers.

𝑟
𝑖
′
=
𝑟
21
−
𝑖
r
i
′
	​

=r
21−i
	​


Aleph-Olam unchanged.

ר — Resh (Reseed Quartet)

Description: Reinitialize the working quartet from Aleph-Olam.

𝑎
′
	
=
𝐴
𝑂


𝑏
′
	
=
𝐴
𝑂
+
1


𝑔
′
	
=
𝐴
𝑂
+
2


𝑑
′
	
=
𝐴
𝑂
+
3
a
′
b
′
g
′
d
′
	​

=AO
=AO+1
=AO+2
=AO+3
	​

ש — Shin (Nonlinear Mix)

Description: Nonlinear transformation of the working quartet.

𝑎
′
	
=
𝑎
2
+
𝑏


𝑏
′
	
=
𝑏
2
+
𝑔


𝑔
′
	
=
𝑔
2
+
𝑑


𝑑
′
	
=
𝑑
2
+
𝑎
a
′
b
′
g
′
d
′
	​

=a
2
+b
=b
2
+g
=g
2
+d
=d
2
+a
	​

ת — Tav (Quartet Rotation)

Description: Rotate the working quartet.

(
𝑎
′
,
𝑏
′
,
𝑔
′
,
𝑑
′
)
=
(
𝑔
,
𝑑
,
𝑎
,
𝑏
)
(a
′
,b
′
,g
′
,d
′
)=(g,d,a,b)
5. Aleph-Olam (A)

A is not an operator in v0.

A is a persistent global register.

Many operators read from or write to A.

Future versions may define an explicit A instruction.

6. Niqqud Modifiers (Reserved)

Niqqud marks act as instruction modifiers (e.g. purity, immediates, scope).

This specification defines only the base letter semantics.
Modifier semantics are defined in a separate section.

7. Determinism

IvritCode v0 instructions are deterministic:

Identical initial states and identical instruction sequences always produce identical final states.

End of IvritCode v0.0 Core Specification
