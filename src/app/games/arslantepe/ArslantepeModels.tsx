/**
 * Arslantepe — 3B modeller: höyük, yol, Geç Hitit aslanlı kapısı ve kral heykeli (kopyalar), koruma çatısı altında kerpiç saray
 * (koridor, dört depo ve mühürlü ahşap kapılar, dağıtım ve tören salonları), depoların içindekiler (küpler, kırık mühür yığını,
 * kâse istifleri, kılıçlar), sandık "kral mezarı", kayısı bahçeleri. Biçimler ve ölçüler TEMSİLÎDİR (docs/ARSLANTEPE.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useFrame } from '@react-three/fiber';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { COR, DESK, DOOR_W, FLOOR_Y, GATE, PAL, ROOF, ROOMS, TOMB, terrain, type Room } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const slab = (p: Parts, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, s = 2) => { if (x1 - x0 < 0.01 || z1 - z0 < 0.01 || y1 - y0 < 0.01) return; const g = bx(x1 - x0, y1 - y0, z1 - z0, s); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); p.push(g); };
const Y = FLOOR_Y, T = PAL.t, H = PAL.h;

export interface Mats { mud: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; clay: THREE.MeshStandardMaterial; stone: THREE.MeshStandardMaterial; basalt: THREE.MeshStandardMaterial; copper: THREE.MeshStandardMaterial; silver: THREE.MeshStandardMaterial; steel: THREE.MeshStandardMaterial; glass: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const mud = canvasTex(256, 256, (g, r) => { g.fillStyle = '#a3825e'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 22) for (let x = -((y / 22) % 2) * 24; x < 256; x += 48) { const v = 0.86 + r() * 0.22; g.fillStyle = `rgb(${(190 * v) | 0},${(160 * v) | 0},${(120 * v) | 0})`; g.fillRect(x + 2, y + 2, 44, 18); }
      for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,50,30' : '235,220,190'},${r() * 0.18})`; g.fillRect(r() * 256, r() * 256, 1.5, 1.5); } });
    const st = stoneTex('arslantepe-tas', ['#b7ab96', '#a99d88', '#c2b7a2', '#9d917c'], [30, 20], [50, 60]);
    const ba = stoneTex('arslantepe-bazalt', ['#5a5650', '#4e4a45', '#66625b'], [30, 20], [50, 60]);
    return {
      mud: weather(new THREE.MeshStandardMaterial({ map: mud, bumpMap: mud, bumpScale: 0.5, roughness: 0.96 })),
      plaster: new THREE.MeshStandardMaterial({ color: '#cdb491', roughness: 0.95 }),
      wood: new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.85 }),
      clay: new THREE.MeshStandardMaterial({ color: '#b5835a', roughness: 0.9 }),
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.5, roughness: 0.92 })),
      basalt: new THREE.MeshStandardMaterial({ map: ba.map, bumpMap: ba.bump, bumpScale: 0.4, roughness: 0.9 }),
      copper: new THREE.MeshStandardMaterial({ color: '#8a5a3a', roughness: 0.45, metalness: 0.7 }),
      silver: new THREE.MeshStandardMaterial({ color: '#c8c8c8', roughness: 0.3, metalness: 0.9 }),
      steel: new THREE.MeshStandardMaterial({ color: '#7b8187', roughness: 0.5, metalness: 0.5 }),
      glass: new THREE.MeshStandardMaterial({ color: '#f4f3ee', roughness: 0.6, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }),
    };
  }, []);
}

/* ===================== arazi ===================== */
export function Ground({ tier }: { tier: 'low' | 'medium' | 'high' }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 260 : 170, g = new THREE.PlaneGeometry(320, 260, N, Math.round(N * 0.8)); g.rotateX(-Math.PI / 2); g.translate(0, 0, 10);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), a = new THREE.Color('#ad9467'), b = new THREE.Color('#8f9a58'), path = new THREE.Color('#c8b28c');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), pit = Math.abs(x - TOMB[0]) < 1.9 && Math.abs(z - TOMB[1]) < 1.3, y = terrain(x, z) - (pit ? 1.3 : 0); p.setY(i, y - 0.02); c.copy(b).lerp(a, Math.min(1, y / 6)); if (Math.abs(x - pathX(z)) < 2.2 && z > 8 && z < 90) c.lerp(path, 0.7); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const far = useMemo(() => { const g = new THREE.PlaneGeometry(6000, 6000); g.rotateX(-Math.PI / 2); g.translate(0, -0.1, 0); return g; }, []);
  const tex = useMemo(() => groundTex(), []);
  return <group userData={{ noCast: true }}>
    <mesh geometry={geo} receiveShadow><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>
    <mesh geometry={far} receiveShadow><meshStandardMaterial color="#93985c" roughness={1} /></mesh>
  </group>;
}
const pathX = (z: number) => Math.sin(z * 0.05) * 6;

