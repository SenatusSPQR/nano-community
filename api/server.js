const https = require('https')
const http = require('http')
const fs = require('fs')
const url = require('url')
const path = require('path')

const WebSocket = require('ws')
const express = require('express')
const morgan = require('morgan-debug')
const extend = require('deep-extend')
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken')
const expressJwt = require('express-jwt')
const compression = require('compression')
const debug = require('debug')
const NodeCache = require('node-cache')
const serveStatic = require('serve-static')
const cors = require('cors')
const favicon = require('express-favicon')

const logger = debug('api')

const config = require('../config')
const routes = require('./routes')
const db = require('../db')
require('./cron')
// const sockets = require('./sockets')

const defaults = {}
const options = extend(defaults, config)
const IS_DEV = process.env.NODE_ENV === 'development'
const IS_PROD = process.env.NODE_ENV === 'production'

if (IS_DEV) {
  debug.enable('server,api*,knex:*')
} else if (IS_PROD) {
  debug.enable('server,api*')
}

const api = express()

api.locals.db = db
api.locals.logger = logger
api.locals.cache = new NodeCache({ stdTTL: 300, checkperiod: 120 })

api.enable('etag')
api.disable('x-powered-by')
api.use(compression())
api.use(morgan('api', 'combined'))
api.use(bodyParser.json())
api.use(
  cors({
    origin: true,
    credentials: true
  })
)

api.use(favicon(path.join(__dirname, '..', 'resources', 'favicon.ico')))
api.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, must-revalidate, proxy-revalidate')
  next()
})

const resourcesPath = path.join(__dirname, '..', 'resources')
api.use('/resources', serveStatic(resourcesPath))

api.use('/api/*', expressJwt(config.jwt), (err, req, res, next) => {
  res.set('Expires', '0')
  res.set('Pragma', 'no-cache')
  res.set('Surrogate-Control', 'no-store')
  if (err.code === 'invalid_token') return next()
  return next(err)
})

// unprotected api routes
api.use('/api/posts', routes.posts)
api.use('/api/network', routes.network)
const docsPath = path.join(__dirname, '..', 'docs')
api.use('/api/docs', serveStatic(docsPath))
api.get('/api/docs/*', (req, res) => {
  res.status(404).send('Not found')
})

api.use('/api/*', (err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).send({ error: 'invalid token' })
  }
  next()
})

// protected api routes

api.get('*', (req, res) => {
  if (IS_DEV) {
    res.redirect(307, `http://localhost:8081${req.path}`)
  } else {
    const indexPath = path.join(__dirname, '../', 'build', 'index.html')
    res.sendFile(indexPath, { cacheControl: false })
    // redirect to ipfs page
    // res.redirect(307, `${config.url}${req.path}`)
  }
})

const createServer = () => {
  if (!options.ssl) {
    return http.createServer(api)
  }

  const sslOptions = {
    key: fs.readFileSync(config.key),
    cert: fs.readFileSync(config.cert)
  }
  return https.createServer(sslOptions, api)
}

const server = createServer()
const wss = new WebSocket.Server({ noServer: true })

server.on('upgrade', async (request, socket, head) => {
  const parsed = new url.URL(request.url, config.url)
  try {
    const token = parsed.searchParams.get('token')
    const decoded = await jwt.verify(token, config.jwt.secret)
    request.user = decoded
  } catch (error) {
    logger(error)
    return socket.destroy()
  }

  wss.handleUpgrade(request, socket, head, function (ws) {
    ws.userId = request.user.userId
    wss.emit('connection', ws, request)
  })
})

// sockets(wss)

module.exports = server
