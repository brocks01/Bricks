"""Translation providers: one small interface, three implementations, tried in the order in settings
(TRANSLATE_PROVIDERS, default "gemini,google,local").

The keys stay here on the server, read from the environment (backend/.env is never committed and never read
for its values): GEMINI_API_KEY for Gemini, GOOGLE_TRANSLATE_API_KEY for Google Cloud Translation,
LOCAL_TRANSLATE_URL for the owner's self-hosted engine. Nothing in this file logs a key, a URL that carries
one, or the text of what a member wrote.

Rules every provider keeps:
  * `detect` and `translate` take a list and answer a list of the SAME length, in the same order.
  * A failure raises ProviderError. The caller then moves to the next provider; a provider never answers
    with a short list quietly (the caller checks the length and retries one item at a time).
  * `pairs` is None when the provider handles every language pair by itself; otherwise the caller goes
    through English.
"""
import json
import os
from typing import Protocol

import httpx

from ...core.config import get_settings

GEMINI_HOST = "https://generativelanguage.googleapis.com/v1beta"
GOOGLE_TRANSLATE = "https://translation.googleapis.com/language/translate/v2"

# The six languages the app offers, plus two the owner may offer later. A detected language outside this
# list is still stored and still translated (the cache key is a pair of language codes, not a menu).
LANGS = ("en", "hi", "bn", "ta", "zh", "ms", "te", "mr")
OFFERED = ("en", "hi", "bn", "ta", "zh", "ms")
LANG_NAMES = {"en": "English", "hi": "Hindi", "bn": "Bengali", "ta": "Tamil", "zh": "Chinese",
              "ms": "Malay", "te": "Telugu", "mr": "Marathi"}


class ProviderError(Exception):
    """A provider failed: timeout, quota, refused, or an answer we cannot use. The caller tries the next one.
    `code` is ours, never the provider's own words about an account (they can name it)."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


# Failures worth repeating one item at a time (a single awkward string broke the whole batch).
# A timeout or a quota is not: repeating it would just cost the same wait 40 times over.
RETRYABLE = ("bad_answer", "length")


class Provider(Protocol):
    name: str
    pairs: frozenset[tuple[str, str]] | None

    def detect(self, texts: list[str]) -> list[str]: ...

    def translate(self, texts: list[str], source: str | None, target: str) -> list[str]: ...


def _post(url: str, *, json_body: dict | None = None, params: dict | None = None,
          headers: dict | None = None, timeout: float = 15.0) -> dict:
    """One POST, one shape of failure. The caller never sees httpx's exceptions or the provider's own words
    about an account (they can name it)."""
    try:
        r = httpx.post(url, json=json_body, params=params, headers=headers, timeout=timeout)
    except httpx.HTTPError as e:
        raise ProviderError("unreachable") from e
    if r.status_code >= 300:
        raise ProviderError(f"http_{r.status_code}")
    try:
        return r.json()
    except ValueError as e:
        raise ProviderError("bad_answer") from e


def _rows(data, path: tuple[str, ...], n: int) -> list[dict]:
    """Pull a list of exactly n objects out of a provider's answer, or refuse."""
    node = data
    for key in path:
        if not isinstance(node, dict) or key not in node:
            raise ProviderError("bad_answer")
        node = node[key]
    if not isinstance(node, list) or len(node) != n or not all(isinstance(x, dict) for x in node):
        raise ProviderError("bad_answer")
    return node


def _check(got: list[str], sent: int) -> list[str]:
    if len(got) != sent:
        raise ProviderError("length")
    return got


class GeminiProvider:
    """Gemini Flash over the same Generative Language API the agent and the phone call use (same key).
    Strict JSON: an array of strings, the same length and order as the array we sent."""

    name = "gemini"
    pairs = None  # Gemini covers every pair we offer

    def __init__(self, key: str, model: str, timeout: float):
        self.key, self.timeout = key, timeout
        self._model = model

    def _schema(self, enum: list[str] | None = None) -> dict:
        item: dict = {"type": "STRING"}
        if enum:
            item["enum"] = enum
        return {"type": "ARRAY", "items": item}

    def _ask(self, system: str, payload: str, enum: list[str] | None) -> list[str]:
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": payload}]}],
            "generationConfig": {"temperature": 0, "responseMimeType": "application/json",
                                 "responseSchema": self._schema(enum)},
        }
        data = _post(f"{GEMINI_HOST}/models/{self._model}:generateContent",
                     json_body=body, headers={"x-goog-api-key": self.key}, timeout=self.timeout)
        try:
            parts = data["candidates"][0]["content"]["parts"]
            raw = "".join(str(p.get("text") or "") for p in parts)
            out = json.loads(raw)
        except (KeyError, IndexError, TypeError, ValueError) as e:
            raise ProviderError("bad_answer") from e
        if not isinstance(out, list) or not all(isinstance(x, str) for x in out):
            raise ProviderError("bad_answer")
        return out

    def translate(self, texts: list[str], source: str | None, target: str) -> list[str]:
        from_name = LANG_NAMES.get(source, source) if source else "whatever language each string is written in"
        to_name = LANG_NAMES.get(target, target)
        system = (
            f"You are a translator for Wisdom, an app that connects generations. Translate every string in the JSON array "
            f"you are given from {from_name} into {to_name}.\n"
            "Answer with a JSON array of strings only: the same number of elements, in the same order, no "
            "commentary, no labels, no code fences.\n"
            "Some strings contain markers such as \\ue0000\\ue001. Copy every marker across exactly as it is, "
            "never translate what is inside one, never add or remove a marker. A marker is not a word.\n"
            "Keep line breaks where they are. Keep names, community names and festival names as they are."
        )
        got = self._ask(system, json.dumps(list(texts), ensure_ascii=False), None)
        return _check(got, len(texts))

    def detect(self, texts: list[str]) -> list[str]:
        system = (
            "For each string, say which language it is written in. Answer with a JSON array of ISO 639-1 "
            "language codes only (for example \"en\", \"hi\", \"bn\", \"ta\", \"zh\", \"ms\"), the same number of "
            "elements, in the same order. \"ms\" is Malay and \"en\" is English; both are written in Latin "
            "letters, so look at the words, not the letters."
        )
        got = self._ask(system, json.dumps(list(texts), ensure_ascii=False), list(LANGS))
        return _check(got, len(texts))


