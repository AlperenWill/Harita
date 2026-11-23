/**
 * Yalova Atatürk Köşkü (Yürüyen Köşk) — 3B modeller. İki katlı ahşap köşk (kaplama tahtalı duvarlar, balkon, kırma çatı), yanında büyük çınar, köşkün
 * kaydırıldığı ray izleri ve eski temel çizgisi, çitli bahçe, süs havuzu, çiçek tarhları, kentin evleri, kuzeyde Marmara. Ölçüler, köşkün biçimi
 * ve ray izleri TEMSİLÎDİR (docs/YALOVA-KOSK.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, useGrassCards } from '../shared/scenery';
import { BEDS, FENCE_T, GARDEN, GATE, KOSK, OLD_KOSK, POND, RAILS, TREE } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.64, 0.58).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const H1 = 4, H2 = 3.4;

/* ===================== malzemeler ===================== */
export interface Mats { clap: THREE.MeshStandardMaterial; trim: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; bark: THREE.MeshStandardMaterial; leaf: THREE.MeshStandardMaterial; rail: THREE.MeshStandardMaterial; stone: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; water: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    // kaplama tahta: yatay şeritler
    const cl = canvasTex(128, 256, (g, r) => { g.fillStyle = '#e9e1cd'; g.fillRect(0, 0, 128, 256); for (let y = 0; y < 256; y += 16) { g.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.06})`; g.fillRect(0, y, 128, 2); } for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(120,100,70,${r() * 0.06})`; g.fillRect(r() * 128, r() * 256, 18, 1); } });
    cl.repeat.set(0.35, 0.35);
    const rf = canvasTex(256, 256, (g, r) => { g.fillStyle = '#a4553a'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 12) for (let x = 0; x < 256; x += 16) { const v = 0.78 + r() * 0.35; g.fillStyle = `rgb(${(170 * v) | 0},${(88 * v) | 0},${(62 * v) | 0})`; g.fillRect(x + ((y / 12) % 2) * 8, y, 14, 10); } });
    const bk = canvasTex(128, 256, (g, r) => { g.fillStyle = '#6a5f4e'; g.fillRect(0, 0, 128, 256); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '40,34,26' : '150,140,120'},${0.25 + r() * 0.3})`; g.fillRect(r() * 128, r() * 256, 3 + r() * 6, 16 + r() * 50); } });
    return {
      clap: new THREE.MeshStandardMaterial({ map: cl, roughness: 0.85 }),
      trim: new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.8 }),
      roof: new THREE.MeshStandardMaterial({ map: rf, roughness: 0.85 }),
      bark: new THREE.MeshStandardMaterial({ map: bk, roughness: 1 }),
      leaf: new THREE.MeshStandardMaterial({ color: '#5a8a3a', roughness: 0.95 }),
      rail: new THREE.MeshStandardMaterial({ color: '#5b4a3a', roughness: 0.6, metalness: 0.5 }),
      stone: new THREE.MeshStandardMaterial({ color: '#b3a98f', roughness: 0.95 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 1 }),
      water: new THREE.MeshStandardMaterial({ color: '#4a7f8c', roughness: 0.12, metalness: 0.15 }),
      plaster: new THREE.MeshStandardMaterial({ color: '#ece4d2', roughness: 0.95 }),
    };
  }, []);
}

/* ===================== köşk ===================== */
export function Kosk({ m }: { m: Mats }) {
  const cx = (KOSK.x0 + KOSK.x1) / 2, cz = (KOSK.z0 + KOSK.z1) / 2, W = KOSK.x1 - KOSK.x0, D = KOSK.z1 - KOSK.z0;
  const body = useMemo(() => { const p: Parts = [];
    p.push(bx(W, H1, D, 2.4).translate(cx, H1 / 2 + 0.5, cz)); p.push(bx(W - 1, H2, D - 1, 2.4).translate(cx, H1 + 0.5 + H2 / 2, cz));
    p.push(bx(W + 1, 0.5, D + 1, 2).translate(cx, 0.25, cz));                                  // temel
    return merge(p); }, [W, D, cx, cz]);
  const trim = useMemo(() => { const p: Parts = [], z1 = KOSK.z1;
    // pencere ve kapı çerçeveleri (güney yüz), balkon korkuluğu ve direkleri
    for (let i = 0; i < 4; i++) { const x = KOSK.x0 + 2.2 + i * 3.9; p.push(bx(1.5, 2, 0.16, 1).translate(x, 2.9, z1 + 0.08)); p.push(bx(1.5, 1.8, 0.16, 1).translate(x, H1 + 2.4, z1 - 0.42)); }
    p.push(bx(2, 3, 0.16, 1).translate(cx, 2, z1 + 0.08));
    const bz = z1 + 1.4; p.push(bx(W - 1, 0.18, 1.8, 1.5).translate(cx, H1 + 0.6, bz - 0.5));
    for (let i = 0; i <= 6; i++) p.push(bx(0.16, 3.2, 0.16, 1).translate(KOSK.x0 + 0.8 + i * ((W - 1.6) / 6), H1 + 2.2, bz + 0.3));
    p.push(bx(W - 1, 0.15, 0.15, 1.5).translate(cx, H1 + 3.8, bz + 0.3)); p.push(bx(W - 1, 0.12, 0.12, 1.5).translate(cx, H1 + 1.2, bz + 0.3));
    return merge(p); }, [W, cx]);
  const roof = useMemo(() => { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); g.scale(W + 2.6, 3.4, D + 2.6); return g; }, [W, D]);
  return <group>
    <mesh geometry={body} material={m.clap} castShadow receiveShadow />
    <mesh geometry={trim} material={m.trim} castShadow />
    <mesh geometry={roof} material={m.roof} position={[cx, H1 + H2 + 0.5, cz]} castShadow receiveShadow />
  </group>;
}

/* ===================== çınar, ray izleri ===================== */
export function PlaneTree({ m }: { m: Mats }) {
  const crown = useMemo(() => { const r = rng(5), p: Parts = [];
    for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = r() * TREE.crown * 0.8, g = new THREE.IcosahedronGeometry(2.8 + r() * 1.6, 1); g.translate(TREE.c[0] + Math.cos(a) * d, 9 + r() * 4.5, TREE.c[1] + Math.sin(a) * d); p.push(g); }
    return merge(p); }, []);
  const limbs = useMemo(() => { const p: Parts = [];
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, L = 6 + (k % 2) * 3, g = new THREE.CylinderGeometry(0.35, 0.6, L, 7); g.rotateZ(Math.PI / 2 - 0.5); g.rotateY(-a); g.translate(TREE.c[0] + Math.cos(a) * L * 0.38, 7.2, TREE.c[1] + Math.sin(a) * L * 0.38); p.push(g); }
    return merge(p); }, []);
  return <group>
    <mesh position={[TREE.c[0], 4.2, TREE.c[1]]} castShadow receiveShadow><cylinderGeometry args={[TREE.r * 0.7, TREE.r, 8.4, 14]} /><primitive object={m.bark} attach="material" /></mesh>
    <mesh geometry={limbs} material={m.bark} castShadow />
    <mesh geometry={crown} material={m.leaf} castShadow receiveShadow />
  </group>;
}
export function Rails({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = [], L = RAILS.x1 - RAILS.x0;
    for (const z of RAILS.z) p.push(bx(L, 0.12, 0.14, 1).translate((RAILS.x0 + RAILS.x1) / 2, 0.1, z));
    for (let x = RAILS.x0; x <= RAILS.x1; x += 1.2) p.push(bx(0.2, 0.1, RAILS.z[1] - RAILS.z[0] + 0.7, 1).translate(x, 0.06, (RAILS.z[0] + RAILS.z[1]) / 2));
    return merge(p); }, []);
  // eski temel çizgisi: köşkün kaydırılmadan önceki yerini gösteren alçak taş sıra
  const old = useMemo(() => { const p: Parts = [], O = OLD_KOSK;
    for (const [x0, x1, z0, z1] of [[O.x0, O.x1, O.z0, O.z0 + 0.5], [O.x0, O.x1, O.z1 - 0.5, O.z1], [O.x0, O.x0 + 0.5, O.z0, O.z1], [O.x1 - 0.5, O.x1, O.z0, O.z1]] as const) p.push(bx(x1 - x0, 0.22, z1 - z0, 1.5).translate((x0 + x1) / 2, 0.11, (z0 + z1) / 2));
    return merge(p); }, []);
  return <group>
    <mesh geometry={geo} material={m.rail} castShadow receiveShadow />
    <mesh geometry={old} material={m.stone} receiveShadow />
  </group>;
}

/* ===================== bahçe ===================== */
export function Garden({ m }: { m: Mats }) {
  const fence = useMemo(() => { const p: Parts = [], G = GARDEN, h = 1.3, t = FENCE_T;
    p.push(bx(G.x1 - G.x0, h, t, 3).translate(0, h / 2, G.z0)); p.push(bx(t, h, G.z1 - G.z0, 3).translate(G.x0, h / 2, (G.z0 + G.z1) / 2)); p.push(bx(t, h, G.z1 - G.z0, 3).translate(G.x1, h / 2, (G.z0 + G.z1) / 2));
    p.push(bx(GATE.x0 - G.x0, h, t, 3).translate((G.x0 + GATE.x0) / 2, h / 2, G.z1)); p.push(bx(G.x1 - GATE.x1, h, t, 3).translate((GATE.x1 + G.x1) / 2, h / 2, G.z1));
    for (const x of [GATE.x0 - 0.4, GATE.x1 + 0.4]) p.push(bx(0.8, 2.2, 0.8, 1).translate(x, 1.1, G.z1));
    return merge(p); }, []);
  const path = useMemo(() => { const g = new THREE.PlaneGeometry(3.4, GARDEN.z1 - KOSK.z1 + 1); g.rotateX(-Math.PI / 2); g.translate(0, 0.03, (KOSK.z1 - 1 + GARDEN.z1) / 2); return g; }, []);
  return <group>
    <mesh geometry={fence} material={m.trim} castShadow receiveShadow />
    <mesh geometry={path} receiveShadow><meshStandardMaterial color="#cfc6ae" roughness={0.95} /></mesh>
    <mesh position={[POND.c[0], 0.08, POND.c[1]]} rotation-x={-Math.PI / 2}><circleGeometry args={[POND.r, 22]} /><primitive object={m.water} attach="material" /></mesh>
    <mesh position={[POND.c[0], 0.3, POND.c[1]]} rotation-x={-Math.PI / 2} castShadow receiveShadow><ringGeometry args={[POND.r, POND.r + 0.45, 22]} /><primitive object={m.stone} attach="material" /></mesh>
    {BEDS.map((b, i) => <mesh key={i} position={[(b.x0 + b.x1) / 2, 0.25, (b.z0 + b.z1) / 2]} receiveShadow castShadow><boxGeometry args={[b.x1 - b.x0, 0.5, b.z1 - b.z0]} /><meshStandardMaterial color={i ? '#d9a0a8' : '#e0b84a'} roughness={1} /></mesh>)}
  </group>;
}

/* ===================== çevre ===================== */
export function Town({ m }: { m: Mats }) {
  const geo = useMemo(() => { const r = rng(33), walls: Parts = [], roofs: Parts = [];
    for (let i = 0; i < 80; i++) { const side = r(), x = side < 0.35 ? -62 - r() * 70 : side < 0.7 ? 62 + r() * 70 : -58 + r() * 116, z = side < 0.7 ? -30 + r() * 100 : 82 + r() * 40, w = 7 + r() * 5, d = 7 + r() * 5, h = 5 + r() * 7;
      walls.push(bx(w, h, d, 2.4).translate(x, h / 2, z));
      const roof = new THREE.ConeGeometry(Math.max(w, d) * 0.72, 2.4, 4); roof.rotateY(Math.PI / 4); roof.translate(x, h + 1.2, z); roofs.push(roof); }
    return { walls: merge(walls), roofs: merge(roofs) }; }, []);
  return <group>
    <mesh geometry={geo.walls} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={geo.roofs} material={m.roof} castShadow />
  </group>;
}
export function Ground({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(420, 320, tier === 'high' ? 30 : 16, tier === 'high' ? 30 : 16); g.rotateX(-Math.PI / 2); g.translate(0, 0, 30); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} position={[0, -0.2, 0]} receiveShadow userData={{ noCast: true }}><meshStandardMaterial color="#8da466" map={tex.map} bumpMap={tex.bump} bumpScale={0.15} roughness={1} /></mesh>;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = GARDEN.x0 + r() * (GARDEN.x1 - GARDEN.x0), z = GARDEN.z0 + r() * (GARDEN.z1 - GARDEN.z0);
      if (x > KOSK.x0 - 2 && x < KOSK.x1 + 2 && z > KOSK.z0 - 2 && z < KOSK.z1 + 3) continue; if (Math.abs(x) < 2.2 && z > KOSK.z1) continue; if (Math.hypot(x - TREE.c[0], z - TREE.c[1]) < 3.5 || Math.hypot(x - POND.c[0], z - POND.c[1]) < 4) continue;
      o.position.set(x, -0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.22 + r() * 0.05, 0.42, 0.4 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Backdrop() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 7; i++) { const a = Math.PI * (0.05 + (i / 6) * 0.9) + r() * 0.1, dd = 800 + r() * 200; out.push({ p: [Math.cos(a) * dd, -8, Math.sin(a) * dd], g: mountainGeo(340 + r() * 140, 150 + r() * 100, 370 + i, 0, '#6a8250') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>
    {list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.4, -330]}><planeGeometry args={[2600, 560]} /><meshStandardMaterial color="#3a7f93" roughness={0.2} metalness={0.1} /></mesh>
  </group>;
}
