

require("dotenv").config()
import * as fs from 'fs'
const colors = require('colors')

export default (title: string, msg?: any, noWrite?: boolean) => {
	const date = new Date();
	const datetext: string = [date.getUTCFullYear(), ('0' + (date.getUTCMonth() + 1)).slice(-2), ('0' + date.getUTCDate()).slice(-2)].join('-')
	const timetext: string = [('0' + date.getUTCHours()).slice(-2), ('0' + date.getUTCMinutes()).slice(-2), ('0' + date.getUTCSeconds()).slice(-2)].join(':')
	let isError = false
	if (msg && msg.message && msg.stack) {
		if (msg.code === 'NETWORK_ERROR' || msg.code === 'EAI_AGAIN') {
			msg = 'could not detect network'
		} else {
			msg = msg.stack || msg.message
		}

		isError = true
	}
	if (msg) msg = msg.split(/\r\n|\r|\n/g).map((v: any) => '\t' + String(v)).join('\r\n')
	if (!noWrite) fs.appendFileSync(__dirname + '/../logs/' + datetext + '.log', `[${timetext}] ${title}\r\n${msg ? msg + '\r\n' : ''}`)
	if (msg && isError) msg = colors.red(msg)
	console.log(
		colors.gray('[' + timetext + ']'),
		colors.white(title),
		msg ? '\r\n' + msg : ''
	)
};
