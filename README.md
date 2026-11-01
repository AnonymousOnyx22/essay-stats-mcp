# Essay Stats MCP: Essay Word Count and Writing Checker

You are about to hand in an essay and you are not sure if it is over the word limit, or how many pages it is. A chat assistant tends to guess at word counts. This server counts them properly, on your computer, so your assistant can give you real numbers.

Install it in Claude Code with one line:

```
claude mcp add essay-stats -- npx -y essay-stats-mcp
```

Then ask things like:

- "My limit is 1500 words, not counting the works cited or quotes. Am I over?"
- "How many pages is this essay in Arial 11 point with 1.5 spacing?"
- "Find the passive voice and filler words in my draft."

Essay Stats MCP is an essay word counter and writing checker that runs offline. It counts words and pages, gives a readability score, and flags passive voice, filler words, long sentences and repeated sentence openers. It also gives the reading time.

There is no account, no API key and no network call. Your essay text never leaves your machine.

## Quick start

Claude Code users can use the one line above. For other apps, copy the snippet for your client. It needs Node.js 20 or newer.

### Claude Desktop

Open Settings, Developer, Edit Config, and add this to `claude_desktop_config.json`. Then restart Claude Desktop.

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

### Cursor

Add this to `.cursor/mcp.json` in your project, or to `~/.cursor/mcp.json` for all projects.

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

### VS Code

Add this to `.vscode/mcp.json` in your workspace. VS Code uses a `servers` key instead of `mcpServers`.

```json
{
  "servers": {
    "essay-stats": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "essay-stats-mcp"]
    }
  }
}
```

### Windsurf

Use the same snippet as Claude Desktop in `~/.codeium/windsurf/mcp_config.json`.

## Tools

| Tool | What it does |
| --- | --- |
| `count_text` | Words, characters, sentences, paragraphs, reading time and an estimated page count for a font, size and line spacing. |
| `readability_scores` | Flesch Kincaid grade, Flesch reading ease, Gunning Fog and SMOG. |
| `style_flags` | Passive voice, repeated sentence openers, filler words and long sentences. |
| `check_word_limit` | Compares the text with a word limit. Optional minimum, tolerance, and leaving out references and quotes. |
| `word_frequency` | The words used most often, with counts and share of the text, to spot overused terms. |

All five tools only read the text you give them. Each one returns a short written answer and the same numbers as structured fields.

### count_text

Inputs: `text`, and optional `font` (times new roman, arial, calibri, georgia, courier new or verdana), `font_size` in points (default 12) and `spacing` (single, 1.5 or double, default double). The page count is an estimate from typical words per page, so Word or Google Docs may differ by a little.

### readability_scores

Input: `text`. The grades are roughly US school grades, so 12 is the end of high school. SMOG is designed for 30 sentences or more, so on a short text the result is marked as less reliable.

### style_flags

Inputs: `text` and optional `max_sentence_words` (default 30). The checks are simple pattern rules. Use them as a prompt to reread a sentence, not as proof of a mistake.

Sentence numbers start at 1 and follow the order of the text. The `sentence_list` field gives each passive or long sentence with its number, and the text summary ends with a line listing those numbers, so a reply can point you to the right sentence.

### word_frequency

Inputs: `text`, and optional `top` (how many words to list, default 10), `min_count` (fewest uses for a word to be listed, default 2) and `include_common_words` (also count small words such as the, and, of and to, default false). Case is ignored, and words under 3 letters are skipped unless `include_common_words` is true.

### check_word_limit

Inputs: `text`, `limit`, and optional `minimum`, `tolerance_percent`, `exclude_references` and `exclude_quotes`. References are cut from a heading line such as References, Works Cited or Bibliography to the end. Quotes are lines starting with `>` and text inside double quotes.

## Example prompts

- "Count the words in this essay and tell me how many pages it is in Arial 11 point with 1.5 spacing."
- "What reading level is this essay? Give me the Flesch Kincaid, Gunning Fog and SMOG scores."
- "Find the passive voice and filler words in my draft."
- "My limit is 1500 words, not counting the works cited or quotes. Am I over?"
- "Which sentences are over 25 words long?"
- "Which words do I overuse in this essay?"

## How it compares

Essay Stats MCP does one job: it measures a piece of writing you give it. Other tools in this area do different jobs, so the table below is about what each kind of tool is for, not about which is better.

