/* Ancient Antalya · Lost Records. Static browser game. World dimensions are in metres. */
(() => {
  "use strict";

  const CDN = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
  const UNESCO = "https://whc.unesco.org/en/tentativelists/5411/";
  const MINISTRY = "https://kvmgm.ktb.gov.tr/Eklenti/91304%2Cantalya-perge-archaeological-sitepdf.pdf?0=";
  const copy = {
    en: {
      series: "JOURNEY THROUGH ANCIENT ANTALYA", district: "PERGE · PAMPHYLIA",
      intro: "Walk through Perge’s round-towered gate and follow the city’s ancient watercourse. Record discoveries along the way and put your field notes to the test.",
      start: "New expedition", resume: "Continue expedition", levels: "Level selection", settings: "Settings",
      back: "Back", menu: "Main menu", pause: "Expedition paused", quiz: "Field quiz", complete: "Complete chapter",
      finish: "All four discoveries are in your journal. You completed the Perge expedition.",
      controls: "WASD to move · mouse to look · Shift to sprint · E to inspect · Esc to pause",
      mobile: "Left stick to move · drag on the right to look · hold Sprint to run",
      locked: "Stage 1 includes Perge. Side and Aspendos are planned for later stages.",
      language: "Language", graphics: "Graphics", sound: "Ambient sound", auto: "Adaptive",
      low: "Low", medium: "Medium", high: "High", on: "On", off: "Off",
      inspect: "Inspect", sprint: "Sprint", discoveries: "discoveries", recorded: "Recorded in your journal",
      journal: "Field journal", next: "Next question", retry: "Try again", return: "Return to exploration",
      focus: "Click to capture the mouse. You can also drag to look.",
      quizReady: "All discoveries recorded. Open the field quiz.",
      wrong: "Read the field note below and try again.", correct: "Correct.",
      source: "Historical source", restart: "Replace your current expedition?", cancel: "Cancel",
      unavailable: "Perge could not start. Check your connection and your browser’s WebGL support, then reload.",
      lost: "The browser lost its graphics context. Reload the page to continue from your last saved position.",
      answer: "Answer the questions using your discoveries.", reload: "Reload", pauseLabel: "Pause",
    },
    tr: {
      series: "ANTİK ANTALYA’DA YOLCULUK", district: "PERGE · PAMPHYLIA",
      intro: "Perge’nin yuvarlak kuleli kapısından geç ve antik su yolunu takip et. Keşiflerini günlüğe kaydet, sonra notlarınla bilgini sına.",
      start: "Yeni keşif", resume: "Keşfe devam et", levels: "Bölüm seçimi", settings: "Ayarlar",
      back: "Geri", menu: "Ana menü", pause: "Keşif duraklatıldı", quiz: "Bilgi sınavı", complete: "Bölümü tamamla",
      finish: "Dört keşif de günlüğünde. Perge gezisini tamamladın.",
      controls: "WASD ile yürü · fareyle bak · Shift ile koş · E ile incele · Esc ile duraklat",
      mobile: "Soldaki çubukla yürü · sağa dokunup sürükleyerek bak · Koş düğmesini basılı tut",
      locked: "İlk aşamada Perge oynanabilir. Side ve Aspendos sonraki aşamalar için planlandı.",
      language: "Dil", graphics: "Grafik", sound: "Ortam sesi", auto: "Uyarlanabilir",
      low: "Düşük", medium: "Orta", high: "Yüksek", on: "Açık", off: "Kapalı",
      inspect: "İncele", sprint: "Koş", discoveries: "keşif", recorded: "Günlüğüne kaydedildi",
      journal: "Keşif günlüğü", next: "Sonraki soru", retry: "Tekrar dene", return: "Keşfe dön",
      focus: "Fareyi yakalamak için tıkla. Sürükleyerek de bakabilirsin.",
      quizReady: "Tüm keşifler kaydedildi. Bilgi sınavını aç.",
      wrong: "Aşağıdaki notu oku ve tekrar dene.", correct: "Doğru.",
      source: "Tarihî kaynak", restart: "Mevcut keşif kaydının üzerine yazılsın mı?", cancel: "Vazgeç",
      unavailable: "Perge başlatılamadı. İnternet bağlantını ve tarayıcının WebGL desteğini kontrol edip sayfayı yenile.",
      lost: "Tarayıcı grafik bağlantısını kaybetti. Son kaydedilen noktadan sürdürmek için sayfayı yenile.",
      answer: "Soruları keşiflerinden yararlanarak yanıtla.", reload: "Yenile", pauseLabel: "Duraklat",
    },
  };

  let sites = [
    {
      id: "gate", x: 0, z: 13, source: MINISTRY, answer: 1,
      en: ["Hellenistic Gate", "This southern entrance once guided visitors between two round towers. Türkiye’s Ministry of Culture and Tourism dates the towers to the third century BCE. Look for the curved courses of stone on both sides of the passage.", "Which feature distinguishes the Hellenistic Gate?", ["A semicircular auditorium", "Two round towers", "An underground cistern"]],
      tr: ["Helenistik Kapı", "Güneydeki bu girişte ziyaretçiler iki yuvarlak kulenin arasından geçerdi. Kültür ve Turizm Bakanlığı kuleleri MÖ 3. yüzyıla tarihlendiriyor. Geçidin iki yanındaki kavisli taş sıralarına bak.", "Helenistik Kapı’nın ayırt edici özelliği hangisidir?", ["Yarım daire biçimli oturma alanı", "İki yuvarlak kule", "Yer altı sarnıcı"]],
    },
    {
      id: "bath", x: -17, z: -8, source: UNESCO, answer: 2,
      en: ["Southern Baths", "Perge had two large bath complexes. The southern baths occupied a site west of the main axis. Water infrastructure was so prominent in Perge that its baths and monumental fountains are central to how archaeologists describe the city.", "What did Perge have alongside its monumental fountains?", ["Two harbours", "Two theatres", "Two bath complexes"]],
      tr: ["Güney Hamamı", "Perge’de iki büyük hamam kompleksi vardı. Güney Hamamı ana eksenin batısında yer alıyordu. Hamamlar ve anıtsal çeşmeler, Perge’nin su altyapısının kent yaşamındaki önemini gösteriyor.", "Perge’nin anıtsal çeşmelerinin yanında hangi yapılar bulunuyordu?", ["İki liman", "İki tiyatro", "İki hamam kompleksi"]],
    },
    {
      id: "street", x: 3.4, z: -35, source: UNESCO, answer: 0,
      en: ["Colonnaded Street", "This avenue formed a north–south axis in the lower city. A long channel ran down its centre, between the two sides of the street. Follow the channel north and notice how paving, water and columns shape the route.", "Where did the water channel run?", ["Down the centre of the avenue", "Outside the city walls", "Only under the southern gate"]],
      tr: ["Sütunlu Cadde", "Bu cadde aşağı kentin kuzey-güney eksenini oluşturuyordu. Uzun bir su kanalı caddenin ortasından geçiyordu. Kanalı kuzeye doğru takip ederken taş döşemenin, suyun ve sütunların yolu nasıl biçimlendirdiğine bak.", "Su kanalı nereden geçiyordu?", ["Caddenin ortasından", "Kent surlarının dışından", "Yalnızca güney kapısının altından"]],
    },
    {
      id: "fountain", x: 3, z: -85, source: MINISTRY, answer: 2,
      en: ["Northern Monumental Fountain", "The north–south street extended from the gate toward a monumental fountain. Perge had four monumental fountains. In this scene you can trace the connection between the fountain basin and the channel that marks the avenue.", "How many monumental fountains did Perge have?", ["One", "Two", "Four"]],
      tr: ["Kuzey Anıtsal Çeşmesi", "Kuzey-güney doğrultusundaki cadde, kapıdan anıtsal bir çeşmeye uzanıyordu. Perge’de dört anıtsal çeşme vardı. Burada çeşme havuzu ile caddeyi belirleyen kanal arasındaki bağlantıyı takip edebilirsin.", "Perge’de kaç anıtsal çeşme vardı?", ["Bir", "İki", "Dört"]],
    },
  ];
  sites[1].locationSource = "https://etd.lib.metu.edu.tr/upload/12604724/index.pdf";

  const $ = id => document.getElementById(id);
  const touch = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem("perge:" + key)) ?? fallback; }
    catch { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem("perge:" + key, JSON.stringify(value)); }
    catch { /* The current session still works when storage is blocked. */ }
  };
  const prefs = { language: "tr", graphics: "auto", sound: true, ...read("settings", {}) };
  // Apply the Turkish edition once, including existing English installations.
  if (prefs.languageRevision !== 2) {
    prefs.language = "tr";
    prefs.languageRevision = 2;
    write("settings", prefs);
  }
  if (!copy[prefs.language]) prefs.language = "tr";
  if (!["auto", "low", "medium", "high"].includes(prefs.graphics)) prefs.graphics = "auto";
  const t = key => copy[prefs.language][key];
  const label = site => site[prefs.language][0];
  const start = { x: 0, z: 24, yaw: 0, pitch: 0, found: [], complete: false };
  let record = read("save", null);
  if (record && (!Array.isArray(record.found) || ![record.x,record.z,record.yaw,record.pitch].every(Number.isFinite))) record = null;
  let player = structuredClone(start);
  let state = "loading";
  let THREE, camera, renderer, scene, sun, water, markers, project, forward, north, pillars;
  let previous = 0, saveElapsed = 0, activeSite = null;
  let quality = 1, frameTotal = 0, frameCount = 0, fastWindows = 0;
  let audio, ambience, audioGain;
  let question = 0, chosen = null;
  let seed = 48109;


  const pergeSites = sites;
  const sideSource = "https://goturkiye.com/culturaljourneys/side";
  const theatreSource = "https://whc.unesco.org/en/tentativelists/6036/";
  const pair = (tr,en) => prefs.language==="tr"?tr:en;
  function landmark(id,x,z,tr,en,source,answer=0) {
    return {id,x,z,tr,en,source,answer};
  }
  const chapters = [
    {name:"Perge",title:["Kayıp şehir kaydı","The lost city record"],sites:pergeSites,
      story:["Genç bir araştırmacı olarak üç kentin eksik tarihî kayıtlarını birleştirmekle görevlendirildin. Rehber Deniz, Perge’nin girişinde seni bekliyor. Yapıları yerinde gözlemle, kanıtları karşılaştır ve dört kayıt parçasını tamamla.",
      "As a young researcher, you must piece together the missing records of three cities. Your guide Deniz awaits at Perge’s entrance. Observe the structures, compare evidence and recover four record fragments."]},
    {name:"Side",title:["Limanın sırrı","The harbour secret"],story:["Perge kaydı tamamlandı. Side’deki eksik kayıt, liman ile kentin yaşamı arasındaki ilişkiyi anlatıyor. Deniz’le kıyıya, tapınağa ve agora çevresine git.",
      "The Perge record is complete. Side’s missing record connects its harbour with city life. Join Deniz at the shore, temple and agora."],sites:[
      landmark("harbour",-17,7,["Antik liman","Side, Akdeniz kıyısında bir yarımada üzerinde gelişen liman kentiydi. Deniz bağlantısı kentin ticaretinde önemliydi. Buradaki yük örnekleri görev için hazırlanmış temsillerdir.","Limanın kent yaşamındaki temel rolü neydi?",["Deniz ulaşımı ve ticaret","Seyirci oturma alanı","Kentin savunma kulesi"]],
      ["Ancient harbour","Side grew as a port city on a Mediterranean peninsula. Maritime connections mattered to its trade. The cargo examples here are educational representations.","What was the harbour’s main role?",["Maritime transport and trade","Spectator seating","A defensive tower"]],sideSource),
      landmark("apollo",12,-24,["Apollon Tapınağı","Kıyıya yakın Apollon Tapınağı, Side’nin tanınan anıtlarındandır. Sütunlar ve üstteki yatay mimari parçalar tapınak düzenini anlamamıza yardım eder.","Hangi yapı burada dinî yaşamı temsil eder?",["Apollon Tapınağı","Yük iskelesi","Su kanalı"]],
      ["Temple of Apollo","The coastal Temple of Apollo is a recognisable Side monument. Its columns and horizontal entablature help reveal the temple’s architectural arrangement.","Which structure represents religious life here?",["Temple of Apollo","Cargo quay","Water channel"]],sideSource),
      landmark("agora",0,-60,["Ticaret agorası","Agoralar ticaret ve toplumsal buluşmaların gerçekleştiği açık meydanlardı. Side’de ticaret agorası bulunur. Meydanı çevreleyen dükkân düzeni, alışveriş ile ortak yaşamı ilişkilendirir.","Agorada hangi faaliyetler bir araya gelirdi?",["Ticaret ve toplumsal buluşma","Yalnızca gemi yapımı","Yalnızca tiyatro gösterisi"]],
      ["Commercial agora","Agoras were open spaces for trade and social contact. Side had a commercial agora. Shops around a square connect exchange with shared urban life.","What activities met in the agora?",["Trade and social contact","Only shipbuilding","Only theatre performances"]],
      "https://turkishmuseums.kprod.kultur.gov.tr/Uploads/M%C3%BCze/Dosya/005fc55a-3cb4-4a27-8198-9c117b6afb71.pdf")
    ]},
    {name:"Aspendos",title:["Tiyatronun hikâyesi","The theatre’s story"],story:["Son kayıt Aspendos Tiyatrosu’nda. Deniz, seyircilerin oturduğu bölüm ile sahne yapısının birlikte nasıl çalıştığını araştırmanı istiyor. Yapıyı gözlemle ve kullanımını açıklayan son kaydı tamamla.",
      "The final record lies at Aspendos Theatre. Deniz asks you to investigate how the audience area and stage building work together. Observe the architecture and complete its story."],sites:[
      landmark("cavea",0,-29,["Seyirci bölümü · cavea","Aspendos’un yarım daire biçimli seyirci bölümü cavea olarak adlandırılır. Büyük kısmı akropolis yamacına dayanır. Yükselen sıralar seyircileri sahneye yönlendirir.","Cavea hangi bölümdür?",["Seyircilerin oturduğu bölüm","Sahne arkasındaki depo","Limanın yük alanı"]],
      ["Audience area · cavea","The semicircular spectator area at Aspendos is called the cavea. Much of it rests on the acropolis slope. Rising rows orient the audience toward the stage.","What is the cavea?",["The spectators’ seating area","A backstage store","A harbour cargo area"]],theatreSource),
      landmark("stage",8,-13,["Sahne yapısı","Çok katlı sahne binası, yarım daire seyirci bölümüyle bütünleşir. Tiyatro, gösterilerin izlenmesi için düzenlenmiş bir kamusal yapıdır. Sahne ile seyirci alanı farklı işlevlere sahiptir.","Bir gösteride doğru yerleşim hangisidir?",["Oyuncular sahnede, seyirciler caveada","Seyirciler sahnede, oyuncular limanda","Herkes sahne arkasında"]],
      ["Stage building","The multi-storey stage building forms an architectural whole with the semicircular seating. The theatre is a public setting for performances. Stage and audience areas serve different functions.","Which arrangement fits a performance?",["Performers on stage, audience in the cavea","Audience on stage, performers at the harbour","Everyone backstage"]],theatreSource),
      landmark("inscription",-17,-8,["Yapının zaman çizgisi","Tiyatro MS 160–180 arasında, Marcus Aurelius döneminde inşa edildi. Yazıt mimarı Theodoros’un oğlu Zenon olarak kaydeder. Yapı 13. yüzyılda Selçuklu döneminde onarılarak saray olarak da kullanıldı.","Hangi sıra doğrudur?",["Roma inşası → Selçuklu onarımı","Selçuklu onarımı → Roma inşası","İki olay aynı dönemde"]],
      ["Architectural timeline","The theatre was built in AD 160–180 under Marcus Aurelius. An inscription names Zenon, son of Theodorus, as architect. In the thirteenth century it was restored and also reused as a Seljuk palace.","Which sequence is correct?",["Roman construction → Seljuk restoration","Seljuk restoration → Roman construction","Both in the same period"]],theatreSource)
    ]}
  ];
  // Evidence positions are physical observation stations, not collectible antiquities.
  const evidence = [
    [
      [[-1.5,9,"Batı kulesinin kavisli taş sıraları","Curved masonry of the west tower"],[1.5,9,"Doğu kulesinin kavisli taş sıraları","Curved masonry of the east tower"]],
      [[-22.5,-15,"Kemerli geçitle bağlanan hamam odaları","Bath rooms connected by an arch"],[-22.5,-25,"Hamamın iç mekân düzeni","Interior arrangement of the baths"]],
      [[3,-27,"Cadde boyunca uzanan orta kanal","Central channel along the street"],[3,-49,"Kanalın üstünden geçen taş geçiş","Stone crossing over the channel"]],
      [[-4,-86,"Çeşme havuzunun taş sınırı","Stone edge of the fountain basin"],[3,-81,"Havuzdan caddeye uzanan kanal","Channel from basin toward avenue"]]
    ],
    [
      [[-25,4,"Kıyıya yanaşma alanı","Landing area at the shore"],[-18,-2,"Yüklerin taşınacağı kent yolu","Route carrying cargo into the city"]],
      [[9,-21,"Sütun tabanlarını gözlemle","Observe column bases"],[17,-21,"Sütunların taşıdığı üst yapıyı incele","Inspect the entablature above the columns"]],
      [[-8,-57,"Meydanı çevreleyen dükkânlar","Shops surrounding the square"],[8,-57,"Ortak buluşma alanı","Shared gathering space"]]
    ],
    [
      [[-8,-32,"Yükselen yarım daire oturma sıraları","Rising semicircular seating"],[8,-32,"Sıraların sahneye baktığı yön","Direction of the rows toward the stage"]],
      [[-7,-13,"Gösteri alanının sahneye bağlantısı","Performance area facing the stage"],[7,-23,"Sahne ile seyirci alanını karşılaştır","Compare stage and audience areas"]],
      [[-22,-8,"Roma dönemi inşa kartı · MS 160–180","Roman construction card · AD 160–180"],[-14,-7,"Selçuklu onarım kartı · 13. yüzyıl","Seljuk restoration card · 13th century"]]
    ]
  ];
  const puzzles = [
    [
      ["Kapı kaydını tamamlamak için gözlemlediğin iki yapıyı eşleştir.","Match the two structures you observed to complete the gate record.",["Yuvarlak kule + yuvarlak kule","Sahne + oturma sırası","İskele + dükkân"],["Round tower + round tower","Stage + seating","Quay + shop"],0],
      ["Hamam odalarını kentteki hangi sistemle ilişkilendirirsin?","Which city system would you connect with the bath rooms?",["Liman yükleri","Su altyapısı","Tiyatro sıraları"],["Harbour cargo","Water infrastructure","Theatre seating"],1],
      ["Yürüdüğün güzergâhın düzenini kayda geçir.","Record the arrangement of the route you walked.",["Kanal merkezde, yollar iki yanında","Kanal surların dışında","Kanal kulelerin tepesinde"],["Channel in the centre, paths on both sides","Channel outside the walls","Channel above the towers"],0],
      ["Su kaydındaki eksik bağlantıyı tamamla.","Complete the missing connection in the water record.",["Çeşme havuzu → cadde kanalı","Çeşme → tiyatro sahnesi","Çeşme → açık deniz"],["Fountain basin → street channel","Fountain → theatre stage","Fountain → open sea"],0]
    ],
    [
      ["Bir yükün limandan kente yolculuğunu sırala.","Put a cargo’s journey into order.",["Kent yolu → gemi → kıyı","Gemi → kıyı → kent yolu","Kıyı → açık deniz → tapınak"],["City route → ship → shore","Ship → shore → city route","Shore → open sea → temple"],1],
      ["Tapınağın taşıyıcı düzenini aşağıdan yukarıya kur.","Arrange the temple’s support structure from bottom to top.",["Üst yapı → taban → sütun","Taban → sütun → üst yapı","Sütun → üst yapı → taban"],["Entablature → base → column","Base → column → entablature","Column → entablature → base"],1],
      ["Liman ve agora gözlemlerini tek kayıtta birleştir.","Combine your harbour and agora observations.",["Liman denizle, agora kentteki alışverişle ilişkilidir","Agora gemilerin açık denizdeki rotasıdır","Liman yalnızca seyirci alanıdır"],["The harbour connects to the sea; the agora to urban exchange","The agora is a shipping route at sea","The harbour is only a seating area"],0]
    ],
    [
      ["Gözlemlediğin sıralara uygun seyirci yönünü seç.","Choose the audience orientation that matches the rows.",["Sahneye doğru","Sahneden uzağa","Kentin limanına doğru"],["Toward the stage","Away from the stage","Toward the harbour"],0],
      ["Gösteri hazırlığı yap. Seyircileri ve oyuncuları doğru bölümlere yerleştir.","Prepare a performance. Place audience and performers in the correct areas.",["Seyirciler caveada, oyuncular sahnede","Seyirciler sahne arkasında, oyuncular kulede","İkisi de limanda"],["Audience in the cavea, performers on stage","Audience backstage, performers in a tower","Both at the harbour"],0],
      ["İki tarih kartını eskiden yeniye sırala.","Arrange the two date cards from earlier to later.",["13. yüzyıl → MS 160–180","MS 160–180 → 13. yüzyıl","İkisi de MÖ 3. yüzyıl"],["13th century → AD 160–180","AD 160–180 → 13th century","Both in the 3rd century BCE"],1]
    ]
  ];
  chapters.forEach((chapter,ci)=>chapter.sites.forEach((site,si)=>{
    site.puzzle=puzzles[ci][si];
    site.clues=evidence[ci][si].map((item,i)=>({
      id:site.id+"-"+i, parent:site.id, x:item[0],z:item[1],
      tr:[item[2]],en:[item[3]],kind:"clue"
    }));
  }));
  let campaign=read("campaign",null);
  if(!campaign || campaign.version!==2 || !Array.isArray(campaign.chapters)) {
    campaign={version:2,chapter:0,unlocked:0,chapters:[]};
    if(record) campaign.chapters[0]={...record,legacy:record.found,found:[],observed:[],accepted:[],complete:false};
  }
  campaign.unlocked=Math.max(0,Math.min(2,Number(campaign.unlocked)||0));
  let chapterIndex=Math.max(0,Math.min(campaign.unlocked,Number(campaign.chapter)||0));
  let worldChapter=-1;
  let points=[];
  const guidePoint={id:"guide",x:3,z:22,kind:"guide",tr:["Rehber Deniz"],en:["Guide Deniz"]};
  function chapterState(index) {
    const value=campaign.chapters[index]||{};
    const result={...structuredClone(start),...value};
    for(const key of ["found","observed","accepted","legacy"])result[key]=Array.isArray(value[key])?value[key]:[];
    for(const key of ["x","z","yaw","pitch"])if(!Number.isFinite(result[key]))result[key]=start[key];
    result.found=result.found.filter(id=>chapters[index].sites.some(s=>s.id===id));
    return result;
  }
  sites=chapters[chapterIndex].sites;
  record=campaign.chapters[chapterIndex]?chapterState(chapterIndex):null;
  player=chapterState(chapterIndex);


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
    if (x < -36 || x > 36 || z < -99 || z > 29) return true;
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

  function terrainY(x, z) {
    if(chapterIndex!==0)return 0;
    const outer = Math.min(1, Math.max(0, (Math.abs(x)-9)/21));
    return outer * (.22 * Math.sin(x*.37+z*.23) + .21 * Math.sin(z*.39));
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
  function buildWorld() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#b8d4d7");
    scene.fog = new THREE.FogExp2("#c7d5cb", .0081);
    camera = new THREE.PerspectiveCamera(68, 1, .07, 430);
    camera.rotation.order = "YXZ";
    project = new THREE.Vector3();
    forward = new THREE.Vector3();
    north = new THREE.Vector3(0,0,-1);

    const hemi = new THREE.HemisphereLight("#e6f3fd","#716149",2.05);
    sun = new THREE.DirectionalLight("#fff0cb",2.45);
    sun.position.set(-39,62,2);
    sun.target.position.set(0,0,-39);
    Object.assign(sun.shadow.camera,{left:-65,right:65,top:72,bottom:-72,near:1,far:160});
    sun.shadow.normalBias=.045;
    sun.shadow.bias=-.00015;
    scene.add(hemi,sun,sun.target);

    const colors = {
      stone: new THREE.MeshStandardMaterial({map:texture("stone"),roughness:.94}),
      earth: new THREE.MeshStandardMaterial({map:texture("earth"),roughness:1}),
      leaf: new THREE.MeshStandardMaterial({roughness:1}),
      wood: new THREE.MeshStandardMaterial({roughness:1}),
      hill: new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),
    };
    colors.earth.map.repeat.set(30,55);
    const batches = new Map();
    const box = new THREE.BoxGeometry();
    const drum = new THREE.CylinderGeometry(1,1,1,16);
    const taper = new THREE.CylinderGeometry(.83,1,1,16);
    const cone = new THREE.CylinderGeometry(.13,1,1,9);
    const rock = new THREE.IcosahedronGeometry(1,1);
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    function piece(geometry, material, x,y,z, sx,sy,sz, color, ry=0, rz=0, cast=true) {
      const key = geometry.id+":"+material.id+":"+cast;
      if (!batches.has(key)) batches.set(key,{geometry,material,cast,items:[]});
      dummy.position.set(x,y,z);
      dummy.scale.set(sx,sy,sz);
      dummy.rotation.set(0,ry,rz);
      dummy.updateMatrix();
      batches.get(key).items.push([dummy.matrix.clone(),color]);
    }
    const ash = ["#f7e5cb","#dcc8ac","#c8b491","#e9dac3","#d4c6ac","#b7a68a"];
    const moss = ["#566442","#68754b","#767b48","#414f34","#859061"];
    const sample = array => array[Math.floor(random()*array.length)];
    function stone(x,y,z,w,h,d,rot=0,casting=true) {
      piece(box,colors.stone,x,y,z,w,h,d,sample(ash),rot,0,casting);
    }

    const land = new THREE.PlaneGeometry(90,154,90,148);
    land.rotateX(-Math.PI/2);
    land.translate(0,-.065,-34);
    const vertices=land.attributes.position;
    for(let i=0;i<vertices.count;i++) vertices.setY(i,terrainY(vertices.getX(i),vertices.getZ(i))-.065);
    land.computeVertexNormals();
    const ground = new THREE.Mesh(land,colors.earth);
    ground.receiveShadow=true;
    scene.add(ground);

    const horizon = new THREE.PlaneGeometry(660,630,85,80);
    horizon.rotateX(-Math.PI/2);
    horizon.translate(0,-.6,-85);
    const hills = horizon.attributes.position;
    const shades=[];
    for(let i=0;i<hills.count;i++) {
      const x=hills.getX(i), z=hills.getZ(i);
      const distance=Math.max(0,Math.abs(x)-43,-110-z,z-42);
      const amplitude=Math.min(1,distance/54);
      const height=amplitude*(5+8*Math.sin(x*.026+z*.018)**2+24*Math.exp(-((z+166-Math.cos(x*.014)*30)**2)/1700));
      hills.setY(i,height-.61);
      tint.set("#879268").lerp(new THREE.Color("#6b8b87"),Math.min(1,height/32));
      shades.push(tint.r,tint.g,tint.b);
    }
    horizon.setAttribute("color",new THREE.Float32BufferAttribute(shades,3));
    horizon.computeVertexNormals();
    scene.add(new THREE.Mesh(horizon,colors.hill));

    // Staggered masonry courses. Each wall has a matching collision footprint.
    function wall(x1,z1,x2,z2,height,depth,ruin=true,base=0,solid=true) {
      const span = Math.hypot(x2-x1,z2-z1);
      const count = Math.max(1,Math.ceil(span/1.05));
      const horizontal = z1===z2;
      const course=.42;
      for(let row=0;row<Math.ceil(height/course);row++) {
        for(let i=0;i<count+(row%2);i++) {
          const from=Math.max(0,(i-(row%2)*.5)/count);
          const to=Math.min(1,(i+1-(row%2)*.5)/count);
          if(ruin && row*course>height*.62 && random()<.27) continue;
          const t=(from+to)/2;
          const x=x1+(x2-x1)*t, z=z1+(z2-z1)*t;
          const y=base+terrainY(x,z)+(row+.5)*course;
          const length=(to-from)*span-.022;
          if(length>0) stone(x,y,z,horizontal?length:depth,course-.02,horizontal?depth:length);
        }
      }
      if(solid) collider((x1+x2)/2,(z1+z2)/2,horizontal?span/2:depth/2,horizontal?depth/2:span/2);
    }

    for(const x of [-5.3,5.3]) {
      const z=9, radius=3.24;
      piece(drum,colors.stone,x,.22,z,radius+.14,.46,radius+.14,"#b5a186");
      for(let row=0;row<15;row++) {
        const ring=25;
        for(let i=0;i<ring;i++) {
          const a=(i+(row%2)*.5)*Math.PI*2/ring;
          const height=11.8+1.7*Math.sin(a+x)+1.4*Math.cos(a*2-.7);
          if(row>height || (row>10 && random()<.12)) continue;
          piece(box,colors.stone,x+Math.cos(a)*2.95,.38+(row+.5)*.46,z+Math.sin(a)*2.95,
            .63,.435,.77,sample(ash),-a);
        }
      }
      collider(x,z,radius+.13,radius+.13,radius+.13);
    }
    wall(-36,9,-8.05,9,2.4,1.35);
    wall(8.05,9,36,9,2.1,1.35);
    wall(-36,-99,-36,29,1.1,1.1);
    wall(36,-99,36,29,1.1,1.1);
    wall(-36,-99,36,-99,1.5,1.1);
    wall(-36,29,-3,29,1.1,1.1);
    wall(3,29,36,29,1.1,1.1);
    // A closed site barrier makes the southern simulation boundary visible.
    for(let i=0;i<7;i++) {
      const x=-3+i;
      piece(box,colors.wood,x,.53,29,.12,1.12,.12,"#55432a");
    }
    piece(box,colors.wood,0,.58,29,6,.15,.14,"#55432a");

    const column = (x,z,height) => {
      const base=terrainY(x,z);
      stone(x,base+.10,z,1.07,.2,1.03);
      stone(x,base+.25,z,.87,.13,.87);
      piece(drum,colors.stone,x,base+.36,z,.46,.12,.46,"#e7d3b4");
      const count=Math.max(1,Math.ceil(height/.78));
      for(let i=0;i<count;i++) {
        const r=.373-i*.009;
        piece(i===count-1?taper:drum,colors.stone,x,base+.42+(i+.5)*height/count,z,r,height/count-.017,r,sample(ash));
      }
      if(height>2.7) {
        const y=base+.42+height;
        piece(drum,colors.stone,x,y+.06,z,.40,.13,.4,"#cbb596");
        piece(taper,colors.stone,x,y+.22,z,.40,.21,.4,"#efddbf");
        stone(x,y+.39,z,.93,.17,.9);
        for(let i=0;i<8;i++) {
          const a=i*Math.PI/4;
          piece(rock,colors.stone,x+.37*Math.cos(a),y+.27,z+.37*Math.sin(a),.12,.18,.12,"#f8e6cd",a);
        }
      }
      collider(x,z,.54,.52);
    };

    for(let z=21;z>-96;z-=1.52) {
      const canal=z<-15 && z>-91 && Math.abs(z+47)>2.2 && Math.abs(z+69)>2.2;
      for(let i=-5;i<=5;i++) {
        if(i===0 && canal) continue;
        const x=i*1.18 + (i===0?0:(Math.sign(i)*.08));
        stone(x,.012,z+(i%2)*.23,1.13,.13,1.48,(random()-.5)*.026,false);
      }
      if(canal) for(const x of [-.65,.65]) {
        stone(x,.075,z,.23,.20,1.49,0,false);
        collider(x,z,.115,.74);
      }
    }
    // Channel spans end at paved cross streets.
    water = [];
    for(const [a,b] of [[-17,-44.4],[-49.8,-66.5],[-72,-90.8]]) {
      collider(0,(a+b)/2,.63,Math.abs(a-b)/2);
      water.push(makeWater(0,(a+b)/2,1.04,Math.abs(a-b),.063));
    }

    for(const side of [-1,1]) {
      for(let i=0;i<23;i++) {
        if([0,9,10,14,15].includes(i)) continue;
        const z=-11-i*3.55;
        const height=random()<.3 ? .4+random()*1.6 : 3.8+random()*.22;
        column(side*7,z,height);
        if(i%3===0 && height<2) {
          const x=side*9;
          piece(drum,colors.stone,x,.37,z,.39,1.06,.39,sample(ash),.2,Math.PI/2);
          collider(x,z,.53,.39);
        }
      }
      for(let i=0;i<9;i++) {
        const z=-22-i*7.1;
        const x=side*13.7;
        if(side===-1 && i<3) continue;
        wall(x,z-2.25,x,z+2.25,.6+random()*1.19,.68);
        wall(Math.min(x,x+side*4),z-2.25,Math.max(x,x+side*4),z-2.25,1.05,.7);
      }
    }

    // Bath rooms have walkable openings beneath stone arches.
    function arch(x,z,width,height,depth) {
      const spring=height-width/2;
      for(const side of [-1,1]) wall(x+side*(width/2+.23)-.23,z,x+side*(width/2+.23)+.23,z,spring,.92,false);
      for(let i=0;i<15;i++) {
        const angle=(i+.5)*Math.PI/15;
        const radius=width/2+.24;
        piece(box,colors.stone,x+Math.cos(angle)*radius,spring+Math.sin(angle)*radius,z,
          .49,2*radius*Math.sin(Math.PI/30)+.029,depth,sample(ash),0,angle);
      }
    }
    wall(-30,-29,-30,-12,3.3,1.35);
    wall(-30,-29,-12,-29,3.9,1.25);
    wall(-12,-29,-12,-15,2.5,1.15);
    wall(-30,-12,-25,-12,3.0,1.1);
    wall(-20,-12,-12,-12,2.9,1.1);
    arch(-22.5,-12,4.2,4.6,1.17);
    arch(-22.5,-22,4.8,4.9,1.38);
    wall(-30,-22,-25.45,-22,3.1,1.1);
    wall(-19.55,-22,-12,-22,3.65,1.1);
    for(let i=0;i<10;i++) for(let j=0;j<8;j++) {
      const x=-28.8+i*1.7,z=-13-j*1.9;
      stone(x,terrainY(x,z)-.01,z,1.65,.11,1.84,0,false);
    }
    for(const x of [-27,-16]) for(const z of [-16,-25.9]) column(x,z,1.45);

    // Nymphaeum facade and a low rectangular basin.
    wall(-9,-96,9,-96,4.4,1.2);
    for(const x of [-6,-2,2,6]) column(x,-94.9,3);
    for(const x of [-5,0,5]) arch(x,-95.1,2.35,3,1.05);
    wall(-7,-93,-7,-88, .48,.45,false);
    wall(7,-93,7,-88, .48,.45,false);
    wall(-7,-88,-1,-88, .48,.45,false);
    wall(1,-88,7,-88, .48,.45,false);
    collider(0,-91,6.8,2.8);
    water.push(makeWater(0,-91,13.55,5.55,.16));

    // Olive and cypress silhouettes, scrub and rubble sit on the terrain.
    function tree(x,z,cypress,solid) {
      const y=terrainY(x,z);
      const size=.8+random()*.65;
      piece(taper,colors.wood,x,y+size,z,.22*size,2*size,.20*size,"#61543a",0,random()*.17);
      if(cypress) {
        for(let j=0;j<4;j++) {
          const r=(1-j*.17)*size;
          piece(cone,colors.leaf,x,y+(2.3+j*.86)*size,z,r,2.3*size,r,sample(moss),j*.44);
        }
      } else {
        for(let j=0;j<7;j++) {
          const a=j*2.39, r=j===0?0:size*(.68+random()*.75);
          piece(rock,colors.leaf,x+Math.cos(a)*r,y+(2.3+random()*.91)*size,z+Math.sin(a)*r,
            size*(1+random()*.39),size*.69,size*(1+random()*.37),sample(moss),a);
        }
      }
      if(solid) collider(x,z,.28*size,.28*size,.28*size);
    }
    for(let i=0;i<70;i++) {
      const side=i%2?1:-1;
      const x=side*(20+random()*23),z=25-random()*136;
      if(x<0 && z<-9 && z>-32) continue;
      if(x>0 && z<-17 && z>-83 && x<23) continue;
      if(Math.abs(z-9)<2) continue;
      tree(x,z,i%4===0,Math.abs(x)<36 && z>-99);
    }
    for(let i=0;i<34;i++) tree((random()-.5)*143,-102-random()*16,i%3===0,false);
    for(let i=0;i<730;i++) {
      const x=(random()-.5)*71,z=28-random()*126;
      if(Math.abs(x)<8 || (x>-31 && x<-11 && z<-10 && z>-30) || Math.abs(z-9)<1.4) continue;
      const r=.11+random()*.51, y=terrainY(x,z);
      if(i%5===0) {
        piece(rock,colors.stone,x,y+r*.18,z,r,r*.41,r*.73,sample(ash),random()*6);
        if(r>.34) collider(x,z,r,r*.74);
      } else {
        piece(rock,colors.leaf,x,y+.11,z,r,.21+r*.3,r*.7,sample(moss),random()*6,0,false);
        if(i%7===0) piece(cone,colors.leaf,x,y+.28,z,.06,.53,.06,"#b6aa65",0,.23,false);
      }
    }

    for(const {geometry,material,items,cast} of batches.values()) {
      const mesh = new THREE.InstancedMesh(geometry,material,items.length);
      for(let i=0;i<items.length;i++) {
        mesh.setMatrixAt(i,items[i][0]);
        mesh.setColorAt(i,tint.set(items[i][1]));
      }
      mesh.castShadow=cast;
      mesh.receiveShadow=true;
      mesh.computeBoundingSphere();
      scene.add(mesh);
    }
    markers=sites.map(site => {
      const marker = new THREE.Mesh(new THREE.OctahedronGeometry(.25),new THREE.MeshStandardMaterial({
        color:"#ffda88",emissive:"#bc7628",emissiveIntensity:.65,roughness:.43,
      }));
      marker.position.set(site.x,1.43+terrainY(site.x,site.z),site.z);
      scene.add(marker);
      return marker;
    });
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
    window.speechSynthesis?.cancel();
    document.documentElement.lang=prefs.language;
    document.title=t("series")+" · "+chapters[chapterIndex].name;
    $("pause").setAttribute("aria-label",t("pauseLabel"));
    if(document.pointerLockElement) document.exitPointerLock();
    $("overlay").hidden=false; $("hud").hidden=true;
    $("tag").textContent=t("series"); $("title").textContent=title;
    $("body").replaceChildren(); $("actions").replaceChildren();
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
    select("language",[["en","English"],["tr","Türkçe"]],value=>{prefs.language=value;document.documentElement.lang=value;settings(back);});
    select("graphics",["auto","low","medium","high"].map(x=>[x,t(x)]),value=>{prefs.graphics=value;applyQuality();});
    select("sound",[["true",t("on")],["false",t("off")]],value=>{prefs.sound=value==="true";});
    for(const [key,title] of [["musicVolume","Müzik ses seviyesi"],["effectsVolume","Ortam / efekt ses seviyesi"]]){
      const row=document.createElement("label");row.className="setting";row.textContent=title;
      const slider=document.createElement("input");slider.type="range";slider.min=0;slider.max=1;slider.step=.05;slider.value=prefs[key]??(key==="musicVolume"?0:.5);
      slider.oninput=()=>{prefs[key]=Number(slider.value);write("settings",prefs);};row.append(slider);$("body").append(row);
    }
    button("Öğreticiyi tekrar başlat",()=>{tutorial={};write("tutorial",tutorial);play();});
    button(t("back"),back);
  }
  function pause() {
    if(state!=="playing") return;
    save(); show("paused",t("pause"));
    button(t("resume"),play,true);
    button(t("journal"),journal);
    button(t("settings"),()=>settings(()=>{state="playing";pause();}));
    button(t("menu"),menu);
    button("← Haritaya dön",()=>{save();location.href="../harita";});   // Miras. Haritası: haritaya dönüş duraklatma menüsünde (sol üstte ayrı düğme yok)
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
      event.preventDefault();save();show("error","Perge");paragraph(t("lost"));button(t("reload"),()=>location.reload());
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
        if(project.dot(forward)>.3)activeSite=s;
      }
    }
    $("prompt").hidden=!activeSite&&player.found.length<sites.length;
    $("prompt").textContent=activeSite?(touch?"": "E · ")+t("inspect")+" · "+label(activeSite):(touch?"":"E · ")+t("quiz");
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
      camera.position.set(13,8,25);camera.lookAt(0,2,-34);
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
    if(chapterIndex===0)buildWorld();else buildNewCity();
    // Replace the previous landmark pins with mission-aware evidence pins.
    markers.forEach(marker=>{scene.remove(marker);marker.geometry.dispose();marker.material.dispose();});
    points=[guidePoint,...sites,...sites.flatMap(s=>s.clues)];
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
  function buildNewCity() {
    scene=new THREE.Scene();
    scene.background=new THREE.Color(chapterIndex===1?"#a8ced8":"#c5d6d1");
    scene.fog=new THREE.FogExp2(scene.background,.004);
    camera=new THREE.PerspectiveCamera(68,1,.07,430);camera.rotation.order="YXZ";
    project=new THREE.Vector3();forward=new THREE.Vector3();north=new THREE.Vector3(0,0,-1);
    sun=new THREE.DirectionalLight("#ffedc9",2.5);sun.position.set(-35,65,15);
    sun.target.position.set(0,0,-35);
    Object.assign(sun.shadow.camera,{left:-65,right:65,top:80,bottom:-80,near:1,far:180});
    sun.shadow.normalBias=.04;
    scene.add(sun,sun.target,new THREE.HemisphereLight("#eaf6ff","#796547",2));
    const stone=new THREE.MeshStandardMaterial({map:texture("stone"),roughness:.92});
    const earth=new THREE.MeshStandardMaterial({map:texture("earth"),roughness:1});
    earth.map.repeat.set(22,38);
    const foliage=new THREE.MeshStandardMaterial({color:"#6f8051",roughness:1});
    const wood=new THREE.MeshStandardMaterial({color:"#786243",roughness:1});
    const box=new THREE.BoxGeometry(),cylinder=new THREE.CylinderGeometry(1,1,1,16);
    const rock=new THREE.IcosahedronGeometry(1,1);
    const batches=new Map(),dummy=new THREE.Object3D();
    function part(geometry,material,x,y,z,w,h,d,angle=0){
      const key=geometry.id+":"+material.id;
      if(!batches.has(key))batches.set(key,{geometry,material,items:[]});
      dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(0,angle,0);dummy.updateMatrix();
      batches.get(key).items.push(dummy.matrix.clone());
    }
    function block(x,y,z,w,h,d,solid=false,angle=0){
      part(box,stone,x,y,z,w,h,d,angle);
      if(solid)collider(x,z,w/2,d/2);
    }
    function column(x,z,height=5){
      block(x,.13,z,1.1,.26,1.1,true);
      for(let y=.3;y<height;y+=.6)part(cylinder,stone,x,y+.29,z,.38,.57,.38);
      block(x,height+.25,z,1.0,.3,1.0);
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3;
        part(rock,stone,x+Math.cos(a)*.34,height,z+Math.sin(a)*.34,.14,.26,.14);
      }
    }
    function wall(x,z,width,height,depth){
      for(let row=0;row<height/.4;row++)for(let i=0;i<Math.ceil(width);i++)
        block(x-width/2+(i+.5)*width/Math.ceil(width),.2+row*.4,z,width/Math.ceil(width)-.025,.38,depth);
      collider(x,z,width/2,depth/2);
    }
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(72,128),earth);
    floor.rotation.x=-Math.PI/2;floor.position.set(0,-.06,-35);floor.receiveShadow=true;scene.add(floor);
    // Low visitor rails visibly mark the perimeter and the coastal edge.
    for(const x of [-35.5,35.5]){
      for(let z=-98;z<29;z+=4){
        part(cylinder,wood,x,.52,z,.06,1.04,.06);
        part(box,wood,x,.8,z+2,.06,.06,4);
      }
    }
    for(const z of [-98.5,28.5]){
      for(let x=-35;x<36;x+=4){
        part(cylinder,wood,x,.52,z,.06,1.04,.06);
        part(box,wood,x+2,.8,z,4,.06,.06);
      }
    }
    collider(-35.5,-35,.1,64);collider(35.5,-35,.1,64);
    collider(0,-98.5,36,.1);collider(0,28.5,36,.1);
    water=[];
    if(chapterIndex===1){
      water.push(makeWater(-130,-35,190,350,-.15));
      wall(-29,-9,10,.5,1);
      for(let z=22;z>-85;z-=2)for(let x=-3;x<=3;x++)
        block(x*1.15,.005,z,1.10,.12,1.92);
      // Five standing columns and surviving entablature at the coastal sanctuary.
      for(let i=0;i<5;i++)column(7+i*3.1,-29,7.1);
      block(13.2,7.65,-29,13.8,.6,1.25);
      block(13.2,8.03,-29,14.1,.18,1.45);
      for(let z=-34;z>=-46;z-=4)for(const x of [7,19.4])column(x,z,.6+random()*1.4);
      for(let z=-27;z>=-47;z-=2)for(let x=6;x<=21;x+=2)block(x,-.005,z,1.94,.1,1.94);
      // Agora courtyard, surrounding porticoes and shop thresholds.
      for(const x of [-13,13])for(let z=-50;z>=-79;z-=4)column(x,z,3.5);
      for(const x of [-18,18])for(let z=-51;z>=-80;z-=5){
        wall(x,z,5,.8+random(),.7);
      }
      wall(0,-83,35,1.5,1.0);
      for(let x=-12;x<=12;x+=3)column(x,-80,3.5);
      for(let i=0;i<8;i++){
        const x=-24+(i%3)*2,z=-4-Math.floor(i/3)*2;
        part(cylinder,wood,x,.6,z,.45,1.2,.45);
        collider(x,z,.45,.45,.45);
      }
    }else{
      // A semicircular cavea, oriented toward a two-storey stage facade.
      // Seats are solid; the orchestra and side passages form the exploration route.
      for(let row=0;row<22;row++){
        const radius=18+row*.65,height=(row+1)*.36;
        for(let i=0;i<76;i++){
          const angle=(i+.5)*Math.PI/76;
          const x=Math.cos(angle)*radius,z=-18-Math.sin(angle)*radius;
          part(box,stone,x,height/2,z,.67,height,2*radius*Math.sin(Math.PI/152)+.03,angle);
          collider(x,z,.41,.41,.41);
        }
      }
      for(const x of [-15.5,15.5])wall(x,-5,25,10,1.2);
      // Central entrance has a passable portal and overhead lintel.
      block(0,5.5,-5,6,1.0,1.4);
      block(0,8.5,-5,6,3,1.2);
      for(let x=-26;x<=26;x+=4){
        if(Math.abs(x)<3)continue;
        column(x,-6.3,4.2);
        // Upper facade columns stand on a visible continuous cornice.
        block(x,5.0,-6,3.9,.35,1.1);
        part(cylinder,stone,x,7.1,-6.3,.28,3.8,.28);
        block(x,9.2,-6.3,.85,.3,.8);
      }
      block(0,10.3,-5,57,.5,1.5);
      // Rear gallery openings around the upper curve.
      for(let i=0;i<29;i++){
        const a=(i+.5)*Math.PI/29,r=33;
        const x=Math.cos(a)*r,z=-18-Math.sin(a)*r;
        part(box,stone,x,9.5,z,.8,4.5,1.1,a);
        part(box,stone,x,11.6,z,1.2,.45,3.6,a);
        collider(x,z,.6,.6,.6);
      }
      const backdrop=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),foliage);
      backdrop.position.set(0,-5,-69);backdrop.scale.set(53,14,30);scene.add(backdrop);
    }
    for(let i=0;i<35;i++){
      const x=(i%2?1:-1)*(30+random()*3),z=23-random()*118;
      if(chapterIndex===2&&z<-14&&z>-55)continue;
      part(cylinder,wood,x,1,z,.15,2,.15);
      part(rock,foliage,x,2.7,z,1.25,1.15,1.4);
      collider(x,z,.22,.22,.22);
    }
    for(const batch of batches.values()){
      const mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.items.length);
      batch.items.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);
    }
    markers=[];
  }


  function guideDialogue(text){
    const name=document.createElement("div");name.className="guide-name";name.textContent="DENİZ · REHBERİN";$("body").append(name);paragraph(text);
  }
  function story(){
    show("story",pair(...chapters[chapterIndex].title));
    guideDialogue(pair(...chapters[chapterIndex].story));
    paragraph(pair("Kayıp kayıt ve karakterler kurmacadır. Görevler sırasında tarihî yapılardan eser alınmaz; gözlemler günlüğe kaydedilir.",
      "The lost records and characters are fictional. Observe the historic structures and record evidence without removing artefacts."));
    button(pair("Araştırmaya başla","Begin research"),play,true);
  }
  function note(){
    const small=document.createElement("small");
    small.textContent=pair("Üç kent, keşif için sıkıştırılmış ölçekte yorumlandı. Mimari temsiller ve görev nesneleri birebir arkeolojik rekonstrüksiyon değildir.",
      "The three cities use compressed interpretive layouts. Architecture and task props are educational representations.");
    $("body").append(small);
  }
  function menu(){
    show("menu",pair("Kayıp Kayıtlar","The Lost Records"));
    paragraph(pair("Genç bir araştırmacının Perge, Side ve Aspendos yolculuğu. Rehber Deniz’le kanıtları incele, kayıtları tamamla ve üç kentin hikâyesini ortaya çıkar.",
      "A young researcher’s journey through Perge, Side and Aspendos. Examine evidence with Deniz and piece together the stories of three cities."));
    if(record)button(t("resume"),()=>enterChapter(chapterIndex),true);
    button(t("start"),newGame,!record);button(t("levels"),levels);button(t("settings"),()=>settings(menu));button("← Haritaya dön",()=>{location.href="../harita";});
    paragraph(t(touch?"mobile":"controls"));note();
  }
  function newGame(){
    const begin=()=>{
      campaign={version:2,chapter:0,unlocked:0,chapters:[]};
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
  function levels(){
    show("levels",t("levels"));
    chapters.forEach((chapter,index)=>{
      const unlocked=index<=campaign.unlocked;
      const item=button(chapter.name+" · "+pair(...chapter.title)+(unlocked?"":pair(" · Kilitli"," · Locked")),()=>enterChapter(index),unlocked);
      item.disabled=!unlocked;
    });
    paragraph(pair("Sonraki kent, mevcut kentin görevleri ve mini sınavı tamamlanınca açılır.",
      "Complete the current city’s missions and quiz to unlock the next city."));
    button(t("back"),menu);
  }
  function save(){
    record=structuredClone(player);
    campaign.chapter=chapterIndex;campaign.chapters[chapterIndex]=record;
    write("campaign",campaign);
  }
  function sourceLink(site){
    const link=document.createElement("a");link.href=site.source;link.textContent=t("source");
    link.target="_blank";link.rel="noopener noreferrer";$("body").append(link);
  }
  function allObserved(site){return site.clues.every(clue=>player.observed.includes(clue.id));}
  function missionTarget(){
    const site=sites.find(s=>!player.found.includes(s.id));
    if(!site)return null;
    if(!player.accepted.includes(site.id))return site;
    return site.clues.find(clue=>!player.observed.includes(clue.id))||site;
  }
  function pointVisible(point){
    if(point.kind==="guide")return true;
    if(point.kind==="clue")return player.accepted.includes(point.parent)&&!player.observed.includes(point.id)&&!player.found.includes(point.parent);
    return !player.found.includes(point.id);
  }
  function info(site,fromJournal=false){
    teach("interact");
    if(site.kind==="guide"){show("guide","Deniz");paragraph(nextInstruction());button(t("return"),play,true);return;}
    if(site.kind==="clue"){
      if(!player.accepted.includes(site.parent))return;
      if(!player.observed.includes(site.id))player.observed.push(site.id);
      teach("evidence");
      save();show("evidence",label(site));
      const parent=sites.find(item=>item.id===site.parent);
      paragraph("KANIT KAYDEDİLDİ · "+label(parent));
      paragraph(parent[prefs.language][1]);
      paragraph("Bu gözlem neden önemli? "+label(site)+", araştırmandaki şu bağlantıyı çözmene yardım eder.");
      paragraph(parent.puzzle[0]);sourceLink(parent);
      paragraph(pair("Şimdi diğer gözlemi yap veya yapının bilgi panosuna dönerek görevi çöz.",
        "Make the other observation, or return to the landmark panel to solve the task."));
      button(t("return"),play,true);return;
    }
    show("info",label(site));
    if(player.found.includes(site.id)){
      paragraph(site[prefs.language][1]);sourceLink(site);
      paragraph(pair("Bu yapının kayıt parçası tamamlandı.","This landmark’s record fragment is complete."));
    }else{
      const direction=pair("Önce aşağıdaki iki kanıt noktasına yürü ve E ya da İncele düğmesiyle gözlem yap. Sonra bu panoya dönerek kayıttaki bağlantıyı çöz.",
        "Walk to both evidence stations below and inspect with E or the Inspect button. Return to this panel to solve the record.");
      guideDialogue(label(site)+". "+direction);
      for(const clue of site.clues)paragraph((player.observed.includes(clue.id)?"✓ ":"◇ ")+label(clue));
      if(!player.accepted.includes(site.id))button(pair("Görevi üstlen","Accept mission"),()=>{
        player.accepted.push(site.id);save();play();
      },true);
      else if(allObserved(site))button(pair("Kanıtları birleştir","Combine evidence"),()=>solveMission(site),true);
    }
    if(player.found.length===sites.length)button(t("quiz"),startQuiz,true);
    button(t(fromJournal?"journal":"return"),fromJournal?journal:play);
  }
  function solveMission(site){
    if(!allObserved(site))return;
    show("task",label(site));paragraph(pair(site.puzzle[0],site.puzzle[1]));
    for(const clue of site.clues)paragraph("✓ "+label(clue));
    const options=prefs.language==="tr"?site.puzzle[2]:site.puzzle[3];
    options.forEach((option,index)=>button(option,()=>{
      if(index!==site.puzzle[4]){
        show("feedback",pair("Kanıtları tekrar düşün","Reconsider the evidence"));
        paragraph(pair("İki gözlemi birlikte kullan. Günlükteki yön, yapı veya tarih ilişkisini karşılaştır.",
          "Use both observations. Compare the direction, structure or date relationship in your notes."));
        button(t("retry"),()=>solveMission(site),true);button(t("return"),play);return;
      }
      if(!player.found.includes(site.id))player.found.push(site.id);
      save();show("fragment",pair("Kayıt parçası tamamlandı","Record fragment recovered"));
      guideDialogue(site[prefs.language][1]);sourceLink(site);
      paragraph(player.found.length+" / "+sites.length+" "+pair("kayıt parçası","record fragments"));
      if(player.found.length===sites.length)button(t("quiz"),startQuiz,true);
      button(t("return"),play);
    }));
  }
  function journal(){
    teach("journal");
    show("journal",t("journal"));
    for(const site of sites)for(const clue of site.clues)if(player.observed.includes(clue.id))button("Kanıt · "+label(clue),()=>info(clue,true));
    paragraph(chapters[chapterIndex].name+" · "+player.found.length+"/"+sites.length+" "+pair("kayıt parçası","record fragments"));
    for(const site of sites){
      if(player.found.includes(site.id))button("✓ "+label(site),()=>info(site,true));
      else if(player.accepted.includes(site.id))paragraph(label(site)+" · "+site.clues.filter(c=>player.observed.includes(c.id)).length+"/2 "+pair("kanıt","evidence"));
    }
    if(player.legacy.length)paragraph(pair("Önceki sürümdeki keşiflerin korundu. Yeni kayıt parçaları için kanıt görevlerini tamamla.",
      "Your earlier discoveries are retained. Complete the evidence missions for the new record fragments."));
    if(player.found.length===sites.length)button(t("quiz"),startQuiz,true);
    if(player.complete)button(pair("Tarihî rapor","Historical report"),completion);
    button(t("return"),play);
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
  function completion(){
    show("complete",chapters[chapterIndex].name+" · "+pair("Araştırma raporu","Research report"));
    paragraph(pair("Tamamlanan kayıt, gözlemlerinden şu sonuçları çıkarıyor.",
      "Your completed record draws these conclusions from your observations."));
    for(const site of sites){
      const heading=document.createElement("h2");heading.textContent=label(site);$("body").append(heading);
      paragraph(site[prefs.language][1]);
    }
    if(chapterIndex<2)button(pair("Sonraki kente git","Travel to the next city"),()=>enterChapter(chapterIndex+1),true);
    else paragraph(pair("Üç kentin kaydı tamamlandı. Perge’nin su düzenini, Side’nin denizle ilişkisini ve Aspendos’un tiyatro mimarisini araştırdın.",
      "All three city records are complete. You investigated Perge’s water system, Side’s maritime connections and Aspendos’s theatre architecture."));
    button(t("journal"),journal);button(t("return"),play);button(t("levels"),levels);button(t("menu"),menu);
  }
  function play(){
    player.pitch=Math.max(-1.35,Math.min(1.35,player.pitch));
    if(blocked(player.x,player.z)){player.x=start.x;player.z=start.z;}
    window.speechSynthesis?.cancel();
    state="playing";clearInput();$("overlay").hidden=true;$("hud").hidden=false;
    $("district").textContent=chapters[chapterIndex].name.toUpperCase()+" · "+pair(...chapters[chapterIndex].title);
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
    ctx.fillStyle="#bbc8b2";ctx.font="10px sans-serif";ctx.fillText("K · Şematik harita",20,11);
    const px=x=>10+(x+36)/72*124,pz=z=>20+(z+99)/128*112;
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
      // yerel kopya önce (internet gerekmez), olmazsa CDN
      try{THREE=await import("./vendor/three.module.min.js");}catch(e){THREE=await import(CDN);}
      renderer=new THREE.WebGLRenderer({antialias:!touch,powerPreference:"high-performance"});
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
      renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      $("world").append(renderer.domElement);
      loadWorld();input();setupGuidance();menu();requestAnimationFrame(frame);
      // Miras. Haritası: haritadaki her nokta kendi kentini doğrudan açar (?mekan=perge|side|aspendos).
      // Haritadan seçilen kent kilitliyse açılır; her kent ayrı bir mini oyun gibi oynanabilir.
      {const q=new URLSearchParams(location.search).get('mekan'),qi={perge:0,side:1,aspendos:2}[q];
       if(qi!==undefined&&chapters[qi]){campaign.unlocked=Math.max(campaign.unlocked,qi);enterChapter(qi);}}
    }catch(error){
      console.error(error);show("error","Perge");paragraph(t("unavailable"));
      button(t("reload"),()=>location.reload());
    }
  }
  boot();
})();

