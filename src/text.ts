/** Text analysis helpers. Everything here is pure and works offline. */

const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc", "e.g", "i.e", "fig", "no", "al",
]);

export function words(text: string): string[] {
  return text.match(/[A-Za-z0-9]+(?:['’][A-Za-z]+)*(?:-[A-Za-z0-9]+)*/g) ?? [];
}

/** Whitespace separated word count, which is how word processors count. */
export function wordCount(text: string): number {
  const t = text.trim();
  return t === "" ? 0 : t.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

export function splitSentences(text: string): string[] {
  const out: string[] = [];
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return out;
  let start = 0;
  const re = /[.!?]+["'”’)\]]*\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(flat))) {
    const end = m.index + m[0].length;
    const before = flat.slice(start, m.index + 1);
    const lastWord = (before.match(/([A-Za-z.]+)\.$/)?.[1] ?? "").toLowerCase().replace(/\.$/, "");
    const next = flat[end] ?? "";
    const isAbbrev = m[0].startsWith(".") && ABBREVIATIONS.has(lastWord);
    const isInitial = /(^|\s)[A-Z]\.$/.test(before.trim());
    if (isAbbrev || isInitial || (m[0].startsWith(".") && /[a-z]/.test(next))) continue;
    out.push(flat.slice(start, end).trim());
    start = end;
  }
  const rest = flat.slice(start).trim();
  if (rest) out.push(rest);
  return out.filter((s) => /[A-Za-z0-9]/.test(s));
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter((p) => /[A-Za-z0-9]/.test(p));
}

export function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export const round = (n: number, places = 1): number => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

/** Words per page for double and single spacing at common fonts and sizes. */
const FONT_WORDS_PER_PAGE: Record<string, number> = {
  "times new roman": 550,
  arial: 500,
  calibri: 520,
  georgia: 480,
  "courier new": 400,
  verdana: 430,
};

export const FONTS = Object.keys(FONT_WORDS_PER_PAGE);

export function pageEstimate(
  wordTotal: number,
  font: string,
  fontSize: number,
  spacing: "single" | "1.5" | "double",
): number {
  const base = FONT_WORDS_PER_PAGE[font.trim().toLowerCase()];
  if (base === undefined) {
    throw new Error(`Unknown font "${font}". Use one of: ${FONTS.join(", ")}.`);
  }
  const sizeFactor = 12 / fontSize;
  const spacingFactor = spacing === "single" ? 1 : spacing === "1.5" ? 1 / 1.5 : 0.5;
  const perPage = base * sizeFactor * sizeFactor * spacingFactor;
  return wordTotal / perPage;
}

export interface Counts {
  words: number;
  sentences: number;
  syllables: number;
  complexWords: number;
  polysyllables: number;
}

export function counts(text: string): Counts {
  const ws = words(text);
  let syl = 0;
  let complex = 0;
  for (const w of ws) {
    const s = syllables(w);
    syl += s;
    if (s >= 3) complex += 1;
  }
  return {
    words: ws.length,
    sentences: splitSentences(text).length,
    syllables: syl,
    complexWords: complex,
    polysyllables: complex,
  };
}

const IRREGULAR_PARTICIPLES = new Set([
  "done", "made", "given", "taken", "seen", "known", "shown", "written", "chosen", "found", "held",
  "built", "sent", "kept", "left", "lost", "paid", "read", "said", "sold", "told", "thought",
  "brought", "caught", "taught", "bought", "begun", "broken", "driven", "eaten", "fallen", "forgotten",
  "gotten", "grown", "hidden", "ridden", "spoken", "stolen", "thrown", "worn", "won", "set", "put",
  "cut", "hit", "let", "led", "met", "understood", "drawn", "born", "run", "become", "gone",
]);

const NOT_PARTICIPLES = new Set([
  "need", "indeed", "speed", "feed", "seed", "red", "bed", "hundred", "embed",
  // Adjectives that look like participles and usually describe a state.
  "tired", "excited", "interested", "worried", "bored", "scared", "surprised", "pleased", "concerned",
  "confused", "relaxed", "exhausted", "satisfied", "disappointed", "amazed", "shocked", "annoyed",
  "supposed", "used", "married", "prepared", "ashamed", "afraid", "determined", "talented", "advanced",
]);

export interface PassiveHit {
  sentence: string;
  phrase: string;
}

export function findPassive(sentences: string[]): PassiveHit[] {
  const hits: PassiveHit[] = [];
  const re = /\b(am|is|are|was|were|be|been|being)\s+(?:(?:not|also|often|always|never|already|still|just|really|then|even|first|later|usually|generally)\s+)*([a-z]+)\b/gi;
  for (const s of sentences) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      const part = m[2].toLowerCase();
      if (NOT_PARTICIPLES.has(part)) continue;
      const regular = part.length > 3 && part.endsWith("ed");
      if (regular || IRREGULAR_PARTICIPLES.has(part)) {
        hits.push({ sentence: s, phrase: m[0] });
        break;
      }
    }
  }
  return hits;
}

const FILLER_WORDS = [
  "very", "really", "just", "quite", "actually", "basically", "literally", "totally", "simply",
  "rather", "somewhat", "definitely", "extremely", "certainly", "essentially", "virtually",
];
const FILLER_PHRASES = [
  "in order to", "due to the fact that", "at the end of the day", "it is important to note that",
  "in my opinion", "a lot of", "kind of", "sort of", "needless to say", "for all intents and purposes",
  "the fact that", "in the event that", "at this point in time",
];

export interface FillerHit {
  text: string;
  count: number;
}

export function findFiller(text: string): FillerHit[] {
  const lower = text.toLowerCase();
  const found: FillerHit[] = [];
  for (const item of [...FILLER_PHRASES, ...FILLER_WORDS]) {
    const re = new RegExp(`\\b${item.replace(/ /g, "\\s+")}\\b`, "g");
    const n = (lower.match(re) ?? []).length;
    if (n > 0) found.push({ text: item, count: n });
  }
  return found.sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
}

export interface OpenerHit {
  word: string;
  count: number;
  sentences: number[];
}

/** Words that start 3 or more sentences, or 2 or more in a row. */
export function findRepeatedOpeners(sentences: string[], minRun = 2): OpenerHit[] {
  const openers = sentences.map((s) => (words(s)[0] ?? "").toLowerCase());
  const byWord = new Map<string, number[]>();
  openers.forEach((w, i) => {
    if (!w) return;
    byWord.set(w, [...(byWord.get(w) ?? []), i + 1]);
  });
  const hits: OpenerHit[] = [];
  for (const [word, idx] of byWord) {
    let run = 1;
    let longest = 1;
    for (let i = 1; i < idx.length; i++) {
      run = idx[i] === idx[i - 1] + 1 ? run + 1 : 1;
      longest = Math.max(longest, run);
    }
    if (idx.length >= 3 || longest >= minRun) hits.push({ word, count: idx.length, sentences: idx });
  }
  return hits.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

/**
 * Cuts out a references section (everything from a heading such as "References",
 * "Works Cited" or "Bibliography" on its own line) and returns what is left.
 */
export function stripReferences(text: string): { body: string; removed: string } {
  const re = /^[ \t]*(references|works cited|bibliography|reference list|sources)[ \t]*:?[ \t]*$/im;
  const m = re.exec(text);
  if (!m) return { body: text, removed: "" };
  return { body: text.slice(0, m.index), removed: text.slice(m.index) };
}

/** Removes quoted passages: block quotes starting with ">" and text inside double quotes. */
export function stripQuotes(text: string): { body: string; removed: string } {
  const removed: string[] = [];
  let body = text.replace(/^[ \t]*>.*$/gm, (m) => {
    removed.push(m);
    return "";
  });
  body = body.replace(/["“]([^"“”\n]{2,}?)["”]/g, (m) => {
    removed.push(m);
    return " ";
  });
  return { body, removed: removed.join("\n") };
}

const COMMON_WORDS = new Set(
  "a about after all also an and any are as at be because been but by can could did do does for from had has have he her his how i if in into is it its may more most my no not of on one or our out she so some than that the their them then there these they this to up was we were what when which who will with would you your".split(" "),
);

export interface FrequencyHit {
  word: string;
  count: number;
  percent: number;
}

/** Counts how often each word is used, ignoring case. Common small words are skipped unless asked for. */
export function wordFrequency(
  text: string,
  includeCommon = false,
): { total: number; unique: number; hits: FrequencyHit[] } {
  const all = words(text).map((w) => w.toLowerCase().replace(/['’]s$/, ""));
  const counted = new Map<string, number>();
  for (const w of all) {
    if (!includeCommon && (COMMON_WORDS.has(w) || w.length < 3)) continue;
    counted.set(w, (counted.get(w) ?? 0) + 1);
  }
  const hits = [...counted.entries()]
    .map(([word, count]) => ({ word, count, percent: round((count / all.length) * 100, 2) }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
  return { total: all.length, unique: new Set(all).size, hits };
}

export function sentenceLengths(sentences: string[]): number[] {
  return sentences.map((s) => wordCount(s));
}
