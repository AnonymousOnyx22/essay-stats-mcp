# Changelog

## Unreleased

- New tool sentence_variety shows how much sentence lengths change in an essay, with short, medium and long counts and runs of sentences that are about the same length.
- All five tools are now marked read only, idempotent and closed world, so clients can run them without asking you first.

## 0.1.2

- Add worked examples to word_frequency and style_flags errors
- Add competitor comparison table to README
- Update the table of sibling MCP servers in the README

## 0.1.1

- Tool descriptions now include example prompts, so clients can show what to ask each tool.
- New tool word_frequency lists the most used words, with counts and share of the text, to spot overused terms.
- style_flags now returns a sentence_list with the number of each passive or long sentence, and says that sentence numbers follow the order of the text.
- Error messages for empty or wordless text and for a minimum above the limit now include a worked example call so a client can fix its input.

## 0.1.0

- First version.
- count_text counts words, characters, sentences and paragraphs, and estimates pages for a font, font size and line spacing.
- readability_scores returns Flesch Kincaid grade, Flesch reading ease, Gunning Fog and SMOG.
- style_flags finds passive voice, repeated sentence openers, filler words and long sentences.
- check_word_limit compares a text with a word limit, with an optional minimum, a tolerance, and the option to leave out references and quotes.
