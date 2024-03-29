import * as path from 'path';
import { Duration, RemovalPolicy, Stack, aws_lex as lex } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface LexProps {
  callerTable: dynamodb.Table;
}

export class Lex extends Construct {
  public readonly lexBotId: string;
  public readonly lexBotAliasId: string;

  constructor(scope: Construct, id: string, props: LexProps) {
    super(scope, id);

    const lexCodeHook = new lambda.Function(this, 'lexCodeHook', {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset(path.join(__dirname, './resources/lexBot')),
      handler: 'index.lambda_handler',
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.minutes(1),
      environment: {
        CALLER_TABLE_NAME: props.callerTable.tableName,
      },
    });

    props.callerTable.grantReadWriteData(lexCodeHook);

    const lexLogGroup = new logs.LogGroup(this, 'lexLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
    });

    const lexAudioBucket = new s3.Bucket(this, 'lexAudioBucket', {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const lexRole = new iam.Role(this, 'lexRole', {
      assumedBy: new iam.ServicePrincipal('lex.amazonaws.com'),
      inlinePolicies: {
        ['lexPolicy']: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              resources: ['*'],
              actions: ['polly:SynthesizeSpeech', 'comprehend:DetectSentiment'],
            }),
            new iam.PolicyStatement({
              resources: [lexLogGroup.logGroupArn],
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
            }),
          ],
        }),
      },
    });

    lexAudioBucket.grantReadWrite(lexRole);

    const chimeLexBot = new lex.CfnBot(this, 'chimeLexBot', {
      dataPrivacy: { ChildDirected: false },
      idleSessionTtlInSeconds: 300,
      name: 'ChimeDemo',
      roleArn: lexRole.roleArn,
      autoBuildBotLocales: true,
      botLocales: [
        {
          localeId: 'en_US',
          nluConfidenceThreshold: 0.4,
          voiceSettings: {
            voiceId: 'Joanna',
            engine: 'neural',
          },
          description: 'English_US',
          slotTypes: [
            {
              name: 'accountType',
              description: 'Slot Type description',
              valueSelectionSetting: {
                resolutionStrategy: 'TOP_RESOLUTION',
              },
              slotTypeValues: [
                {
                  sampleValue: {
                    value: 'Checking',
                  },
                },
                {
                  sampleValue: {
                    value: 'Savings',
                  },
                },
                {
                  sampleValue: {
                    value: 'Credit',
                  },
                  synonyms: [
                    {
                      value: 'credit card',
                    },
                    {
                      value: 'visa',
                    },
                    {
                      value: 'mastercard',
                    },
                    {
                      value: 'amex',
                    },
                    {
                      value: 'american express',
                    },
                  ],
                },
              ],
            },
          ],
          intents: [
            {
              name: 'CheckBalance',
              description:
                'Intent to check the balance in the specified account type',
              sampleUtterances: [
                { utterance: 'What’s the balance in my account ?' },
                { utterance: 'Check my account balance' },
                {
                  utterance: 'What’s the balance in my {accountType} account ?',
                },
                { utterance: 'How much do I have in {accountType} ?' },
                { utterance: 'I want to check the balance' },
                { utterance: 'Can you help me with account balance ?' },
                { utterance: 'Balance in {accountType}' },
              ],
              fulfillmentCodeHook: { enabled: true },
              outputContexts: [
                {
                  name: 'contextCheckBalance',
                  timeToLiveInSeconds: 90,
                  turnsToLive: 5,
                },
              ],
              intentClosingSetting: {
                closingResponse: {
                  messageGroupsList: [
                    {
                      message: {
                        plainTextMessage: {
                          value:
                            'Thanks for checking your balance.  Have a nice day.',
                        },
                      },
                    },
                  ],
                  allowInterrupt: false,
                },
                isActive: true,
              },
              slots: [
                {
                  name: 'accountType',
                  slotTypeName: 'accountType',
                  valueElicitationSetting: {
                    slotConstraint: 'Required',
                    promptSpecification: {
                      maxRetries: 2,
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: {
                              value:
                                'For which account would you like your balance?',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  name: 'dateOfBirth',
                  slotTypeName: 'AMAZON.Date',
                  valueElicitationSetting: {
                    slotConstraint: 'Required',
                    promptSpecification: {
                      maxRetries: 2,
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: {
                              value:
                                'For verification purposes, what is your date of birth?',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
              slotPriorities: [
                { priority: 1, slotName: 'accountType' },
                { priority: 2, slotName: 'dateOfBirth' },
              ],
            },
            {
              name: 'OpenAccount',
              description: 'Intent to open the specified account type',
              dialogCodeHook: {
                enabled: true,
              },
              sampleUtterances: [
                { utterance: 'Open an account' },
                { utterance: 'Create account' },
                { utterance: 'Open {accountType} account' },
                { utterance: 'Create {accountType} account' },
              ],
              intentConfirmationSetting: {
                declinationResponse: {
                  messageGroupsList: [
                    {
                      message: {
                        plainTextMessage: {
                          value: 'Lets try that again',
                        },
                      },
                    },
                  ],
                  allowInterrupt: true,
                },
                promptSpecification: {
                  maxRetries: 2,
                  messageGroupsList: [
                    {
                      message: {
                        ssmlMessage: {
                          value:
                            '<speak>Is your phone number <say-as interpret-as="telephone">[phoneNumber]</say-as> ?</speak>',
                        },
                      },
                    },
                  ],
                  allowInterrupt: true,
                },
                isActive: true,
              },
              outputContexts: [
                {
                  name: 'contextCreateAccount',
                  timeToLiveInSeconds: 90,
                  turnsToLive: 5,
                },
              ],
              slots: [
                {
                  name: 'accountType',
                  slotTypeName: 'accountType',
                  valueElicitationSetting: {
                    slotConstraint: 'Required',
                    promptSpecification: {
                      maxRetries: 2,
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: {
                              value:
                                'What account type would you like to open?',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  name: 'firstName',
                  slotTypeName: 'AMAZON.FirstName',
                  valueElicitationSetting: {
                    slotConstraint: 'Required',
                    promptSpecification: {
                      maxRetries: 2,
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: {
                              value: 'What is your first name?',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  name: 'lastName',
                  slotTypeName: 'AMAZON.LastName',
                  valueElicitationSetting: {
                    slotConstraint: 'Required',
                    promptSpecification: {
                      maxRetries: 2,
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: {
                              value: 'What is your last name?',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  name: 'phoneNumber',
                  slotTypeName: 'AMAZON.PhoneNumber',
                  valueElicitationSetting: {
                    slotConstraint: 'Required',
                    defaultValueSpecification: {
                      defaultValueList: [{ defaultValue: '[phoneNumber]' }],
                    },
                    promptSpecification: {
                      maxRetries: 2,
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: {
                              value: 'What is your phone number?',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
              slotPriorities: [
                { priority: 1, slotName: 'accountType' },
                { priority: 2, slotName: 'firstName' },
                { priority: 3, slotName: 'lastName' },
                { priority: 4, slotName: 'phoneNumber' },
              ],
            },
            {
              name: 'TransferFunds',
              description: 'Help user transfer funds between bank accounts',
              sampleUtterances: [
                { utterance: 'I want to transfer funds' },
                { utterance: 'Can I make a transfer?' },
                { utterance: 'I want to make a transfer' },
                {
                  utterance:
                    "I'd like to transfer {transferAmount} from {sourceAccountType} to {targetAccountType}",
                },
                {
                  utterance:
                    'Can I transfer {transferAmount} to my {targetAccountType}',
                },
                { utterance: 'Would you be able to help me with a transfer?' },
                { utterance: 'Need to make a transfer' },
              ],
              fulfillmentCodeHook: { enabled: false },
              intentClosingSetting: {
                closingResponse: {
                  messageGroupsList: [
                    {
                      message: {
                        plainTextMessage: {
                          value:
                            'Thanks for transferring funds.  Have a nice day.',
                        },
                      },
                    },
                  ],
                  allowInterrupt: false,
                },
                isActive: true,
              },
              intentConfirmationSetting: {
                declinationResponse: {
                  messageGroupsList: [
                    {
                      message: {
                        plainTextMessage: {
                          value: 'The transfer has been cancelled',
                        },
                      },
                    },
                  ],
                },
                promptSpecification: {
                  messageGroupsList: [
                    {
                      message: {
                        plainTextMessage: {
                          value:
                            'Got it. So we are transferring {transferAmount} from {sourceAccountType} to {targetAccountType}. Can I go ahead with the transfer?',
                        },
                      },
                    },
                  ],
                  maxRetries: 2,
                },
              },
              slots: [
                {
                  name: 'sourceAccountType',
                  slotTypeName: 'accountType',
                  valueElicitationSetting: {
                    slotConstraint: 'Required',
                    promptSpecification: {
                      maxRetries: 2,
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: {
                              value:
                                'Which account would you like to transfer from?',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  name: 'targetAccountType',
                  slotTypeName: 'accountType',
                  valueElicitationSetting: {
                    slotConstraint: 'Required',
                    promptSpecification: {
                      maxRetries: 2,
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: {
                              value: 'Which account are you transferring to?',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  name: 'transferAmount',
                  slotTypeName: 'AMAZON.Number',
                  valueElicitationSetting: {
                    slotConstraint: 'Required',
                    promptSpecification: {
                      maxRetries: 2,
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: {
                              value:
                                'How much money would you like to transfer?',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
              slotPriorities: [
                { priority: 1, slotName: 'sourceAccountType' },
                { priority: 2, slotName: 'targetAccountType' },
                { priority: 3, slotName: 'transferAmount' },
              ],
            },
            {
              name: 'FallbackIntent',
              parentIntentSignature: 'AMAZON.FallbackIntent',
              intentClosingSetting: {
                closingResponse: {
                  messageGroupsList: [
                    {
                      message: {
                        plainTextMessage: {
                          value:
                            "Sorry I am having trouble understanding. Can you describe what you'd like to do in a few words? I can help you find your account balance, transfer funds and open an account.",
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    });

    const chimeLexBotVersion = new lex.CfnBotVersion(
      this,
      'chimeLexBotVersion',
      {
        botId: chimeLexBot.ref,
        botVersionLocaleSpecification: [
          {
            botVersionLocaleDetails: {
              sourceBotVersion: 'DRAFT',
            },
            localeId: 'en_US',
          },
        ],
      },
    );

    const chimeLexBotAlias = new lex.CfnBotAlias(this, 'chimeLexBotAlias', {
      botAliasName: 'BankerBotDemo',
      botId: chimeLexBot.ref,
      botAliasLocaleSettings: [
        {
          botAliasLocaleSetting: {
            enabled: true,
            codeHookSpecification: {
              lambdaCodeHook: {
                codeHookInterfaceVersion: '1.0',
                lambdaArn: lexCodeHook.functionArn,
              },
            },
          },
          localeId: 'en_US',
        },
      ],
      conversationLogSettings: {
        audioLogSettings: [
          {
            destination: {
              s3Bucket: {
                logPrefix: 'chimeLexBot',
                s3BucketArn: lexAudioBucket.bucketArn,
              },
            },
            enabled: true,
          },
        ],
        textLogSettings: [
          {
            destination: {
              cloudWatch: {
                cloudWatchLogGroupArn: lexLogGroup.logGroupArn.toString(),
                logPrefix: 'chimeLexBot',
              },
            },
            enabled: true,
          },
        ],
      },
      botVersion: chimeLexBotVersion.getAtt('BotVersion').toString(),
      sentimentAnalysisSettings: { DetectSentiment: true },
    });

    const lexArn = `arn:aws:lex:${Stack.of(this).region}:${
      Stack.of(this).account
    }:bot-alias/${chimeLexBot.attrId}/${chimeLexBotAlias.attrBotAliasId}`;

    const lexPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowChimePstnAudioUseBot',
          Effect: 'Allow',
          Principal: {
            Service: 'voiceconnector.chime.amazonaws.com',
          },
          Action: 'lex:StartConversation',
          Resource: lexArn,
          Condition: {
            StringEquals: {
              'AWS:SourceAccount': `${Stack.of(this).account}`,
            },
            ArnEquals: {
              'AWS:SourceArn': `arn:aws:voiceconnector:${
                Stack.of(this).region
              }:${Stack.of(this).account}:*`,
            },
          },
        },
      ],
    };

    new lex.CfnResourcePolicy(this, 'LexResourcePolicy', {
      policy: lexPolicy,
      resourceArn: lexArn,
    });

    lexCodeHook.addPermission('Lex Invocation', {
      principal: new iam.ServicePrincipal('lexv2.amazonaws.com'),
      sourceArn: lexArn,
    });

    this.lexBotId = chimeLexBot.attrId;
    this.lexBotAliasId = chimeLexBotAlias.attrBotAliasId;
  }
}
