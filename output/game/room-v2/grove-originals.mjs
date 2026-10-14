export function prepareOriginal(item){
  const doc=new DOMParser().parseFromString(item.svg,'image/svg+xml'),svg=doc.documentElement,children=[...svg.children];
  const shape=(el,x,y,w,h)=>el?.localName==='rect'&&['x','y','width','height'].every((key,i)=>+el.getAttribute(key)===[x,y,w,h][i]);
  const one=shape(children[1],0,17,24,7),two=shape(children[1],0,17,24,8)&&shape(children[2],0,17,24,1)&&shape(children[3],0,18,24,1)&&children[1].getAttribute('fill')===children[2].getAttribute('fill')&&children[2].getAttribute('fill')===children[3].getAttribute('fill');
  if(shape(children[0],0,0,24,24)&&(one||two))children.slice(0,one?2:4).forEach(el=>el.remove());
  const rectangles=[...svg.children].map(el=>({x:+el.getAttribute('x'),y:+el.getAttribute('y'),width:+el.getAttribute('width'),height:+el.getAttribute('height'),fill:el.getAttribute('fill')}));
  const x=Math.min(...rectangles.map(r=>r.x)),y=Math.min(...rectangles.map(r=>r.y)),w=Math.max(...rectangles.map(r=>r.x+r.width))-x,h=Math.max(...rectangles.map(r=>r.y+r.height))-y;
  const frame=item.dot?[x+w/2-4,y+h-8,8,8]:[x-1,y-1,w+2,h+1];
  svg.setAttribute('viewBox',frame.join(' '));svg.setAttribute('shape-rendering','crispEdges');
  return {...item,rectangles,frame,markup:new XMLSerializer().serializeToString(svg)};
}
