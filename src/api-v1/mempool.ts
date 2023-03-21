import { UNISWAP2_ROUTER_ADDRESS } from "../constants";
import Web3 from "web3";
import rpc from "./blockchain";
var web3 = new Web3('wss://mainnet.infura.io/ws/v3/feb74e7522fc4b86ac7eb4fb2102a855');
let _oldTxs = {} as { [txId: string]: any }

const getPendingTransaction = async () => {
    try {
        let res = await rpc({ "jsonrpc": "2.0", "method": "txpool_content", "params": [], "id": 1 });
        return res;
    } catch (err) {
        console.log(err.message, err.stack)
    }
}

export const getNewTxsFromMempool = async (): Promise<{ [txId: string]: any }> => {
    try {
        const __pool = {} as { [key: string]: any }
        const __new = {} as { [key: string]: any }
        const pendingTxs = await getPendingTransaction();
        if (pendingTxs) {
            for (let addr in pendingTxs.pending) {
                for (let k in pendingTxs.pending[addr]) {
                    const v = pendingTxs.pending[addr][k];
                    __pool[k] = v;
                    if (_oldTxs[k] === undefined) __new[k] = v;
                }
            }
            _oldTxs = __pool;
            return Object.keys(__new).length === 0 ? null : __new;
        }
    } catch (error) {
        console.log('getNewTxs', error)
    }
    return null
}
export const getPendingTransaction_ = async () => {
    try {
        let i = 0;
        let subscription = web3.eth.subscribe('pendingTransactions', function (error, result) { })
            .on("data", function (transactionHash) {
                web3.eth.getTransaction(transactionHash)
                    .then(function (transaction) {
                        if (transaction !== null)
                            if (transaction.to.toLowerCase() == UNISWAP2_ROUTER_ADDRESS.toLowerCase()) {
                                console.log('transaction :', transaction.hash);
                                i++
                                console.log("Number: ", i)
                            }
                        // createNode(transaction.from, transaction.to);
                    });
            })
    } catch (err) {
        console.log(err.message, err.stack)
    }
}

export const getNewTxsFromMempool_ = async (): Promise<{ [txId: string]: any }> => {
    try {
        // getPendingTransaction_()
    } catch (error) {
        console.log('getNewTxs', error)
    }
    return null
}