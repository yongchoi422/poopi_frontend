// One deterministic, equal-area ownership grid drives both scoring and paint.
export const TURF={minX:-6.4,maxX:6.4,minZ:-3.2,maxZ:3.84,step:.32};
export const PALETTE={soul:'#26e4bc',soulLight:'#bdffdf',wild:'#a34ce0',wildLight:'#eea9ff',dark:'#342044'};
export const TURF_CELLS=[];
const CELL_INDEX=new Map();
for(let row=0;row<22;row++)for(let col=0;col<40;col++){
  const x=TURF.minX+(col+.5)*TURF.step,z=TURF.minZ+(row+.5)*TURF.step;
  if((x/6.25)**2+((z-.35)/3.45)**2>1)continue;
  if(Math.abs(x-.1)<1.5&&z> -3.05&&z<-.85)continue; // House is not paintable floor.
  CELL_INDEX.set(row*40+col,TURF_CELLS.length);TURF_CELLS.push({x,z,col,row});
}
export function paintTurf(owners,x,z,radius,side){
  let changed=0;
  for(let i=0;i<TURF_CELLS.length;i++){
    const cell=TURF_CELLS[i];
    if((cell.x-x)**2+(cell.z-z)**2<=radius*radius&&owners[i]!==side){owners[i]=side;changed++;}
  }
  return changed;
}
export function ownerAt(owners,x,z){
  const col=Math.floor((x-TURF.minX)/TURF.step),row=Math.floor((z-TURF.minZ)/TURF.step);
  if(col<0||col>=40||row<0||row>=22)return 0;
  const cell=CELL_INDEX.get(row*40+col);
  return cell===undefined?0:owners[cell];
}
export function summarizeTurf(owners){
  let soulCells=0,wildCells=0;
  for(const owner of owners){if(owner===1)soulCells++;if(owner===2)wildCells++;}
  const total=TURF_CELLS.length,percent=count=>Math.round(count/total*1000)/10;
  return {owners:owners.join(''),soul:percent(soulCells),wild:percent(wildCells),neutral:percent(total-soulCells-wildCells),soulCells,wildCells,total,winner:soulCells>wildCells?'soul':wildCells>soulCells?'wild':'tie'};
}
