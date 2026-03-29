import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/telegram-bot.service.js', () => ({
  botResponseHTML: vi.fn()
}));

import { botResponseHTML } from '../../src/services/telegram-bot.service.js';
import {
  ERROR_SEARCHES_ARRAY,
  createErrorSearchEntry,
  displayCurrentInstanceErrors
} from '../../src/services/api-call-error-handler.service.js';

describe('api-call-error-handler', () => {
  beforeEach(() => {
    ERROR_SEARCHES_ARRAY.length = 0;
    vi.clearAllMocks();
  });

  it('creates an error entry with default error code', () => {
    expect(createErrorSearchEntry('laptop-search', 'fetch')).toEqual({
      alias: 'laptop-search',
      errorType: 'fetch',
      errorCode: 'N/A'
    });
  });

  it('sends formatted errors and clears stored errors', async () => {
    ERROR_SEARCHES_ARRAY.push(
      { alias: 'search-1', errorType: 'fetch', errorCode: 429 },
      { alias: 'search-2', errorType: 'first call', errorCode: 'N/A' }
    );

    await displayCurrentInstanceErrors();

    expect(botResponseHTML).toHaveBeenCalledTimes(1);
    const message = botResponseHTML.mock.calls[0][0];
    expect(message).toContain('<b>The following searches failed:</b>');
    expect(message).toContain('<b>SEARCH NAME:</b> search-1');
    expect(message).toContain('<b>ERROR TYPE:</b> fetch');
    expect(message).toContain('<b>ERROR CODE:</b> 429');
    expect(ERROR_SEARCHES_ARRAY).toHaveLength(0);
  });

  it('clears errors without sending a message when there are no failures', async () => {
    await displayCurrentInstanceErrors();

    expect(botResponseHTML).not.toHaveBeenCalled();
    expect(ERROR_SEARCHES_ARRAY).toHaveLength(0);
  });
});
