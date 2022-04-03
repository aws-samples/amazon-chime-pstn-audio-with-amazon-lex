import { Duration, NestedStackProps, NestedStack } from 'aws-cdk-lib';
import {
  RestApi,
  LambdaIntegration,
  EndpointType,
  MethodLoggingLevel,
  // CognitoUserPoolsAuthorizer,
  // AuthorizationType,
} from 'aws-cdk-lib/aws-apigateway';
// import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

interface InfrastructureProps extends NestedStackProps {
  readonly callerTable: dynamodb.Table;
  // readonly userPool: cognito.IUserPool;
}

export class Infrastructure extends NestedStack {
  public readonly apiUrl: string;
  public readonly asteriskEip: ec2.CfnEIP;

  constructor(scope: Construct, id: string, props: InfrastructureProps) {
    super(scope, id, props);

    this.asteriskEip = new ec2.CfnEIP(this, 'asteriskEip');

    const infrastructureRole = new iam.Role(this, 'infrastructureRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
    });

    const callQueryLambda = new NodejsFunction(this, 'callQueryLambda', {
      entry: './resources/callQuery/callQuery.js',
      bundling: {
        externalModules: ['aws-sdk'],
      },
      runtime: Runtime.NODEJS_14_X,
      architecture: Architecture.ARM_64,
      role: infrastructureRole,
      timeout: Duration.seconds(60),
      environment: {
        CALLER_TABLE_NAME: props.callerTable.tableName,
      },
    });

    props.callerTable.grantReadWriteData(callQueryLambda);

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

    // const auth = new CognitoUserPoolsAuthorizer(this, 'auth', {
    //   cognitoUserPools: [props.userPool],
    // });

    const query = api.root.addResource('query');

    const callQueryIntegration = new LambdaIntegration(callQueryLambda);

    query.addMethod('GET', callQueryIntegration, {
      // authorizer: auth,
      // authorizationType: AuthorizationType.COGNITO,
      requestParameters: { 'method.request.querystring.xCallId': false },
    });

    this.apiUrl = api.url;
  }
}