/* ===================== Geç Hitit kapısı ===================== */
/** Aslan (şematik): yere oturan kaide, uzun gövde, öne doğru yele ve baş, açık ağız, kuyruk; başı +z yönüne bakar */
function lionGeo() { const p: Parts = [];
  slab(p, -0.6, 0.6, -1.4, 1.4, 0, 0.45, 1);   // kaide
  const body = new THREE.CapsuleGeometry(0.42, 1.5, 6, 12); body.rotateX(Math.PI / 2); body.translate(0, 1.05, -0.25); p.push(body);
  const chest = new THREE.SphereGeometry(0.55, 14, 10); chest.scale(1, 1.05, 0.9); chest.translate(0, 1.25, 0.55); p.push(chest);
  const mane = new THREE.SphereGeometry(0.62, 16, 12); mane.scale(1.05, 1.05, 0.75); mane.translate(0, 1.65, 0.75); p.push(mane);
  const head = new THREE.BoxGeometry(0.62, 0.55, 0.6); head.translate(0, 1.7, 1.1); p.push(head);
  const snout = new THREE.BoxGeometry(0.42, 0.28, 0.3); snout.translate(0, 1.58, 1.48); p.push(snout);
  const jaw = new THREE.BoxGeometry(0.38, 0.12, 0.28); jaw.translate(0, 1.33, 1.42); p.push(jaw);
  for (const s2 of [-1, 1]) { const ear = new THREE.ConeGeometry(0.1, 0.18, 6); ear.translate(s2 * 0.24, 2.05, 0.95); p.push(ear);
    for (const zz of [0.6, -0.9]) { const leg = new THREE.CylinderGeometry(0.13, 0.15, 0.65, 8); leg.translate(s2 * 0.26, 0.75, zz); p.push(leg); const paw = new THREE.BoxGeometry(0.26, 0.1, 0.32); paw.translate(s2 * 0.26, 0.5, zz + 0.08); p.push(paw); } }
  const tail = new THREE.CylinderGeometry(0.05, 0.06, 0.9, 6); tail.rotateX(0.9); tail.translate(0, 0.95, -1.35); p.push(tail);
  return merge(p); }
export function Gate({ m }: { m: Mats }) {
  const g = useMemo(() => { const p: Parts = [], y = terrain(GATE.x, GATE.z), w = GATE.w / 2; for (const s of [-1, 1]) slab(p, GATE.x + s * w + (s > 0 ? 0 : -3), GATE.x + s * w + (s > 0 ? 3 : 0), GATE.z - 1.4, GATE.z + 1.4, y - 0.5, y + 2.4, 2); return { stones: merge(p), y }; }, []);
  const lion = useMemo(() => lionGeo(), []);
  const king = useMemo(() => { const p: Parts = []; slab(p, -0.9, 0.9, -0.9, 0.9, 0, 0.9, 1); const robe = new THREE.CylinderGeometry(0.5, 0.75, 2.6, 16); robe.translate(0, 2.2, 0); p.push(robe);
    const headG = new THREE.SphereGeometry(0.34, 14, 10); headG.translate(0, 3.75, 0); p.push(headG); const cap = new THREE.ConeGeometry(0.3, 0.6, 14); cap.translate(0, 4.25, 0); p.push(cap);
    const beard = new THREE.BoxGeometry(0.3, 0.35, 0.2); beard.translate(0, 3.45, 0.25); p.push(beard); return merge(p); }, []);
  const kz = GATE.z - 4, ky = terrain(7, kz);
  return <group>
    <mesh geometry={g.stones} material={m.stone} castShadow receiveShadow />
    {[-1, 1].map((s) => <mesh key={s} geometry={lion} material={m.stone} position={[GATE.x + s * (GATE.w / 2 + 1.1), terrain(GATE.x + s * 3, GATE.z + 2.6) - 0.05, GATE.z + 2.6]} castShadow receiveShadow />)}
    <mesh geometry={king} material={m.basalt} position={[7, ky, kz]} rotation-y={-0.4} castShadow receiveShadow />
  </group>;
}