class GoogleCloudProvider:
    """Google Cloud Translation v2 over REST (no SDK). The key travels as a query parameter because that is
    how v2 works; it is never written to a log here."""

    name = "google"
    pairs = None

    def __init__(self, key: str, timeout: float):
        self.key, self.timeout = key, timeout

    def translate(self, texts: list[str], source: str | None, target: str) -> list[str]:
        body: dict = {"q": list(texts), "target": target, "format": "text"}
        if source:
            body["source"] = source
        data = _post(GOOGLE_TRANSLATE, json_body=body, params={"key": self.key}, timeout=self.timeout)
        # v2 answers {"data": {"translations": [{"translatedText": "..."}]}}: one object per string sent, in order.
        out = [row.get("translatedText") for row in _rows(data, ("data", "translations"), len(texts))]
        if not all(isinstance(x, str) for x in out):
            raise ProviderError("bad_answer")
        return out

    def detect(self, texts: list[str]) -> list[str]:
        data = _post(f"{GOOGLE_TRANSLATE}/detect", json_body={"q": list(texts)}, params={"key": self.key},
                     timeout=self.timeout)
        rows = (data.get("data") or {}).get("detections") if isinstance(data, dict) else None
        if not isinstance(rows, list) or len(rows) != len(texts):
            raise ProviderError("length")
        out = []
        for row in rows:
            if not isinstance(row, list) or not row or not isinstance(row[0], dict):
                raise ProviderError("bad_answer")
            lang = row[0].get("language")
            if not isinstance(lang, str):
                raise ProviderError("bad_answer")
            out.append(lang)
        return out


class LocalProvider:
    """The owner's own engine (SHRAVANA, an offline mBART service) behind one URL from LOCAL_TRANSLATE_URL.
    Disabled when that setting is empty. Kept deliberately small: one POST, two shapes of answer."""

    name = "local"
    pairs = None

    def __init__(self, url: str, timeout: float):
        self.url, self.timeout = url.rstrip("/"), timeout

    def _ask(self, body: dict, key: str) -> list[str]:
        data = _post(self.url, json_body=body, timeout=self.timeout)
        got = data.get(key) if isinstance(data, dict) else data
        if not isinstance(got, list) or not all(isinstance(x, str) for x in got):
            raise ProviderError("bad_answer")
        return got

    def translate(self, texts: list[str], source: str | None, target: str) -> list[str]:
        return _check(self._ask({"task": "translate", "texts": list(texts), "source": source, "target": target},
                                "translations"), len(texts))

    def detect(self, texts: list[str]) -> list[str]:
        return _check(self._ask({"task": "detect", "texts": list(texts)}, "languages"), len(texts))


def configured() -> list[Provider]:
    """The providers that are actually set up, in the configured order. A provider named in the settings
    without its key is skipped, not an error."""
    s = get_settings()
    timeout = s.translate_timeout_seconds
    out: list[Provider] = []
    for name in (p.strip().lower() for p in s.translate_providers.split(",")):
        if name == "gemini":
            key = (os.environ.get("GEMINI_API_KEY") or "").strip()
            if key:
                out.append(GeminiProvider(key, _model(), timeout))
        elif name == "google":
            if s.google_translate_api_key:
                out.append(GoogleCloudProvider(s.google_translate_api_key, timeout))
        elif name == "local":
            if s.local_translate_url:
                out.append(LocalProvider(s.local_translate_url, timeout))
    return out


_model_cache: str | None = None


def _model() -> str:
    """Which Gemini text model to use. TRANSLATE_MODEL wins when it is set; otherwise pick a Flash text model
    from the account's own model list, so a renamed model never leaves the button dead."""
    global _model_cache
    want = (os.environ.get("TRANSLATE_MODEL") or "").strip()
    if want:
        return want
    if _model_cache:
        return _model_cache
    key = (os.environ.get("GEMINI_API_KEY") or "").strip()
    pick = ""
    try:
        r = httpx.get(f"{GEMINI_HOST}/models", headers={"x-goog-api-key": key},
                      params={"pageSize": 200}, timeout=10)
        if r.status_code < 300:
            for m in r.json().get("models", []):
                name = str(m.get("name") or "").removeprefix("models/")
                methods = m.get("supportedGenerationMethods") or []
                if "generateContent" in methods and "flash" in name and "live" not in name and not name.endswith("-image"):
                    pick = name
                    break
    except (httpx.HTTPError, ValueError):
        pass
    _model_cache = pick or "gemini-2.5-flash"
    return _model_cache
