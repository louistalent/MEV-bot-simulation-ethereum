
// web router / rest & socket / RPC interface / session management

require("dotenv").config()
import * as express from 'express'
import Web3 from 'web3';
import fs, { truncateSync } from 'fs';

// import { parse as uuidParse } from 'uuid'
// import { now } from '@src/utils/helper'
// import cache from '../utils/cache'
// import { isValidCode } from '@src/utils/crc32'
import setlog from '../setlog'
import { BigNumber, ethers } from 'ethers'
import { now, Parse, Format, hexToDecimal, asHex } from '../utils/helper'
import axios from 'axios'
// import { Prices } from '../Model'
import {
	MAXGASLIMIT, SYMBOL, ETHNETWORK, CHECKED, TESTNET, RPC_URL, TIP, RPC_URL2,
	LAST_SELL_GAS_FEE, BOTADDRESS, cronTime, UNISWAP2_ROUTER_ADDRESS, BENEFIT_FOR_TX,
	UNISWAPV2_FACTORY_ADDRESS, EXTRA_TIP_FOR_MINER, BLOCKTIME_FOR_GAS_WAR, MINIMUM_BENEFIT, whitelists, toLower, dexMethodList, ifaceList
} from '../constants'

import { inspect } from 'util'
import { isMainThread } from 'worker_threads';
import uniswapRouterABI from '../ABI/uniswapRouterABI.json';
import uniswapFactoryABI from '../ABI/uniswapFactoryABI.json';
import uniswapPairABI from '../ABI/uniswapPairABI.json';
import erc20ABI from '../ABI/erc20ABI.json';
import { MinKey, Transaction } from 'mongodb';
import { sign } from 'crypto';
import approvedTokenListTestnet from "../constants/approvedTokenListTestnet.json";
import approvedTokenListMainnet from "../constants/approvedTokenListMainnet.json";
import { checkPrices } from "../utils/checkPrice";
import { getNewTxsFromMempool, getPendingTransaction_web3 } from './mempool';
import rpc, { latestBlockInfo } from './blockchain';
import { parse } from 'path';
import { getOldTxsFromMempoolQuickNode, getPendingTransactionOfQuick, subscription, web3Socket } from './quicknode';

const approvedTokenList = TESTNET ? approvedTokenListTestnet as any : approvedTokenListMainnet as any;

const web3 = new Web3(RPC_URL)
const router = express.Router()
const prices = {} as { [coin: string]: number }
const gasPrices = {} as { [chain: string]: number };
const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
const provider2 = new ethers.providers.JsonRpcProvider(RPC_URL2)
const wallet = new ethers.Wallet(BOTADDRESS, provider);
const signer = wallet.connect(provider);
const owner = wallet.address;

const Uniswap2Router = new ethers.Contract(UNISWAP2_ROUTER_ADDRESS, uniswapRouterABI, provider2);
const Uniswap2Factory = new ethers.Contract(UNISWAPV2_FACTORY_ADDRESS, uniswapFactoryABI, provider);

var signedUniswap2Router = Uniswap2Router.connect(signer);
var signedUniswap2Factory = Uniswap2Factory.connect(signer);
let scanedTransactions: any = [];
let _oldTxsOfQuickNode: any;
const signedUniswap2Pair = async (pairContractAddress: string) => {
	const Uniswap2Pair = new ethers.Contract(pairContractAddress, uniswapPairABI, provider);
	return Uniswap2Pair;
}

export const initApp = async () => {
	try {
		console.log(`start scanning : `);
		// _oldTxsOfQuickNode = await getOldTxsFromMempoolQuickNode();
		// time = setTimeout(() => {
		// if (_oldTxsOfQuickNode) {
		// 	inspectQuickNode();
		cron()
		// } else {
		// 	console.log('wow stresss')
		// }
		// }, 60000);//60 second
	} catch (error) {
		console.log('initApp', initApp)
	}
}

