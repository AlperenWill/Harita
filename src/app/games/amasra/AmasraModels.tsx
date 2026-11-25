/**
 * Amasra — 3B modeller: deniz ve iki liman (tekneler, rıhtım), güneyde kent ve tepeler, iki limanın arasındaki boyun, sarp yarımada,
 * burçlu ve mazgallı sur halkası (güneyde Zindan Kapısı, kuzeyde köprü kapısı), Kaleiçi evleri, surlardaki dört kabartma taşı,
 * Kemere Köprüsü, Boztepe ve Sormagir sur kalıntıları, seyir yeri. Ölçek ve düzen TEMSİLÎDİR.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, mountainGeo, stoneTex, weather } from '../shared/scenery';
import { BOZ, BRIDGE, GATE_N, GATE_S, IN_HOUSES, LAND, NECK, PEN, RELIEFS, VIEW_AT, WALL, groundY, reliefPos } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => { const n = g.index ? g.toNonIndexed() : g; if (!n.attributes.normal) n.computeVertexNormals(); return n; }))!;
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); return g; };
const ellXZ = (e: { cx: number; cz: number; rx: number; rz: number }, a: number, k: number): [number, number] => [e.cx + Math.cos(a) * e.rx * k, e.cz + Math.sin(a) * e.rz * k];

export interface Mats { wall: THREE.MeshStandardMaterial; rock: THREE.MeshStandardMaterial; grass: THREE.MeshStandardMaterial; pave: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; sea: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('amasra-sur', ['#8f8a7e', '#9d978a', '#7f7a70', '#a8a294', '#8a8273'], [22, 16], [36, 40]);
    const rk = canvasTex(256, 256, (g, r) => { g.fillStyle = '#7d766a'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '95,90,80' : '150,142,128'},0.4)`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 30, 4 + r() * 12, r() * 3, 0, 7); g.fill(); } });
    const gr = canvasTex(128, 128, (g, r) => { g.fillStyle = '#5f7a3e'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${50 + r() * 60 | 0},${80 + r() * 60 | 0},${30 + r() * 20 | 0},.7)`; g.fillRect(r() * 128, r() * 128, 2, 3); } });
    const pv = canvasTex(256, 256, (g, r) => { g.fillStyle = '#7a746a'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 260; i++) { const v = 120 + r() * 60 | 0; g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 7 + r() * 9, 6 + r() * 7, r() * 3, 0, 7); g.fill(); g.strokeStyle = 'rgba(40,35,30,.45)'; g.lineWidth = 1.5; g.stroke(); } });
    const tile = canvasTex(256, 256, (g, r) => { g.fillStyle = '#7c3a28'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 16) for (let x = (y / 16) % 2 ? -8 : 0; x < 256; x += 16) { const v = r(); g.fillStyle = `rgb(${150 + v * 40 | 0},${70 + v * 25 | 0},${48 + v * 15 | 0})`; g.beginPath(); g.ellipse(x + 8, y + 10, 7, 9, 0, 0, Math.PI); g.fill(); } });
    const fc = canvasTex(256, 128, (g) => { g.fillStyle = '#efe9de'; g.fillRect(0, 0, 256, 128); for (let i = 0; i < 3; i++) { const cx = 42 + i * 86; g.fillStyle = '#5b4030'; g.fillRect(cx - 16, 30, 32, 52); g.fillStyle = '#2f3a40'; g.fillRect(cx - 12, 34, 24, 44); } g.fillStyle = '#5b4030'; g.fillRect(0, 0, 256, 6); });
    return {
      wall: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.6, roughness: 0.9 })),
      rock: new THREE.MeshStandardMaterial({ map: rk, roughness: 1, side: THREE.DoubleSide }),
      grass: new THREE.MeshStandardMaterial({ map: gr, roughness: 1 }),
      pave: new THREE.MeshStandardMaterial({ map: pv, roughness: 0.9 }),
      plaster: new THREE.MeshStandardMaterial({ map: fc, roughness: 0.9 }),
      roof: new THREE.MeshStandardMaterial({ map: tile, roughness: 0.8 }),
      wood: new THREE.MeshStandardMaterial({ color: '#6b4a30', roughness: 0.8 }),
      sea: new THREE.MeshStandardMaterial({ color: '#2f6f80', roughness: 0.12, metalness: 0.2 }),
    };
  }, []);
}

/** Elips biçimli yayla ve denize inen sarp yamaç (lathe benzeri ızgara) */
function plateau(e: { cx: number; cz: number; rx: number; rz: number }, y: number, rTop: number, seed: number) {
  const NA = 96, NR = 10, pos: number[] = [], uv: number[] = [], idx: number[] = [], r = rng(seed);
  const noise = Array.from({ length: NA }, () => r());
  for (let j = 0; j <= NR; j++) for (let i = 0; i <= NA; i++) { const a = (i / NA) * Math.PI * 2, t = j / NR, n = noise[i % NA];
    let k: number, yy: number; if (t < 0.5) { k = rTop * (t / 0.5); yy = y; } else { const u = (t - 0.5) / 0.5; k = rTop + u * (0.16 + n * 0.08); yy = y - u * (y + 2) + Math.sin(u * 9 + i) * 0.3 * (1 - u); }
    const [x, z] = ellXZ(e, a, k); pos.push(x, yy, z); uv.push(x / 6, z / 6 + yy / 6); }
  for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export function Terrain({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const sea = new THREE.PlaneGeometry(2400, 2400); sea.rotateX(-Math.PI / 2);
    const pen = plateau(PEN, PEN.y, WALL.out + 0.04, 3), boz = plateau(BOZ, BOZ.y, 0.95, 7);
    // kara: güneyde düzlük ve arkada yükselen tepeler; boyun rampası
    const land = new THREE.PlaneGeometry(600, 300, 90, 40); land.rotateX(-Math.PI / 2); land.translate(0, 0, LAND.z + 150);
    { const p = land.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = z - LAND.z; p.setY(i, LAND.y + Math.max(0, d - 40) * 0.35 + Math.sin(x * 0.03 + z * 0.02) * Math.min(6, Math.max(0, d - 40) * 0.1) - (d < 2 ? (2 - d) * 1.5 : 0)); } land.computeVertexNormals(); }
    const neck = new THREE.PlaneGeometry(NECK.hw * 2 + 2, LAND.z - NECK.z0 + 2, 4, 20); neck.rotateX(-Math.PI / 2); neck.translate(0, 0, (LAND.z + NECK.z0) / 2);
    { const p = neck.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); p.setY(i, z > LAND.z ? LAND.y : groundY(0, Math.min(z, LAND.z - 0.01)) + 0.01); } neck.computeVertexNormals(); }
    const neckSides = merge([-1, 1].map((s) => { const w = bx(3, LAND.y + 6, LAND.z - NECK.z0, 4); return at(w, s * (NECK.hw + 1.4), (LAND.y + 6) / 2 - 2.5, (LAND.z + NECK.z0) / 2); }));
    return { sea, pen, boz, land, neck, neckSides };
  }, []);
  return <group>
    <group userData={{ noCast: true }}><mesh geometry={g.sea} material={m.sea} receiveShadow /></group>
    <mesh geometry={g.pen} material={m.rock} receiveShadow castShadow />
    <mesh geometry={g.boz} material={m.rock} receiveShadow castShadow />
    <mesh position={[0, PEN.y + 0.02, 0]} rotation-x={-Math.PI / 2} scale={[PEN.rx * WALL.in * 2, PEN.rz * WALL.in * 2, 1]} material={m.pave} receiveShadow><circleGeometry args={[0.5, 64]} /></mesh>
    <mesh position={[BOZ.cx, BOZ.y + 0.02, BOZ.cz]} rotation-x={-Math.PI / 2} scale={[BOZ.rx * 1.9, BOZ.rz * 1.9, 1]} material={m.grass} receiveShadow><circleGeometry args={[0.5, 64]} /></mesh>
    <mesh geometry={g.land} material={m.grass} receiveShadow />
    <mesh geometry={g.neck} material={m.pave} receiveShadow />
    <mesh geometry={g.neckSides} material={m.wall} receiveShadow castShadow />
  </group>;
}
export function Mountains() {
  const list = useMemo(() => [
    { p: [-700, -10, 900] as [number, number, number], g: mountainGeo(700, 320, 7, 1, '#5d7046') },
    { p: [800, -10, 700] as [number, number, number], g: mountainGeo(800, 360, 9, 1, '#5d7046') },
  ], []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}

/* ===================== surlar ===================== */
export function Walls({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [], N = 120, kIn = WALL.in, kOut = WALL.out, H = WALL.h, y0 = PEN.y - 0.5;
    const gap = (x: number, z: number) => (z > 0 && Math.abs(x) < GATE_S.hw) || (z < 0 && Math.abs(x) < GATE_N.hw);
    for (let i = 0; i < N; i++) { const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2, am = (a0 + a1) / 2, km = (kIn + kOut) / 2;
      const [x0, z0] = ellXZ(PEN, a0, km), [x1, z1] = ellXZ(PEN, a1, km), [xm, zm] = ellXZ(PEN, am, km), L = Math.hypot(x1 - x0, z1 - z0) + 0.05, th = PEN.rx * (kOut - kIn) * 0.85, rot = -Math.atan2(z1 - z0, x1 - x0);
      const isGap = gap(xm, zm), hBot = isGap ? (zm > 0 ? 4.4 : 3.6) : 0, h = H - hBot;
      const seg = bx(L, h, th, 3); seg.rotateY(rot); seg.translate(xm, y0 + hBot + h / 2, zm); parts.push(seg);
      if (i % 2 === 0) { const mz = bx(L * 0.5, 0.8, th, 2); mz.rotateY(rot); mz.translate(xm, y0 + H + 0.4, zm); parts.push(mz); } }   // mazgallar
    // burçlar: 8 adet, kare gövde
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8, [x, z] = ellXZ(PEN, a, kOut + 0.01); if (gap(x, z)) continue; const t = bx(5, H + 3.5, 5, 3); t.rotateY(-a); t.translate(x, y0 + (H + 3.5) / 2, z); parts.push(t);
      for (let q = 0; q < 4; q++) { const c = bx(1.2, 0.8, 1.2, 2); c.translate(((q % 2) - 0.5) * 3.4, 0, (Math.floor(q / 2) - 0.5) * 3.4); c.rotateY(-a); c.translate(x, y0 + H + 3.9, z); parts.push(c); } }
    // kapılar: kemerli lento
    for (const [z, hw, hh] of [[PEN.rz * (kIn + kOut) / 2, GATE_S.hw, 4.4], [-PEN.rz * (kIn + kOut) / 2, GATE_N.hw, 3.6]] as const) {
      const s = new THREE.Shape(); s.moveTo(-hw - 0.6, 0); s.lineTo(hw + 0.6, 0); s.lineTo(hw + 0.6, hh + 0.8); s.lineTo(-hw - 0.6, hh + 0.8); s.closePath(); const hp = new THREE.Path(); hp.moveTo(-hw, 0.001); hp.lineTo(hw, 0.001); hp.lineTo(hw, hh - hw); hp.absarc(0, hh - hw, hw, 0, Math.PI, false); hp.closePath(); s.holes.push(hp);
      const ex = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: false, curveSegments: 10 }); const u = ex.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) / 3, u.getY(i) / 3);
      ex.translate(0, y0, z > 0 ? PEN.rz * kOut - 0.2 : -PEN.rz * kOut - 0.4); parts.push(ex); }
    // Boztepe: Sormagir surlarından kalıntılar (kenar boyunca kesik duvar parçaları)
    const r = rng(9); for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; if (r() < 0.35) continue; const [x, z] = ellXZ(BOZ, a, 0.92), L = 3 + r() * 3, h = 1 + r() * 3, w = bx(L, h, 1.2, 3); w.rotateY(-a - Math.PI / 2); w.translate(x, BOZ.y + h / 2 - 0.3, z); if (Math.hypot(x - VIEW_AT[0], z - VIEW_AT[1]) < 5 || Math.abs(x) < 3 && z > BOZ.cz) continue; parts.push(w); }
    return merge(parts);
  }, []);
  return <mesh geometry={g} material={m.wall} castShadow receiveShadow />;
}
/** Kemere Köprüsü: tek gözlü yuvarlak kemer, korkuluk */
export function Bridge({ m }: { m: Mats }) {
  const g = useMemo(() => { const z0 = -PEN.rz * WALL.out, z1 = BRIDGE.z0, L = z0 - z1, w = BRIDGE.hw * 2 + 0.8, R = L * 0.38;
    const s = new THREE.Shape(); s.moveTo(-L / 2, -3); s.lineTo(L / 2, -3); s.lineTo(L / 2, BOZ.y - 0.2); s.lineTo(-L / 2, PEN.y - 0.2); s.closePath();
    const h = new THREE.Path(); h.moveTo(-R, -3.001); h.lineTo(R, -3.001); h.lineTo(R, 1.5); h.absarc(0, 1.5, R, 0, Math.PI, false); h.closePath(); s.holes.push(h);
    const ex = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false, curveSegments: 16 }); const u = ex.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) / 3, u.getY(i) / 3);
    ex.translate(0, 0, -w / 2); ex.rotateY(-Math.PI / 2); ex.translate(0, 0, (z0 + z1) / 2);
    const par: THREE.BufferGeometry[] = []; for (const sx of [-1, 1]) for (let k = 0; k < 10; k++) { const z = z0 - (k + 0.5) * (L / 10); par.push(at(bx(0.35, 0.8, L / 10 - 0.1, 2), sx * (w / 2 - 0.18), groundY(0, z) + 0.4, z)); }
    return merge([ex, ...par]); }, []);
  return <mesh geometry={g} material={m.wall} castShadow receiveShadow />;
}
/** Kaleiçi ve kentteki evler, limandaki tekneler */
export function Town({ m }: { m: Mats }) {
  const g = useMemo(() => { const body: THREE.BufferGeometry[] = [], roof: THREE.BufferGeometry[] = [], boats: THREE.BufferGeometry[] = [], r = rng(13);
    const house = (x: number, z: number, w: number, d: number, y: number, rot = 0) => { const H = 5 + r() * 2.5, b = new THREE.BoxGeometry(w, H, d); b.rotateY(rot); body.push(at(b, x, y + H / 2, z)); const rf = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); rf.rotateY(Math.PI / 4); rf.scale(w + 1, 2, d + 1); rf.rotateY(rot); roof.push(at(rf, x, y + H + 1, z)); };
    for (const [x, z, w, d] of IN_HOUSES) house(x, z, w - 0.4, d - 0.4, PEN.y);
    for (let i = 0; i < 40; i++) { const x = -55 + (i % 10) * 11 + r() * 3, z = LAND.z + 10 + Math.floor(i / 10) * 13 + r() * 3; if (Math.abs(x) < 9 && z < LAND.z + 24) continue; house(x, z, 7 + r() * 3, 7 + r() * 3, groundY(x, z) || LAND.y); }
    for (let i = 0; i < 8; i++) { const sx = i < 4 ? -1 : 1, x = sx * (NECK.hw + 10 + (i % 4) * 7 + r() * 3), z = NECK.z0 + 4 + r() * 12, hull = new THREE.CylinderGeometry(0.9, 0.5, 5, 8, 1, false, 0, Math.PI); hull.rotateZ(Math.PI / 2); hull.rotateX(Math.PI); hull.scale(1, 0.7, 1); hull.rotateY(r() * 3); boats.push(at(hull, x, 0.4, z)); }
    return { body: merge(body), roof: merge(roof), boats: merge(boats) }; }, []);
  return <group>
    <mesh geometry={g.body} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={g.roof} material={m.roof} castShadow receiveShadow />
    <mesh geometry={g.boats} castShadow><meshStandardMaterial color="#e8e2d6" roughness={0.6} /></mesh>
  </group>;
}
/** Kabartma taşları: surun iç yüzünde; her biri ayrı dokulu (arma, aile arması, kartal, öküzbaşı) */
function reliefTex(id: string) {
  return canvasTex(256, 256, (g, r) => {
    g.fillStyle = '#a49c8c'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,65,58' : '210,204,190'},${r() * 0.25})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
    g.strokeStyle = '#5f584d'; g.lineWidth = 8; g.strokeRect(12, 12, 232, 232);
    const relief = (path: () => void) => { g.save(); g.translate(3, 3); g.fillStyle = 'rgba(40,36,30,.55)'; path(); g.fill(); g.restore(); g.fillStyle = '#c3bba9'; path(); g.fill(); g.strokeStyle = '#6d665a'; g.lineWidth = 3; path(); g.stroke(); };
    const shield = () => { g.beginPath(); g.moveTo(64, 50); g.lineTo(192, 50); g.lineTo(192, 130); g.quadraticCurveTo(192, 200, 128, 222); g.quadraticCurveTo(64, 200, 64, 130); g.closePath(); };
    if (id === 'cenova') { relief(shield); g.fillStyle = '#7d6f60'; g.fillRect(116, 58, 24, 156); g.fillRect(72, 108, 112, 24); }
    else if (id === 'aile') { relief(shield); g.fillStyle = '#7d6f60'; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(70, 80 + k * 32); g.lineTo(128, 60 + k * 32); g.lineTo(186, 80 + k * 32); g.lineTo(186, 92 + k * 32); g.lineTo(128, 72 + k * 32); g.lineTo(70, 92 + k * 32); g.closePath(); g.fill(); } }
    else if (id === 'kartal') relief(() => { g.beginPath(); g.moveTo(128, 60); g.quadraticCurveTo(150, 70, 140, 96); g.lineTo(220, 80); g.lineTo(170, 130); g.lineTo(150, 128); g.lineTo(160, 200); g.lineTo(128, 180); g.lineTo(96, 200); g.lineTo(106, 128); g.lineTo(86, 130); g.lineTo(36, 80); g.lineTo(116, 96); g.quadraticCurveTo(106, 70, 128, 60); g.closePath(); });
    else relief(() => { g.beginPath(); g.moveTo(60, 70); g.quadraticCurveTo(70, 110, 100, 106); g.quadraticCurveTo(96, 150, 112, 196); g.quadraticCurveTo(128, 214, 144, 196); g.quadraticCurveTo(160, 150, 156, 106); g.quadraticCurveTo(186, 110, 196, 70); g.quadraticCurveTo(170, 96, 150, 84); g.quadraticCurveTo(128, 76, 106, 84); g.quadraticCurveTo(86, 96, 60, 70); g.closePath(); });
  }, id.length * 7);
}
export function Reliefs() {
  const list = useMemo(() => RELIEFS.map((rl) => { const [x, z] = reliefPos(rl.a, 0.012), ang = Math.atan2(-(z - PEN.cz) / PEN.rz ** 2, -(x - PEN.cx) / PEN.rx ** 2); return { id: rl.id, x, z, rot: Math.PI / 2 - ang, tex: reliefTex(rl.id) }; }), []);
  return <group>{list.map((l) => <mesh key={l.id} position={[l.x, PEN.y + 1.9, l.z]} rotation-y={l.rot}><planeGeometry args={[1.6, 1.6]} /><meshStandardMaterial map={l.tex} bumpMap={l.tex} bumpScale={1.5} roughness={0.9} side={THREE.DoubleSide} /></mesh>)}</group>;
}
/** Boztepe'nin ucundaki seyir yeri: taş korkuluk ve bank */
export function Viewpoint({ m }: { m: Mats }) {
  const g = useMemo(() => { const parts: THREE.BufferGeometry[] = []; for (let k = -4; k <= 4; k++) parts.push(at(bx(0.35, 0.9, 0.35, 1), VIEW_AT[0] + k * 1.1, BOZ.y + 0.45, VIEW_AT[1] - 2.4)); parts.push(at(bx(9.2, 0.2, 0.45, 2), VIEW_AT[0], BOZ.y + 0.95, VIEW_AT[1] - 2.4)); return merge(parts); }, []);
  return <group>
    <mesh geometry={g} material={m.wall} castShadow receiveShadow />
    <mesh position={[VIEW_AT[0] + 2.6, BOZ.y + 0.45, VIEW_AT[1] + 0.6]} material={m.wood} castShadow><boxGeometry args={[2.2, 0.12, 0.5]} /></mesh>
  </group>;
}
