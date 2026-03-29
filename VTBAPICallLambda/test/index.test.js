import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/api-call.service.js', () => ({
  firstCall: vi.fn()
}));
vi.mock('../src/services/telegram-bot.service.js', () => ({
  sendResultsToTelegram: vi.fn()
}));
vi.mock('../src/services/db-crud.service.js', () => ({
  getSearches: vi.fn(),
  updateSearchData: vi.fn()
}));
vi.mock('../src/services/api-call-error-handler.service.js', () => ({
  ERROR_SEARCHES_ARRAY: [],
  displayCurrentInstanceErrors: vi.fn()
}));

import { handler } from '../index.js';
import { firstCall } from '../src/services/api-call.service.js';
import { getSearches, updateSearchData } from '../src/services/db-crud.service.js';
import { sendResultsToTelegram } from '../src/services/telegram-bot.service.js';
import { displayCurrentInstanceErrors } from '../src/services/api-call-error-handler.service.js';

describe('handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes only active searches and returns a successful response', async () => {
    getSearches.mockResolvedValue([
      { searchId: 'active-1', alias: 'a', active: true },
      { searchId: 'inactive-1', alias: 'b', active: false }
    ]);
    firstCall.mockResolvedValue([]);

    const response = await handler();

    expect(firstCall).toHaveBeenCalledTimes(1);
    expect(firstCall).toHaveBeenCalledWith({ searchId: 'active-1', alias: 'a', active: true });
    expect(updateSearchData).not.toHaveBeenCalled();
    expect(sendResultsToTelegram).not.toHaveBeenCalled();
    expect(displayCurrentInstanceErrors).toHaveBeenCalledTimes(1);
    expect(response).toEqual({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    });
  });

  it('sends sorted newest results and limits payload to five entries', async () => {
    getSearches.mockResolvedValue([
      {
        searchId: 'active-2',
        alias: 'search-2',
        active: true,
        newestOffer: { offerId: 'known-offer', modified: 100 }
      }
    ]);

    firstCall.mockResolvedValue([
      { id: 'known-offer', updated_at_ts: 100 },
      { id: 'offer-2', updated_at_ts: 210 },
      { id: 'offer-3', updated_at_ts: 150 },
      { id: 'offer-4', updated_at_ts: 300 },
      { id: 'offer-5', updated_at_ts: 250 },
      { id: 'offer-6', updated_at_ts: 180 },
      { id: 'offer-7', updated_at_ts: 400 },
      { id: 'old-offer', updated_at_ts: 99 }
    ]);

    await handler();

    expect(updateSearchData).toHaveBeenCalledTimes(1);
    const updateArgs = updateSearchData.mock.calls[0];
    expect(updateArgs[0]).toBe('active-2');
    expect(updateArgs[1].id).toBe('offer-7');

    expect(sendResultsToTelegram).toHaveBeenCalledTimes(1);
    const sentResults = sendResultsToTelegram.mock.calls[0][0];
    expect(sentResults.map(item => item.id)).toEqual(['offer-7', 'offer-4', 'offer-5', 'offer-2', 'offer-6']);
  });

  it('returns only the first result when newestOfferId is not found in results', async () => {
    getSearches.mockResolvedValue([
      {
        searchId: 'active-3',
        alias: 'search-3',
        active: true,
        newestOffer: { offerId: 'missing-offer', modified: 50 }
      }
    ]);

    firstCall.mockResolvedValue([
      { id: 'new-offer-1', updated_at_ts: 200 },
      { id: 'new-offer-2', updated_at_ts: 300 }
    ]);

    await handler();

    expect(updateSearchData).toHaveBeenCalledTimes(1);
    expect(updateSearchData.mock.calls[0][1].id).toBe('new-offer-1');

    expect(sendResultsToTelegram).toHaveBeenCalledTimes(1);
    expect(sendResultsToTelegram.mock.calls[0][0]).toEqual([{ id: 'new-offer-1', updated_at_ts: 200 }]);
  });

  it('does not send results when all items are older than or equal to the last modified date', async () => {
    getSearches.mockResolvedValue([
      {
        searchId: 'active-4',
        alias: 'search-4',
        active: true,
        newestOffer: { offerId: 'known-offer', modified: 500 }
      }
    ]);

    firstCall.mockResolvedValue([
      { id: 'known-offer', updated_at_ts: 500 },
      { id: 'old-offer', updated_at_ts: 400 }
    ]);

    await handler();

    expect(updateSearchData).not.toHaveBeenCalled();
    expect(sendResultsToTelegram).not.toHaveBeenCalled();
  });

  it('updates and sends when search has no prior newestOffer', async () => {
    getSearches.mockResolvedValue([
      { searchId: 'new-search', alias: 'first-time', active: true }
    ]);

    firstCall.mockResolvedValue([
      { id: 'first-result', updated_at_ts: 100 }
    ]);

    await handler();

    expect(updateSearchData).toHaveBeenCalledTimes(1);
    expect(updateSearchData.mock.calls[0][1].id).toBe('first-result');
    expect(sendResultsToTelegram).toHaveBeenCalledTimes(1);
    expect(sendResultsToTelegram.mock.calls[0][0]).toEqual([{ id: 'first-result', updated_at_ts: 100 }]);
  });

  it('processes multiple active searches independently', async () => {
    getSearches.mockResolvedValue([
      { searchId: 'search-a', alias: 'a', active: true },
      { searchId: 'search-b', alias: 'b', active: true },
      { searchId: 'search-c', alias: 'c', active: false }
    ]);
    firstCall
      .mockResolvedValueOnce([{ id: 'result-a', updated_at_ts: 100 }])
      .mockResolvedValueOnce([{ id: 'result-b', updated_at_ts: 200 }]);

    await handler();

    expect(firstCall).toHaveBeenCalledTimes(2);
    expect(firstCall).toHaveBeenNthCalledWith(1, { searchId: 'search-a', alias: 'a', active: true });
    expect(firstCall).toHaveBeenNthCalledWith(2, { searchId: 'search-b', alias: 'b', active: true });
    expect(updateSearchData).toHaveBeenCalledTimes(2);
    expect(sendResultsToTelegram).toHaveBeenCalledTimes(2);
  });

  it('returns 500 error response when getSearches throws', async () => {
    getSearches.mockRejectedValue(new Error('db connection failed'));

    const response = await handler();

    expect(response).toEqual({
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Failed to retrieve searches' })
    });
    expect(firstCall).not.toHaveBeenCalled();
    expect(displayCurrentInstanceErrors).not.toHaveBeenCalled();
  });

  it('skips processing when firstCall returns empty results for a search', async () => {
    getSearches.mockResolvedValue([
      { searchId: 'empty-search', alias: 'e', active: true },
      { searchId: 'active-search', alias: 'a', active: true }
    ]);
    firstCall
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'item-1', updated_at_ts: 50 }]);

    await handler();

    expect(updateSearchData).toHaveBeenCalledTimes(1);
    expect(sendResultsToTelegram).toHaveBeenCalledTimes(1);
  });
});
