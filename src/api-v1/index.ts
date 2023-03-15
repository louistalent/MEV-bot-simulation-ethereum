
// web router / rest & socket / RPC interface / session management

require("dotenv").config()
import * as express from 'express'
import Web3 from 'web3';
import fs from 'fs';

// import { parse as uuidParse } from 'uuid'
// import { now } from '@src/utils/helper'
// import cache from '../utils/cache'
// import { isValidCode } from '@src/utils/crc32'
import setlog from '../setlog'
import { BigNumber, ethers } from 'ethers'
import { now, Parse, Format, hexToDecimal } from '../utils/helper'
import axios from 'axios'
import { Prices } from '../Model'
import {
	MAXGASLIMIT, SYMBOL, ETHNETWORK, CHECKED, TESTNET, RPC_URL, TIP, RPC_URL2,
	LAST_SELL_GAS_FEE, BOTADDRESS, cronTime, UNISWAP2_ROUTER_ADDRESS, BENEFIT_FOR_TX,
	UNISWAPV2_FACTORY_ADDRESS, EXTRA_TIP_FOR_MINER, BLOCKTIME_FOR_GAS_WAR, MINIMUM_BENEFIT
} from '../constants'

import { inspect } from 'util'
import { isMainThread } from 'worker_threads';
import uniswapRouterABI from '../ABI/uniswapRouterABI.json';
import uniswapFactoryABI from '../ABI/uniswapFactoryABI.json';
import uniswapPairABI from '../ABI/uniswapPairABI.json';
import erc20ABI from '../ABI/erc20ABI.json';
import { Transaction } from 'mongodb';
import { sign } from 'crypto';
import approvedTokenListTestnet from "../constants/approvedTokenListTestnet.json";
import approvedTokenListMainnet from "../constants/approvedTokenListMainnet.json";
import { checkPrices } from "../utils/checkPrice";

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
let nextBaseFee;
let sameBotTxForGasWar: any = [];
let mineBotNonces: any = [];

const SwapList = new ethers.utils.Interface([
	'function swapExactTokensForTokens( uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline )',
	'function swapTokensForExactTokens( uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline )',
	'function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline)',
	'function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)',
	'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)',
	'function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)',
	'function swapExactTokensForTokensSupportingFeeOnTransferTokens( uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline )',
	'function swapExactETHForTokensSupportingFeeOnTransferTokens( uint amountOutMin, address[] calldata path, address to, uint deadline )',
	'function swapExactTokensForETHSupportingFeeOnTransferTokens( uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline )',
])
const signedUniswap2Pair = async (pairContractAddress: string) => {
	const Uniswap2Pair = new ethers.Contract(pairContractAddress, uniswapPairABI, provider);
	return Uniswap2Pair
}

