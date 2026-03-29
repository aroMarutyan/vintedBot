import { DynamoDBClient, ScanCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';

import { botResponse, botResponseHTML, buildTelegramResponse } from './telegram-bot.service.js';
import { formatStatusIds, formatSearchToHTML } from './format.service.js';
import { getTableName, getSearchParams, handleNewValue, getIdNum, handleNumericInput, validateSearch, validateNumericParam, validateParamCount } from './search-handler.service.js';

const DDB = new DynamoDBClient({region: 'eu-west-1'});

export async function listSearches(text) {
  try {
    const searches = await getAllSearches();
    const isActiveSearchesOnly = text.includes('activeOnly');
    const searchesToShow = isActiveSearchesOnly
      ? searches.filter(search => search.active) 
      : searches; 

    if (!searchesToShow.length) {
      await botResponse(`No${isActiveSearchesOnly ? ' active ' : ' '}searches found`);
      return;
    }

    for (const search of searchesToShow) {
      await botResponseHTML(formatSearchToHTML(search));
    }

  } catch(e) {
    console.log('Error getting the list of searches', e);
    await botResponse(`Error getting the list of searches: ${e}`);
  }
}

export async function getNewestResults(text) {
  try {
    const params = text.split('\n');

    if (!!params[1]) {
      validateNumericParam(params[1], 'searchId');
      const search = await getSpecificSearch(params[1]);
      await botResponseHTML(buildTelegramResponse(search.alias, search.newestOffer));
    } else {
      const searches = (await getAllSearches()).filter(search => !!search.newestOffer);
      for (const search of searches) {
        await botResponseHTML(buildTelegramResponse(search.alias, search.newestOffer));
      }
    }
  } catch(e) {
    console.log('Error showing newest results', e);
    await botResponse(`Error showing newest results: ${e}`);
  }
}

export async function createNewSearch(text) {
  try {
    const params = text.split('\n');
    validateParamCount(params, 3, 'create', 'search alias and search term, in addition to /ns command');
    const searchId = getIdNum();
    const searchToAdd = {
      ...getTableName(),
      Item: marshall({
        alias: params[1],
        searchTerm: params[2],
        minPrice: handleNumericInput(params[3], 'minPrice'),
        maxPrice: handleNumericInput(params[4], 'maxPrice'),
        statusIds: formatStatusIds(params[5]),
        active: true,
        searchId,
      })
    }

    await DDB.send(new PutItemCommand(searchToAdd));
    await botResponse('Search successfully added');
    await botResponseHTML(formatSearchToHTML(await getSpecificSearch(searchId)));
  } catch(e) {
    console.log('Error adding new search', e);
    await botResponse(`Error adding new search: ${e}`);
  }
}

export async function updateSearch(text) {
  try {
    const params = text.split('\n');
    validateParamCount(params, 3, 'update', 'search id and param to update, in addition to /us command');
    const searchId = params[1];
    const key = params[2];
    const value = params[3];
    validateSearch(searchId, (await getAllSearches()));

    const newValue = handleNewValue(key, value);
    const searchToEdit = {
      ...getSearchParams(searchId),
      ExpressionAttributeNames: {'#KEY': key},
      ExpressionAttributeValues: marshall({':VAL': newValue}),
      ReturnValues: 'ALL_NEW',
      UpdateExpression: 'SET #KEY = :VAL'
    };

    await DDB.send(new UpdateItemCommand(searchToEdit));
    await botResponse(`search successfully updated`);
    await botResponseHTML(formatSearchToHTML(await getSpecificSearch(searchId)));
  } catch(e) {
    console.log('Error updating search', e);
    await botResponse(`Error updating search: ${e}`);
  }
}

export async function deleteSearch(text) {
  try {
    const params = text.split('\n');
    validateParamCount(params, 2, 'delete', 'search id, in addition to /ds command');
    validateSearch(params[1], (await getAllSearches()));

    await DDB.send(new DeleteItemCommand(getSearchParams(params[1])));
    await botResponse('Search successfully deleted');
  } catch(e) {
    console.log('Error deleting search', e);
    await botResponse(`Error deleting search: ${e}`);
  }
}

async function getAllSearches() {
  try {
    const data = await DDB.send(new ScanCommand(getTableName()));
    return data.Items.map(search => unmarshall(search));
  } catch(e) {
    console.log('Error getting all searches', e);
    throw e;
  }
}

async function getSpecificSearch(searchId) {
  try {
    const search = await DDB.send(new GetItemCommand(getSearchParams(searchId)));
    if (!search.Item) {
      throw new Error(`Search with id ${searchId} not found`);
    }
    const res = unmarshall(search.Item);
    return res;

  } catch(e) {
    console.log('Error fetching search', e);
    await botResponse('Error fetching search');
    throw e;
  }
}
