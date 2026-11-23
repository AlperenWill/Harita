/**
 * Selimiye Camii — 3B modeller. Kesme taş duvarlı ibadet mekânı (45 × 36 m), sekiz ayak ve aralarında kemerler, ayakların taşıdığı büyük kubbe,
 * pencere sıraları, mihrap duvarında çini panosu, halı ve avizeler; revaklı avlu, havuz; dört üç şerefeli minare; çevrede Edirne evleri ve ağaçlar.
 * Ölçüler, kemer ve kubbe ayrıntıları ve bezeme desenleri TEMSİLÎDİR (docs/SELIMIYE.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { AREA, COLUMNS, COURT, DOOR, GATE, HALL, MINARETS, MINARET_R, OCT_R, PILLARS, PILLAR_R, POOL, PORTAL, SOUTH_ROW_Z, WALL_T } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.64, 0.58).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const slab = (p: Parts, x0: number, x1: number, z0: number, z1: number, h: number, y0 = 0, s = 2.4) => { const g = bx(x1 - x0, h, z1 - z0, s); g.translate((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2); p.push(g); };
const H = 20, F = 0.25;
/** zemin düzlemi y = −0,12'de; yapıların tabanı bunun altına iner ki havada durmasın */
const G0 = -0.35;
const DOME_R = 15.75, DOME_Y = 26, DOME_K = 0.86;
/** dış kurşun çatının üst yüzü ve sekizgen kasnağın köşe yarıçapı */
const ROOF_Y = H + F + 0.5, OCT_V = 17.4;

