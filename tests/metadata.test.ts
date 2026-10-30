import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { VERSION } from "../src/server.js";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const readJson = (path: string) => JSON.parse(read(path));

describe("package metadata", () => {
  const pkg = readJson("package.json");
  const server = readJson("server.json");

  it("has the agreed names and version", () => {
    expect(pkg.name).toBe("essay-stats-mcp");
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.mcpName).toBe("io.github.AnonymousOnyx22/essay-stats-mcp");
    expect(Object.keys(pkg.bin)).toEqual(["essay-stats-mcp"]);
  });

  it("keeps every version in step", () => {
    expect(VERSION).toBe(pkg.version);
    expect(server.version).toBe(pkg.version);
    expect(server.packages[0].version).toBe(pkg.version);
    expect(server.packages[0].identifier).toBe(pkg.name);
    expect(server.name).toBe(pkg.mcpName);
    expect(readJson("glama.json").version).toBe(pkg.version);
  });

  it("has at least 10 keywords and a description", () => {
    expect(pkg.keywords.length).toBeGreaterThanOrEqual(10);
    expect(pkg.description).toContain("essay");
  });

  it("has a changelog entry for the current version", () => {
    expect(read("CHANGELOG.md")).toContain(`## ${pkg.version}`);
  });
});

describe("docs", () => {
  const names = ["count_text", "readability_scores", "style_flags", "check_word_limit", "word_frequency"];
  const docs = { "README.md": read("README.md"), "llms.txt": read("llms.txt") };

  for (const [file, text] of Object.entries(docs)) {
    it(`${file} lists every tool`, () => {
      for (const n of names) expect(text, n).toContain(n);
    });

    it(`${file} has no leftovers from the old project`, () => {
      // the table of sibling servers names the other servers on purpose, so it is left out of this check
      expect(text.replace(/\n## More free student MCP servers[\s\S]*?(?=\n## |$)/, "")).not.toMatch(/gpa|chatgpt|grade calculator/i);
    });

    it(`${file} uses plain punctuation`, () => {
      expect(text).not.toMatch(/[–—]/);
    });
  }

  it("README has the usual sections", () => {
    const readme = docs["README.md"];
    for (const h of ["## Quick start", "## Tools", "## Example prompts", "## Privacy"]) {
      expect(readme).toContain(h);
    }
  });
});
