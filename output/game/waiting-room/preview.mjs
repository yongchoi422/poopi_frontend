import {createWaitingRoom} from './waiting-room.mjs';
import {walletFixture,vectorFixture} from './fixtures.mjs';
const samples=await fetch('./soul-samples.json').then(r=>r.json());
const sample=document.querySelector('#sample'),scenario=document.querySelector('#scenario');
for(const [i,s]of samples.entries()){const o=document.createElement('option');o.value=i;o.textContent=s.name;sample.append(o);}
const fixtures=walletFixture([samples[0],samples[1],samples[2],samples[6]]);
const room=createWaitingRoom(document.querySelector('#room'),{prefer2D:new URL(location.href).searchParams.get('render')==='2d'});
function chosen(){const s=samples[Number(sample.value)];return {...s,level:s.dot?1:3,source:'sample'};}
async function update(){switch(scenario.value){case'fixture':return room.setState({status:'owned',souls:[fixtures[0]],isFixture:true});case'multiple':return room.setState({status:'owned',souls:fixtures,isFixture:true});case'vector':return room.setSoul(vectorFixture);case'sample':return room.setSoul(chosen());default:return room.setState({status:scenario.value});}}
scenario.addEventListener('change',()=>void update());sample.addEventListener('change',()=>{scenario.value='sample';void update();});
// Only the local lab exposes diagnostics; the reusable module creates no globals.
window.roomLab={room,samples,fixtures,vectorFixture,createWaitingRoom};await update();window.roomReady=true;
