/**
 * Zeugma Mozaik Müzesi — 3B modeller. Taş cephe ve iç duvarlar, mozaik zeminli büyük salon, cam vitrinler, karanlık salonda ışıklı sergi kaidesi,
 * meydan ve ağaçlar. Bina biçimi, salon düzeni ve mozaik desenleri TEMSİLÎDİR (docs/ZEUGMA.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { BUILD, CASES, DARK_DOOR, HOL_DOOR, ROOMS, SPOTLIGHT, SQUARE, WALL_T } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.6, 0.62).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const slab = (p: Parts, x0: number, x1: number, z0: number, z1: number, h: number, y0 = 0, s = 2.4) => { const g = bx(x1 - x0, h, z1 - z0, s); g.translate((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2); p.push(g); };
const H = 5.2;

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; plinth: THREE.MeshStandardMaterial; glass: THREE.MeshStandardMaterial; mosaic: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; paving: THREE.MeshStandardMaterial; portrait: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('zeugma-kireç', ['#e2d6bd', '#d6c8a8', '#eadfc8', '#cbbb98'], [14, 10], [30, 40]);
    // mozaik: küçük renkli taşlar (tesserae) ve ortada bir rozet (temsilî)
    const mos = canvasTex(512, 512, (g, r) => { const pal = ['#b5553a', '#d9a441', '#2f5f7d', '#eae1cc', '#3d6b4a', '#7d3f2c', '#c9824f', '#1f3a4d'];
      g.fillStyle = '#e8dcc2'; g.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 512; y += 8) for (let x = 0; x < 512; x += 8) { g.fillStyle = pal[(r() * pal.length) | 0]; g.fillRect(x + 1, y + 1, 6, 6); }
      g.fillStyle = '#2f5f7d'; g.beginPath(); g.arc(256, 256, 120, 0, 7); g.fill(); g.strokeStyle = '#d9a441'; g.lineWidth = 10; g.stroke();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle = i % 2 ? '#b5553a' : '#eae1cc'; g.beginPath(); g.arc(256 + Math.cos(a) * 80, 256 + Math.sin(a) * 80, 16, 0, 7); g.fill(); } }, true, 9);
    mos.repeat.set(2, 2);
    const rf = canvasTex(256, 256, (g, r) => { g.fillStyle = '#8c8577'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '40,36,30' : '220,214,200'},${r() * 0.12})`; g.fillRect(r() * 256, r() * 256, 2, 2); } });
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.35, roughness: 0.92 })),
      plinth: new THREE.MeshStandardMaterial({ color: '#d9ccb0', roughness: 0.9 }),
      glass: new THREE.MeshStandardMaterial({ color: '#cfe6ef', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0 }),
      mosaic: new THREE.MeshStandardMaterial({ map: mos, roughness: 0.55 }),
      dark: new THREE.MeshStandardMaterial({ color: '#1d1a18', roughness: 1 }),
      roof: new THREE.MeshStandardMaterial({ map: rf, roughness: 0.9 }),
      paving: new THREE.MeshStandardMaterial({ color: '#c9bca2', roughness: 0.95 }),
      portrait: new THREE.MeshStandardMaterial({ map: mos, roughness: 0.55 }),
    };
  }, []);
}

/* ===================== müze binası ===================== */
export function Museum({ m, tier }: { m: Mats; tier: Tier }) {
  const walls = useMemo(() => { const p: Parts = [], B = BUILD, t = WALL_T, y = 0;
    // dış duvarlar; güney duvarında giriş açıklığı
    slab(p, B.x0, B.x1, B.z0, B.z0 + t, H, y); slab(p, B.x0, B.x0 + t, B.z0, B.z1, H, y); slab(p, B.x1 - t, B.x1, B.z0, B.z1, H, y);
    slab(p, B.x0, HOL_DOOR.x0, B.z1 - t, B.z1, H, y); slab(p, HOL_DOOR.x1, B.x1, B.z1 - t, B.z1, H, y);
    slab(p, HOL_DOOR.x0, HOL_DOOR.x1, B.z1 - t, B.z1, H - 3.2, y + 3.2);   // kapının üstü
    // hol-salon arası duvar (kapı açıklığı ortada)
    slab(p, B.x0, HOL_DOOR.x0, ROOMS.hol.z0 - t, ROOMS.hol.z0, H, y); slab(p, HOL_DOOR.x1, B.x1, ROOMS.hol.z0 - t, ROOMS.hol.z0, H, y);
    // salon-karanlık arası duvar ve karanlık salonun batısındaki kütle
    slab(p, B.x0, DARK_DOOR.x0 - 0.2, ROOMS.salon.z0 - 0.3, ROOMS.salon.z0, H, y); slab(p, DARK_DOOR.x1 + 0.2, B.x1, ROOMS.salon.z0 - 0.3, ROOMS.salon.z0, H, y);
    slab(p, B.x0, ROOMS.karanlik.x0 - 0.2, B.z0, ROOMS.salon.z0 - 0.3, H, y);
    return merge(p); }, []);
  const roof = useMemo(() => { const g = bx(BUILD.x1 - BUILD.x0 + 3, 0.6, BUILD.z1 - BUILD.z0 + 3, 2); g.translate(0, H + 0.3, 0); return g; }, []);
  const mosaicFloor = useMemo(() => { const g = new THREE.PlaneGeometry(ROOMS.salon.x1 - ROOMS.salon.x0, ROOMS.salon.z1 - ROOMS.salon.z0); g.rotateX(-Math.PI / 2); g.translate(0, 0.02, (ROOMS.salon.z0 + ROOMS.salon.z1) / 2); return g; }, []);
  const holFloor = useMemo(() => { const g = new THREE.PlaneGeometry(ROOMS.hol.x1 - ROOMS.hol.x0, ROOMS.hol.z1 - ROOMS.hol.z0); g.rotateX(-Math.PI / 2); g.translate(0, 0.02, (ROOMS.hol.z0 + ROOMS.hol.z1) / 2); return g; }, []);
  const darkFloor = useMemo(() => { const g = new THREE.PlaneGeometry(ROOMS.karanlik.x1 - ROOMS.karanlik.x0, ROOMS.karanlik.z1 - ROOMS.karanlik.z0); g.rotateX(-Math.PI / 2); g.translate((ROOMS.karanlik.x0 + ROOMS.karanlik.x1) / 2, 0.02, (ROOMS.karanlik.z0 + ROOMS.karanlik.z1) / 2); return g; }, []);
  const cases = useMemo(() => { const p: Parts = [], q: Parts = [];
    for (const c of CASES) { const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, w = c.x1 - c.x0, d = c.z1 - c.z0;
      const base = bx(w, 1.0, d, 1.5); base.translate(cx, 0.5, cz); p.push(base);
      const top = new THREE.BoxGeometry(w - 0.2, 0.5, d - 0.2); top.translate(cx, 1.25, cz); q.push(top); }
    return { stone: merge(p), glass: merge(q) }; }, []);
  const spot = SPOTLIGHT;
  return <group>
    <mesh geometry={walls} material={m.stone} castShadow receiveShadow />
    <mesh geometry={roof} material={m.roof} castShadow receiveShadow />
    <mesh geometry={mosaicFloor} material={m.mosaic} receiveShadow />
    <mesh geometry={holFloor} material={m.stone} receiveShadow />
    <mesh geometry={darkFloor} material={m.dark} receiveShadow />
    <mesh geometry={cases.stone} material={m.plinth} castShadow receiveShadow />
    <mesh geometry={cases.glass} material={m.glass} />
    {/* karanlık salonun sergi kaidesi ve mozaik paneli */}
    <mesh position={[spot.x, 0.6, spot.z]} castShadow receiveShadow><cylinderGeometry args={[0.9, 1, 1.2, 14]} /><primitive object={m.plinth} attach="material" /></mesh>
    <mesh position={[spot.x, 2.6, spot.z - 0.9]} rotation-x={-0.2}><planeGeometry args={[1.8, 2.2]} /><primitive object={m.portrait} attach="material" /></mesh>
    <pointLight position={[spot.x, 4.4, spot.z]} color="#ffe6bf" intensity={tier === 'low' ? 25 : 45} distance={9} decay={2} />
    <pointLight position={[0, H - 0.6, 0]} color="#fff1d6" intensity={tier === 'low' ? 30 : 60} distance={18} decay={2} />
  </group>;
}

