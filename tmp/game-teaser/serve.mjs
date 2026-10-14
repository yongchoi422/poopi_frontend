import http from 'node:http'
import {readFile} from 'node:fs/promises'
const files={
 '/':'tmp/game-teaser/render.html',
 '/three.module.js':'output/game/room-v2/node_modules/three/build/three.module.js',
 '/three.core.js':'output/game/room-v2/node_modules/three/build/three.core.js',
 '/soul-volume.mjs':'output/game/room-v2/soul-volume.mjs',
 '/artwork.mjs':'output/game/waiting-room/artwork.mjs',
 '/souls.json':'src/lighthouse/public-souls.json',
}
http.createServer(async(req,res)=>{const file=files[new URL(req.url,'http://127.0.0.1').pathname];if(!file){res.writeHead(404).end();return}try{const bytes=await readFile(file);res.writeHead(200,{'Content-Type':file.endsWith('html')?'text/html':file.endsWith('json')?'application/json':'text/javascript','Cache-Control':'no-store'});res.end(bytes)}catch{res.writeHead(500).end('Render input unavailable')}}).listen(4319,'127.0.0.1',()=>console.log('Local character export http://127.0.0.1:4319/'))
