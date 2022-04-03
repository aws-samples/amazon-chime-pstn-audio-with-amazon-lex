import React, { useEffect, useState } from 'react';
import { phoneStore } from 'react-sip-phone';
import Grid from 'aws-northstar/layouts/Grid';
import KeyValuePair from 'aws-northstar/components/KeyValuePair';
import Button from 'aws-northstar/components/Button';
import styled from 'styled-components';
import { AmplifyConfig } from './Config';
// import { API } from 'aws-amplify';
// import API from '@aws-amplify/api';
import 'react-sip-phone/dist/index.css';
// import { API } from 'aws-amplify';
// import '@aws-amplify/ui-react/styles.css';
// import Auth from '@aws-amplify/auth';
import { Amplify, Auth, API } from 'aws-amplify';
import Container from 'aws-northstar/layouts/Container';

// API.configure(AmplifyConfig);
// API.configure(AmplifyConfig);
// Auth.configure(AmplifyConfig);
Amplify.configure(AmplifyConfig);

const LexData = () => {
    const [currentIncomingCallId, setCurrentIncomingCallId] = useState(null);
    const [sessionStateChanged, setSessionStateChanged] = useState(null);
    const [lexResults, setLexResults] = useState({});

    const StyledContainerDiv = styled.div`
        padding: 10px;
    `;

    const StyledRow = styled.div`
        padding-top: 10px;
    `;

    useEffect(() => {
        const phoneStoreUnsubscribe = phoneStore.subscribe(() => {
            const phoneStoreState = phoneStore.getState();
            const phoneStoreStateSipSessions = phoneStoreState.sipSessions;
            const phoneStoreStateSipSessionsStateChanged = phoneStoreStateSipSessions.stateChanged;
            setSessionStateChanged(phoneStoreStateSipSessionsStateChanged);
        });
        return phoneStoreUnsubscribe;
    }, []);

    useEffect(() => {
        if (sessionStateChanged !== null) {
            console.log(`sessionStateChanged: ${sessionStateChanged}`);
            const phoneStoreState = phoneStore.getState();
            const phoneStoreStateSipSessions = phoneStoreState.sipSessions.sessions;
            console.log(`sessionStateChanged -> phoneStoreStateSipSessions: `, phoneStoreStateSipSessions);
            const incomingCallId = Object.keys(phoneStoreStateSipSessions)[0];
            if (incomingCallId) {
                console.log(`sessionStateChanged -> incomingCallId: `, incomingCallId);
                if (incomingCallId !== currentIncomingCallId) {
                    setCurrentIncomingCallId(incomingCallId);
                }
            }
        }
    }, [sessionStateChanged]);

    useEffect(() => {
        if (currentIncomingCallId) {
            onIncomingCall(currentIncomingCallId);
        }
    }, [currentIncomingCallId]);

    function onIncomingCall(callId) {
        console.log(`onIncomingCall -> callId `, callId);
        const phoneStoreState = phoneStore.getState();
        const phoneStoreStateSipSessions = phoneStoreState.sipSessions.sessions;
        const currentSession = phoneStoreStateSipSessions[callId];
        console.log(`onIncomingCall -> currentSession `, currentSession);
        const incomingInviteRequest = currentSession.incomingInviteRequest;
        const inviteHeaders = incomingInviteRequest.message.headers;
        console.log(`onIncomingCall -> inviteHeaders `, inviteHeaders);
        const xCallId = inviteHeaders['X-Callid']?.[0]?.['raw'];
        console.log(`onIncomingCall -> XCallId:`, xCallId);
        dataDipByXCallId(xCallId);
    }

    async function dataDipByXCallId(xCallId) {
        console.log(`dataDipByXCallId -> xCallId `, xCallId);
        const queryResponse = await API.get('queryAPI', 'query', {
            queryStringParameters: {
                xCallId: xCallId,
            },
        });

        const completeResults = {
            ConfirmationState: queryResponse.ConfirmationState,
            CallingNumber: queryResponse.CallingNumber,
        };
        for (const [key, value] of Object.entries(queryResponse.LexResults)) {
            completeResults[key] = value;
        }
        console.log(completeResults);
        setLexResults(completeResults);
    }

    return (
        <StyledContainerDiv>
            <Container
                title="Lex Data"
                style={{ height: '350px', width: '400px', marginLeft: '-80px', marginTop: '20px' }}
                actionGroup={
                    <div>
                        <Button variant="primary" onClick={() => setLexResults({})}>
                            Clear
                        </Button>
                        <Button variant="primary" onClick={() => dataDipByXCallId(66506309)}>
                            Query
                        </Button>
                    </div>
                }
            >
                {Object.entries(lexResults).map(([key, value]) => {
                    return (
                        <StyledRow key={key}>
                            <KeyValuePair label={key} value={value}></KeyValuePair>
                            {/* {key} : {value} */}
                        </StyledRow>
                    );
                })}
            </Container>
        </StyledContainerDiv>
    );
};
export default LexData;
