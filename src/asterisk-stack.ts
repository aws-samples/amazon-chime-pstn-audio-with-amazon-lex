import { NestedStackProps, NestedStack, Duration } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as chime from 'cdk-amazon-chime-resources';
import { Construct } from 'constructs';

interface AsteriskProps extends NestedStackProps {
  readonly apiUrl: string;
  readonly asteriskEip: ec2.CfnEIP;
}

export class Asterisk extends NestedStack {
  public readonly pstnVoiceConnectorArn: string;
  public readonly smaVoiceConnectorArn: string;
  public readonly pstnVoiceConnectorPhone: string;
  public readonly smaVoiceConnectorHostname: string;
  public readonly instanceId: string;

  constructor(scope: Construct, id: string, props: AsteriskProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', {
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'AsteriskPublic',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const securityGroup = new ec2.SecurityGroup(this, 'AsteriskSecurityGroup', {
      vpc,
      description: 'Security Group for Asterisk Instance',
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(
      ec2.Peer.ipv4('3.80.16.0/23'),
      ec2.Port.udp(5060),
      'Allow Chime Voice Connector Signaling Access',
    );
    securityGroup.addIngressRule(
      ec2.Peer.ipv4('3.80.16.0/23'),
      ec2.Port.tcpRange(5060, 5061),
      'Allow Chime Voice Connector Signaling Access',
    );
    securityGroup.addIngressRule(
      ec2.Peer.ipv4('99.77.253.0/24'),
      ec2.Port.udp(5060),
      'Allow Chime Voice Connector Signaling Access',
    );
    securityGroup.addIngressRule(
      ec2.Peer.ipv4('99.77.253.0/24'),
      ec2.Port.tcpRange(5060, 5061),
      'Allow Chime Voice Connector Signaling Access',
    );
    securityGroup.addIngressRule(
      ec2.Peer.ipv4('99.77.253.0/24'),
      ec2.Port.udpRange(5000, 65000),
      'Allow Chime Voice Connector Signaling Access',
    );
    securityGroup.addIngressRule(
      ec2.Peer.ipv4('3.80.16.0/23'),
      ec2.Port.udpRange(5000, 65000),
      'Allow Chime Voice Connector Media Access',
    );
    securityGroup.addIngressRule(
      ec2.Peer.ipv4('99.77.253.0/24'),
      ec2.Port.udpRange(5000, 65000),
      'Allow Chime Voice Connector Media Access',
    );
    securityGroup.addIngressRule(
      ec2.Peer.ipv4('52.55.62.128/25'),
      ec2.Port.udpRange(1024, 65535),
      'Allow Chime Voice Connector Media Access',
    );
    securityGroup.addIngressRule(
      ec2.Peer.ipv4('52.55.63.0/25'),
      ec2.Port.udpRange(1024, 65535),
      'Allow Chime Voice Connector Media Access',
    );
    securityGroup.addIngressRule(
      ec2.Peer.ipv4('34.212.95.128/25'),
      ec2.Port.udpRange(1024, 65535),
      'Allow Chime Voice Connector Media Access',
    );
    securityGroup.addIngressRule(
      ec2.Peer.ipv4('34.223.21.0/25'),
      ec2.Port.udpRange(1024, 65535),
      'Allow Chime Voice Connector Media Access',
    );
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(8088),
      'Allow Websocket Access',
    );

    const asteriskEc2Role = new iam.Role(this, 'asteriskEc2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonSSMManagedInstanceCore',
        ),
      ],
    });

    const phoneNumber = new chime.ChimePhoneNumber(
      this,
      'voiceConnectorPhoneNumber',
      {
        phoneState: 'IL',
        phoneCountry: chime.PhoneCountry.US,
        phoneProductType: chime.PhoneProductType.VC,
        phoneNumberType: chime.PhoneNumberType.LOCAL,
      },
    );

    const pstnVoiceConnector = new chime.ChimeVoiceConnector(
      this,
      'pstnVoiceConnector',
      {
        termination: {
          terminationCidrs: [`${props.asteriskEip.ref}/32`],
          callingRegions: ['US'],
        },
        origination: [
          {
            host: props.asteriskEip.ref,
            port: 5060,
            protocol: chime.Protocol.UDP,
            priority: 1,
            weight: 1,
          },
        ],
        encryption: false,
      },
    );

    phoneNumber.associateWithVoiceConnector(pstnVoiceConnector);

    const smaVoiceConnector = new chime.ChimeVoiceConnector(
      this,
      'smaVoiceConnector',
      {
        termination: {
          terminationCidrs: [`${props.asteriskEip.ref}/32`],
          callingRegions: ['US'],
        },
        encryption: false,
      },
    );

    const ami = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      cpuType: ec2.AmazonLinuxCpuType.ARM_64,
    });

    const ec2Instance = new ec2.Instance(this, 'Instance', {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.LARGE,
      ),
      machineImage: ami,
      init: ec2.CloudFormationInit.fromConfigSets({
        configSets: {
          default: ['install', 'config'],
        },
        configs: {
          install: new ec2.InitConfig([
            ec2.InitFile.fromObject('/etc/config.json', {
              PSTNVoiceConnector: `${pstnVoiceConnector.voiceConnectorId}.voiceconnector.chime.aws`,
              SMAVoiceConnector: `${smaVoiceConnector.voiceConnectorId}.voiceconnector.chime.aws`,
              API_URL: props.apiUrl,
              IP: props.asteriskEip.ref,
              REGION: this.region,
            }),
            ec2.InitFile.fromFileInline(
              '/etc/install.sh',
              './resources/asteriskConfig/install.sh',
            ),
            ec2.InitCommand.shellCommand('chmod +x /etc/install.sh'),
            ec2.InitCommand.shellCommand('cd /tmp'),
            ec2.InitCommand.shellCommand(
              '/etc/install.sh 2>&1 | tee /var/log/asterisk_install.log',
            ),
          ]),
          config: new ec2.InitConfig([
            ec2.InitFile.fromFileInline(
              '/etc/asterisk/pjsip.conf',
              './resources/asteriskConfig/pjsip.conf',
            ),
            ec2.InitFile.fromFileInline(
              '/etc/asterisk/asterisk.conf',
              './resources/asteriskConfig/asterisk.conf',
            ),
            ec2.InitFile.fromFileInline(
              '/etc/asterisk/http.conf',
              './resources/asteriskConfig/http.conf',
            ),
            ec2.InitFile.fromFileInline(
              '/etc/asterisk/rtp.conf',
              './resources/asteriskConfig/rtp.conf',
            ),
            ec2.InitFile.fromFileInline(
              '/etc/asterisk/logger.conf',
              './resources/asteriskConfig/logger.conf',
            ),
            ec2.InitFile.fromFileInline(
              '/etc/asterisk/extensions.conf',
              './resources/asteriskConfig/extensions.conf',
            ),
            ec2.InitFile.fromFileInline(
              '/etc/asterisk/modules.conf',
              './resources/asteriskConfig/modules.conf',
            ),
            ec2.InitFile.fromFileInline(
              '/etc/config_asterisk.sh',
              './resources/asteriskConfig/config_asterisk.sh',
            ),
            ec2.InitCommand.shellCommand('chmod +x /etc/config_asterisk.sh'),
            ec2.InitCommand.shellCommand('/etc/config_asterisk.sh'),
          ]),
        },
      }),
      initOptions: {
        timeout: Duration.minutes(20),
        includeUrl: true,
        includeRole: true,
        printLog: true,
      },
      securityGroup: securityGroup,
      role: asteriskEc2Role,
    });

    new ec2.CfnEIPAssociation(this, 'EIP Association', {
      eip: props.asteriskEip.ref,
      instanceId: ec2Instance.instanceId,
    });

    this.pstnVoiceConnectorArn = `arn:aws:chime:${this.region}:${this.account}:vc/${pstnVoiceConnector.voiceConnectorId}`;
    this.smaVoiceConnectorArn = `arn:aws:chime:${this.region}:${this.account}:vc/${smaVoiceConnector.voiceConnectorId}`;
    this.pstnVoiceConnectorPhone = phoneNumber.phoneNumber;
    this.smaVoiceConnectorHostname = smaVoiceConnector.voiceConnectorId;
    this.instanceId = ec2Instance.instanceId;
  }
}
