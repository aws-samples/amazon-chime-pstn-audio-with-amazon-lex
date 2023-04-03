#!/bin/bash -xe
## Copyright Amazon.com Inc. or its affiliates.
HOMEDIR=/home/ec2-user
cd /tmp
yum -y install make gcc gcc-c++ make subversion libxml2-devel ncurses-devel openssl-devel vim-enhanced man glibc-devel autoconf libnewt kernel-devel kernel-headers linux-headers openssl-devel zlib-devel libsrtp libsrtp-devel uuid libuuid-devel mariadb-server jansson-devel libsqlite3x libsqlite3x-devel epel-release.noarch bash-completion bash-completion-extras unixODBC unixODBC-devel libtool-ltdl libtool-ltdl-devel mysql-connector-odbc mlocate libiodbc sqlite sqlite-devel sql-devel.i686 sqlite-doc.noarch sqlite-tcl.x86_64 patch libedit-devel jq libcurl-devel git
yum -y install amazon-cloudwatch-agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/tmp/amazon-cloudwatch-agent.json
wget https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-18-current.tar.gz
tar xvzf asterisk-18-current.tar.gz 
cd asterisk-18*/
git clone https://github.com/drivefast/asterisk-res_json.git
./asterisk-res_json/install.sh
sed -i '35 i \            res_json \\' addons/Makefile
sed -i '39 i res_json.so: cJSON.o res_json.o' addons/Makefile
sed -i '4 i \                LINKER_SYMBOL_PREFIXcJSON_*;' main/asterisk.exports.in
./configure --libdir=/usr/lib64 --with-jansson-bundled
make menuselect.makeopts
menuselect/menuselect \
        --disable BUILD_NATIVE \
        --disable chan_sip \
        --disable chan_skinny \
        --disable format_mp3 \
        --enable cdr_csv \
        --enable res_snmp \
        --enable res_http_websocket \
        --enable res_curl \
        --enable res_config_curl \
        menuselect.makeopts
make 
make install
make basic-pbx
touch /etc/redhat-release
make config
ldconfig

