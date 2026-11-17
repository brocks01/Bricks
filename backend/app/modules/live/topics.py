"""What a change touches, so a screen refetches only what it shows. A topic is the first word of the API path (/v1/calendar/... is "calendar").
The home screen sums up everything, so every change also touches "home"."""
from . import hub

# Writes that say nothing a screen shows (sign-in, the live socket itself, the agent talk, the phone line, translation, uploads).
QUIET = {"auth", "live", "agent", "voice", "translation", "media", "insights", "skills"}

SKILL_TOPICS: dict[str, tuple[str, ...]] = {
    "checkin_today": ("calendar", "health", "home"), "tick_reminder": ("calendar", "home"), "add_reminder": ("calendar", "home"), "cancel_reminder": ("calendar", "home"),
    "schedule_call": ("calendar", "home"), "cancel_scheduled_call": ("calendar", "home"), "allow_reminder_calls": ("calendar",), "stop_calls": ("calendar",),
    "habit_done": ("grow", "health", "home"), "log_walk": ("health", "grow", "home"), "add_goal": ("grow", "home"), "add_goal_step": ("grow", "home"), "close_step": ("grow", "home"),
    "set_vision": ("grow", "home"), "remember_about_me": ("me",),
    "gathering_going": ("communities", "calendar", "home"), "im_here": ("communities", "calendar", "home"), "join_community": ("communities", "home"),
    "leave_community": ("communities", "home"), "market_going": ("market", "calendar", "home"), "take_stall": ("market", "home"),
    "tell_family": ("family",),
}
SKILL_PREFIX_TOPICS = (("wisdom", ("wisdom",)), ("capture_wisdom", ("wisdom",)), ("share_wisdom", ("wisdom",)), ("unshare_wisdom", ("wisdom",)), ("offer_", ("wisdom",)),
                       ("ask_", ("wisdom",)), ("reply_to_introduction", ("wisdom",)), ("log_wisdom_session", ("wisdom",)), ("pause_offer", ("wisdom",)),
                       ("save_answer", ("me", "onboarding")), ("give_consent", ("me", "onboarding")), ("skip_section", ("me", "onboarding")))


NO_CHANGE = {"show_on_screen"}  # opens a page on the screen; changes nothing the screens show


def for_path(path: str) -> list[str]:
    parts = [p for p in path.split("/") if p]
    if len(parts) < 2 or parts[0] != "v1" or parts[1] in QUIET:
        return []
    return sorted({parts[1], "home"})


def for_skill(name: str) -> list[str]:
    if name in SKILL_TOPICS:
        return sorted({*SKILL_TOPICS[name], "home"})
    for prefix, topics in SKILL_PREFIX_TOPICS:
        if name.startswith(prefix):
            return sorted({*topics, "home"})
    return ["*"]  # a skill we have not listed: the screen refetches everything it shows


def skill_done(user_id: str, name: str, risk: str, result: dict) -> None:
    """Called after a skill finished and its change is saved. Reading changes nothing; a refusal changes nothing."""
    if risk == "read" or name in NO_CHANGE or not isinstance(result, dict) or result.get("error"):
        return
    hub.changed(user_id, for_skill(name))
