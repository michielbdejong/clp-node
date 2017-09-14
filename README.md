# clp-node

A WebSocket server and client for use in
[ilp-node](https://github.com/michielbdejong/ilp-node),
[clp-frog](https://github.com/michielbdejong/clp-cat),
[clp-cat](https://github.com/michielbdejong/clp-cat), and similar software.

# Usage
```js
const ClpNode = require('ClpNode')

// listen on ws://localhost:8000
const clpNode1 = new ClpNode({ listen: 8000 }, (ws) => {
  console.log('a client has connected!')
  ws.on('message', (message) => {
    ws.send('you said:')
    ws.send(message)
  })
})

// listen on wss://my.domain.com with on-the-fly LetsEncrypt registration
const clpNode2 = new ClpNode({ tls: 'my.domain.com' }, (ws) => {
  console.log('a client has connected!')
  ws.on('message', (message) => {
    ws.send('you said:')
    ws.send(message)
  })
})

// connect to a server
const clpNode3 = new ClpNode({ upstreams: [ { url: 'wss://my.domain.com', path: '/' } ] }, (ws) => {
  console.log('connected to a server!')
  ws.on('message', (message) => {
    ws.send('thanks')
  })
  ws.send('hello')
})
```
