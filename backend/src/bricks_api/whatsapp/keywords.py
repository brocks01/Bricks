"""Words that mean something on their own: SOS, STOP / START, Menu, Hi, and areas.

SOS is deterministic (no model in the way): a message that is just "HELP" (in any
of our languages), or that contains a clear distress phrase, starts an SOS.
"Tolong" alone is SOS, but not inside a sentence, because in Malay it also
means "please" ("tolong ingatkan saya").
"""

import difflib
import re

_SOS_WORDS = {
    "help",
    "sos",
    "help me",
    "emergency",
    "tolong",
    "bantu",
    "tolong saya",
    "kecemasan",
    "救命",
    "救救我",
    "帮帮我",
    "求救",
    "உதவி",
    "உதவுங்கள்",
    "காப்பாற்றுங்கள்",
}
_SOS_PHRASES = (
    "i fell",
    "i have fallen",
    "i've fallen",
    "fell down",
    "can't breathe",
    "cannot breathe",
    "chest pain",
    "can't get up",
    "cannot get up",
    "need help now",
    "call ambulance",
    "saya jatuh",
    "sakit dada",
    "tak boleh bernafas",
    "tidak boleh bangun",
    "panggil ambulans",
    "救命",
    "我跌倒",
    "摔倒了",
    "跌倒了",
    "胸口痛",
    "喘不过气",
    "叫救护车",
    "விழுந்துவிட்டேன்",
    "கீழே விழுந்தேன்",
    "நெஞ்சு வலி",
    "மூச்சு விட முடியவில்லை",
)
_STOP = {"stop", "berhenti", "停止", "退订", "நிறுத்து", "unsubscribe"}
_START = {"start", "mula", "mulakan", "开始", "தொடங்கு", "subscribe"}
_MENU = {"menu", "菜单", "மெனு", "help menu", "options"}
_HI = {"hi", "hello", "hey", "join", "start bricks", "hai", "helo", "你好", "您好", "வணக்கம்"}


def _norm(text: str) -> str:
    return re.sub(r"[\s.!?,。！？，]+", " ", text.casefold()).strip()


def is_sos(text: str) -> bool:
    t = _norm(text)
    return t in _SOS_WORDS or any(p in t for p in _SOS_PHRASES)


def is_stop(text: str) -> bool:
    return _norm(text) in _STOP


def is_start(text: str) -> bool:
    return _norm(text) in _START


def is_menu(text: str) -> bool:
    return _norm(text) in _MENU


def is_greeting(text: str) -> bool:
    t = _norm(text)
    return t in _HI or t.startswith(("hi ", "hello "))


# Singapore towns (HDB estates and planning areas members are likely to say),
# with Chinese and Tamil names people may type.
AREAS = [
    "Ang Mo Kio",
    "Bedok",
    "Bishan",
    "Bukit Batok",
    "Bukit Merah",
    "Bukit Panjang",
    "Bukit Timah",
    "Choa Chu Kang",
    "Clementi",
    "Geylang",
    "Hougang",
    "Jurong East",
    "Jurong West",
    "Kallang",
    "Marine Parade",
    "Pasir Ris",
    "Punggol",
    "Queenstown",
    "Sembawang",
    "Sengkang",
    "Serangoon",
    "Tampines",
    "Toa Payoh",
    "Woodlands",
    "Yishun",
    "Tiong Bahru",
    "Little India",
    "Chinatown",
    "City Hall",
    "Bugis",
]
_ALIASES = {
    "宏茂桥": "Ang Mo Kio",
    "勿洛": "Bedok",
    "碧山": "Bishan",
    "武吉巴督": "Bukit Batok",
    "红山": "Bukit Merah",
    "武吉班让": "Bukit Panjang",
    "武吉知马": "Bukit Timah",
    "蔡厝港": "Choa Chu Kang",
    "金文泰": "Clementi",
    "芽笼": "Geylang",
    "后港": "Hougang",
    "裕廊东": "Jurong East",
    "裕廊西": "Jurong West",
    "加冷": "Kallang",
    "马林百列": "Marine Parade",
    "白沙": "Pasir Ris",
    "榜鹅": "Punggol",
    "女皇镇": "Queenstown",
    "三巴旺": "Sembawang",
    "盛港": "Sengkang",
    "实龙岗": "Serangoon",
    "淡滨尼": "Tampines",
    "大巴窑": "Toa Payoh",
    "兀兰": "Woodlands",
    "义顺": "Yishun",
    "中峇鲁": "Tiong Bahru",
    "小印度": "Little India",
    "牛车水": "Chinatown",
    "武吉士": "Bugis",
    "அங் மோ கியோ": "Ang Mo Kio",
    "பீஷான்": "Bishan",
    "தோ பாயோ": "Toa Payoh",
    "ஜூரோங்": "Jurong West",
    "உட்லண்ட்ஸ்": "Woodlands",
    "தெம்பனீஸ்": "Tampines",
    "லிட்டில் இந்தியா": "Little India",
    "செராங்கூன்": "Serangoon",
    "ஈசூன்": "Yishun",
}
_BY_KEY = {a.casefold(): a for a in AREAS}


def match_area(text: str) -> tuple[str | None, bool]:
    """(area, exact). Not exact means "did you mean …?" is worth asking."""
    raw = text.strip()
    if raw in _ALIASES:
        return _ALIASES[raw], True
    key = re.sub(r"\s+", " ", raw.casefold())
    if key in _BY_KEY:
        return _BY_KEY[key], True
    for k, area in _BY_KEY.items():
        if k in key:  # "I stay in Toa Payoh Lor 1"
            return area, True
    close = difflib.get_close_matches(key, _BY_KEY, n=1, cutoff=0.6)
    return (_BY_KEY[close[0]], False) if close else (None, False)
