// Voice in the browser: the microphone goes up as 16 kHz PCM16, the agent's voice comes down as 24 kHz PCM16 and is played back to back.
// On a phone this needs a development build (not Expo Go), so audio.ts reports "not available" there and the agent works by text.

export const audioAvailable = (): boolean => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof AudioContext !== 'undefined';

const WORKLET = `class Tap extends AudioWorkletProcessor { process(inputs){ const c = inputs[0] && inputs[0][0]; if (c) this.port.postMessage(c.slice(0)); return true; } } registerProcessor('tap', Tap);`;

const b64 = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

let ctx: AudioContext | null = null;
let stream: MediaStream | null = null;
let node: AudioWorkletNode | null = null;
let nextAt = 0;
let sources: AudioBufferSourceNode[] = [];

/** Starts the microphone. `onChunk` gets about 100 ms of 16 kHz PCM16 (base64) at a time. Throws if the person says no. */
export async function startMic(onChunk: (b64pcm: string) => void): Promise<void> {
  ctx = ctx ?? new AudioContext();
  if (ctx.state === 'suspended') await ctx.resume();
  stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
  const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
  await ctx.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);
  const src = ctx.createMediaStreamSource(stream);
  node = new AudioWorkletNode(ctx, 'tap');
  const ratio = ctx.sampleRate / 16000;
  let carry: number[] = [];
  node.port.onmessage = (e: MessageEvent<Float32Array>) => {
    // Average each group of input samples down to one 16 kHz sample (the browser rate is usually 44.1 or 48 kHz).
    const x = carry.length ? Float32Array.from([...carry, ...e.data]) : e.data;
    const n = Math.floor(x.length / ratio);
    const out = new Int16Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.floor(i * ratio);
      const z = Math.max(a + 1, Math.floor((i + 1) * ratio));
      let sum = 0;
      for (let k = a; k < z; k++) sum += x[k];
      out[i] = Math.max(-1, Math.min(1, sum / (z - a))) * 32767;
    }
    carry = Array.from(x.slice(Math.floor(n * ratio)));
    pending.push(out);
    pendingLen += n;
    if (pendingLen >= 1600) {
      const all = new Int16Array(pendingLen);
      let o = 0;
      for (const p of pending) { all.set(p, o); o += p.length; }
      pending = [];
      pendingLen = 0;
      onChunk(b64(new Uint8Array(all.buffer)));
    }
  };
  let pending: Int16Array[] = [];
  let pendingLen = 0;
  src.connect(node);
  // A browser only runs an audio node that leads to the speakers, so the microphone tap goes through a muted gain to the output:
  // the graph stays alive and nothing the microphone hears is played back.
  const sink = ctx.createGain();
  sink.gain.value = 0;
  node.connect(sink);
  sink.connect(ctx.destination);
}

export function stopMic(): void {
  node?.disconnect();
  node = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

/** Plays 24 kHz PCM16 (base64), queued right after whatever is already playing. */
export function playPcm24k(data: string): void {
  ctx = ctx ?? new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  const bin = atob(data);
  const n = Math.floor(bin.length / 2);
  const buf = ctx.createBuffer(1, n, 24000);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const v = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8);
    ch[i] = (v > 32767 ? v - 65536 : v) / 32768;
  }
  const s = ctx.createBufferSource();
  s.buffer = buf;
  s.connect(ctx.destination);
  nextAt = Math.max(nextAt, ctx.currentTime + 0.03);
  s.start(nextAt);
  nextAt += buf.duration;
  sources.push(s);
  s.onended = () => {
    sources = sources.filter((x) => x !== s);
  };
}

/** The person spoke over the agent: drop what is still queued. */
export function stopPlayback(): void {
  sources.forEach((s) => {
    try { s.stop(); } catch { /* already over */ }
  });
  sources = [];
  nextAt = 0;
}

export const isSpeaking = (): boolean => sources.length > 0;
