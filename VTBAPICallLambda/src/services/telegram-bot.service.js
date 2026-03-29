import TelegramBot from 'node-telegram-bot-api';

const BOT = new TelegramBot(process.env.TOKEN);
const CHAT_ID = process.env.CHAT_ID;

export async function sendResultsToTelegram(newestResults) {
  for (const result of newestResults) {
    await botResponseHTML(buildTelegramResponse(result));
    await asyncTimeout();
  }
}

export async function botResponse(text) {
  await BOT.sendMessage(CHAT_ID, text);
}

export async function botResponseHTML(text) {
  await BOT.sendMessage(CHAT_ID, text, { parse_mode: 'HTML'});
}

async function asyncTimeout() {
  return new Promise(resolve => setTimeout(resolve, 1000));
};

function buildTelegramResponse(item) {
  return `<a href='${item.photo?.url}'> </a> \n<b>TITLE:</b> ${item.title} \n<b>PRICE:</b> ${item.price?.amount} \n<b>DESC:</b> ${item.description} \n<b>LINK:</b> <a href='${item.url}'>CLICK</a>`;
}
