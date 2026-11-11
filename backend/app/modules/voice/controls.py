"""The call's own controls, given to the model on EVERY call: it can end the call itself once the person is satisfied, and ask for more time
when the planned time runs low. The rule behind both: a call is never cut under someone who still wants to talk."""
NAMES = ["end_call", "extend_call"]

declarations = [
    {
        "name": "end_call",
        "description": "End the phone call. Call it ONLY after you have said a warm goodbye, and only when the conversation is finished: the person said goodbye or asked to stop, "
                       "or they told you they are done. Never use it while the person still wants to talk or has an open question.",
        "parameters": {"type": "OBJECT", "properties": {"reason": {"type": "STRING", "description": "Why the call is ending, in a few words"}}},
    },
    {
        "name": "extend_call",
        "description": "Ask for a few more minutes. Call it when you were told time is nearly up and the person wants to keep talking.",
        "parameters": {"type": "OBJECT", "properties": {"minutes": {"type": "INTEGER", "description": "About how many minutes to add (optional)"}}},
    },
]

hints = [
    "Call controls (always available): end_call, extend_call.",
    "end_call: when the conversation has naturally finished, or the person says goodbye or asks to stop, first say a warm goodbye in their language, THEN call end_call. "
    'Never end the call while the person still wants to talk. If you are not sure they are finished, ask "shall we stop here?".',
    "extend_call: when you are told the time is nearly up and the person wants to continue, call it. Notes in square brackets that start with \"Call system note\" come from the "
    "call system, not the person: never read them aloud, just act on them. When time is nearly up, say so in a friendly way and ask whether they want to keep going. "
    "Never interrupt someone who is still talking.",
]
