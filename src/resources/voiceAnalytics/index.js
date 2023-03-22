import {
  LexRuntimeV2Client,
  PutSessionCommand,
} from '@aws-sdk/client-lex-runtime-v2';

exports.handler = async (event, context, callback) => {
  console.log('Lambda is invoked with call details:' + JSON.stringify(event));
  return true;
};