/* ===================== meydan ve çevre ===================== */
export function Plaza({ m }: { m: Mats }) {
  return <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, (SQUARE.z0 + SQUARE.z1) / 2]} receiveShadow>
    <planeGeometry args={[SQUARE.x1 - SQUARE.x0, SQUARE.z1 - SQUARE.z0]} /><primitive object={m.paving} attach="material" />
  </mesh>;
}
export function Ground({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 160 : 100, g = new THREE.PlaneGeometry(700, 700, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#7a9a4c'), dry = new THREE.Color('#a7a06a');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, 0); c.copy(grass).lerp(dry, 0.3 + 0.3 * Math.sin(x * 0.03 + z * 0.02)); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
export function Trees({ n }: { n: number }) {
  const geo = useMemo(() => { const r = rng(3), parts: THREE.BufferGeometry[] = [];
    const trunk = new THREE.CylinderGeometry(0.25, 0.35, 3, 6); trunk.translate(0, 1.5, 0); parts.push(trunk);
    for (let i = 0; i < 6; i++) { const a = r() * 6.28, d = i ? 1.4 + r() : 0; const cr = new THREE.IcosahedronGeometry(1.9 + r() * 0.4, 1); cr.translate(Math.cos(a) * d, 4.2 + r() * 1.2, Math.sin(a) * d); parts.push(cr); }
    const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4f7a3a', roughness: 0.95 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(23), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 8 && k < n; i++) { const a = r() * 6.28, d = 30 + r() * 110, x = Math.cos(a) * d, z = Math.sin(a) * d - 10;
      if (Math.abs(x) < 26 && z > -20 && z < 22) continue; if (Math.abs(x) < SQUARE.x1 + 3 && z > SQUARE.z0 - 3 && z < SQUARE.z1 + 3) continue;
      o.position.set(x, -0.05, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.8 + r() * 0.5); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -110 + r() * 220, z = -90 + r() * 170;
      if (Math.abs(x) < 26 && z > -20 && z < 22) continue; if (Math.abs(x) < SQUARE.x1 && z > SQUARE.z0 && z < SQUARE.z1) continue;
      o.position.set(x, -0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.24 + r() * 0.05, 0.45, 0.4 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + r() * 0.2, dd = 800 + r() * 400; out.push({ p: [Math.cos(a) * dd, -10, Math.sin(a) * dd], g: mountainGeo(420 + r() * 220, 160 + r() * 140, 70 + i, 2, '#8a8160') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
