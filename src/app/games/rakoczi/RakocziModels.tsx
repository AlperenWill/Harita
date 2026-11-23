/**
 * Rákóczi Müzesi — 3B modeller. İki katlı ahşap konak (beyaz sıvalı zemin kat, çıkmalı ahşap üst kat, kırma çatı), içeride ahşap döşeme, bölme duvar,
 * bronz büstlü kaide, vitrinler, merdiven bloğu, Mikes'in masası; avluda çit, çeşme ve ağaçlar; çevrede Tekirdağ evleri ve Marmara. Ölçüler, oda düzeni
 * ve eşyalar TEMSİLÎDİR (docs/RAKOCZI.md).
 */
import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, useGrassCards } from '../shared/scenery';
import { CASES, DESK, ENTRY, FLOOR_H, FOUNTAIN, HOUSE, PARTITION_DOOR, PARTITION_X, PEDESTAL, STAIRS, TREES, WALL_T } from './site';

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
const H1 = 3.6, F = FLOOR_H;

/* ===================== malzemeler ===================== */
export interface Mats { plaster: THREE.MeshStandardMaterial; timber: THREE.MeshStandardMaterial; floor: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; bronze: THREE.MeshStandardMaterial; glass: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; stone: THREE.MeshStandardMaterial; water: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const tm = canvasTex(128, 512, (g, r) => { g.fillStyle = '#6e4a2c'; g.fillRect(0, 0, 128, 512); for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '40,26,14' : '150,108,70'},${0.2 + r() * 0.3})`; g.lineWidth = 1 + r() * 2; const x = r() * 128; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, 170, x - 6, 340, x + 3, 512); g.stroke(); } });
    const fl = canvasTex(256, 256, (g, r) => { for (let x = 0; x < 256; x += 32) { const v = 0.8 + r() * 0.3; g.fillStyle = `rgb(${(150 * v) | 0},${(108 * v) | 0},${(70 * v) | 0})`; g.fillRect(x, 0, 30, 256); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 30, 0, 2, 256); } });
    fl.repeat.set(6, 3);
    const rf = canvasTex(256, 256, (g, r) => { g.fillStyle = '#a4553a'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 12) for (let x = 0; x < 256; x += 16) { const v = 0.78 + r() * 0.35; g.fillStyle = `rgb(${(170 * v) | 0},${(88 * v) | 0},${(62 * v) | 0})`; g.fillRect(x + ((y / 12) % 2) * 8, y, 14, 10); } });
    return {
      plaster: new THREE.MeshStandardMaterial({ color: '#efe7d6', roughness: 0.95 }),
      timber: new THREE.MeshStandardMaterial({ map: tm, roughness: 0.85 }),
      floor: new THREE.MeshStandardMaterial({ map: fl, roughness: 0.7 }),
      roof: new THREE.MeshStandardMaterial({ map: rf, roughness: 0.85 }),
      bronze: new THREE.MeshStandardMaterial({ color: '#7a5a36', roughness: 0.35, metalness: 0.75 }),
      glass: new THREE.MeshStandardMaterial({ color: '#cfe6ef', transparent: true, opacity: 0.22, roughness: 0.05 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 1 }),
      wood: new THREE.MeshStandardMaterial({ color: '#8a6038', roughness: 0.8 }),
      stone: new THREE.MeshStandardMaterial({ color: '#b7ad98', roughness: 0.95 }),
      water: new THREE.MeshStandardMaterial({ color: '#4a7f8c', roughness: 0.12, metalness: 0.15 }),
    };
  }, []);
}

/* ===================== konak ===================== */
export function House({ m, tier }: { m: Mats; tier: Tier }) {
  const walls = useMemo(() => { const p: Parts = [], B = HOUSE, t = WALL_T, y = F - 0.1;
    slab(p, B.x0 - t, B.x1 + t, B.z0 - t, B.z0, H1, y); slab(p, B.x0 - t, B.x0, B.z0, B.z1 + t, H1, y); slab(p, B.x1, B.x1 + t, B.z0, B.z1 + t, H1, y);
    slab(p, B.x0 - t, ENTRY.x0, B.z1, B.z1 + t, H1, y); slab(p, ENTRY.x1, B.x1 + t, B.z1, B.z1 + t, H1, y); slab(p, ENTRY.x0, ENTRY.x1, B.z1, B.z1 + t, H1 - 2.5, y + 2.5);
    // bölme duvarı (Mikes'in odası)
    slab(p, PARTITION_X - 0.2, PARTITION_X + 0.2, B.z0, PARTITION_DOOR.z0, H1, y); slab(p, PARTITION_X - 0.2, PARTITION_X + 0.2, PARTITION_DOOR.z1, B.z1, H1, y);
    slab(p, PARTITION_X - 0.2, PARTITION_X + 0.2, PARTITION_DOOR.z0, PARTITION_DOOR.z1, H1 - 2.4, y + 2.4);
    return merge(p); }, []);
  const upper = useMemo(() => { const p: Parts = [], B = HOUSE, t = WALL_T, y = F + H1;
    // çıkmalı üst kat: zemin kattan 0,7 m taşar; ahşap çerçeveli
    slab(p, B.x0 - t - 0.7, B.x1 + t + 0.7, B.z0 - t - 0.7, B.z1 + t + 0.7, 3.2, y, 2.2);
    return merge(p); }, []);
  const frame = useMemo(() => { const p: Parts = [], B = HOUSE, t = WALL_T, y = F + H1 + 1.6, x0 = B.x0 - t - 0.7, x1 = B.x1 + t + 0.7, z1 = B.z1 + t + 0.7;
    for (let x = x0; x <= x1 + 0.01; x += 4.4) { const g = bx(0.25, 3.2, 0.12, 1); g.translate(x, y, z1 + 0.06); p.push(g); }
    for (const yy of [F + H1 + 0.1, F + H1 + 3.1]) { const g = bx(x1 - x0, 0.25, 0.14, 2); g.translate((x0 + x1) / 2, yy, z1 + 0.07); p.push(g); }
    // üst kat pencereleri: koyu pervazlı kutular
    for (let x = x0 + 2.2; x < x1; x += 4.4) { const g = bx(1.4, 1.5, 0.14, 1); g.translate(x, y + 0.2, z1 + 0.05); p.push(g); }
    return merge(p); }, []);
  const roof = useMemo(() => { const B = HOUSE, t = WALL_T, w = B.x1 - B.x0 + 2 * t + 3.6, d = B.z1 - B.z0 + 2 * t + 3.6, g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); g.scale(w, 3.4, d); return g; }, []);
  const interior = useMemo(() => { const p: Parts = [], q: Parts = [];
    // vitrinler
    for (const c of CASES) { const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, w = c.x1 - c.x0, d = c.z1 - c.z0; p.push(bx(w, 0.9, d, 1.5).translate(cx, F + 0.45, cz)); q.push(new THREE.BoxGeometry(w - 0.1, 1.2, d - 0.1).translate(cx, F + 1.5, cz)); }
    // merdiven bloğu: basamaklı
    const S = STAIRS; for (let i = 0; i < 8; i++) p.push(bx(S.x1 - S.x0, 0.35 + i * 0.3, 0.5, 1).translate((S.x0 + S.x1) / 2, F + (0.35 + i * 0.3) / 2, S.z1 - 0.3 - i * 0.55));
    p.push(bx(S.x1 - S.x0, 3.2, 0.5, 1).translate((S.x0 + S.x1) / 2, F + 1.6, S.z0 + 0.25));
    // Mikes'in masası ve sandalye
    p.push(bx(DESK.x1 - DESK.x0, 0.8, DESK.z1 - DESK.z0, 1).translate((DESK.x0 + DESK.x1) / 2, F + 0.4, (DESK.z0 + DESK.z1) / 2));
    p.push(bx(0.6, 0.9, 0.6, 1).translate((DESK.x0 + DESK.x1) / 2, F + 0.45, DESK.z1 + 0.8));
    // kitaplık (batı duvarı)
    p.push(bx(0.6, 2.6, 4, 1).translate(HOUSE.x0 + 0.5, F + 1.3, 2.5));
    return { wood: merge(p), glass: merge(q) }; }, []);
  const windows = useMemo(() => { const p: Parts = [];
    for (const [x, z, ry] of [[-6, HOUSE.z0 + 0.02, 0], [0, HOUSE.z0 + 0.02, 0], [6, HOUSE.z0 + 0.02, 0], [HOUSE.x1 - 0.02, -3, -Math.PI / 2], [HOUSE.x1 - 0.02, 2, -Math.PI / 2], [HOUSE.x0 + 0.02, -3, Math.PI / 2]] as const) { const g = new THREE.PlaneGeometry(1.4, 1.8); g.rotateY(ry); g.translate(x, F + 2, z); p.push(g); }
    return merge(p); }, []);
  return <group>
    <mesh geometry={walls} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={upper} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={frame} material={m.timber} castShadow />
    <mesh geometry={roof} material={m.roof} position={[0, F + H1 + 3.2, 0]} castShadow receiveShadow />
    <mesh rotation-x={-Math.PI / 2} position={[0, F + 0.02, 0]} receiveShadow><planeGeometry args={[HOUSE.x1 - HOUSE.x0, HOUSE.z1 - HOUSE.z0]} /><primitive object={m.floor} attach="material" /></mesh>
    <mesh geometry={interior.wood} material={m.wood} castShadow receiveShadow />
    <mesh geometry={interior.glass} material={m.glass} />
    <mesh geometry={windows}><meshStandardMaterial color="#f4f6f6" emissive="#e8eef0" emissiveIntensity={0.7} side={THREE.DoubleSide} /></mesh>
    {/* Rákóczi'nin bronz büstü ve kaidesi */}
    <mesh position={[PEDESTAL.c[0], F + 0.6, PEDESTAL.c[1]]} castShadow receiveShadow><cylinderGeometry args={[PEDESTAL.r * 0.8, PEDESTAL.r, 1.2, 14]} /><primitive object={m.stone} attach="material" /></mesh>
    <mesh position={[PEDESTAL.c[0], F + 1.65, PEDESTAL.c[1]]} castShadow><sphereGeometry args={[0.42, 16, 12]} /><primitive object={m.bronze} attach="material" /></mesh>
    <mesh position={[PEDESTAL.c[0], F + 1.28, PEDESTAL.c[1]]} castShadow><cylinderGeometry args={[0.3, 0.55, 0.5, 12]} /><primitive object={m.bronze} attach="material" /></mesh>
    <pointLight position={[0, F + 3.2, 0]} color="#ffe6bf" intensity={tier === 'low' ? 40 : 55} distance={18} decay={2} />
    <pointLight position={[-7, F + 3, 0]} color="#ffe0b0" intensity={30} distance={10} decay={2} />
  </group>;
}

/* ===================== avlu, çevre ===================== */
export function Yard({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = [];
    // çit: avlunun üç kenarında alçak taş duvar, güneyde kapı boşluğu
    const x0 = -30, x1 = 30, z1 = 42;
    p.push(bx(x1 - x0, 1.3, 0.5, 3).translate(0, 0.65, z1)); p.push(bx(0.5, 1.3, z1 - 8.8, 3).translate(x0, 0.65, (8.8 + z1) / 2)); p.push(bx(0.5, 1.3, z1 - 8.8, 3).translate(x1, 0.65, (8.8 + z1) / 2));
    return merge(p); }, []);
  const ground = useMemo(() => { const g = new THREE.PlaneGeometry(60, 33); g.rotateX(-Math.PI / 2); g.translate(0, 0.02, 25); return g; }, []);
  return <group>
    <mesh geometry={geo} material={m.stone} castShadow receiveShadow />
    <mesh geometry={ground} receiveShadow><meshStandardMaterial color="#b9b196" roughness={0.95} /></mesh>
    {/* giriş yolu */}
    <mesh rotation-x={-Math.PI / 2} position={[(ENTRY.x0 + ENTRY.x1) / 2, 0.04, 26]} receiveShadow><planeGeometry args={[3, 34]} /><meshStandardMaterial color="#cfc6ae" roughness={0.95} /></mesh>
    {/* çeşme */}
    <mesh position={[FOUNTAIN.c[0], 0.1, FOUNTAIN.c[1]]} rotation-x={-Math.PI / 2}><circleGeometry args={[FOUNTAIN.r, 20]} /><primitive object={m.water} attach="material" /></mesh>
    <mesh position={[FOUNTAIN.c[0], 0.5, FOUNTAIN.c[1]]} rotation-x={-Math.PI / 2} castShadow receiveShadow><ringGeometry args={[FOUNTAIN.r, FOUNTAIN.r + 0.5, 20]} /><primitive object={m.stone} attach="material" /></mesh>
    <mesh position={[FOUNTAIN.c[0], 1.4, FOUNTAIN.c[1]]} castShadow><cylinderGeometry args={[0.25, 0.4, 2.2, 10]} /><primitive object={m.stone} attach="material" /></mesh>
  </group>;
}
export function Garden({ n }: { n: number }) {
  const geo = useMemo(() => { const parts: Parts = []; const t = new THREE.CylinderGeometry(0.3, 0.45, 3.4, 7); t.translate(0, 1.7, 0); parts.push(t);
    for (let k = 0; k < 5; k++) { const c = new THREE.IcosahedronGeometry(1.9, 1); c.translate(Math.cos(k * 1.3) * 1.4, 4.4 + (k % 2) * 0.8, Math.sin(k * 1.3) * 1.4); parts.push(c); }
    const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4f7a3a', roughness: 0.95 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const o = new THREE.Object3D(); let k = 0; const r = rng(21);
    for (const t of TREES) { o.position.set(t[0], 0, t[1]); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(1.1); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    for (let i = 0; i < n && k < n + TREES.length; i++) { const x = -90 + r() * 180, z = -50 + r() * 140; if (x > -36 && x < 36 && z > -32 && z < 48) continue; o.position.set(x, 0, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.9 + r() * 0.6); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n + TREES.length + 4]} castShadow receiveShadow />;
}
export function Town({ m }: { m: Mats }) {
  const geo = useMemo(() => { const r = rng(33), walls: Parts = [], roofs: Parts = [];
    for (let i = 0; i < 70; i++) { const side = r(), x = side < 0.35 ? -44 - r() * 70 : side < 0.7 ? 44 + r() * 70 : -40 + r() * 80, z = side < 0.7 ? -34 + r() * 90 : -50 - r() * 40, w = 7 + r() * 5, d = 7 + r() * 5, h = 5 + r() * 5;
      const b = bx(w, h, d, 2.4); b.translate(x, h / 2, z); walls.push(b);
      const roof = new THREE.ConeGeometry(Math.max(w, d) * 0.72, 2.4, 4); roof.rotateY(Math.PI / 4); roof.translate(x, h + 1.2, z); roofs.push(roof); }
    return { walls: merge(walls), roofs: merge(roofs) }; }, []);
  return <group>
    <mesh geometry={geo.walls} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={geo.roofs} material={m.roof} castShadow />
  </group>;
}
export function Ground({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(420, 320, tier === 'high' ? 30 : 16, tier === 'high' ? 30 : 16); g.rotateX(-Math.PI / 2); g.translate(0, 0, 20); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} position={[0, -0.2, 0]} receiveShadow userData={{ noCast: true }}><meshStandardMaterial color="#8da466" map={tex.map} bumpMap={tex.bump} bumpScale={0.15} roughness={1} /></mesh>;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -34 + r() * 68, z = -30 + r() * 76; if (x > HOUSE.x0 - 2 && x < HOUSE.x1 + 2 && z > HOUSE.z0 - 2 && z < HOUSE.z1 + 2) continue; if (Math.abs(x - 1.7) < 2.4 && z > 8) continue;
      o.position.set(x, -0.1, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.22 + r() * 0.05, 0.4, 0.4 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Backdrop() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 6; i++) { const a = Math.PI * (1.0 + (i / 5) * 1.0) + r() * 0.1, dd = 800 + r() * 200; out.push({ p: [Math.cos(a) * dd, -8, Math.sin(a) * dd], g: mountainGeo(320 + r() * 140, 100 + r() * 80, 350 + i, 0, '#7a8c5a') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>
    {list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.4, 330]}><planeGeometry args={[2600, 560]} /><meshStandardMaterial color="#3a7f93" roughness={0.2} metalness={0.1} /></mesh>
  </group>;
}
