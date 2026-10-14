// This module never inserts an input SVG into the document. A tiny allowlist
// creates a new standalone image, while the pixel path matches the token format.
export const MAX_SVG_BYTES=262144;
const number=/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i,paint=/^(?:#[\da-f]{3}(?:[\da-f]{3})?|none)$/i;
const tags=new Set(['svg','g','rect','path','circle','ellipse','line','polyline','polygon']);
const geometry=new Set(['x','y','width','height','rx','ry','cx','cy','r','x1','y1','x2','y2','stroke-width','opacity','fill-opacity','stroke-opacity']);
function safeValue(key,value){
 if(geometry.has(key))return number.test(value)&&Number.isFinite(+value)&&Math.abs(+value)<=4096;
 if(['fill','stroke'].includes(key))return paint.test(value);
 if(key==='d')return value.length<65536&&/^[MmZzLlHhVvCcSsQqTtAa\d\s.,+eE-]+$/.test(value);
 if(key==='points')return value.length<65536&&/^[\d\s.,+eE-]+$/.test(value);
 if(key==='transform')return value.length<512&&/^(?:(?:matrix|translate|scale|rotate|skewX|skewY)\(\s*[-+\d.eE,\s]+\)\s*)+$/.test(value);
 if(key==='fill-rule')return ['evenodd','nonzero'].includes(value);
 if(key==='stroke-linecap')return ['round','butt','square'].includes(value);
 if(key==='stroke-linejoin')return ['round','bevel','miter'].includes(value);
 return false;
}
export function parseArtwork(raw,{level=null}={}){
 if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_SVG_BYTES||/<!DOCTYPE|<!ENTITY/i.test(raw))throw Error('Original artwork is unavailable.');
 const doc=new DOMParser().parseFromString(raw,'image/svg+xml'),root=doc.documentElement;
 if(root.localName!=='svg'||root.namespaceURI!=='http://www.w3.org/2000/svg'||doc.querySelector('parsererror'))throw Error('Original artwork is unavailable.');
 const view=(root.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
 if(view.length!==4||!view.every(Number.isFinite)||view.some(n=>Math.abs(n)>4096)||view[2]<=0||view[3]<=0)throw Error('Original artwork has an unsupported size.');
 const nodes=[root,...root.querySelectorAll('*')];if(nodes.length>4097)throw Error('Original artwork is too complex.');
 for(const el of nodes){
  if(!tags.has(el.localName)||el.namespaceURI!==root.namespaceURI)throw Error('Original artwork contains unsupported markup.');
  for(const a of el.attributes){
   if(el===root&&a.name==='xmlns'&&a.value===root.namespaceURI)continue;
   if(el===root&&a.name==='viewBox')continue;
   if(el===root&&a.name==='shape-rendering'&&a.value==='crispEdges')continue;
   if(!safeValue(a.name,a.value))throw Error('Original artwork contains unsupported attributes.');
  }
  if([...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()||![1,3].includes(n.nodeType)))throw Error('Original artwork contains unsupported content.');
 }
 const original=new XMLSerializer().serializeToString(root);
 const rootAttrs=[...root.attributes].every(a=>['xmlns','viewBox','shape-rendering'].includes(a.name));
 const rects=[...root.children];
 const pixel=rootAttrs&&view.join(' ')==='0 0 24 24'&&rects.length>0&&rects.every(el=>el.localName==='rect'&&el.attributes.length===5&&['x','y','width','height','fill'].every(k=>el.hasAttribute(k))&&['x','y','width','height'].every(k=>/^\d{1,2}$/.test(el.getAttribute(k))&&+el.getAttribute(k)<=48)&&+el.getAttribute('width')>0&&+el.getAttribute('height')>0&&/^#[\da-f]{6}$/i.test(el.getAttribute('fill')));
 if(!pixel)return {original,mode:'original2d',reason:'This artwork is shown in its original 2D form.',view};
 const all=rects.map(el=>Object.fromEntries(['x','y','width','height','fill'].map(k=>[k,k==='fill'?el.getAttribute(k):+el.getAttribute(k)])));
 const shape=(r,x,y,w,h)=>r&&r.x===x&&r.y===y&&r.width===w&&r.height===h;
 const one=shape(all[1],0,17,24,7),two=shape(all[1],0,17,24,8)&&shape(all[2],0,17,24,1)&&shape(all[3],0,18,24,1)&&all[1].fill===all[2].fill&&all[2].fill===all[3].fill;
 const foreground=shape(all[0],0,0,24,24)&&(one||two)?all.slice(one?2:4):all;
 const clipped=foreground.map(r=>({...r,width:Math.max(0,Math.min(24-r.x,r.width)),height:Math.max(0,Math.min(24-r.y,r.height))})).filter(r=>r.width&&r.height&&r.x<24&&r.y<24);
 if(!clipped.length)return {original,mode:'original2d',reason:'This artwork is shown in its original 2D form.',view};
 const x=Math.min(...clipped.map(r=>r.x)),y=Math.min(...clipped.map(r=>r.y)),w=Math.max(...clipped.map(r=>r.x+r.width))-x,h=Math.max(...clipped.map(r=>r.y+r.height))-y;
 const dot=level===1||(w<=3&&h<=4),frame=[x-.5,y-.5,w+1,h+1];
 return {original,mode:'volume',rectangles:clipped,frame,bounds:{x,y,w,h},dot,name:'Original SOULI',view};
}

export async function artworkImage(svg){
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try{return await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('The original image could not be decoded.'));image.src=url;});}
 finally{URL.revokeObjectURL(url);}
}
