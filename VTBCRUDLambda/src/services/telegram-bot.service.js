import TelegramBot from 'node-telegram-bot-api';

const BOT = new TelegramBot(process.env.TOKEN);
const CHAT_ID = process.env.CHAT_ID;

export async function botResponse(text) {
  await BOT.sendMessage(CHAT_ID, text);
}

export async function botResponseHTML(text) {
  await BOT.sendMessage(CHAT_ID, text, { parse_mode: 'HTML' });
}

export function buildTelegramResponse(alias, item) {
  return `<a href='${item.imageUrl}'> </a> \n<b>SEARCH ALIAS:</b> ${alias} \n<b>TITLE:</b> ${item.title} \n<b>PRICE:</b> ${item.price} \n<b>DESC:</b> ${item.description} \n<b>LINK:</b> <a href='${item.link}'>CLICK</a>`;
}
