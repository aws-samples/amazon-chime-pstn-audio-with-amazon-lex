import { App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { LexContactCenter } from '../src/pstn-audio-lex-contact-center';

test('Snapshot', () => {
  const app = new App();
  const stack = new LexContactCenter(app, 'test');

  const template = Template.fromStack(stack);
  template.hasOutput('APIURL', Match.objectLike({}));
  template.hasOutput('password', Match.objectLike({}));
  template.hasOutput('sipuri', Match.objectLike({}));
  template.hasOutput('ssmCommand', Match.objectLike({}));
  template.hasOutput('voiceConnectorPhone', Match.objectLike({}));
  template.hasOutput('websocket', Match.objectLike({}));
  template.resourceCountIs('AWS::CloudFormation::Stack', 5);
});
