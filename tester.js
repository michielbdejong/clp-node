const ClpNode = require('.')

const server = new ClpNode({
    name: 'server',
    listen: 8000 
}, (whoAmI, baseUrl, urlPath) => {
  console.log('connected', whoAmI, baseUrl, urlPath)
}, (msg, whoAmI, baseUrl, urlPath) => {
  console.log('msg reached', whoAmI, baseUrl, urlPath, msg)
})

const client = new ClpNode({
    name: 'client',
    upstreams: [
       { url: 'ws://localhost:8000', token: 'asdf' }
    ]
}, (whoAmI, baseUrl, urlPath) => {
  console.log('connected', whoAmI, baseUrl, urlPath)
}, (msg, whoAmI, baseUrl, urlPath) => {
  console.log('msg reached', whoAmI, baseUrl, urlPath, msg)
})


client.start().then(() => {
  console.log('0: client started')
})

setTimeout(() => {
  server.start().then(() => {
    console.log('1: server started')
  })
}, 1000)
  
setTimeout(() => {
  server.stop().then(() => {
    console.log('5: server stopped')
  })
}, 5000)
setTimeout(() => {
  server.start().then(() => {
    console.log('7:server started')
  })
}, 7000)

let counter = 0
setInterval(() => {
  try {
    client.send('ws://localhost:8000', ++counter)
    console.log('client req sent')
  } catch(e) {
    console.log('client req fail', e)
  }
}, 500)
