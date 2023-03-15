const colors = require("colors");
const fs = require("fs");
require("dotenv").config()
const { ethers } = require("hardhat");
const testToken = require("../src/constants/approvedTokenListTestnet.json")
const mainToken = require("../src/constants/approvedTokenListMainnet.json")

const tokenlist = process.env.TESTNET ? testToken : mainToken;

async function main() {
	// get network
	var [owner] = await ethers.getSigners();

	let network = await owner.provider._networkPromise;
	let chainId = network.chainId;

	console.log(chainId, owner.address);

	/* ----------- ERC20 TOKEN -------------- */
	{
		for (let token in mainToken) {
			let TOKEN = await (await ethers.getContractFactory("ERC20")).attach(`${token}`)
			var tx = await TOKEN.approve(
				process.env.UNISWAP2_ROUTER_ADDRESS,
				"0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
			);
			await tx.wait();
			console.log('approved : ' + TOKEN.address);
		}


	}

}

main()
	.then(() => {
		console.log("complete".green);
	})
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
