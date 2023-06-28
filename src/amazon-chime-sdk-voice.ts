import { Duration, Stack } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { CfnEIP } from 'aws-cdk-lib/aws-ec2';
import {
  ServicePrincipal,
  Role,
  PolicyStatement,
  PolicyDocument,
  ManagedPolicy,
} from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  PhoneCountry,
  PhoneProductType,
  PhoneNumberType,
  ChimeVoiceConnector,
  ChimePhoneNumber,
  Protocol,
  ChimeSipMediaApp,
  ChimeSipRule,
  TriggerType,
} from 'cdk-amazon-chime-resources';
import { Construct } from 'constructs';

interface AmazonChimeSDKVoiceResourcesProps {
  serverEip: CfnEIP;
}

export class AmazonChimeSDKVoiceResources extends Construct {
  pstnPhoneNumber: ChimePhoneNumber;
  pstnVoiceConnector: ChimeVoiceConnector;
  smaVoiceConnector: ChimeVoiceConnector;

  constructor(
    scope: Construct,
    id: string,
    props: AmazonChimeSDKVoiceResourcesProps,
  ) {
    super(scope, id);

    this.pstnPhoneNumber = new ChimePhoneNumber(
      this,
      'voiceConnectorPhoneNumber',
      {
        phoneState: 'IL',
        phoneCountry: PhoneCountry.US,
        phoneProductType: PhoneProductType.VC,
        phoneNumberType: PhoneNumberType.LOCAL,
      },
    );

    this.pstnVoiceConnector = new ChimeVoiceConnector(
      this,
      'pstnVoiceConnector',
      {
        termination: {
          terminationCidrs: [`${props.serverEip.ref}/32`],
          callingRegions: ['US'],
        },
        origination: [
          {
            host: props.serverEip.ref,
            port: 5060,
            protocol: Protocol.UDP,
            priority: 1,
            weight: 1,
          },
        ],
        encryption: false,
      },
    );

    this.pstnPhoneNumber.associateWithVoiceConnector(this.pstnVoiceConnector);

    this.smaVoiceConnector = new ChimeVoiceConnector(
      this,
      'smaVoiceConnector',
      {
        termination: {
          terminationCidrs: [`${props.serverEip.ref}/32`],
          callingRegions: ['US'],
        },
        encryption: false,
      },
    );
  }
}

interface AmazonChimeSDKSMAResourcesProps {
  readonly callerTable: Table;
  readonly smaVoiceConnector: string;
  readonly lexBotId: string;
  readonly lexBotAliasId: string;
}

export class AmazonChimeSDKSMAResources extends Construct {
  public readonly smaId: string;
  public readonly smaHandlerLambda: NodejsFunction;

  constructor(
    scope: Construct,
    id: string,
    props: AmazonChimeSDKSMAResourcesProps,
  ) {
    super(scope, id);

    const smaHandlerRole = new Role(this, 'smaHandlerRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        ['chimePolicy']: new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: ['*'],
              actions: ['chime:*'],
            }),
          ],
        }),
      },
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
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

    props.callerTable.grantReadWriteData(this.smaHandlerLambda);

    const sipMediaApp = new ChimeSipMediaApp(this, 'sipMediaApp', {
      region: Stack.of(this).region,
      endpoint: this.smaHandlerLambda.functionArn,
    });

    new ChimeSipRule(this, 'sipRule', {
      triggerType: TriggerType.REQUEST_URI_HOSTNAME,
      triggerValue: props.smaVoiceConnector + '.voiceconnector.chime.aws',
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
