import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// All dimensions are in meters. Every furniture assembly is a separate named group.
// This is the editable source; GLB is a generated interchange file.
export function createRoom() {
  const room = new THREE.Group();
  room.name = 'SOULI_Walnut_Room_v2';
  room.userData = {version: 2, stage: 'modeling-draft', units: 'meters', up: '+Y', front: '+Z'};
  const material = (name, color, roughness = .82, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({color, roughness, metalness}); m.name = name; return m;
  };
  const m = {
    wall:material('warm_plaster','#ad9679'), floor:material('walnut_floor','#493529'),
    wood:material('walnut_furniture','#714a36'), edge:material('walnut_edge','#493125'),
    tan:material('oat_felt','#c8b394'), cream:material('ceramic_cream','#efe3c7',.38),
    rust:material('muted_terracotta','#b75c3f',.72), linen:material('rust_linen','#9c5137',.96),
    teal:material('deep_petrol_fabric','#204856',1), tealDark:material('petrol_piping','#18353f',1),
    ochre:material('mustard_cushion','#d09b49',.93), brass:material('brushed_brass','#af884b',.42,.55),
    dark:material('espresso_charcoal','#2f2d29'), coffee:material('coffee','#41291d',.26),
    leaf:material('plant_sage','#546947'), leafLight:material('plant_light','#758459'),
    soil:material('pot_soil','#423429'), bookBlue:material('book_navy','#334f5d'),
    bookRed:material('book_clay','#9b4e34'), paper:material('book_paper','#e8d4b0'),
    rug:material('woven_sand_rug','#ae9674',1), rugEdge:material('rug_border','#8b745b',1),
  };
  const refs = {};
  function group(name, pos=[0,0,0]) {const g=new THREE.Group();g.name=name;g.position.set(...pos);room.add(g);refs[name]=g;return g;}
  function mesh(parent,name,geo,mat,pos=[0,0,0],rot=[0,0,0]) {
    const o=new THREE.Mesh(geo,mat);o.name=name;o.position.set(...pos);o.rotation.set(...rot);
    o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
  }
  function box(parent,name,size,pos,mat,r=.05,rot=[0,0,0]) {
    return mesh(parent,name,r>0?new RoundedBoxGeometry(...size,2,Math.min(r,...size.map(x=>x*.45))):new THREE.BoxGeometry(...size),mat,pos,rot);
  }
  function cylinder(parent,name,rt,rb,h,pos,mat,rot=[0,0,0],segments=48) {
    return mesh(parent,name,new THREE.CylinderGeometry(rt,rb,h,segments),mat,pos,rot);
  }
  function sphere(parent,name,scale,pos,mat) {const o=mesh(parent,name,new THREE.SphereGeometry(1,24,16),mat,pos);o.scale.set(...scale);return o;}
  function lathe(parent,name,profile,pos,mat,scale=[1,1,1]) {const o=mesh(parent,name,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),64),mat,pos);o.scale.set(...scale);return o;}
  function rod(parent,name,a,b,r,mat) {const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b);const o=cylinder(parent,name,r,r,va.distanceTo(vb),va.clone().add(vb).multiplyScalar(.5).toArray(),mat,[0,0,0],16);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());return o;}
  function anchor(parent,name,pos) {const o=new THREE.Object3D();o.name=name;o.position.set(...pos);o.userData={kind:'interaction_anchor'};parent.add(o);refs[name]=o;return o;}

  const shell=group('Architecture');
  box(shell,'Floor_slab',[11.8,.17,7.2],[0,-.1,1.15],m.floor,.035);
  for(let z=0;z<12;z++) for(let x=0;x<4;x++) {
    const color=new THREE.Color('#573e2e');color.offsetHSL(0,0,((z*7+x*11)%7-3)*.006);
    const plank=material(`walnut_plank_${z}_${x}`,color);
    box(shell,`Floor_plank_${z}_${x}`,[2.92,.035,.589],[-4.4+x*2.935,.002,-2.14+z*.6],plank,.01);
  }
  // Window opening is real geometry, not a painted rectangle.
  box(shell,'Wall_right',[7.3,5.85,.2],[1.95,2.91,-2.5],m.wall,.02);
  box(shell,'Wall_left',[1.25,5.85,.2],[-5.02,2.91,-2.5],m.wall,.02);
  box(shell,'Wall_below_window',[3,1.52,.2],[-2.9,.75,-2.5],m.wall,.02);
  box(shell,'Wall_above_window',[3,.81,.2],[-2.9,5.435,-2.5],m.wall,.02);
  box(shell,'Skirting',[11.7,.15,.1],[0,.1,-2.33],m.edge,.02);
  // Short return walls make the model inspectable while leaving the front open.
  box(shell,'Return_wall_left',[.16,5.85,3.2],[-5.79,2.91,-.97],m.wall,.02);
  box(shell,'Return_wall_right',[.16,5.85,3.2],[5.79,2.91,-.97],m.wall,.02);

  const windowGroup=group('Window',[-2.9,3.275,-2.35]);
  for(const x of [-1.53,1.53])box(windowGroup,'Window_frame_vertical',[.13,3.67,.2],[x,0,0],m.edge,.025);
  for(const y of [-1.79,1.79])box(windowGroup,'Window_frame_horizontal',[3.2,.13,.2],[0,y,0],m.edge,.025);
  box(windowGroup,'Window_mullion',[.095,3.5,.17],[0,0,.05],m.wood,.015);
  box(windowGroup,'Window_crossbar',[3,.095,.17],[0,-.04,.05],m.wood,.015);
  box(windowGroup,'Window_sill',[3.5,.13,.43],[0,-1.86,.11],m.wood,.04);
  const skyMat=new THREE.MeshBasicMaterial({color:'#edd6a2'});skyMat.name='window_sky';
  const sky=mesh(windowGroup,'Sky_backdrop',new THREE.PlaneGeometry(3.02,3.55),skyMat,[0,0,-.15]);sky.castShadow=false;
  const sun=mesh(windowGroup,'Afternoon_sun',new THREE.CircleGeometry(.39,48),new THREE.MeshBasicMaterial({color:'#fff0b7'}),[.67,.84,-.13]);sun.castShadow=false;
  function mountain(name,points,color,z) {const shape=new THREE.Shape();points.forEach((p,i)=>i?shape.lineTo(...p):shape.moveTo(...p));shape.closePath();const o=mesh(windowGroup,name,new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color}),[0,0,z]);o.castShadow=false;}
  mountain('Distant_hills',[[-1.5,-.77],[-.91,-.13],[-.38,-.67],[.4,-.18],[1.5,-.85],[1.5,-1.77],[-1.5,-1.77]],'#aba37c',-.12);
  mountain('Near_hills',[[-1.5,-1.2],[-.7,-.73],[.04,-1.13],[.8,-.7],[1.5,-1.16],[1.5,-1.77],[-1.5,-1.77]],'#748467',-.105);

  const curtains=group('Curtains',[-2.9,3.1,-2.08]);
  rod(curtains,'Curtain_rod',[-1.95,2.05,0],[1.95,2.05,0],.045,m.brass);
  for(const side of [-1,1]) {
    const geometry=new THREE.PlaneGeometry(.66,4.0,28,16),p=geometry.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,Math.cos((x+.33)/.66*Math.PI*8)*.07+.035*Math.sin(y));}
    geometry.computeVertexNormals();
    const cloth=m.linen.clone();cloth.side=THREE.DoubleSide;
    mesh(curtains,side<0?'Curtain_left':'Curtain_right',geometry,cloth,[side*1.68,0,.08]);
  }

  const rug=group('Rug',[.1,.04,1.85]);
  box(rug,'Woven_rug',[5.9,.035,3.6],[0,0,0],m.rug,.1);
  for(const x of [-2.77,2.77])box(rug,'Quiet_border',[.065,.007,3.33],[x,.022,0],m.rugEdge,.008);
  for(const z of [-1.61,1.61])box(rug,'Quiet_border',[5.55,.007,.065],[0,.022,z],m.rugEdge,.008);

  const table=group('Coffee_Table',[0,0,1.75]);
  const tabletop=lathe(table,'Beveled_oval_tabletop',[[0,1.12],[1.96,1.12],[2.06,1.16],[2.09,1.23],[2.055,1.3],[1.98,1.33],[0,1.33]],[0,0,0],m.wood,[1,1,.58]);
  for(const x of [-1.44,1.44])for(const z of [-.58,.58])rod(table,'Splayed_table_leg',[x*1.14,.06,z*1.14],[x,1.18,z],.085,m.edge);
  lathe(table,'Warm_neutral_felt_mat',[[0,0],[.94,0],[.98,.014],[.94,.034],[0,.034]],[0,1.335,.02],m.tan,[1,1,.68]);
  anchor(table,'Soul_on_table',[0,1.375,.17]);
  anchor(table,'Coffee_interaction',[1.27,1.37,.15]);

  function mug(parent,name,pos,scale=1){
    const g=new THREE.Group();g.name=name;g.position.set(...pos);g.scale.setScalar(scale);parent.add(g);refs[name]=g;
    lathe(g,'Ceramic_mug',[[0,0],[.24,0],[.285,.045],[.305,.38],[.31,.48],[.284,.495],[.271,.47],[.268,.105],[0,.105]],[0,.045,0],m.cream);
    const h=mesh(g,'Mug_handle',new THREE.TorusGeometry(.15,.038,12,32),m.cream,[.32,.31,0]);h.scale.set(1,1.2,1);
    cylinder(g,'Coffee_surface',.266,.266,.006,[0,.476,0],m.coffee);
    cylinder(g,'Saucer',.405,.38,.035,[0,.025,0],m.cream);
    return g;
  }
  mug(table,'Coffee_mug',[1.35,1.338,.19],.91);

  const sofa=group('Armchair',[3.27,0,-.52]);
  for(const x of [-.96,.96])for(const z of [-.6,.6])rod(sofa,'Chair_leg',[x*1.08,.06,z*1.09],[x,.55,z],.065,m.edge);
  box(sofa,'Seat_base',[2.57,.44,1.69],[0,.63,0],m.tealDark,.14);
  box(sofa,'Seat_cushion',[1.82,.4,1.42],[0,.95,.13],m.teal,.17);
  box(sofa,'Rounded_back',[2.6,1.89,.49],[0,1.62,-.66],m.teal,.24,[-.06,0,0]);
  for(const x of [-1.08,1.08])box(sofa,'Rounded_arm',[.49,1.0,1.59],[x,1.06,.11],m.teal,.21);
  const cushion=box(sofa,'Ochre_cushion',[.84,.87,.23],[.41,1.43,-.24],m.ochre,.16,[-.14,0,-.14]);
  anchor(sofa,'Sit_anchor',[-.2,1.18,.18]);

  const cabinet=group('Coffee_Cabinet',[-3.46,0,.08]);
  box(cabinet,'Cabinet_body',[2.25,1.24,1.35],[0,.75,0],m.edge,.07);
  box(cabinet,'Cabinet_top',[2.36,.12,1.45],[0,1.42,0],m.wood,.045);
  for(const y of [.49,1.02]){box(cabinet,'Drawer_front',[2.07,.45,.055],[0,y,.713],m.wood,.035);box(cabinet,'Drawer_handle',[.48,.055,.065],[0,y,.773],m.brass,.02)}
  for(const x of [-.92,.92])for(const z of [-.46,.46])box(cabinet,'Cabinet_foot',[.16,.21,.16],[x,.13,z],m.edge,.025);

  const machine=group('Coffee_Machine',[-3.83,1.49,.02]);
  box(machine,'Machine_body',[1.01,1.1,.77],[0,.55,0],m.rust,.14);
  box(machine,'Cream_control_panel',[.8,.41,.04],[0,.84,.406],m.cream,.07);
  cylinder(machine,'Control_knob',.081,.081,.045,[.245,.85,.45],m.dark,[Math.PI/2,0,0]);
  box(machine,'Coffee_recess',[.64,.45,.035],[0,.43,.411],m.dark,.055);
  box(machine,'Coffee_nozzle',[.16,.19,.11],[0,.54,.47],m.dark,.025);
  box(machine,'Drip_tray',[.66,.065,.48],[0,.14,.46],m.brass,.025);
  for(let i=0;i<5;i++)box(machine,'Drip_tray_slot',[.49,.006,.012],[0,.176,.3+i*.07],m.dark,.003);
  const lever=new THREE.Group();lever.name='Machine_lever_pivot';lever.position.set(.56,.74,.02);machine.add(lever);refs.lever=lever;
  rod(lever,'Lever_stem',[0,0,0],[0,.17,.11],.02,m.brass);sphere(lever,'Lever_grip',[.045,.075,.045],[0,.21,.14],m.dark);
  anchor(machine,'Pour_anchor',[0,.44,.51]);
  mug(cabinet,'Spare_mug',[.59,1.485,.23],.65);

  const shelf=group('Wall_Shelf',[2.37,3.99,-2.04]);
  box(shelf,'Shelf_board',[3.03,.13,.48],[0,0,0],m.wood,.035);
  for(const x of [-1.15,1.15])box(shelf,'Shelf_bracket',[.095,.36,.31],[x,-.22,-.025],m.edge,.02);
  const books=[[-1.13,.63,.21,m.paper,0],[-.88,.55,.18,m.bookBlue,0],[-.65,.78,.24,m.bookRed,0],[-.32,.6,.2,m.leaf,.18]];
  books.forEach(([x,h,w,mat,angle],i)=>{box(shelf,`Book_${i}`,[w,h,.29],[x,h/2+.07,0],mat,.013,[0,0,angle]);box(shelf,`Book_spine_line_${i}`,[w*.7,.016,.004],[x,h*.78,.151],m.paper,.002)});
  const plant=new THREE.Group();plant.name='Potted_Plant';plant.position.set(.98,.073,0);shelf.add(plant);refs.Potted_Plant=plant;
  lathe(plant,'Terracotta_pot',[[0,0],[.21,0],[.29,.41],[.31,.44],[.285,.465],[.262,.43],[.19,.07],[0,.07]],[0,0,0],m.rust);
  cylinder(plant,'Plant_soil',.261,.261,.015,[0,.4,0],m.soil);
  for(let i=0;i<9;i++){
    const angle=i*2.399, r=.19+(i%3)*.065,y=.69+(i%3)*.08;
    const px=Math.cos(angle)*r,pz=Math.sin(angle)*r;
    rod(plant,'Plant_stem',[0,.39,0],[px,y,pz],.009,m.leaf);
    const leaf=sphere(plant,`Leaf_${i}`,[.12,.205,.045],[px,y+.02,pz],i%2?m.leaf:m.leafLight);leaf.rotation.set(.45,angle,-Math.cos(angle)*.7);
  }
  anchor(plant,'Water_anchor',[0,.46,0]);

  const lamp=group('Pendant_Lamp',[4.38,3.65,-.62]);
  cylinder(lamp,'Lamp_cord',.018,.018,1.75,[0,1.325,0],m.dark,[0,0,0],12);
  cylinder(lamp,'Ceiling_rose',.12,.12,.055,[0,2.17,0],m.dark);
  cylinder(lamp,'Lamp_cap',.09,.09,.18,[0,.45,0],m.rust);
  lathe(lamp,'Lamp_shade',[[.11,.37],[.17,.32],[.24,.22],[.5,.02],[.56,0],[.53,-.032],[.49,-.02],[.22,.19],[.14,.3]].reverse(),[0,0,0],m.rust);
  const lampInner=m.cream.clone();lampInner.name='lamp_inner_glow';lampInner.emissive=new THREE.Color('#ffcc7b');lampInner.emissiveIntensity=.7;
  cylinder(lamp,'Lamp_diffuser',.48,.48,.013,[0,-.026,0],lampInner);
  anchor(lamp,'Light_anchor',[0,-.1,0]);

  const art=group('Wall_Art',[.02,3.82,-2.23]);
  box(art,'Art_frame',[1.44,1.74,.1],[0,0,0],m.edge,.035);
  box(art,'Art_paper',[1.25,1.54,.016],[0,0,.06],m.paper,.004);
  const graphic=new THREE.Shape();graphic.moveTo(-.43,-.4);graphic.lineTo(-.43,-.02);graphic.lineTo(-.12,.39);graphic.lineTo(.14,-.04);graphic.lineTo(.42,.23);graphic.lineTo(.42,-.4);graphic.closePath();
  mesh(art,'Art_mountains',new THREE.ShapeGeometry(graphic),m.rust,[0,0,.073]);
  mesh(art,'Art_sun',new THREE.CircleGeometry(.15,32),m.ochre,[.29,.47,.074]);

  // Store reusable gameplay contact points, not ownership or wallet information.
  room.userData.interactionAnchors=['Soul_on_table','Coffee_interaction','Sit_anchor','Pour_anchor','Water_anchor','Light_anchor'];
  return {room, refs, materials:m};
}
