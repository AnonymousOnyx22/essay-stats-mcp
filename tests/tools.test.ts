import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { tools } from "../src/tools.js";
import { runTool } from "../src/core/tools.js";

const tool = (name: string) => tools.find((t) => t.name === name)!;
const call = (name: string, args: Record<string, unknown>) => runTool(tool(name), args);
const sc = (name: string, args: Record<string, unknown>) => call(name, args).structuredContent as any;

const essay = `Writing is hard. Writing takes time. Writing needs practice.

The report was written by the team. Mistakes were made, and the data was lost. It is important to note that we very nearly tried our best.

"This quoted passage has exactly seven words." We just moved on.`;

describe("server", () => {
  it("lists the four tools over MCP and answers a call", async () => {
    const server = createServer();
    const client = new Client({ name: "test", version: "0.0.0" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(a), client.connect(b)]);
    const list = await client.listTools();
    expect(list.tools.map((t) => t.name).sort()).toEqual([
      "check_word_limit",
      "count_text",
      "readability_scores",
      "style_flags",
    ]);
    const res: any = await client.callTool({ name: "count_text", arguments: { text: "One two three." } });
    expect(res.structuredContent.words).toBe(3);
  });
});

describe("count_text", () => {
  it("counts words, sentences and paragraphs", () => {
    const r = sc("count_text", { text: essay });
    expect(r.paragraphs).toBe(3);
    expect(r.sentences).toBe(8);
    expect(r.words).toBe(47);
    expect(r.characters).toBe(essay.length);
    expect(r.characters_no_spaces).toBe(essay.replace(/\s/g, "").length);
  });

  it("does not split sentences on abbreviations or decimals", () => {
    const r = sc("count_text", { text: "Dr. Smith paid 3.5 dollars. He left." });
    expect(r.sentences).toBe(2);
  });

  it("estimates 1 page for 275 double spaced words in Times New Roman 12", () => {
    const text = Array(275).fill("word").join(" ");
    expect(sc("count_text", { text }).estimated_pages).toBe(1);
  });

  it("gives more pages for single spacing less, and for larger fonts more", () => {
    const text = Array(1000).fill("word").join(" ");
    const dbl = sc("count_text", { text }).estimated_pages;
    const single = sc("count_text", { text, spacing: "single" }).estimated_pages;
    const half = sc("count_text", { text, spacing: "1.5" }).estimated_pages;
    const big = sc("count_text", { text, font_size: 14 }).estimated_pages;
    expect(single).toBeLessThan(half);
    expect(half).toBeLessThan(dbl);
    expect(big).toBeGreaterThan(dbl);
  });

  it("reports reading time", () => {
    const text = Array(476).fill("word").join(" ");
    expect(sc("count_text", { text }).reading_minutes).toBe(2);
  });

  it("rejects an unknown font and empty text", () => {
    const bad = call("count_text", { text: "hello there", font: "Comic Sans" });
    expect(bad.isError).toBe(true);
    expect(bad.content[0].text).toContain("Unknown font");
    expect(call("count_text", { text: "... !!!" }).isError).toBe(true);
  });
});

describe("readability_scores", () => {
  it("scores a very simple text as easy and low grade", () => {
    const r = sc("readability_scores", { text: "The cat sat on the mat. The dog ran to the log. I see a big red bus." });
    expect(r.flesch_kincaid_grade).toBeLessThan(2);
    expect(r.flesch_reading_ease).toBeGreaterThan(90);
    expect(r.reading_ease_label).toBe("very easy");
    expect(r.complex_words).toBe(0);
  });

  it("scores dense academic text higher on all three grades", () => {
    const easy = sc("readability_scores", { text: "The cat sat on the mat. The dog ran to the log." });
    const hard = sc("readability_scores", {
      text: "Notwithstanding considerable methodological disagreements, contemporary epistemologists generally acknowledge that institutional frameworks significantly influence interpretative conclusions. Comprehensive investigations consistently demonstrate extraordinary complications.",
    });
    expect(hard.flesch_kincaid_grade).toBeGreaterThan(easy.flesch_kincaid_grade + 8);
    expect(hard.gunning_fog).toBeGreaterThan(easy.gunning_fog + 8);
    expect(hard.smog).toBeGreaterThan(easy.smog);
    expect(hard.flesch_reading_ease).toBeLessThan(easy.flesch_reading_ease);
  });

  it("matches the Flesch Kincaid formula for known counts", () => {
    // 6 words, 1 sentence, 6 syllables: 0.39 * 6 + 11.8 * 1 - 15.59 = -1.45
    const r = sc("readability_scores", { text: "The cat sat on the mat." });
    expect(r.words).toBe(6);
    expect(r.syllables).toBe(6);
    expect(r.flesch_kincaid_grade).toBeGreaterThan(-1.6);
    expect(r.flesch_kincaid_grade).toBeLessThan(-1.3);
  });

  it("marks SMOG as less reliable under 30 sentences and reliable at 30", () => {
    expect(sc("readability_scores", { text: "A short text here." }).smog_reliable).toBe(false);
    const long = Array(30).fill("The cat sat down.").join(" ");
    expect(sc("readability_scores", { text: long }).smog_reliable).toBe(true);
  });

  it("errors on text with no words", () => {
    expect(call("readability_scores", { text: "123 ... ???" }).isError).toBeFalsy();
    expect(call("readability_scores", { text: "---" }).isError).toBe(true);
  });
});

