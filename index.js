const WebSocket = require('ws')
const http = require('http')

const letsEncrypt = require('./letsencrypt')

function ClpNode (config, handler) {
  this.upstreams = []
  this.serversToClose = []
  this.config = config
  this.handler = handler
}

ClpNode.prototype = {
  maybeListen () {
    let myBaseUrl
    return new Promise((resolve, reject) => {
      if (this.config.tls) { // case 1: use LetsEncrypt => [https, http]
        myBaseUrl = 'wss://' + this.config.tls
        letsEncrypt(this.config.tls).then(resolve, reject)
      } else if (typeof this.config.listen !== 'number') { // case 2: don't open run a server => []
        resolve([])
      } else { // case 3: listen without TLS on a port => [http]
        myBaseUrl = 'ws://localhost:' + this.config.listen
        const server = http.createServer((req, res) => {
          res.end('This is a CLP server, please upgrade to WebSockets.')
        })
        server.listen(this.config.listen, resolve([ server ]))
      }
    }).then(servers => {
      // console.log('servers:', servers.length)
      this.serversToClose = servers
      if (servers.length) {
        this.wss = new WebSocket.Server({ server: servers[0] })
        this.serversToClose.push(this.wss)
        this.wss.on('connection', (ws, httpReq) => {
          console.log('a client has connected')
          this.handler(ws, 'server', myBaseUrl + httpReq.url)
        })
      }
    })
  },

  connectToUpstreams () {
    console.log('connectToUpstreams', this.config.upstreams)
    if (!Array.isArray(this.config.upstreams)) {
      return Promise.resolve()
    }
    return Promise.all(this.config.upstreams.map(upstreamConfig => {
      const peerName = upstreamConfig.url.replace(/(?!\w)./g, '')
      // console.log({ url: upstreamConfig.url, peerName })
      return new Promise((resolve, reject) => {
        // console.log('connecting to upstream WebSocket', upstreamConfig.url + '/' + this.config.name + '/' + upstreamConfig.token, this.config, upstreamConfig)
        const url = upstreamConfig.url + '/' + this.config.name + '/' + upstreamConfig.token
        const ws = new WebSocket(url, {
          perMessageDeflate: false
        })
        ws.on('open', () => {
          console.log('connected to a server')
          this.handler(ws, 'client', url)
          resolve()
        })
      })
    }))
  },

  start () {
    console.log('starting ClpNode', this.config)
    return Promise.all([
      this.maybeListen(), // .then(() => { console.log('maybeListen done', this.config) }),
      this.connectToUpstreams() // .then(() => { console.log('connectToUpstreams done', this.config) }),
    ])
  },

  stop () {
    // close ws/wss clients:
    let promises = this.upstreams.map(ws => {
      return new Promise(resolve => {
        ws.on('close', () => {
          resolve()
        })
        ws.close()
      })
    })

    // close http, https, ws/wss servers:
    promises.push(this.serversToClose.map(server => {
      return new Promise((resolve) => {
        server.close(resolve)
      })
    }))
    console.log('closing clp-node')
    return Promise.all(promises)
  },

  send (obj) {
    return this.peers['default'].send(obj)
  },

  on (eventName, eventHandler) {
    return this.peers['default'].send(obj)
  },
}

module.exports = ClpNode
