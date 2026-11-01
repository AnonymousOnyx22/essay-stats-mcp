import { z } from "zod";
import type { ToolDef } from "./core/tools.js";
import {
  counts,
  findFiller,
  findPassive,
  findRepeatedOpeners,
  pageEstimate,
  round,
  sentenceLengths,
  splitParagraphs,
  splitSentences,
  stripQuotes,
  stripReferences,
  wordCount,
  wordFrequency,
} from "./text.js";

const EMPTY_TEXT_HINT = `text is empty. Paste the essay text to analyse. Worked example: { "text": "Your essay content here." }`;

const textInput = z.string().min(1, EMPTY_TEXT_HINT);

function requireText(text: string, toolName: string): void {
  if (!/[A-Za-z0-9]/.test(text)) {
    const examples: Record<string, string> = {
      check_word_limit: `{ "text": "Your essay content here.", "limit": 1500, "exclude_references": true }`,
      word_frequency: `{ "text": "Your essay content here.", "top": 10, "min_count": 2 }`,
      style_flags: `{ "text": "Your essay content here.", "max_sentence_words": 30 }`,
      sentence_variety: `{ "text": "Your essay content here." }`,
    };
    const example = examples[toolName] ?? `{ "text": "Your essay content here." }`;
    throw new Error(
      `The text has no words in it. Paste the essay text and try again. Worked example for ${toolName}: ${example}`,
    );
  }
}

const countText: ToolDef = {
  name: "count_text",
  title: "Count words, sentences and pages",
  description:
    "Count the words, characters, sentences and paragraphs in a text, and estimate how many pages it fills at a given font, font size and line spacing. Inputs: text, and optional font (times new roman, arial, calibri, georgia, courier new or verdana, default times new roman), font_size in points (default 12) and spacing (single, 1.5 or double, default double). The page count is an estimate from typical words per page, so a word processor may differ by a little. Also returns an estimated reading time at 238 words per minute. Example: \"Count the words in this essay and estimate the pages in Times New Roman 12 double spaced.\"",
  inputSchema: {
    text: textInput,
    font: z.string().optional().describe("Font name. Default times new roman."),
    font_size: z.number().min(6).max(72).optional().describe("Font size in points. Default 12."),
    spacing: z.enum(["single", "1.5", "double"]).optional().describe("Line spacing. Default double."),
  },
  outputSchema: {
    words: z.number(),
    characters: z.number(),
    characters_no_spaces: z.number(),
    sentences: z.number(),
    paragraphs: z.number(),
    estimated_pages: z.number(),
    font: z.string(),
    font_size: z.number(),
    spacing: z.string(),
    reading_minutes: z.number(),
  },
  run: ({ text, font = "times new roman", font_size = 12, spacing = "double" }) => {
    requireText(text, "count_text");
    const w = wordCount(text);
    const pages = round(pageEstimate(w, font, font_size, spacing), 1);
    const minutes = round(w / 238, 1);
    const result = {
      words: w,
      characters: text.length,
      characters_no_spaces: text.replace(/\s/g, "").length,
      sentences: splitSentences(text).length,
      paragraphs: splitParagraphs(text).length,
      estimated_pages: pages,
      font: font.trim().toLowerCase(),
      font_size,
      spacing,
      reading_minutes: minutes,
    };
    return {
      text: `${w} words, ${result.characters} characters (${result.characters_no_spaces} without spaces), ${result.sentences} sentences and ${result.paragraphs} paragraphs. About ${pages} pages in ${result.font} ${font_size} point with ${spacing} spacing. Reading time is about ${minutes} minutes.`,
      structured: result,
    };
  },
};

function fleschLabel(score: number): string {
  if (score >= 90) return "very easy";
  if (score >= 80) return "easy";
  if (score >= 70) return "fairly easy";
  if (score >= 60) return "plain English";
  if (score >= 50) return "fairly hard";
  if (score >= 30) return "hard";
  return "very hard";
}

