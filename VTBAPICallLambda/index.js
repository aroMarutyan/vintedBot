import { firstCall } from './src/services/api-call.service.js';
import { sendResultsToTelegram } from './src/services/telegram-bot.service.js';
import { getSearches, updateSearchData } from './src/services/db-crud.service.js';
import { ERROR_SEARCHES_ARRAY, displayCurrentInstanceErrors } from './src/services/api-call-error-handler.service.js';

const MAX_NUMBER_OF_RESULTS = 5;

export const handler = async () => {
  let searches;
  try {
    searches = (await getSearches()).filter(search => search.active);
  } catch(e) {
    console.log('Failed to retrieve searches from DB', e);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Failed to retrieve searches' })
    };
  }

  for (const search of searches) {
    const results = await firstCall(search);
    await handleResults(search, results);
  }

  await displayCurrentInstanceErrors();

  return finalizeLambda();
};

async function handleResults(search, results) {
  if (!results.length) return;

  const newestResults = getNewestResults(results, search?.newestOffer?.offerId, search?.newestOffer?.modified);
  
  if (newestResults.length) {
    await updateSearchData(search.searchId, newestResults[0]);
    await sendResultsToTelegram(newestResults);
  }
}

function getNewestResults(results, newestOfferId, lastModified) {
  if (results.findIndex(result => result?.id === newestOfferId) === -1) return [results[0]];

  const newestResults = results 
    .sort((a, b) => b.updated_at_ts - a.updated_at_ts)
    .filter(item => item.updated_at_ts > lastModified)
    .slice(0, MAX_NUMBER_OF_RESULTS);

  return newestResults;
}

function finalizeLambda() {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  };
}
