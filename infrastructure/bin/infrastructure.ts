#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {InfrastructureProperties} from "./infrastructure-properties";
import {NetworkStack} from "../lib/network-stack";
import {EksStack} from "../lib/eks-stack";
import {BuildDeliveryStack} from "../lib/build-delivery-stack";
import {SsmStack} from "../lib/ssm-stack";
import {IamStack} from "../lib/iam-stack";
import {Ec2Stack} from "../lib/ec2-stack";
import {RdsLegacyStack} from "../lib/rds-legacy-stack";
import * as net from "net";
import {FlightSpecialDatabaseStack} from "../lib/flightspecial-database-stack";
import {
    AWS_PRIVATE_SUBNET_CIDRS_AZa,
    AWS_PRIVATE_SUBNET_CIDRS_AZb,
    AWS_PRIVATE_SUBNET_CIDRS_AZc,
    AWS_PUBLIC_SUBNET_CIDRS_AZa,
    AWS_PUBLIC_SUBNET_CIDRS_AZb,
    AWS_PUBLIC_SUBNET_CIDRS_AZc,
    AWS_VPC_CIDRS,
    DC_PRIVATE_SUBNET_CIDRS_AZa,
    DC_PRIVATE_SUBNET_CIDRS_AZb,
    DC_PRIVATE_SUBNET_CIDRS_AZc,
    DC_PUBLIC_SUBNET_CIDRS_AZa,
    DC_PUBLIC_SUBNET_CIDRS_AZb,
    DC_PUBLIC_SUBNET_CIDRS_AZc,
    DC_VPC_CIDRS
} from "../lib/env-utils";
import {TgwStack} from "../lib/tgw-stack";
import {TgwAttachmentStack} from "../lib/tgw-attachment-stack";

const app = new cdk.App();

/**
 * CDK_INTEG_XXX are set when producing the environment-aware values and CDK_DEFAULT_XXX is passed in through from the CLI in actual deployment.
 */
const env = {
    region: app.node.tryGetContext('region') || process.env.CDK_INTEG_REGION || process.env.CDK_DEFAULT_REGION,
    account: app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
};

/**
 * Basic VPC info for EKS clusters.
 * (참고) 아래에서 반드시 EKS Admin User와 Admin Role을 자신의 환경에 맞게 설정한다.
 * (참고) 설정하지 않아도 EKS 클러스터 생성 후에도 kubectl로 접근할 수 있다. 방법은?
 */
const infraProps: InfrastructureProperties = {
    stackNamePrefix: "DC2AWS",
    forAWS: true,
};

/**
 * IAM stack.
 */
const iamStack = new IamStack(
    app,
    `${infraProps.stackNamePrefix}-IamStack`,
    infraProps,
    {
        env
    }
);


/**
 * Network stack.
 */
// const networkStack = new NetworkStack(
//     app,
//     `${infraProps.stackNamePrefix}-NetworkStack`,
//     infraProps,
//     {
//         env
//     }
// );

const vpcCidrs = infraProps.publicSubnetCidrsAZa ?? (infraProps.forAWS ? AWS_VPC_CIDRS : DC_VPC_CIDRS);
const publicSubnetCidrsAZa = infraProps.publicSubnetCidrsAZa ?? (infraProps.forAWS ? AWS_PUBLIC_SUBNET_CIDRS_AZa : DC_PUBLIC_SUBNET_CIDRS_AZa);
const publicSubnetCidrsAZb = infraProps.publicSubnetCidrsAZa ?? (infraProps.forAWS ? AWS_PUBLIC_SUBNET_CIDRS_AZb : DC_PUBLIC_SUBNET_CIDRS_AZb);
const publicSubnetCidrsAZc = infraProps.publicSubnetCidrsAZa ?? (infraProps.forAWS ? AWS_PUBLIC_SUBNET_CIDRS_AZc : DC_PUBLIC_SUBNET_CIDRS_AZc);
const privateSubnetCidrsAZa = infraProps.publicSubnetCidrsAZa ?? (infraProps.forAWS ? AWS_PRIVATE_SUBNET_CIDRS_AZa : DC_PRIVATE_SUBNET_CIDRS_AZa);
const privateSubnetCidrsAZb = infraProps.publicSubnetCidrsAZa ?? (infraProps.forAWS ? AWS_PRIVATE_SUBNET_CIDRS_AZb : DC_PRIVATE_SUBNET_CIDRS_AZb);
const privateSubnetCidrsAZc = infraProps.publicSubnetCidrsAZa ?? (infraProps.forAWS ? AWS_PRIVATE_SUBNET_CIDRS_AZc : DC_PRIVATE_SUBNET_CIDRS_AZc);

