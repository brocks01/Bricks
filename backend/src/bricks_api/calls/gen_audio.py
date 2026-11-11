"""Pre-generate the fixed call prompts as MP3s with Google Cloud Text-to-Speech.

Needs GOOGLE_APPLICATION_CREDENTIALS (a service-account JSON kept outside the repo) or
`gcloud auth application-default login`, with the Text-to-Speech API on. From backend/:

    uv run --with google-cloud-texttospeech python -m bricks_api.calls.gen_audio
    ... --force          regenerate everything
    ... checkin.ask      only these segment ids

Only fixed segments (no {slots}) are generated; the rest is spoken live.
"""

import argparse

from .audio import AUDIO_DIR, LANGS, VOICES, audio_path
from .prompts import fixed_ids, segment

# A little slower for older callers: calm, unhurried.
SPEAKING_RATE = 0.9


def main() -> None:
    from google.cloud import texttospeech  # type: ignore[attr-defined, import-not-found, import-untyped, unused-ignore]

    parser = argparse.ArgumentParser()
    parser.add_argument("prompts", nargs="*", help="segment ids (default: every fixed one)")
    parser.add_argument("--force", action="store_true", help="overwrite existing files")
    args = parser.parse_args()

    AUDIO_DIR.mkdir(exist_ok=True)
    client = texttospeech.TextToSpeechClient()
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3, speaking_rate=SPEAKING_RATE
    )
    for prompt_id in args.prompts or fixed_ids():
        for lang in LANGS:
            out = audio_path(prompt_id, lang)
            if out.exists() and not args.force:
                print(f"skip  {out.name}")
                continue
            resp = client.synthesize_speech(
                input=texttospeech.SynthesisInput(text=segment(prompt_id, lang).text),
                voice=texttospeech.VoiceSelectionParams(language_code=VOICES[lang].tts_language),
                audio_config=audio_config,
            )
            out.write_bytes(resp.audio_content)
            print(f"wrote {out.name} ({len(resp.audio_content)} bytes)")


if __name__ == "__main__":
    main()
