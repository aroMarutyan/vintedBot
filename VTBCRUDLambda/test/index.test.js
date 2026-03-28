import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/telegram-bot.service.js', () => ({
  botResponse: vi.fn()
}));

vi.mock('../src/services/db-crud.service.js', () => ({
  listSearches: vi.fn(),
  getNewestResults: vi.fn(),
  createNewSearch: vi.fn(),
  updateSearch: vi.fn(),
  deleteSearch: vi.fn()
}));

describe('handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['/ls', 'listSearches'],
    ['/gl', 'getNewestResults'],
    ['/ns', 'createNewSearch'],
    ['/us', 'updateSearch'],
    ['/ds', 'deleteSearch']
  ])('routes %s to %s', async (command, methodName) => {
    const { handler } = await import('../index.js');
    const crudService = await import('../src/services/db-crud.service.js');

    const response = await handler({ body: JSON.stringify({ message: { text: command } }) });

    expect(crudService[methodName]).toHaveBeenCalledWith(command);
    expect(response).toEqual({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    });
  });

  it('responds with help text for /help command', async () => {
    const { handler } = await import('../index.js');
    const { botResponse } = await import('../src/services/telegram-bot.service.js');

    await handler({ body: JSON.stringify({ message: { text: '/help' } }) });

    expect(botResponse).toHaveBeenCalledTimes(1);
    expect(botResponse.mock.calls[0][0]).toContain('To check all searches');
  });

  it('responds with unrecognized command fallback', async () => {
    const { handler } = await import('../index.js');
    const { botResponse } = await import('../src/services/telegram-bot.service.js');

    await handler({ body: JSON.stringify({ message: { text: '/unknown' } }) });

    expect(botResponse).toHaveBeenCalledWith('Unrecognized command. Type /help to get an overview of available commands');
  });
});
