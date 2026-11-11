"""Voice clips in Supabase Storage (intros, thank-yous, stories).

Clips go in one public bucket under unguessable names: they're played on
profiles other members open, so a plain URL keeps playback simple and fast.
"""

import secrets

import httpx
from fastapi import HTTPException, UploadFile

from .config import Settings

MAX_AUDIO_BYTES = 5 * 1024 * 1024  # ~5 minutes of AAC; clips are 10-60 s
AUDIO_TYPES = {
    "audio/m4a": "m4a",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/aac": "aac",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
}


class Storage:
    def __init__(self, settings: Settings, client: httpx.AsyncClient) -> None:
        self._base = settings.supabase_url.rstrip("/") + "/storage/v1"
        self._bucket = settings.storage_bucket
        key = settings.supabase_secret_key.get_secret_value()
        self._headers = {"apikey": key, "Authorization": f"Bearer {key}"}
        self._client = client

    def public_url(self, path: str) -> str:
        return f"{self._base}/object/public/{self._bucket}/{path}"

    async def ensure_bucket(self) -> None:
        r = await self._client.post(
            f"{self._base}/bucket",
            headers=self._headers,
            json={
                "id": self._bucket,
                "name": self._bucket,
                "public": True,
                "file_size_limit": MAX_AUDIO_BYTES,
                "allowed_mime_types": sorted(set(AUDIO_TYPES)),
            },
        )
        # An existing bucket comes back as 400/409 "already exists": that's fine.
        exists = r.status_code == 409 or "already exists" in r.text.lower()
        if r.status_code >= 300 and not exists:
            r.raise_for_status()

    async def put_fixed(self, path: str, data: bytes, content_type: str) -> str:
        """Uploads to a fixed path, replacing what's there (seed audio)."""
        r = await self._client.post(
            f"{self._base}/object/{self._bucket}/{path}",
            headers={**self._headers, "Content-Type": content_type, "x-upsert": "true"},
            content=data,
        )
        r.raise_for_status()
        return self.public_url(path)

    async def put(self, folder: str, data: bytes, content_type: str) -> str:
        ext = AUDIO_TYPES.get(content_type, "m4a")
        path = f"{folder}/{secrets.token_urlsafe(16)}.{ext}"
        r = await self._client.post(
            f"{self._base}/object/{self._bucket}/{path}",
            headers={**self._headers, "Content-Type": content_type, "x-upsert": "false"},
            content=data,
        )
        if r.status_code >= 300:
            raise HTTPException(502, "Couldn't save the recording. Please try again.")
        return self.public_url(path)


async def read_audio(upload: UploadFile) -> tuple[bytes, str]:
    """The uploaded recording's bytes and type, after size and type checks."""
    content_type = (upload.content_type or "audio/m4a").split(";")[0].strip().lower()
    if content_type not in AUDIO_TYPES:
        raise HTTPException(415, "That isn't a recording we can play.")
    data = await upload.read(MAX_AUDIO_BYTES + 1)
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "That recording is too long.")
    if not data:
        raise HTTPException(422, "The recording is empty.")
    return data, content_type
