# UI samples

Sample screens generated with ChatGPT from our prompts, used as the visual target. They are **samples, not final designs**.

| File | What it shows |
|---|---|
| `01-app-states-and-voice-agent.webp` | Five states of the same app: (1) normal app, (2) keyboard mode, (3) voice agent listening as a small bar above the bottom navigation, (4) the agent controlling the screen (filling the Create Event form while the person watches), (5) the result shown full screen ("Event created!"). |
| `02-multilingual.webp` | The same home screen in English, Hindi, Bengali, Tamil and Chinese, a "Choose Language" screen (English, Hindi, Bengali, Tamil, Chinese, Bahasa Melayu), and a spoken conversation in Hindi where the agent creates an event. |

| `03-onboarding-and-three-domains.webp` | The seven-step onboarding (Welcome, Language, Sign up with OTP, Profile, Interests, Choose path, Home), then Connect, Grow and Thrive screens, **Translate on any screen** (a post in Chinese with an English translation and "View original"), and **the agent controlling a form** (Create Event). **Thrive is superseded** (see below). |
| `04-navigation-options.webp` | Home with the community goal and events, and a comparison of four tabs versus three tabs (Connect, Grow, Thrive). **Superseded**: Thrive is removed, see below. Still useful for the Home layout and the Bricks Agent bar. |
| `05-onboarding-and-profile-from-avatar.webp` | Six-step onboarding with Google and Apple sign-in, the four-path "How do you want to start?" screen, and **Profile and settings opened from the avatar** (Edit profile, App language, Translate this screen, Privacy and consent, Settings, Help). |

**What is final and what is superseded (11 Nov 2026):** the architecture is two domains, **Connect and Grow**; there is no Thrive tab. Jobs, referrals, sponsors, earnings, training and services live inside Connect. Samples 03 to 05 were drawn before this decision: follow them for onboarding, the four-path start screen, the profile-from-avatar screen, translation and the agent bar, but not for the Thrive tab. Full decision: `../../02-product/product-architecture.md`.

Developer notes taken from these samples: `../../06-technical/ui-spec-from-samples.md`.
