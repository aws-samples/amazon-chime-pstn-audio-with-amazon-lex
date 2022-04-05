import React from 'react';
import { ReactSipPhone } from 'react-sip-phone';
import './phone.css';
import { configData } from './Config';
import Container from 'aws-northstar/layouts/Container';
const sipuri = configData.sipuri;
const password = configData.password;
const websocket = configData.websocket;

const Phone = () => {
    return (
        <Container title="SIP Phone" style={{ height: '350px', width: '400px', marginLeft: '50px', marginTop: '50px' }}>
            <ReactSipPhone
                sipCredentials={{
                    sipuri: sipuri,
                    password: password,
                }}
                sipConfig={{
                    websocket: websocket,
                    iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
                }}
                phoneConfig={{
                    disabledButtons: ['hold', 'transfer', 'numpad'],
                    disabledFeatures: ['dialstring', 'remoteid', 'settings'],
                    autoAnswer: false,
                }}
                appConfig={{
                    mode: 'strict',
                    started: true,
                    appSize: 'large',
                }}
                containerStyle={{
                    height: '350px',
                    width: '350px',
                    marginLeft: '30px',
                    marginTop: '10px',
                    overflow: 'hidden',
                }}
            />
        </Container>
    );
};
export default Phone;
