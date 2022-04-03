// callQuery.js
var AWS = require('aws-sdk');
var documentClient = new AWS.DynamoDB.DocumentClient();
var callInfoTable = process.env['CALLER_TABLE_NAME'];
var response = {
  statusCode: 200,
  body: '',
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  },
  isBase64Encoded: false,
};
exports.handler = async (event, context) => {
  console.log(event);
  const xCallId = await getCaller(event.queryStringParameters.xCallId);
  response.statusCode = 200;
  response.body = JSON.stringify(xCallId);
  console.log(response);
  return response;
};
async function getCaller(xCallId) {
  var params = {
    TableName: callInfoTable,
    Key: { CallId: xCallId },
  };
  console.log(params);
  try {
    const results = await documentClient.get(params).promise();
    console.log(results.Item);
    return results.Item;
  } catch (err) {
    console.log(err);
    console.log('No call found');
    return false;
  }
}
