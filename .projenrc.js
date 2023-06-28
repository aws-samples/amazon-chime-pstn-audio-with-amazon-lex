const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.66.0',
  license: 'MIT-0',
  author: 'Court Schuett',
  copyrightOwner: 'Amazon.com, Inc.',
  authorAddress: 'https://aws.amazon.com',
  appEntrypoint: 'pstn-audio-lex-contact-center.ts',
  depsUpgradeOptions: {
    ignoreProjen: false,
    workflowOptions: {
      labels: ['auto-approve', 'auto-merge'],
    },
  },
  autoApproveOptions: {
    secret: 'GITHUB_TOKEN',
    allowedUsernames: ['schuettc'],
  },
  workflowNodeVersion: '16.x',
  autoApproveUpgrades: true,
  projenUpgradeSecret: 'PROJEN_GITHUB_TOKEN',
  defaultReleaseBranch: 'main',
  name: 'amazon-chime-sdk-pstn-audio-lex-contact-center',
  deps: ['cdk-amazon-chime-resources@latest', '@aws-sdk/client-lex-runtime-v2'],
  scripts: {
    launch:
      'yarn && yarn projen && yarn build && yarn cdk bootstrap && yarn cdk deploy --no-rollback -O site/src/cdk-outputs.json',
  },
});

const common_exclude = [
  'cdk.out',
  'cdk.context.json',
  'yarn-error.log',
  'dependabot.yml',
  '.DS_Store',
];

project.gitignore.exclude(...common_exclude);
project.synth();
