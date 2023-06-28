// resources/smaHandler/smaHandler.js
var AWS = require('aws-sdk');
var callInfoTable = process.env['MEETINGS_TABLE_NAME'];
var lexBotId = process.env['LEX_BOT_ID'];
var lexBotAliasId = process.env['LEX_BOT_ALIAS_ID'];
var accountId = process.env['ACCOUNT_ID'];
var lambdaRegion = process.env['AWS_REGION'];

var documentClient = new AWS.DynamoDB.DocumentClient();
exports.handler = async (event, context, callback) => {
  console.log('Lambda is invoked with calldetails:' + JSON.stringify(event));
  let actions;
  switch (event.InvocationEventType) {
    case 'NEW_INBOUND_CALL':
      console.log('NEW INBOUND CALL');
      await putInfo(event);
      startBotConversationAction.Parameters.Configuration.SessionState.SessionAttributes.phoneNumber =
        event.CallDetails.Participants[0].SipHeaders[
          'X-Original-Calling-Number'
        ];
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
    BotAliasArn: `arn:aws:lex:${lambdaRegion}:${accountId}:bot-alias/${lexBotId}/${lexBotAliasId}`,
    LocaleId: 'en_US',
    Configuration: {
      SessionState: {
        SessionAttributes: {
          phoneNumber: '',
        },
        DialogAction: {
          Type: 'ElicitIntent',
        },
      },
      WelcomeMessages: [
        {
          ContentType: 'PlainText',
          Content:
            'How can I help you today?  You can check your account balances, transfer funds, or open a new account.',
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
    lexResult[slotResponse] = slots[slotResponse].Value.InterpretedValue;
  });
  var callRoute = '';
  if (
    event.ActionData.IntentResult.SessionState.Intent.Name === 'OpenAccount'
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
