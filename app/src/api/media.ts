import { apiBase } from '../api/client';
import { getAccessToken, freshToken } from '../session/store';
export async function uploadVoiceIntro(uri: string): Promise<{ url: string }> {
  const token = (await freshToken()) ?? getAccessToken();
  const form = new FormData();
  if (uri.startsWith('blob:') || uri.startsWith('http')) {
    const res = await fetch(uri);
    const blob = await res.blob();
    form.append('file', blob, uri.endsWith('.webm') ? 'voice.webm' : 'voice.m4a');
  } else {
    form.append('file', { uri, name: 'voice.m4a', type: 'audio/m4a' } as any);
  }
  form.append('kind', 'voice_intro');
  const r = await fetch(apiBase() + '/v1/media/upload', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw { status: r.status, code: (data as any)?.detail?.code ?? 'generic' };
  return data as { url: string };
}