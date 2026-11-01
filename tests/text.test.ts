import { describe, it, expect } from "vitest";
import { sentenceLengthStats, splitSentences } from "../src/text.js";

describe("sentenceLengthStats", () => {
  it("returns zeros for no sentences", () => {
    expect(sentenceLengthStats([])).toEqual({ count: 0, mean: 0, median: 0, longest: 0, shortest: 0, spread: 0 });
  });

  it("measures an odd number of sentences", () => {
    const s = splitSentences("Stop. This one has five words. Now a medium line here today.");
    expect(sentenceLengthStats(s)).toEqual({ count: 3, mean: 4, median: 5, longest: 6, shortest: 1, spread: 5 });
  });

  it("uses the middle two for the median of an even number", () => {
    const s = ["One two.", "One two three four.", "One.", "One two three four five six."];
    const r = sentenceLengthStats(s);
    expect(r.median).toBe(3);
    expect(r.mean).toBe(3.3);
    expect(r.spread).toBe(5);
  });
});
