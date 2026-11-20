/* Original Konya architecture, using the Antalya series' instanced scenery pipeline. */
window.buildKonyaWorld = function(T,index,random,texture,collider) {
  const scene=new T.Scene(), sky=['#c3d9dc','#dfd2b5','#b9cdd0'][index];
  scene.background=new T.Color(sky);scene.fog=new T.FogExp2(sky,.005);
  const camera=new T.PerspectiveCamera(68,1,.07,350);camera.rotation.order='YXZ';
  const sun=new T.DirectionalLight('#ffe4b5',2.6);sun.position.set(-24,48,26);sun.target.position.set(0,0,-5);
  Object.assign(sun.shadow.camera,{left:-44,right:44,top:53,bottom:-53,near:1,far:130});sun.shadow.normalBias=.035;
  scene.add(sun,sun.target,new T.HemisphereLight('#e2eff6','#716048',index===2?1.85:2));
  const groundTex=texture('earth');groundTex.repeat.set(32,32);
  const materials={
    stone:new T.MeshStandardMaterial({map:texture('stone'),roughness:.86}),
    earth:new T.MeshStandardMaterial({map:groundTex,roughness:1}),
    plaster:new T.MeshStandardMaterial({color:'#e5d9bd',map:texture('stone'),roughness:1}),
    wood:new T.MeshStandardMaterial({color:'#70523a',roughness:.95}),
    metal:new T.MeshStandardMaterial({color:'#c9a96a',metalness:.62,roughness:.4}),
    leaf:new T.MeshStandardMaterial({roughness:.95}),
    roof:new T.MeshStandardMaterial({color:'#827d6f',roughness:.73}),
    turquoise:new T.MeshStandardMaterial({color:'#149c98',roughness:.28,metalness:.18}),
    dark:new T.MeshStandardMaterial({color:'#14323a',roughness:.8}),
    water:new T.MeshStandardMaterial({color:'#528e91',metalness:.3,roughness:.2})
  };
  materials.stone.bumpMap=materials.stone.map;materials.stone.bumpScale=.045;
  materials.plaster.bumpMap=materials.plaster.map;materials.plaster.bumpScale=.025;
  const box=new T.BoxGeometry(),cyl=new T.CylinderGeometry(1,1,1,20),ball=new T.SphereGeometry(1,20,12),rock=new T.IcosahedronGeometry(1,1);
  const cone=new T.ConeGeometry(1,1,20),batches=new Map(),dummy=new T.Object3D(),color=new T.Color();
  const ash=['#edddc2','#d5c7ad','#c8b99d','#e3d2b5','#d7c9b1'];
  const pick=a=>a[Math.floor(random()*a.length)];
  function part(g,m,x,y,z,w,h,d,tint='#ffffff',ry=0,rz=0){
    const key=g.id+':'+m.id;if(!batches.has(key))batches.set(key,{g,m,items:[]});
    dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(0,ry,rz);dummy.updateMatrix();
    batches.get(key).items.push([dummy.matrix.clone(),tint]);
  }
  const block=(x,y,z,w,h,d,tint=pick(ash),m=materials.stone,ry=0)=>part(box,m,x,y,z,w,h,d,tint,ry);
  function mesh(g,m,x,y,z){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;scene.add(o);return o;}
  function wall(x,z,w,d,h=4,base=0,solid=true){
    const along=w>d,len=Math.max(w,d),n=Math.ceil(len/1.4),rows=Math.ceil(h/.48);
    for(let r=0;r<rows;r++)for(let i=0;i<n+(r%2);i++){
      const a=Math.max(0,(i-(r%2)*.5)/n),b=Math.min(1,(i+1-(r%2)*.5)/n),p=(a+b-1)*len/2;
      if(b>a)block(x+(along?p:0),base+(r+.5)*h/rows,z+(along?0:p),along?(b-a)*len-.018:w,h/rows-.018,along?d:(b-a)*len-.018);
    }
    if(solid)collider(x,z,w/2,d/2);
  }
  function dome(x,y,z,r,h,mat=materials.roof){mesh(new T.SphereGeometry(r,32,16,0,Math.PI*2,0,Math.PI/2),mat,x,y,z).scale.y=h/r;}
  function arch(x,z,w,h,depth,mat=materials.stone,base=0){
    const spring=h-w/2;
    for(const s of [-1,1])block(x+s*(w/2+.22),base+spring/2,z,.44,spring,depth,'#e5d6bd',mat);
    for(let i=0;i<20;i++){let a=(i+.5)*Math.PI/20,r=w/2+.22;part(box,mat,x+Math.cos(a)*r,base+spring+Math.sin(a)*r,z,.46,r*Math.PI/20+.025,depth,'#efe2cc',0,a);}
  }
  function pillar(x,z,h,r=.16,base=0){
    block(x,base+.12,z,r*3,.24,r*3);part(cyl,materials.stone,x,base+h/2,z,r,h,r,'#f1e5cf');block(x,base+h,z,r*3,.22,r*3);
  }
  function tree(x,z,scale=1){
    part(cyl,materials.wood,x,1.5*scale,z,.17*scale,3*scale,.17*scale);
    for(let i=0;i<8;i++){let a=i*2.4;part(rock,materials.leaf,x+Math.cos(a)*scale,3.1*scale+random(),z+Math.sin(a)*scale,1.4*scale,.95*scale,1.3*scale,pick(['#455940','#657751','#7f8c5c','#526a48']),a);}
    collider(x,z,.25,.25,.25);
  }
  function urn(x,y,z,r=.35){
    part(ball,materials.plaster,x,y+r*.65,z,r,r*.8,r,'#b58c61');part(cyl,materials.plaster,x,y+r*1.35,z,r*.48,r*.35,r*.48,'#c29a6e');
    part(cyl,materials.dark,x,y+r*1.54,z,r*.37,.015,r*.37);
  }
  function label(text,x,y,z,width=2,angle=0){
    const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#18352e';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#cfad70';ctx.lineWidth=5;ctx.strokeRect(5,5,502,118);ctx.fillStyle='#f5ead4';ctx.font='bold 25px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,75,475);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
    // A DoubleSide plane mirrors its lettering when viewed from behind.
    // Give each side its own outward-facing surface with normal UVs instead.
    const sign=new T.Group();sign.position.set(x,y,z);sign.rotation.y=angle;
    sign.userData.readableSign=true;
    const geometry=new T.PlaneGeometry(width,width/4);
    const material=new T.MeshBasicMaterial({map:tex,side:T.FrontSide});
    for(const side of [1,-1]){
      const face=new T.Mesh(geometry,material);face.position.z=side*.012;
      face.rotation.y=side===1?0:Math.PI;sign.add(face);
    }
    scene.add(sign);return sign;
  }
  function tileTexture(){
    const c=document.createElement('canvas');c.width=c.height=512;const p=c.getContext('2d');p.fillStyle='#132c45';p.fillRect(0,0,512,512);
    for(let x=0;x<=512;x+=128)for(let y=0;y<=512;y+=128){
      p.strokeStyle='#d0b981';p.lineWidth=3;p.fillStyle='#168c99';p.beginPath();
      for(let i=0;i<16;i++){const a=i*Math.PI/8,r=i%2?30:58;p.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}p.closePath();p.fill();p.stroke();
      p.fillStyle='#0c1e2d';p.beginPath();p.arc(x,y,12,0,Math.PI*2);p.fill();
    }
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(3,1);return tex;
  }
  materials.tile=new T.MeshStandardMaterial({map:tileTexture(),roughness:.34,metalness:.08});
  mesh(new T.PlaneGeometry(600,600),materials.earth,0,-.08,-20).rotation.x=-Math.PI/2;
  const horizon=new T.PlaneGeometry(520,520,90,90);horizon.rotateX(-Math.PI/2);
  const hp=horizon.attributes.position;
  for(let i=0;i<hp.count;i++){const x=hp.getX(i),z=hp.getZ(i),edge=Math.max(0,Math.hypot(x,z)-62)/70;hp.setY(i,-.18+Math.min(1,edge)*(4+8*Math.sin(x*.026+z*.014)**2+9*Math.sin(z*.019)**2));}
  horizon.computeVertexNormals();mesh(horizon,new T.MeshStandardMaterial({color:index===1?'#a99e7b':'#929980',roughness:1}),0,0,-10);
  // Site boundary, paths and scenery are visibly bounded, never invisible mazes.
  if(index!==1){
    wall(-26,-5,1,65,1.1);wall(26,-5,1,65,1.1);wall(0,-37,52,1,1.1);wall(-15,27,22,1,1.1);wall(15,27,22,1,1.1);
    for(let x=-25;x<26;x+=2)for(let z=-36;z<27;z+=2)block(x,-.015,z,1.96,.12,1.96,pick(['#c5bba5','#d2c6ae','#bcb49f']),materials.stone);
    for(const x of [-23,23])for(const z of [20,1,-20,-31])tree(x,z,.9+random()*.4);
    for(let i=0;i<130;i++){let x=(i%2?1:-1)*(21+random()*3),z=25-random()*59;part(rock,materials.leaf,x,.15,z,.25,.24,.3,pick(['#789062','#657c4a','#9a9c69']));}
  }
  if(index===0){
    // Main tomb complex sits east of the open courtyard; cells line west and north.
    wall(14,-11,16,16,5.2); // replace solid footprint with exterior masses; tomb is respectfully observed outside.
    block(14,5.25,-11,16.5,.25,16.5,'#b8ad98');
    for(const x of [10,18])for(const z of [-7,-15]){part(cyl,materials.roof,x,5.5,z,3.7,.6,3.7);dome(x,5.8,z,3.75,2.8);}
    block(14,7,-16,6.5,4,6.5,'#eee0c2');
    part(cyl,materials.turquoise,14,10,-16,3.3,3,3.3);
    for(let i=0;i<24;i++){let a=i*Math.PI*2/24;part(cyl,materials.turquoise,14+Math.cos(a)*3.12,10.2,-16+Math.sin(a)*3.12,.26,3.5,.26,i%2?'#8dc5ab':'#ffffff');}
    part(cone,materials.turquoise,14,14,-16,3.4,5,3.4);part(ball,materials.metal,14,16.8,-16,.18,.24,.18);part(cyl,materials.metal,14,17.3,-16,.045,.8,.045);
    for(let i=0;i<24;i++){let a=i*Math.PI/12;const curve=[];for(let j=0;j<=12;j++){let t=j/12;curve.push(new T.Vector3(14+Math.cos(a)*3.43*(1-t),11.5+5*t,-16+Math.sin(a)*3.43*(1-t)));}mesh(new T.TubeGeometry(new T.CatmullRomCurve3(curve),12,.035,4,false),materials.metal,0,0,0);}
    for(const z of [-6,-11,-16]){arch(6.05,z,2.1,3.3,.18); // decorative facade viewed along the courtyard
      const o=mesh(new T.PlaneGeometry(1.7,2.3),materials.dark,5.98,1.8,z);o.rotation.y=-Math.PI/2;}
    // Museum veranda and entry steps.
    for(let x=8;x<=20;x+=4){pillar(x,-2,3.8,.16);arch(x,-2,3.55,4,.25);}
    block(14,4.3,-2,16.5,.35,2.5);label('MEVLÂNA MÜZESİ',14,3,-1.82,4);
    for(let i=0;i<3;i++)block(14,.08+i*.1,-.4-i*.35,6,.16,.4);
    // Cells are modelled as individual domed rooms with carved doors.
    for(let z=13;z>=-26;z-=6){wall(-20,z,4.8,5.7,3.1);dome(-20,3.1,z,2.5,1.7);const door=mesh(new T.PlaneGeometry(1.15,2.1),materials.wood,-17.58,1.05,z);door.rotation.y=Math.PI/2;label('DERVİŞ HÜCRELERİ',-17.5,2.65,z,1.8,Math.PI/2);}
    for(let x=-14;x<=4;x+=6){wall(x,-30,5.7,4,3.1);dome(x,3.1,-30,2.6,1.7);block(x,1,-27.97,1.2,2,.05,'#796448',materials.wood);}
    // Covered fountain with eight columns and scalloped water basin.
    part(cyl,materials.stone,-7,.4,-5,2,.8,2);part(cyl,materials.water,-7,.83,-5,1.7,.04,1.7);
    collider(-7,-5,2,2,2);
    for(let i=0;i<8;i++){let a=i*Math.PI/4;pillar(-7+Math.cos(a)*2.6,-5+Math.sin(a)*2.6,3.4,.11);}
    part(cyl,materials.roof,-7,3.65,-5,3.2,.28,3.2);dome(-7,3.8,-5,3.2,1.6);part(ball,materials.metal,-7,5.55,-5,.1,.2,.1);
    // Small garden beds, roses and benches leave the mission routes clear.
    for(const [x,z] of [[-8,15],[-9,-17]]){block(x,.18,z,8,.32,2.8,'#b5a184');block(x,.36,z,7.6,.08,2.4,'#596d46',materials.leaf);collider(x,z,4,1.4);for(let i=0;i<24;i++){part(ball,materials.leaf,x-3.5+random()*7,.65,z-1+random()*2,.18,.27,.18,'#4e703d');part(ball,materials.leaf,x-3.5+random()*7,.82,z-1+random()*2,.08,.08,.08,pick(['#ba7775','#d9ac9e','#a45665']));}}
    for(const z of [8,-23]){block(22,.55,z,1.3,.12,3,'#917253',materials.wood);for(const a of [-1,1])block(22,.25,z+a,1,.5,.18);}
    // Ney and kudüm display: a learning prop, not an attributed museum artefact.
    block(4,.65,-18,2,1.3,1);part(cyl,materials.wood,3.7,1.6,-18,.045,.9,.045,'#e0c697',0,.28);part(cyl,materials.wood,4.4,1.5,-18,.24,.3,.24);label('NEY • KUDÜM | TEMSİL',4,1.12,-17.48,1.8);
    part(cyl,materials.stone,24,6,-14,.58,12,.58);part(cyl,materials.stone,24,10.7,-14,1,.3,1);part(cone,materials.roof,24,13.3,-14,.8,3,.8);
    label('DERVİŞÂN KAPISI',0,2.6,26,3.6);
  } else if(index===1){
    // Roof-access settlement. Flat adjoining roofs form the traversable circulation layer.
    const mud=new T.MeshStandardMaterial({map:texture('earth'),color:'#cfab7f',roughness:1});
    const roof=new T.MeshStandardMaterial({map:texture('stone'),color:'#d5bd98',roughness:1});
    for(let x=-15;x<=15;x+=6)for(let z=13;z>=-23;z-=6){
      const shade=pick(['#e7d6b8','#cdb492','#dfc5a0']);
      // Hollow houses with visible domestic interiors beneath genuine roof openings.
      for(const s of [-1,1]){block(x+s*2.85,1.55,z,.28,3.1,6,shade,mud);block(x,1.55,z+s*2.85,6,3.1,.28,shade,mud);}
      block(x,.015,z,5.8,.1,5.8,'#bda17a',mud);
      block(x-1.075,3.12,z,3.85,.16,6,'#e5d2af',roof);
      block(x+2.675,3.12,z,.65,.16,6,'#d8c4a2',roof);
      block(x+1.6,3.12,z-1.2125,1.5,.16,3.575,'#dfc9a7',roof);
      block(x+1.6,3.12,z+2.5625,1.5,.16,.875,'#d1bc98',roof);
      for(const dx of [-.35,.35])block(x+1.6+dx,1.95,z+1.4,.065,3.9,.075,'#c9ad7b',materials.wood);
      for(let k=0;k<11;k++)block(x+1.6,.3+k*.34,z+1.4,.76,.065,.075,'#d3b785',materials.wood);
      block(x-1.25,.25,z-1.8,2.3,.5,1.4,'#d1b48c',mud);urn(x+.9,0,z-.8,.4);
      part(ball,mud,x-1.6,.22,z+1.8,.6,.22,.5,'#9c7251');
      if(random()<.45){urn(x-1,3.2,z-1);urn(x-1.65,3.2,z-1,.22);}
      // Irregular work mats and bundles give roofs distinct domestic uses.
      if(random()<.4){block(x-.7,3.22,z-.6,1.5,.025,2,'#b89c6a',materials.wood,.12);for(let k=0;k<8;k++)block(x-1.4+k*.2,3.245,z-.6,.025,.02,1.95,'#d6c08d',materials.wood,.12);}
      if(random()<.2){for(let k=0;k<7;k++)part(cyl,materials.wood,x-.6+k*.12,3.3,z-1.6,.05,1.4,.05,'#ceb88a',.2,Math.PI/2);}
      // discoloured plaster patches and wall beams make facades irregular
      for(let j=0;j<4;j++)block(x-2+j*1.3,1.4,z+2.98,.75,.7+random(),.025,'#ceb58d',mud);
    }
    // Walkable modern access ramp; explicitly distinct from the reconstructed houses.
    const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute([-3,0,24,3,0,24,-3,3.2,16,3,0,24,3,3.2,16,-3,3.2,16],3));rg.computeVertexNormals();mesh(rg,materials.wood,0,0,0);
    for(let i=0;i<=16;i++)block(0,i*.2,24-i*.5,6,.04,.12,'#9a825f',materials.wood);
    for(const x of [-3,3]){for(let i=0;i<=8;i++)block(x,i*.4+.5,24-i, .1,1,.1,'#725c43',materials.wood);}
    label('EĞİTİM CANLANDIRMASI • DAM ROTASI',0,1.7,24,4);
    // Cutaway household exhibits at roof level: no medieval furniture or columns.
    for(const [x,z] of [[10,0],[14,-10],[-13,-9]]){
      block(x,3.3,z,3.5,.2,3,'#c4ab85',mud);block(x,4.2,z-1.5,3.5,1.8,.22,'#ddc8a7',mud);
      block(x-1.65,3.85,z,.2,1.1,3,'#cdb793',mud);
      if(x===10){part(ball,mud,x,3.6,z,.65,.4,.55,'#b2825b');block(x,3.6,z+.5,.4,.3,.06,'#302b27',materials.dark);urn(x+1,3.4,z,.3);}
      else if(x===14){for(let i=0;i<3;i++){block(x-1+i,3.65,z,.8,.7,.8,'#bba17a',mud);block(x-1+i,4.01,z,.6,.02,.6,'#9b784a',materials.wood);}}
      else {for(let i=0;i<9;i++){block(x-1.3+i*.3,4.2+(i%2)*.3,z-1.37,.16,.5,.02,'#aa5941',materials.wood,.3);}}
    }
    // Interior accessible via a ladder transfer; roof remains the main route.
    // A separate cutaway room avoids dropping players through geometry.
    block(23,-.01,-8,6,.15,6,'#dbc4a2',mud);
    block(23,1.5,-11,6,3,.3,'#eadbc0',materials.plaster);block(26,1.5,-8,.3,3,6,'#e2ceb0',materials.plaster);block(20,1.5,-8,.3,3,6,'#dfc8a6',materials.plaster);
    for(const x of [20.3,25.7])block(x,1.45,-10.65,.17,2.9,.19,'#9b7954',materials.wood);
    for(let i=0;i<9;i++)block(21.1+i*.42,2.25+(i%2)*.14,-10.83,.22,.32,.025,'#af634a',materials.wood,.3);
    block(23,.45,-9.9,4,.9,1.1,'#d2bb96',mud);part(ball,mud,21,.3,-6,.55,.3,.55,'#a67f53');urn(24,0,-6);label('İÇ MEKÂN • E İLE DAMA DÖN',23,1.7,-10.8,3);
    for(let i=0;i<5;i++)block(22.4,.3+i*.45,-5.2,.9,.06,.09,'#8f704f',materials.wood);for(const x of [22,22.8])block(x,1.4,-5.2,.08,2.8,.1,'#8f704f',materials.wood);
    // Archaeology strata in a freestanding didactic display.
    for(let i=0;i<6;i++)block(-13,3.5+i*.28,-21,2.7,.26,.45,pick(['#bd9971','#a98661','#ddbd95']));
    for(let i=0;i<110;i++){let x=(random()-.5)*100,z=(random()-.5)*90;if(Math.abs(x)<22&&z<27&&z>-30)continue;part(rock,materials.leaf,x,.18,z,.35,.35,.3,'#a29463');}
  } else {
    // Eastern entrance is mapped to the player's south for a compact walkable plan.
    wall(-9,5,12,1.2,6);wall(9,5,12,1.2,6);wall(-15,-10,1.1,31,6);wall(15,-10,1.1,31,6);wall(0,-25,30,1.1,6);
    // Portal: alternating marble, deeply recessed geometric frames and pointed arch.
    for(let layer=0;layer<5;layer++){
      let w=10-layer*.85,h=8.8-layer*.57,z=6.1+layer*.14;
      for(const s of [-1,1])block(s*w/2,h/2,z,.34,h,.6,layer%2?'#809795':'#eee5d1');
      block(0,h,z,w,.34,.6,layer%2?'#809795':'#eee5d1');
      for(let y=.4;y<h-.4;y+=.48)for(const s of [-1,1])part(box,materials.stone,s*w/2,y,z+.34,.24,.24,.08,'#c5b89e',0,Math.PI/4);
    }
    // Actual opening remains wide and collision-free.
    arch(0,7.2,5.2,6.8,1.1);block(0,7.4,6.1,5,.75,.8,'#ded2b9');
    for(let r=0;r<5;r++)for(let c=0;c<11-r;c++)part(cone,materials.stone,(c-(10-r)/2)*.38,5.1+r*.31,7.2-r*.18,.23,.28,.23,'#d7cbb3',0,Math.PI);
    label('KARATAY MEDRESESİ • 1251',0,7.4,6.58,4.5);
    // Central covered court: tiled drum, dome, circular skylight, central pool.
    const dg=new T.SphereGeometry(12,48,24,0,Math.PI*2,.10,Math.PI/2-.10);
    const dm=materials.tile.clone();dm.map=materials.tile.map.clone();dm.map.repeat.set(12,4);dm.side=T.DoubleSide;const d=mesh(dg,dm,0,6,-10);d.scale.y=.68;
    const ring=mesh(new T.TorusGeometry(1.2,.13,8,32),materials.stone,0,14.1,-10);ring.rotation.x=Math.PI/2;
    const light=new T.PointLight('#d1eff2',28,35,1.4);light.position.set(0,10,-10);scene.add(light);
    // Upper corner masonry, lower walls and tile panels.
    const wallTile=materials.tile.clone();wallTile.map=materials.tile.map.clone();wallTile.map.repeat.set(1,1.2);
    for(const x of [-14.35,14.35])for(let z=1;z>=-22;z-=5.7){
      block(x,2.8,z,.12,4.8,4.7,'#ffffff',wallTile);
      pillar(x*.86,z,5.8,.22);
    }
    for(let x=-12;x<=12;x+=4){block(x,3,-24.37,3.8,5.5,.12,'#ffffff',wallTile);}
    arch(0,-21.5,7.4,6.9,.5);block(0,1,-24,7,.25,2.1,'#a68b66');
    // East/west study cells with generous entrances.
    for(const s of [-1,1])for(const z of [-3,-17]){arch(s*10,z,3,4.8,.45);block(s*11,.8,z-1.2,2,.16,1.2,'#846546',materials.wood);for(const dx of [-.7,.7])block(s*11+dx,.4,z-1.2,.1,.8,.1,'#70543c',materials.wood);}
    part(cyl,materials.stone,0,.16,-10,2.2,.32,2.2);part(cyl,materials.water,0,.34,-10,1.9,.025,1.9);collider(0,-10,2.2,2.2,2.2);
    // Mosaic workshop display and a reading desk, each clearly educational.
    block(-7,.8,-18,2.6,.14,1.4,'#8f704e',materials.wood);block(-7,.9,-18,2.3,.07,1.1,'#ffffff',materials.tile);
    label('ÇİNİ • EĞİTİM ÖRNEĞİ',-7,1.5,-18,2.6);
    block(10,.8,-21,2.6,.16,1.2,'#8b6748',materials.wood);block(10,.94,-21,.8,.1,.6,'#e9dbb7');
    label('KAPALI AVLULU MEDRESE',0,3.6,4.34,4,0);
  }
  // Additional architectural and household details remain clear of walking routes.
  if(index===0){
    for(const x of [9,14,19]){
      block(x,2.15,-2.98,1.7,2.4,.08,'#264344',materials.dark);
      for(const dx of [-.92,.92])block(x+dx,2.15,-2.86,.16,2.7,.18,'#e6d5b7');
      for(let k=0;k<5;k++)block(x-.65+k*.325,2.15,-2.8,.035,2.25,.05,'#af9159',materials.metal);
      for(let k=0;k<4;k++)block(x,1.35+k*.5,-2.79,1.45,.035,.05,'#af9159',materials.metal);
    }
    for(let z=13;z>=-26;z-=6){
      for(const dz of [-.42,.42])block(-17.54,1.1,z+dz,.035,1.65,.055,'#d2ad77',materials.wood);
      for(const y of [.45,1.05,1.65])block(-17.52,y,z,.04,.055,.92,'#b59565',materials.wood);
      part(ball,materials.metal,-17.48,1.05,z+.15,.045,.045,.045);
    }
    for(let i=0;i<8;i++){const a=i*Math.PI/4;
      part(cyl,materials.metal,-7+Math.cos(a)*1.97,.54,-5+Math.sin(a)*1.97,.055,.18,.055,'#cbb279',0,Math.PI/2);
    }
  }else if(index===1){
    // Woven storage baskets and a grinding stone in the cutaway household.
    for(const [x,z,r] of [[24.6,-8.5,.35],[24,-9,.26]]){
      part(cyl,materials.wood,x,.3,z,r,.6,r,'#bf9e68');
      for(let k=0;k<8;k++){const ring=mesh(new T.TorusGeometry(r+.01,.018,5,18),materials.wood,x,.08+k*.07,z);ring.rotation.x=Math.PI/2;}
      part(cyl,materials.dark,x,.605,z,r*.84,.012,r*.84);
    }
    part(rock,materials.stone,21.2,.12,-8,.55,.14,.36,'#96876f');
    part(rock,materials.stone,21.2,.28,-8,.24,.11,.14,'#afa28a');
    for(let k=0;k<14;k++)block(22.1+k*.12,.93,-9.9,.025,.025,.85,'#b18b5b',materials.wood);
  }else{
    // Glazed border bands and alternating carved rosettes frame the tiled walls.
    for(const x of [-14.22,14.22])for(const y of [.45,5.25])block(x,y,-10,.10,.18,27,'#40a9ac',materials.turquoise);
    for(let x=-12;x<=12;x+=2){
      part(box,materials.turquoise,x,5.6,-24.22,.28,.28,.06,'#8bc7bf',0,Math.PI/4);
      block(x,.48,-24.2,1.95,.18,.07,'#329898',materials.turquoise);
    }
    for(const x of [-4.8,4.8])for(let y=1;y<8;y+=1.1){
      const rosette=mesh(new T.TorusGeometry(.13,.035,6,8),materials.stone,x,y,6.55);
      rosette.rotation.z=Math.PI/8;
    }
    for(let i=0;i<4;i++)block(9.4+i*.35,.98,-21,.27,.04,.48,pick(['#e6d5ad','#c6b28a','#ded0b3']));
  }
  // Every investigation station is physically identifiable as a modern reading stand.
  const base=index===1?3.2:0;
  for(const site of KONYA.chapters[index].sites){
    part(cyl,materials.metal,site.x,.52+base,site.z,.045,1.04,.045);block(site.x,1.05+base,site.z,.8,.08,.5,'#234b40',materials.dark);
    label(site.tr[0],site.x,1.4+base,site.z,1.6);
    for(const clue of site.clues){part(cyl,materials.metal,clue.x,base+.3,clue.z,.035,.6,.035);part(box,materials.metal,clue.x,base+.65,clue.z,.14,.14,.05,'#e3b976',0,Math.PI/4);}
  }
  for(const {g,m,items} of batches.values()){
    const inst=new T.InstancedMesh(g,m,items.length);items.forEach(([matrix,tint],i)=>{inst.setMatrixAt(i,matrix);inst.setColorAt(i,color.set(tint));});inst.castShadow=true;inst.receiveShadow=true;inst.computeBoundingSphere();scene.add(inst);
  }
  return {scene,camera,sun};
};
