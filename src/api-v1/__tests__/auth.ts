import request from 'supertest'
import express from 'express'
import { Server } from 'http'

import ApiV1 from '@src/api-v1'

const APIENTRY = '/api/v1/rpc'

const app = express()
app.use(express.json())
app.use('/api/v1', ApiV1)

let server: Server
let agent: request.SuperAgentTest

beforeAll((done) => {
	server = app.listen(14000, () => {
		agent = request.agent(server) // since the application is already listening, it should use the allocated port
		done()
	})
})

afterAll((done) => {
	server.close(() => {
		done()
	})
})

interface JsonRpcTestCaseType {
	req: string[],
	res: {
		result?: any,
		error?: number
	}
}

const testcase = {
	'auth-sendEmail': {
		success: {
			req: [], 
			res: {
				result: true
			}
		}
	},
	'auth-sendSms': {
		success: {
			req: [], 
			res: {
				result: true
			}
		}
	},
	'auth-register': {
		success: {
			req: ["test@mail.com", "*********", "123456", "", "xxxxxx"], 
			res: {
				result: true
			}
		}
	},
	'auth-login': {
		success: {
			req: ["test@mail.com", "*********", "123456", "xxxxxx"], 
			res: {
				result: 32000
			}
		}
	},
	'auth-requestReset': {
		success: {
			req: ["test@mail.com", "123456", "xxxxxx"], 
			res: {
				result: 32000
			}
		}
	},
	'auth-resetPassword': {
		success: {
			req: ["test@mail.com", "123456", "xxxxxx"], 
			res: {
				result: 32000
			}
		}
	}
} as {[method:string]: {[test:string]: JsonRpcTestCaseType}}

describe('Testing Authentication API', function() {
	
	beforeEach((done) => {
		done()
	})
	
	afterEach((done) => {
		done()
	})
	for (let method in testcase) {
		for (let k in testcase[method]) {
			const test = testcase[method][k]
			it(method, async () => {
				const res = await agent.post(APIENTRY).send({
					jsonrpc:	"2.0",
					method: method,
					params: test.req,
					id: 1
				}).set('Accept', 'application/json')
		
				expect(res.status).toEqual(200)
				if (test.res.result===null) {
					expect(res.body.result).toEqual(null)
				} else if (typeof test.res.result==="string" || typeof test.res.result==="number" || typeof test.res.result==="boolean") {
					expect(test.res.result).toEqual(res.body.result)
				} else {
					expect(res.body.result).toMatchObject(test.res.result)
				}
				expect(res.body.error).toEqual(test.res.error)
			})
		}
	}
})