import React from 'react';
import NorthStarThemeProvider from 'aws-northstar/components/NorthStarThemeProvider';
import AppLayout, { useAppLayoutContext } from 'aws-northstar/layouts/AppLayout';
// import { AmplifyConfig } from './Config';
// import { Amplify } from 'aws-amplify';
// import { withAuthenticator } from '@aws-amplify/ui-react';
import Header from 'aws-northstar/components/Header';
import Container from 'aws-northstar/layouts/Container';
import Text from 'aws-northstar/components/Text';
import Button from 'aws-northstar/components/Button';
import ColumnLayout, { Column } from 'aws-northstar/layouts/ColumnLayout';
import Card from 'aws-northstar/components/Card';
import Grid from 'aws-northstar/layouts/Grid';
import Stack from 'aws-northstar/layouts/Stack';
import Box from 'aws-northstar/layouts/Box';
import Phone from './Phone';
import LexData from './LexData';
// import './App.css';

// Amplify.configure(AmplifyConfig);
// API.configure(AmplifyConfig);
// Amplify.Logger.LOG_LEVEL = 'DEBUG';

const App = () => {
    return (
        <NorthStarThemeProvider>
            <Header title="Amazon Chime SDK Lex Demo SIP Phone" logoPath="Chime.png" />
            <Grid container spacing={6}>
                <Grid item xs={4}>
                    <Phone />
                </Grid>
                <Grid item xs={4}>
                    <LexData />
                </Grid>
            </Grid>
        </NorthStarThemeProvider>
    );
};

// export default withAuthenticator(App);
export default App;
