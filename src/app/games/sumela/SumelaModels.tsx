/**
 * Sümela Manastırı — 3B modeller (öteki yeni oyunlarla aynı ortak manzara kiti).
 * Karadağ'ın kaya yüzü ve manastırın oturduğu oyuk (sarkan kaya tavanı), vadiye bakan çok katlı beyaz cephe (sıra sıra kemerli pencere,
 * ahşap cumbalı balkonlar), doğu kanadı ve kemerli giriş, kaya kilisesi mağarası, dış duvarları freskli şapel, kaya yüzü boyunca su kemeri,
 * ladin-kayın ormanı, vadide sis. Yerleşim, ölçüler ve fresk görüntüleri TEMSİLÎDİR (docs/SUMELA.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { AQUEDUCT, BLOCKS, CAVE, LEDGE, NICHE, PATH_PTS, PATH_W, faceZ, groundY, inNiche, pathAt, terrainBase, type Block } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.3, 0.7, 0.65).normalize();
const smooth = (a: number, b: number, t: number) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const FLOOR = 3.4;

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; rock: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('sumela-tas', ['#b8ad98', '#a89c86', '#c4b8a2', '#9b9079', '#b0a48e'], [22, 14], [30, 40]);
    // kaya: yatay katmanlar, dikey çatlaklar, liken lekeleri (blok deseni yok)
    const rkMap = canvasTex(512, 512, (g, r) => { g.fillStyle = '#7f7c73'; g.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 512; y += 6 + r() * 14) { const v = 0.85 + r() * 0.25; g.fillStyle = `rgba(${(128 * v) | 0},${(124 * v) | 0},${(114 * v) | 0},.6)`; g.fillRect(0, y, 512, 4 + r() * 10); }
      for (let i = 0; i < 90; i++) { const x = r() * 512, y = r() * 512; g.strokeStyle = `rgba(40,38,34,${0.3 + r() * 0.3})`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) g.lineTo(x + (r() - 0.5) * 14, y + k * 14 + r() * 10); g.stroke(); }
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,105,70' : '170,165,150'},${0.1 + r() * 0.15})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 8 + r() * 40, 5 + r() * 20, r() * 3, 0, 7); g.fill(); }
      for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.08})`; g.fillRect(r() * 512, r() * 512, 2, 2); } }, true, 77);
    const rkBump = canvasTex(256, 256, (g, r) => { g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 4 + r() * 8) { g.fillStyle = `rgba(${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},.25)`; g.fillRect(0, y, 256, 2 + r() * 5); } }, false, 78);
    const rk = { map: rkMap, bump: rkBump };
    const rf = canvasTex(256, 256, (g, r) => { g.fillStyle = '#8a4a36'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 16) for (let x = 0; x < 256; x += 14) { const v = 0.75 + r() * 0.4; g.fillStyle = `rgb(${(150 * v) | 0},${(80 * v) | 0},${(58 * v) | 0})`; g.fillRect(x + ((y / 16) % 2) * 7, y, 12, 14); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + ((y / 16) % 2) * 7, y + 12, 12, 3); } });
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.5, roughness: 0.95 })),
      rock: new THREE.MeshStandardMaterial({ map: rk.map, bumpMap: rk.bump, bumpScale: 1.2, roughness: 1 }),
      roof: new THREE.MeshStandardMaterial({ map: rf, roughness: 0.85 }),
      wood: new THREE.MeshStandardMaterial({ color: '#6a4a32', roughness: 0.8 }),
      dark: new THREE.MeshStandardMaterial({ color: '#25211d', roughness: 1 }),
    };
  }, []);
}

/* ===================== arazi, kaya ===================== */
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => {
    const N = tier === 'high' ? 400 : tier === 'medium' ? 300 : 200, W = 620, D = 560, g = new THREE.PlaneGeometry(W, D, N, Math.round((N * D) / W)); g.rotateX(-Math.PI / 2); g.translate(90, 0, 150);
    const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), r = rng(4);
    const forest = new THREE.Color('#3f5a30'), moss = new THREE.Color('#56703a'), rock = new THREE.Color('#8a877c'), rockD = new THREE.Color('#6b685f'), path = new THREE.Color('#8f8068');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = groundY(x, z); p.setY(i, y); uv.setXY(i, x / W + 0.5, -z / D + 0.5);
      const sl = Math.hypot(groundY(x + 1, z) - groundY(x - 1, z), groundY(x, z + 1) - groundY(x, z - 1)) / 2;
      c.copy(forest).lerp(moss, 0.4 + 0.3 * Math.sin(x * 0.05 + z * 0.04)).lerp(rock, smooth(0.8, 1.6, sl)).lerp(rockD, smooth(2.5, 6, sl) * 0.5 * (0.5 + r()));
      if (inNiche(x, z)) c.copy(rock).lerp(path, 0.4);
      if (!inNiche(x, z) && Math.abs(z - faceZ(x)) < 3) c.copy(rockD);   // dik yüzün iki ucu kaya rengi (yeşil şerit olmasın)
      if (pathAt(x, z).d < PATH_W / 2 + 0.6 && !inNiche(x, z)) c.lerp(path, 0.8);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }, [tier]);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors bumpMap={groundTex().bump} bumpScale={0.25} roughness={1} /></mesh>;
}
/** Kaya yüzünün dikey cephesi (yükseklik haritası dik yüzü iyi göstermez): oyuğun iki yanında ve üstünde dokulu kaya duvarı */
export function CliffFace({ m }: { m: Mats }) {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [], step = 2;
    for (let x = -200; x < 380; x += step) { if (x + step > NICHE.x0 && x < NICHE.x1) continue; const z0 = faceZ(x), z1 = faceZ(x + step), base = Math.min(terrainBase(x, z0 + 1), terrainBase(x + step, z1 + 1)) - 2, top = Math.max(terrainBase(x, z0 - 1.5), terrainBase(x + step, z1 - 1.5));
      const g = new THREE.PlaneGeometry(Math.hypot(step, z1 - z0) + 0.05, top - base, 1, 8), pp = g.attributes.position as THREE.BufferAttribute; for (let k = 0; k < pp.count; k++) pp.setZ(k, Math.sin(pp.getY(k) * 0.4 + x) * 0.8);
      g.rotateY(-Math.atan2(z1 - z0, step)); g.translate(x + step / 2, (base + top) / 2, (z0 + z1) / 2 + 0.9); parts.push(g.toNonIndexed()); }
    const g = mergeGeometries(parts)!; const uv = g.attributes.uv as THREE.BufferAttribute, p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 16, p.getY(i) / 16); g.computeVertexNormals(); return g;
  }, []);
  return <mesh geometry={geo} material={m.rock} receiveShadow userData={{ noCast: true }} />;
}
/** Oyuğun sarkan kaya tavanı ve yan duvarları (manastır bu kemerin altında oturur) */
export function Overhang({ m }: { m: Mats }) {
  const geo = useMemo(() => {
    const W = NICHE.x1 - NICHE.x0 + 8, D = 30, g = new THREE.PlaneGeometry(W, D, 40, 16); g.rotateX(Math.PI / 2);   // aşağı bakan yüzey
    const p = g.attributes.position as THREE.BufferAttribute, r = rng(3);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i) - 9, u = Math.abs(x) / (W / 2), front = smooth(-24, 4, z);
      p.setXYZ(i, x, LEDGE + 22 + 18 * u ** 2 - 10 * front * (1 - u ** 2) + (r() - 0.5) * 1.6 + (z < -20 ? (-20 - z) * 2 : 0), z); }
    g.computeVertexNormals(); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 14, p.getZ(i) / 14); return g;
  }, []);
  const walls = useMemo(() => { const parts: THREE.BufferGeometry[] = [];
    for (const x of [NICHE.x0 - 1, NICHE.x1 + 1]) { const g = bx(2, 100, NICHE.z1 - NICHE.z0 + 6, 16); g.translate(x, LEDGE + 30, (NICHE.z0 + 3) / 2); parts.push(g); }
    const back = bx(NICHE.x1 - NICHE.x0 + 4, 100, 2, 16); back.translate(0, LEDGE + 30, NICHE.z0 - 1.5); parts.push(back);
    return mergeGeometries(parts)!; }, []);
  return <group>
    <mesh geometry={geo} material={m.rock} position={[(NICHE.x0 + NICHE.x1) / 2, 0, 0]} castShadow receiveShadow />
    <mesh geometry={walls} material={m.rock} receiveShadow />
  </group>;
}

