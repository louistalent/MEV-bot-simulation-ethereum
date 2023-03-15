require('dotenv').config()
import { MongoClient } from 'mongodb'
import setlog from './setlog'
import { now } from './utils/helper'
const client = new MongoClient('mongodb://localhost:27017')
const db = client.db(process.env.DB_NAME || 'mev-bot')

// export const Requests = db.collection<SchemaRequests>('requests')
export const Prices = db.collection<SchemaTransactions>('transactions');

const open = async () => {
	try {
		await client.connect()
		console.log('connected to MongoDB')
		// Prices.createIndex({ coin: 1 }, { unique: true })
	} catch (error) {
		console.log('Connection to MongoDB failed', error)
		process.exit()
	}
}
const close = async () => {
	try {
		await client.close()
	} catch (error) {
		process.exit()
	}
}

// export const block_blockNumber = async (chain: string): Promise<number> => {
// 	const row = await Blocks.findOne({ chain })
// 	if (row === null) return 0
// 	return row.height
// }
// export const block_setBlockNumber = async (chain: string, height: number): Promise<boolean> => {
// 	const res = await Blocks.updateOne({ chain }, { $set: { height } }, { upsert: true })
// 	return res.modifiedCount + res.upsertedCount > 0
// }

// export const request_add = async (tx:string, chain:string, target:string, token:string, from:string, value:string):Promise<boolean> => {
// 	const time = now()
// 	const res = await Requests.insertOne({
// 		tx,
// 		chain,
// 		target,
// 		token,
// 		from,
// 		value,
// 		fee:'0x0',
// 		updated: time,
// 		created: time
// 	})
// 	return !!res.insertedId
// }

export default { open, close }