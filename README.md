# clp-cat
A combination of clp-packet and ws-cat. Use it as a debug tool, to talk to clp-frog or to ilp-node

![cat debugging a frog](http://i.imgur.com/6IVYUHo.jpg "Cat debugging a Frog")

# Getting started
Enter the `node` REPL and require a plugin, a frog, and cat:
```sh
$ node
>
 const Plugin = require('ilp-plugin-bells')
 const plugin = new Plugin({ account: 'https://red.ilpdemo.org/ledger/accounts/alice', password: 'alice' })
 const Frog = require('clp-frog')
 const Cat = require('.')
 const ClpPacket = require('clp-packet')
```

# Connecting the frog and the cat

You have four options:

## With the frog as server and the cat as client:

```js
>
 const frog = new Frog({ clp: { version: 1, listen:8000 }, plugin })
 const cat = new Cat({ clp: { version: 1, name: 'alice', upstreams: [ { url: 'ws://localhost:8000/frog/clp/v1', token: 'alice' } ] } })
```

## The other way around:

```js
>
 const frog = new Frog({ clp: { version: 1, name: 'alice', upstreams: [ { url: 'ws://localhost:8000/cat/clp/v1', token: 'alice' } ] }, plugin })
 const cat = new Cat({ clp: { version: 1, listen:8000 } ] })
```

## With the frog on a hosted server:

```js
>
 const frog = new Frog({ clp: { version: 1, tls: 'frog.example.com' }, plugin })
 const cat = new Cat({ clp: { version: 1, name: 'alice', upstreams: [ { url: 'wss://frog.example.com/frog/clp/v1', token: 'alice' } ] } })
```

## With the cat on a hosted server:

```js
>
 const frog = new Frog({ clp: { version: 1, name: 'alice', upstreams: [ { url: 'wss://cat.example.com/cat/clp/v1', token: 'alice' } ] }, plugin })
 const cat = new Cat({ clp: { version: 1,  tls: 'cat.example.com' } })
```

# Get Alice's balance
ClpCat parses incoming CLP packets, and also creates eval strings for them, where literals are smartly replaced with appropriate constants from ClpPacket:

```js
>
 frog.start().then(() => { console.log('started') })
 cat.on('incoming', (obj, evalString) => { console.log(evalString) })
 cat.send({ type: ClpPacket.TYPE_MESSAGE, requestId: 1, data: [ { protocolName: 'balance', contentType: ClpPacket.MIME_APPLICATION_OCTET_STREAM, data: Buffer.from([ 0 ]) } ] })
"{ type: ClpPacket.TYPE_RESPONSE, requestId: 1, data: [ { protocolName: 'balance', contentType: ClpPacket.MIME_APPLICATION_OCTET_STREAM, data: Buffer.from([ 0, 0, 0, 0, 0, 0, 255, 255 ]) } ] }"
```
