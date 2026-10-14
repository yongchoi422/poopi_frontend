// Public sample data only. Even though source matches the reader's schema,
// callers must pass isFixture: true in the preview state.
export function walletFixture(samples){return samples.slice(0,4).map((s,i)=>({svg:s.svg,seed:String(101+i),extra:String(10+i),level:s.dot?1:3,block:'0',dynamic:i===0,owner:'0x0000000000000000000000000000000000000001',source:'wallet'}));}
export const vectorFixture={svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#83a8cd"/><path d="M7 13 L10 16 L17 8" fill="none" stroke="#243a51" stroke-width="2"/></svg>',name:'Safe vector preview',source:'sample'};
