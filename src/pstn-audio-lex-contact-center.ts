import { App, CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  AmazonChimeSDKSMAResources,
  AmazonChimeSDKVoiceResources,
  Database,
  Infrastructure,
  Lex,
  ServerResources,
  VPCResources,
} from './index';

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

    const vpc = new VPCResources(this, 'VPC');

    const amazonChimeSdkVoiceResources = new AmazonChimeSDKVoiceResources(
      this,
      'AmazonChimeSDKVoice',
      { serverEip: vpc.serverEip },
    );

    const server = new ServerResources(this, 'Server', {
      apiUrl: infrastructure.queryAPI.url,
      serverEip: vpc.serverEip,
      vpc: vpc.vpc,
      voiceSecurityGroup: vpc.voiceSecurityGroup,
      sshSecurityGroup: vpc.sshSecurityGroup,
      logLevel: 'INFO',
      albSecurityGroup: vpc.albSecurityGroup,
      applicationLoadBalancer: vpc.applicationLoadBalancer,
      publicSshKey: 'xxxxxxxxx',
      pstnPhoneNumber: amazonChimeSdkVoiceResources.pstnPhoneNumber,
      pstnVoiceConnector: amazonChimeSdkVoiceResources.pstnVoiceConnector,
      smaVoiceConnector: amazonChimeSdkVoiceResources.smaVoiceConnector,
    });

    new AmazonChimeSDKSMAResources(this, 'AmazonChimeSDKSMA', {
      callerTable: database.callerTable,
      smaVoiceConnector:
        amazonChimeSdkVoiceResources.smaVoiceConnector.voiceConnectorId,
      lexBotId: lex.lexBotId,
      lexBotAliasId: lex.lexBotAliasId,
    });

    new CfnOutput(this, 'callQueryLambda', {
      value: infrastructure.callQueryLambda.functionName,
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
      value: `aws ssm start-session --target ${server.instanceId}`,
    });
    new CfnOutput(this, 'voiceConnectorPhone', {
      value: amazonChimeSdkVoiceResources.pstnPhoneNumber.phoneNumber,
    });

    new CfnOutput(this, 'API_URL', { value: infrastructure.queryAPI.url });
    new CfnOutput(this, 'sipuri', {
      value: 'agent@' + vpc.serverEip.ref,
    });
    new CfnOutput(this, 'password', { value: server.instanceId });
    new CfnOutput(this, 'websocket', {
      value: 'ws://' + vpc.serverEip.ref + ':8088/ws',
    });

    new CfnOutput(this, 'logGroups', {
      value: '/var/log/amazon-chime-sdk-lex/',
    });

    new CfnOutput(this, 'logGroups', {
      value: '/var/log/amazon-chime-sdk-lex/',
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
