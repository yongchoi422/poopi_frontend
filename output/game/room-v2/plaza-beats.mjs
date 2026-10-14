// Presentation timing only. The underlying encounter and territory are unchanged.
export const BEATS=[[0,0],[96,28.34],[102,30.5],[116,32.2],[157,46],[210,62]];
function interpolate(value,axis,offset=0){const other=1-axis,beats=offset?BEATS.map(([l,t],i)=>[i>0&&i<BEATS.length-1?l+offset:l,t]):BEATS;for(let i=1;i<beats.length;i++){const a=beats[i-1],b=beats[i];if(value<=b[axis])return a[other]+(b[other]-a[other])*Math.max(0,(value-a[axis])/(b[axis]-a[axis]));}return beats.at(-1)[other];}
export const encounterTimeAt=(logical,offset=0)=>interpolate(logical,0,offset);
export const logicalAtTime=(seconds,offset=0)=>interpolate(seconds,1,offset);
export const eventAge=(data,event)=>data.t-6-encounterTimeAt(event.at,data.timingOffset||0);
export const SHOT_TRAVEL=.14;
export const impactAge=(data,event)=>eventAge(data,event)-(event.kind==='shot'?SHOT_TRAVEL:0);
export const decay=(age,duration)=>age<0||age>=duration?0:(1-age/duration)**2;
export function combatBeat(data,reduced=false){
 let impact=0,gate=0;
 for(const e of data.effects){if(e.kind==='gate-hit')gate=Math.max(gate,decay(eventAge(data,e),.22)*(e.strength||.5));else if(e.kind==='shot'&&e.side===1)impact=Math.max(impact,decay(impactAge(data,e),.18));}
 const age=Number.isFinite(data.gate.brokenAt)?data.t-6-encounterTimeAt(data.gate.brokenAt,data.timingOffset||0):-1;
 return {age,impact,gate,burst:decay(age,.82),shake:reduced?0:Math.min(.22,decay(age,.7)*.22+gate*.045+impact*.019)};
}
