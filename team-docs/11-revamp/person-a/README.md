# Person A: onboarding, sign-in, profile, communities

Read [../README.md](../README.md) first: it has the file ownership table and the contract with Person B. Then do these in order,
one branch and one pull request each:

| # | File | Branch | What it gives |
|---|---|---|---|
| 1 | [01-onboarding-first-screens.md](01-onboarding-first-screens.md) | `a/onboarding-first-screens` | Language, text size, who is setting up |
| 2 | [02-singpass-sign-in.md](02-singpass-sign-in.md) | `a/singpass-sign-in` | The sign-in screen with Singpass only |
| 3 | [03-onboarding-about-you.md](03-onboarding-about-you.md) | `a/onboarding-about-you` | Name, where you live, what you enjoy, your voice, reminders, welcome |
| 4 | [04-profile-and-settings.md](04-profile-and-settings.md) | `a/profile-settings` | Profile card, sign out, settings that edit everything from onboarding |
| 5 | [05-recommended-communities.md](05-recommended-communities.md) | `a/recommended-communities` | The three recommended communities after the welcome screen |
| 6 | [06-community-tab.md](06-community-tab.md) | `a/community-tab` | The Community tab, the community page and its events, for older people |
| 7 | [07-close-the-revamp.md](07-close-the-revamp.md) | `a/close-revamp` | After B has finished too: one `PROGRESS.md` entry, `HANDOFF.md` updated |

To run one: open Claude Code in the repo root and say `Do team-docs/11-revamp/person-a/01-onboarding-first-screens.md`.

After every iteration, Claude Code appends to [LOG.md](LOG.md) in this folder (not to `PROGRESS.md`).
