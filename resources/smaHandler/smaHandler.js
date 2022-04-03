// resources/smaHandler/smaHandler.js
var AWS = require('aws-sdk');
var chime = new AWS.Chime({
  region: 'us-east-1',
  endpoint: 'service.chime.aws.amazon.com',
});
var callInfoTable = process.env['MEETINGS_TABLE_NAME'];
var lexBotId = process.env['LEX_BOT_ID'];
var lexBotAliasId = process.env['LEX_BOT_ALIAS_ID'];
var accountId = process.env['ACCOUNT_ID'];
var documentClient = new AWS.DynamoDB.DocumentClient();
exports.handler = async (event, context, callback) => {
  console.log('Lambda is invoked with calldetails:' + JSON.stringify(event));
  let actions;
  switch (event.InvocationEventType) {
    case 'NEW_INBOUND_CALL':
      console.log('NEW INBOUND CALL');
      await putInfo(event);
      actions = [startBotConversationAction];
      break;
    case 'RINGING':
      console.log('RINGING');
      actions = [];
      break;
    case 'ACTION_SUCCESSFUL':
      console.log('ACTION SUCCESSFUL');
      await parseResult(event);
      actions = [hangupAction];
      break;
    case 'HANGUP':
      console.log('HANGUP ACTION');
      break;
    default:
      console.log('FAILED ACTION');
      actions = [];
  }
  const response = {
    SchemaVersion: '1.0',
    Actions: actions,
  };
  console.log('Sending response:' + JSON.stringify(response));
  callback(null, response);
};
var hangupAction = {
  Type: 'Hangup',
  Parameters: {
    SipResponseCode: '0',
    ParticipantTag: '',
  },
};

var startBotConversationAction = {
  Type: 'StartBotConversation',
  Parameters: {
    BotAliasArn:
      'arn:aws:lex:us-east-1:' +
      accountId +
      ':bot-alias/' +
      lexBotId +
      '/' +
      lexBotAliasId,
    LocaleId: 'en_US',
    Configuration: {
      SessionState: {
        DialogAction: {
          Type: 'ElicitIntent',
        },
      },
      WelcomeMessages: [
        {
          ContentType: 'PlainText',
          Content:
            "Hi! I'm BB, the Banking Bot. How can I help you today?  You can check your account balances or transfer funds.",
        },
      ],
    },
  },
};
async function putInfo(event) {
  var params = {
    TableName: callInfoTable,
    Key: { CallId: event.CallDetails.Participants[0].SipHeaders['X-CallId'] },
    UpdateExpression: 'SET #tId = :tId, #cN = :cN',
    ExpressionAttributeNames: {
      '#tId': 'TransactionId',
      '#cN': 'CallingNumber',
    },
    ExpressionAttributeValues: {
      ':tId': event.CallDetails.TransactionId,
      ':cN': event.CallDetails.Participants[0].From,
    },
  };
  console.log(params);
  try {
    await documentClient.update(params).promise();
  } catch (err) {
    console.log(err);
    return err;
  }
}
async function parseResult(event) {
  const intent = event.ActionData.IntentResult.Interpretations[0].Intent;
  const slots = intent.Slots;
  const slotsArray = Object.keys(slots);
  let lexResult = {};
  slotsArray.forEach((slotResponse) => {
    lexResult[slotResponse] = slots[slotResponse].Value.ResolvedValues[0];
  });
  var callRoute = '';
  if (
    event.ActionData.IntentResult.SessionState.Intent.Name === 'TransferFunds'
  ) {
    callRoute = 'CallAgent';
  } else {
    callRoute = 'Disconnect';
  }

  var params = {
    TableName: callInfoTable,
    Key: { CallId: event.CallDetails.Participants[0].SipHeaders['X-CallId'] },
    UpdateExpression: 'SET #lR = :lR, #s = :s, #cS = :cS, #cR = :cR',
    ExpressionAttributeNames: {
      '#lR': 'LexResults',
      '#s': 'State',
      '#cS': 'ConfirmationState',
      '#cR': 'CallRoute',
    },
    ExpressionAttributeValues: {
      ':lR': lexResult,
      ':s': intent.State,
      ':cS': intent.ConfirmationState,
      ':cR': callRoute,
    },
  };
  console.log(params);
  try {
    await documentClient.update(params).promise();
  } catch (err) {
    console.log(err);
    return err;
  }
}
