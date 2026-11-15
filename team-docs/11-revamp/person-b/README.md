# Person B: Tree of Wisdom, Home, Marketplace

Read [../README.md](../README.md) first: it has the file ownership table and the contract with Person A. Then do these in order,
one branch and one pull request each:

| # | File | Branch | What it gives |
|---|---|---|---|
| 1 | [01-leaves-and-tree-data.md](01-leaves-and-tree-data.md) | `b/leaves-and-tree-data` | The leaf rule on the server: one leaf for each event the person shows up to, and the tree's data |
| 2 | [02-tree-of-wisdom-page.md](02-tree-of-wisdom-page.md) | `b/tree-of-wisdom-page` | The tree drawing and the list of attended events |
| 3 | [03-tree-button-in-header.md](03-tree-button-in-header.md) | `b/tree-button` | The round mini-tree button at the top left |
| 4 | [04-home-upcoming-events.md](04-home-upcoming-events.md) | `b/home-upcoming-events` | Home, top half: upcoming events with Yes and No, "I'm here" and "+1 leaf" |
| 5 | [05-home-calendar.md](05-home-calendar.md) | `b/home-calendar` | Home, bottom half: the simple month calendar with a day popup |
| 6 | [06-marketplace.md](06-marketplace.md) | `b/marketplace` | Search, filter by interests, the two big buttons, the listings |
| 7 | [07-marketplace-products.md](07-marketplace-products.md) | `b/marketplace-products` | Selling a product as well as offering a service |

To run one: open Claude Code in the repo root and say `Do team-docs/11-revamp/person-b/01-leaves-and-tree-data.md`.

After every iteration, Claude Code appends to [LOG.md](LOG.md) in this folder (not to `PROGRESS.md`).

You will need to sign in while Person A is rebuilding sign-in. Until A2 is merged, the email-code sign-in works as today (in development
the code is shown on screen). After A2, the Singpass button signs you in once `DEMO_SIGN_IN=on` is in your own `backend/.env`; it is a
new, empty account, so run the seed and showcase scripts for it if you need demo data.
