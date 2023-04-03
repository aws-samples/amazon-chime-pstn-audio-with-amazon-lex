import { Duration } from 'aws-cdk-lib';
import {
  RestApi,
  LambdaIntegration,
  EndpointType,
  MethodLoggingLevel,
} from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

interface InfrastructureProps {
  readonly callerTable: dynamodb.Table;
}

export class Infrastructure extends Construct {
  public readonly queryAPI: RestApi;
  public readonly asteriskEip: ec2.CfnEIP;
  public readonly callQueryLambda: NodejsFunction;

  constructor(scope: Construct, id: string, props: InfrastructureProps) {
    super(scope, id);

    this.asteriskEip = new ec2.CfnEIP(this, 'asteriskEip');

    const infrastructureRole = new iam.Role(this, 'infrastructureRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
    });

    this.callQueryLambda = new NodejsFunction(this, 'callQueryLambda', {
      entry: './src/resources/callQuery/callQuery.js',
      bundling: {
        externalModules: ['aws-sdk'],
      },
      runtime: Runtime.NODEJS_16_X,
      architecture: Architecture.ARM_64,
      role: infrastructureRole,
      timeout: Duration.seconds(60),
      environment: {
        CALLER_TABLE_NAME: props.callerTable.tableName,
      },
    });

    props.callerTable.grantReadWriteData(this.callQueryLambda);

    const api = new RestApi(this, 'lexContactCenter', {
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: ['OPTIONS', 'GET'],
        allowCredentials: true,
        allowOrigins: ['*'],
      },
      deployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
      endpointConfiguration: {
        types: [EndpointType.REGIONAL],
      },
    });

    const query = api.root.addResource('query');

    const callQueryIntegration = new LambdaIntegration(this.callQueryLambda);

    query.addMethod('GET', callQueryIntegration, {
      requestParameters: { 'method.request.querystring.xCallId': false },
    });

    this.queryAPI = api;
  }
}
