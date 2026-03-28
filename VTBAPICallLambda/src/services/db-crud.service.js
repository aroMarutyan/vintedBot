import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';

const DDB = new DynamoDBClient({region: 'eu-west-1'});
const TABLE_NAME = process.env.TABLE_NAME;

export async function getSearches() {
  try {
    const data = await DDB.send(new ScanCommand({ TableName: TABLE_NAME, ConsistentRead: true }));
    const remappedData = data.Items.map(search => unmarshall(search));

    return remappedData;
  } catch(e) {
    console.log('Could not get searches', e);
    throw e;
  }
}

export async function updateSearchData(searchId, newestResult) {
  await updateSearchStringKey(searchId, 'newestOffer', remapOffer(newestResult));
}

async function updateSearchStringKey(searchId, key, value) {
  try {
    const searchToEdit = {
      TableName: TABLE_NAME,
      Key: marshall({ searchId: searchId }),
      ExpressionAttributeNames: { '#KEY': `${key}` },
      ExpressionAttributeValues: marshall({ ':VAL': value }),
      ReturnValues: 'ALL_NEW',
      UpdateExpression: 'SET #KEY = :VAL'
    };

    await DDB.send(new UpdateItemCommand(searchToEdit));
  } catch(e) {
    console.log('Error updating search', e);
    throw e;
  }
}

function remapOffer(item) {
  return {
    imageUrl: item.photo?.url || '',
    title: item.title,
    price: item.price?.amount,
    description: item.description,
    link: item.url,
    offerId: item.id,
    modified: item.updated_at_ts
  }
}
