import { botResponseHTML } from './telegram-bot.service.js';

export const ERROR_SEARCHES_ARRAY = [];

export async function displayCurrentInstanceErrors() {
  (ERROR_SEARCHES_ARRAY.length > 0) && (await botResponseHTML(buildErrorSearches()));

  clearErrorSearches();
}

export function createErrorSearchEntry(alias, errorType, errorCode = 'N/A') {
  return {
    alias,
    errorType,
    errorCode
  }
}

function buildErrorSearch(erroredSearch) {
  const searchName = `<b>SEARCH NAME:</b> ${erroredSearch.alias}`;
  const errorType = `<b>ERROR TYPE:</b> ${erroredSearch.errorType}`;
  const errorCode = `<b>ERROR CODE:</b> ${erroredSearch.errorCode}`;

  return [searchName, errorType, errorCode].join('\n');
}

function buildErrorSearches() {
  const headerText = '<b>The following searches failed:</b>';
  const failedSearches = ERROR_SEARCHES_ARRAY.map(buildErrorSearch).join('\n\n');
  
  return [headerText, failedSearches].join('\n\n'); 
}

function clearErrorSearches() {
  ERROR_SEARCHES_ARRAY.length = 0;
}
