import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const base=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary'};
http.createServer((req,res)=>{
  let requested;try{requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end();return}
  const file=path.resolve(base,'.'+(requested==='/'?'/index.html':requested));
  if(!file.startsWith(base+path.sep)){res.writeHead(403);res.end();return}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data)});
}).listen(4318,'127.0.0.1',()=>console.log('SOULI room draft http://127.0.0.1:4318'));