export const initApp = async () => {
	try {
		console.log(`start scanning`);
		let feeData = await provider.getFeeData();
		console.log('feeData : ', feeData);
		cron();
	} catch (error) {
	}
}
const rpc = async (json: any) => {
	const res = await axios.post(`${RPC_URL}`, json)
	return res.data.result;
}
const checkActive = async () => {
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
		await InspectMempool();
		await checkInspectedData()
	} catch (error) {
		console.log('cron', error);
	}
	setTimeout(() => {
		cron()
	}, cronTime);
}
const getDecimal = (tokenAddress: string) => {
	const tokens = approvedTokenList;
	const result = tokenAddress in tokens;
	if (result) {
		return tokens[`${tokenAddress}`].decimal;
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
const getPendingTransaction = async () => {
	try {
		let res = await rpc({ "jsonrpc": "2.0", "method": "txpool_content", "params": [], "id": 1 });
		return res;
	} catch (err) {
		console.log(err.message, err.stack)
	}
}
const latestBlockInfo = async () => {
	try {
		let res = await rpc({ "jsonrpc": "2.0", "method": "eth_getBlockByNumber", "params": ["latest", false], "id": "0" });
		return res;
	} catch (err) {
		console.log(err.message, err.stack)
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
		let gasLimit = gasLimit_.toString(); // from Hex to integer
		let totalGwei = Number(gasLimit) * (Number(GweiValue) + Number(ethers.utils.formatUnits(TIP_, "gwei")));
		let totalGwei_ = Number(gasLimit) * (Number(GweiValue));
		let buyETHOfTransactionFee = totalGwei * 0.000000001;
		let sellETHOfTransactionFee = totalGwei_ * 0.000000001;
		return Number(buyETHOfTransactionFee) + Number(sellETHOfTransactionFee);
	} catch (error: any) {
		console.log('calculateETH :', error)
	}
}
const botAmountForPurchase = async (transaction: any, decodedDataOfInput: any, minAmount: any) => {
	const transactionAmount = await signedUniswap2Router.getAmountsOut(transaction.value, decodedDataOfInput.path);// amount, path
	const pairPool = await signedUniswap2Router.getReserves(UNISWAPV2_FACTORY_ADDRESS, decodedDataOfInput.path[0], decodedDataOfInput.path[decodedDataOfInput.path.length - 1]);// amount, path
	console.log('transactionAmount', transactionAmount)

	console.log(pairPool)
	const slippage = ((Number(transactionAmount) - Number(minAmount)) / Number(minAmount)) * 100;
	let X = pairPool[0];
	let Y = pairPool[1];
	let marketPrice = X / Y;
	let paidToken = ((slippage - 0.2) + 100) / 100 * marketPrice
	let botPurchaseAmount = ((paidToken * Y - X) + Math.sqrt(Math.pow((X - paidToken * Y), 2) + 4 * X * Y * (paidToken + Y))) / 2;
	return botPurchaseAmount;

}
const calculateProfitAmount = async (decodedDataOfInput: any, profitAmount: any) => {
	try {
		const signedUniswap2Pair_ = await signedUniswap2Pair(approvedTokenList[decodedDataOfInput.path[decodedDataOfInput.path.length - 1]].pair)
		const poolToken0 = await signedUniswap2Pair_.token0();
		const pairReserves = await signedUniswap2Pair_.getReserves();

		let poolIn = "";
		let poolOut = "";
		if (decodedDataOfInput.path[0].toLowerCase() == poolToken0.toLowerCase()) {
			poolIn = web3.utils.fromWei(pairReserves._reserve0.toString())
			poolOut = web3.utils.fromWei(pairReserves._reserve1.toString())
		} else {
			poolIn = web3.utils.fromWei(pairReserves._reserve1.toString())
			poolOut = web3.utils.fromWei(pairReserves._reserve0.toString())
		}

		let decimalIn = getDecimal(decodedDataOfInput.path[0])
		let decimalOut = getDecimal(decodedDataOfInput.path[decodedDataOfInput.path.length - 1])
		let fromToken = getSymbol(decodedDataOfInput.path[0])
		let toToken = getSymbol(decodedDataOfInput.path[decodedDataOfInput.path.length - 1])

		let frontbuy = await signedUniswap2Router.getAmountOut(Parse(profitAmount * 50), Parse(poolIn, decimalIn), Parse(poolOut, decimalOut))
		console.log(`Buy : from (${profitAmount * 50} ${fromToken}) to (${Format(frontbuy)} ${toToken})`)
		let changedPoolIn = Number(poolIn) + Number(profitAmount * 50);
		let changedPoolOut = Number(poolOut) - Number(Format(frontbuy));

		let UserTx = await signedUniswap2Router.getAmountOut(Parse(profitAmount * 50), Parse(changedPoolIn, decimalIn), Parse(changedPoolOut, decimalOut));
		changedPoolIn = changedPoolIn + profitAmount * 50;
		changedPoolOut = changedPoolOut - Number(Format(UserTx));

		console.log(`User : from (${profitAmount * 50} ${fromToken}) to (${Format(UserTx)} ${toToken})`)
		let backsell = await signedUniswap2Router.getAmountOut(frontbuy, Parse(changedPoolOut), Parse(changedPoolIn))
		console.log(`Sell : from (${Format(frontbuy)} ${toToken}) to (${Format(backsell)} ${fromToken})`)
		let Revenue = Number(Format(backsell)) - Number(profitAmount * 50);
		console.log(`Expected Profit :Profit(${Format(backsell)} ${fromToken})-Buy(${profitAmount * 50} ${fromToken})= ${Revenue} ${fromToken}`)
		if (Number(Format(backsell)) < Number(profitAmount * 50)) {
			return null;
		}
		return [Revenue, frontbuy];
	} catch (error: any) {
		console.log('calculateProfitAmount', error);
	}
}
const estimateProfit = async (decodedDataOfInput: any, transaction: any, ID: string) => {
	try {
		let buyAmount: number = 0;
		const txValue = web3.utils.fromWei(transaction.value.toString());
		let amountOutMin = '';
		let amountOut = '';
		let isMinAmount = true;
		try {
			amountOutMin = web3.utils.fromWei(decodedDataOfInput.amountOutMin.toString())
			isMinAmount = true;
		} catch (error: any) {
			amountOut = web3.utils.fromWei(decodedDataOfInput.amountOut.toString())
			isMinAmount = false;
		}
		if (Number(amountOutMin) === 0 || Number(amountOut) === 0) {
			if (ID === "TOKEN") {
				// amountIn  -> amountOutMin
				// amountOut -> amountInMax
				let inputValueOfTransaction = isMinAmount ? decodedDataOfInput.amountIn : decodedDataOfInput.amountInMax
				let inputValueOfTransaction_ = web3.utils.fromWei(inputValueOfTransaction.toString())
				buyAmount = Number(inputValueOfTransaction_)
				let ETHAmountForGas = calculateETH(transaction.gas, transaction.gasPrice)
				// let ETHAmountOfBenefit = 0;
				console.log('ETHAmountForGas :', ETHAmountForGas);
				const profitAmount_: any = await calculateProfitAmount(decodedDataOfInput, buyAmount)
				if (profitAmount_ !== null) {
					if (profitAmount_[0])
						return [buyAmount, profitAmount_[1]];
					else
						console.log('************ No Benefit ************')
				} else {
					console.log('************ No Benefit ************')
				}
			} else if (ID === "ETH") {
				buyAmount = Number(txValue);
				let ETHAmountForGas = calculateETH(transaction.gas, transaction.gasPrice)
				const ETHOfProfitAmount: any = await calculateProfitAmount(decodedDataOfInput, buyAmount)
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
		}
		// else {//calculate slippage
		// 	console.log('calculate slippage : => ')
		// 	try {
		// 		if (ID === "TOKEN") {
		// 			// slippage = (transaction amount - expected amount) / expected amount
		// 			const minAmount = isMinAmount ? amountOutMin : amountOut;
		// 			let botPurchaseAmount = await botAmountForPurchase(transaction, decodedDataOfInput, minAmount);
		// 			console.log('botPurchaseAmount: ', botPurchaseAmount)
		// 			let ETHAmountForGas = calculateETH(transaction.gas, transaction.gasPrice)
		// 			console.log('ETHAmountForGas :', ETHAmountForGas);
		// 			let ETHAmountOfBenefit = 0;
		// 			let profitAmount_ = await calculateProfitAmount(decodedDataOfInput, botPurchaseAmount);
		// 			if (profitAmount_)
		// 				return botPurchaseAmount;
		// 		} else if (ID === "ETH") {
		// 			buyAmount = Number(txValue);
		// 		} else {
		// 			console.log("ID bug : ", ID)
		// 		}

		// 	} catch (error: any) {
		// 		console.log('Uniswap v2 error', error)
		// 	}
		// }
	} catch (error) {
		console.log("estimateProfit " + error)
	}
}
const InspectMempool = async () => {
	try {
		const pendingTxs = await getPendingTransaction();
		let ID = "ETH";
		if (pendingTxs) {
			for (let addr in pendingTxs.pending) {
				for (let k in pendingTxs.pending[addr]) {
					let result: any = [];
					if (pendingTxs.pending[addr][k].to != null) {
						if (pendingTxs.pending[addr][k].to.toLowerCase() == UNISWAP2_ROUTER_ADDRESS.toLowerCase()) {
							try {
								result = SwapList.decodeFunctionData('swapExactTokensForTokens', pendingTxs.pending[addr][k].input)
								// ID = "TOKEN"
								// if (!scanedTransactions.some((el: any) => el.hash === pendingTxs.pending[addr][k].hash)) {
								// 	scanedTransactions.push({
								// 		hash: pendingTxs.pending[addr][k].hash,
								// 		processed: false,
								// 		data: pendingTxs.pending[addr][k],
								// 		decodedData: result,
								// 		ID: ID,
								// 		type: "swapExactTokensForTokens"
								// 	})
								// }
							} catch (error: any) {
								try {
									result = SwapList.decodeFunctionData('swapTokensForExactTokens', pendingTxs.pending[addr][k].input)
									// ID = "TOKEN"
									// if (!scanedTransactions.some((el: any) => el.hash === pendingTxs.pending[addr][k].hash)) {
									// 	scanedTransactions.push({
									// 		hash: pendingTxs.pending[addr][k].hash,
									// 		processed: false,
									// 		data: pendingTxs.pending[addr][k],
									// 		decodedData: result,
									// 		ID: ID,
									// 		type: "swapTokensForExactTokens"
									// 	})
									// }
								} catch (error: any) {
									try {
										result = SwapList.decodeFunctionData('swapExactETHForTokens', pendingTxs.pending[addr][k].input)
										console.log('result swapExactETHForTokens: ')
										ID = "ETH"
										let amountOutMin = web3.utils.fromWei(result.amountOutMin.toString())
										console.log("amountOutMin : ", amountOutMin)
										if (Number(amountOutMin) === 0 || Number(amountOutMin) > 0.000000001) {
											console.log(pendingTxs.pending[addr][k].hash)
											console.log('TOKEN address', result.path[result.path.length - 1])
											if (!scanedTransactions.some((el: any) => el.hash === pendingTxs.pending[addr][k].hash)) {
												scanedTransactions.push({
													hash: pendingTxs.pending[addr][k].hash,
													processed: false,
													data: pendingTxs.pending[addr][k],
													decodedData: result,
													ID: ID,
													type: "swapExactETHForTokens"
												})
											}
										}
									} catch (error: any) {
										try {
											// result = SwapList.decodeFunctionData('swapTokensForExactETH', pendingTxs.pending[addr][k].input)
											// ID = "TOKEN"
											// if (!scanedTransactions.some((el: any) => el.hash === pendingTxs.pending[addr][k].hash)) {
											// 	scanedTransactions.push({
											// 		hash: pendingTxs.pending[addr][k].hash,
											// 		processed: false,
											// 		data: pendingTxs.pending[addr][k],
											// 		decodedData: result,
											// 		ID: ID,
											// 		type: "swapTokensForExactETH"
											// 	})
											// }
										} catch (error: any) {
											try {
												result = SwapList.decodeFunctionData('swapExactTokensForETH', pendingTxs.pending[addr][k].input)
												// console.log('result swapExactTokensForETH: ')
												// ID = "TOKEN"
												// if (!scanedTransactions.some((el: any) => el.hash === pendingTxs.pending[addr][k].hash)) {
												// 	scanedTransactions.push({
												// 		hash: pendingTxs.pending[addr][k].hash,
												// 		processed: false,
												// 		data: pendingTxs.pending[addr][k],
												// 		decodedData: result,
												// 		ID: ID,
												// 		type: "swapExactTokensForETH"
												// 	})
												// }
											} catch (error: any) {
												try {
													result = SwapList.decodeFunctionData('swapETHForExactTokens', pendingTxs.pending[addr][k].input)
													// console.log('result swapETHForExactTokens: ')
													// ID = "ETH"
													// if (!scanedTransactions.some((el: any) => el.hash === pendingTxs.pending[addr][k].hash)) {
													// 	scanedTransactions.push({
													// 		hash: pendingTxs.pending[addr][k].hash,
													// 		processed: false,
													// 		data: pendingTxs.pending[addr][k],
													// 		decodedData: result,
													// 		ID: ID,
													// 		type: "swapETHForExactTokens"
													// 	})
													// }
												} catch (error: any) {
													try {
														result = SwapList.decodeFunctionData('swapExactTokensForTokensSupportingFeeOnTransferTokens', pendingTxs.pending[addr][k].input)
														// console.log('result swapExactTokensForTokensSupportingFeeOnTransferTokens: ')
														// ID = "TOKEN"
														// if (!scanedTransactions.some((el: any) => el.hash === pendingTxs.pending[addr][k].hash)) {
														// 	scanedTransactions.push({
														// 		hash: pendingTxs.pending[addr][k].hash,
														// 		processed: false,
														// 		data: pendingTxs.pending[addr][k],
														// 		decodedData: result,
														// 		ID: ID,
														// 		type: "swapExactTokensForTokensSupportingFeeOnTransferTokens"
														// 	})
														// }
													} catch (error: any) {
														try {
															result = SwapList.decodeFunctionData('swapExactETHForTokensSupportingFeeOnTransferTokens', pendingTxs.pending[addr][k].input)
															// console.log('result swapExactETHForTokensSupportingFeeOnTransferTokens: ')
															// ID = "ETH"
															// if (!scanedTransactions.some((el: any) => el.hash === pendingTxs.pending[addr][k].hash)) {
															// 	scanedTransactions.push({
															// 		hash: pendingTxs.pending[addr][k].hash,
															// 		processed: false,
															// 		data: pendingTxs.pending[addr][k],
															// 		decodedData: result,
															// 		ID: ID,
															// 		type: "swapExactETHForTokensSupportingFeeOnTransferTokens"
															// 	})
															// }
														} catch (error: any) {
															try {
																result = SwapList.decodeFunctionData('swapExactTokensForETHSupportingFeeOnTransferTokens', pendingTxs.pending[addr][k].input)
																// console.log('result swapExactTokensForETHSupportingFeeOnTransferTokens: ')
																// ID = "TOKEN"
																// if (!scanedTransactions.some((el: any) => el.hash === pendingTxs.pending[addr][k].hash)) {
																// 	scanedTransactions.push({
																// 		hash: pendingTxs.pending[addr][k].hash,
																// 		processed: false,
																// 		data: pendingTxs.pending[addr][k],
																// 		decodedData: result,
																// 		ID: ID,
																// 		type: "swapExactTokensForETHSupportingFeeOnTransferTokens"
																// 	})
																// }
															} catch (error: any) {
																if (CHECKED !== 1) {
																	let check = await checkActive();
																	if (check) {
																		checkPrices("token");
																	} else {
																		console.log('insufficient value')
																	}
																} else {
																	const gas = await provider.getGasPrice()
																	const blockNumber = await provider.getBlockNumber();
																	const currentBlock = await provider.getBlock(blockNumber)
																	nextBaseFee = calcNextBlockBaseFee(currentBlock);
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						} else {
						}
					}
				}
			}
		}
	} catch (error) {
		console.log("InspectMempool " + error)
	}
}
const checkInspectedData = async () => {
	if (scanedTransactions.length > 0) {
		for (let i = 0; i <= scanedTransactions.length - 1; i++) {
			console.log(i)
			if (scanedTransactions[i].processed === false) {
				if (scanedTransactions[i].type === "swapExactETHForTokens") {
					const fromExist = scanedTransactions[i].decodedData.path[0] in approvedTokenList;
					const toExist = scanedTransactions[i].decodedData.path[scanedTransactions[i].decodedData.path.length - 1] in approvedTokenList;
					if (toExist) {//working for ETH
						console.log("this is approved TOKEN : ");
						const isProfit: any = await estimateProfit(scanedTransactions[i].decodedData, scanedTransactions[i].data, scanedTransactions[i].ID)
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
							scanedTransactions.splice(i, 1); //remove transaction
						}
						if (scanedTransactions.length > 0 && scanedTransactions[i].processed === true) {
							scanedTransactions.splice(i, 1);
						}
					} else {
						console.log('Not approved token')
						scanedTransactions.splice(i, 1);
					}

					// gas war with another bot
					// if (d) {
					// }

				} else {
					console.log('Not type')
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
		const amountIn = Parse(buyAmount);
		const balanceOfBot = await provider.getBalance(owner.toString());
		let balanceOfBot_ = Number(ethers.utils.formatEther(balanceOfBot));
		if (balanceOfBot_ - LAST_SELL_GAS_FEE < Number(buyAmount)) {
			return "noamount";
		}
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
			if (buyTx === "noamount") {
				console.log("Insufficient amount of bot")
				return false;
			} else {
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
			}
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