/* ===================== kerpiç saray ===================== */
/** Duvar parçaları: dış çeper, koridor duvarları (kapı boşluklarıyla), odalar arası bölmeler; üst kenar aşınmış (rastgele yükseklik) */
export function Palace({ m }: { m: Mats }) {
  const walls = useMemo(() => { const p: Parts = [], r = rng(8);
    const run = (x0: number, x1: number, z0: number, z1: number, gaps: number[] = []) => { const alongX = x1 - x0 > z1 - z0, a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1; let a = a0; const pts = [...gaps.map((g) => [g - DOOR_W / 2, g + DOOR_W / 2]).flat(), a1];
      const seg = (s0: number, s1: number) => { for (let s = s0; s < s1 - 0.01; s += 1.6) { const e = Math.min(s1, s + 1.6), h = H - r() * 0.7; if (alongX) slab(p, s, e, z0, z1, Y - 0.6, Y + h, 2); else slab(p, x0, x1, s, e, Y - 0.6, Y + h, 2); } };
      for (let i = 0; i < pts.length; i += 2) { const e = pts[i]; seg(a, e); a = pts[i + 1] ?? a1; } };
    run(PAL.x0 - T / 2, PAL.x1 + T / 2, PAL.z0 - T / 2, PAL.z0 + T / 2); run(PAL.x0 - T / 2, PAL.x1 + T / 2, PAL.z1 - T / 2, PAL.z1 + T / 2);
    run(PAL.x0 - T / 2, PAL.x0 + T / 2, PAL.z0, PAL.z1);   // batı
    run(PAL.x1 - T / 2, PAL.x1 + T / 2, PAL.z0, COR.z0); run(PAL.x1 - T / 2, PAL.x1 + T / 2, COR.z1, PAL.z1);   // doğu (koridor ağzı açık)
    run(PAL.x0, PAL.x1 - T / 2, COR.z0 - T / 2, COR.z0 + T / 2, ROOMS.filter((q) => q.side === 'n').map((q) => q.door));
    run(PAL.x0, PAL.x1 - T / 2, COR.z1 - T / 2, COR.z1 + T / 2, ROOMS.filter((q) => q.side === 's').map((q) => q.door));
    for (const x of [-12, 0, 12]) run(x - T / 2, x + T / 2, PAL.z0, COR.z0 - T / 2);
    run(-T / 2, T / 2, COR.z1 + T / 2, PAL.z1);
    return merge(p); }, []);
  const floor = useMemo(() => { const g = new THREE.PlaneGeometry(PAL.x1 - PAL.x0, PAL.z1 - PAL.z0); g.rotateX(-Math.PI / 2); g.translate((PAL.x0 + PAL.x1) / 2, Y + 0.01, (PAL.z0 + PAL.z1) / 2); return g; }, []);
  // tören salonu: kerpiç sekiler ve ocak (temsilî); dağıtım salonu: sekiler ve kâse istifleri
  const furn = useMemo(() => { const p: Parts = [], c: Parts = [];
    slab(p, 8, 16, 5.6, 7.4, Y, Y + 0.6, 1); slab(p, 11, 13, 4, 5, Y, Y + 0.25, 1);
    slab(p, -23, -14, 6.6, 7.5, Y, Y + 0.5, 1); slab(p, -10, -1, 6.6, 7.5, Y, Y + 0.5, 1);
    const bowl = bowlGeo(); for (let i = 0; i < 14; i++) { const x = -22 + (i % 7) * 1.25 + (i >= 7 ? 12 : 0); for (let k = 0; k < 4; k++) { const b = bowl.clone(); b.translate(x, Y + 0.5 + k * 0.05, 7.05); c.push(b); } }
    return { p: merge(p), c: merge(c) }; }, []);
  return <group>
    <mesh geometry={walls} material={m.mud} castShadow receiveShadow />
    <mesh geometry={floor} material={m.plaster} receiveShadow />
    <mesh geometry={furn.p} material={m.mud} castShadow receiveShadow />
    <mesh geometry={furn.c} material={m.clay} castShadow />
  </group>;
}
function bowlGeo() { const pts = [[0, 0], [0.05, 0], [0.09, 0.02], [0.12, 0.07], [0.115, 0.075]].map(([a, b]) => new THREE.Vector2(a, b)); return new THREE.LatheGeometry(pts, 14); }

