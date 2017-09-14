# clp-node

A WebSocket server and client for use in
[ilp-node](https://github.com/michielbdejong/ilp-node),
[clp-frog](https://github.com/michielbdejong/clp-cat),
[clp-cat](https://github.com/michielbdejong/clp-cat), and similar software.

# Usage
Inside your nodejs project, run:
```sh
npm install --save michielbdejong/clp-node
```

Then in your nodejs script:
```js
const ClpNode = require('ClpNode')
```

Then there are basically three ways to use ClpNode:

## Listen on ws://localhost:8000
```js
const clpNode1 = new ClpNode({ listen: 8000 }, (ws, whoAmI, url) => {
  console.log('I am the ' + whoAmI /* 'server' */ + ' and a client has connected to ' + url)
  ws.on('message', (message) => {
    ws.send('you said:')
    ws.send(message)
  })
})
``


## Listen on wss://my.domain.com with on-the-fly LetsEncrypt registration
Make sure you point the DNS domain to this server first, and ssh into your
server:

```sh
ssh root@my.domain.com
```

Then on your server, save the following nodejs script:
```js
const clpNode2 = new ClpNode({ tls: 'my.domain.com' }, (ws, whoAmI, url) => {
  console.log('I am the ' + whoAmI /* 'server' */ + ' and a client has connected to ' + url)
  console.log('a client has connected!')
  ws.on('message', (message) => {
    ws.send('you said:')
    ws.send(message)
  })
})
```

## Connect to a server
```js
const clpNode3 = new ClpNode({ upstreams: [ { url: 'wss://my.domain.com', path: '/' } ] }, (ws, whoAmI, url) => {
  console.log('I am the ' + whoAmI /* 'client' */ + ' and I have connected to ' + url)
  ws.on('message', (message) => {
    ws.send('thanks')
  })
  ws.send('hello')
})
```

## A combination of those
You can also specify multiple upstreams, even if the node is already a server itself. In a future version
we might add better support for that, so you can see which of your peers is connected when your connect-callback
is called.

# Start and stop the WebSocket
To start the clp node means that it starts listening as a server, and/or connects to the upstreams you configured.
To stop the clp node means all connections, upstream and downstream, are closed again.

```js
clpNode.start().then(() => {
  console.log('clp node started', clpNode.config)
  return new Promise((resolve) => { setTimeout(resolve, 10000) })
}).then(() => {
  return clpNode.stop()
}).then(() => {
  console.log('clp node stopped')
})
```
