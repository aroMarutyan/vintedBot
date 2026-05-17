import { SEARCH_URL, HEADERS } from '../config/url-config.js';
import { ERROR_SEARCHES_ARRAY, createErrorSearchEntry } from './api-call-error-handler.service.js';

export async function firstCall(search, sessionCookie) {
  const url = buildURL(search);
  try {
    const res = await fetchSearchResults(url, search.alias, sessionCookie);
    return res.items || [];
  } catch(e) {
    console.log('First call failed', e);
    const errorEntry = createErrorSearchEntry(search.alias, 'first call');
    ERROR_SEARCHES_ARRAY.push(errorEntry);
    return [];
  }
}

async function fetchSearchResults(url, searchAlias, sessionCookie) {
  const headers = new Headers(HEADERS);
  if (sessionCookie) {
    headers.append('Cookie', sessionCookie);
  }

  const rawResults = await fetch(url, { headers });
  if (rawResults.ok) {
    const jsonResults = await rawResults.json();
    return jsonResults;
  } else {
    const errorText = `Fetch call for search ${searchAlias} failed with STATUS: ${rawResults.status}`;
    console.log(errorText);
    const errorEntry = createErrorSearchEntry(searchAlias, 'fetch', rawResults.status);
    ERROR_SEARCHES_ARRAY.push(errorEntry);
    throw new Error(errorText);
  }
}

function buildURL(search, page = 1) {
  const url = new URL(SEARCH_URL);
  
  url.searchParams.append('search_text', search.searchTerm);
  url.searchParams.append('order', 'newest_first');
  url.searchParams.append('per_page', '96');
  url.searchParams.append('page', String(page));
  url.searchParams.append('catalog_ids', '');
  url.searchParams.append('size_ids', '');
  url.searchParams.append('brand_ids', '');
  url.searchParams.append('color_ids', '');
  url.searchParams.append('material_ids', '');
  url.searchParams.append('global_search_session_id', crypto.randomUUID());

  search.minPrice && url.searchParams.append('price_from', search.minPrice);
  search.maxPrice && url.searchParams.append('price_to', search.maxPrice);

  const statusIdsArray = Array.from(search.statusIds || []);
  url.searchParams.set('status_ids', statusIdsArray[0] !== '' ? statusIdsArray.join(',') : '');

  return url;
}
