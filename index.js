const WebSocket = require('ws')
const http = require('http')

const letsEncrypt = require('./letsencrypt')

function ClpNode (config, connectHandler, msgHandler) {
  this.downstream = {}
  this.upstream = {}
  this.serversToClose = []
  this.config = config
  this.connectHandler = connectHandler
  this.msgHandler = msgHandler
  this.incarnations = {}
  // this.myBaseUrl
}
// rename to BtpHub
// idea: call BtpPacket.(de)serialize for send/onmessage, because that's the only thing
// someone's going to do with it anyway.
// but then it needs to preserve the ASN.1 format
// btp-translator: in config, specify backend: < WebSocketURL>; it adds proxied-from, the backend needs to add proxy-to
ClpNode.prototype = {
  maybeListen () {
    return new Promise((resolve, reject) => {
      if (this.config.tls) { // case 1: use LetsEncrypt => [https, http]
        this.myBaseUrl = 'wss://' + this.config.tls
        letsEncrypt(this.config.tls).then(resolve, reject)
      } else if (typeof this.config.listen !== 'number') { // case 2: don't open run a server => []
        resolve([])
      } else { // case 3: listen without TLS on a port => [http]
        this.myBaseUrl = 'ws://localhost:' + this.config.listen
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
          // console.log('a client has connected', this.config.name)
          // console.log('setting downstream!', this.myBaseUrl, httpReq.url)
          this.downstream[this.myBaseUrl + httpReq.url] = ws
          // console.log('setting msg handler')
          ws.on('message', (msg) => {
            this.msgHandler(msg, 'server', this.myBaseUrl, httpReq.url)
          })
          // console.log('calling connect handler')
          this.connectHandler('server', this.myBaseUrl, httpReq.url)
        })
      }
    })
  },

  connectToUpstream(baseUrl, urlPath) {
    return new Promise((resolve, reject) => {
      // console.log('connecting to upstream WebSocket', upstreamConfig.url + '/' + this.config.name + '/' + upstreamConfig.token, this.config, upstreamConfig)
      // console.log('creating WebSocket object')
      const ws = new WebSocket(baseUrl + urlPath, {
        perMessageDeflate: false
      })
      ws.hasBeenOpen = false
      ws.shouldClose = false
      ws.incarnation = ++this.incarnations[baseUrl]
      // console.log('created WebSocket object')
      ws.on('open', () => {
        ws.hasBeenOpen = true
        resolve(ws)
      })
      ws.on('error', (err) => {
        console.log('error!', err, this.config.name, ws.incarnation)
        reject()
      })
      ws.on('close', () => {
        // console.log('close!', this.config.name, ws.incarnation)
        if (ws.hasBeenOpen && !ws.shouldClose) {
          // console.log('has been open and should not close')
          this.ensureUpstream(baseUrl, urlPath).then(() => {
           // console.log('ensured after disconnect!', baseUrl, urlPath)
          }, (err) => {
            //console.log('wait, what, too?', err, err.message)
          })
        }
      })
      //console.log('ws.on handlers set')
    })
  },

  connectToUpstreamRetry(baseUrl, urlPath) {
    //console.log('starting retry interval', baseUrl, urlPath)
    return new Promise((resolve) => {
      let done = false
      let timer = setInterval(() => {
      //  console.log('calling connect')
        this.connectToUpstream(baseUrl, urlPath).then(ws => {
          if (done) { // this can happen if opening the WebSocket works, but just takes long
            ws.shouldClose = true
            ws.close()
          } else {
            done = true
            clearInterval(timer)
            resolve(ws)
          }
        }).catch((err) => {
          console.log('hm, that did not work')
        })
      }, 1000)
    })
  },

  ensureUpstream(baseUrl, urlPath) {
    //console.log('ensuring upstream', baseUrl, urlPath)
    return this.connectToUpstreamRetry(baseUrl, urlPath).then(ws => {
      //console.log('connected to a server', this.config.name)
      ws.on('message', (msg) => {
        this.msgHandler(msg, 'client', baseUrl, urlPath)
      })
      //console.log(`upstream ${baseUrl} reached incarnation ${ws.incarnation}`)
      this.upstream[baseUrl + urlPath] = ws
      //console.log('calling connect handler')
      this.connectHandler('server', baseUrl, urlPath)
    }, (err) => {
      //console.log('wait, what?', err, err.message)
    })
  },

  connectToUpstreams () {
    //console.log('connectToUpstreams', this.config.upstreams)
    if (!Array.isArray(this.config.upstreams)) {
      return Promise.resolve()
    }
    return Promise.all(this.config.upstreams.map(upstreamConfig => {
      const urlPath = '/' + this.config.name + '/' + upstreamConfig.token
      this.incarnations[upstreamConfig.url] = 0
      return this.ensureUpstream(upstreamConfig.url, urlPath)
    }))
  },

  start () {
    //console.log('starting ClpNode', this.config)
    return Promise.all([
      this.maybeListen(), // .then(() => { console.log('maybeListen done', this.config) }),
      this.connectToUpstreams() // .then(() => { console.log('connectToUpstreams done', this.config) }),
    ])
  },

  stop () {
    // close ws/wss clients:
    let promises = Object.keys(this.upstream).map(url => {
      return new Promise(resolve => {
        this.upstream[url].shouldClose = true
        this.upstream[url].on('close', () => {
          resolve()
        })
        this.upstream[url].close()
      })
    })

    // close http, https, ws/wss servers:
    promises.push(this.serversToClose.map(server => {
      return new Promise((resolve) => {
        server.close(resolve)
      })
    }))
    //console.log('closing clp-node')
    return Promise.all(promises)
  },

  send (url, msg) {
    if (this.downstream[url]) {
   //    console.log(`I know ${url} as a downstream of mine!`)
       this.downstream[url].send(msg)
     } else if (this.upstream[url]) {
 //      console.log(`I know ${url} as an upstream of mine!`)
       this.upstream[url].send(msg)
     } else {
       console.log('no such peer!', url, Object.keys(this.downstream), Object.keys(this.upstream))
     }
  }
}

module.exports = ClpNode
