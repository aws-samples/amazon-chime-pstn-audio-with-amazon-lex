import boto3
import os
import wave
import argparse
import sys
from botocore.config import Config

config = Config(
    region_name='us-east-1')

polly = boto3.client('polly', config=config)


def createPolly(pollyText, fileName):
    response = polly.synthesize_speech(
        OutputFormat='pcm',
        Text=pollyText,
        SampleRate='8000',
        VoiceId='Joanna'
    )

    if 'AudioStream' in response:
        outputWav = '/var/lib/asterisk/sounds/en/' + fileName + '.wav'
        with wave.open(outputWav, 'wb') as wav_file:
            wav_file.setparams((1, 2, 8000, 0, 'NONE', 'NONE'))
            wav_file.writeframes(response['AudioStream'].read())

    return outputWav


parse_msg = 'Simple utility to create wav files for SMA via Polly'
parser = argparse.ArgumentParser(prog='createWav.py', description=parse_msg)
parser.add_argument('-file', help='Name of file to be created (without .wav)')
parser.add_argument('-text', help='Text of the audio to be created in quotes')
args = parser.parse_args()

fileName = args.file
pollyText = args.text

if not fileName:
    print('Filename is rquired')
    sys.exit()

if not pollyText:
    print('Text is required')
    sys.exit()

wavFile = createPolly(pollyText, fileName)
print('wav file created: ' + wavFile)
