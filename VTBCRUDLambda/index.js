import { botResponse } from './src/services/telegram-bot.service.js';
import { listSearches, getNewestResults, createNewSearch, updateSearch, deleteSearch } from './src/services/db-crud.service.js';

export const handler = async (event) => {
  let text;
  try {
    text = JSON.parse(event.body).message.text;
  } catch(e) {
    console.log('Failed to parse event body', e);
    return finalizeLambda();
  }

  if (!text) {
    console.log('No message text found in event');
    return finalizeLambda();
  }

  switch (true) {
    case text.startsWith('/ls'):
      await listSearches(text);
      break;

    case text.startsWith('/gl'):
      await getNewestResults(text);
      break;

    case text.startsWith('/ns'):
      await createNewSearch(text);
      break;

    case text.startsWith('/us'):
      await updateSearch(text);
      break;

    case text.startsWith('/ds'):
      await deleteSearch(text);
      break;

    case text.startsWith('/help'):
      await botResponse(helpText());
      break;

    default:
      await botResponse('Unrecognized command. Type /help to get an overview of available commands');
  }
  return finalizeLambda();
};

function helpText() {
  const intro = 'Placeholder text is in ALL CAPS\nActual commands are in camelCase\nEvery input should be followed by a new line, unless specified otherwise\n';
  const listSearches = 'To check all searches, input:\nREQUIRED: /ls\nOPTIONAL: activeOnly\n';
  const checkNewestResults = 'To check newest result(s), input: \nREQUIRED: /gl\nOPTIONAL: SEARCH ID\n';
  const allowedConditions = 'OPTIONAL: STATUS IDS - separate status ids with comma\nfollowing status ids allowed:\n1 (new with tags), 2 (new without tags)\n3 (very good), 4 (good), 5 (satisfactory), all';
  const createSearch = `To create new search, input:\nREQUIRED: /ns\nREQUIRED: SEARCH ALIAS\nREQUIRED: SEARCH TERM\nOPTIONAL: MINIMUM PRICE\nOPTIONAL: MAXIMUM PRICE\n${allowedConditions}\n`;
  const paramsToUpdate = 'Param names to update: active, alias, statusIds, minPrice, maxPrice, searchTerm.\nStatus ids should be updated in the same manner as when creating a new search!';
  const updateSearch = `To update a search, input:\nREQUIRED: /us\nREQUIRED: SEARCH ID\nREQUIRED: PARAM TO CHANGE\nOPTIONAL: NEW VALUE - dont put anything if you want to remove the param\nParams can be updated one at a time\n${paramsToUpdate}\n`;
  const deleteSearch = 'To delete search, input:\nREQUIRED: /ds\nREQUIRED: SEARCH ID\n';

  return `${intro}\n${listSearches}\n${checkNewestResults}\n${createSearch}\n${updateSearch}\n${deleteSearch}`;
}

function finalizeLambda() {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  };
}
