import { SEARCH_URL, HEADERS } from '../config/url-config.js';
import { ERROR_SEARCHES_ARRAY, createErrorSearchEntry } from './api-call-error-handler.service.js';

const MAX_NEXT_PAGE = 10;

export async function firstCall(search) {
  const url = buildURL(search);
  try {
    const res = await fetchSearchResults(url, search.alias);
    const items = res.items;
    const pagination = res.pagination;
    
    if (items.length >= 1) {
      return items;
    } else if (pagination.current_page < pagination.total_pages) {
      return (await callNextPage(pagination.current_page + 1, search));
    } else {
      return [];
    }
  } catch(e) {
    console.log('First call failed', e);
    const errorEntry = createErrorSearchEntry(search.alias, 'first call');
    ERROR_SEARCHES_ARRAY.push(errorEntry);
    return [];
  }
}

async function callNextPage(page, search, counter = 0) {
  try {
    if (counter >= MAX_NEXT_PAGE) {
      return [];
    }

    const url = buildURL(search, page);

    const res = await fetchSearchResults(url, search.alias);
    const items = res.items;
    const pagination = res.pagination;

    if (items.length >= 1 || pagination.current_page >= pagination.total_pages) {
      return items; 
    } else {
      return callNextPage(pagination.current_page + 1, search, ++counter);
    } 
  } catch(e) {
    console.log('Next page call failed', e);
    const errorEntry = createErrorSearchEntry(search.alias, 'next page call');
    ERROR_SEARCHES_ARRAY.push(errorEntry);
    return [];
  }
}

async function fetchSearchResults(url, searchAlias) {
  const rawResults = await fetch(url, { headers: HEADERS });
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
  url.searchParams.append('per_page', '24');
  url.searchParams.append('page', String(page));

  search.minPrice && url.searchParams.append('price_from', search.minPrice);
  search.maxPrice && url.searchParams.append('price_to', search.maxPrice);

  const statusIdsArray = Array.from(search.statusIds || []);
  if (statusIdsArray[0] !== '') {
    statusIdsArray.forEach(id => url.searchParams.append('status_ids[]', id));
  }

  return url;
}