const readabilityScores: ToolDef = {
  name: "readability_scores",
  title: "Readability scores",
  description:
    "Score how hard a text is to read with three standard formulas: Flesch Kincaid grade level (plus the Flesch reading ease score), Gunning Fog index and SMOG index. Each grade is roughly a US school grade, so 12 is the end of high school and 16 is a college degree. Input: text. SMOG is built for samples of 30 sentences or more, so on shorter text the tool still returns a number but marks it as less reliable. Example: \"Give me the Flesch Kincaid, Gunning Fog and SMOG scores for this paper.\"",
  inputSchema: { text: textInput },
  outputSchema: {
    words: z.number(),
    sentences: z.number(),
    syllables: z.number(),
    complex_words: z.number(),
    flesch_kincaid_grade: z.number(),
    flesch_reading_ease: z.number(),
    reading_ease_label: z.string(),
    gunning_fog: z.number(),
    smog: z.number(),
    smog_reliable: z.boolean(),
  },
  run: ({ text }) => {
    requireText(text, "readability_scores");
    const c = counts(text);
    if (c.words === 0 || c.sentences === 0) {
      throw new Error("The text needs at least one word and one sentence to score.");
    }
    const wps = c.words / c.sentences;
    const spw = c.syllables / c.words;
    const fk = 0.39 * wps + 11.8 * spw - 15.59;
    const ease = 206.835 - 1.015 * wps - 84.6 * spw;
    const fog = 0.4 * (wps + 100 * (c.complexWords / c.words));
    const smog = 1.043 * Math.sqrt(c.polysyllables * (30 / c.sentences)) + 3.1291;
    const reliable = c.sentences >= 30;
    const result = {
      words: c.words,
      sentences: c.sentences,
      syllables: c.syllables,
      complex_words: c.complexWords,
      flesch_kincaid_grade: round(fk),
      flesch_reading_ease: round(ease),
      reading_ease_label: fleschLabel(ease),
      gunning_fog: round(fog),
      smog: round(smog),
      smog_reliable: reliable,
    };
    return {
      text: `Flesch Kincaid grade ${result.flesch_kincaid_grade} (reading ease ${result.flesch_reading_ease}, ${result.reading_ease_label}). Gunning Fog ${result.gunning_fog}. SMOG ${result.smog}${reliable ? "" : ", less reliable because the text has fewer than 30 sentences"}. Based on ${c.words} words, ${c.sentences} sentences and ${c.complexWords} complex words.`,
      structured: result,
    };
  },
};

const styleFlags: ToolDef = {
  name: "style_flags",
  title: "Style flags",
  description:
    "Flag common style problems in an essay: sentences in the passive voice, sentences that start with the same word as a neighbour (or three or more times), filler words and phrases such as very, just, in order to, and sentences that are too long. Inputs: text, and optional max_sentence_words (default 30), the length above which a sentence counts as long. Sentence numbers start at 1 and follow the order of the text, so number 3 is the third sentence. The sentence_list field gives each passive or long sentence with its number, and the text summary ends with a line listing those numbers. The checks are simple pattern rules, so treat them as prompts to reread, not as errors. Example: \"Flag passive voice and filler words in my draft.\"",
  inputSchema: {
    text: textInput,
    max_sentence_words: z.number().int().min(5).max(200).optional().describe("Sentence length that counts as long. Default 30."),
  },
  outputSchema: {
    sentences: z.number(),
    passive_count: z.number(),
    passive_sentences: z.array(z.object({ phrase: z.string(), sentence: z.string() })),
    repeated_openers: z.array(z.object({ word: z.string(), count: z.number(), sentences: z.array(z.number()) })),
    filler: z.array(z.object({ text: z.string(), count: z.number() })),
    filler_count: z.number(),
    long_sentences: z.array(z.object({ number: z.number(), words: z.number(), sentence: z.string() })),
    max_sentence_words: z.number(),
    sentence_list: z.array(z.object({ number: z.number(), passive: z.boolean(), long: z.boolean(), sentence: z.string() })),
  },
  run: ({ text, max_sentence_words = 30 }) => {
    requireText(text, "style_flags");
    const sentences = splitSentences(text);
    const passive = findPassive(sentences);
    const openers = findRepeatedOpeners(sentences);
    const filler = findFiller(text);
    const long = sentences
      .map((s, i) => ({ number: i + 1, words: wordCount(s), sentence: s }))
      .filter((s) => s.words > max_sentence_words);
    const fillerCount = filler.reduce((n, f) => n + f.count, 0);
    let next = 0;
    const longNumbers = new Set(long.map((l) => l.number));
    const sentenceList = sentences
      .map((s, i) => {
        const isPassive = next < passive.length && passive[next].sentence === s;
        if (isPassive) next++;
        return { number: i + 1, passive: isPassive, long: longNumbers.has(i + 1), sentence: s };
      })
      .filter((s) => s.passive || s.long);
    const lines = [
      `${sentences.length} sentences checked.`,
      `Passive voice: ${passive.length}${passive.length ? " (" + passive.slice(0, 3).map((p) => `"${p.phrase}"`).join(", ") + (passive.length > 3 ? ", ..." : "") + ")" : ""}.`,
      `Repeated openers: ${openers.length ? openers.map((o) => `"${o.word}" x${o.count}`).join(", ") : "none"}.`,
      `Filler: ${fillerCount ? filler.map((f) => `"${f.text}" x${f.count}`).join(", ") : "none"}.`,
      `Long sentences over ${max_sentence_words} words: ${long.length ? long.map((l) => `#${l.number} (${l.words} words)`).join(", ") : "none"}.`,
      `Passive or long sentence numbers, in text order: ${sentenceList.length ? sentenceList.map((s) => s.number).join(", ") : "none"}.`,
    ];
    return {
      text: lines.join("\n"),
      structured: {
        sentences: sentences.length,
        passive_count: passive.length,
        passive_sentences: passive.map((p) => ({ phrase: p.phrase, sentence: p.sentence })),
        repeated_openers: openers,
        filler,
        filler_count: fillerCount,
        long_sentences: long,
        max_sentence_words,
        sentence_list: sentenceList,
      },
    };
  },
};

