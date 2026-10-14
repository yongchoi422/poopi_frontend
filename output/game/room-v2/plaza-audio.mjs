// Small synthesized water/wood/metal/chime cues; no remote sound requests.
import {eventAge,SHOT_TRAVEL} from './plaza-beats.mjs';
export function createPlazaAudio(){
 let context=null,master=null,enabled=false,lastLogical=-1,lastPressure=false,noiseBuffer=null,played=new Set();
 function noise(duration,gain,frequency,when=0){if(!enabled||!context)return;const t=context.currentTime+when,source=context.createBufferSource(),filter=context.createBiquadFilter(),amp=context.createGain();source.buffer=noiseBuffer;filter.type='lowpass';filter.frequency.setValueAtTime(frequency,t);filter.frequency.exponentialRampToValueAtTime(Math.max(100,frequency*.28),t+duration);amp.gain.setValueAtTime(.0001,t);amp.gain.exponentialRampToValueAtTime(gain,t+.018);amp.gain.exponentialRampToValueAtTime(.0001,t+duration);source.connect(filter).connect(amp).connect(master);source.start(t);source.stop(t+duration+.03);source.onended=()=>{source.disconnect();filter.disconnect();amp.disconnect();};}
 function tone(frequency,duration,gain,type='sine',delay=0){if(!enabled||!context)return;const t=context.currentTime+delay,o=context.createOscillator(),a=context.createGain();o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(frequency*.65,t+duration);a.gain.setValueAtTime(gain,t);a.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(a).connect(master);o.start(t);o.stop(t+duration);o.onended=()=>{o.disconnect();a.disconnect();};}
 function note(frequency,duration,gain,type='sine',delay=0){if(!enabled||!context)return;const t=context.currentTime+delay,o=context.createOscillator(),a=context.createGain();o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(frequency*1.02,t+duration);a.gain.setValueAtTime(gain,t);a.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(a).connect(master);o.start(t);o.stop(t+duration);o.onended=()=>{o.disconnect();a.disconnect();};}
 async function toggle(){
  if(!context){context=new AudioContext();master=context.createGain();master.gain.value=.40;const compressor=context.createDynamicsCompressor();compressor.threshold.value=-14;compressor.knee.value=18;compressor.ratio.value=5;compressor.attack.value=.005;compressor.release.value=.12;master.connect(compressor).connect(context.destination);noiseBuffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);}
  enabled=!enabled;if(enabled)await context.resume();else await context.suspend();return enabled;
 }
 function update(data){if(data.logical<lastLogical){played.clear();lastPressure=false;}lastLogical=data.logical;if(!enabled)return;
  let shots=0,washes=0;for(const e of data.effects){if(played.has(e.id))continue;played.add(e.id);if(eventAge(data,e)>.32)continue;
   if(e.kind==='flood'){noise(.085,.25,4800);tone(74,.65,.40,'triangle');tone(125,.20,.16,'sawtooth',.025);noise(1.25,.36,1800,.055);noise(.55,.12,3300,.24);}
   else if(e.kind==='gate-hit'){tone(110,.15,.065*e.strength,'triangle');noise(.08,.06*e.strength,1100);}
   else if(e.source==='gate-repaired'){for(let n=0;n<3;n++)tone([530,670,800][n],.32,.07,'sine',n*.1);}
   else if(e.source==='repair'){tone(310,.10,.055,'triangle');}
   else if(e.kind==='shot'&&shots++<2){noise(.075,e.side===1?.11:.05,e.side===1?3800:1100);tone(e.side===1?620:160,.075,.03);if(e.side===1){const delay=Math.max(0,SHOT_TRAVEL-eventAge(data,e));tone(190,.12,.075,'triangle',delay);noise(.10,.12,2200,delay);}}
   else if(e.source==='cleared'){noise(.13,.10,2600);tone(720,.15,.045);}
   else if(e.kind==='pulse'&&e.source==='washer'&&washes++<2){noise(.34,.055,4800);tone(880,.11,.016,'sine',.08);}
  }
  const pressure=data.pressure>.75&&!data.gate.broken;if(pressure&&!lastPressure){tone(108,.8,.10,'triangle');noise(.4,.035,470);}lastPressure=pressure;
 }
 function playGem(){note(660,.11,.055,'sine');note(990,.16,.045,'triangle',.04);}
 function playSplash(){noise(.18,.14,3400);tone(240,.18,.08,'triangle');note(784,.18,.04,'sine',.05);}
 function playUpgrade(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>note(f,.26,.065,'triangle',i*.065));}
 function playEvolution(lvl=3){const base=392+(lvl-1)*55;[base,base*1.25,base*1.5,base*2].forEach((f,i)=>note(f,.30,.055,'sine',i*.055));}
 return {toggle,update,playGem,playSplash,playUpgrade,playEvolution,get enabled(){return enabled;},async hidden(value){if(context&&enabled&&context.state!=='closed')try{await (value?context.suspend():context.resume());}catch{}},async dispose(){enabled=false;if(context&&context.state!=='closed')await context.close();played.clear();}};
}
