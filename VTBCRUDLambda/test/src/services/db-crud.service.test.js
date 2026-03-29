import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aws-sdk/client-dynamodb', () => {
  const send = vi.fn();

  return {
    DynamoDBClient: vi.fn(function () {
      return { send };
    }),
    ScanCommand: vi.fn(function (input) {
      return { type: 'scan', input };
    }),
    PutItemCommand: vi.fn(function (input) {
      return { type: 'put', input };
    }),
    UpdateItemCommand: vi.fn(function (input) {
      return { type: 'update', input };
    }),
    DeleteItemCommand: vi.fn(function (input) {
      return { type: 'delete', input };
    }),
    GetItemCommand: vi.fn(function (input) {
      return { type: 'get', input };
    }),
    __mocks: { send }
  };
}, { virtual: true });

vi.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: vi.fn(input => input),
  unmarshall: vi.fn(item => item)
}), { virtual: true });

vi.mock('../../../src/services/telegram-bot.service.js', () => ({
  botResponse: vi.fn(),
  botResponseHTML: vi.fn(),
  buildTelegramResponse: vi.fn((alias) => `<b>${alias}</b>`)
}));

vi.mock('../../../src/services/format.service.js', () => ({
  formatStatusIds: vi.fn(() => new Set(['3'])),
  formatSearchToHTML: vi.fn(() => '<b>search</b>')
}));

vi.mock('../../../src/services/search-handler.service.js', () => ({
  getTableName: vi.fn(() => ({ TableName: 'table-name' })),
  getSearchParams: vi.fn((searchId) => ({ TableName: 'table-name', Key: { searchId } })),
  handleNewValue: vi.fn((_key, value) => value ?? ''),
  getIdNum: vi.fn(() => '777'),
  handleNumericInput: vi.fn((value) => value ?? ''),
  validateSearch: vi.fn(),
  validateNumericParam: vi.fn((value) => value),
  validateParamCount: vi.fn()
}));

