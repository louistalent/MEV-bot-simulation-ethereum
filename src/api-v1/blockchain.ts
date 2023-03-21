import { RPC_URL2 } from "../constants";
import axios from "axios";

const rpc = async (json: any) => {
    const res = await axios.post(`${RPC_URL2}`, json)
    return res.data.result;
}

export const latestBlockInfo = async () => {
    try {
        let res = await rpc({ "jsonrpc": "2.0", "method": "eth_getBlockByNumber", "params": ["latest", false], "id": "0" });
        return res;
    } catch (err) {
        console.log(err.message, err.stack)
    }
}


export default rpc