/** Mühürlü kapılar: ahşap kanat, yanında mandal ve ipe bağlı kil mühür; açılınca kanat döner, mühür kırılır */
export const doorAnim: Record<string, number> = {};
export function Doors({ m, open }: { m: Mats; open: string[] }) {
  const rooms = ROOMS.filter((r) => r.side === 'n'), refs = useRef<Record<string, THREE.Group | null>>({});
  useFrame((_, dt) => { for (const r of rooms) { const g = refs.current[r.id]; if (!g) continue; const want = open.includes(r.id) ? 1.6 : 0, cur = doorAnim[r.id] ?? 0, nv = cur + (want - cur) * Math.min(1, dt * 3); doorAnim[r.id] = nv; g.rotation.y = nv; } });
  return <group>{rooms.map((r) => <group key={r.id}>
    <group ref={(g) => { refs.current[r.id] = g; }} position={[r.door - DOOR_W / 2 + 0.05, Y, COR.z0]}>
      <mesh material={m.wood} position={[(DOOR_W - 0.1) / 2, 1.05, 0]} castShadow><boxGeometry args={[DOOR_W - 0.1, 2.1, 0.09]} /></mesh>
    </group>
    <Peg m={m} r={r} broken={open.includes(r.id)} />
  </group>)}</group>;
}
function Peg({ m, r, broken }: { m: Mats; r: Room; broken: boolean }) {
  const x = r.door + DOOR_W / 2 + 0.18, z = COR.z0 + T / 2 + 0.02;
  return <group position={[x, Y + 1.2, z]}>
    <mesh material={m.wood} rotation-x={Math.PI / 2} position={[0, 0, 0.08]}><cylinderGeometry args={[0.035, 0.035, 0.18, 8]} /></mesh>
    {!broken ? <mesh material={m.clay} position={[-0.05, -0.04, 0.17]} scale={[1.2, 1, 0.7]} castShadow><sphereGeometry args={[0.11, 12, 8]} /></mesh>
      : <>{[0, 1, 2].map((i) => <mesh key={i} material={m.clay} position={[-0.2 + i * 0.12, -1.15, 0.25 + (i % 2) * 0.1]}><dodecahedronGeometry args={[0.045, 0]} /></mesh>)}</>}
  </group>;
}
/** Depoların içi */
export function StoreContents({ m }: { m: Mats }) {
  const g = useMemo(() => { const clay: Parts = [], lumps: Parts = [], cop: Parts = [], sil: Parts = [], wood: Parts = [], r = rng(31);
    const [d1, d2, d3, d4] = ROOMS;
    // d1: küpler
    const jarPts = [[0, 0], [0.18, 0], [0.32, 0.25], [0.38, 0.6], [0.3, 0.95], [0.16, 1.05], [0.18, 1.12]].map(([a, b]) => new THREE.Vector2(a, b)), jar = new THREE.LatheGeometry(jarPts, 16);
    for (let i = 0; i < 12; i++) { const j = jar.clone(); j.scale(1, 0.9 + r() * 0.25, 1); j.translate(d1.x0 + 1.6 + (i % 6) * 1.6, Y, d1.z0 + 1.4 + Math.floor(i / 6) * 1.5); clay.push(j); }
    // d2: kırık mühür yığınları
    for (let k = 0; k < 3; k++) { const cx = d2.x0 + 2.5 + k * 3.5, cz = d2.z0 + 3; for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = r() * 0.9, l = new THREE.DodecahedronGeometry(0.05 + r() * 0.04, 0); l.translate(cx + Math.cos(a) * d, Y + 0.05 + (0.9 - d) * 0.3 * r(), cz + Math.sin(a) * d); lumps.push(l); } }
    // d3: kâse istifleri
    const bowl = bowlGeo(); for (let i = 0; i < 24; i++) { const x = d3.x0 + 1.4 + (i % 8) * 1.2, z = d3.z0 + 1.2 + Math.floor(i / 8) * 1.1; for (let k = 0; k < 8; k++) { const b = bowl.clone(); b.translate(x, Y + k * 0.045, z); clay.push(b); } }
    // d4: kılıçlar ve mızrak uçları alçak bir sekide
    slab(wood, d4.x0 + 2, d4.x1 - 2, d4.z0 + 1.8, d4.z0 + 3, Y, Y + 0.45, 1);
    for (let i = 0; i < 9; i++) { const x = d4.x0 + 2.5 + i * 0.75, blade = new THREE.BoxGeometry(0.06, 0.012, 0.62); blade.translate(x, Y + 0.47, d4.z0 + 2.3); cop.push(blade);
      const hilt = new THREE.BoxGeometry(0.09, 0.03, 0.16); hilt.translate(x, Y + 0.48, d4.z0 + 2.69); cop.push(hilt); if (i % 3 === 0) { const inl = new THREE.BoxGeometry(0.03, 0.01, 0.12); inl.translate(x, Y + 0.5, d4.z0 + 2.69); sil.push(inl); } }
    return { clay: merge(clay), lumps: merge(lumps), cop: merge(cop), sil: merge(sil), wood: merge(wood) }; }, []);
  return <group>
    <mesh geometry={g.clay} material={m.clay} castShadow receiveShadow />
    <mesh geometry={g.lumps} material={m.clay} castShadow />
    <mesh geometry={g.wood} material={m.mud} receiveShadow castShadow />
    <mesh geometry={g.cop} material={m.copper} castShadow />
    <mesh geometry={g.sil} material={m.silver} />
  </group>;
}
/** Görevli masası: üstünde altı mühür (taş/kil damgalar) */
export function Desk({ m }: { m: Mats }) {
  return <group position={[DESK[0], Y, DESK[1] - 0.3]}>
    <mesh material={m.mud} position={[0, 0.4, 0]} castShadow receiveShadow><boxGeometry args={[1.6, 0.8, 0.6]} /></mesh>
    {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} material={i % 2 ? m.stone : m.basalt} position={[-0.6 + i * 0.24, 0.86, 0]} castShadow><cylinderGeometry args={[0.07, 0.08, 0.12, 12]} /></mesh>)}
  </group>;
}
/** Koruma çatısı: çelik direkler ve yarı saydam örtü */
export function Roof({ m }: { m: Mats }) {
  const g = useMemo(() => { const p: Parts = []; for (let x = ROOF.x0; x <= ROOF.x1; x += 16) for (const z of [ROOF.z0, ROOF.z1]) { const c = new THREE.CylinderGeometry(0.12, 0.12, ROOF.y, 8); c.translate(x, Y + ROOF.y / 2, z); p.push(c); }
    for (let x = ROOF.x0; x <= ROOF.x1; x += 8) slab(p, x - 0.08, x + 0.08, ROOF.z0, ROOF.z1, Y + ROOF.y - 0.3, Y + ROOF.y, 1);
    return merge(p); }, []);
  return <group>
    <mesh geometry={g} material={m.steel} castShadow />
    <mesh material={m.glass} position={[(ROOF.x0 + ROOF.x1) / 2, Y + ROOF.y + 0.02, (ROOF.z0 + ROOF.z1) / 2]} rotation-x={-Math.PI / 2} userData={{ noCast: true }}><planeGeometry args={[ROOF.x1 - ROOF.x0 + 2, ROOF.z1 - ROOF.z0 + 2]} /></mesh>
  </group>;
}
/** "Kral mezarı": taş levhalarla çevrili sandık mezar; kapak levhaları yanda */
export function Tomb({ m }: { m: Mats }) {
  const g = useMemo(() => { const p: Parts = [], [x, z] = TOMB, y = terrain(x, z);
    slab(p, x - 1.6, x + 1.6, z - 1.0, z - 0.85, y - 1.2, y + 0.05, 1); slab(p, x - 1.6, x + 1.6, z + 0.85, z + 1.0, y - 1.2, y + 0.05, 1);
    slab(p, x - 1.6, x - 1.45, z - 0.85, z + 0.85, y - 1.2, y + 0.05, 1); slab(p, x + 1.45, x + 1.6, z - 0.85, z + 0.85, y - 1.2, y + 0.05, 1);
    for (let i = 0; i < 3; i++) slab(p, x + 2.2 + i * 0.2, x + 3.4 + i * 0.2, z - 1 + i * 0.75, z - 0.35 + i * 0.75, y, y + 0.14, 1);
    const pit = new THREE.PlaneGeometry(2.9, 1.7); pit.rotateX(-Math.PI / 2); pit.translate(x, y - 1.15, z);
    return { p: merge(p), pit }; }, []);
  return <group>
    <mesh geometry={g.p} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.pit} receiveShadow><meshStandardMaterial color="#6f5a42" roughness={1} /></mesh>
  </group>;
}