describe('db-crud.service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('lists active searches only and returns no-results message when none are active', async () => {
    const { __mocks } = await import('@aws-sdk/client-dynamodb');
    const { botResponse, botResponseHTML } = await import('../../../src/services/telegram-bot.service.js');
    const { listSearches } = await import('../../../src/services/db-crud.service.js');

    __mocks.send.mockResolvedValue({
      Items: [{ active: false }]
    });

    await listSearches('/ls\nactiveOnly');

    expect(botResponse).toHaveBeenCalledWith('No active searches found');
    expect(botResponseHTML).not.toHaveBeenCalled();
  });

  it('fetches newest results for a specific search id', async () => {
    const { __mocks } = await import('@aws-sdk/client-dynamodb');
    const { botResponseHTML, buildTelegramResponse } = await import('../../../src/services/telegram-bot.service.js');
    const { validateNumericParam } = await import('../../../src/services/search-handler.service.js');
    const { getNewestResults } = await import('../../../src/services/db-crud.service.js');

    __mocks.send.mockResolvedValueOnce({
      Item: { alias: 'macbook-search', newestOffer: { id: 'offer-1' } }
    });

    await getNewestResults('/gl\n44');

    expect(validateNumericParam).toHaveBeenCalledWith('44', 'searchId');
    expect(buildTelegramResponse).toHaveBeenCalledWith('macbook-search', { id: 'offer-1' });
    expect(botResponseHTML).toHaveBeenCalledWith('<b>macbook-search</b>');
  });

  it('creates a search and sends confirmation with created search details', async () => {
    const { __mocks, PutItemCommand } = await import('@aws-sdk/client-dynamodb');
    const { marshall } = await import('@aws-sdk/util-dynamodb');
    const { botResponse, botResponseHTML } = await import('../../../src/services/telegram-bot.service.js');
    const { createNewSearch } = await import('../../../src/services/db-crud.service.js');

    __mocks.send
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Item: {
          alias: 'new search',
          searchId: '777',
          searchTerm: 'macbook pro 16',
          statusIds: new Set(['3']),
          active: true
        }
      });

    await createNewSearch('/ns\nnew search\nmacbook pro 16\n500\n2000\n3');

    expect(PutItemCommand).toHaveBeenCalledTimes(1);
    expect(marshall).toHaveBeenCalledWith(expect.objectContaining({ alias: 'new search', searchId: '777' }));
    expect(botResponse).toHaveBeenCalledWith('Search successfully added');
    expect(botResponseHTML).toHaveBeenCalledWith('<b>search</b>');
  });

  it('updates a search and sends the updated payload', async () => {
    const { __mocks, UpdateItemCommand } = await import('@aws-sdk/client-dynamodb');
    const { marshall } = await import('@aws-sdk/util-dynamodb');
    const { botResponse, botResponseHTML } = await import('../../../src/services/telegram-bot.service.js');
    const { updateSearch } = await import('../../../src/services/db-crud.service.js');

    __mocks.send
      .mockResolvedValueOnce({ Items: [{ searchId: '44' }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Item: { alias: 'edited', searchId: '44', searchTerm: 'macbook', statusIds: new Set(['3']), active: true }
      });

    await updateSearch('/us\n44\nalias\nedited');

    expect(UpdateItemCommand).toHaveBeenCalledTimes(1);
    expect(marshall).toHaveBeenCalledWith({ ':VAL': 'edited' });
    expect(botResponse).toHaveBeenCalledWith('search successfully updated');
    expect(botResponseHTML).toHaveBeenCalledWith('<b>search</b>');
  });

  it('deletes a search after validation and confirms deletion', async () => {
    const { __mocks, DeleteItemCommand } = await import('@aws-sdk/client-dynamodb');
    const { botResponse } = await import('../../../src/services/telegram-bot.service.js');
    const { validateSearch } = await import('../../../src/services/search-handler.service.js');
    const { deleteSearch } = await import('../../../src/services/db-crud.service.js');

    __mocks.send.mockResolvedValueOnce({ Items: [{ searchId: '88' }] }).mockResolvedValueOnce({});

    await deleteSearch('/ds\n88');

    expect(validateSearch).toHaveBeenCalledWith('88', [{ searchId: '88' }]);
    expect(DeleteItemCommand).toHaveBeenCalledTimes(1);
    expect(botResponse).toHaveBeenCalledWith('Search successfully deleted');
  });

  it('sends error response when listing searches fails', async () => {
    const { __mocks } = await import('@aws-sdk/client-dynamodb');
    const { botResponse } = await import('../../../src/services/telegram-bot.service.js');
    const { listSearches } = await import('../../../src/services/db-crud.service.js');

    __mocks.send.mockRejectedValue(new Error('ddb down'));

    await listSearches('/ls');

    expect(botResponse).toHaveBeenCalledWith(expect.stringContaining('Error getting the list of searches'));
  });

  it('lists all searches when activeOnly is not specified', async () => {
    const { __mocks } = await import('@aws-sdk/client-dynamodb');
    const { botResponseHTML } = await import('../../../src/services/telegram-bot.service.js');
    const { formatSearchToHTML } = await import('../../../src/services/format.service.js');
    const { listSearches } = await import('../../../src/services/db-crud.service.js');

    __mocks.send.mockResolvedValue({
      Items: [{ active: true, alias: 's1' }, { active: false, alias: 's2' }]
    });

    await listSearches('/ls');

    expect(botResponseHTML).toHaveBeenCalledTimes(2);
    expect(formatSearchToHTML).toHaveBeenCalledTimes(2);
  });

  it('sends error response when creating a search fails', async () => {
    const { __mocks } = await import('@aws-sdk/client-dynamodb');
    const { botResponse } = await import('../../../src/services/telegram-bot.service.js');
    const { createNewSearch } = await import('../../../src/services/db-crud.service.js');

    __mocks.send.mockRejectedValue(new Error('put failed'));

    await createNewSearch('/ns\nalias\nterm');

    expect(botResponse).toHaveBeenCalledWith(expect.stringContaining('Error adding new search'));
  });

  it('sends error response when updating a search fails', async () => {
    const { __mocks } = await import('@aws-sdk/client-dynamodb');
    const { botResponse } = await import('../../../src/services/telegram-bot.service.js');
    const { updateSearch } = await import('../../../src/services/db-crud.service.js');

    __mocks.send
      .mockResolvedValueOnce({ Items: [{ searchId: '44' }] })
      .mockRejectedValueOnce(new Error('update failed'));

    await updateSearch('/us\n44\nalias\nnew-name');

    expect(botResponse).toHaveBeenCalledWith(expect.stringContaining('Error updating search'));
  });

  it('sends error response when deleting a search fails', async () => {
    const { __mocks } = await import('@aws-sdk/client-dynamodb');
    const { botResponse } = await import('../../../src/services/telegram-bot.service.js');
    const { deleteSearch } = await import('../../../src/services/db-crud.service.js');

    __mocks.send
      .mockResolvedValueOnce({ Items: [{ searchId: '88' }] })
      .mockRejectedValueOnce(new Error('delete failed'));

    await deleteSearch('/ds\n88');

    expect(botResponse).toHaveBeenCalledWith(expect.stringContaining('Error deleting search'));
  });
});
