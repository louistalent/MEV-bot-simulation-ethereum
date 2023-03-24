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

const web3 = new Web3(new Web3.providers.WebsocketProvider(url, options));
export const subscription = web3.eth.subscribe("pendingTransactions", (err: any, res: any) => {
    if (err) console.error(err);
});
export const getPendingTransactionOfQuick = async () => {
    try {
        let res = await rpc(url_https, { "jsonrpc": "2.0", "method": "txpool_content", "params": [], "id": 1 });
        return res;
    } catch (err) {
        console.log(err.message, err.stack)
    }
}