const checkWordLimit: ToolDef = {
  name: "check_word_limit",
  title: "Check a word limit",
  description:
    "Compare an essay against a word limit. Inputs: text, limit (the maximum word count), optional minimum (a lower bound), optional tolerance_percent (how far over the limit is still acceptable, default 0, a common rule is 10), optional exclude_references (cut everything from a heading line such as References, Works Cited or Bibliography to the end) and optional exclude_quotes (leave out block quotes that start with > and text inside double quotes). Returns the counted words, how many are left or over, and what was excluded. Example: \"Is this under 2000 words if I leave out the works cited and quotes?\"",
  inputSchema: {
    text: textInput,
    limit: z.number().int().positive().describe("Maximum number of words."),
    minimum: z.number().int().min(0).optional().describe("Minimum number of words."),
    tolerance_percent: z.number().min(0).max(100).optional().describe("Percent over the limit that is still fine. Default 0."),
    exclude_references: z.boolean().optional().describe("Leave out the references section. Default false."),
    exclude_quotes: z.boolean().optional().describe("Leave out quoted passages. Default false."),
  },
  outputSchema: {
    status: z.enum(["under_minimum", "within_limit", "within_tolerance", "over_limit"]),
    total_words: z.number(),
    counted_words: z.number(),
    excluded_reference_words: z.number(),
    excluded_quote_words: z.number(),
    limit: z.number(),
    minimum: z.number().nullable(),
    allowed_maximum: z.number(),
    words_remaining: z.number(),
    words_over: z.number(),
  },
  run: ({ text, limit, minimum, tolerance_percent = 0, exclude_references = false, exclude_quotes = false }) => {
    requireText(text, "check_word_limit");
    if (minimum !== undefined && minimum > limit) {
      throw new Error(`minimum (${minimum}) is above limit (${limit}). Set minimum to at most the limit. Worked example: { "text": "Your essay content here.", "limit": 1500, "minimum": 1200 }`);
    }
    const total = wordCount(text);
    let body = text;
    let refWords = 0;
    let quoteWords = 0;
    if (exclude_references) {
      const r = stripReferences(body);
      body = r.body;
      refWords = wordCount(r.removed);
    }
    if (exclude_quotes) {
      const q = stripQuotes(body);
      body = q.body;
      quoteWords = wordCount(q.removed);
    }
    const counted = wordCount(body);
    const allowed = Math.floor(limit * (1 + tolerance_percent / 100));
    let status: "under_minimum" | "within_limit" | "within_tolerance" | "over_limit";
    if (minimum !== undefined && counted < minimum) status = "under_minimum";
    else if (counted <= limit) status = "within_limit";
    else if (counted <= allowed) status = "within_tolerance";
    else status = "over_limit";
    const remaining = Math.max(0, limit - counted);
    const over = Math.max(0, counted - limit);
    const summary: Record<typeof status, string> = {
      under_minimum: `Under the minimum. ${counted} words counted, ${minimum! - counted} short of ${minimum}.`,
      within_limit: `Within the limit. ${counted} of ${limit} words, ${remaining} left.`,
      within_tolerance: `Over the limit of ${limit} by ${over} words, but inside the ${tolerance_percent} percent tolerance (up to ${allowed}).`,
      over_limit: `Over the limit. ${counted} words counted against ${limit}, so ${over} to cut${tolerance_percent ? ` (tolerance allows up to ${allowed})` : ""}.`,
    };
    const excluded = [
      exclude_references ? `${refWords} reference words left out` : "",
      exclude_quotes ? `${quoteWords} quote words left out` : "",
    ].filter(Boolean);
    return {
      text: summary[status] + (excluded.length ? ` (${total} words in total, ${excluded.join(", ")}.)` : ""),
      structured: {
        status,
        total_words: total,
        counted_words: counted,
        excluded_reference_words: refWords,
        excluded_quote_words: quoteWords,
        limit,
        minimum: minimum ?? null,
        allowed_maximum: allowed,
        words_remaining: remaining,
        words_over: over,
      },
    };
  },
};

