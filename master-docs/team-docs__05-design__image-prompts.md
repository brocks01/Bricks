# Image prompts for sample screens (for ChatGPT or any image tool)

Use the **style block** at the start of every prompt so the screens look like one app. Generate one screen per image.

## Style block (paste first)
```
Mobile app UI design, flat, minimal, clean. Portrait phone screen, 1170 x 2532, shown as a flat screenshot with no phone frame and no device mockup. Warm off-white background (#FBFAF7), white cards with thin light-grey borders and rounded corners, deep green accent colour (#0F6E56) with a soft green tint (#E1F5EE). Very large, readable sans-serif text (body 18 to 20 px at phone size), high contrast, generous spacing, big tap targets. A bottom bar with four labelled tabs: Community, Events, Me, Help (text labels, no icons, no emoji). No gradients, no 3D, no glossy effects, no stock-photo look, no illustrations of robots. Looks like a calm, trustworthy neighbourhood app for all ages. Sample names only: Mr Tan, Mdm Lim, Mr Raj, Mdm Aisha.
```

## Screens
1. **Community home**: "Maple Court Residents (sample)", "Sample Estate, 42 members". A card "What we are building together" with a green progress bar "8 of 20 things fixed". A card "Today for you" with two short lines. A card "People and their responsibilities" listing Lead Mr Tan, Events Mdm Lim, Finance Mr Raj, Culture Mdm Aisha with "Term ends Jun 2027".
2. **Events**: title "Events". Three event cards (Fix-it morning Sat 9:00, Evening walk Daily 18:00, Story circle Sun 16:00), each with place, "3 of 15 going" and a large green button "I'm going".
3. **Roles and terms**: title "Roles this year". A list of roles with the holder, the term end date and a small "1 of 2 terms" label. A card "Nominate someone" with a large button. A note "Leaders are chosen by members and approved by Bricks."
4. **Me (goals and week)**: title "Me", subtitle "Only you can see this". A card "My goals" with two goals and progress bars. A card "My week" with a simple seven-bar chart (M to S) in green. A small note "Sample numbers. Not medical advice."
5. **Help (voice)**: title "Help". A very large round green microphone button in the middle with the label "Tap and say where to go". Under it, three example phrases in rounded chips: "Open events", "My goals", "Read this to me".
6. **Join a community**: title "Join your community". A large field "Invite code" and a button "Join". Below, a card "Communities near you" with two nearby communities, distance in metres, and a "View" button.
7. **Season league table (later)**: title "This season". A ranked list of five communities with points and a participation bar for each (percentage of members who took part). The user's own community highlighted in green.
8. **Sponsor offer (later)**: title "Sponsor offer". A card with a local business name, "Offers to support Fix-it morning", an amount, and two large buttons "Accept" and "Decline", with a line "Your community decides. Bricks never holds your money."

## After generating
Put the images in `team-docs/05-design/screens/` with names like `01-community-home.png`, then tell the build agent which image matches which screen.
