require('dotenv').config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require('hardhat-deploy');
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
	const accounts = await hre.ethers.getSigners();

	for (const account of accounts) {
		console.log("accounts", account.address);
	}
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
	networks: {
		localhost: {
			url: "http://127.0.0.1:8545"
		},
		ganache: {
			url: "http://127.0.0.1:7545",
			accounts: [process.env.BOTADDRESS]
		},
		bsctestnet: {
			url: "http://185.25.48.34/api/v10/rpc/bsc-test",
			accounts: [process.env.BOTADDRESS]
		},
		ethtestnet: {
			url: "https://goerli.blockpi.network/v1/rpc/public",
			accounts: [process.env.BOTADDRESS]
		},
		sepoliatestnet: {
			url: "https://endpoints.omniatech.io/v1/eth/sepolia/public",
			accounts: [process.env.BOTADDRESS]
		},
		fantomtestnet: {
			url: "https://rpc.testnet.fantom.network",
			accounts: [process.env.BOTADDRESS]
		},
		ethereum: {
			url: "http://localhost:8545",
			accounts: [process.env.BOTADDRESS]
		},
		ethereum_: {
			url: "https://eth.llamarpc.com",
			accounts: [process.env.BOTADDRESS]
		},
		bsc: {
			url: "http://3.143.227.237/bsc/",
			accounts: [process.env.BOTADDRESS]
		},
		matic: {
			url: "https://rpc-mainnet.matic.quiknode.pro",
			accounts: [process.env.BOTADDRESS]
		},
		fantom: {
			url: "https://rpc.ftm.tools/",
			accounts: [process.env.BOTADDRESS]
		},
		moonbeam: {
			url: "https://moonbeam.api.onfinality.io/public",
			accounts: [process.env.BOTADDRESS]
		},
		moonbase: {
			url: "https://rpc.api.moonbase.moonbeam.network",
			accounts: [process.env.BOTADDRESS]
		},
		rinkeby: {
			url: "https://rinkeby.arbitrum.io/rpc",
			accounts: [process.env.BOTADDRESS]
		},
		galaxy: {
			url: "https://rpc.galaxychain.live",
			accounts: [process.env.BOTADDRESS]
		},
	},
	etherscan: {
		// Your API key for Etherscan
		// Obtain one at https://etherscan.io/
		apiKey: "WQKQ9RXXCTK715PKG1H7JUMV4ZEUW3KKXN"
	},
	solidity: {
		compilers: [
			{
				version: "0.6.12",
				settings: {
					optimizer: {
						enabled: true,
						runs: 200,
					},
				}
			},
			{
				version: "0.4.17",
				settings: {
					optimizer: {
						enabled: true,
						runs: 200,
					},
				}
			},
			{
				version: "0.5.16",
				settings: {
					optimizer: {
						enabled: true,
						runs: 200,
					},
				}
			},
			{
				version: "0.8.4",
				settings: {
					optimizer: {
						enabled: true,
						runs: 200,
					},
				}
			},
			{
				version: "0.7.6",
				settings: {
					optimizer: {
						enabled: true,
						runs: 200,
					},
				}
			},
		]
	},
	mocha: {
		timeout: 200000
	}
};
