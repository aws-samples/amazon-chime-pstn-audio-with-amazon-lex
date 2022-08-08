import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { LexContactCenter } from '../src/pstn-audio-lex-contact-center';

test('Snapshot', () => {
  const app = new App();
  const stack = new LexContactCenter(app, 'test');

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
