const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.35.0',
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
  autoApproveUpgrades: true,
  projenUpgradeSecret: 'PROJEN_GITHUB_TOKEN',
  defaultReleaseBranch: 'main',
  name: 'amazon-chime-sdk-pstn-audio-lex-contact-center',
  eslintOptions: { ignorePatterns: ['cognito.ts', 'resources/**'] },
  devDeps: ['@types/prettier@2.6.4', 'esbuild', 'got@11.8.5', 'ts-node@10.9.1'],
  deps: ['cdk-amazon-chime-resources@latest'],
  scripts: {
    launch:
      'yarn && yarn projen && yarn build && yarn cdk bootstrap && yarn cdk deploy -O site/src/cdk-outputs.json',
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
