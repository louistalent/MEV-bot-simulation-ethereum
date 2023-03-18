import rpc from "./blockchain";

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