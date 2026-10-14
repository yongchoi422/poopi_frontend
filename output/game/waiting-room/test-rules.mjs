import test from 'node:test';
import assert from 'node:assert/strict';
import {behaviorAt,normalizeState,sourceLabel,photoLabel} from './behavior.mjs';
import {visiblePixels,pixelComponents,createSoulVolume,disposeSoulVolume} from './soul-volume.mjs';
const sample={svg:'<svg/>',owner:'private address',balance:'private balance',seed:'101',extra:'12',source:'wallet',level:1,dynamic:true};
test('three automatic activities recur with finite positions and gentle motion',()=>{
 assert.deepEqual([0,32,60].map(s=>behaviorAt(s).kind),['rest','window','cushion']);
 let previous=behaviorAt(0);for(let t=.02;t<180;t+=.02){const p=behaviorAt(t);for(const k of ['x','y','z','bob','yaw','lean'])assert.ok(Number.isFinite(p[k]));assert.ok(Math.hypot(p.x-previous.x,p.z-previous.z)<.05);previous=p;}
 for(const t of [0,25,40,60,90])assert.deepEqual(behaviorAt(t,{still:true}),behaviorAt(0,{still:true}));
});
test('empty and transition states never retain selected data',()=>{for(const status of ['loading','disconnected','empty','error']){const s=normalizeState({status,souls:[sample],isFixture:true});assert.equal(s.souls.length,0);assert.equal(s.isFixture,false);}});
test('owner and balance cannot enter the renderer state',()=>{const s=normalizeState({status:'owned',souls:[sample],isFixture:true});assert.equal(s.souls[0].owner,undefined);assert.equal(s.souls[0].balance,undefined);assert.equal(s.souls[0].seed,'101');assert.match(sourceLabel(s),/Fixture|fixture/);assert.match(photoLabel(s),/FIXTURE/);assert.match(photoLabel(normalizeState({status:'sample',soul:sample})),/SAMPLE/);});
test('collection validation rejects inconsistent and excessive selections',()=>{for(const s of [{status:'unknown'},{status:'owned',souls:[]},{status:'owned',souls:Array(9).fill(sample)},{status:'owned',souls:[sample],selectedIndex:3},{status:'owned',souls:[sample],total:0}])assert.throws(()=>normalizeState(s));});
test('derived front resolves overpaint and retains disconnected pixels',()=>{const rectangles=[{x:1,y:1,width:3,height:3,fill:'#ffffff'},{x:2,y:2,width:1,height:1,fill:'#000000'},{x:8,y:1,width:1,height:1,fill:'#123456'}];const pixels=visiblePixels(rectangles);assert.equal(pixels.size,10);assert.equal(pixels.get('2,2').color,'#000000');assert.equal(pixelComponents(pixels).length,2);const g=createSoulVolume({rectangles,frame:[0,0,10,5],name:'test'});assert.equal(g.userData.frontPixels.length,10);assert.match(g.userData.backRule,/solid dominant/);disposeSoulVolume(g);});
