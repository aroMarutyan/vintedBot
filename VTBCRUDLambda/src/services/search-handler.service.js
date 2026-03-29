import { marshall } from '@aws-sdk/util-dynamodb';

import { formatStatusIds } from './format.service.js';

const TABLE_NAME = process.env.TABLE_NAME;

export function getTableName() {
  return {
    TableName: TABLE_NAME,
  }
}

export function getSearchParams(searchId) {
  return {
    ...getTableName(),
    Key: marshall({ searchId: searchId })
  }
}

export function handleNewValue(key, value) {
  switch(true) {
    case (key === 'active'):
      return (value === 'yes') || (value === '1') || (value === 'true') ? true : false;

    case (key === 'statusIds'):
      return formatStatusIds(value);

    case (!value):
      return '';

    case (key === 'minPrice' || key === 'maxPrice'):
      return validateNumericParam(value, key);

    default:
      return value;
  }
}

export function validateSearch(searchId, searches) {
  const validatedSearchId = validateNumericParam(searchId, 'searchId');
  const searchExists = searches.some(search => search.searchId === validatedSearchId);

  if (!searchExists) {
    throw new Error('A search with this searchId does not exist');
  }
}

export function handleNumericInput(param, paramName) {
  return param ? validateNumericParam(param, paramName) : '';
}

export function validateNumericParam(param, paramName) {
  if (isNaN(param)) {
    throw new Error(`${paramName}: ${param} is not a valid number`);
  }
  return param;
}

export function getIdNum() {
  return `${Math.floor(Math.random() * 1000000)}`;
}

export function validateParamCount(params, count, operation, requiredParams) {
  if (params.length < count) {
    console.log(`Not enough params to ${operation} search`);
    throw new Error(`Not enough params to ${operation} search. You need to have ${requiredParams}`)
  }
}
