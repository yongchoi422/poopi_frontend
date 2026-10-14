export const ROOF={minX:-6.4,maxX:6.4,minZ:-3.2,maxZ:3.84,step:.32};
export const ROOF_CELLS=[];
const indices=new Map();
for(let row=0;row<22;row++)for(let col=0;col<40;col++){
  const x=ROOF.minX+(col+.5)*ROOF.step,z=ROOF.minZ+(row+.5)*ROOF.step;
  if(Math.abs(x)<1.25&&z<-2.1)continue;
  indices.set(row*40+col,ROOF_CELLS.length);ROOF_CELLS.push({x,z,row,col});
}
export const MARKET_SKIES={
  fog:{name:'Violet drizzle',change:-4.2,label:'ETH ↓ 4.2%',ink:'#8e56d9',highlight:'#ddb9ff',sky:'#424866',detail:'Slow, broad puddles. Paint builds up behind the gates.',trail:.54,spray:.78,scatter:1,pace:.025},
  aurora:{name:'Coral confetti',change:4.2,label:'ETH ↑ 4.2%',ink:'#eb6883',highlight:'#ffe0a1',sky:'#63556d',detail:'Quick fluttering visitors. Small splashes scatter farther.',trail:.36,spray:.43,scatter:3,pace:.028},
};
export function roofPaint(owners,x,z,radius,side){
  let changed=0;
  for(let i=0;i<ROOF_CELLS.length;i++){
    const c=ROOF_CELLS[i];if((c.x-x)**2+(c.z-z)**2>radius*radius)continue;
    // Cleaning reveals the original tile. Value 1 is a clean record, not mint ink.
    if(side===1&&owners[i]!==2)continue;
    if(owners[i]!==side){owners[i]=side;changed++;}
  }
  return changed;
}
export function roofOwner(owners,x,z){
  const col=Math.floor((x-ROOF.minX)/ROOF.step),row=Math.floor((z-ROOF.minZ)/ROOF.step);
  if(col<0||col>=40||row<0||row>=22)return 0;
  const i=indices.get(row*40+col);return i===undefined?0:owners[i];
}
export function roofSummary(owners){
  let dirtyCells=0,cleanedCells=0;
  for(const v of owners){if(v===2)dirtyCells++;if(v===1)cleanedCells++;}
  const total=owners.length,percent=n=>Math.round(n/total*1000)/10,clean=percent(total-dirtyCells);
  return {owners:owners.join(''),total,dirtyCells,cleanedCells,clean,pollution:percent(dirtyCells),soul:clean,wild:percent(dirtyCells),soulCells:cleanedCells,wildCells:dirtyCells,neutral:0,winner:clean>=80?'soul':'wild',restoration:true};
}
export function initialRoofPaint(){
  const owners=new Array(ROOF_CELLS.length).fill(0);
  for(const [x,z,r] of [[-5,-1.9,1.15],[4.8,-1.7,1.1],[-3.4,1.1,1.2],[3.5,1.3,1.1],[-.9,.4,1],[1.1,-1,.9]])roofPaint(owners,x,z,r,2);
  return owners;
}
export const roofPreview=()=>roofSummary(initialRoofPaint());
