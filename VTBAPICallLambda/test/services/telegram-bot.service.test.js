import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMessage = vi.fn();

vi.mock('node-telegram-bot-api', () => ({
  default: vi.fn(function () {
    return { sendMessage };
  })
}));

describe('telegram-bot-service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    process.env.TOKEN = 'token';
    process.env.CHAT_ID = 'chat-id';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends plain and HTML responses to configured chat', async () => {
    const { botResponse, botResponseHTML } = await import('../../src/services/telegram-bot.service.js');

    await botResponse('plain text');
    await botResponseHTML('html text');

    expect(sendMessage).toHaveBeenNthCalledWith(1, 'chat-id', 'plain text');
    expect(sendMessage).toHaveBeenNthCalledWith(2, 'chat-id', 'html text', { parse_mode: 'HTML' });
  });

  it('formats and sends each vinted result as HTML', async () => {
    const { sendResultsToTelegram } = await import('../../src/services/telegram-bot.service.js');

    const results = [
      {
        title: 'Macbook Pro 16',
        description: 'Great condition',
        photo: { url: 'https://images.vinted.net/photo1.jpg' },
        price: { amount: '900.00' },
        url: 'https://www.vinted.com/items/1-macbook-pro-16'
      },
      {
        title: 'Macbook Air',
        description: 'Like new',
        photo: { url: 'https://images.vinted.net/photo2.jpg' },
        price: { amount: '600.00' },
        url: 'https://www.vinted.com/items/2-macbook-air'
      }
    ];

    const sendPromise = sendResultsToTelegram(results);
    await vi.runAllTimersAsync();
    await sendPromise;

    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage.mock.calls[0][1]).toContain('<b>TITLE:</b> Macbook Pro 16');
    expect(sendMessage.mock.calls[0][1]).toContain("<a href='https://www.vinted.com/items/1-macbook-pro-16'>CLICK</a>");
    expect(sendMessage.mock.calls[1][1]).toContain("<a href='https://images.vinted.net/photo2.jpg'>");
    expect(sendMessage.mock.calls[1][2]).toEqual({ parse_mode: 'HTML' });
  });
});
