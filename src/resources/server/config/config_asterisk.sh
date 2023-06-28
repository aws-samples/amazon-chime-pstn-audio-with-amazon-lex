#!/bin/bash -xe

PUBLIC_IP=$( jq -r '.IP' /etc/config.json )
PSTN_VOICE_CONNECTOR=$( jq -r '.PSTN_VOICE_CONNECTOR' /etc/config.json )
SMA_VOICE_CONNECTOR=$( jq -r '.SMA_VOICE_CONNECTOR' /etc/config.json )
PSTN_PHONE_NUMBER=$( jq -r '.PSTN_PHONE_NUMBER' /etc/config.json )
API_URL=$( jq -r '.API_URL' /etc/config.json )
TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"`
INSTANCE_ID=$( curl -H "X-aws-ec2-metadata-token: $TOKEN" -v http://169.254.169.254/latest/meta-data/instance-id )
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/tmp/amazon-cloudwatch-agent.json

sed -i "s/PUBLIC_IP/$PUBLIC_IP/g" /etc/asterisk/pjsip.conf
sed -i "s/PSTN_VOICE_CONNECTOR/$PSTN_VOICE_CONNECTOR/g" /etc/asterisk/pjsip.conf
sed -i "s/SMA_VOICE_CONNECTOR/$SMA_VOICE_CONNECTOR/g" /etc/asterisk/pjsip.conf
sed -i "s/SMA_VOICE_CONNECTOR/$SMA_VOICE_CONNECTOR/g" /etc/asterisk/extensions.conf
sed -i "s/PSTN_PHONE_NUMBER/$PSTN_PHONE_NUMBER/g" /etc/asterisk/extensions.conf
sed -i "s/PSTN_PHONE_NUMBER/$PSTN_PHONE_NUMBER/g" /etc/asterisk/pjsip.conf
sed -i "s/INSTANCE_ID/$INSTANCE_ID/g" /etc/asterisk/pjsip.conf 
sed -i "s+API_URL+$API_URL+g" /etc/asterisk/extensions.conf

echo "PSTN_VOICE_CONNECTOR: ${PSTN_VOICE_CONNECTOR}"
echo "SMA_VOICE_CONNECTOR: ${SMA_VOICE_CONNECTOR}"
echo "PSTN_PHONE_NUMBER: ${PSTN_PHONE_NUMBER}"
echo "INSTANCE_ID: ${INSTANCE_ID}"

cd /etc/polly/
pip3 install boto3

python3 /etc/polly/createWav.py -file noAgent -text "Sorry, no agent is available to take your call at this time. Please try again later."
python3 /etc/polly/createWav.py -file disconnecting -text "Thanks for calling.  We are disconnecting you now."

usermod -aG audio,dialout asterisk
chown -R asterisk.asterisk /etc/asterisk
chown -R asterisk.asterisk /var/{lib,log,spool}/asterisk

echo '0 * * * * /sbin/asterisk -rx "core reload"' > /etc/asterisk/crontab.txt 
crontab /etc/asterisk/crontab.txt

systemctl restart asterisk
/sbin/asterisk -rx "core reload"

# cd /home/ubuntu/site
# yarn && yarn run build
# chown ubuntu:ubuntu /home/ubuntu/site -R
# systemctl enable nginx
# systemctl restart nginx

