export type Token = {
  base: string;      // Hebrew letter
  marks: string[];   // niqqud + cantillation marks collected
  raw: string;       // base + marks in original order
  index: number;     // token index in stream
};

const isHebrewLetter = (cp: string) => cp >= "\u05D0" && cp <= "\u05EA";

// Niqqud + cantillation roughly live in these ranges
const isHebrewMark = (cp: string) =>
  (cp >= "\u0591" && cp <= "\u05BD") || // cantillation + some points
  cp === "\u05BF" ||                    // rafe
  (cp >= "\u05C1" && cp <= "\u05C7");   // shin/sin dots + niqqud

export function tokenize(source: string): Token[] {
  // NFD splits letters + combining marks so we can parse reliably
  const s = source.normalize("NFD");
  const tokens: Token[] = [];

  let i = 0;
  let tIndex = 0;

  while (i < s.length) {
    const ch = s[i];

    // Skip whitespace and common punctuation
    if (/\s/.test(ch) || /[.,;:!?"'()[\]{}<>|\\/]/.test(ch)) {
      i++;
      continue;
    }

    // Ignore unknown chars in v0
    if (!isHebrewLetter(ch)) {
      i++;
      continue;
    }

    const base = ch;
    const marks: string[] = [];
    let raw = base;
    i++;

    while (i < s.length && isHebrewMark(s[i])) {
      marks.push(s[i]);
      raw += s[i];
      i++;
    }

    tokens.push({ base, marks, raw, index: tIndex++ });
  }

  return tokens;
}
