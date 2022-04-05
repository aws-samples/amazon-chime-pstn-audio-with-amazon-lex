import React from 'react';
import NorthStarThemeProvider from 'aws-northstar/components/NorthStarThemeProvider';
import Header from 'aws-northstar/components/Header';
import Grid from 'aws-northstar/layouts/Grid';
import Phone from './Phone';
import LexData from './LexData';

import './App.css';

const App = () => {
    return (
        <NorthStarThemeProvider>
            <Header title="Amazon Chime SDK Lex Demo SIP Phone" logoPath="Chime.png" />
            <Grid container spacing={1}>
                <Grid>
                    <Phone />
                </Grid>
                <Grid>
                    <LexData />
                </Grid>
            </Grid>
        </NorthStarThemeProvider>
    );
};

export default App;
