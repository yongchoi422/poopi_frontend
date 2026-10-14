import { spawn } from 'node:child_process'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
process.env.SOULI_SALE_LAB='1'
const demo=spawn(process.execPath,['scripts/demo.mjs'],{cwd:fileURLToPath(new URL('../contracts/',import.meta.url)),stdio:'inherit',windowsHide:true})
const server=await createServer({server:{host:'127.0.0.1',port:5173,strictPort:true}})
await server.listen();server.printUrls()
async function close(){demo.kill();await server.close();process.exit(0)}
process.on('SIGINT',close);process.on('SIGTERM',close);demo.on('exit',close)