describe("style_flags", () => {
  const r = sc("style_flags", { text: essay });

  it("finds passive voice", () => {
    expect(r.passive_count).toBe(2);
    const phrases = r.passive_sentences.map((p: any) => p.phrase.toLowerCase());
    expect(phrases).toContain("was written");
    expect(phrases).toContain("were made");
  });

  it("does not flag active voice", () => {
    const a = sc("style_flags", { text: "The team wrote the report. We need speed. She is tired." });
    expect(a.passive_count).toBe(0);
  });

  it("finds repeated openers", () => {
    const op = r.repeated_openers.find((o: any) => o.word === "writing");
    expect(op.count).toBe(3);
    expect(op.sentences).toEqual([1, 2, 3]);
  });

  it("finds filler words and phrases", () => {
    const names = r.filler.map((f: any) => f.text);
    expect(names).toContain("very");
    expect(names).toContain("just");
    expect(names).toContain("it is important to note that");
    expect(r.filler_count).toBeGreaterThanOrEqual(3);
  });

  it("finds long sentences with a custom limit", () => {
    const text = "Short one here. This sentence has quite a few more words than the short one does.";
    const loose = sc("style_flags", { text });
    expect(loose.long_sentences).toEqual([]);
    const tight = sc("style_flags", { text, max_sentence_words: 8 });
    expect(tight.long_sentences).toHaveLength(1);
    expect(tight.long_sentences[0].number).toBe(2);
    expect(tight.long_sentences[0].words).toBe(13);
  });

  it("says none when the text is clean", () => {
    const clean = call("style_flags", { text: "Dogs bark loudly. Cats purr softly. Birds sing at dawn." });
    expect(clean.content[0].text).toContain("Passive voice: 0");
    expect(clean.structuredContent!.filler_count).toBe(0);
  });
});

describe("check_word_limit", () => {
  const body = Array(100).fill("word").join(" ");

  it("is within the limit and reports the words left", () => {
    const r = sc("check_word_limit", { text: body, limit: 120 });
    expect(r.status).toBe("within_limit");
    expect(r.counted_words).toBe(100);
    expect(r.words_remaining).toBe(20);
    expect(r.words_over).toBe(0);
  });

  it("is over the limit", () => {
    const r = sc("check_word_limit", { text: body, limit: 80 });
    expect(r.status).toBe("over_limit");
    expect(r.words_over).toBe(20);
  });

  it("uses the tolerance", () => {
    const r = sc("check_word_limit", { text: body, limit: 95, tolerance_percent: 10 });
    expect(r.status).toBe("within_tolerance");
    expect(r.allowed_maximum).toBe(104);
    expect(sc("check_word_limit", { text: body, limit: 80, tolerance_percent: 10 }).status).toBe("over_limit");
  });

  it("checks the minimum", () => {
    const r = sc("check_word_limit", { text: body, limit: 500, minimum: 250 });
    expect(r.status).toBe("under_minimum");
    expect(call("check_word_limit", { text: body, limit: 500, minimum: 250 }).content[0].text).toContain("150 short");
  });

  it("leaves out the references section", () => {
    const text = `${body}\n\nWorks Cited\nSmith, John. A Book About Things. 2020.\nLee, Ann. Another Book. 2019.`;
    const all = sc("check_word_limit", { text, limit: 1000 });
    const cut = sc("check_word_limit", { text, limit: 1000, exclude_references: true });
    expect(cut.counted_words).toBe(100);
    expect(cut.excluded_reference_words).toBe(all.total_words - 100);
    expect(cut.excluded_reference_words).toBeGreaterThan(10);
  });

  it("leaves out quotes", () => {
    const text = `${body}\n> A block quote of six words.\nHe said "this is a four word quote" today.`;
    const cut = sc("check_word_limit", { text, limit: 1000, exclude_quotes: true });
    expect(cut.excluded_quote_words).toBe(12);
    expect(cut.counted_words).toBe(103);
  });

  it("rejects a minimum above the limit", () => {
    const r = call("check_word_limit", { text: body, limit: 50, minimum: 80 });
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("minimum");
  });
});
