import { App, CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Asterisk, Chime, Database, Infrastructure, Lex } from './index';

export class LexContactCenter extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const database = new Database(this, 'Database');

    const lex = new Lex(this, 'Lex', {
      callerTable: database.callerTable,
    });

    const infrastructure = new Infrastructure(this, 'Infrastructure', {
      callerTable: database.callerTable,
    });

    const asterisk = new Asterisk(this, 'Asterisk', {
      apiUrl: infrastructure.queryAPI.url,
      asteriskEip: infrastructure.asteriskEip,
    });

    const chime = new Chime(this, 'Chime', {
      callerTable: database.callerTable,
      smaVoiceConnectorHostname: asterisk.smaVoiceConnectorHostname,
      lexBotAliasId: lex.lexBotAliasId,
      lexBotId: lex.lexBotId,
    });

    new CfnOutput(this, 'PSTN VoiceConnector ARN', {
      value: asterisk.smaVoiceConnectorArn,
    });
    new CfnOutput(this, 'SMA VoiceConnector ARN', {
      value: asterisk.smaVoiceConnectorArn,
    });
    new CfnOutput(this, 'callQueryLambda', {
      value: infrastructure.callQueryLambda.functionName,
    });
    new CfnOutput(this, 'smaHandlerLambda', {
      value: chime.smaHandlerLambda.functionName,
    });
    new CfnOutput(this, 'queryAPI', {
      value: infrastructure.queryAPI.restApiId,
    });
    new CfnOutput(this, 'callInfoTable', {
      value: database.callerTable.tableName,
    });
    new CfnOutput(this, 'Amazon Lex Bot ID', { value: lex.lexBotId });
    new CfnOutput(this, 'Amazon Lex Bot Alias ID', {
      value: lex.lexBotAliasId,
    });
    new CfnOutput(this, 'ssmCommand', {
      value: `aws ssm start-session --target ${asterisk.instanceId}`,
    });
    new CfnOutput(this, 'voiceConnectorPhone', {
      value: asterisk.pstnVoiceConnectorPhone,
    });
    new CfnOutput(this, 'API_URL', { value: infrastructure.queryAPI.url });
    new CfnOutput(this, 'sipuri', {
      value: 'agent@' + infrastructure.asteriskEip.ref,
    });
    new CfnOutput(this, 'password', { value: asterisk.instanceId });
    new CfnOutput(this, 'websocket', {
      value: 'ws://' + infrastructure.asteriskEip.ref + ':8088/ws',
    });
  }
}

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new LexContactCenter(app, 'LexContactCenter', { env: devEnv });

app.synth();
