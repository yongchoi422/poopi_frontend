const rest={x:.05,y:.13,z:1.10,yaw:.08,lean:0},windowSpot={x:-1.35,y:.14,z:-.74,yaw:-.30,lean:0},cushion={x:1.73,y:.55,z:.91,yaw:.15,lean:-.13};
const smooth=t=>t*t*(3-2*t),mix=(a,b,t)=>Object.fromEntries(Object.keys(a).map(k=>[k,a[k]+(b[k]-a[k])*smooth(t)]));
export const CYCLE_SECONDS=90;
export function behaviorAt(seconds,{still=false}={}){
 if(still)return {...rest,kind:'rest',label:'A quiet little moment.',bob:0};
 const t=((seconds%90)+90)%90;let p,kind,label;
 if(t<26){p=rest;kind='rest';label='A quiet little moment.';}
 else if(t<31){p=mix(rest,windowSpot,(t-26)/5);kind='window';label='Something interesting outside.';}
 else if(t<50){p=windowSpot;kind='window';label='Watching the daylight wander.';}
 else if(t<57){p=mix(windowSpot,cushion,(t-50)/7);kind='cushion';label='That cushion looks rather nice.';}
 else if(t<78){p=cushion;kind='cushion';label='Taking a very important little rest.';}
 else if(t<85){p=mix(cushion,rest,(t-78)/7);kind='rest';label='Back to a favorite spot.';}
 else {p=rest;kind='rest';label='A quiet little moment.';}
 return {...p,kind,label,bob:kind==='cushion'?Math.sin(seconds*.65)*.01:Math.sin(seconds*.8)*.035};
}

export const STATUSES=['disconnected','sample','loading','owned','empty','error'];
export function normalizeState(input){
 if(!input||!STATUSES.includes(input.status))throw Error('Unknown room state.');
 const status=input.status,isFixture=input.isFixture===true;
 if(!['sample','owned'].includes(status))return {status,isFixture:false,souls:[],selectedIndex:0,total:0};
 const souls=status==='sample'?[input.soul]:input.souls;
 if(!Array.isArray(souls)||souls.length<1||souls.length>8||souls.some(s=>!s||typeof s.svg!=='string'))throw Error('Provide one sample soul or up to eight owned inscriptions.');
 const selectedIndex=input.selectedIndex??0;
 if(!Number.isInteger(selectedIndex)||selectedIndex<0||selectedIndex>=souls.length)throw Error('Unknown selected inscription.');
 const total=input.total??souls.length;if(!Number.isSafeInteger(total)||total<souls.length||total>210000001)throw Error('Invalid collection size.');
 return {status,isFixture,souls:souls.map(s=>({svg:s.svg,level:Number.isInteger(s.level)?s.level:null,seed:String(s.seed??''),extra:String(s.extra??''),dynamic:s.dynamic===true,source:typeof s.source==='string'?s.source:'',name:typeof s.name==='string'?s.name.slice(0,80):''})),selectedIndex,total};
}
export const sourceLabel=state=>state.status==='sample'?'Sample soul':state.isFixture?'Wallet fixture · Preview only':state.status==='owned'?'Your soul':({disconnected:'No soul selected',loading:'Finding your soul…',empty:'No inscriptions found',error:'Could not load your soul'}[state.status]);
export const photoLabel=state=>state.status==='sample'?'SAMPLE SOUL':state.isFixture?'WALLET FIXTURE · PREVIEW ONLY':'MY LITTLE ROOM';