const networkStacks = vpcCidrs.map((vpcCidr, idx) =>
    new NetworkStack(
        app,
        `${infraProps.stackNamePrefix}-NetworkStack-${idx}`,
        infraProps,
        vpcCidr,
        publicSubnetCidrsAZa[idx],
        publicSubnetCidrsAZc[idx],
        privateSubnetCidrsAZa[idx],
        privateSubnetCidrsAZc[idx],
        {
            env
        }
    )
);

if (infraProps.forAWS) {
    const tgwStack = new TgwStack(
        app,
        `${infraProps.stackNamePrefix}-TgwStack`,
        infraProps,
        {
            env
        }
    );
    networkStacks.map(networkStack => tgwStack.addDependency(networkStack));

    const tgwAttachmentStacks = networkStacks.map(
        (networkStack, idx) => new TgwAttachmentStack(
            app,
            `${infraProps.stackNamePrefix}-TgwAttachmentStack`,
            infraProps,
            tgwStack.tgw,
            networkStack.vpc,
            networkStack.privateSubnets,
            {env}
        )
    );
}

// /**
//  * RDS bastion instances and some possible others.
//  */
// const ec2Stack = new Ec2Stack(
//     app,
//     `${infraProps.stackNamePrefix}-Ec2Stack`,
//     networkStack.vpc,
//     networkStack.eksPublicSubnets,
//     iamStack.adminRole,
//     {
//         env
//     }
// );
//
// /**
//  * EKS Cluster Stack.
//  */
// const eksStarck = new EksStack(
//     app,
//     `${infraProps.stackNamePrefix}-EksStack`,
//     networkStack.vpc,
//     networkStack.eksPublicSubnets,
//     networkStack.eksPrivateSubnets,
//     `${infraProps.stackNamePrefix}-EksCluster`,
//     "m2m",
//     infraProps.eksClusterAdminIamUser ?? "",
//     infraProps.eksClusterAdminIamRole ?? "",
//     {
//         env
//     }
// );
// eksStarck.addDependency(networkStack);
//
// /**
//  * Build and delivery stack.
//  */
// const buildAndDeliveryStack = new BuildDeliveryStack(
//     app,
//     `${infraProps.stackNamePrefix}-BuildAndDeliveryStack`,
//     eksStarck.eksCluster,
//     eksStarck.eksDeployRole,
//     {
//         env
//     }
// );
// buildAndDeliveryStack.addDependency(eksStarck);
//
// /**
//  * FlightSpecial build and delivery stack.
//  */
// const flightspecialBuildandDeliveryStack = new BuildDeliveryStack(
//     app,
//     `${infraProps.stackNamePrefix}-FlightSpecialCICDStack`,
//     eksStarck.eksCluster,
//     eksStarck.eksDeployRole,
//     {
//         env
//     }
// );
// flightspecialBuildandDeliveryStack.addDependency(eksStarck);
//
// /**
//  * SSM Stack.
//  */
// const ssmStack = new SsmStack(
//     app,
//     `${infraProps.stackNamePrefix}-SsmStack`,
//     {
//         env
//     }
// );
//
// /**
//  * [2023-06-03] RDS legacy stack for legacy TravelBuddy application.
//  */
// const rdsLegacyStack = new RdsLegacyStack(
//     app,
//     `${infraProps.stackNamePrefix}-RdsLegacyStack`,
//     networkStack.vpc,
//     networkStack.eksPrivateSubnets,
//     {
//         env
//     }
// );
// rdsLegacyStack.addDependency(networkStack);
//
// /**
//  * [2023-06-03] Postgres Database stack for FlightSpecial microservice.
//  */
// const flightspecialDatabaseStack = new FlightSpecialDatabaseStack(
//     app,
//     `${infraProps.stackNamePrefix}-FlightSpecialDatabaseStack`,
//     networkStack.vpc,
//     networkStack.eksPrivateSubnets,
//     {
//         env
//     }
// );
// flightspecialDatabaseStack.addDependency(networkStack);
