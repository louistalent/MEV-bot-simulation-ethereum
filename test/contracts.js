const { expect } = require("chai");
const { providers } = require("ethers");
const { ethers } = require("hardhat");
const { delay, fromBigNum, toBigNum } = require("./utils.js")

var ERC20ABI = artifacts.readArtifactSync("contracts/FakeUsdt.sol:IERC20").abi;
var exchangeRouter;
var exchangeFactory;
var wETH;

var sharkbabyToken;

var owner;
var userWallet;
var provider;

var DEXSwapV2PairContract;

describe("Create UserWallet", function () {
    it("Create account", async function () {
        [owner] = await ethers.getSigners();
        console.log(owner.address);

        provider = owner.provider;
        userWallet = ethers.Wallet.createRandom();
        userWallet = userWallet.connect(ethers.provider);
        // var tx = await owner.sendTransaction({
        //     to: userWallet.address,
        //     value: ethers.utils.parseUnits("100", 18)
        // });
        // await tx.wait();
    });
});

describe("Exchange deploy and deploy", function () {

    it("Factory deploy", async function () {
        const Factory = await ethers.getContractFactory("DEXSwapFactory");
        exchangeFactory = await Factory.deploy(owner.address);
        await exchangeFactory.deployed();
        console.log(await exchangeFactory.INIT_CODE_PAIR_HASH())
        console.log(exchangeFactory.address);
    });

    it("WETH deploy", async function () {
        const WETH = await ethers.getContractFactory("WETH");
        wETH = await WETH.deploy();
        await wETH.deployed();
        console.log(wETH.address);
    });

    it("Router deploy", async function () {
        const Router = await ethers.getContractFactory("DEXSwapRouter");
        exchangeRouter = await Router.deploy(exchangeFactory.address, wETH.address);
        await exchangeRouter.deployed();
        console.log(exchangeRouter.address);
    });

});

describe("Token contract deploy", function () {

    it("SHBY Deploy and Initial", async function () {
        const SHARKBABYTOKEN = await ethers.getContractFactory("EASTERSHIB");
        sharkbabyToken = await SHARKBABYTOKEN.deploy(exchangeRouter.address);
        await sharkbabyToken.deployed();
        //set paircontract 
        var pairAddress = await sharkbabyToken.PancakeSwapV2Pair();
        DEXSwapV2PairContract = new ethers.Contract(pairAddress, ERC20ABI, owner);
    });

    it("autoSharktoken and babytoken staking pool deploy and setFeeaddress", async function () {

        //setFeeAddress
        var tx = await sharkbabyToken.setFeeAddresses(
            process.env.MARKETINGADDRESS,
            process.env.GAMINGADDRESS,
            process.env.GAMINGADDRESS,
        );

        await tx.wait();
    })


    it("SHBY Add Liquidity", async function () {
        var tx = await sharkbabyToken.approve(exchangeRouter.address, ethers.utils.parseUnits("100000000", 18));
        await tx.wait();

        tx = await exchangeRouter.addLiquidityETH(
            sharkbabyToken.address,
            ethers.utils.parseUnits("500000", 18),
            0,
            0,
            owner.address,
            "111111111111111111111",
            { value: ethers.utils.parseUnits("5000", 18) }
        );
        await tx.wait();

        // set LP balance1
        LPBalance1 = await DEXSwapV2PairContract.balanceOf(owner.address);

    });

});
