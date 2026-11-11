# Grow and Explore (decided with the owner, 11 Nov 2026)

**This page is the source of truth for the Grow tab.** It replaces the earlier Grow layout (goal card, My Health, My Goals, My Learning, My Progress). Visual target: `../05-design/ui-samples/11-grow-screens.webp` (ten screens). The two-tab navigation (Connect, Grow) and the pinned Bricks Agent bar do not change.

## The philosophy
Grow is not about correcting weaknesses. It is about curiosity, independence, enjoyment and discovering new possibilities at every age. A 25-year-old, a 55-year-old and an 80-year-old should all feel equally welcome. So: warm, age-inclusive language; no "courses to complete", no scores that shame; the person moves at their own pace.

> **Success is not measured by courses completed.** It is measured by whether people discover useful things, enjoy new experiences, become more confident in everyday life and pursue interests they care about.

## The Grow home (screen 1 of the sample)
Heading **Grow**, line "Your wellbeing, aspirations and personal journey." Six cards, in this order:

| Card | Line | Holds |
|---|---|---|
| Health | Care and wellbeing | health score, heart rate, sleep, weight, blood pressure; records |
| Activity | Move, walk and stay active | walking, jogging, safe physical activity |
| Aspirations | Dreams and personal goals | goals, experiences, "something of my own" |
| Explore | Discover, learn and experience | curiosity, knowledge, new experiences (below) |
| My Progress | Your growth and milestones | overview, health, activity, aspirations |
| My Contributions | Your contribution to the community | what the person has given across communities (hours, help, events) |

Then the tabs Connect / Grow and the Bricks Agent bar. `grow.index` keeps the route `/grow`.

## Explore: a discovery space, not a learning system
Heading **Explore**, line "There's always something new to discover." Search ("What interests you today?"), a picture banner, then six categories as tiles, then "Picked for your interests" and "Continue exploring" (saved or started).

**Six categories**
- **Digital Skills:** smartphone basics, digital payments (UPI), online safety and fraud awareness, useful apps, video calling, digital navigation.
- **Health Awareness:** nutrition, sleep and wellbeing, understanding common health measurements, preventive care, mental wellbeing, safe physical activity. *Educational content, not medical advice.*
- **Everyday Life Skills:** banking and financial awareness, travel planning, public transport and navigation, personal safety, consumer awareness, everyday problem-solving.
- **Hobbies and Interests:** music, painting and crafts, gardening, cooking, photography, reading and writing.
- **Culture and Discovery:** Indian and Singaporean heritage, languages and literature, traditions, travel and geography, art and architecture, stories from different communities.
- **Knowledge and Curiosity:** science and technology, nature, history, space, interesting ideas, general knowledge.

**Formats** (the person picks what is comfortable): short guide, video, interactive tutorial, story, audio, activity, visual explanation, step-by-step experience. Each item shows its time and format (for example "8 min, Video", "Practical guide, 8 minutes") and language.

## The seven essential Explore screens
1. **Explore Home:** search, categories, discovery feed (sample screen 2).
2. **Category page:** all content in a category, with filter chips (All, Basics, Daily Use, Safety) (sample 3).
3. **Content Detail:** ONE screen that adapts to the format (video, guide, story, audio, tutorial): title, time, difficulty, language, "What you will learn", Start (sample 4).
4. **Interactive Experience:** a safe practice with steps, using demo values only, for example "Scan and Pay (Practice)" (sample 5).
5. **My Interests:** tick the interests to see more of; Save Interests (sample 9).
6. **Saved Content:** bookmarks to revisit.
7. **My Exploration:** In Progress, Completed, Saved; milestones as gentle counts (topics explored, completed, new habit) (sample 10).

No separate apps for video, audio and guides. No separate Explore assistant.

## The other Grow screens in the sample
- **Aspirations** (sample 6): "It's never too late to pursue what you love." Rows: Travel and Explore, Take Up a Hobby, Stay Healthy and Active, Spend Time with Family, Something of My Own; **Add an Aspiration**.
- **My Progress** (sample 7): tabs Overview, Health, Activity, Aspirations; an encouraging line ("You're making great progress!"); a trend chart; small cards (Health +12%, Activity +26%, Aspirations 2/3); "Keep going".
- **Health** (sample 8): tabs Overview, Activity, Records; a Health Score ring and its monthly change; heart rate, sleep, weight, blood pressure; "Your health is improving". Not a medical device; no diagnosis, no medical claims.

## Where things belong: Explore or Connect
Explore helps **individuals discover**. Connect helps **communities organise and participate**. The same topic can appear on both sides.

| Experience | Belongs to |
|---|---|
| Learn how to use digital payments | Grow, Explore |
| A community digital-literacy workshop | Connect, Community |
| Discover gardening techniques | Grow, Explore |
| Organise a community gardening programme | Connect, Community |
| Understand nutrition | Grow, Explore |
| Organise a community health camp | Connect, Community |
| Discover traditional storytelling | Grow, Explore |
| An intergenerational storytelling event | Connect, Community |

Explore items can link to a related community activity ("Join a gardening session near you"), and a community event can link to an Explore guide. This is the bridge that makes Bricks one product.

## How the Bricks Agent fits
The agent stays the single pinned voice bar. Examples: "I want to learn how to use online banking." "Show me some gardening ideas." "Explain this in simple Bengali." "Teach me Google Maps." "Find something interesting about Indian history." The agent opens the right Explore page, or shows a short interactive explanation in the Agent Canvas (see `../06-technical/agent-canvas-spec.md`). It reads what is on screen through `usePageData` (see `../06-technical/ui-build-spec.md`), never from memory.

## Content and build scope (do not build thousands of courses)
**MVP:** 6 categories; 5 to 10 quality items per category; formats guide, video and interactive; search and bookmarks; display in the person's language; a simple personal exploration history; Bricks Agent integration. Content comes from suitable existing open or licensed resources (credit and link them) plus original Bricks material. Every item has a source, a language and a reviewer. **Later:** community-contributed resources, expert-reviewed material, personalised recommendations.

## Data and backend (new, small)
`explore_categories`, `explore_items` (id, category, format, title, summary, body or media URL, minutes, level, language, source, status, reviewed_by), `explore_translations` (reuses the translation engine), `user_interests` (already planned), `explore_saved` (user, item), `explore_progress` (user, item, state, last_position). Health values and aspirations are private to the person; `aspirations` and `aspiration_steps` replace the earlier `goals` idea. Nothing from Grow is shown to a community unless the person chooses (My Contributions shows only what the person gave).

## Rules
- No hard-coded sample content in the app: unbuilt screens show "Coming soon" until their data exists.
- Health content is educational; every health screen says it is not medical advice. No diagnosis, no claims.
- Practice screens use demo values only (never real payment, never real card data).
- Real names and realistic Singapore and India examples; six languages as everywhere.
- Singapore and India both: examples and categories must work for either (UPI and PayNow, DigiLocker and Singpass are named, not integrated).

## Build order
1. New Grow home with the six cards (rows "Coming soon" until built).
2. Explore Home, Category, Content Detail with a small seeded library (data in the database, not in the app).
3. My Interests, Saved, My Exploration.
4. Interactive Experience (one: UPI practice).
5. Aspirations, then Activity and Health (needs device or manual entry decisions), then My Progress and My Contributions.
After each step: type-check, self-test, a browser check, a PROGRESS entry.
