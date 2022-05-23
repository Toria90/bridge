import {ethers} from "hardhat";
import {solidity} from "ethereum-waffle";
import chai from "chai";
import {Bridge,  ERC20Mock} from "../typechain-types"
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {BytesLike, ContractFactory} from "ethers";
import Min = Mocha.reporters.Min;
import {Bytes} from "ethers/lib/utils";
import exp from "constants";

chai.use(solidity);
const { expect } = chai;

describe("Bridge contract", () => {
    let accounts : SignerWithAddress[];
    let validator: SignerWithAddress;
    let bridgeAdmin: SignerWithAddress;
    let recipient: SignerWithAddress;

    let erc20 : ERC20Mock;
    let chainId: number;
    let chainTo: number;
    let bridge : Bridge;

    beforeEach(async () =>{
        accounts = await ethers.getSigners();
        [validator, bridgeAdmin, recipient] = await ethers.getSigners();
        chainId = 1;
        chainTo = 2;
        
        const erc20Factory : ContractFactory = await ethers.getContractFactory("ERC20Mock");
        erc20 = (await erc20Factory.deploy()) as ERC20Mock;
        
        const bridgeFactory : ContractFactory = await ethers.getContractFactory("Bridge");
        bridge = (await bridgeFactory.connect(bridgeAdmin).deploy(chainId, erc20.address, validator.address)) as Bridge;
        await bridge.connect(bridgeAdmin).enableChain(chainTo);
    });

    describe("deploy", () => {
        it("Should set right token", async () =>{
            expect(await bridge.token()).to.equal(erc20.address);
        });

        it("Should set right chain id", async () =>{
            expect(await bridge.chainId()).to.equal(chainId);
        });
    });

    describe("admin", () => {
        it("Should be able enable chain", async () =>{
            const otherChainId : number = 3;
            await bridge.connect(bridgeAdmin).enableChain(otherChainId);
            expect(await bridge.getChainStatus(otherChainId)).to.equal(true);
        });

        it("Should be able disable chain", async () =>{
            const otherChainId : number = 3;
            await bridge.connect(bridgeAdmin).enableChain(otherChainId);
            await bridge.connect(bridgeAdmin).disableChain(otherChainId);
            expect(await bridge.getChainStatus(otherChainId)).to.equal(false);
        });

        it("Should set right chain id", async () =>{
            expect(await bridge.chainId()).to.equal(chainId);
        });
    });

    describe("swap", () => {
        it("Shouldn't ba possible to not enable chain id", async () =>{
            const nonce : number = 1;
            const sender: SignerWithAddress = accounts[1];
            const amount : number = 100;
            const otherChain = 3;

            await expect(bridge.connect(sender).swap(nonce, amount, otherChain, recipient.address))
                .to.revertedWith("toChain id not supported");
        });

        it("Shouldn't ba possible to bridge chain", async () =>{
            const nonce : number = 1;
            const sender: SignerWithAddress = accounts[1];
            const amount : number = 100;

            await expect(bridge.connect(sender).swap(nonce, amount, chainId, recipient.address))
                .to.revertedWith("invalid toChain id");
        });
        
        it("Should change sender's balance", async () =>{
            const nonce : number = 1;
            const sender: SignerWithAddress = accounts[1];
            const amount : number = 100;

            await erc20.mint(sender.address, amount);
            await bridge.connect(sender).swap(nonce, amount, chainTo, recipient.address);

            expect(await erc20.balanceOf(sender.address)).to.equal(0);
        });

        it("Should reverted with insufficient funds", async () =>{
            const nonce : number = 1;
            const sender: SignerWithAddress = accounts[1];
            const amount : number = 100;

            await expect(bridge.connect(sender).swap(nonce, amount, chainTo, recipient.address))
                .revertedWith("balance less than amount");
        });

        it("Should reverted with duplicate nonce from one sender", async () =>{
            const nonce : number = 1;
            const sender: SignerWithAddress = accounts[1];
            const amount : number = 100;

            await erc20.mint(sender.address, amount + amount);
            await bridge.connect(sender).swap(nonce, amount, chainTo, recipient.address);

            await expect(bridge.connect(sender).swap(nonce, amount, chainTo, recipient.address))
                .revertedWith("duplicate transaction nonce");
        });

        it("Should be able with equal nonce and different senders", async () =>{
            const nonce : number = 1;
            const sender1: SignerWithAddress = accounts[1];
            const sender2: SignerWithAddress = accounts[2];
            const amount : number = 100;

            await erc20.mint(sender1.address, amount);
            await bridge.connect(sender1).swap(nonce, amount, chainTo, recipient.address);

            await erc20.mint(sender2.address, amount);
            await bridge.connect(sender2).swap(nonce, amount, chainTo, recipient.address);

            expect(await erc20.balanceOf(sender1.address)).to.equal(0);
            expect(await erc20.balanceOf(sender2.address)).to.equal(0);
        });
    });

    describe("redeem", () => {
        it("Shouldn't be able with wrong signature", async () =>{
            const sender: SignerWithAddress = accounts[1];
            const redeemAcc: SignerWithAddress = accounts[2];
            const notValidator: SignerWithAddress = accounts[3];
            const nonce: number = 1;
            const amount: number = 100;
            const swapId: string = ethers.utils.solidityKeccak256(["address", "uint256", "uint256", "uint256"],[sender.address, nonce, chainId, chainTo]);
            const msg: string = ethers.utils.solidityKeccak256(["bytes32", "uint256", "address"],[swapId, amount, recipient.address]);
            
            let sign: string = await notValidator.signMessage(ethers.utils.arrayify(msg));
            
            await expect(bridge.connect(redeemAcc).redeem(swapId, amount, recipient.address, sign))
                .revertedWith("invalid signature");
        });

        it("Shouldn't be able duplicate", async () =>{
            const sender: SignerWithAddress = accounts[1];
            const redeemAcc: SignerWithAddress = accounts[2];
            const nonce: number = 1;
            const amount: number = 100;
            const swapId: string = ethers.utils.solidityKeccak256(["address", "uint256", "uint256", "uint256"],[sender.address, nonce, chainId, chainTo]);
            const msg: string = ethers.utils.solidityKeccak256(["bytes32", "uint256", "address"],[swapId, amount, recipient.address]);

            let sign: string = await validator.signMessage(ethers.utils.arrayify(msg));
            await bridge.connect(redeemAcc).redeem(swapId, amount, recipient.address, sign);

            await expect(bridge.connect(redeemAcc).redeem(swapId, amount, recipient.address, sign))
                .revertedWith("duplicate redeem");
        });

        it("Should change recipient balance", async () =>{
            const sender: SignerWithAddress = accounts[1];
            const redeemAcc: SignerWithAddress = accounts[2];
            const nonce: number = 1;
            const amount: number = 100;
            const swapId: string = ethers.utils.solidityKeccak256(["address", "uint256", "uint256", "uint256"],[sender.address, nonce, chainId, chainTo]);
            const msg: string = ethers.utils.solidityKeccak256(["bytes32", "uint256", "address"],[swapId, amount, recipient.address]);

            let sign: string = await validator.signMessage(ethers.utils.arrayify(msg));
            await bridge.connect(redeemAcc).redeem(swapId, amount, recipient.address, sign);

            expect(await erc20.balanceOf(recipient.address)).to.equal(amount);
        });
    });

});