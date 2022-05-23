import {task} from "hardhat/config";
import {ethers} from "hardhat";

import { config as dotEnvConfig } from "dotenv";
import {BytesLike} from "@ethersproject/bytes/src.ts/index";
dotEnvConfig();

task("Bridge.redeem", "redeem")
    .addParam("bridge", "bridge contract address")
    .addParam("sender", "sender")
    .addParam("nonce", "nonce")
    .addParam("receiver", "receiver")
    .addParam("amount", "amount")
    .setAction(async (taskArgs, {ethers}) => {
        const factory = await ethers.getContractFactory("Bridge");
        const contract = await factory.attach(taskArgs.contract);

        const sender: string = ethers.utils.getAddress(taskArgs.sender);
        const receiver: string = ethers.utils.getAddress(taskArgs.receiver);
        const amount: number = taskArgs.amount;
        const nonce: number = taskArgs.nonce;
        
        const swapId: string = ethers.utils.solidityKeccak256(["address", "uint256"],[sender, nonce]);
        const msg: string = ethers.utils.solidityKeccak256(["bytes32", "uint256"],[swapId, amount]);

        const PRIVATE_KEY: BytesLike = process.env.PRIVATE_KEY || "";
        let wallet = new ethers.Wallet(new ethers.utils.SigningKey(PRIVATE_KEY));
        let sign: string = await wallet.signMessage(ethers.utils.arrayify(msg));
        
        await contract.connect(receiver).redeem(swapId, amount, sign);
        console.log(`sign: ${sign}`);
    });