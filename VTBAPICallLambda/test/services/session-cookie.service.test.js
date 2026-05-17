import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSessionCookie } from '../../src/services/session-cookie.service.js';

describe('session-cookie-service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('extracts and returns the session cookie from the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: new Headers({
        'set-cookie': '_vinted_fr_session=abc123xyz; path=/; secure; HttpOnly'
      })
    });
    vi.stubGlobal('fetch', fetchMock);

    const cookie = await getSessionCookie();

    expect(cookie).toBe('_vinted_fr_session=abc123xyz');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toBe('https://www.vinted.es');

    const calledOptions = fetchMock.mock.calls[0][1];
    expect(calledOptions.redirect).toBe('manual');
  });

  it('throws when session cookie is not found in response headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: new Headers({})
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getSessionCookie()).rejects.toThrow('Session cookie not found in response');
  });

  it('throws when set-cookie header does not contain the expected cookie name', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: new Headers({
        'set-cookie': 'other_cookie=value; path=/'
      })
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getSessionCookie()).rejects.toThrow('Session cookie not found in response');
  });

  it('propagates network errors from fetch', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getSessionCookie()).rejects.toThrow('ECONNREFUSED');
  });
});
