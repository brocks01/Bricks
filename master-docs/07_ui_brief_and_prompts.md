# 07. UI brief and image prompts

Purpose: Ankit will generate sample screens with ChatGPT's image tool and give them to the builder as the visual target. One image per screen; keep all of them consistent.

## Ask ChatGPT
"Using the style block, generate one mobile app screen image per prompt below, one at a time, keeping the look identical across all screens. Show text exactly as written."

## Style block (paste first, every time)
```
Mobile app UI screen, flat, minimal, clean. Portrait, 1170 x 2532, a flat screenshot with no phone frame or device mockup. Warm off-white background (#FBFAF7), white cards with thin light-grey borders and 16 px rounded corners, deep green accent (#0F6E56) with soft green tint (#E1F5EE). Very large readable sans-serif text (body about 18 to 20 px at phone size), high contrast, generous spacing, buttons at least 52 px tall. No emoji, no gradients, no 3D, no stock photos, no robot illustrations. Calm, trustworthy neighbourhood app for all ages. Sample names only: Mr Tan, Mdm Lim, Mr Raj, Mdm Aisha. Bottom bar on main screens: Community, Events, Me, Help (text labels only).
```

## Screens
1. **Welcome:** the word "Bricks" large and centred, one line "Your neighbourhood, run by you", two big buttons: "Get started" (green) and "I have an invite code" (outline). No bottom bar.
2. **Sign in:** title "Your email", one large email field, a green button "Send me a code", a small line "We will email a 6-digit code. No password."
3. **Enter code:** title "Check your email", six large digit boxes, a green "Continue" button, a text link "Send a new code".
4. **Profile setup:** title "About you", a name field, a language choice (English, Bahasa Melayu, Chinese, Tamil, Hindi) as large selectable rows, an age group choice (under 40, 40 to 59, 60 and over) as large chips, a green "Next" button.
5. **Join a community:** title "Join your community", a large field "Invite code" with a green "Join" button, then a card "Communities near you" with two communities, each with name, distance in metres, member count and a "View" button.
6. **Community home:** community name and "42 members". Card "What we are building together" with a progress bar "8 of 20 things fixed". Card "Today for you" with two short lines. Card "Next event" with title, time, place and "I'm going". Card "People and their responsibilities" with four people, their role and "Term ends Jun 2027".
7. **People and roles:** title "Roles this year". Each role is a card with the role name, the holder, term dates, a "1 of 2 terms" label. A note "Leaders are chosen by members and approved by Bricks." A button "Nominate someone".
8. **Events list:** title "Events". A segmented control "Coming up | Past". Three event cards with title, day, time, place, "3 of 15 going" and a green "I'm going" button.
9. **Event detail:** event title, host with their role, time, place with a small map card, a description, "3 of 15 going" with small avatar circles, a large green "I'm going" button, and below it a button "Check in" with a QR-style graphic.
10. **Log a contribution:** title "What did you do?", a large text field, a "How many" stepper, an optional "Part of which goal" picker, a "Who can confirm" picker, a green "Save" button.
11. **Me:** title "Me", note "Only you can see this". Card "My goals" with two goals and progress bars, card "My week" with a seven-bar chart (M to S), a button "Log a walk". Small note "Sample numbers. Not medical advice."
12. **Help (voice):** title "Help". A very large round green microphone button in the middle labelled "Tap and say where to go". Below it three chips: "Open events", "My goals", "Read this to me".

## Later screens (not yet prompted)
Create community, notices, goals editor, notifications inbox, settings and privacy ("who sees what"), season league table, sponsor offer, community fund (records only), role nomination and endorsement, services list.

## After generating
Save the images as `01-welcome.png`, `02-sign-in.png` and so on, and tell the builder which image matches which screen.
