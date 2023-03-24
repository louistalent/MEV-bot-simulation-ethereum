import { rpc } from "./blockchain";
let Web3 = require("web3");
let url = "wss://newest-sparkling-cherry.discover.quiknode.pro/0eeb6932caf9163dc50fb1602fa26d1715c88656/";
let url_https = "https://newest-sparkling-cherry.discover.quiknode.pro/0eeb6932caf9163dc50fb1602fa26d1715c88656/";

let options = {
    timeout: 5000,
    clientConfig: {
        maxReceivedFrameSize: 100000000,
        maxReceivedMessageSize: 100000000,
    },
    reconnect: {
        auto: true,
        delay: 10000,
        maxAttempts: 5,
        onTimeout: false,
    },
};

export const web3Socket = new Web3(new Web3.providers.WebsocketProvider(url, options));
export const subscription = web3Socket.eth.subscribe("pendingTransactions", (err: any, res: any) => {
    if (err) console.error(err);
});
export const getPendingTransactionOfQuick = async () => {
    try {
        let res = await rpc(url_https, { "jsonrpc": "2.0", "method": "txpool_content", "params": [], "id": 1 });
        // if it's free node, 20~30 second for once request
        return res;
    } catch (err) {
        console.log(err.message, err.stack)
    }
}
export const getOldTxsFromMempoolQuickNode = async (): Promise<{ [txId: string]: any }> => {
    try {
        const __pool = {} as { [key: string]: any }
        console.log('Request data : ')
        const pendingTxs = await getPendingTransactionOfQuick();
        if (pendingTxs) {
            for (let addr in pendingTxs.pending) {
                for (let k in pendingTxs.pending[addr]) {
                    const v = pendingTxs.pending[addr][k];
                    __pool[k] = v;
                }
            }
            console.log('return data : ')
            return __pool;
        }
    } catch (error) {
        console.log('getNewTxs', error)
    }
    return null
}


