"""Buddy's brain, shared by the app, WhatsApp and phone calls (voice iteration 0.2).

The contracts live next to this file so they ship with the API:

- system_prompt.md: who Buddy is and the rules it follows (prompt.py renders it)
- tools.json: what Buddy can do, as Gemini function declarations (tools.py)
- distress.json: words that mean "I need help", checked before the model (distress.py)
- contract.py: the /assistant/turn request and response the app and channels use

Voice iteration 2.1 builds the turn itself (speech -> Gemini tools -> reply) on these.
"""