const wordFrequencyTool: ToolDef = {
  name: "word_frequency",
  title: "Word frequency",
  description:
    "Find the words an essay uses most, to spot overused or repeated terms. Inputs: text, and optional top (how many words to list, default 10), min_count (fewest uses for a word to be listed, default 2) and include_common_words (also count small words such as the, and, of and to, default false). Case is ignored, and words under 3 letters are skipped unless include_common_words is true. Each word comes with its count and its share of all the words in the text. Example: \"Which words do I overuse in this essay?\"",
  inputSchema: {
    text: textInput,
    top: z.number().int().min(1).max(100).optional().describe("How many words to list. Default 10."),
    min_count: z.number().int().min(1).optional().describe("Fewest uses for a word to be listed. Default 2."),
    include_common_words: z.boolean().optional().describe("Also count small common words. Default false."),
  },
  outputSchema: {
    total_words: z.number(),
    unique_words: z.number(),
    words: z.array(z.object({ word: z.string(), count: z.number(), percent: z.number() })),
    top: z.number(),
    min_count: z.number(),
  },
  run: ({ text, top = 10, min_count = 2, include_common_words = false }) => {
    requireText(text, "word_frequency");
    const f = wordFrequency(text, include_common_words);
    const list = f.hits.filter((h) => h.count >= min_count).slice(0, top);
    const summary = list.length
      ? `Most used words: ${list.map((h) => `"${h.word}" x${h.count} (${h.percent} percent)`).join(", ")}.`
      : `No word is used ${min_count} or more times.`;
    return {
      text: `${f.total} words, ${f.unique} different. ${summary}`,
      structured: { total_words: f.total, unique_words: f.unique, words: list, top, min_count },
    };
  },
};

const sentenceVariety: ToolDef = {
  name: "sentence_variety",
  title: "Sentence variety",
  description:
    "Show how much the sentence lengths in an essay change, since a good rhythm mixes short, medium and long sentences. Input: text. Returns the shortest, longest and average sentence length in words, the standard deviation, how many sentences are short (under 10 words), medium (10 to 24) and long (25 or more), and any runs of 3 or more sentences in a row whose lengths are within 3 words of the first one in the run, with their sentence numbers. Sentence numbers start at 1 and follow the order of the text. This is a simple measure of rhythm, so treat it as a prompt to reread. Example: \"Do my sentences all sound the same length?\"",
  inputSchema: { text: textInput },
  outputSchema: {
    sentences: z.number(),
    shortest_words: z.number(),
    longest_words: z.number(),
    average_words: z.number(),
    std_dev_words: z.number(),
    short_count: z.number(),
    medium_count: z.number(),
    long_count: z.number(),
    similar_runs: z.array(z.object({ first: z.number(), last: z.number(), words: z.number() })),
    lengths: z.array(z.number()),
  },
  run: ({ text }) => {
    requireText(text, "sentence_variety");
    const lengths = sentenceLengths(splitSentences(text));
    if (lengths.length === 0) {
      throw new Error("The text needs at least one sentence to measure.");
    }
    const n = lengths.length;
    const avg = lengths.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(lengths.reduce((a, b) => a + (b - avg) ** 2, 0) / n);
    const shortCount = lengths.filter((l) => l < 10).length;
    const longCount = lengths.filter((l) => l >= 25).length;
    const runs: { first: number; last: number; words: number }[] = [];
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && Math.abs(lengths[j + 1] - lengths[i]) <= 3) j++;
      if (j - i + 1 >= 3) {
        runs.push({ first: i + 1, last: j + 1, words: lengths[i] });
        i = j + 1;
      } else {
        i++;
      }
    }
    const result = {
      sentences: n,
      shortest_words: Math.min(...lengths),
      longest_words: Math.max(...lengths),
      average_words: round(avg, 1),
      std_dev_words: round(sd, 1),
      short_count: shortCount,
      medium_count: n - shortCount - longCount,
      long_count: longCount,
      similar_runs: runs,
      lengths,
    };
    const runText = runs.length
      ? runs.map((r) => `sentences ${r.first} to ${r.last} (about ${r.words} words each)`).join(", ")
      : "none";
    return {
      text: `${n} sentences, from ${result.shortest_words} to ${result.longest_words} words, averaging ${result.average_words} with a standard deviation of ${result.std_dev_words}. ${shortCount} short, ${result.medium_count} medium and ${longCount} long. Runs of similar length: ${runText}.`,
      structured: result,
    };
  },
};

export const tools: ToolDef[] = [countText, readabilityScores, styleFlags, sentenceVariety, checkWordLimit, wordFrequencyTool];

