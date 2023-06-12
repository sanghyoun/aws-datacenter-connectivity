import * as cdk from 'aws-cdk-lib';
import {Construct} from "constructs";
import {aws_iam, Stack, StackProps} from "aws-cdk-lib";
import {Role} from "aws-cdk-lib/aws-iam";
import {InfrastructureProperties} from "../bin/infrastructure-properties";

export class IamStack extends Stack {
    readonly adminRole: Role;

    constructor(scope: Construct, id: string, infraProps: InfrastructureProperties, props: StackProps) {
        super(scope, id, props);

        const m2mAdminRole = new aws_iam.Role(
            this,
            `${id}-${props?.env?.region}-AdminRole`,
            {
                roleName: "m2m-admin",
                assumedBy: new aws_iam.ServicePrincipal('ec2.amazonaws.com')
            }
        );
        m2mAdminRole.addManagedPolicy(aws_iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"));

        new aws_iam.CfnInstanceProfile(
            this,
            `${id}-${props?.env?.region}-AdminInstanceProfile`,
            {
                instanceProfileName: "m2m-admin",
                roles: [m2mAdminRole.roleName]
            }
        );

        this.adminRole = m2mAdminRole;

        // Print.
        new cdk.CfnOutput(
            this,
            `TravelBuddy M2M EC2 Admin Role ARN`, {
                value: m2mAdminRole.roleArn
            }
        );
    }
}
