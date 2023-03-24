import { RPC_URL2 } from "../constants";
import axios from "axios";

export const rpc = async (rpc_url: string, json: any) => {
    const res = await axios.post(`${rpc_url}`, json)
    return res.data.result;
}

export const latestBlockInfo = async () => {
    try {
        let res = await rpc(RPC_URL2, { "jsonrpc": "2.0", "method": "eth_getBlockByNumber", "params": ["latest", false], "id": "0" });
        return res;
    } catch (err) {
        console.log(err.message, err.stack)
    }
}


export default rpc