export const SEARCH_URL = new URL('https://www.vinted.es/api/v2/catalog/items');
export const HEADERS = new Headers();

// Required headers for Vinted API
HEADERS.append('Accept', 'application/json, text/plain, */*');
HEADERS.append('Accept-Language', 'en-US,en;q=0.9');
HEADERS.append('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
HEADERS.append('Origin', 'https://www.vinted.es');
HEADERS.append('Referer', 'https://www.vinted.es/');
