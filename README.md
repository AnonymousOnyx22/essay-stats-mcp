# Essay Stats MCP

Offline writing metrics for essays. It covers word and page counts, readability, passive voice, repeated words and reading time, so you can check your work against assignment requirements before you hand it in.

It runs on your computer. There is no account, no API key and no network call. Your essay text never leaves your machine.

## Quick start

Add this to the MCP config of your app:

```json
{
  "mcpServers": {
    "essay-stats": {
      "command": "npx",
      "args": ["-y", "essay-stats-mcp"]
    }
  }
}
```

It needs Node.js 20 or newer.

Where the config lives:

- Claude Desktop: Settings, Developer, Edit Config (`claude_desktop_config.json`).
- Claude Code: run `claude mcp add essay-stats -- npx -y essay-stats-mcp`.
- Cursor: Settings, MCP, or `.cursor/mcp.json` in your project.
- VS Code: `.vscode/mcp.json`. VS Code uses a `servers` key instead of `mcpServers`.
- Windsurf: `~/.codeium/windsurf/mcp_config.json`.

## Tools

| Tool | What it does |
| --- | --- |
| `count_text` | Words, characters, sentences, paragraphs, reading time and an estimated page count for a font, size and line spacing. |
| `readability_scores` | Flesch Kincaid grade, Flesch reading ease, Gunning Fog and SMOG. |
| `style_flags` | Passive voice, repeated sentence openers, filler words and long sentences. |
| `check_word_limit` | Compares the text with a word limit. Optional minimum, tolerance, and leaving out references and quotes. |

All four tools only read the text you give them. Each one returns a short written answer and the same numbers as structured fields.

### count_text

Inputs: `text`, and optional `font` (times new roman, arial, calibri, georgia, courier new or verdana), `font_size` in points (default 12) and `spacing` (single, 1.5 or double, default double). The page count is an estimate from typical words per page, so Word or Google Docs may differ by a little.

### readability_scores

Input: `text`. The grades are roughly US school grades, so 12 is the end of high school. SMOG is designed for 30 sentences or more, so on a short text the result is marked as less reliable.

### style_flags

Inputs: `text` and optional `max_sentence_words` (default 30). The checks are simple pattern rules. Use them as a prompt to reread a sentence, not as proof of a mistake.

### check_word_limit

Inputs: `text`, `limit`, and optional `minimum`, `tolerance_percent`, `exclude_references` and `exclude_quotes`. References are cut from a heading line such as References, Works Cited or Bibliography to the end. Quotes are lines starting with `>` and text inside double quotes.

## Example prompts

- "Count the words in this essay and tell me how many pages it is in Arial 11 point with 1.5 spacing."
- "What reading level is this essay? Give me the Flesch Kincaid, Gunning Fog and SMOG scores."
- "Find the passive voice and filler words in my draft."
- "My limit is 1500 words, not counting the works cited or quotes. Am I over?"
- "Which sentences are over 25 words long?"

## Privacy

Everything is calculated locally by a small Node.js program talking to your app over standard input and output. It makes no network requests, stores nothing and needs no keys or passwords. The text you paste is used for the one call and then dropped.

## Development

```
npm install
npm run build
npm test
```

## License

MIT
