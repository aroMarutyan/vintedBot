import { BASE_URL, HEADERS } from '../config/url-config.js';

export async function getSessionCookie() {
  const response = await fetch(BASE_URL, { headers: HEADERS, redirect: 'manual' });
  const setCookieHeader = response.headers.get('set-cookie') || '';
  const sessionCookie = extractSessionCookie(setCookieHeader);

  if (!sessionCookie) {
    throw new Error('Session cookie not found in response');
  }

  return sessionCookie;
}

function extractSessionCookie(setCookieHeader) {
  const match = setCookieHeader.match(/_vinted_fr_session=([^;]+)/);
  return match ? `_vinted_fr_session=${match[1]}` : null;
}