const checkActiveWallet = async () => {
	const balance = await provider.getBalance(wallet.address);
	let VALUE = ethers.utils.formatEther(balance);
	if (Number(VALUE) > ETHNETWORK || TESTNET) {
		return true;
	} else {
		return false;
	}
}
const cron = async () => {
	try {
		let _newTxs = await getNewTxsFromMempool();
		if (_newTxs !== null) {
			await findOppotunity(_newTxs, "minernode")
		}
		await checkInspectedData();
		// await getPendingTransaction_web3()
	} catch (error) {
		console.log('cron', error);
	}
	setTimeout(cron, cronTime)
}
const getDecimal = (tokenAddress: string) => {
	const tokens = approvedTokenList;
	const result = tokenAddress in tokens;
	if (result) {
		return Number(tokens[`${tokenAddress}`].decimal);
	} else {
		return 18;
	}
}
const getSymbol = (tokenAddress: string) => {
	const tokens = approvedTokenList;
	const result = tokenAddress in tokens;
	if (result) {
		return tokens[`${tokenAddress}`].symbol;
	} else {
		return 'ETH';
	}
}
const calculateGasPrice = (action: any, amount: any) => {
	let number = parseInt(amount, 16);
	console.log('calculateGasPrice number : ', number);
	if (action === "buy") {
		console.log('buy number + TIP : ', number + (TIP / 2));
		return "0x" + (number + (TIP / 2)).toString(16)
	} else {
		console.log('sell number - 8 : ', number - 8);
		return "0x" + (number - 8).toString(16)
	}
}
const calculateETH = (gasLimit_: any, gasPrice: any) => {
	try {
		let TIP_ = TIP;
		let GweiValue = ethers.utils.formatUnits(gasPrice, "gwei");
		let totalGwei = Number(gasLimit_) * (Number(GweiValue) + Number(ethers.utils.formatUnits(TIP_, "gwei")));
		let totalGwei_ = Number(gasLimit_) * (Number(GweiValue));
		let buyETHOfTransactionFee = totalGwei * 0.000000001;
		let sellETHOfTransactionFee = totalGwei_ * 0.000000001;
		fs.appendFileSync(`./approvedResult.csv`, `gasLimit_: gasPrice ${gasLimit_} ${gasPrice} ` + '\t\n');
		fs.appendFileSync(`./approvedResult.csv`, `buyETHOfTransactionFee: ${buyETHOfTransactionFee} ` + '\t\n');
		fs.appendFileSync(`./approvedResult.csv`, `sellETHOfTransactionFee: ${sellETHOfTransactionFee} ` + '\t\n');

		return Number(buyETHOfTransactionFee) + Number(sellETHOfTransactionFee);
	} catch (error: any) {
		console.log('calculateETH :', error)
	}
}
const botAmountForPurchase = async (transaction: any, decodedDataOfInput: any, minAmount: number, pairPool: any, poolToken0: any, decimalOut: number) => {
	let poolIn, poolOut;
	if (toLower(decodedDataOfInput.path[0]) == toLower(poolToken0)) {
		poolIn = Number(pairPool._reserve0);
		poolOut = Number(pairPool._reserve1);
	} else {
		poolIn = Number(pairPool._reserve1);
		poolOut = Number(pairPool._reserve0);
	}
	let amountIn = Number(transaction.value) * 997 / 1000;
	let a = amountIn;
	let b = (amountIn / minAmount) * poolIn * poolOut;
	let x = (Math.sqrt(Math.pow(a, 2) + 4 * b) - a) / 2;
	let botPurchaseAmount_ = x - poolIn;
	fs.appendFileSync(`./approvedResult.csv`, `botPurchaseAmount_ amountIn minamount ${botPurchaseAmount_} ${Number(Format(amountIn.toString()))} ${Number(Format(minAmount.toString(), decimalOut))}} ` + '\t\n');
	return Number(Format(botPurchaseAmount_.toString())); // ETH amount for purchase
}
const calculateProfitAmount = async (decodedDataOfInput: any, profitAmount: number, transaction: any, poolToken0: any, pairReserves: any, minAmount: any) => {
	try {
		let decimalIn = getDecimal(toLower(decodedDataOfInput.path[0]))
		let decimalOut = getDecimal(toLower(decodedDataOfInput.path[decodedDataOfInput.path.length - 1]))

		let poolIn = "", poolOut = "";
		if (toLower(decodedDataOfInput.path[0]) == toLower(poolToken0)) {
			poolIn = Format(pairReserves._reserve0.toString(), decimalIn)
			poolOut = Format(pairReserves._reserve1.toString(), decimalOut)
		} else {
			poolIn = Format(pairReserves._reserve1.toString(), decimalIn)
			poolOut = Format(pairReserves._reserve0.toString(), decimalOut)
		}
		let botAmountIn = profitAmount
		let fromToken = getSymbol(toLower(decodedDataOfInput.path[0]))
		let toToken = getSymbol(toLower(decodedDataOfInput.path[decodedDataOfInput.path.length - 1]))

		let frontbuy = await signedUniswap2Router.getAmountOut(Parse(botAmountIn, decimalIn), Parse(poolIn, decimalIn), Parse(poolOut, decimalOut))
		console.log(`Buy : from (${botAmountIn} ${fromToken}) to (${Format(frontbuy, decimalOut)} ${toToken})`)
		fs.appendFileSync(`./approvedResult.csv`, `Buy : from (${botAmountIn} ${fromToken}) to (${Format(frontbuy, decimalOut)} ${toToken})` + '\t\n');

		let changedPoolIn = Number(poolIn) + Number(botAmountIn);
		let changedPoolOut = Number(poolOut) - Number(Format(frontbuy, decimalOut));
		let userAmountIn = Number(Format(transaction.value));
		let UserTx = await signedUniswap2Router.getAmountOut(Parse(userAmountIn, decimalIn), Parse(changedPoolIn, decimalIn), Parse(changedPoolOut, decimalOut));
		changedPoolIn = changedPoolIn + userAmountIn;
		changedPoolOut = changedPoolOut - Number(Format(UserTx, decimalOut));
		console.log(`User : from (${userAmountIn} ${fromToken}) to (${Format(UserTx, decimalOut)} ${toToken})`)
		fs.appendFileSync(`./approvedResult.csv`, `User : from (${userAmountIn} ${fromToken}) to (${Format(UserTx, decimalOut)} ${toToken})` + '\t\n');
		fs.appendFileSync(`./approvedResult.csv`, `User minAmount: ${Format(minAmount, decimalOut)}` + '\t\n');

		if (Number(UserTx) >= Number(Format(minAmount, decimalOut))) {
			let backsell = await signedUniswap2Router.getAmountOut(frontbuy, Parse(changedPoolOut, decimalOut), Parse(changedPoolIn, decimalIn))
			console.log(`Sell : from (${Format(frontbuy, decimalOut)} ${toToken}) to (${Format(backsell)} ${fromToken})`)
			fs.appendFileSync(`./approvedResult.csv`, `from (${Format(frontbuy, decimalOut)} ${toToken}) to (${Format(backsell)} ${fromToken})` + '\t\n');
			let Revenue = Number(Format(backsell)) - botAmountIn;
			console.log(`Expected Profit :Profit(${Format(backsell)} ${fromToken})-Buy(${botAmountIn} ${fromToken})= ${Revenue} ${fromToken}`)
			fs.appendFileSync(`./approvedResult.csv`, `Expected Profit :Profit(${Format(backsell)} ${fromToken})-Buy(${botAmountIn} ${fromToken})= ${Revenue} ${fromToken}` + '\t\n');
			if (Number(Format(backsell)) < botAmountIn) {
				console.log(`bot will sandwith but no profit`)
				return null
			}
			return [Revenue, frontbuy]
		} else {
			console.log(`User expected min amount is ${Number(Format(minAmount, decimalOut))} but got ${Number(Format(UserTx, decimalOut))}`)
			console.log(`User transaction will fail. Cannot sandwith with ${botAmountIn} ETH`)
			return null
		}

	} catch (error: any) {
		console.log('calculateProfitAmount', error);
	}
}
const estimateProfit = async (decodedDataOfInput: any, transaction: any, ID: string, type: string) => {
	try {
		const signedUniswap2Pair_ = await signedUniswap2Pair(approvedTokenList[toLower(decodedDataOfInput.path[decodedDataOfInput.path.length - 1])].pair)
		const poolToken0 = await signedUniswap2Pair_.token0();
		const pairReserves = await signedUniswap2Pair_.getReserves();
		let decimalOut = getDecimal(toLower(decodedDataOfInput.path[decodedDataOfInput.path.length - 1]))
		let buyAmount: number = 0;
		const txValue = web3.utils.fromWei(transaction.value.toString());
		let amountOutMin: number = 100;
		let amountOut: number = 100;
		let isMinAmount: boolean = true;
		try {
			amountOutMin = Number(Format(decodedDataOfInput.amountOutMin.toString(), decimalOut))
			isMinAmount = true;
		} catch (error: any) {
			amountOut = Number(Format(decodedDataOfInput.amountOut.toString(), decimalOut))
			isMinAmount = false;
			fs.appendFileSync(`./approvedResult.csv`, `catch error amountOut: ${amountOut} ` + '\t\n');
		}
		const minAmount = isMinAmount ? amountOutMin : amountOut;
		if (amountOutMin == 0 || amountOut == 0) {
			if (ID === "TOKEN") {
				// amountIn  -> amountOutMin
				// amountOut -> amountInMax
				let inputValueOfTransaction = isMinAmount ? decodedDataOfInput.amountIn : decodedDataOfInput.amountInMax
				let inputValueOfTransaction_ = Format(inputValueOfTransaction.toString(), decimalOut)
				buyAmount = Number(inputValueOfTransaction_)
				let ETHAmountForGas = calculateETH(transaction.gas, transaction.gasPrice)
				// let ETHAmountOfBenefit = 0;
				console.log('ETHAmountForGas :', ETHAmountForGas);
				const profitAmount_: any = await calculateProfitAmount(decodedDataOfInput, buyAmount, transaction, poolToken0, pairReserves, minAmount)
				if (profitAmount_ !== null) {
					if (profitAmount_[0])
						return [buyAmount, profitAmount_[1]];
					else
						console.log('************ No Benefit ************')
				} else {
					console.log('************ No Benefit ************')
				}
			} else if (ID === "ETH") {
				fs.appendFileSync(`./approvedResult.csv`, `Here amountOut : ${amountOut} ` + '\t\n');
				buyAmount = Number(txValue);
				let ETHAmountForGas = calculateETH(transaction.gas, transaction.gasPrice)
				const ETHOfProfitAmount: any = await calculateProfitAmount(decodedDataOfInput, buyAmount, transaction, poolToken0, pairReserves, minAmount)
				if (ETHOfProfitAmount !== null) {
					let realBenefit = Number(ETHOfProfitAmount[0]) - Number(ETHAmountForGas);
					console.log(`Real: Benefit ${Number(ETHOfProfitAmount[0])} - Gas ${Number(ETHAmountForGas)} = `, realBenefit)
					if (Number(ETHOfProfitAmount[0]) > ETHAmountForGas)
						return [buyAmount, ETHOfProfitAmount[1], Number(ETHOfProfitAmount[0]), Number(ETHAmountForGas), realBenefit];// ETHOfProfitAmount[1] -> sell amount
					else {
						console.log('************ No Benefit ************')
					}
				} else {
					console.log('************ No Benefit ************')
				}
			}
		} else {//calculate slippage
			console.log('calculate slippage : => ')
			try {
				if (ID === "ETH") {
					// slippage = (transaction amount - expected amount) / expected amount
					fs.appendFileSync(`./approvedResult.csv`, `Hash : ${transaction.hash} ` + '\t\n');
					let botPurchaseAmount;
					if (type === "swapETHForExactTokens") {
						botPurchaseAmount = Number(txValue);
					} else if (type === "swapExactETHForTokens") {
						botPurchaseAmount = await botAmountForPurchase(transaction, decodedDataOfInput, Number(Parse(amountOutMin, decimalOut)), pairReserves, poolToken0, decimalOut);
					}
					console.log('botPurchaseAmount: ', botPurchaseAmount)
					fs.appendFileSync(`./approvedResult.csv`, `botAmountForPurchase : ${botPurchaseAmount} ` + '\t\n');
					let ETHAmountForGas = calculateETH(transaction.gas, transaction.gasPrice)
					console.log('ETHAmountForGas :', ETHAmountForGas);
					let ETHAmountOfBenefit = await calculateProfitAmount(decodedDataOfInput, botPurchaseAmount, transaction, poolToken0, pairReserves, Parse(minAmount, decimalOut));
					if (ETHAmountOfBenefit !== null) {
						let realBenefit = Number(ETHAmountOfBenefit[0]) - Number(ETHAmountForGas);
						fs.appendFileSync(`./approvedResult.csv`, `realBenefit : ${realBenefit} ` + '\t\n');
						if (Number(ETHAmountOfBenefit[0]) > ETHAmountForGas) {
							return [botPurchaseAmount, ETHAmountOfBenefit[1], Number(ETHAmountOfBenefit[0]), Number(ETHAmountForGas), realBenefit]
						} else {
							console.log("No benefit")
							return null;
						}
					} else {
						console.log("No benefit")
						return null;
					}
				}
			} catch (error: any) {
				console.log('Uniswap v2 error', error)
			}
		}
	} catch (error) {
		console.log("estimateProfit " + error)
	}
}
const findOppotunity = async (_newTxs: { [txId: string]: any }, node: string) => {
	try {
		for (let hash in _newTxs) {
			const v = _newTxs[hash];
			if (!v.to || v.input === '0x' || whitelists.indexOf(toLower(v.to)) === -1) continue;
			fs.appendFileSync(`./save_tx.csv`, ` Checkable tx: ${v.hash}` + '\t\n');
			analysisTransaction(v, node)
		}
	} catch (error) {
		console.log("findOppotunity " + error)
	}
}
const validateDexTx = (input: string): [method: string, result: any] | null => {
	for (let i of dexMethodList) {
		try {
			return [i, ifaceList.decodeFunctionData(i, input)]
		} catch (error) { }
	}
	return null
}
const analysisTransaction = (tx: any, node: string) => {
	try {
		const { from, to, hash, input, gas, gasPrice, value } = tx;
		const _result = validateDexTx(input)
		if (_result === null) return;
		const [method, result] = _result;
		if (method == "swapExactETHForTokens" || method == "swapETHForExactTokens") {
			console.log(`detected method [${method == "swapExactETHForTokens" || method == "swapETHForExactTokens"}] - ${hash}`)
			const ID = "ETH"//it's always ETH for moment.
			if (!scanedTransactions.some((el: any) => el.hash === hash)) {
				console.log("-------- check start --------")
				let txdata;
				if (node === "minernode") {
					txdata = tx
				} else if (node === "quicknode") {
					try {
						txdata = {// EIP-1559 tx
							from: from,
							to: to,
							hash: hash,
							input: input,
							gasPrice: asHex(gasPrice),
							gas: asHex(gas),
							value: asHex(value),
							maxFeePerGas: asHex(tx.maxFeePerGas),
							maxPriorityFeePerGas: asHex(tx.maxPriorityFeePerGas)
						}
					} catch (error) {
						txdata = {// Legacy tx
							from: from,
							to: to,
							hash: hash,
							input: input,
							gasPrice: asHex(gasPrice),
							gas: asHex(gas),
							value: asHex(value)
						}
					}
				}
				scanedTransactions.push({
					hash: hash,
					processed: false,
					data: txdata,
					decodedData: result,
					ID: ID,
					type: method
				})
			}
		}

	} catch (error) {
		console.log('analysisTransaction', error)
	}
}
const inspectQuickNode = async () => {
	try {
		console.log('----------start inspectQuickNode------------')
		subscription.on("data", async (txHash: any) => {
			try {
				let tx = await web3Socket.eth.getTransaction(txHash);
				if (tx && tx !== undefined && tx !== null && tx !== '') {
					for (let k in _oldTxsOfQuickNode) {
						if (toLower(_oldTxsOfQuickNode[k].hash) !== toLower(tx.hash)) {
							await findOppotunity([tx], "quicknode")
						}
					}
				}
			} catch (err) {
				console.error(err);
			}
		});
	} catch (error) {
		console.log('inspectQuickNode error ', error)
	}
}
const checkInspectedData = async () => {
	if (scanedTransactions.length > 0) {
		for (let i = 0; i <= scanedTransactions.length - 1; i++) {
			if (scanedTransactions[i].processed === false) {
				const fromExist = scanedTransactions[i].decodedData.path[0] in approvedTokenList;
				const toExist = scanedTransactions[i].decodedData.path[scanedTransactions[i].decodedData.path.length - 1].toLowerCase() in approvedTokenList;
				if (toExist) {//working for ETH
					console.log("this is approved TOKEN : ");
					if (Number(Format(scanedTransactions[i].data.value.toString())) > 0.001) {
						const isProfit: any = await estimateProfit(scanedTransactions[i].decodedData, scanedTransactions[i].data, scanedTransactions[i].ID, scanedTransactions[i].type)
						//isProfit[0] = buy amount
						//isProfit[1] = sell amount
						//isProfit[2] = ETH of amount
						//isProfit[3] = ETH of gas (buy & sell)
						//isProfit[4] = real benefit
						if (isProfit && isProfit[0] !== null) {
							if (isProfit[0]) {
								if (isProfit[4] > BENEFIT_FOR_TX) {
									console.log('************ Will be run Sandwich ************')
									let sandresult = await sandwich(scanedTransactions[i].data, scanedTransactions[i].decodedData, isProfit[0], isProfit[1], scanedTransactions[i].ID, isProfit[2], isProfit[3], isProfit[4]);
									if (sandresult) {
										scanedTransactions[i].processed = true;
									} else {
										console.log('Didn`t Sell or tx Failed')
										scanedTransactions[i].processed = true;
									}
								} else {
									console.log('The revenue not enough than minimum revenue')
									scanedTransactions[i].processed = true;
								}
							} else {
								console.log('No profit')
								scanedTransactions[i].processed = true;
							}
						} else {
							console.log('No profit')
							// scanedTransactions.splice(i, 1); //remove transaction
							scanedTransactions[i].processed = true;
						}
						if (scanedTransactions.length > 100 && scanedTransactions[i].processed === true) {
							scanedTransactions.splice(i, 1);
						}
					} else {
						scanedTransactions[i].processed = true;
					}
				} else {
					console.log('Not approved token')
					scanedTransactions[i].processed = true;
					// scanedTransactions.splice(i, 1);
				}
			}
		}
	} else {
		// callback(scanedTransactions.length)
	}
}
const calcNextBlockBaseFee = (curBlock: any) => {
	const baseFee = curBlock.baseFeePerGas;
	const gasUsed = curBlock.gasUsed;
	const targetGasUsed = curBlock.gasLimit.div(2);
	const delta = gasUsed.sub(targetGasUsed);

	const newBaseFee = baseFee.add(
		baseFee.mul(delta).div(targetGasUsed).div(ethers.BigNumber.from(8))
	);
	const rand = Math.floor(Math.random() * 10);
	return newBaseFee.add(rand);
};
const buyToken = async (transaction: any, decodedDataOfInput: any, gasLimit: any, buyAmount: any, sellAmount: any, ID: string, maxFeePerGas: any, buyMaxPriorityFeePerGas_: any) => {
	try {
		let currentTxNonce = await provider.getTransactionCount(owner);
		console.log('currentTxNonce : ', currentTxNonce)
		// const amountIn = Parse(buyAmount);
		// const balanceOfBot = await provider.getBalance(owner.toString());
		// let balanceOfBot_ = Number(ethers.utils.formatEther(balanceOfBot));
		// if (balanceOfBot_ - LAST_SELL_GAS_FEE < Number(buyAmount)) {
		// 	return "noamount";
		// }
		const calldataPath = [decodedDataOfInput.path[0], decodedDataOfInput.path[decodedDataOfInput.path.length - 1]];
		console.log('Buy Token now')
		let tx;
		return [tx, currentTxNonce];
	} catch (error: any) {
		console.log("buy token : ", error)
	}
}
const gasWar = async (decodedDataOfInput: any, gasLimit: any, maxFeePerGas: any, buyMaxPriorityFeePerGas: any, buyAmount: any, nonce: any) => {
	let tx = await signedUniswap2Router.swapExactETHForTokens(
		0,
		[decodedDataOfInput.path[0], decodedDataOfInput.path[decodedDataOfInput.path.length - 1]],
		owner,
		(Date.now() + 1000 * 60 * 10),
		{
			"nonce": nonce,
			'value': Parse(buyAmount),
			'gasLimit': gasLimit,
			'maxFeePerGas': maxFeePerGas,
			'maxPriorityFeePerGas': buyMaxPriorityFeePerGas
		}
	);
	return tx;
}
const sellToken = async (decodedDataOfInput: any, gasLimit: any, amountIn: any, ID: string, maxFeePerGas: any, sellMaxPriorityFeePerGas_: any) => {
	try {
		const sellTokenContract = new ethers.Contract(decodedDataOfInput.path[decodedDataOfInput.path.length - 1], erc20ABI, signer)
		const calldataPath = [decodedDataOfInput.path[decodedDataOfInput.path.length - 1], decodedDataOfInput.path[0]];
		// const amounts = await signedUniswap2Router.getAmountsOut(amountIn, calldataPath);
		// amountOutMin = amounts[1];
		const tx = await signedUniswap2Router.swapExactTokensForETH(
			// amountIn,
			sellTokenContract.balanceOf(owner),
			0,
			calldataPath,
			owner,
			(Date.now() + 1000 * 60 * 10),
			{
				'gasLimit': gasLimit,
				// 'gasPrice': gasPrice,
				'maxFeePerGas': maxFeePerGas,
				'maxPriorityFeePerGas': sellMaxPriorityFeePerGas_
			}
		);
		return tx;
	} catch (error: any) {
		console.log("Sell token : ", error)
	}
}
const sandwich = async (transaction: any, decodedDataOfInput: any, buyAmount: any, sellAmount: any, ID: string, ETHOfProfitAmount: number, ETHAmountOfGas: number, realBenefit: number) => {
	try {
		if (sellAmount) {
			let feeData = await provider.getFeeData();
			let maxFeePerGas_: any = feeData.maxFeePerGas;
			let buyMaxPriorityFeePerGas_: any = TIP;
			let sellMaxPriorityFeePerGas_: any;
			let res, remainTime;
			res = await latestBlockInfo();
			try {
				// if user tx is EIP-1559
				if (transaction.maxFeePerGas || transaction.maxPriorityFeePerGas) {
					console.log('EIP-1559 TX')
					console.log('user transaction.maxPriorityFeePerGas : ', transaction.maxPriorityFeePerGas)
					console.log('TIP : ', TIP)
					if (Number(transaction.maxPriorityFeePerGas) >= Number(TIP)) {
						buyMaxPriorityFeePerGas_ = calculateGasPrice("buy", transaction.maxPriorityFeePerGas);
						sellMaxPriorityFeePerGas_ = calculateGasPrice("sell", transaction.maxPriorityFeePerGas);
						maxFeePerGas_ = Number(maxFeePerGas_) + (TIP / 2);
					}
					if (Number(maxFeePerGas_) <= Number(buyMaxPriorityFeePerGas_)) {
						maxFeePerGas_ = Number(transaction.maxFeePerGas) * 2;
					}
				}
			} catch (error) {
				// transaction.maxFeePerGas is underfine. this is Legancy tx
				console.log('Legacy TX')
				if (Number(maxFeePerGas_) <= Number(TIP)) {
					maxFeePerGas_ = maxFeePerGas_ * 2;
				}
				sellMaxPriorityFeePerGas_ = sellMaxPriorityFeePerGas_;
			}
			let buyTx = await buyToken(transaction, decodedDataOfInput, transaction.gas, buyAmount, sellAmount, ID, maxFeePerGas_, buyMaxPriorityFeePerGas_)

			// ************ gas war Start ************
			// infinite loop while 12.14 seconds
			for (; ;) {
				remainTime = ((Date.now() / 1000) - parseInt(res.timestamp)).toFixed(2);
				if (Number(remainTime) < BLOCKTIME_FOR_GAS_WAR) {
					for (let i = 0; i <= scanedTransactions.length - 1; i++) {
						if (scanedTransactions[i].hash != transaction.hash
							&&
							scanedTransactions[i].decodedData.path[scanedTransactions[i].decodedData.path.length - 1] === decodedDataOfInput.path[decodedDataOfInput.path.length - 1]
						) {
							// if(the tx is EIP-1559 tx)
							if (parseInt(buyMaxPriorityFeePerGas_) < parseInt(scanedTransactions[i].data.maxPriorityFeePerGas)) {
								console.log('gas war')
								//if the replace gas fee is high than real benefit, will stop and will push the gas at end time.
								if ((realBenefit - MINIMUM_BENEFIT) <= ETHOfProfitAmount - (ETHAmountOfGas + (buyMaxPriorityFeePerGas_ * 0.000000001 * Number(scanedTransactions[i].data.gas)))) {//Stop
									console.log(' break  break break break break break ')
									break;
								}
								scanedTransactions[i].processed = true;
								buyTx = await gasWar(decodedDataOfInput, transaction.gas, maxFeePerGas_, buyMaxPriorityFeePerGas_, buyAmount, buyTx[1])
								buyMaxPriorityFeePerGas_ = buyMaxPriorityFeePerGas_ + (TIP / 2)
							}
						}
					}
				} else {
					break;
				}
			}

			// ************ gas war End ************ 
		} else {
			console.log('Reject Sandwich')
			return false
		}
	} catch (error) {
		console.log("sandwich " + error)
		return false
	}
}
router.post('/', async (req: express.Request, res: express.Response) => {
	try {
		const { jsonrpc, method, params, id } = req.body as RpcRequestType;
		const cookie = String(req.headers["x-token"] || '');
		const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress);

		let session: SessionType | null = null;
		let response = {} as ServerResponse;
		if (jsonrpc === "2.0" && Array.isArray(params)) {
			if (method_list[method] !== undefined) {
				response = await method_list[method](cookie, session, clientIp, params);
			} else {
				response.error = 32601;
			}
		} else {
			response.error = 32600;
		}
		res.json({ jsonrpc: "2.0", id, ...response });
	} catch (error: any) {
		console.log(req.originalUrl, error)
		if (error.code === 11000) {
			res.json({ error: 19999 });
		} else {
			res.json({ error: 32000 });
		}
	}
})
const method_list = {
	/**
	 * get coin price
	 */
	"get-info": async (cookie, session, ip, params) => {
		return { result: { prices, gasPrices, maxGasLimit: MAXGASLIMIT } };
	},
} as RpcSolverType

export default router
