"""Phone audio. A phone line carries 8 kHz mu-law (one byte per sample); the live model listens to 16 kHz PCM16 and speaks 24 kHz PCM16.
One PhoneAudio per call: its filters keep state between chunks (resetting at each piece leaves a click at every seam)."""
import audioop  # built in on Python 3.11/3.12; on 3.13+ install audioop-lts (see requirements.txt)

import numpy as np


def _lowpass(cutoff_hz: float, rate_hz: float, taps: int) -> np.ndarray:
    """Windowed-sinc low-pass taps, normalised to unity gain at DC."""
    fc = cutoff_hz / rate_hz
    m = taps - 1
    n = np.arange(taps)
    x = n - m / 2
    with np.errstate(divide="ignore", invalid="ignore"):
        sinc = np.where(x == 0, 2 * fc, np.sin(2 * np.pi * fc * x) / (np.pi * x))
    window = 0.54 - 0.46 * np.cos(2 * np.pi * n / m)
    h = sinc * window
    return h / h.sum()


class Decimator:
    """24 kHz -> 8 kHz: low-pass at 3.4 kHz (a phone band), then keep every 3rd sample, across chunk boundaries."""

    def __init__(self, factor: int = 3, rate_hz: float = 24000, cutoff_hz: float = 3400, taps: int = 47):
        self.factor, self.taps = factor, taps
        self.h = _lowpass(cutoff_hz, rate_hz, taps)
        self.hist = np.zeros(taps - 1)
        self.skip = 0

    def process(self, x: np.ndarray) -> np.ndarray:
        buf = np.concatenate([self.hist, x.astype(np.float64)])
        y = np.convolve(buf, self.h, mode="full")  # y[p] = sum_k h[k] * buf[p-k]
        start = self.taps - 1 + self.skip
        idx = np.arange(start, len(buf), self.factor)
        out = np.clip(np.rint(y[idx]), -32768, 32767).astype(np.int16)
        nxt = (idx[-1] + self.factor) if len(idx) else start
        self.skip = int(nxt - len(buf))
        self.hist = buf[len(buf) - (self.taps - 1):]
        return out


class PhoneAudio:
    def __init__(self):
        self._up_state = None
        self._down = Decimator()

    def from_phone(self, mulaw: bytes) -> bytes:
        """8 kHz mu-law -> 16 kHz PCM16 little-endian (what the model listens to)."""
        pcm8 = audioop.ulaw2lin(mulaw, 2)
        pcm16, self._up_state = audioop.ratecv(pcm8, 2, 1, 8000, 16000, self._up_state)
        return pcm16

    def to_phone(self, pcm24k: bytes) -> bytes:
        """24 kHz PCM16 -> 8 kHz mu-law (what the phone line plays)."""
        x = np.frombuffer(pcm24k[: len(pcm24k) // 2 * 2], dtype="<i2")
        return audioop.lin2ulaw(self._down.process(x).astype("<i2").tobytes(), 2)

    @staticmethod
    def frames(mulaw: bytes, size: int = 160) -> list[bytes]:
        """A phone line plays 8000 samples a second, one byte each: 160 bytes is 20 ms."""
        return [mulaw[i:i + size] for i in range(0, len(mulaw), size)]
