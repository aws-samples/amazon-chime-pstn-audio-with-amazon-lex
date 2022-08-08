import { RemovalPolicy, Names } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class Database extends Construct {
  public readonly callerTable: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.callerTable = new dynamodb.Table(this, 'callerTable', {
      tableName:
        'LexContactCenterDatabase' +
        Names.uniqueId(this).toLowerCase().slice(-8),
      partitionKey: {
        name: 'CallId',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'TTL',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
  }
}