/* ===================== malzemeler ===================== */
export interface Mats { lead: THREE.MeshStandardMaterial; gold: THREE.MeshStandardMaterial; glass: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; stone: THREE.MeshStandardMaterial; inner: THREE.MeshStandardMaterial; carpet: THREE.MeshStandardMaterial; tile: THREE.MeshStandardMaterial; dome: THREE.MeshStandardMaterial; glow: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; paving: THREE.MeshStandardMaterial; water: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('selimiye-kesme', ['#e6d3a6', '#dcc697', '#ecdcb4', '#d0b98a'], [12, 8], [34, 44]);
    const inner = canvasTex(256, 256, (g, r) => { g.fillStyle = '#efe6d0'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,100,70' : '255,250,235'},${r() * 0.06})`; g.fillRect(r() * 256, r() * 256, 5, 5); } });
    const carpet = canvasTex(256, 256, (g, r) => { g.fillStyle = '#7d2a28'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#d6b66a'; g.lineWidth = 3; for (let i = 0; i < 4; i++) g.strokeRect(8 + i * 10, 8 + i * 10, 240 - i * 20, 240 - i * 20); g.fillStyle = '#2d4a6e'; for (let y = 60; y < 200; y += 40) for (let x = 60; x < 200; x += 40) { g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x + 14, y); g.lineTo(x, y + 14); g.lineTo(x - 14, y); g.fill(); } for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.1})`; g.fillRect(r() * 256, r() * 256, 2, 2); } });
    carpet.repeat.set(6, 4);
    // çini: beyaz zeminde kobalt ve mercan kırmızısı lale/karanfil desenleri (temsilî)
    const tile = canvasTex(256, 256, (g, r) => { g.fillStyle = '#f2f0e8'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) { g.strokeStyle = '#2f5f9a'; g.lineWidth = 2; g.strokeRect(x + 2, y + 2, 60, 60); g.fillStyle = '#2f5f9a'; g.beginPath(); g.arc(x + 32, y + 32, 12, 0, 7); g.fill(); g.fillStyle = '#c4452e'; for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; g.beginPath(); g.ellipse(x + 32 + Math.cos(a) * 20, y + 32 + Math.sin(a) * 20, 8, 4, a, 0, 7); g.fill(); } g.fillStyle = r() < 0.5 ? '#3a8a7a' : '#2f5f9a'; g.beginPath(); g.arc(x + 32, y + 32, 4, 0, 7); g.fill(); } });
    tile.repeat.set(3, 2);
    // kurşun kaplama: levha dikişleri kubbede meridyen çizgileri olarak görünür (temsilî)
    const lead = canvasTex(256, 128, (g, r) => { g.fillStyle = '#93a1a6'; g.fillRect(0, 0, 256, 128); for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '60,72,78' : '220,228,230'},${r() * 0.08})`; g.fillRect(r() * 256, r() * 128, 6, 3); } g.fillStyle = 'rgba(70,82,88,0.45)'; for (let x = 0; x < 256; x += 16) g.fillRect(x, 0, 1.5, 128); g.fillStyle = 'rgba(70,82,88,0.25)'; for (let y = 0; y < 128; y += 32) g.fillRect(0, y, 256, 1); });
    lead.repeat.set(4, 1);
    return {
      lead: new THREE.MeshStandardMaterial({ map: lead, roughness: 0.5, metalness: 0.45, side: THREE.DoubleSide }),
      gold: new THREE.MeshStandardMaterial({ color: '#d9b24a', roughness: 0.3, metalness: 0.9 }),
      glass: new THREE.MeshStandardMaterial({ color: '#39434a', roughness: 0.25, metalness: 0.5 }),
      roof: new THREE.MeshStandardMaterial({ color: '#b2573a', roughness: 0.9 }),
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.3, roughness: 0.9 })),
      inner: new THREE.MeshStandardMaterial({ map: inner, roughness: 0.95, side: THREE.DoubleSide }),
      carpet: new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 }),
      tile: new THREE.MeshStandardMaterial({ map: tile, roughness: 0.4 }),
      dome: new THREE.MeshStandardMaterial({ map: lead, roughness: 0.5, metalness: 0.45, side: THREE.DoubleSide }),
      glow: new THREE.MeshStandardMaterial({ color: '#f4f6f6', emissive: '#e8f0f4', emissiveIntensity: 0.9, side: THREE.DoubleSide }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 1 }),
      paving: new THREE.MeshStandardMaterial({ color: '#d8ccae', roughness: 0.95 }),
      water: new THREE.MeshStandardMaterial({ color: '#4a7f8c', roughness: 0.12, metalness: 0.15 }),
      plaster: new THREE.MeshStandardMaterial({ color: '#efe4c9', roughness: 0.95 }),
    };
  }, []);
}

/* ===================== cami: duvarlar, ayaklar, kubbe ===================== */
export function Mosque({ m, tier }: { m: Mats; tier: Tier }) {
  const walls = useMemo(() => { const p: Parts = [], B = HALL, t = WALL_T, y = G0, h = H + F - 0.1 - G0;
    slab(p, B.x0 - t, B.x1 + t, B.z0 - t, B.z0, h, y); slab(p, B.x0 - t, B.x0, B.z0, B.z1 + t, h, y); slab(p, B.x1, B.x1 + t, B.z0, B.z1 + t, h, y);
    slab(p, B.x0 - t, DOOR.x0, B.z1, B.z1 + t + 1.5, h, y); slab(p, DOOR.x1, B.x1 + t, B.z1, B.z1 + t + 1.5, h, y); slab(p, DOOR.x0, DOOR.x1, B.z1, B.z1 + t + 1.5, h - 8, y + 8);
    // avlu yan duvarı ve güney duvarı (alçak)
    const C = COURT, ch = 5.5 + F - 0.1 - G0;
    slab(p, B.x0 - t, B.x0, C.z0, C.z1 + t, ch, y); slab(p, B.x1, B.x1 + t, C.z0, C.z1 + t, ch, y);
    slab(p, B.x0 - t, GATE.x0, C.z1, C.z1 + t, ch, y); slab(p, GATE.x1, B.x1 + t, C.z1, C.z1 + t, ch, y); slab(p, GATE.x0, GATE.x1, C.z1, C.z1 + t, y + ch - (F + 2.5), F + 2.5);
    // taban: bütün yapının altında zeminden döşeme seviyesine kadar dolu taş platform (yapı yerden kopuk görünmesin)
    slab(p, B.x0 - t, B.x1 + t, B.z0 - t, PORTAL.z1, F - 0.03 - G0, G0);
    return merge(p); }, []);
  // tavan: ortasında kubbe açıklığı olan döşeme
  const ceiling = useMemo(() => { const s = new THREE.Shape(); const B = HALL; s.moveTo(B.x0, B.z0); s.lineTo(B.x1, B.z0); s.lineTo(B.x1, B.z1); s.lineTo(B.x0, B.z1); s.closePath();
    const hole = new THREE.Path(); hole.absarc(0, 0, DOME_R, 0, Math.PI * 2, true); s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: false, curveSegments: 40 }); g.rotateX(Math.PI / 2); g.translate(0, H + F + 0.2, 0); return g; }, []);
  const pillars = useMemo(() => { const p: Parts = [];
    for (const q of PILLARS) { const c = new THREE.CylinderGeometry(PILLAR_R, PILLAR_R + 0.25, H - 1, 18); c.translate(q[0], F + (H - 1) / 2, q[1]); p.push(c); const cap = bx(PILLAR_R * 2 + 0.8, 1, PILLAR_R * 2 + 0.8, 1.5); cap.translate(q[0], F + H - 0.5, q[1]); p.push(cap); }
    // ayaklar arasında kemerler
    for (let k = 0; k < 8; k++) { const a = (k + 1) * Math.PI / 4, rm = OCT_R * Math.cos(Math.PI / 8), cx = Math.cos(a) * rm, cz = Math.sin(a) * rm, side = 2 * OCT_R * Math.sin(Math.PI / 8) / 2 - PILLAR_R;
      const t = new THREE.TorusGeometry(side, 0.65, 8, 24, Math.PI); t.rotateY(-a + Math.PI / 2); t.translate(cx, F + H - 1.5, cz); p.push(t); }
    return merge(p); }, []);
  const windows = useMemo(() => { const p: Parts = [], B = HALL;
    const add = (x: number, y: number, z: number, ry: number, w: number, h: number) => { const g = new THREE.PlaneGeometry(w, h); g.rotateY(ry); g.translate(x, y, z); p.push(g); };
    for (let i = 0; i < 6; i++) { const x = B.x0 + 4 + i * ((B.x1 - B.x0 - 8) / 5); add(x, F + 6, B.z0 + 0.02, 0, 1.6, 4.2); add(x, F + 13, B.z0 + 0.02, 0, 1.6, 3.4); }
    for (let k = 0; k < 4; k++) { const z = B.z0 + 5 + k * 8; for (const s of [-1, 1]) { add(s * (B.x1 - 0.02), F + 6, z, -s * Math.PI / 2, 1.6, 4.2); add(s * (B.x1 - 0.02), F + 13, z, -s * Math.PI / 2, 1.6, 3.4); } }
    for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2; const g = new THREE.PlaneGeometry(1.3, 3.2); g.rotateY(-a + Math.PI / 2); g.translate(Math.cos(a) * (DOME_R - 0.7), DOME_Y + 1.2, Math.sin(a) * (DOME_R - 0.7)); p.push(g); }
    return merge(p); }, []);
  const drum = useMemo(() => { const g = new THREE.CylinderGeometry(DOME_R, DOME_R, DOME_Y - H - F + 1, 40, 1, true); g.translate(0, (DOME_Y + H + F) / 2, 0); return g; }, []);
  const mihrab = useMemo(() => { const p: Parts = []; slab(p, -2.4, 2.4, HALL.z0 + 0.02, HALL.z0 + 0.6, 8, F, 1); return merge(p); }, []);
  const minber = useMemo(() => { const p: Parts = []; for (let i = 0; i < 9; i++) slab(p, 7.5, 9.3, HALL.z0 + 1.2 + i * 0.8, HALL.z0 + 2 + i * 0.8, 0.6 + i * 0.45, F, 1); slab(p, 7.4, 9.4, HALL.z0 + 8.4, HALL.z0 + 10, 0.9, F, 1); return merge(p); }, []);
  return <group>
    <mesh geometry={walls} material={m.stone} castShadow receiveShadow />
    <mesh geometry={ceiling} material={m.inner} castShadow receiveShadow />
    <mesh geometry={pillars} material={m.stone} castShadow receiveShadow />
    <mesh geometry={drum} material={m.inner} castShadow />
    <mesh position={[0, DOME_Y, 0]} scale-y={DOME_K} castShadow><sphereGeometry args={[DOME_R, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={m.dome} attach="material" /></mesh>
    <mesh position={[0, DOME_Y, 0]} scale-y={DOME_K}><sphereGeometry args={[DOME_R - 0.4, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={m.inner} attach="material" /></mesh>
    <Alem m={m} y={DOME_Y + DOME_R * DOME_K} s={1.3} />
    <Exterior m={m} />
    <mesh geometry={windows}><primitive object={m.glow} attach="material" /></mesh>
    {/* halı, mihrap, minber, çini panosu */}
    <mesh rotation-x={-Math.PI / 2} position={[0, F + 0.02, 0]} receiveShadow><planeGeometry args={[HALL.x1 - HALL.x0 - 2, HALL.z1 - HALL.z0 - 2]} /><primitive object={m.carpet} attach="material" /></mesh>
    <mesh geometry={mihrab} material={m.stone} />
    <mesh position={[0, F + 3.2, HALL.z0 + 0.62]}><planeGeometry args={[3.4, 5.2]} /><primitive object={m.dark} attach="material" /></mesh>
    <mesh position={[-8, F + 5, HALL.z0 + 0.04]}><planeGeometry args={[6, 8]} /><primitive object={m.tile} attach="material" /></mesh>
    <mesh position={[8, F + 5, HALL.z0 + 0.04]}><planeGeometry args={[6, 8]} /><primitive object={m.tile} attach="material" /></mesh>
    <mesh geometry={minber} material={m.stone} castShadow receiveShadow />
    {/* avizeler */}
    {(tier === 'low' ? [[0, 0]] : [[0, 0], [-9, -8], [9, -8], [-9, 8], [9, 8]]).map(([x, z], i) => <group key={i} position={[x, F + 12.5, z]}><mesh><torusGeometry args={[1.4, 0.08, 8, 24]} /><meshStandardMaterial color="#d6b66a" emissive="#ffd88a" emissiveIntensity={0.6} /></mesh><pointLight color="#ffe3b5" intensity={tier === 'low' ? 140 : 160} distance={26} decay={2} /></group>)}
  </group>;
}


/** Kubbe ve minare uçlarındaki yaldızlı alem (temsilî) */
function Alem({ m, y, s = 1 }: { m: Mats; y: number; s?: number }) {
  return <group position={[0, y, 0]} scale={s}>
    <mesh position={[0, 0.5, 0]} material={m.gold}><cylinderGeometry args={[0.12, 0.2, 1, 8]} /></mesh>
    <mesh position={[0, 1.15, 0]} material={m.gold}><sphereGeometry args={[0.32, 12, 8]} /></mesh>
    <mesh position={[0, 1.75, 0]} material={m.gold}><sphereGeometry args={[0.22, 12, 8]} /></mesh>
    <mesh position={[0, 2.5, 0]} rotation-y={Math.PI / 2} material={m.gold}><torusGeometry args={[0.42, 0.08, 6, 16, Math.PI * 1.4]} /></mesh>
  </group>;
}
const archWin = (w: number, h: number) => { const s = new THREE.Shape(), r = w / 2; s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r); s.absarc(0, h - r, r, 0, Math.PI, false); s.closePath(); return new THREE.ShapeGeometry(s, 8); };

/* ===================== dış görünüş: kurşun çatı, sekizgen kasnak, payanda kuleleri, yarım ve küçük kubbeler, pencere sıraları ===================== */
function Exterior({ m }: { m: Mats }) {
  const B = HALL, t = WALL_T, ox0 = B.x0 - t, ox1 = B.x1 + t, oz0 = B.z0 - t, oz1 = B.z1 + t + 1.5;
  const g = useMemo(() => {
    const stone: Parts = [], lead: Parts = [], glass: Parts = [];
    // kurşun çatı döşemesi (kubbe açıklığı boş) ve saçak silmesi
    const sh = new THREE.Shape(); sh.moveTo(ox0, oz0); sh.lineTo(ox1, oz0); sh.lineTo(ox1, oz1); sh.lineTo(ox0, oz1); sh.closePath();
    const hole = new THREE.Path(); hole.absarc(0, 0, DOME_R, 0, Math.PI * 2, true); sh.holes.push(hole);
    const rf = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false, curveSegments: 40 }); rf.rotateX(Math.PI / 2); rf.translate(0, ROOF_Y, 0); lead.push(rf);
    const cy = H + F - 0.75, ch = 0.9, o = 0.45;
    slab(stone, ox0 - o, ox1 + o, oz0 - o, oz0, ch, cy); slab(stone, ox0 - o, ox1 + o, oz1, oz1 + o, ch, cy);
    slab(stone, ox0 - o, ox0, oz0, oz1, ch, cy); slab(stone, ox1, ox1 + o, oz0, oz1, ch, cy);
    // ara silme (pencere sıraları arasında)
    slab(stone, ox0 - 0.2, ox1 + 0.2, oz0 - 0.2, oz0, 0.4, F + 8); slab(stone, ox0 - 0.2, ox0, oz0, oz1, 0.4, F + 8); slab(stone, ox1, ox1 + 0.2, oz0, oz1, 0.4, F + 8);
    // sekizgen kasnak, üst bileziği ve payanda kuleleri
    const dh = DOME_Y + 0.7 - ROOF_Y; const oc = new THREE.CylinderGeometry(OCT_V, OCT_V, dh, 8, 1, true); oc.translate(0, ROOF_Y + dh / 2, 0); stone.push(oc);
    const ring = new THREE.RingGeometry(DOME_R - 0.6, OCT_V + 0.5, 8, 1); ring.rotateX(-Math.PI / 2); ring.rotateY(Math.PI / 2); ring.translate(0, DOME_Y + 0.7, 0); lead.push(ring);
    const band = new THREE.CylinderGeometry(OCT_V + 0.45, OCT_V + 0.45, 0.6, 8, 1, true); band.translate(0, DOME_Y + 0.4, 0); stone.push(band);
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, ps = a + Math.PI / 8, ap = OCT_V * Math.cos(Math.PI / 8) + 0.03, tx = Math.cos(ps), tz = -Math.sin(ps);
      // kasnak yüzünde iki pencere
      for (const off of [-2.6, 2.6]) { const w = archWin(1.7, 3.4); w.rotateY(ps); w.translate(Math.sin(ps) * ap + tx * off, ROOF_Y + 1.6, Math.cos(ps) * ap + tz * off); glass.push(w); }
      // köşede payanda kulesi + kurşun başlık
      const vx = Math.sin(a) * (OCT_V + 0.7), vz = Math.cos(a) * (OCT_V + 0.7), th = DOME_Y + 3 - ROOF_Y;
      const tw = new THREE.CylinderGeometry(1.25, 1.45, th, 8); tw.translate(vx, ROOF_Y + th / 2, vz); stone.push(tw);
      const cap = new THREE.SphereGeometry(1.45, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); cap.scale(1, 1.3, 1); cap.translate(vx, ROOF_Y + th, vz); lead.push(cap);
      const fin = new THREE.ConeGeometry(0.25, 1.4, 6); fin.translate(vx, ROOF_Y + th + 2.4, vz); lead.push(fin);
    }
    // köşegenlerde dört yarım kubbe (kasnağa yaslanır)
    for (let k = 0; k < 4; k++) { const ps = Math.PI / 4 + k * Math.PI / 2, d = 13.6, r = 5.2;
      const sd = new THREE.SphereGeometry(r, 24, 10, 0, Math.PI, 0, Math.PI / 2); sd.rotateY(ps); sd.translate(Math.sin(ps) * d, ROOF_Y, Math.cos(ps) * d); lead.push(sd);
      const sw = new THREE.CylinderGeometry(r, r, 1.2, 24, 1, true, ps - Math.PI / 2, Math.PI); sw.translate(Math.sin(ps) * d, ROOF_Y - 0.4, Math.cos(ps) * d); stone.push(sw); }
    // çatıdaki küçük kubbeler: köşeler ve yan galeriler
    const small: [number, number, number][] = [[-18.6, -15.5, 2.6], [18.6, -15.5, 2.6], [-18.6, 16.5, 2.6], [18.6, 16.5, 2.6], [-20.4, -6, 1.8], [20.4, -6, 1.8], [-20.4, 6, 1.8], [20.4, 6, 1.8], [-8.5, -17.5, 1.7], [8.5, -17.5, 1.7], [-8.5, 18.8, 1.7], [8.5, 18.8, 1.7]];
    for (const [x, z, r] of small) { const dr = new THREE.CylinderGeometry(r + 0.15, r + 0.25, 1.1, 12); dr.translate(x, ROOF_Y + 0.55, z); stone.push(dr);
      const d = new THREE.SphereGeometry(r, 16, 7, 0, Math.PI * 2, 0, Math.PI / 2); d.translate(x, ROOF_Y + 1.1, z); lead.push(d); }
    // duvar pencereleri: iki-üç sıra kemerli pencere
    const win = (x: number, y: number, z: number, ry: number, w: number, h: number) => { const q = archWin(w, h); q.rotateY(ry); q.translate(x, y, z); glass.push(q); };
    for (let i = 0; i < 9; i++) { const x = ox0 + 3.2 + i * ((ox1 - ox0 - 6.4) / 8);
      win(x, F + 2.6, oz0 - 0.03, Math.PI, 1.5, 3); win(x, F + 9.6, oz0 - 0.03, Math.PI, 1.5, 3.2); win(x, F + 15, oz0 - 0.03, Math.PI, 1.3, 2.6);
      if (Math.abs(x) > 5) { win(x, F + 9.6, oz1 + 0.03, 0, 1.5, 3.2); win(x, F + 15, oz1 + 0.03, 0, 1.3, 2.6); } }
    for (let i = 0; i < 8; i++) { const z = oz0 + 3.2 + i * ((oz1 - oz0 - 6.4) / 7);
      for (const sx of [-1, 1]) { const x = sx > 0 ? ox1 + 0.03 : ox0 - 0.03, ry = sx * Math.PI / 2;
        win(x, F + 2.6, z, ry, 1.5, 3); win(x, F + 9.6, z, ry, 1.5, 3.2); win(x, F + 15, z, ry, 1.3, 2.6); } }
    // avlu dış duvarında küçük pencereler
    for (let z = 23; z <= 45; z += 4.6) for (const sx of [-1, 1]) win(sx * (B.x1 + t + 0.03), F + 1.6, z + 2.3, sx * Math.PI / 2, 1.1, 2.2);
    return { stone: merge(stone), lead: merge(lead), glass: merge(glass) };
  }, [ox0, ox1, oz0, oz1, B.x1, t]);
  return <group>
    <mesh geometry={g.stone} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.lead} material={m.lead} castShadow receiveShadow />
    <mesh geometry={g.glass} material={m.glass} />
  </group>;
}

/* ===================== avlu ===================== */
export function Court({ m }: { m: Mats }) {
  const g = useMemo(() => { const stone: Parts = [], lead: Parts = [], C = COURT, top = F + 4.4;
    for (const q of COLUMNS) { const c = new THREE.CylinderGeometry(0.4, 0.45, 4.2, 12); c.translate(q[0], F + 2.1, q[1]); stone.push(c); const cap = bx(1, 0.35, 1, 1); cap.translate(q[0], top, q[1]); stone.push(cap); }
    // yan revaklar: sütunlar arası kemerler, üst döşeme ve her gözde kurşun kubbe
    const sideZ = COLUMNS.filter((q) => q[0] === 19.5).map((q) => q[1]).sort((a, b) => a - b);
    const arch = (x: number, z: number, span: number, alongZ: boolean) => { const r = span / 2 - 0.45, t = new THREE.TorusGeometry(r, 0.28, 6, 16, Math.PI); if (alongZ) t.rotateY(Math.PI / 2); t.translate(x, top - 0.2 - r + 0.6, z); stone.push(t); };
    for (const sx of [-1, 1]) {
      const x = sx * 19.5; slab(stone, Math.min(x, sx * 22.5) - 0.6, Math.max(x, sx * 22.5) + 0.2, C.z0 + 1.5, C.z1, 0.9, top + 0.15, 3);
      for (let i = 0; i < sideZ.length; i++) { const z0 = i === 0 ? C.z0 + 1.5 : sideZ[i - 1], z1 = sideZ[i]; arch(x, (z0 + z1) / 2, z1 - z0, true);
        const d = new THREE.SphereGeometry(1.45, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2); d.translate(sx * 21, top + 1.05, (z0 + z1) / 2); lead.push(d); }
    }
    // güney revakı (kapı tarafı)
    slab(stone, -19.5, 19.5, SOUTH_ROW_Z - 0.6, C.z1, 0.9, top + 0.15, 3);
    const xs = [-19.5, -14.95, -10.35, -5.75, 5.75, 10.35, 14.95, 19.5];
    for (let i = 0; i < xs.length - 1; i++) { const x0 = xs[i], x1 = xs[i + 1], cx = (x0 + x1) / 2, span = x1 - x0; arch(cx, SOUTH_ROW_Z, span, false);
      const r = Math.min(span / 2 - 0.3, 2.6), d = new THREE.SphereGeometry(r, 16, 7, 0, Math.PI * 2, 0, Math.PI / 2); d.translate(cx, top + 1.05, (SOUTH_ROW_Z + C.z1) / 2); lead.push(d); }
    // avlu taç kapısı: duvardan öne taşan, avlu duvarının iki katı yüksek blok (PORTAL); kemerli niş ve çerçeve Court bileşeninde ayrı çizilir
    { const P = PORTAL, zf = P.z1; slab(stone, -P.hw, GATE.x0, C.z1, zf, P.h + F - 0.1 - G0, G0); slab(stone, GATE.x1, P.hw, C.z1, zf, P.h + F - 0.1 - G0, G0);
      slab(stone, GATE.x0, GATE.x1, C.z1, zf, P.h - 5.5, F + 5.5);
      slab(stone, -P.hw - 0.35, P.hw + 0.35, C.z1 - 0.3, zf + 0.35, 0.6, F + P.h - 0.2);   // saçak silmesi
      for (const sx of [-1, 1]) { slab(stone, sx * P.hw - 0.7, sx * P.hw + 0.7, zf - 0.9, zf + 0.25, P.h + 1.8 + F - 0.1 - G0, G0);   // köşe payeleri
        const d = new THREE.SphereGeometry(0.75, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); d.translate(sx * P.hw, F + P.h + 1.7, zf - 0.32); lead.push(d);
        const fn = new THREE.ConeGeometry(0.15, 0.9, 6); fn.translate(sx * P.hw, F + P.h + 2.8, zf - 0.32); lead.push(fn); }
      // çerçeve: nişin iki yanında ve üstünde öne çıkan şeritler
      for (const sx of [-1, 1]) slab(stone, sx > 0 ? 4.3 : -5.1, sx > 0 ? 5.1 : -4.3, zf, zf + 0.18, 9.9 + F - 0.1 - G0, G0);
      slab(stone, -5.1, 5.1, zf, zf + 0.18, 0.8, F + 9.8); }
    // şadırvan: sekiz sütun, sekizgen saçak ve kurşun kubbe
    const P = POOL; for (let k = 0; k < 8; k++) { const a = (k + 0.5) * Math.PI / 4, c = new THREE.CylinderGeometry(0.18, 0.22, 3.2, 8); c.translate(P.c[0] + Math.cos(a) * (P.r + 0.35), F + 2.2, P.c[1] + Math.sin(a) * (P.r + 0.35)); stone.push(c); }
    const eave = new THREE.CylinderGeometry(P.r + 1.2, P.r + 0.6, 0.6, 8); eave.translate(P.c[0], F + 4, P.c[1]); lead.push(eave);
    const sd = new THREE.SphereGeometry(P.r + 0.2, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2); sd.scale(1, 0.75, 1); sd.translate(P.c[0], F + 4.3, P.c[1]); lead.push(sd);
    return { stone: merge(stone), lead: merge(lead) }; }, []);
  return <group>
    <mesh geometry={g.stone} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.lead} material={m.lead} castShadow receiveShadow />
    <mesh rotation-x={-Math.PI / 2} position={[0, F + 0.02, (COURT.z0 + COURT.z1) / 2]} receiveShadow><planeGeometry args={[COURT.x1 - COURT.x0, COURT.z1 - COURT.z0]} /><primitive object={m.paving} attach="material" /></mesh>
    <mesh position={[POOL.c[0], F + 0.08, POOL.c[1]]} rotation-x={-Math.PI / 2}><circleGeometry args={[POOL.r, 28]} /><primitive object={m.water} attach="material" /></mesh>
    <mesh position={[POOL.c[0], F + 0.45, POOL.c[1]]} rotation-x={-Math.PI / 2} castShadow receiveShadow><ringGeometry args={[POOL.r, POOL.r + 0.7, 28]} /><primitive object={m.stone} attach="material" /></mesh>
    <PortalNiche m={m} />
    <group position={[POOL.c[0], 0, POOL.c[1]]}><Alem m={m} y={F + 4.3 + (POOL.r + 0.2) * 0.75} s={0.6} /></group>
  </group>;
}

/** Taç kapının önyüzü: kapı açıklığı boş bırakılmış, gölgede kalan koyu kemerli niş, kapı üstünde yazı kuşağı ve saçak altında mukarnas benzeri küçük kemer dizisi (temsilî) */
function PortalNiche({ m }: { m: Mats }) {
  const g = useMemo(() => { const zf = PORTAL.z1 + 0.02, r = 4;
    const sh = new THREE.Shape(); sh.moveTo(-r, 0); sh.lineTo(r, 0); sh.lineTo(r, 9.4 - r); sh.absarc(0, 9.4 - r, r, 0, Math.PI, false); sh.closePath();
    const hole = new THREE.Path(); hole.moveTo(GATE.x0, 0); hole.lineTo(GATE.x0, 5.5); hole.lineTo(GATE.x1, 5.5); hole.lineTo(GATE.x1, 0); hole.closePath(); sh.holes.push(hole);
    const niche = new THREE.ShapeGeometry(sh, 16); niche.translate(0, F - 0.05, zf);
    const band: Parts = []; for (let i = 0; i < 12; i++) { const w = archWin(0.62, 0.9); w.translate(-5.2 + 0.31 + i * (10.4 / 12) + 0.12, F + PORTAL.h - 1.35, PORTAL.z1 + 0.36); band.push(w); }
    return { niche, band: merge(band) }; }, []);
  return <group>
    <mesh geometry={g.niche}><meshStandardMaterial color="#a88f66" roughness={0.95} /></mesh>
    <mesh geometry={g.band} material={m.glass} />
    <mesh position={[0, F + 6.3, PORTAL.z1 + 0.04]}><planeGeometry args={[6, 0.9]} /><meshStandardMaterial color="#2d4a3e" roughness={0.6} /></mesh>
    <mesh position={[0, F + 6.3, PORTAL.z1 + 0.05]}><planeGeometry args={[5.4, 0.12]} /><meshStandardMaterial color="#d9b24a" metalness={0.8} roughness={0.35} /></mesh>
  </group>;
}

/* ===================== minareler ===================== */
/** İnce kalem minareler: sekizgen kaide, daralan gövde, üç şerefe (konsol + korkuluk), uzun kurşun külah ve alem. Yükseklik ~71 m (külah ucu), temsilî */
export function Minarets({ m }: { m: Mats }) {
  const g = useMemo(() => { const stone: Parts = [], lead: Parts = [], sh = 60;
    for (const q of MINARETS) {
      const base = new THREE.CylinderGeometry(MINARET_R * 0.95, MINARET_R, 10 - G0, 8); base.translate(q[0], (10 + G0) / 2, q[1]); stone.push(base);
      const tr = new THREE.CylinderGeometry(1.9, MINARET_R * 0.95, 1.6, 16); tr.translate(q[0], 10.8, q[1]); stone.push(tr);
      const body = new THREE.CylinderGeometry(1.3, 1.9, sh - 11.6, 16); body.translate(q[0], 11.6 + (sh - 11.6) / 2, q[1]); stone.push(body);
      for (const y of [36, 47, 56]) { const rr = 1.3 + 0.6 * (1 - (y - 11.6) / (sh - 11.6));
        const cb = new THREE.CylinderGeometry(rr + 1.05, rr, 1.6, 16); cb.translate(q[0], y - 0.8, q[1]); stone.push(cb);
        const fl = new THREE.CylinderGeometry(rr + 1.1, rr + 1.1, 0.25, 16); fl.translate(q[0], y + 0.1, q[1]); stone.push(fl);
        const rail = new THREE.CylinderGeometry(rr + 1.05, rr + 1.05, 1.1, 16, 1, true); rail.translate(q[0], y + 0.8, q[1]); stone.push(rail);
        const cap = new THREE.CylinderGeometry(rr + 1.15, rr + 1.15, 0.15, 16); cap.translate(q[0], y + 1.4, q[1]); stone.push(cap); }
      const top = new THREE.CylinderGeometry(1.45, 1.3, 0.6, 16); top.translate(q[0], sh + 0.3, q[1]); stone.push(top);
      const cone = new THREE.ConeGeometry(1.5, 11, 16); cone.translate(q[0], sh + 0.6 + 5.5, q[1]); lead.push(cone);
    }
    return { stone: merge(stone), lead: merge(lead) }; }, []);
  return <group>
    <mesh geometry={g.stone} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.lead} material={m.lead} castShadow />
    {MINARETS.map((q, i) => <group key={i} position={[q[0], 0, q[1]]}><Alem m={m} y={71.6} s={0.8} /></group>)}
  </group>;
}

/* ===================== külliye kanatları (temsilî): kuzey köşelerde iki medrese, batıda uzun arasta; avlu yürünmez alanın dışında ===================== */
export function Kulliye({ m }: { m: Mats }) {
  const g = useMemo(() => { const stone: Parts = [], lead: Parts = [];
    const wing = (x0: number, x1: number, z0: number, z1: number, h: number, r: number, alongX: boolean) => { slab(stone, x0, x1, z0, z1, h - G0, G0, 2.4);
      const n = Math.floor(((alongX ? x1 - x0 : z1 - z0)) / (2 * r + 0.8)); const rows = Math.max(1, Math.floor(((alongX ? z1 - z0 : x1 - x0)) / (2 * r + 1)));
      for (let i = 0; i < n; i++) for (let j = 0; j < rows; j++) { const u = (i + 0.5) / n, v = (j + 0.5) / rows; const x = alongX ? x0 + u * (x1 - x0) : x0 + v * (x1 - x0), z = alongX ? z0 + v * (z1 - z0) : z0 + u * (z1 - z0);
        const d = new THREE.SphereGeometry(r, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2); d.translate(x, h, z); lead.push(d); } };
    // medrese: ortada açık avlu, çevresinde tek sıra kubbeli hücreler
    for (const sx of [-1, 1]) { const a = sx * 18, b = sx * 46, x0 = Math.min(a, b), x1 = Math.max(a, b);
      wing(x0, x1, -60, -56, 6, 1.5, true); wing(x0, x1, -48, -44, 6, 1.5, true); wing(x0, x0 + 4, -56, -48, 6, 1.5, false); wing(x1 - 4, x1, -56, -48, 6, 1.5, false); }
    wing(-86, -76, -14, 74, 4.5, 1.5, false);
    return { stone: merge(stone), lead: merge(lead) }; }, []);
  return <group>
    <mesh geometry={g.stone} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.lead} material={m.lead} castShadow />
  </group>;
}

/* ===================== meydan, şehir, çevre ===================== */
export function Ground({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(420, 320, tier === 'high' ? 40 : 20, tier === 'high' ? 40 : 20); g.rotateX(-Math.PI / 2); g.translate(0, 0, 30);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#86a05a'), pave = new THREE.Color('#cfc6b0');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); c.copy(grass).lerp(pave, Math.abs(x) < 44 && z > -28 && z < 86 ? 0.8 : 0); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} position={[0, -0.12, 0]} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.15} roughness={1} /></mesh>;
}
export function City({ m }: { m: Mats }) {
  const geo = useMemo(() => { const r = rng(33), walls: Parts = [], roofs: Parts = [];
    for (let i = 0; i < 110; i++) { const side = r(), x = side < 0.3 ? -94 - r() * 60 : side < 0.6 ? 78 + r() * 70 : -72 + r() * 144, z = side < 0.6 ? -40 + r() * 140 : 96 + r() * 50, w = 7 + r() * 6, d = 7 + r() * 5, h = 5 + r() * 5;
      const b = bx(w, h, d, 2.4); b.translate(x, h / 2 + G0, z); walls.push(b);
      const roof = new THREE.ConeGeometry(Math.max(w, d) * 0.72, 2.4, 4); roof.rotateY(Math.PI / 4); roof.translate(x, h + 1.2, z); roofs.push(roof); }
    return { walls: merge(walls), roofs: merge(roofs) }; }, []);
  return <group>
    <mesh geometry={geo.walls} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={geo.roofs} material={m.roof} castShadow />
  </group>;
}
export function Trees({ n }: { n: number }) {
  const geo = useMemo(() => { const parts: Parts = []; const t = new THREE.CylinderGeometry(0.3, 0.45, 3.6, 7); t.translate(0, 1.8, 0); parts.push(t); for (const [x, y, z, r] of [[0, 5.2, 0, 2.6], [1.3, 4.4, 0.6, 1.8], [-1.1, 4.6, -0.8, 1.9], [0.2, 6.6, -0.3, 1.7]]) { const c = new THREE.IcosahedronGeometry(r, 1); c.translate(x, y, z); parts.push(c); } const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4d7438', roughness: 0.95, flatShading: true }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(15), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 10 && k < n; i++) { const x = -130 + r() * 260, z = -50 + r() * 190; if (x > AREA.x0 - 4 && x < AREA.x1 + 4 && z > AREA.z0 - 4 && z < AREA.z1 + 4) continue; if ((Math.abs(x) < 50 && z < -38) || (x > -90 && x < -72 && z > -18 && z < 78)) continue;
      o.position.set(x, G0, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(1 + r() * 0.7); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -70 + r() * 140, z = -36 + r() * 126; if (Math.abs(x) < 46 && z > -28 && z < 86) continue;
      o.position.set(x, -0.1, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.22 + r() * 0.05, 0.4, 0.4 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + r() * 0.2, dd = 800 + r() * 300; out.push({ p: [Math.cos(a) * dd, -8, Math.sin(a) * dd], g: mountainGeo(340 + r() * 160, 110 + r() * 90, 310 + i, 0, '#6a8250') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
