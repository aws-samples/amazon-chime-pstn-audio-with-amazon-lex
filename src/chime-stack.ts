import { Duration, NestedStackProps, NestedStack, Stack } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as chime from 'cdk-amazon-chime-resources';
import { Construct } from 'constructs';

interface ChimeProps extends NestedStackProps {
  readonly callerTable: dynamodb.Table;
  readonly smaVoiceConnectorHostname: string;
  readonly lexBotId: string;
  readonly lexBotAliasId: string;
}

export class Chime extends NestedStack {
  public readonly smaId: string;
  public readonly smaHandlerLambda: NodejsFunction;

  constructor(scope: Construct, id: string, props: ChimeProps) {
    super(scope, id, props);

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
      entry: './resources/smaHandler/smaHandler.js',
      bundling: {
        externalModules: ['aws-sdk'],
      },
      runtime: Runtime.NODEJS_14_X,
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

    props.callerTable.grantReadWriteData(this.smaHandlerLambda);

    const sipMediaApp = new chime.ChimeSipMediaApp(this, 'sipMediaApp', {
      region: this.region,
      endpoint: this.smaHandlerLambda.functionArn,
    });

    new chime.ChimeSipRule(this, 'sipRule', {
      triggerType: chime.TriggerType.REQUEST_URI_HOSTNAME,
      triggerValue:
        props.smaVoiceConnectorHostname + '.voiceconnector.chime.aws',
      targetApplications: [
        {
          region: this.region,
          priority: 1,
          sipMediaApplicationId: sipMediaApp.sipMediaAppId,
        },
      ],
    });

    this.smaId = sipMediaApp.sipMediaAppId;
  }
}
