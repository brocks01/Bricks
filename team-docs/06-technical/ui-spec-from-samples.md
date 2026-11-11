# UI behaviour taken from the samples (draft, for the developer team)

Source: the two images in `../05-design/ui-samples/`. Only what is visible in them; nothing here is approved. Items under "To confirm" differ from our earlier documents.

## Layout seen
- **Header:** the Bricks logo and name, a bell (notifications) and the person's photo.
- **Greeting:** "Good morning, Ankit" and, under it, the community name with its member count ("Lakeview Residency, 128 members").
- **Community goal card:** title, a progress bar and the numbers ("72 km / 100 km (72%)").
- **"What's happening":** a list of event cards, each with a photo, title, date and time, place and a green "Join" button; a "See all" link.
- **Bottom navigation, five tabs:** Home, Community, Events, Goals, Me.
- **Create Event form:** title, date, time, location (each as a field with an icon) and a green "Create Event" button.
- **Confirmation:** a green banner "Event created!" with the event details; the new event appears in the list marked "Added".

## The voice agent (the important part)
Five states of one app:
1. **Normal app:** no agent open.
2. **Keyboard mode:** a message field with a send button and the keyboard; the person can type.
3. **Voice agent listening:** the keyboard area becomes a small "Bricks Agent" bar (waveform, status "Listening...", a red end button and an expand arrow) **above the bottom navigation**. The app stays fully usable.
4. **Agent controlling the UI:** the agent fills the form and presses the button while the person watches live (status "Creating the event...").
5. **Result:** the full app shows the outcome. No typing and no agent panel are needed.

So voice is not a separate chat screen. It is a **persistent bar that drives the real screens**, which needs: a command layer that can fill fields and press buttons by name, the one map of places, and a visible status line.

## Languages
- Choose Language screen lists: English (default), Hindi, Bengali, Tamil, Chinese, Bahasa Melayu.
- The whole interface, including menu labels, events and goals, appears in the chosen language; the agent understands and speaks several languages (the sample shows a Hindi request creating a Friday 6 pm yoga session).
- Needs: language files for all interface text; machine translation for community-written content (events, goals) or a clear rule that user text stays as written; a language switch in Settings at any time.

## To confirm (differences from our earlier documents)
1. **Tabs:** the sample has five tabs (Home, Community, Events, Goals, Me); our earlier plan had four (Community, Events, Me, Help). With the agent bar, "Help" is not a tab.
2. **Home vs Community:** the sample separates a personal **Home** from a **Community** tab; our earlier plan had one community home.
3. **Languages:** Bengali is in the sample; our earlier list was English, Malay, Mandarin, Tamil, Hindi.
4. **Emoji and photos:** the sample uses a waving-hand emoji and photographs; our earlier design rule was no emoji and no stock photos.
5. **"All content translates instantly"** implies machine translation of user content, which costs money and can be wrong.
6. **Speech** needs a development build; it does not work fully in Expo Go (to verify).
