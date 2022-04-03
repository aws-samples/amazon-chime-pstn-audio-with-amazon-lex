import { App, CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Asterisk } from './asterisk-stack';
import { Chime } from './chime-stack';
// import { Cognito } from './cognito';
import { Database } from './database-stack';
import { Infrastructure } from './infrastructure-stack';
import { Lex } from './lex-stack';

export class LexContactCenter extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // const allowedDomain = this.node.tryGetContext('AllowedDomain');
    // const cognito = new Cognito(this, 'Cognito', {
    //   allowedDomain: allowedDomain,
    // });

    const database = new Database(this, 'Database', {});

    const lex = new Lex(this, 'Lex', {
      callerTable: database.callerTable,
    });

    const infrastructure = new Infrastructure(this, 'Infrastructure', {
      callerTable: database.callerTable,
      // userPool: cognito.userPool,
    });

    const asterisk = new Asterisk(this, 'Asterisk', {
      apiUrl: infrastructure.apiUrl,
      asteriskEip: infrastructure.asteriskEip,
    });

    new Chime(this, 'Chime', {
      callerTable: database.callerTable,
      smaVoiceConnectorHostname: asterisk.smaVoiceConnectorHostname,
      lexBotAliasId: lex.lexBotAliasId,
      lexBotId: lex.lexBotId,
    });

    new CfnOutput(this, 'ssmCommand', {
      value: `aws ssm start-session --target ${asterisk.instanceId}`,
    });
    new CfnOutput(this, 'voiceConnectorPhone', {
      value: asterisk.pstnVoiceConnectorPhone,
    });
    new CfnOutput(this, 'API_URL', { value: infrastructure.apiUrl });
    // new CfnOutput(this, 'USER_POOL_REGION', { value: cognito.userPoolRegion });
    // new CfnOutput(this, 'USER_POOL_ID', { value: cognito.userPool.userPoolId });
    // new CfnOutput(this, 'USER_POOL_CLIENT', {
    //   value: cognito.userPoolClient.userPoolClientId,
    // });
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
