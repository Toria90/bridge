﻿import { ethers } from "hardhat";
import {BigNumber} from "ethers";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying contract with the account: ${deployer.address}`);

    const balance : BigNumber = await deployer.getBalance();
    console.log(`Account balance: ${balance.toString()}`);
    
    const token = "0x065Ce3AB42d3B0a73459b1FF631B400E8048D745";
    const validator = "0x388CC371FFaCc75e9De3710A24cE6617b92Eb4e1";
    const chainId = 1;
    
    const factory = await ethers.getContractFactory("Bridge");
    let contract = await factory.deploy(chainId, token, validator);
    console.log(`contract address: ${contract.address}`);
    console.log(`transaction Id: ${contract.deployTransaction.hash}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) =>{
        console.error(error);
        process.exit(1);
    });