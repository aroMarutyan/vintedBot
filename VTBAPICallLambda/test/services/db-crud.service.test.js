import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aws-sdk/client-dynamodb', () => {
  const send = vi.fn();
  const DynamoDBClient = vi.fn(function () {
    return { send };
  });
  const ScanCommand = vi.fn(function (input) {
    return { input };
  });
  const UpdateItemCommand = vi.fn(function (input) {
    return { input };
  });

  return {
    DynamoDBClient,
    ScanCommand,
    UpdateItemCommand,
    __mocks: { send }
  };
});

vi.mock('@aws-sdk/util-dynamodb', () => ({
  unmarshall: vi.fn(item => ({ ...item, unmarshalled: true })),
  marshall: vi.fn(item => item)
}));

describe('db-crud-service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.TABLE_NAME = 'searches-table';
  });

  it('scans searches and unmarshalls returned items', async () => {
    const { __mocks, ScanCommand } = await import('@aws-sdk/client-dynamodb');
    const { unmarshall } = await import('@aws-sdk/util-dynamodb');
    const { getSearches } = await import('../../src/services/db-crud.service.js');

    __mocks.send.mockResolvedValue({
      Items: [{ searchId: 'a' }, { searchId: 'b' }]
    });

    const searches = await getSearches();

    expect(ScanCommand).toHaveBeenCalledWith({
      TableName: 'searches-table',
      ConsistentRead: true
    });
    expect(unmarshall).toHaveBeenCalledTimes(2);
    expect(searches).toEqual([
      { searchId: 'a', unmarshalled: true },
      { searchId: 'b', unmarshalled: true }
    ]);
  });

  it('updates newest offer field with remapped vinted offer data', async () => {
    const { __mocks, UpdateItemCommand } = await import('@aws-sdk/client-dynamodb');
    const { marshall } = await import('@aws-sdk/util-dynamodb');
    const { updateSearchData } = await import('../../src/services/db-crud.service.js');

    const newestResult = {
      id: 987654321,
      title: 'Macbook Pro 16',
      description: 'Great condition',
      updated_at_ts: 1712345789,
      photo: { url: 'https://images.vinted.net/thumbs/photo.jpg' },
      price: { amount: '900.00', currency_code: 'EUR' },
      url: 'https://www.vinted.com/items/987654321-macbook-pro-16'
    };

    await updateSearchData('search-1', newestResult);

    expect(marshall).toHaveBeenCalledWith({ searchId: 'search-1' });
    expect(marshall).toHaveBeenCalledWith({
      ':VAL': {
        imageUrl: 'https://images.vinted.net/thumbs/photo.jpg',
        title: 'Macbook Pro 16',
        price: '900.00',
        description: 'Great condition',
        link: 'https://www.vinted.com/items/987654321-macbook-pro-16',
        offerId: 987654321,
        modified: 1712345789
      }
    });
    expect(UpdateItemCommand).toHaveBeenCalledTimes(1);
    expect(__mocks.send).toHaveBeenCalledTimes(1);
  });

  it('throws when DynamoDB scan fails in getSearches', async () => {
    const { __mocks } = await import('@aws-sdk/client-dynamodb');
    const { getSearches } = await import('../../src/services/db-crud.service.js');

    __mocks.send.mockRejectedValue(new Error('ddb down'));

    await expect(getSearches()).rejects.toThrow('ddb down');
  });

  it('throws when DynamoDB update fails in updateSearchData', async () => {
    const { __mocks } = await import('@aws-sdk/client-dynamodb');
    const { updateSearchData } = await import('../../src/services/db-crud.service.js');

    __mocks.send.mockRejectedValue(new Error('update failed'));

    const newestResult = {
      id: 1,
      title: 'T',
      description: 'D',
      updated_at_ts: 1,
      photo: { url: 'https://img.vinted.net/photo.jpg' },
      price: { amount: '10.00' },
      url: 'https://www.vinted.com/items/1-t'
    };

    await expect(updateSearchData('s1', newestResult)).rejects.toThrow('update failed');
  });
});
