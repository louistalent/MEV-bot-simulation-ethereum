// Project: MEV bot
// Technical Stack
// TypeScript Version: 4.3.4


require("dotenv").config()
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
process.env.NODE_NO_WARNINGS = "1"
// import http from 'http'
// import express from 'express'

// import cors from 'cors'
// import ApiV1, { initApp, initSocket } from '@src/api-v1'
import setlog from './setlog'
// import Model from '@src/model/Users/Users'
import Server from './server'
import Model from './Model'

process.on("uncaughtException", (err: Error) => console.log('exception', err))
process.on("unhandledRejection", (err: Error) => console.log('rejection', err))

Model.open().then(() => Server())