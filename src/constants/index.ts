require("dotenv").config()
const isDev = process.env.NODE_ENV === 'development';

import * as LangEnUS from '../locales/en-US.json'
import * as LangZhCN from '../locales/zh-CN.json'
import axios from 'axios';
import { ethers } from 'ethers';
/**
 * multilingual 
 * @type key:value pair hashmap
 */
export const locales = {
    "en-US": LangEnUS,
    // "zh-CN": LangZhCN,
} as { [lang: string]: { [key: string]: string } }
// //////////////////////////////
// const res = await axios.post(`${RPC_URL}`, json)
// const gasStationResponse = await fetch('https://gasstation-mumbai.matic.today/v2')
// const gasStationObj = JSON.parse(await gasStationResponse.text())
// let max_priority_fee = gasStationObj.standard.maxPriorityFee + EXTRA_TIP_FOR_MINER
// //////////////////////////////

// //////////////////////////////
// web3.eth.getMaxPriorityFeePerGas().then((f) => console.log("Geth estimate:  ", Number(f)));
// Geth estimate: 2375124957
// //////////////////////////////

/**
 * default locale
 * @type string
*/
export const DefaultLocale = "en-US"

/**
 * http port
 * @type number
 */
export const PORT = Number(process.env.HTTP_PORT || 80);
export const REDIS_URL = process.env.REDIS_URL || '';
export const MONGO_URL = process.env.MONGO_URL || '';
export const TESTNET = process.env.TESTNET === '1';
export const SYMBOL = process.env.SYMBOL || '';
export const ZEROADDRESS = '0x0000000000000000000000000000000000000000';
export const MAXGASLIMIT = 1e5;
export const TIP = Number(process.env.TIP);
export const EXTRA_TIP_FOR_MINER = Number(process.env.EXTRA_TIP_FOR_MINER)//  gwei 

// https://rpc.ankr.com/eth_goerli	
export const RPC_URL = process.env.NODE_RPC2;
export const RPC_URL2 = process.env.NODE_RPC3;
export const ChainID = Number(process.env.CHAINID);
export const cronTime = Number(process.env.CRON_SET_TIME_OUT);
export const PRIVKEY = process.env.ADMIN_PRIVKEY || '';
export const BOTADDRESS = process.env.BOTADDRESS;
export const CHECKED = Number(process.env.CHECKED);
export const UNISWAP2_ROUTER_ADDRESS = process.env.UNISWAP2_ROUTER_ADDRESS;
export const UNISWAPV2_FACTORY_ADDRESS = process.env.UNISWAPV2_FACTORY_ADDRESS;
export const PAIR_ADDRESS = process.env.PAIR_ADDRESS;
export const ETHNETWORK = Number(process.env.ETHNETWORK);
export const LAST_SELL_GAS_FEE = Number(process.env.LAST_SELL_GAS_FEE);
export const BLOCKTIME_FOR_GAS_WAR = Number(process.env.BLOCKTIME_FOR_GAS_WAR);
export const BENEFIT_FOR_TX = Number(process.env.BENEFIT_FOR_TX);
export const MINIMUM_BENEFIT = Number(process.env.MINIMUM_BENEFIT);

export const whitelists = [
    UNISWAP2_ROUTER_ADDRESS.toLowerCase()
];

export const dexMethodList = [
    "swapExactTokensForTokens",
    "swapTokensForExactTokens",
    "swapExactETHForTokens",
    "swapTokensForExactETH",
    "swapExactTokensForETH",
    "swapETHForExactTokens",
    "swapExactTokensForTokensSupportingFeeOnTransferTokens",
    "swapExactETHForTokensSupportingFeeOnTransferTokens",
    "swapExactTokensForETHSupportingFeeOnTransferTokens",
]

export const ifaceList = new ethers.utils.Interface([
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

export const toLower = (s: string) => String(s).toLowerCase()







