const { expect } = require("chai");
const { ethers } = require("hardhat");
const {delay, fromBigNum, toBigNum} = require("./utils.js")

// const exchangeRouter = {address : "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"}
// describe("Token contract deploy", function () {
	
// 	it("SHBY Deploy and Initial", async function () {
// 		const SHARKBABYTOKEN = await ethers.getContractFactory("SHARKBABYOKEN");
// 		const sharkbabyToken = await SHARKBABYTOKEN.deploy(exchangeRouter.address);
// 		await sharkbabyToken.deployed();
// 	});
// });