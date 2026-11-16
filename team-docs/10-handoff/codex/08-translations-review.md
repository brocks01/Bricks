# Task 8: Review the words in six languages

Work straight on `main`. Area: every `words.ts`, `extraWords.ts`, `dayWords.ts`, `strings.ts` under `app/src/features` and `app/src/i18n`. The small, cheap model is fine. **No behaviour changes.**

## Context
Every screen's words exist in English, Hindi, Bengali, Tamil, Chinese (simplified) and Malay (a `WordTable` row is `[en, hi, bn, ta, zh, ms]`). Many were written as first drafts by an AI assistant and need checking before a native speaker reviews them.

## Do
1. Write a script (kept under `app/scripts/`, not part of the app) that lists every row of every word table with its six translations, by feature, into `team-docs/10-handoff/translation-review.md` as a table (key, English, then each language).
2. **Mechanical checks** (fix what is clearly wrong, list what is unclear): placeholders such as `{n}`, `{name}`, `{title}` must be identical in all six languages; no language left in English by mistake; no script mixing in one word (for example Hindi text with Tamil letters); consistent product terms (the app is called **Wisdom**; keep the three tab names consistent: Communities, Wisdom, Marketplace); Chinese is Simplified; numbers and punctuation are sensible; strings that are far longer than the English by more than 2.5 times (they may not fit on a button).
3. In `translation-review.md` add a short section **"Needs a native speaker"** listing the 40 strings most likely to be wrong or awkward (idioms, tone for older people, religious or cultural terms such as festival names), with a one-line reason each.
4. Do not rename any key. Do not change English wording.

## Acceptance
The review file exists and is complete; `npx tsx src/navigation/selftest.ts`, `npx tsc --noEmit` and `npx expo lint` stay clean; a short summary of what was fixed and what remains in `team-docs/10-handoff/progress/translations-review.md`.