/* ===================== manastır yapıları ===================== */
function facadeTex(floors: number, seed: number) {
  return canvasTex(512, 128 * floors, (g, r) => {
    g.fillStyle = '#f1ece2'; g.fillRect(0, 0, 512, 128 * floors);
    for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,110,95' : '255,255,255'},${r() * 0.07})`; g.fillRect(r() * 512, r() * 128 * floors, 3, 3); }
    for (let f = 0; f < floors; f++) { const y0 = f * 128; g.fillStyle = '#d9cfbd'; g.fillRect(0, y0 + 120, 512, 8);
      for (let k = 0; k < 6; k++) { const x = 22 + k * 82; g.fillStyle = '#5b4330'; g.fillRect(x - 3, y0 + 26, 46, 72); g.beginPath(); g.arc(x + 20, y0 + 28, 23, Math.PI, 0); g.fill();
        g.fillStyle = '#2e3640'; g.fillRect(x, y0 + 30, 40, 64); g.beginPath(); g.arc(x + 20, y0 + 30, 20, Math.PI, 0); g.fill(); g.fillStyle = '#5b4330'; g.fillRect(x + 18, y0 + 16, 4, 78); } }
    g.fillStyle = 'rgba(80,70,60,.18)'; for (let i = 0; i < 20; i++) g.fillRect(r() * 512, 0, 2 + r() * 4, 128 * floors);   // yağmur izi
  }, true, seed);
}
function frescoTex() {
  return canvasTex(512, 256, (g, r) => {
    g.fillStyle = '#c9a874'; g.fillRect(0, 0, 512, 256);
    for (let band = 0; band < 2; band++) { const y0 = 12 + band * 122; g.fillStyle = band ? '#3b5570' : '#7a2e24'; g.fillRect(6, y0, 500, 112);
      for (let k = 0; k < 7; k++) { const x = 28 + k * 70; g.fillStyle = '#e6c46a'; g.beginPath(); g.arc(x, y0 + 30, 15, 0, 7); g.fill();   // hale
        g.fillStyle = '#e8c9a8'; g.beginPath(); g.arc(x, y0 + 30, 9, 0, 7); g.fill(); g.fillStyle = ['#a33b2c', '#2f5f7a', '#e2d6b8', '#5a7a3a'][Math.floor(r() * 4)]; g.beginPath(); g.moveTo(x - 16, y0 + 106); g.lineTo(x - 10, y0 + 42); g.lineTo(x + 10, y0 + 42); g.lineTo(x + 16, y0 + 106); g.fill(); } }
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(200,185,160,${0.4 + r() * 0.5})`; g.beginPath(); g.ellipse(r() * 512, r() * 256, 4 + r() * 22, 3 + r() * 12, r() * 3, 0, 7); g.fill(); }   // dökülmüş yerler
    g.fillStyle = 'rgba(0,0,0,.3)'; g.font = '14px sans-serif'; g.fillText('temsilî', 452, 250);
  });
}
function Building({ b, m }: { b: Block; m: Mats }) {
  const w = b.x1 - b.x0, d = b.z1 - b.z0, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, H = b.floors * FLOOR;
  const tex = useMemo(() => b.kind === 'sapel' ? frescoTex() : facadeTex(b.floors, b.id.length * 7), [b]);
  const mats = useMemo(() => { const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), flat = new THREE.MeshStandardMaterial({ color: '#d8cfbe', roughness: 0.9 }); if (b.kind !== 'sapel') { tex.repeat.set(Math.max(1, Math.round(w / 12)), 1); } return [side, side, flat, flat, side, side]; }, [tex, b, w]);
  const roofGeo = useMemo(() => { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); return g; }, []);
  const front = b.z1 > -1;   // vadiye bakan yapılar: altında yamaca inen taş kaide
  return <group>
    {front && <mesh geometry={bx(w, LEDGE - 120, d + 0.4, 3)} material={m.stone} position={[cx, (LEDGE + 120) / 2, cz]} castShadow receiveShadow />}
    <mesh position={[cx, LEDGE + H / 2, cz]} material={mats} castShadow receiveShadow><boxGeometry args={[w, H, d]} /></mesh>
    <mesh geometry={roofGeo} material={m.roof} position={[cx, LEDGE + H, cz]} scale={[w + 1.2, b.kind === 'sapel' ? 2.2 : 2.6, d + 1.2]} castShadow />
    {b.kind === 'cephe' && Array.from({ length: Math.floor(w / 8) }, (_, i) => <group key={i} position={[b.x0 + 4 + i * 8, LEDGE + FLOOR * 2.2, b.z1 + 0.55]}>
      <mesh material={m.wood} castShadow><boxGeometry args={[3.2, 2.4, 1.1]} /></mesh>
      <mesh material={m.dark} position={[0, 0.1, 0.56]}><planeGeometry args={[2.6, 1.6]} /></mesh>
    </group>)}
  </group>;
}
export function Monastery({ m }: { m: Mats }) {
  const caveFresco = useMemo(() => frescoTex(), []);
  const floorMat = useMemo(() => { const t = m.stone.map!.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 5); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, color: '#cfc7b8', roughness: 0.95 }); }, [m]);
  return <group>
    {BLOCKS.map((b) => <Building key={b.id} b={b} m={m} />)}
    {/* kemerli giriş kapısı (doğu kanadı ile kaya arasında) */}
    <group position={[33.5, LEDGE, faceZ(33.5) - 0.8]}>
      {[-3.2, 3.2].map((x) => <mesh key={x} geometry={bx(1.4, 6, 1.6, 2)} material={m.stone} position={[x, 3, 0]} castShadow />)}
      <mesh geometry={bx(8, 1.6, 1.6, 2)} material={m.stone} position={[0, 6.6, 0]} castShadow />
      <mesh material={m.stone} position={[0, 4.6, 0]}><torusGeometry args={[2.5, 0.35, 6, 16, Math.PI]} /></mesh>
    </group>
    {/* kaya kilisesinin ağzı: kemerli, içi karanlık mağara */}
    <group position={[(CAVE.x0 + CAVE.x1) / 2, LEDGE, CAVE.z1 - 0.2]}>
      <mesh material={m.rock} position={[0, 7.5, 0]}><torusGeometry args={[7, 1.8, 8, 20, Math.PI]} /></mesh>
      {/* mağaranın içi: kaya duvarına işlenmiş fresk ve mum ışığı */}
      <mesh position={[0, 4, -4.8]}><planeGeometry args={[13, 7]} /><meshStandardMaterial map={caveFresco} roughness={0.9} color="#b9a990" /></mesh>
      <mesh material={m.rock} position={[0, 4, -5]} rotation-y={0}><boxGeometry args={[14, 9, 0.3]} /></mesh>
      <pointLight position={[0, 3, -2.5]} color="#ffcf8a" intensity={60} distance={14} decay={2} />
    </group>
    {/* avlu döşemesi */}
    <mesh rotation-x={-Math.PI / 2} position={[0, LEDGE + 0.03, (NICHE.z0 + 0) / 2]} material={floorMat} receiveShadow><planeGeometry args={[NICHE.x1 - NICHE.x0 - 2, -NICHE.z0 - 1]} /></mesh>
  </group>;
}
/** Kaya yüzü boyunca su kemeri: ince ayaklar, kemerler ve üstte su kanalı */
export function Aqueduct({ m }: { m: Mats }) {
  const geo = useMemo(() => { const parts: THREE.BufferGeometry[] = [], { x0, x1, y } = AQUEDUCT, span = 4;
    for (let x = x0; x <= x1; x += span) { const z = faceZ(x) + 1.4, base = terrainBase(x, z + 2) - 1, h = y - base; if (h < 1) continue; const g = bx(1.1, h, 1.2, 2); g.translate(x, base + h / 2, z); parts.push(g); }
    for (let x = x0; x < x1; x += span) { const z = faceZ(x + span / 2) + 1.4, a = new THREE.TorusGeometry(span / 2 - 0.5, 0.35, 5, 10, Math.PI); a.translate(x + span / 2, y - 1.6, z); parts.push(a.toNonIndexed().index ? a : a.toNonIndexed()); }
    for (let x = x0; x < x1; x += 2) { const z = faceZ(x + 1) + 1.4, c = bx(2.05, 0.8, 1.3, 2); c.translate(x + 1, y + 0.4, z); parts.push(c); }
    return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!; }, []);
  return <mesh geometry={geo} material={m.stone} castShadow receiveShadow />;
}
/** Patika: toprak-taş şerit, son kısmı merdiven basamakları, uçurum tarafında ahşap korkuluk */
export function Path({ m }: { m: Mats }) {
  const geo = useMemo(() => { const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < PATH_PTS.length - 1; i++) { const a = PATH_PTS[i], b = PATH_PTS[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) + PATH_W, g = new THREE.PlaneGeometry(PATH_W + 0.4, L, 2, Math.ceil(L / 0.6)).toNonIndexed();
      g.rotateX(-Math.PI / 2); g.rotateY(Math.atan2(b[0] - a[0], b[1] - a[1])); g.translate((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2);
      const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute; for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k); p.setY(k, groundY(x, z) + 0.05); uv.setXY(k, x / 3, z / 3); } g.computeVertexNormals(); parts.push(g); }
    return mergeGeometries(parts)!; }, []);
  const rail = useMemo(() => { const parts: THREE.BufferGeometry[] = [];
    for (let i = 3; i < PATH_PTS.length - 2; i++) { const a = PATH_PTS[i], b = PATH_PTS[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      for (let s = 0; s < L; s += 2.5) { const x = a[0] + ux * s + uz * (PATH_W / 2 + 0.2), z = a[1] + uz * s - ux * (PATH_W / 2 + 0.2), y = groundY(a[0] + ux * s, a[1] + uz * s), g = new THREE.BoxGeometry(0.1, 1.1, 0.1); g.translate(x, y + 0.55, z); parts.push(g); }
      const g = new THREE.BoxGeometry(0.07, 0.07, L); g.lookAt(new THREE.Vector3(ux, (groundY(...b) - groundY(...a)) / L, uz)); const mx = (a[0] + b[0]) / 2 + uz * (PATH_W / 2 + 0.2), mz = (a[1] + b[1]) / 2 - ux * (PATH_W / 2 + 0.2); g.translate(mx, (groundY(...a) + groundY(...b)) / 2 + 1.05, mz); parts.push(g); }
    return mergeGeometries(parts.map((g) => g.toNonIndexed()))!; }, []);
  return <group>
    <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial map={m.stone.map} color="#a89c88" roughness={1} /></mesh>
    <mesh geometry={rail} material={m.wood} castShadow />
  </group>;
}

/* ===================== orman, sis, dağ ===================== */
function spruceGeo(seed: number) { const r = rng(seed), parts: THREE.BufferGeometry[] = [], paint = (g: THREE.BufferGeometry, hex: string, j: number) => { const gg = g.toNonIndexed(), col: number[] = [], c = new THREE.Color(); for (let i = 0; i < gg.attributes.position.count; i++) { c.set(hex).offsetHSL(0, 0, (r() - 0.5) * j); col.push(c.r, c.g, c.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.deleteAttribute('uv'); return gg; };
  parts.push(paint(new THREE.CylinderGeometry(0.15, 0.35, 4, 6).translate(0, 2, 0), '#4a3828', 0.05));
  for (let k = 0; k < 5; k++) { const rr = 2.8 - k * 0.5, y = 2.5 + k * 2.1; parts.push(paint(new THREE.ConeGeometry(rr, 3.4, 8).translate(0, y + 1.7, 0), '#2f4a2c', 0.1)); }
  const g = mergeGeometries(parts)!; g.computeVertexNormals(); return g; }
function beechGeo(seed: number) { const r = rng(seed), parts: THREE.BufferGeometry[] = [], paint = (g: THREE.BufferGeometry, hex: string, j: number) => { const gg = g.index ? g.toNonIndexed() : g, col: number[] = [], c = new THREE.Color(); for (let i = 0; i < gg.attributes.position.count; i++) { c.set(hex).offsetHSL(0, 0, (r() - 0.5) * j); col.push(c.r, c.g, c.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.deleteAttribute('uv'); return gg; };
  parts.push(paint(new THREE.CylinderGeometry(0.2, 0.32, 5, 7).translate(0, 2.5, 0), '#7a746a', 0.05)); for (let i = 0; i < 6; i++) { const a = r() * 6.28, d = i ? 1.4 + r() : 0; parts.push(paint(new THREE.IcosahedronGeometry(1.8 + r() * 0.6, 1).translate(Math.cos(a) * d, 6 + r() * 2, Math.sin(a) * d), '#4f7a34', 0.12)); }
  const g = mergeGeometries(parts)!; g.computeVertexNormals(); return g; }
export function Forest({ n }: { n: number }) {
  const kinds = useMemo(() => [spruceGeo(3), beechGeo(4)], []), mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []), refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  useEffect(() => { const r = rng(23), o = new THREE.Object3D(), cnt = [0, 0];
    for (let i = 0; i < n * 8 && cnt[0] + cnt[1] < n; i++) { const x = -200 + r() * 580, z = -130 + r() * 540, fz = faceZ(x), y = groundY(x, z), sl = Math.hypot(groundY(x + 1, z) - groundY(x - 1, z), groundY(x, z + 1) - groundY(x, z - 1)) / 2;
      if (inNiche(x, z, -6) || (z > fz - 4 && z < fz + 3) || sl > 1.2 || pathAt(x, z).d < 4.5) continue; if (x > NICHE.x0 - 14 && x < AQUEDUCT.x1 + 6 && z > fz && z < fz + 14) continue;   // manastırın ve kemerin önü açık
      const t = r() < 0.7 ? 0 : 1, m = refs.current[t]; if (!m) continue; o.position.set(x, y - 0.2, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.8 + r() * 0.7); o.updateMatrix(); m.setMatrixAt(cnt[t]++, o.matrix); }
    refs.current.forEach((m, i) => { if (!m) return; m.count = cnt[i]; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }); }, [n]);
  return <group>{kinds.map((g, i) => <instancedMesh key={i} ref={(mm) => { refs.current[i] = mm; }} args={[g, mat, n]} castShadow receiveShadow />)}</group>;
}
export function Ferns({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 6 && k < n; i++) { const s0 = Math.floor(r() * (PATH_PTS.length - 1)), a = PATH_PTS[s0], b = PATH_PTS[s0 + 1], t = r(), x = a[0] + (b[0] - a[0]) * t + (r() - 0.5) * 24, z = a[1] + (b[1] - a[1]) * t + (r() - 0.5) * 24;
      if (pathAt(x, z).d < PATH_W / 2 + 0.3 || z < faceZ(x) + 0.5 || inNiche(x, z, -1)) continue;
      o.position.set(x, groundY(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.6 + r() * 0.6; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.25 + r() * 0.05, 0.45, 0.32 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
/** Vadide sis bulutları (yavaşça süzülür) */
export function Mist({ n }: { n: number }) {
  const tex = useMemo(() => canvasTex(256, 128, (g, r) => { for (let i = 0; i < 26; i++) { const x = 30 + r() * 196, y = 40 + r() * 50, rad = 20 + r() * 40, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); } }), []);
  const list = useMemo(() => { const r = rng(14); return Array.from({ length: n }, () => ({ x: -150 + r() * 500, y: 40 + r() * 70, z: 90 + r() * 260, s: 60 + r() * 90, v: 0.4 + r() * 0.8 })); }, [n]);
  const refs = useRef<(THREE.Sprite | null)[]>([]);
  useFrame(({ clock }) => { list.forEach((c, i) => { const sp = refs.current[i]; if (sp) sp.position.x = c.x + Math.sin(clock.elapsedTime * 0.02 * c.v + i) * 30; }); });
  return <group userData={{ noCast: true }}>{list.map((c, i) => <sprite key={i} ref={(s) => { refs.current[i] = s; }} position={[c.x, c.y, c.z]} scale={[c.s, c.s * 0.4, 1]}><spriteMaterial map={tex} transparent depthWrite={false} opacity={0.7} /></sprite>)}</group>;
}
export function Mountains() {
  const list = useMemo(() => { const r = rng(61), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + r() * 0.3, dd = 800 + r() * 600; out.push({ p: [Math.cos(a) * dd + 90, -20, Math.sin(a) * dd + 150], g: mountainGeo(420 + r() * 260, 260 + r() * 220, 90 + i, 0.86, '#3f5a34') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