| | Essay Stats MCP | Brightspace MCP servers, such as brightspace-mcp-server | Online grammar and writing checkers | Asking a chat assistant to count |
| --- | --- | --- | --- | --- |
| Main job | Word count, page estimate, readability and style flags for an essay | Reading course data from Brightspace, such as courses and assignments | Fixing grammar, spelling and tone | General answers |
| Works on your own draft text | Yes | No, it works on course data | Yes | Yes |
| Exact word and page numbers | Yes, counted by code | Not its purpose | Usually a word count only | Often a guess |
| Word limit check that skips references and quotes | Yes, with `check_word_limit` | No | Rarely | Unreliable |
| Needs an account or API key | No | Depends on the server, check its README | Often an account | Depends on the app |
| Sends your text over the network | No | Depends on the server | Usually yes | Yes, to the assistant |
| Runs as a local MCP server | Yes | Yes | Not usually | Not applicable |

Essay Stats MCP does not fix your writing or reach into Brightspace. If you want Brightspace data next to it, see the next section for our own server, brightspace-d2l-mcp.

## Works well with

If your school uses Brightspace, you can run [brightspace-d2l-mcp](https://www.npmjs.com/package/brightspace-d2l-mcp) next to Essay Stats MCP in the same app. That server has its own setup, so follow its README to install and sign in. Essay Stats MCP does not talk to it and does not need it.

With both added to your MCP config, you can ask your assistant to look up the word limit in your assignment details, then pass that number to `check_word_limit` along with your draft. For example:

- "Find the word limit for my history essay in Brightspace, then check this draft against it, leaving out the works cited."
- "Look up my assignment instructions, then tell me if this draft is under the limit and how many pages it is."

The assignment details come from the other server. The counting and checking happen here, on your machine, and Essay Stats MCP makes no network calls.

## Privacy

Everything is calculated locally by a small Node.js program talking to your app over standard input and output. It makes no network requests, stores nothing and needs no keys or passwords. The text you paste is used for the one call and then dropped.

## Development

```
npm install
npm run build
npm test
```

## More free student MCP servers

All free, open source and read only where they touch your accounts. Browse the full list at [brightspacemcp.com/more-mcps](https://brightspacemcp.com/more-mcps/).

| Server | What it does |
| --- | --- |
| [Brightspace MCP](https://github.com/AnonymousOnyx22/brightspace-d2l-mcp) | D2L Brightspace for AI. Due dates with real submission status, grades, a target grade calculator and course files. |
| [Canvas MCP](https://github.com/AnonymousOnyx22/canvas-lms-student-mcp) | Canvas LMS for AI, read only. Due dates, missing work, grades and announcements. |
| [Moodle MCP](https://github.com/AnonymousOnyx22/moodle-student-mcp) | Moodle for AI, read only. Due dates, overdue work, grades and announcements. |
| [Google Classroom MCP](https://github.com/AnonymousOnyx22/google-classroom-student-mcp) | Google Classroom for AI, read only. Todos, due dates, missing work and grades. |
| [GPA Calculator MCP](https://github.com/AnonymousOnyx22/gpa-calculator-mcp) | GPA, grade conversion and the grade you need on the final, for AI. Works offline, no account. |
| [Citations MCP](https://github.com/AnonymousOnyx22/student-citations-mcp) | APA, MLA and Chicago citations from a DOI, an ISBN or typed details. No account. |
| [Study Planner MCP](https://github.com/AnonymousOnyx22/study-planner-mcp) | Exam study schedules, spaced repetition dates, pomodoro plans and assignment milestones. Works offline. |
| [Paper Finder MCP](https://github.com/AnonymousOnyx22/paper-finder-student-mcp) | Search scholarly papers, find open access copies and related work through OpenAlex. No key needed. |
| [BibTeX Reference Manager MCP](https://github.com/AnonymousOnyx22/bibtex-reference-manager-mcp) | Clean, convert, dedupe and lint BibTeX, RIS and CSL JSON reference lists, and make cite keys. Works offline. |
| [Open Textbook Finder MCP](https://github.com/AnonymousOnyx22/open-textbook-finder-mcp) | Find free legal copies of textbooks on OpenStax, DOAB and Open Library, look up editions by ISBN and suggest cheaper older ones. |
| [STEM Calculator MCP](https://github.com/AnonymousOnyx22/stem-calc-student-mcp) | Chemistry and physics homework math: molar mass, balancing equations, grams to moles, unit conversion and significant figures. Works offline. |
| [Syllabus to Calendar MCP](https://github.com/AnonymousOnyx22/syllabus-calendar-mcp) | Syllabus to calendar MCP server. Extract dates from syllabus text, build an ics calendar, expand recurring classes and merge calendars. Works offline, no account. |
| [Job Application Tracker MCP](https://github.com/AnonymousOnyx22/job-tracker-student-mcp) | Job application tracker MCP server. Track internships, jobs, interviews and deadlines offline, see what is coming up, and export your list as CSV or Markdown. No account and no API keys. |

## License

MIT
