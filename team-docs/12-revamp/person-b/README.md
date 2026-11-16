# Person B: the app shell, leaves and the Tree of Wisdom, Home and the Marketplace

Read [../README.md](../README.md) first: it has the rounds, the file ownership table, the contract with Person A, and what to wait for.
Then do these in order, one branch and one pull request each:

| Round | File | Branch | What it gives | Needs merged first |
|---|---|---|---|---|
| 1 | [B1-shell-leaves-tree.md](B1-shell-leaves-tree.md) | `b/shell-leaves-tree` | Four tabs, the header, the floating Back button; the leaf rule; the Tree of Wisdom page and the mini tree | none |
| 2 | [B2-home-and-marketplace.md](B2-home-and-marketplace.md) | `b/home-marketplace` | Home (upcoming events and the calendar); the Marketplace (search, "I went / I didn't go", recommended, analytics) | B1, A1 (A2 for the Wisdom items on Home) |

**Merge B1 quickly: A2 needs `BackButton` and `feed.showed_up`.**
To run one: open the coding agent in the repo root and say `Do team-docs/12-revamp/person-b/B1-shell-leaves-tree.md`.
After every iteration the agent appends to [LOG.md](LOG.md) in this folder.
