#!/bin/bash -xe
IP=$( jq -r '.IP' /etc/config.json )
PSTN_VOICE_CONNECTOR=$( jq -r '.PSTNVoiceConnector' /etc/config.json )
SMA_VOICE_CONNECTOR=$( jq -r '.SMAVoiceConnector' /etc/config.json )
API_URL=$( jq -r '.API_URL' /etc/config.json )
TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"`
LOCAL_HOSTNAME=$( curl -H "X-aws-ec2-metadata-token: $TOKEN" -v http://169.254.169.254/latest/meta-data/public-hostname )
INSTANCE_ID=$( curl -H "X-aws-ec2-metadata-token: $TOKEN" -v http://169.254.169.254/latest/meta-data/instance-id )

sed -i "s/IP_ADDRESS/$IP/g" /etc/asterisk/pjsip.conf
sed -i "s/INSTANCE_ID/$INSTANCE_ID/g" /etc/asterisk/pjsip.conf
sed -i "s/PSTN_VOICE_CONNECTOR/$PSTN_VOICE_CONNECTOR/g" /etc/asterisk/pjsip.conf
sed -i "s/SMA_VOICE_CONNECTOR/$SMA_VOICE_CONNECTOR/g" /etc/asterisk/pjsip.conf
sed -i "s+API_URL+$API_URL+g" /etc/asterisk/extensions.conf

groupadd asterisk
useradd -r -d /var/lib/asterisk -g asterisk asterisk
usermod -aG audio,dialout asterisk
chown -R asterisk.asterisk /etc/asterisk
chown -R asterisk.asterisk /var/{lib,log,spool}/asterisk

systemctl start asterisk

