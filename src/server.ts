// Project version 1: MEV bot by sandwitch logic
// by: me
// Technical Stack
// TypeScript Version: 4.3.4

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
process.env.NODE_NO_WARNINGS = "1";

import express from 'express';

import cors from 'cors'
import ApiV1, { initApp } from './api-v1'
import setlog from './setlog';
// import Model from './Model'
import { PORT } from './constants';

process.on("uncaughtException", (err: Error) => console.log('exception', err));
process.on("unhandledRejection", (err: Error) => console.log('rejection', err));

export default async () => {
	try {
		console.log("ksdjfksdjfk")
		await initApp();
		/* await Redis.connect(); */
		const app = express()
		// const httpServer  = http.createServer(app)
		// initSocket(httpServer )
		app.use(cors({
			origin: function (origin, callback) {
				return callback(null, true)
			}
		}))
		app.use(express.json())
		app.use(ApiV1);
		let time = +new Date()
		await new Promise(resolve => app.listen({ port: PORT, host: '0.0.0.0' }, () => resolve(true)))
		console.log(`Started HTTP service on port ${PORT}. ${+new Date() - time}ms`)
		return app
	} catch (error) {
		console.log("init", error)
		process.exit(1)
	}
}