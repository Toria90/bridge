import {task} from "hardhat/config";
import {ethers} from "hardhat";

task("Bridge.swap", "swap")
    .addParam("bridge", "bridge contract address")
    .addParam("sender", "sender address")
    .addParam("nonce", "nonce")
    .addParam("amount", "amount")
    .addParam("tochain", "to chain id")
    .setAction(async (taskArgs, {ethers}) => {
        const factory = await ethers.getContractFactory("Bridge");
        const contract = await factory.attach(taskArgs.contract);

        const sender: string = ethers.utils.getAddress(taskArgs.sender);
        const amount: number = taskArgs.amount;
        const nonce: number = taskArgs.nonce;
        const toChain: number = taskArgs.tochain;

        await contract.connect(sender).swap(toChain, nonce, amount);
        const swapId: string = ethers.utils.solidityKeccak256(["address", "uint256"],[sender, nonce]);
        console.log(`swapId: ${swapId}`);
    });