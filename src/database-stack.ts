import {
  RemovalPolicy,
  NestedStackProps,
  NestedStack,
  Names,
} from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface DatabaseProps extends NestedStackProps {}

export class Database extends NestedStack {
  public readonly callerTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id, props);

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
