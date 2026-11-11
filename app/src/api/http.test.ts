import { NetworkError } from './errors';
import { request, setAuthTokenProvider } from './http';

jest.mock('@/lib/config', () => ({ config: { apiUrl: 'https://api.example.test' } }));

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => fetchMock.mockReset());

it('sends the signed-in member token with every request', async () => {
  setAuthTokenProvider(async () => 'token-123');
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'u1' }) });
  await expect(request('/me')).resolves.toEqual({ id: 'u1' });
  const [url, init] = fetchMock.mock.calls[0]!;
  expect(url).toBe('https://api.example.test/me');
  expect(init.headers).toMatchObject({ Authorization: 'Bearer token-123' });
});

it('sends uploads as multipart, without a JSON content type', async () => {
  setAuthTokenProvider(async () => null);
  fetchMock.mockResolvedValue({ ok: true, status: 204 });
  const body = new FormData();
  body.append('kind', 'voice');
  await request('/endorsements', { method: 'POST', body });
  const [, init] = fetchMock.mock.calls[0]!;
  expect(init.body).toBe(body);
  expect(init.headers['Content-Type']).toBeUndefined();
  expect(init.headers.Authorization).toBeUndefined();
});

it('no connection becomes a NetworkError, shown in plain words', async () => {
  fetchMock.mockRejectedValue(new TypeError('Network request failed'));
  await expect(request('/events')).rejects.toBeInstanceOf(NetworkError);
});
