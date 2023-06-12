import {aws_ec2, Stack, StackProps} from "aws-cdk-lib";
import {Construct} from "constructs";
import {InfrastructureProperties} from "../bin/infrastructure-properties";
import {ISubnet, IVpc} from "aws-cdk-lib/aws-ec2";

export class TgwAttachmentStack extends Stack {

    constructor(
        scope: Construct,
        id: string,
        infraProps: InfrastructureProperties,
        tgw: aws_ec2.CfnTransitGateway,
        vpc: IVpc,
        subnets: ISubnet[],
        props?: StackProps
    ) {
        super(scope, id, props);

        // Create TGW attachment.
        // Attach VPCs to the TGW.
        const tgwAttachment = new aws_ec2.CfnTransitGatewayAttachment(
            this,
            `${id}-TGW-Attachment`,
            {
                transitGatewayId: tgw.ref,
                vpcId: vpc.vpcId,
                subnetIds: [subnets[0].subnetId, subnets[1].subnetId],
                tags: [{
                    key: 'Name',
                    value: `${id}-TGW-Attachment`
                }],
            }
        );
        tgwAttachment.addDependency(tgw);
    }

}
