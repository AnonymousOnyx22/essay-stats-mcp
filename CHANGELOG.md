# Changelog

## Unreleased

- New tool word_frequency lists the words an essay uses most, with counts and share of the text, to spot overused terms.
- style_flags now returns a sentence_list with the number of each passive or long sentence, and says that sentence numbers follow the order of the text.

## 0.1.0

- First version.
- count_text counts words, characters, sentences and paragraphs, and estimates pages for a font, font size and line spacing.
- readability_scores returns Flesch Kincaid grade, Flesch reading ease, Gunning Fog and SMOG.
- style_flags finds passive voice, repeated sentence openers, filler words and long sentences.
- check_word_limit compares a text with a word limit, with an optional minimum, a tolerance, and the option to leave out references and quotes.
