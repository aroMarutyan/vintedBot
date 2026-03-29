import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstCall } from '../../src/services/api-call.service.js';
import { ERROR_SEARCHES_ARRAY } from '../../src/services/api-call-error-handler.service.js';

const createSearch = (overrides = {}) => ({
  alias: 'macbook-pro',
  searchTerm: 'macbook pro 16',
  minPrice: '500',
  maxPrice: '2000',
  statusIds: new Set(['3', '4']),
  ...overrides
});

describe('firstCall', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    ERROR_SEARCHES_ARRAY.length = 0;
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('ac629554-c6cc-40f9-a5a9-60580eb0fce9');
  });

  it('returns first page items and builds search URL with filters', async () => {
    const items = [{ id: '1' }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        items,
        pagination: { current_page: 1, total_pages: 1 }
      })
    });

    vi.stubGlobal('fetch', fetchMock);

    const search = createSearch();
    const result = await firstCall(search);

    expect(result).toEqual(items);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl.searchParams.get('search_text')).toBe('macbook pro 16');
    expect(calledUrl.searchParams.get('price_from')).toBe('500');
    expect(calledUrl.searchParams.get('price_to')).toBe('2000');
    expect(calledUrl.searchParams.get('order')).toBe('newest_first');
    expect(calledUrl.searchParams.get('per_page')).toBe('96');
    expect(calledUrl.searchParams.get('page')).toBe('1');
    expect(calledUrl.searchParams.get('catalog_ids')).toBe('');
    expect(calledUrl.searchParams.get('size_ids')).toBe('');
    expect(calledUrl.searchParams.get('brand_ids')).toBe('');
    expect(calledUrl.searchParams.get('status_ids')).toBe('3,4');
    expect(calledUrl.searchParams.get('color_ids')).toBe('');
    expect(calledUrl.searchParams.get('material_ids')).toBe('');
    expect(calledUrl.searchParams.get('global_search_session_id')).toBe('ac629554-c6cc-40f9-a5a9-60580eb0fce9');
  });

  it('returns empty array when first page has no items', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        items: [],
        pagination: { current_page: 1, total_pages: 5 }
      })
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await firstCall(createSearch({ statusIds: new Set(['']) }));

    expect(result).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('records fetch and first call errors when the API call fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal('fetch', fetchMock);

    const result = await firstCall(createSearch());

    expect(result).toEqual([]);
    expect(ERROR_SEARCHES_ARRAY).toHaveLength(2);
    expect(ERROR_SEARCHES_ARRAY[0]).toMatchObject({ alias: 'macbook-pro', errorType: 'fetch', errorCode: 500 });
    expect(ERROR_SEARCHES_ARRAY[1]).toMatchObject({ alias: 'macbook-pro', errorType: 'first call', errorCode: 'N/A' });
  });

  it('returns empty array when items field is missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        pagination: { current_page: 1, total_pages: 1 }
      })
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await firstCall(createSearch({ statusIds: new Set(['']) }));

    expect(result).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('omits optional URL params when search has no minPrice, maxPrice, or statusIds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        items: [{ id: '1' }],
        pagination: { current_page: 1, total_pages: 1 }
      })
    });

    vi.stubGlobal('fetch', fetchMock);

    const search = createSearch({ minPrice: '', maxPrice: '', statusIds: new Set(['']) });
    await firstCall(search);

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl.searchParams.get('price_from')).toBeNull();
    expect(calledUrl.searchParams.get('price_to')).toBeNull();
    expect(calledUrl.searchParams.get('status_ids')).toBe('');
  });

  it('records error and returns empty array when fetch rejects with a network error in firstCall', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await firstCall(createSearch());

    expect(result).toEqual([]);
    expect(ERROR_SEARCHES_ARRAY).toHaveLength(1);
    expect(ERROR_SEARCHES_ARRAY[0]).toMatchObject({ alias: 'macbook-pro', errorType: 'first call', errorCode: 'N/A' });
  });

});
