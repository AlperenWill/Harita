/* KONYA — continuation of Antalya / Lost Records. Reuses the original controls,
collision grid, renderer lifecycle, mission state, settings, save and journal flow. */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const touch=matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints>0;
  const saveNamespace='konya:v1:';
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(saveNamespace+key))??fallback;}catch{return fallback;}};
  const write=(key,value)=>{try{localStorage.setItem(saveNamespace+key,JSON.stringify(value));}catch{}};
  const prefs={language:'tr',graphics:'auto',sound:true,musicVolume:0,effectsVolume:0,...read('settings',{})};
  prefs.language='tr';
  if(!['auto','low','medium','high'].includes(prefs.graphics))prefs.graphics='auto';
  const copy={series:"TARİHÎ KONYA'NIN İZİNDE",start:'Yeni keşif',resume:'Keşfe devam et',levels:'Mekân seçimi',settings:'Ayarlar',
  back:'Geri',menu:'Ana menü',pause:'Keşif duraklatıldı',quiz:'Bilgi sınavı',complete:'Bölümü tamamla',
  controls:'WASD: yürü · Fare: bak · Shift: koş · E: incele · J: günlük · Esc: duraklat',mobile:'Sol çubuk: yürü · Sağ tarafı sürükle: bak · Araştır: etkileşim · Koş: hızlan',
  graphics:'Grafik kalitesi',sound:'Ses sistemi',auto:'Uyarlanabilir',low:'Düşük',medium:'Orta',high:'Yüksek',on:'Açık',off:'Kapalı',
  inspect:'İncele',sprint:'Koş',journal:'Tarihî günlük',next:'Sonraki soru',retry:'Tekrar dene',return:'Keşfe dön',
  wrong:'Notları tekrar incele',correct:'Doğru!',source:'Tarihî kaynak ↗',restart:'Mevcut keşif kaydı silinsin mi?',cancel:'Vazgeç',
  unavailable:'3B oyun başlatılamadı. WebGL destekli güncel bir tarayıcı kullanın. ZIP dosyasını tamamen çıkardığınızdan emin olun.',
  lost:'Grafik bağlantısı kesildi. Sayfayı yenileyerek kaydedilen keşfe devam edebilirsin.',reload:'Yenile',pauseLabel:'Duraklat'};
  const t=key=>copy[key]||key;
  const pair=(tr)=>tr;
  const label=site=>site.tr[0];
  const chapters=KONYA.chapters;
  const start={x:0,z:24,yaw:0,pitch:0,found:[],observed:[],accepted:[],legacy:[],complete:false,room:false};
  let campaign=read('campaign',null);
  if(!campaign || campaign.version!==3 || !Array.isArray(campaign.chapters))campaign={version:3,chapter:0,unlocked:0,chapters:[]};
  campaign.unlocked=Math.max(0,Math.min(2,Number(campaign.unlocked)||0));
  let chapterIndex=Math.max(0,Math.min(campaign.unlocked,Number(campaign.chapter)||0));
  let worldChapter=-1,points=[],sites=chapters[chapterIndex].sites;
  const guidePoint={id:'guide',x:3,z:22,kind:'guide',tr:['Rehber Deniz']};
  function chapterState(index) {
    const value=campaign.chapters[index]||{};
    const result={...structuredClone(start),...value};
    for(const key of ["found","observed","accepted","legacy"])result[key]=Array.isArray(value[key])?value[key]:[];
    for(const key of ["x","z","yaw","pitch"])if(!Number.isFinite(result[key]))result[key]=start[key];
    result.found=result.found.filter(id=>chapters[index].sites.some(s=>s.id===id));
    return result;
  }

  let record=campaign.chapters[chapterIndex]?chapterState(chapterIndex):null;
  let player=chapterState(chapterIndex);



  let state='loading',THREE,camera,renderer,scene,sun,water=[],markers=[],project,forward,north,pillars;
  let previous=0,saveElapsed=0,activeSite=null,quality=1,frameTotal=0,frameCount=0,fastWindows=0;
  let audio,ambience,audioGain,question=0,chosen=null,seed=48109;
  const keys = new Set();
  const stick = { id: null, x: 0, y: 0 };
  const look = { id: null, x: 0, y: 0 };
  let sprintId = null;
  const cellSize = 5;
  const colliderGrid = new Map();
  const playerRadius = .33;

  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function collider(x, z, halfX, halfZ, radius = 0) {
    const item = { x, z, halfX, halfZ, radius };
    for (let i = Math.floor((x-halfX)/cellSize); i <= Math.floor((x+halfX)/cellSize); i++) {
      for (let j = Math.floor((z-halfZ)/cellSize); j <= Math.floor((z+halfZ)/cellSize); j++) {
        const key = i + "," + j;
        if (!colliderGrid.has(key)) colliderGrid.set(key, []);
        colliderGrid.get(key).push(item);
      }
    }
  }

  function blocked(x, z) {
    if(chapterIndex===1){
      if(player.room)return x<20.45||x>25.55||z< -10.55||z> -5.45;
      if(z< -25.5||z>25.5||Math.abs(x)>17.6)return true;
      if(z>16 && Math.abs(x)>2.65)return true;
      if(z<=16){for(let hx=-15;hx<=15;hx+=6)for(let hz=13;hz>=-23;hz-=6)if(Math.abs(x-hx-1.6)<.96&&Math.abs(z-hz-1.35)<.98)return true;}
      return false;
    }
    if(x< -25||x>25||z< -36||z>26)return true;
    for (let i=Math.floor((x-playerRadius)/cellSize); i<=Math.floor((x+playerRadius)/cellSize); i++) {
      for (let j=Math.floor((z-playerRadius)/cellSize); j<=Math.floor((z+playerRadius)/cellSize); j++) {
        for (const c of colliderGrid.get(i+","+j) ?? []) {
          const dx = Math.abs(x-c.x), dz = Math.abs(z-c.z);
          if (c.radius && Math.hypot(dx,dz) < c.radius+playerRadius) return true;
          if (!c.radius && Math.hypot(Math.max(0,dx-c.halfX),Math.max(0,dz-c.halfZ)) < playerRadius) return true;
        }
      }
    }
    return false;
  }

  function terrainY(x,z){
    if(chapterIndex!==1)return 0;
    if(player.room && x>19)return 0;
    return z<=16?3.2:Math.max(0,(24-z)*.4);
  }
  function texture(kind) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const ground = kind === "earth";
    ctx.fillStyle = ground ? "#a2986d" : "#d3bda0";
    ctx.fillRect(0,0,256,256);
    for (let i=0;i<6100;i++) {
      const x=random()*256, y=random()*256, size=random()*4+.6;
      ctx.fillStyle = random()<.55 ? "rgba(49,39,28,.13)" : "rgba(255,240,207,.22)";
      ctx.fillRect(x,y,size,size*.7);
    }
    for (let i=0;i<105;i++) {
      const x=random()*256, y=random()*256, r=random()*19+4;
      const shade=ctx.createRadialGradient(x,y,0,x,y,r);
      shade.addColorStop(0,ground?"#55513833":"#70583d38");
      shade.addColorStop(1,"#70583d00");
      ctx.fillStyle=shade;
      ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    if (!ground) {
      ctx.strokeStyle="#7e70544a";
      for(let i=0;i<34;i++) {
        const x=random()*256, y=random()*256;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+7,y+3); ctx.lineTo(x+12,y+2); ctx.stroke();
      }
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 4;
    return map;
  }
  function buildWorld(){
    const built=buildKonyaWorld(THREE,chapterIndex,random,texture,collider);
    ({scene,camera,sun}=built);water=[];markers=[];
    project=new THREE.Vector3();forward=new THREE.Vector3();north=new THREE.Vector3(0,0,-1);
  }
  function makeWater(x,z,w,d,y) {
    const material=new THREE.MeshStandardMaterial({color:"#4d8a7e",roughness:.28,metalness:.25});
    const group=new THREE.Group();
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,d),material);
    mesh.rotation.x=-Math.PI/2;
    group.add(mesh);
    const lines = new THREE.BufferGeometry();
    const positions=[];
    for(let n=0;n<d*5;n++) {
      const a=(random()-.5)*w*.84, b=(random()-.5)*d*.94;
      positions.push(a,.009,b,a+.01,.009,b+random()*.30+.07);
    }
    lines.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
    const ripple=new THREE.LineSegments(lines,new THREE.LineBasicMaterial({color:"#b0c9ad",transparent:true,opacity:.3}));
    group.add(ripple);
    group.position.set(x,y,z);
    scene.add(group);
    return ripple.material;
  }

  function button(text, action, primary=false) {
    const element=document.createElement("button");
    element.type="button"; element.textContent=text;
    if(primary) element.className="primary";
    element.addEventListener("click",action);
    $("actions").append(element);
    return element;
  }
  function paragraph(text) {
    const p=document.createElement("p"); p.textContent=text; $("body").append(p);
  }
  function clearInput() {
    keys.clear(); stick.id=null; stick.x=stick.y=0; look.id=null; sprintId=null;
    $("thumb").style.transform="";
  }
  function show(mode,title) {
    state=mode; clearInput();
    $("panel").classList.toggle("celebrate",mode==="fragment"||mode==="complete");
    
    document.documentElement.lang=prefs.language;
    document.title=t("series")+" · "+chapters[chapterIndex].name;
    $("pause").setAttribute("aria-label",t("pauseLabel"));
    if(document.pointerLockElement) document.exitPointerLock();
    $("overlay").hidden=false; $("hud").hidden=true;
    $("tag").textContent=t("series"); $("title").textContent=title;
    $("body").replaceChildren(); $("actions").replaceChildren(); $("panel").scrollTop=0; $("panel").focus({preventScroll:true});
    if(audioGain) audioGain.gain.setTargetAtTime(0,audio.currentTime,.2);
    if(musicGain)musicGain.gain.setTargetAtTime(0,audio.currentTime,.2);
  }
  function settings(back) {
    show("settings",t("settings"));
    const select=(key,options,callback)=>{
      const row=document.createElement("label"); row.className="setting";
      row.append(document.createTextNode(t(key)));
      const input=document.createElement("select");
      for(const [value,text] of options) {
        const option=document.createElement("option"); option.value=value; option.textContent=text; input.append(option);
      }
      input.value=String(prefs[key]);
      input.onchange=()=>{callback(input.value);write("settings",prefs);};
      row.append(input);$("body").append(row);
    };
    paragraph("Dil: Türkçe · Sesli anlatım yok. Müzik ve efektler başlangıçta sessizdir.");
    select("graphics",["auto","low","medium","high"].map(x=>[x,t(x)]),value=>{prefs.graphics=value;applyQuality();});
    select("sound",[["true",t("on")],["false",t("off")]],value=>{prefs.sound=value==="true";});
    for(const [key,title] of [["musicVolume","Müzik ses seviyesi"],["effectsVolume","Ortam / efekt ses seviyesi"]]){
      const row=document.createElement("label");row.className="setting";row.textContent=title;
      const slider=document.createElement("input");slider.type="range";slider.min=0;slider.max=1;slider.step=.05;slider.value=prefs[key]??(key==="musicVolume"?0:.5);
      slider.oninput=()=>{prefs[key]=Number(slider.value);write("settings",prefs);};row.append(slider);$("body").append(row);
    }
    button("Öğreticiyi sıfırla",()=>{tutorial={};write("tutorial",tutorial);settings(back);});
    button(t("back"),back);
  }
  function pause() {
    if(state!=="playing") return;
    save(); show("paused",t("pause"));
    button(t("resume"),play,true);
    button(t("journal"),journal);
    button(t("settings"),()=>settings(()=>{state="playing";pause();}));
    button(t("menu"),menu);
  }
  function startAudio(){
    if(!prefs.sound) return;
    try{
      if(!audio){
        audio=new (window.AudioContext||window.webkitAudioContext)();
        const buffer=audio.createBuffer(1,audio.sampleRate*3,audio.sampleRate);
        const data=buffer.getChannelData(0);
        for(let i=0;i<data.length;i++)data[i]=(Math.random()-.5)*.4;
        ambience=audio.createBufferSource();ambience.buffer=buffer;ambience.loop=true;
        const filter=audio.createBiquadFilter();filter.type="lowpass";filter.frequency.value=550;
        audioGain=audio.createGain();audioGain.gain.value=0;
        ambience.connect(filter).connect(audioGain).connect(audio.destination);ambience.start();
      }
      audio.resume().catch(()=>{});
      audioGain.gain.setTargetAtTime(.13*(prefs.effectsVolume??.5),audio.currentTime,.6);
      startMusic();
    }catch{/* Audio is optional when unavailable in the browser. */}
  }
  function captureMouse(){
    if(touch || state!=="playing")return;
    try {const result=renderer.domElement.requestPointerLock?.();result?.catch(()=>{});}catch{}
  }
  function rotate(dx,dy){
    if(Math.abs(dx)+Math.abs(dy)>3)teach("look");
    player.yaw-=dx*.0026; player.pitch=Math.max(-1.35,Math.min(1.35,player.pitch-dy*.0026));
  }
  function input(){
    document.body.classList.toggle("touch",touch);
    $("pause").onclick=pause;$("interact").onclick=interact;
    document.addEventListener("keydown",event=>{
      if(event.code==="Escape"){if(state==="playing")pause();return;}
      if(state!=="playing")return;
      if(event.code==="KeyJ"){journal();return;}
      if(["KeyW","KeyA","KeyS","KeyD","ShiftLeft","ShiftRight","KeyE","ArrowUp","ArrowDown"].includes(event.code))event.preventDefault();
      keys.add(event.code);if(event.code==="KeyE"&&!event.repeat)interact();
    });
    document.addEventListener("keyup",event=>keys.delete(event.code));
    document.addEventListener("mousemove",event=>{
      if(state==="playing"&&document.pointerLockElement===renderer.domElement)rotate(event.movementX,event.movementY);
    });
    document.addEventListener("pointerlockchange",()=>{
      if(!document.pointerLockElement&&state==="playing"&&!touch)pause();
    });
    renderer.domElement.addEventListener("click",captureMouse);
    const lookSurface=touch?$("look"):renderer.domElement;
    lookSurface.addEventListener("pointerdown",event=>{
      if(state!=="playing"||document.pointerLockElement||look.id!==null)return;
      look.id=event.pointerId;look.x=event.clientX;look.y=event.clientY;
      lookSurface.setPointerCapture(event.pointerId);
    });
    lookSurface.addEventListener("pointermove",event=>{
      if(state!=="playing"||look.id!==event.pointerId)return;
      rotate(event.clientX-look.x,event.clientY-look.y);look.x=event.clientX;look.y=event.clientY;
    });
    const stopLook=event=>{if(look.id===event.pointerId)look.id=null;};
    lookSurface.addEventListener("pointerup",stopLook);lookSurface.addEventListener("pointercancel",stopLook);
    const joystick=$("stick");
    const moveStick=event=>{
      if(stick.id!==event.pointerId)return;
      const rect=joystick.getBoundingClientRect(),r=rect.width*.34;
      let x=(event.clientX-rect.left-rect.width/2)/r,y=(event.clientY-rect.top-rect.height/2)/r;
      const length=Math.max(1,Math.hypot(x,y));x/=length;y/=length;stick.x=x;stick.y=y;
      $("thumb").style.transform="translate("+x*r+"px,"+y*r+"px)";
    };
    joystick.onpointerdown=event=>{if(state!=="playing"||stick.id!==null)return;stick.id=event.pointerId;joystick.setPointerCapture(event.pointerId);moveStick(event);};
    joystick.onpointermove=moveStick;
    const releaseStick=event=>{if(stick.id===event.pointerId){stick.id=null;stick.x=stick.y=0;$("thumb").style.transform="";}};
    joystick.onpointerup=releaseStick;joystick.onpointercancel=releaseStick;
    $("sprint").onpointerdown=event=>{sprintId=event.pointerId;$("sprint").setPointerCapture(event.pointerId);};
    $("sprint").onpointerup=$("sprint").onpointercancel=()=>sprintId=null;
    window.addEventListener("blur",()=>{clearInput();pause();});
    document.addEventListener("visibilitychange",()=>{if(document.hidden)pause();});
    window.addEventListener("pagehide",()=>{if(state==="playing")save();});
    window.addEventListener("resize",resize);
    renderer.domElement.addEventListener("webglcontextlost",event=>{
      event.preventDefault();save();show("error","Konya");paragraph(t("lost"));button(t("reload"),()=>location.reload());
    });
  }
  function resize(){
    if(!renderer)return;
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  }
  function applyQuality(level){
    quality=level??({low:0,medium:1,high:2}[prefs.graphics]??(touch?0:1));
    renderer.setPixelRatio(Math.min(devicePixelRatio,[1,1.35,1.75][quality]));
    renderer.shadowMap.enabled=quality>0;sun.castShadow=quality>0;
    const size=quality===2?2048:1024;
    sun.shadow.mapSize.set(size,size);
    if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
    scene.traverse(object=>{if(object.material)object.material.needsUpdate=true;});
    resize();
  }
  function update(dt,time){
    let horizontal=Number(keys.has("KeyD"))-Number(keys.has("KeyA"))+stick.x;
    let vertical=Number(keys.has("KeyS"))-Number(keys.has("KeyW"))+stick.y;
    const length=Math.max(1,Math.hypot(horizontal,vertical));
    horizontal/=length;vertical/=length;
    const speed=(keys.has("ShiftLeft")||keys.has("ShiftRight")||sprintId!==null)?5.3:3.05;
    const dx=(horizontal*Math.cos(player.yaw)+vertical*Math.sin(player.yaw))*speed*dt;
    const dz=(-horizontal*Math.sin(player.yaw)+vertical*Math.cos(player.yaw))*speed*dt;
    // Small substeps prevent tunnelling through thin stone or channel edges.
    if(Math.hypot(dx,dz)>.015)teach("move");
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));
    for(let i=0;i<steps;i++){
      if(!blocked(player.x+dx/steps,player.z))player.x+=dx/steps;
      if(!blocked(player.x,player.z+dz/steps))player.z+=dz/steps;
    }
    camera.position.set(player.x,terrainY(player.x,player.z)+1.67,player.z);
    camera.rotation.set(player.pitch,player.yaw,0,"YXZ");camera.updateMatrixWorld();
    activeSite=null;
    for(let i=0;i<points.length;i++){
      const s=points[i];
      markers[i].rotation.y=time*.5;
      markers[i].position.y=terrainY(s.x,s.z)+(s.kind==="guide"?2.0:1.4)+Math.sin(time*1.6)*.08;
      markers[i].visible=pointVisible(s);
      if(markers[i].visible && Math.hypot(s.x-player.x,s.z-player.z)<2.5){
        project.set(s.x,1.4+terrainY(s.x,s.z),s.z).sub(camera.position).normalize();
        camera.getWorldDirection(forward);
        if(project.dot(forward)>.3 && clearSight(s))activeSite=s;
      }
    }
    $("prompt").hidden=!activeSite&&player.found.length<sites.length;
    $("prompt").textContent=activeSite?(touch?"": "E · ")+t("inspect")+" · "+label(activeSite):(touch?"":"E · ")+(player.complete?"Tarihî rapor":t("quiz"));
    const target=missionTarget();
    $("waypoint").hidden=!target;
    if(target){
      project.set(target.x,2.3+terrainY(target.x,target.z),target.z).project(camera);
      const visible=project.z>-1&&project.z<1&&Math.abs(project.x)<.9&&Math.abs(project.y)<.7;
      $("waypoint").hidden=!visible;
      if(visible){
        $("waypoint").style.left=(project.x*.5+.5)*innerWidth+"px";
        $("waypoint").style.top=(-project.y*.5+.5)*innerHeight+"px";
        $("waypoint").textContent="◆ "+Math.round(Math.hypot(target.x-player.x,target.z-player.z))+" m";
      }
    }
    navigationElapsed+=dt;if(navigationElapsed>.2){navigationElapsed=0;navigation();}
    saveElapsed+=dt;if(saveElapsed>5){saveElapsed=0;save();}
  }
  function frame(ms){
    requestAnimationFrame(frame);
    const raw=(ms-previous)/1000;previous=ms;
    const dt=Math.min(.05,raw||.016);
    if(state==="playing")update(dt,ms/1000);
    else if(state==="menu"||state==="loading"){
      camera.position.set(chapterIndex===0?-15:15,chapterIndex===1?10:8,25);camera.lookAt(0,chapterIndex===0?5:3,-10);
    }
    water.forEach((material,index)=>material.opacity=.22+Math.sin(ms*.0007+index)*.07);
    renderer.render(scene,camera);
    if(state==="playing"&&prefs.graphics==="auto"&&raw<.5){
      frameTotal+=raw;frameCount++;
      if(frameTotal>6){
        const fps=frameCount/frameTotal;
        if(fps<38&&quality>0){applyQuality(quality-1);fastWindows=0;}
        else if(fps>57&&quality<1){if(++fastWindows>=3){applyQuality(1);fastWindows=0;}}
        else fastWindows=0;
        frameTotal=frameCount=0;
      }
    }
  }

  function disposeWorld() {
    if(!scene)return;
    const geometries=new Set(),materials=new Set(),textures=new Set();
    scene.traverse(object=>{
      if(object.geometry)geometries.add(object.geometry);
      if(object.material)for(const material of [].concat(object.material)){
        materials.add(material);
        for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
      }
    });
    textures.forEach(item=>item.dispose());
    materials.forEach(item=>item.dispose());
    geometries.forEach(item=>item.dispose());
    sun?.shadow?.map?.dispose();
    colliderGrid.clear();
  }
  function loadWorld() {
    if(worldChapter===chapterIndex)return;
    disposeWorld();seed=48109+chapterIndex;
    buildWorld();
    // Replace the previous landmark pins with mission-aware evidence pins.
    markers.forEach(marker=>{scene.remove(marker);marker.geometry.dispose();marker.material.dispose();});
    points=[guidePoint,...sites,...sites.flatMap(s=>s.clues)];
    if(chapterIndex===1)points.push({id:'ladder',kind:'ladder',x:0,z:-3,tr:['Merdiven · Eve in']});
    const pinGeometry=new THREE.OctahedronGeometry(.20);
    const pinMaterial=new THREE.MeshStandardMaterial({color:"#ffdb90",emissive:"#87581e",emissiveIntensity:.5});
    markers=points.map(point=>{
      const mesh=new THREE.Mesh(pinGeometry,pinMaterial);
      mesh.position.set(point.x,terrainY(point.x,point.z)+1.5,point.z);
      scene.add(mesh);return mesh;
    });
    const guide=new THREE.Group();
    const coat=new THREE.MeshStandardMaterial({color:"#446f6b",roughness:1});
    const skin=new THREE.MeshStandardMaterial({color:"#b98565",roughness:1});
    function part(geometry,material,x,y,z){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;guide.add(mesh);}
    part(new THREE.CylinderGeometry(.2,.29,.7,12),coat,0,.95,0);
    part(new THREE.SphereGeometry(.17,12,8),skin,0,1.51,0);
    for(const x of [-.12,.12])part(new THREE.CylinderGeometry(.075,.08,.55,8),coat,x,.32,0);
    for(const x of [-.31,.31])part(new THREE.CylinderGeometry(.065,.07,.54,8),skin,x,.95,0);
    part(new THREE.CylinderGeometry(.3,.3,.05,16),coat,0,1.65,0);
    guide.position.set(guidePoint.x,terrainY(guidePoint.x,guidePoint.z),guidePoint.z);
    scene.add(guide);collider(guidePoint.x,guidePoint.z,.4,.4,.4);
    worldChapter=chapterIndex;
    applyQuality();
  }




  function newGame(){
    const begin=()=>{
      campaign={version:3,chapter:0,unlocked:0,chapters:[]};
      chapterIndex=0;player=chapterState(0);record=null;
      sites=chapters[0].sites;loadWorld();save();story();
    };
    if(record){show("confirm",t("restart"));button(t("start"),begin,true);button(t("cancel"),menu);}
    else begin();
  }
  function enterChapter(index){
    if(index>campaign.unlocked)return;
    chapterIndex=index;campaign.chapter=index;sites=chapters[index].sites;
    player=chapterState(index);record=campaign.chapters[index]||null;
    loadWorld();save();story();
  }

  function save(){
    record=structuredClone(player);
    campaign.chapter=chapterIndex;campaign.chapters[chapterIndex]=record;
    write("campaign",campaign);
  }

  function allObserved(site){return site.clues.every(clue=>player.observed.includes(clue.id));}
  function missionTarget(){
    const site=sites.find(s=>!player.found.includes(s.id));
    if(!site)return null;
    if(!player.accepted.includes(site.id))return site;
    return site.clues.find(clue=>!player.observed.includes(clue.id))||site;
  }
  function pointVisible(point){
    if(point.kind==='guide')return !player.room;
    if(point.kind==='ladder')return true;
    if(player.room)return false;
    const current=sites.find(s=>!player.found.includes(s.id));
    if(!current)return point.kind!=='clue';
    return point===current || (point.parent===current.id && player.accepted.includes(current.id) && !player.observed.includes(point.id));
  }



  function startQuiz(){
    if(player.found.length!==sites.length)return;
    question=0;chosen=null;quiz();
  }
  function quiz(){
    const site=sites[question];
    show("quiz",t("quiz")+" "+(question+1)+"/"+sites.length);
    paragraph(site[prefs.language][2]);
    site[prefs.language][3].forEach((answer,index)=>button(answer,()=>{
      chosen=index;show("answer",t(index===site.answer?"correct":"wrong"));
      paragraph(site[prefs.language][1]);
      if(index===site.answer)button(t(question===sites.length-1?"complete":"next"),()=>{
        question++;
        if(question===sites.length){
          player.complete=true;
          campaign.unlocked=Math.max(campaign.unlocked,Math.min(2,chapterIndex+1));
          save();completion();
        }else quiz();
      },true);
      else button(t("retry"),quiz,true);
      button(t("return"),play);
    }));
    button(t("return"),play);
  }

  function play(){
    player.pitch=Math.max(-1.35,Math.min(1.35,player.pitch));
    if(blocked(player.x,player.z)){player.x=start.x;player.z=start.z;}
    
    state="playing";clearInput();$("overlay").hidden=true;$("hud").hidden=false;
    $("district").textContent=chapters[chapterIndex].name.toLocaleUpperCase('tr')+" · "+pair(...chapters[chapterIndex].title);
    $("interact").textContent=t("inspect");$("sprint").textContent=t("sprint");
    startAudio();captureMouse();hud();navigation();
  }
  function hud(){
    const target=missionTarget();
    $("objective").textContent=target?label(target):pair(player.complete?"Rapor tamamlandı":"Mini sınav hazır",player.complete?"Report complete":"Quiz ready");
    $("progress").textContent=player.found.length+" / "+sites.length+" "+pair("kayıt parçası","record fragments");
    $("segments").replaceChildren(...sites.map(s=>{
      const span=document.createElement("span");span.className=player.found.includes(s.id)?"found":"";return span;
    }));
  }
  function interact(){
    if(state!=="playing")return;
    if(activeSite)info(activeSite);
    else if(player.found.length===sites.length){if(player.complete)completion();else startQuiz();}
  }


  let navigationElapsed=0;
  let tutorial=read("tutorial",{});
  let musicGain;
  const tutorialSteps=[
    ["move","W A S D","Yürümeyi dene.","Soldaki çubuğu sürükleyerek yürü."],
    ["look","↔","Fareyle etrafına bak.","Ekranın sağını sürükleyerek etrafına bak."],
    ["interact","E","Altın hedef işaretine yaklaş. E ile araştır.","Altın hedefe yaklaş. ARAŞTIR düğmesine dokun."],
    ["evidence","◇","Görevi üstlen. İşaretli kanıt noktasını incele.","Görevi üstlen. İşaretli kanıt noktasını incele."],
    ["journal","J","Günlüğü J ile aç. Bulduğun kanıtları burada gör.","Günlük düğmesine dokun. Kanıtlarını burada gör."],
    ["route","↑","Haritadaki altın nokta sıradaki hedefin. Görev panelini takip et.","Haritadaki altın nokta sıradaki hedefin. Görev panelini takip et."]
  ];
  function teach(key){
    if(tutorial[key])return;
    tutorial[key]=true;write("tutorial",tutorial);
  }
  function nextInstruction(){
    const mission=sites.find(site=>!player.found.includes(site.id));
    if(!mission)return player.complete?"Günlüğü açarak tarihî raporunu incele.":"Tüm kanıtlar birleşti. E / ARAŞTIR ile mini sınavı aç.";
    if(!player.accepted.includes(mission.id))return "1/4 · "+label(mission)+" panosuna git. "+(touch?"ARAŞTIR düğmesine dokun.":"E tuşuna bas.")+" Görevi üstlen.";
    const target=missionTarget();
    if(target.kind==="clue")return "2/4 · "+label(target)+" noktasını bul ve araştır. "+mission.clues.filter(c=>player.observed.includes(c.id)).length+"/2 kanıt.";
    return "3/4 · "+label(mission)+" panosuna dön. Kanıtları birleştir ve kısa görevi çöz.";
  }
  function setupGuidance(){
    $("open-journal").onclick=journal;
    $("tutorial").onclick=()=>{const step=tutorialSteps.find(([id])=>!tutorial[id]);if(step?.[0]==="route")teach("route");};
  }
  function navigation(){
    if(state!=="playing")return;
    const mission=sites.find(site=>!player.found.includes(site.id));
    $("objective").textContent=mission?"GÖREV · "+label(mission):"KENT KAYDI TAMAMLANDI";
    $("next-step").textContent=nextInstruction();
    $("reason").textContent=mission?"Amaç · "+mission.puzzle[0]:"Öğrendiklerini sınavda kullan ve sonraki kente geç.";
    $("interact").textContent="ARAŞTIR";
    const target=missionTarget();
    const canvas=$("map"),ctx=canvas.getContext("2d");
    ctx.clearRect(0,0,144,144);ctx.fillStyle="#18241f";ctx.fillRect(0,0,144,144);
    ctx.strokeStyle="#536552";ctx.strokeRect(10,10,124,124);
    ctx.fillStyle="#bbc8b2";ctx.font="10px sans-serif";ctx.fillText("Şematik rota",20,11);
    const px=x=>10+(x+27)/54*124,pz=z=>20+(z+37)/65*112;
    for(const site of sites){ctx.fillStyle=player.found.includes(site.id)?"#8ebd91":"#8a846d";ctx.fillRect(px(site.x)-2,pz(site.z)-2,4,4);}
    if(target){ctx.beginPath();ctx.arc(px(target.x),pz(target.z),5,0,Math.PI*2);ctx.fillStyle="#ffd28b";ctx.fill();}
    ctx.save();ctx.translate(px(player.x),pz(player.z));ctx.rotate(-player.yaw);
    ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(-4,4);ctx.lineTo(4,4);ctx.closePath();ctx.fillStyle="white";ctx.fill();ctx.restore();
    if(target){
      const angle=Math.atan2(target.x-player.x,-(target.z-player.z))+player.yaw;
      const degrees=((angle*180/Math.PI+540)%360)-180;
      $("bearing").textContent=(Math.abs(degrees)<25?"↑ İleri":degrees>0?"→ Sağa dön":"← Sola dön")+" · "+Math.round(Math.hypot(target.x-player.x,target.z-player.z))+" m";
    }else $("bearing").textContent="✓ Araştırma tamam";
    const step=tutorialSteps.find(([id])=>!tutorial[id]);
    $("tutorial").hidden=!step;
    if(step)$("tutorial").textContent=step[1]+"  "+step[touch?3:2]+(step[0]==="route"?" · Anladım için dokun":"");
    for(let i=0;i<points.length;i++){const point=points[i];const size=activeSite===point?1.35:target===point?1.12:1;markers[i].scale.setScalar(size);}
  }
  function startMusic(){
    if(!audio)return;
    if(!musicGain){
      musicGain=audio.createGain();musicGain.gain.value=0;musicGain.connect(audio.destination);
      for(const frequency of [130.81,196,261.63]){
        const tone=audio.createOscillator();tone.type="sine";tone.frequency.value=frequency;tone.connect(musicGain);tone.start();
      }
    }
    musicGain.gain.setTargetAtTime((prefs.musicVolume??0)*.014,audio.currentTime,.8);
  }

  async function boot(){
    try{
      THREE=window.THREE; if(!THREE)throw new Error("Three.js dosyası bulunamadı");
      renderer=new THREE.WebGLRenderer({antialias:!touch,powerPreference:"high-performance"});
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
      renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      $("world").append(renderer.domElement);
      loadWorld();input();setupGuidance();menu();requestAnimationFrame(frame);
    }catch(error){
      console.error(error);show("error","Konya");paragraph(t("unavailable"));
      button(t("reload"),()=>location.reload());
    }
  }
  // Konya content and richer activities extend the original Antalya game systems.
  function clearSight(target){
    const d=Math.hypot(target.x-player.x,target.z-player.z);
    for(let n=.25;n<d-.3;n+=.22)if(blocked(player.x+(target.x-player.x)*n/d,player.z+(target.z-player.z)*n/d))return false;
    return true;
  }
  function guideDialogue(text){
    const name=document.createElement('div');name.className='guide-name';name.textContent='DENİZ · ARAŞTIRMA REHBERİN';$('body').append(name);paragraph(text);
  }
  function note(){
    const p=document.createElement('p');p.className='fiction';p.textContent='Deniz, kayıp dosyalar ve soruşturma kurmacadır. Mimari, tanınan özelliklerden esinlenen, sıkıştırılmış ölçekte eğitim yorumudur; birebir rölöve değildir. Kanıtlar dijital gözlem notlarıdır; eser alınmaz.';$('body').append(p);
  }
  function totals(){
    return campaign.chapters.reduce((a,c)=>({missions:a.missions+(c?.found?.length||0),evidence:a.evidence+(c?.observed?.length||0)}),{missions:0,evidence:0});
  }
  function menu(){
    show('menu','Kayıp Miras');
    const en=document.createElement('div');en.className='series-english';en.textContent='JOURNEY THROUGH HISTORICAL KONYA';$('body').append(en);
    paragraph('Üç mekân. Binlerce yıl. Birbirinden kopmuş üç dosyanın izinde, Konya’nın yaşayan mirasını yeniden keşfet.');
    const stats=document.createElement('div');stats.className='stats';stats.innerHTML='<span><b>03</b>TARİHÎ MEKÂN</span><span><b>10</b>ARAŞTIRMA</span><span><b>20</b>ANLAMLI KANIT</span>';$('body').append(stats);
    if(record)button(t('resume'),()=>{loadWorld();play();},true);
    button(t('start'),newGame,!record);button(t('levels'),levels);button(t('journal'),journal);button(t('settings'),()=>settings(menu));button('Kaynaklar ve oyun hakkında',()=>references(menu));button('← Haritaya dön',()=>{location.href='../harita';});
    paragraph(t(touch?'mobile':'controls'));note();
  }
  function story(){
    show('story',chapters[chapterIndex].title[0]);
    paragraph(chapters[chapterIndex].name+' · '+chapters[chapterIndex].era);
    guideDialogue(chapters[chapterIndex].story[0]);
    paragraph('İşaretli araştırma panosuna git → görevi üstlen → iki gözlemi kaydet → panoda kanıtları birleştir. Her bölümün sonunda kısa bir bilgi sınavı var.');
    if(chapterIndex===1)paragraph('Ahşap ziyaretçi rampasından dam rotasına çık. Eve in istasyonu, temsili bir iç mekâna bakmanı sağlar.');
    note();button('Araştırmaya başla',play,true);
  }
  function levels(){
    show('levels','Mekân seçimi');
    chapters.forEach((c,i)=>{
      const done=campaign.chapters[i]?.complete,open=i<=campaign.unlocked;
      const b=button((done?'✓ ':String(i+1).padStart(2,'0')+' · ')+c.name+(open?'':' · Kilitli'),()=>enterChapter(i),open);b.disabled=!open;
      paragraph(c.era+' · '+c.sites.length+' görev · '+c.sites.length*2+' kanıt');
    });
    paragraph('Bir sonraki mekân, mevcut bölümün görevleri ve bilgi sınavı tamamlandığında açılır. Tamamladığın mekânları yeniden gezebilirsin.');button('Ana menü',menu);
  }
  function sourceLink(site){
    const s=KONYA.sources.find(s=>s.id===site.sourceId);
    const a=document.createElement('a');a.className='source-item';a.href=site.source;a.textContent=(s?.name||'Tarihî kaynak')+' ↗';a.target='_blank';a.rel='noopener noreferrer';$('body').append(a);
  }
  function references(back){
    show('sources','Kaynaklar ve yöntem');
    paragraph('Tarihî bilgiler aşağıdaki Kültür ve Turizm Bakanlığı ve UNESCO sayfalarına dayanır. Kontrol tarihi: 17 Kasım 2026.');
    for(const s of KONYA.sources){const a=document.createElement('a');a.className='source-item';a.href=s.url;a.textContent=s.name+' ↗';a.target='_blank';a.rel='noopener noreferrer';$('body').append(a);}
    paragraph('Çatalhöyük tarihlemesi ve katman sayısında UNESCO esas alındı. Duvar resmi yorumları kesin gerçek olarak verilmedi. Karatay’ın mimarına ilişkin farklı aktarımlar bulunduğundan bir mimar adı kesinleştirilmedi.');
    paragraph('Çatalhöyük, bugün görülen kazı alanının birebir modeli değil, Neolitik yaşamı açıklayan bir canlandırmadır. Mevlâna ve Karatay modelleri tanınabilir mimari özelliklere dayalı eğitim yorumlarıdır. Oyundaki taçkapı bezemeleri, çiniler ve nesneler özgün tasarımlardır; kitabe metinleri taklit edilmez.');
    paragraph('Harita şematiktir; gerçek rota veya OpenStreetMap verisi kullanılmamıştır. Arayüz, hareket, kayıt, görev ve mobil kontrol temeli Antalya oyununun devamıdır. Three.js MIT lisanslıdır; lisans pakette yer alır.');
    note();button('Geri',back,true);
  }
  function info(site,fromJournal=false){
    teach('interact');
    if(site.kind==='ladder'){
      show('ladder',player.room?'Dama dön':'Evin içine bak');
      paragraph('Damdan giriş, Çatalhöyük evlerinin ayırt edici özelliğidir. İnceleyeceğin oda eğitim için hazırlanmış bir kesit evdir. Merdiven geçişi otomatik yapılır.');
      button(player.room?'Merdivenle dama çık':'Merdivenle eve in',()=>{
        player.room=!player.room;
        if(player.room){player.x=23;player.z=-7;player.yaw=0;site.x=23;site.z=-9;site.tr=['Merdiven · Dama dön'];}
        else{player.x=1;player.z=-3;player.yaw=0;site.x=2;site.z=-4;site.tr=['Merdiven · Eve in'];}
        player.pitch=0;save();play();
      },true);button('Vazgeç',play);return;
    }
    if(site.kind==='guide'){show('guide','Deniz');guideDialogue(nextInstruction());button('Keşfe dön',play,true);return;}
    if(site.kind==='clue'){
      const parent=sites.find(s=>s.id===site.parent);
      if(!fromJournal&&!player.accepted.includes(parent.id))return;
      if(!player.observed.includes(site.id)){player.observed.push(site.id);save();}
      teach('evidence');show('evidence',label(site));
      paragraph('✓ GÖZLEM NOTU · '+label(parent));paragraph(site.description);
      guideDialogue('Bu kanıtın amacı: '+site.purpose);
      sourceLink(parent);
      if(allObserved(parent)&&!player.found.includes(parent.id))paragraph('İki gözlem tamam. Araştırma panosuna dön; kanıtları birleştirme etkinliği hazır.');
      else paragraph('Notun günlüğe kaydedildi. Altın işaret sıradaki gözlem noktasını gösteriyor.');
      button(fromJournal?'Kanıt ekranına dön':'Keşfe dön',fromJournal?evidenceScreen:play,true);return;
    }
    show('info',label(site));
    if(player.found.includes(site.id)){paragraph(site.tr[1]);sourceLink(site);paragraph('✓ Bu araştırma tamamlandı.');}
    else{
      guideDialogue(site.intro);
      paragraph('Hedef: '+site.activity.prompt);
      for(const clue of site.clues){const p=document.createElement('div');p.className='clue-card';p.textContent=(player.observed.includes(clue.id)?'✓ ':'◇ ')+label(clue);$('body').append(p);}
      if(!player.accepted.includes(site.id))button('Görevi üstlen',()=>{player.accepted.push(site.id);save();play();},true);
      else if(allObserved(site))button('Kanıtları birleştir',()=>solveMission(site),true);
      else paragraph('İşaretli iki gözlem noktasını E veya Araştır ile incele. Sonra bu panoya dön.');
    }
    button(fromJournal?'Günlüğe dön':'Keşfe dön',fromJournal?journal:play);
  }
  function finishMission(site){
    if(!player.found.includes(site.id))player.found.push(site.id);
    save();show('fragment','Araştırma tamamlandı');
    paragraph('✓ '+label(site));guideDialogue(site.tr[1]);sourceLink(site);
    const n=totals();paragraph(n.missions+'/10 görev · '+n.evidence+'/20 kanıt');
    if(player.found.length===sites.length){
      guideDialogue(chapters[chapterIndex].resolution);
      button('Bölüm bilgi sınavı',startQuiz,true);
    }else{const next=sites.find(s=>!player.found.includes(s.id));paragraph('Sıradaki araştırma: '+label(next));}
    button('Keşfe dön',play,true);
  }
  function solveMission(site){
    if(!allObserved(site))return;
    show('task',label(site));paragraph(site.activity.prompt);
    const notes=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Gözlem notlarımı aç';notes.append(summary);
    for(const c of site.clues){const p=document.createElement('p');p.textContent=label(c)+': '+c.description;notes.append(p);}$('body').append(notes);
    const feedback=document.createElement('p');feedback.className='feedback';feedback.setAttribute('role','status');$('body').append(feedback);
    const a=site.activity;
    if(a.type==='match'){
      const grid=document.createElement('div');grid.className='match-grid';$('body').append(grid);
      let selected=null,matched=new Set();const left=[],right=[];
      a.pairs.forEach((pair,i)=>{const b=document.createElement('button');b.textContent=pair[0];b.onclick=()=>{left.forEach(b=>b.classList.remove('selected'));b.classList.add('selected');selected=i;feedback.textContent='Şimdi sağdaki uygun işlevi seç.';};left.push(b);});
      a.pairs.forEach((pair,i)=>{const b=document.createElement('button');b.textContent=pair[1];b.onclick=()=>{
        if(selected===null){feedback.textContent='Önce soldaki bir gözlem kartını seç.';return;}
        if(selected!==i){feedback.textContent='Bu eşleştirme uymuyor. Gözlem notundaki işlevi tekrar düşün.';return;}
        matched.add(i);left[i].disabled=b.disabled=true;left[i].classList.add('matched');b.classList.add('matched');left[i].classList.remove('selected');selected=null;feedback.textContent='Doğru eşleştirme.';
        if(matched.size===a.pairs.length){feedback.textContent='Tüm gözlemler doğru eşleşti.';button('Araştırmayı tamamla',()=>finishMission(site),true);}
      };right.push(b);});
      left.forEach((b,i)=>{grid.append(b,right[a.pairs.length-1-i]);});
    }else if(a.type==='order'){
      const selected=[],result=document.createElement('div');result.className='order-result';result.textContent='Sıralaman burada görünecek.';$('body').append(result);
      const bs=a.items.map((item,i)=>button(item,()=>{
        selected.push(i);bs[i].disabled=true;result.textContent=selected.map((v,n)=>(n+1)+'. '+a.items[v]).join(' → ');
        if(selected.length===a.items.length)check.disabled=false;
      }));
      const check=button('Sıralamayı kontrol et',()=>{
        if(selected.every((v,i)=>v===a.correct[i]))finishMission(site);
        else feedback.textContent='Henüz doğru değil. MÖ tarihleri MS tarihlerinden öncedir; yıl kartlarını küçükten büyüğe incele. Sıralamayı temizleyip yeniden dene.';
      },true);check.disabled=true;
      button('Sıralamayı temizle',()=>{selected.length=0;bs.forEach(b=>b.disabled=false);check.disabled=true;result.textContent='Sıralaman burada görünecek.';feedback.textContent='';});
    }else{
      a.options.forEach((option,i)=>{
        const b=button(option,()=>{if(i===a.answer)finishMission(site);else{feedback.textContent='Bu yanıt gözlemlerle uyuşmuyor. İpucu: '+site.tr[1];b.classList.add('selected');}});
        if(a.colors){const sw=document.createElement('span');sw.className='swatches';for(const c of a.colors[i]){const t=document.createElement('i');t.style.background=c;sw.append(t);}b.prepend(sw);}
      });
    }
    button('Keşfe dön',play);
  }
  function evidenceScreen(){
    show('journal','Kanıt koleksiyonu');const n=totals();paragraph(n.evidence+'/20 gözlem notu. Her not bir görevin çözümüne katkı sağlar.');
    for(let i=0;i<chapters.length;i++){
      const heading=document.createElement('h2');heading.textContent=chapters[i].name;$('body').append(heading);
      const section=document.createElement('div');section.className='journal-section';$('body').append(section);
      const observed=campaign.chapters[i]?.observed||[];
      for(const s of chapters[i].sites)for(const c of s.clues){
        if(observed.includes(c.id))section.append(button('✓ '+label(c),()=>{
          show('evidence',label(c));paragraph(c.description);guideDialogue(c.purpose);sourceLink(s);button('Kanıtlara dön',evidenceScreen,true);
        }));else paragraph('◇ '+label(c)+' · Henüz kaydedilmedi');
      }
    }
    button('Günlüğe dön',journal);
  }
  function journal(){
    teach('journal');show('journal','Tarihî günlük');const n=totals();paragraph(n.missions+'/10 araştırma · '+n.evidence+'/20 kanıt');
    button('Kanıt koleksiyonunu aç',evidenceScreen,true);
    for(let i=0;i<chapters.length;i++){
      const c=chapters[i],s=campaign.chapters[i];const h=document.createElement('h2');h.textContent=c.name;$('body').append(h);
      paragraph(c.era+' · '+(s?.found?.length||0)+'/'+c.sites.length+' araştırma');
      const section=document.createElement('div');section.className='journal-section';$('body').append(section);
      for(const site of c.sites)if(s?.found?.includes(site.id))section.append(button('✓ '+label(site),()=>{
        show('info',label(site));paragraph(site.tr[1]);sourceLink(site);button('Günlüğe dön',journal,true);
      }));
      if(s?.complete)paragraph(c.resolution);
    }
    if(player.found.length===sites.length&&!player.complete)button('Bölüm bilgi sınavı',startQuiz,true);
    if(campaign.chapters.every(c=>c?.complete)&&campaign.chapters.length===3)button('Son tarihî rapor',finalReport,true);
    button('Kaynaklar ve yöntem',()=>references(journal));button('Keşfe dön',play);button('Ana menü',menu);
  }
  function completion(){
    show('complete',chapters[chapterIndex].name+' · Rapor');
    guideDialogue(chapters[chapterIndex].resolution);
    for(const s of sites){const h=document.createElement('h2');h.textContent=label(s);$('body').append(h);paragraph(s.tr[1]);sourceLink(s);}
    if(chapterIndex<2)button('Sonraki mekâna geç',()=>enterChapter(chapterIndex+1),true);
    else button('Kayıp Miras · Son rapor',finalReport,true);
    button('Raporu indir',()=>downloadReport(false));button('Keşfe dön',play);button('Mekân seçimi',levels);button('Ana menü',menu);
  }
  function finalReport(){
    show('complete','Kayıp Miras bulundu');
    guideDialogue('Kaybolan bir altın hazinesi değildi. Yaşam, bilgi ve kültürel aktarım arasındaki bağdı. Çatalhöyük’ün evlerini Selçuklu yapılarıyla karıştırmadan, her dosyayı kendi dönemine yerleştirdin.');
    paragraph('10/10 araştırma · 20/20 kanıt · 3/3 bölüm');
    for(const c of chapters){const h=document.createElement('h2');h.textContent=c.name;$('body').append(h);paragraph(c.resolution);for(const s of c.sites){paragraph(s.tr[0]+': '+s.tr[1]);sourceLink(s);}}
    note();button('Tarihî raporu indir',()=>downloadReport(true),true);button('Kaynaklar',()=>references(finalReport));button('Mekânları yeniden gez',levels);button('Ana menü',menu);
  }
  function downloadReport(all){
    const cs=all?chapters:[chapters[chapterIndex]],n=totals();
    let text="TARİHÎ KONYA'NIN İZİNDE — KAYIP MİRAS\nAraştırma raporu\n\n"+n.missions+'/10 görev · '+n.evidence+'/20 gözlem\n\n';
    for(const c of cs){text+=c.name+' — '+c.era+'\n'+c.resolution+'\n\n';for(const s of c.sites){text+=s.tr[0]+'\n'+s.tr[1]+'\n';for(const clue of s.clues)text+='• '+label(clue)+': '+clue.description+'\n';text+='Kaynak: '+s.source+'\n\n';}}
    text+='YÖNTEM\nDeniz ve kayıp dosyalar kurmacadır. Modeller ve görev nesneleri eğitim yorumudur; birebir arkeolojik rekonstrüksiyon değildir. Çatalhöyük simgelerinin anlamları kesinleştirilmez.\n\nKAYNAKLAR — 17 Kasım 2026\n'+KONYA.sources.map(s=>s.name+'\n'+s.url).join('\n\n');
    const blob=new Blob(['\ufeff'+text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=all?'konya-kayip-miras-raporu.txt':'konya-bolum-'+(chapterIndex+1)+'-raporu.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  // Grid routing uses the same collision test as walking, so guidance goes around walls.
  let route=[],routeKey='',routeOrigin={x:999,z:999},routeTime=0,routeShown=false,routeMeshes=[];
  const baseNavigation=navigation;
  function findRoute(target){
    const step=.8,minX=-26,minZ=-37,w=67,h=81;
    const grid=(x,z)=>[Math.round((x-minX)/step),Math.round((z-minZ)/step)];
    const world=(i,j)=>({x:minX+i*step,z:minZ+j*step});
    const [sx,sz]=grid(player.x,player.z),[tx,tz]=grid(target.x,target.z);
    const key=(x,z)=>x+z*w,startKey=key(sx,sz),queue=[[sx,sz]],came=new Map([[startKey,null]]);let end=null;
    for(let p=0;p<queue.length&&p<7000;p++){
      const [x,z]=queue[p],pos=world(x,z);
      if(Math.hypot(pos.x-target.x,pos.z-target.z)<.95){end=key(x,z);break;}
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,nz=z+dz,k=key(nx,nz);if(nx<0||nx>=w||nz<0||nz>=h||came.has(k))continue;
        const next=world(nx,nz);if(blocked(next.x,next.z)||blocked((pos.x+next.x)/2,(pos.z+next.z)/2))continue;
        came.set(k,key(x,z));queue.push([nx,nz]);
      }
    }
    if(end===null)return [target];
    const out=[target];while(end!==null){out.push(world(end%w,Math.floor(end/w)));end=came.get(end);}return out.reverse();
  }
  const oldNavigation=navigation;
  navigation=function(){
    oldNavigation();if(state!=='playing')return;
    const target=missionTarget();
    if(target){
      routeTime++;
      if(routeKey!==target.id||Math.hypot(player.x-routeOrigin.x,player.z-routeOrigin.z)>2){route=findRoute(target);routeKey=target.id;routeOrigin={x:player.x,z:player.z};}
      const ctx=$('map').getContext('2d'),px=x=>10+(x+27)/54*124,pz=z=>20+(z+37)/65*112;
      ctx.beginPath();ctx.moveTo(px(player.x),pz(player.z));for(const p of route)ctx.lineTo(px(p.x),pz(p.z));ctx.strokeStyle='#d0aa6190';ctx.lineWidth=1;ctx.stroke();
      const next=route.find(p=>Math.hypot(p.x-player.x,p.z-player.z)>1.7)||target;
      const angle=Math.atan2(next.x-player.x,-(next.z-player.z))+player.yaw,degrees=((angle*180/Math.PI+540)%360)-180;
      $('bearing').textContent=(Math.abs(degrees)<25?'↑ İleri':degrees>0?'→ Sağa dön':'← Sola dön')+' · '+Math.round(route.length*.8)+' m rota';
      if(routeShown){
        if(!routeMeshes.length){const g=new THREE.RingGeometry(.11,.17,12);g.rotateX(-Math.PI/2);const m=new THREE.MeshBasicMaterial({color:'#ffd58b',transparent:true,opacity:.75,depthWrite:false});for(let i=0;i<18;i++){const o=new THREE.Mesh(g,m);scene.add(o);routeMeshes.push(o);}}
        routeMeshes.forEach((o,i)=>{const p=route[i*2+2];o.visible=!!p;if(p)o.position.set(p.x,terrainY(p.x,p.z)+.13,p.z);});
      }
    }else routeMeshes.forEach(o=>o.visible=false);
    const n=totals();$('progress').textContent=n.missions+'/10 görev · '+n.evidence+'/20 kanıt';
    if(player.complete){$('objective').textContent='BÖLÜM ARAŞTIRMASI TAMAMLANDI';$('reason').textContent='Günlükten raporunu açabilir, mekânı yeniden gezebilirsin.';}
    if(player.room){$('objective').textContent='Çatalhöyük · Ev içi gözlemi';$('next-step').textContent='Ocağı ve sekileri incele. Merdiven işaretine yaklaşıp E / Araştır ile dama dön.';}
    $('interact').disabled=!activeSite&&player.found.length<sites.length;
  };
  const oldMissionTarget=missionTarget;
  missionTarget=function(){if(player.room)return points.find(p=>p.kind==='ladder');return oldMissionTarget();};
  const oldLoadWorld=loadWorld;
  loadWorld=function(){
    if(worldChapter!==chapterIndex){routeMeshes=[];routeKey='';routeOrigin={x:999,z:999};}
    oldLoadWorld();
    const ladder=points.find(p=>p.kind==='ladder');if(ladder){ladder.x=player.room?23:2;ladder.z=player.room?-9:-4;ladder.tr=[player.room?'Merdiven · Dama dön':'Merdiven · Eve in'];}
  };
  const oldSetup=setupGuidance;
  setupGuidance=function(){
    oldSetup();$('route-help').onclick=()=>{routeShown=!routeShown;$('route-help').textContent=routeShown?'Rotayı gizle':'Rotayı göster';if(!routeShown)routeMeshes.forEach(o=>o.visible=false);};
  };
  boot();
})();