/* ===================== çevre ===================== */
export function Orchards({ n }: { n: number }) {
  const geo = useMemo(() => { const r = rng(4), parts: THREE.BufferGeometry[] = [], paint = (g: THREE.BufferGeometry, hex: string, j: number) => { const gg = g.index ? g.toNonIndexed() : g, col: number[] = [], cc = new THREE.Color(); for (let i = 0; i < gg.attributes.position.count; i++) { cc.set(hex).offsetHSL(0, 0, (r() - 0.5) * j); col.push(cc.r, cc.g, cc.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return gg; };
    parts.push(paint(new THREE.CylinderGeometry(0.14, 0.22, 1.5, 6).translate(0, 0.75, 0), '#5e4a38', 0.05)); for (let i = 0; i < 4; i++) { const a = r() * 6.28; parts.push(paint(new THREE.IcosahedronGeometry(0.9 + r() * 0.3, 1).translate(Math.cos(a) * 0.5, 2 + r() * 0.3, Math.sin(a) * 0.5), '#5f8a3a', 0.12)); }
    const g = mergeGeometries(parts)!; g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []), ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(12), o = new THREE.Object3D(); let k = 0;
    for (let x = -360; x < 360 && k < n; x += 6.5) for (let z = -300; z < 420 && k < n; z += 6.5) { if ((x / 140) ** 2 + (z / 105) ** 2 < 1 || r() < 0.2 || (Math.abs(x) < 14 && z > 80 && z < 130)) continue;
      o.position.set(x + (r() - 0.5), terrain(x, z), z + (r() - 0.5)); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.8 + r() * 0.4); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -130 + r() * 260, z = -100 + r() * 210; if (x > ROOF.x0 - 2 && x < ROOF.x1 + 2 && z > ROOF.z0 - 2 && z < ROOF.z1 + 2) continue; if (Math.abs(x - pathX(z)) < 2.4 && z > 8) continue;
      o.position.set(x, terrain(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.35 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.12 + r() * 0.07, 0.4, 0.45 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 9; i++) { const a = Math.PI * (i / 4.5) + r() * 0.3, dd = 1400 + r() * 600; out.push({ p: [Math.cos(a) * dd, -10, Math.sin(a) * dd], g: mountainGeo(600 + r() * 300, 200 + r() * 220, 60 + i, 2, '#8e8060') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
