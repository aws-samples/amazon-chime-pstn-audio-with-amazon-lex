import cdkExports from './cdk-outputs.json';

export const configData = cdkExports.LexContactCenter;

export const AmplifyConfig = {
    API: {
        endpoints: [
            {
                name: 'queryAPI',
                endpoint: configData.APIURL,
            },
        ],
    },
};
