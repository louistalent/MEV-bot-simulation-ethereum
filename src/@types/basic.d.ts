

declare interface SessionType {
	lang?: string
	uid?: number
	captcha?: {
		pubkey: string
		token: string
		x: number
		fail?: number
		success?: boolean
		created: number
	}
	captchaKey?: string
	email?: {
		action: string
		target: string
		code: string
		sent: number
		fail: number
	}
	created: number
}

declare interface RpcRequestType {
	jsonrpc: "2.0"
	method: string
	params: Array<string | number | boolean>
	id: string | number
}

declare interface RpcResponseType {
	jsonrpc: "2.0"
	id: string | number
	result?: any
	error?: number
}

declare interface WebFileType {
	mime: string
	data: Buffer
}

declare interface ServerResponse {
	result?: any
	error?: number
}

declare interface RpcSolverType {
	[method: string]: (cookie: string, session: SessionType, clientIp: string, params: Array<string | number | boolean | { [key: string]: string | number | boolean }>) => Promise<{ error?: number, result?: any }>
}