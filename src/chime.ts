import { Duration, Stack } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as chime from 'cdk-amazon-chime-resources';
import { Construct } from 'constructs';

interface ChimeProps {
  readonly callerTable: dynamodb.Table;
  readonly smaVoiceConnectorHostname: string;
  readonly lexBotId: string;
  readonly lexBotAliasId: string;
}

export class Chime extends Construct {
  public readonly smaId: string;
  public readonly smaHandlerLambda: NodejsFunction;

  constructor(scope: Construct, id: string, props: ChimeProps) {
    super(scope, id);

    const smaHandlerRole = new iam.Role(this, 'smaHandlerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        ['chimePolicy']: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              resources: ['*'],
              actions: ['chime:*'],
            }),
          ],
        }),
      },
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
    });

    this.smaHandlerLambda = new NodejsFunction(this, 'smaHandlerLambda', {
      entry: './src/resources/smaHandler/smaHandler.js',
      bundling: {
        externalModules: ['aws-sdk'],
      },
      runtime: Runtime.NODEJS_16_X,
      role: smaHandlerRole,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(60),
      environment: {
        MEETINGS_TABLE_NAME: props.callerTable.tableName,
        LEX_BOT_ID: props.lexBotId,
        LEX_BOT_ALIAS_ID: props.lexBotAliasId,
        ACCOUNT_ID: Stack.of(this).account,
      },
    });

    const voiceCallAnalyticsLambda = new NodejsFunction(
      this,
      'voiceAnalyticsLambda',
      {
        entry: './src/resources/voiceAnalytics/index.js',
        bundling: {
          externalModules: ['aws-sdk'],
        },
        runtime: Runtime.NODEJS_16_X,
        role: smaHandlerRole,
        architecture: Architecture.ARM_64,
        timeout: Duration.seconds(60),
        environment: {
          LEX_BOT_ID: props.lexBotId,
          LEX_BOT_ALIAS_ID: props.lexBotAliasId,
          ACCOUNT_ID: Stack.of(this).account,
        },
      },
    );

    voiceCallAnalyticsLambda.grantInvoke(
      new ServicePrincipal('voiceconnector.chime.amazonaws.com'),
    );

    props.callerTable.grantReadWriteData(this.smaHandlerLambda);

    const sipMediaApp = new chime.ChimeSipMediaApp(this, 'sipMediaApp', {
      region: Stack.of(this).region,
      endpoint: this.smaHandlerLambda.functionArn,
    });

    new chime.ChimeSipRule(this, 'sipRule', {
      triggerType: chime.TriggerType.REQUEST_URI_HOSTNAME,
      triggerValue:
        props.smaVoiceConnectorHostname + '.voiceconnector.chime.aws',
      targetApplications: [
        {
          region: Stack.of(this).region,
          priority: 1,
          sipMediaApplicationId: sipMediaApp.sipMediaAppId,
        },
      ],
    });

    this.smaId = sipMediaApp.sipMediaAppId;
  }
}
