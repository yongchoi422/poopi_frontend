import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createReadOnlyForkRpc } from '../scripts/read-only-fork-rpc.mjs'

test('fork transport rejects writes before upstream and caches only pinned reads', async () => {
  const received = []
  const server = createServer(async (req,res) => {
    let text = ''; for await (const chunk of req) text += chunk
    const body = JSON.parse(text); received.push(body)
    res.writeHead(200, {'content-type':'application/json'}).end(JSON.stringify({jsonrpc:'2.0',id:body.id,result:'0x42'}))
  })
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve))
  const proxy = await createReadOnlyForkRpc(`http://127.0.0.1:${server.address().port}`)
  const send = async input => (await fetch(proxy.url, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)})).json()
  const rpc = (id,method,params=[]) => ({jsonrpc:'2.0',id,method,params})
  try {
    const denied = await send(['eth_sendRawTransaction','eth_sendTransaction','wallet_sendCalls','personal_sign','hardhat_setBalance'].map((m,i) => rpc(i,m)))
    assert.equal(denied.length,5);assert.ok(denied.every(x=>x.error.code===-32601));assert.equal(received.length,0)
    assert.equal((await send(rpc(10,'eth_getStorageAt',['0x1','0x0','0x100']))).result,'0x42')
    assert.equal((await send(rpc(11,'eth_getStorageAt',['0x1','0x0','0x100']))).id,11)
    assert.equal(received.length,1)
    await send(rpc(12,'eth_getStorageAt',['0x1','0x0','0x101']));assert.equal(received.length,2)
    await send(rpc(13,'eth_getBalance',['0x1','latest']));await send(rpc(14,'eth_getBalance',['0x1','latest']))
    assert.equal(received.length,4)
  } finally {
    await proxy.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))
  }
})
