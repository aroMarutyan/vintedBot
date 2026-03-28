import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMessage = vi.fn();

vi.mock('node-telegram-bot-api', () => ({
  default: vi.fn(function () {
    return { sendMessage };
  })
}));

describe('telegram-bot.service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.TOKEN = 'token';
    process.env.CHAT_ID = 'chat-id';
  });

  it('sends plain and html responses to the configured chat id', async () => {
    const { botResponse, botResponseHTML } = await import('../../../src/services/telegram-bot.service.js');

    await botResponse('hello');
    await botResponseHTML('html-message');

    expect(sendMessage).toHaveBeenNthCalledWith(1, 'chat-id', 'hello');
    expect(sendMessage).toHaveBeenNthCalledWith(2, 'chat-id', 'html-message', { parse_mode: 'HTML' });
  });

  it('builds telegram response payload from stored vinted offer details', async () => {
    const { buildTelegramResponse } = await import('../../../src/services/telegram-bot.service.js');

    const response = buildTelegramResponse('macbook-alert', {
      imageUrl: 'https://images.vinted.net/photo.jpg',
      title: 'Macbook Pro 16',
      price: '900.00',
      description: 'Great condition',
      link: 'https://www.vinted.com/items/1-macbook-pro-16'
    });

    expect(response).toContain('<b>SEARCH ALIAS:</b> macbook-alert');
    expect(response).toContain('<b>TITLE:</b> Macbook Pro 16');
    expect(response).toContain("<a href='https://www.vinted.com/items/1-macbook-pro-16'>CLICK</a>");
  });
});
