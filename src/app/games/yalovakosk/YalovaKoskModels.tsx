/**
 * Yalova Atatürk Köşkü (Yürüyen Köşk) — 3B modeller. İki katlı ahşap köşk (kaplama tahtalı duvarlar, balkon, kırma çatı), yanında büyük çınar, köşkün
 * kaydırıldığı ray izleri ve eski temel çizgisi, çitli bahçe, süs havuzu, çiçek tarhları, kentin evleri, kuzeyde Marmara. Ölçüler, köşkün biçimi
 * ve ray izleri TEMSİLÎDİR (docs/YALOVA-KOSK.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, useGrassCards } from '../shared/scenery';
import { BEDS, GARDEN, GATE, KOSK, OLD_KOSK, POND, RAILS, TREE, BRANCH, SHIFT, WINCH, shift } from './site';

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
    return merge(p); }, [W, D, cx, cz]);
  const base = useMemo(() => bx(W + 1, 0.5, D + 1, 2).translate(cx, 0.25, cz), [W, D, cx, cz]);
  // pencereler: cam + beyaz kasa + yeşil kepenkler; dört yüzde, iki katta. Kapı ve balkon.
  const win = useMemo(() => { const gl: Parts = [], fr: Parts = [], sh: Parts = [], tr: Parts = [];
    const put = (x: number, y: number, z: number, ry: number) => { const nx = Math.sin(ry), nz = Math.cos(ry), tx = Math.cos(ry), tz = -Math.sin(ry), w = 1.1, h = 1.6;
      const g = new THREE.PlaneGeometry(w, h); g.rotateY(ry); g.translate(x + nx * 0.03, y, z + nz * 0.03); gl.push(g);
      for (const [dx, dy, ww, hh] of [[0, h / 2 + 0.06, w + 0.24, 0.12], [0, -h / 2 - 0.07, w + 0.34, 0.14], [-w / 2 - 0.06, 0, 0.12, h + 0.2], [w / 2 + 0.06, 0, 0.12, h + 0.2], [0, 0, 0.05, h], [0, h * 0.18, w, 0.05]] as const) { const f = bx(ww, hh, 0.08, 1); f.rotateY(ry); f.translate(x + tx * dx + nx * 0.06, y + dy, z + tz * dx + nz * 0.06); fr.push(f); }
      for (const sd of [-1, 1]) { const k = bx(0.55, h + 0.1, 0.05, 1); k.rotateY(ry); k.translate(x + tx * sd * (w / 2 + 0.42) + nx * 0.06, y, z + tz * sd * (w / 2 + 0.42) + nz * 0.06); sh.push(k); } };
    const g0 = 2.5, g1 = H1 + 0.5 + 1.7, z1 = KOSK.z1, z0 = KOSK.z0;
    for (const i of [0, 1, 3]) put(KOSK.x0 + 2.2 + i * 3.9, g0, z1, 0);
    for (let i = 0; i < 4; i++) { put(KOSK.x0 + 2.2 + i * 3.9, g0, z0, Math.PI); put(KOSK.x0 + 2.7 + i * 3.6, g1, z0 + 0.5, Math.PI); }
    for (let i = 0; i < 4; i++) if (i !== 1 && i !== 2) put(KOSK.x0 + 2.7 + i * 3.6, g1, z1 - 0.5, 0);
    for (const z of [cz - 2.2, cz + 2.2]) { put(KOSK.x1, g0, z, Math.PI / 2); put(KOSK.x0, g0, z, -Math.PI / 2); put(KOSK.x1 - 0.5, g1, z, Math.PI / 2); put(KOSK.x0 + 0.5, g1, z, -Math.PI / 2); }
    // giriş kapısı (çift kanat) ve üst katta balkona açılan kapı
    tr.push(bx(2.0, 3.0, 0.16, 1).translate(cx, 2.0, z1 + 0.08)); gl.push(new THREE.PlaneGeometry(1.6, 2.7).translate(cx, 1.85, z1 + 0.17));
    tr.push(bx(1.4, 0.08, 0.1, 1).translate(cx, 3.35, z1 + 0.2));
    gl.push(new THREE.PlaneGeometry(2.4, 2.4).translate(cx, H1 + 0.5 + 1.4, z1 - 0.47));
    // balkon: döşeme, korkuluk, direkler, payandalar
    const bz = z1 + 1.4; tr.push(bx(W - 1, 0.18, 1.8, 1.5).translate(cx, H1 + 0.6, bz - 0.5));
    for (let i = 0; i <= 6; i++) { const x = KOSK.x0 + 0.8 + i * ((W - 1.6) / 6); tr.push(bx(0.16, 3.2, 0.16, 1).translate(x, H1 + 2.2, bz + 0.3)); const br = bx(0.12, 0.12, 1.1, 1); br.rotateX(0.75); br.translate(x, H1 + 0.15, z1 + 0.42); tr.push(br); }
    tr.push(bx(W - 1, 0.15, 0.15, 1.5).translate(cx, H1 + 3.8, bz + 0.3)); tr.push(bx(W - 1, 0.1, 0.1, 1.5).translate(cx, H1 + 1.65, bz + 0.3));
    for (let x = KOSK.x0 + 0.9; x < KOSK.x1 - 0.8; x += 0.32) tr.push(bx(0.05, 0.95, 0.05, 1).translate(x, H1 + 1.2, bz + 0.3));
    // köşe pervazları ve kat silmesi
    for (const [x, z] of [[KOSK.x0, KOSK.z0], [KOSK.x1, KOSK.z0], [KOSK.x0, KOSK.z1], [KOSK.x1, KOSK.z1]]) tr.push(bx(0.24, H1, 0.24, 1).translate(x, 0.5 + H1 / 2, z));
    tr.push(bx(W + 0.3, 0.2, D + 0.3, 2).translate(cx, H1 + 0.5, cz));
    return { gl: merge(gl), fr: merge(fr), sh: merge(sh), tr: merge(tr) }; }, [W, D, cx, cz]);
  const roof = useMemo(() => { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); g.scale(W + 2.6, 3.4, D + 2.6); return g; }, [W, D]);
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => { const g = ref.current; if (!g) return; const target = shift.v - SHIFT; g.position.x += (target - g.position.x) * Math.min(1, dt * 4); });
  const mats = useMemo(() => ({ glass: new THREE.MeshStandardMaterial({ color: '#3c4850', roughness: 0.15, metalness: 0.5 }), white: new THREE.MeshStandardMaterial({ color: '#f4f1e8', roughness: 0.7 }), green: new THREE.MeshStandardMaterial({ color: '#4c6b4a', roughness: 0.8 }) }), []);
  return <group ref={ref} position-x={-SHIFT}>
    <mesh geometry={base} material={m.stone} castShadow receiveShadow />
    <mesh geometry={body} material={m.clap} castShadow receiveShadow />
    <mesh geometry={win.gl} material={mats.glass} />
    <mesh geometry={win.fr} material={mats.white} castShadow />
    <mesh geometry={win.sh} material={mats.green} castShadow />
    <mesh geometry={win.tr} material={m.trim} castShadow />
    <mesh geometry={roof} material={m.roof} position={[cx, H1 + H2 + 0.5, cz]} castShadow receiveShadow />
  </group>;
}

/* ===================== kriko (temsilî): makara, kol, halat ===================== */
export function Winch({ m }: { m: Mats }) {
  const arm = useRef<THREE.Group>(null), last = useRef(shift.v);
  useFrame((_, dt) => { const a = arm.current; if (!a) return; const d = shift.v - last.current; last.current = shift.v; a.rotation.x -= d * 6 + 0 * dt; });
  const ropeLen = WINCH.c[0] - 0.6 - KOSK.x1;
  return <group>
    <group position={[WINCH.c[0], 0, WINCH.c[1]]}>
      {[-0.55, 0.55].map((z) => <mesh key={z} position={[0, 0.6, z]} material={m.trim} castShadow><boxGeometry args={[0.9, 1.2, 0.14]} /></mesh>)}
      <mesh position={[0, 0.95, 0]} rotation-x={Math.PI / 2} material={m.rail} castShadow><cylinderGeometry args={[0.28, 0.28, 0.96, 14]} /></mesh>
      <group ref={arm} position={[0, 0.95, 0.62]}>
        <mesh position={[0, 0.35, 0]} material={m.rail}><boxGeometry args={[0.08, 0.7, 0.08]} /></mesh>
        <mesh position={[0, 0.7, 0.18]} rotation-x={Math.PI / 2} material={m.trim}><cylinderGeometry args={[0.05, 0.05, 0.36, 8]} /></mesh>
      </group>
    </group>
    <WinchRope len={ropeLen} />
  </group>;
}
function WinchRope({ len }: { len: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => { const mm = ref.current; if (!mm) return; const x1 = WINCH.c[0] - 0.3, x0 = KOSK.x1 + (shift.v - SHIFT), L = Math.max(0.1, x1 - x0); mm.scale.set(1, L / len, 1); mm.position.set((x0 + x1) / 2, 0.95, WINCH.c[1]); });
  return <mesh ref={ref} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.035, 0.035, len, 6]} /><meshStandardMaterial color="#c9b58a" roughness={0.9} /></mesh>;
}

/* ===================== çınar, ray izleri ===================== */
export function PlaneTree({ m }: { m: Mats }) {
  const crown = useMemo(() => { const r = rng(5), p: Parts = [];
    for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = r() * TREE.crown * 0.8, g = new THREE.IcosahedronGeometry(2.8 + r() * 1.6, 1); g.translate(TREE.c[0] + Math.cos(a) * d, 9 + r() * 4.5, TREE.c[1] + Math.sin(a) * d); p.push(g); }
    return merge(p); }, []);
  // dallar: gövdeden çıkıp taç içinde incelerek biter (önceden kesik kütük gibi duruyordu); biri köşke doğru uzanır
  const limbs = useMemo(() => { const p: Parts = [], r = rng(8);
    const limb = (a: [number, number, number], b: [number, number, number], r0: number, r1: number) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
      const g = new THREE.CylinderGeometry(r1, r0, L, 8, 1); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(A.x, A.y, A.z); p.push(g); };
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.4, L = 5 + r() * 3, y0 = 6.5 + r() * 1.2; const end: [number, number, number] = [TREE.c[0] + Math.cos(a) * L, y0 + 3 + r() * 2, TREE.c[1] + Math.sin(a) * L];
      limb([TREE.c[0], y0, TREE.c[1]], end, 0.55, 0.12); const mid: [number, number, number] = [(TREE.c[0] + end[0]) / 2, (y0 + end[1]) / 2, (TREE.c[1] + end[2]) / 2]; limb(mid, [end[0] + Math.cos(a + 0.8) * 2.5, end[1] + 1.2, end[2] + Math.sin(a + 0.8) * 2.5], 0.22, 0.06); }
    limb(BRANCH.from, BRANCH.to, 0.5, 0.14);
    // gövde dibindeki kök şişkinliği
    const flare = new THREE.CylinderGeometry(TREE.r, TREE.r * 1.12, 1.2, 14); flare.translate(TREE.c[0], 0.6, TREE.c[1]); p.push(flare);
    return merge(p); }, []);
  const tip = useMemo(() => { const r = rng(14), p: Parts = []; for (let i = 0; i < 5; i++) { const t = 0.55 + i * 0.1, x = BRANCH.from[0] + (BRANCH.to[0] - BRANCH.from[0]) * t, y = BRANCH.from[1] + (BRANCH.to[1] - BRANCH.from[1]) * t + 0.9, z = BRANCH.from[2] + (BRANCH.to[2] - BRANCH.from[2]) * t; const g = new THREE.IcosahedronGeometry(1.2 + r() * 0.6, 1); g.translate(x, y, z + (r() - 0.5)); p.push(g); } return merge(p); }, []);
  return <group>
    <mesh position={[TREE.c[0], 4.2, TREE.c[1]]} castShadow receiveShadow><cylinderGeometry args={[TREE.r * 0.7, TREE.r, 8.4, 14]} /><primitive object={m.bark} attach="material" /></mesh>
    <mesh geometry={limbs} material={m.bark} castShadow />
    <mesh geometry={crown} material={m.leaf} castShadow receiveShadow />
    <mesh geometry={tip} material={m.leaf} castShadow receiveShadow />
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
  // ahşap çıta çit: dikmeler, iki kuşak, sık çıtalar (önceden kalın, düz bir levha duvardı); kapıda taş babalar
  const fence = useMemo(() => { const p: Parts = [], G = GARDEN, h = 1.15;
    const run = (x0: number, z0: number, x1: number, z1: number) => { const L = Math.hypot(x1 - x0, z1 - z0), dx = (x1 - x0) / L, dz = (z1 - z0) / L, ax = Math.abs(dx) > 0.5;
      for (let s = 0; s <= L + 0.01; s += 2) p.push(bx(0.14, h + 0.15, 0.14, 1).translate(x0 + dx * s, (h + 0.15) / 2, z0 + dz * s));
      for (const y of [0.35, h - 0.15]) p.push(bx(ax ? L : 0.06, 0.08, ax ? 0.06 : L, 1).translate((x0 + x1) / 2, y, (z0 + z1) / 2));
      for (let s = 0.12; s < L; s += 0.24) { const q = bx(0.08, h, 0.03, 1); if (!ax) q.rotateY(Math.PI / 2); q.translate(x0 + dx * s, h / 2, z0 + dz * s); p.push(q); } };
    run(G.x0, G.z0, G.x1, G.z0); run(G.x0, G.z0, G.x0, G.z1); run(G.x1, G.z0, G.x1, G.z1); run(G.x0, G.z1, GATE.x0 - 0.8, G.z1); run(GATE.x1 + 0.8, G.z1, G.x1, G.z1);
    return merge(p); }, []);
  const gatePosts = useMemo(() => { const p: Parts = []; for (const x of [GATE.x0 - 0.4, GATE.x1 + 0.4]) { p.push(bx(0.8, 1.9, 0.8, 1).translate(x, 0.95, GARDEN.z1)); p.push(bx(1.0, 0.2, 1.0, 1).translate(x, 1.95, GARDEN.z1)); } return merge(p); }, []);
  // çiçek tarhları: alçak ahşap kenar + çiçek öbekleri (önceden düz renkli kutulardı)
  const beds = useMemo(() => { const edge: Parts = [], soil: Parts = [], fl: Parts[] = [[], [], []], r = rng(19);
    for (const b of BEDS) { const w = b.x1 - b.x0, d = b.z1 - b.z0, cx2 = (b.x0 + b.x1) / 2, cz2 = (b.z0 + b.z1) / 2;
      edge.push(bx(w, 0.3, 0.1, 1).translate(cx2, 0.15, b.z0), bx(w, 0.3, 0.1, 1).translate(cx2, 0.15, b.z1), bx(0.1, 0.3, d, 1).translate(b.x0, 0.15, cz2), bx(0.1, 0.3, d, 1).translate(b.x1, 0.15, cz2));
      soil.push(bx(w - 0.1, 0.22, d - 0.1, 1).translate(cx2, 0.11, cz2));
      for (let i = 0; i < 70; i++) { const g = new THREE.IcosahedronGeometry(0.13 + r() * 0.08, 0); g.translate(b.x0 + 0.3 + r() * (w - 0.6), 0.35 + r() * 0.2, b.z0 + 0.3 + r() * (d - 0.6)); fl[i % 3].push(g); } }
    return { edge: merge(edge), soil: merge(soil), fl: fl.map(merge) }; }, []);
  const path = useMemo(() => { const g = new THREE.PlaneGeometry(3.4, GARDEN.z1 - KOSK.z1 + 1); g.rotateX(-Math.PI / 2); g.translate(0, 0.03, (KOSK.z1 - 1 + GARDEN.z1) / 2); return g; }, []);
  return <group>
    <mesh geometry={fence} material={m.trim} castShadow receiveShadow />
    <mesh geometry={gatePosts} material={m.stone} castShadow receiveShadow />
    <mesh geometry={beds.edge} material={m.trim} castShadow receiveShadow />
    <mesh geometry={beds.soil} receiveShadow><meshStandardMaterial color="#5b4630" roughness={1} /></mesh>
    {beds.fl.map((g, i) => <mesh key={i} geometry={g} castShadow><meshStandardMaterial color={['#d9455a', '#f2c94c', '#f4f1ea'][i]} roughness={0.8} flatShading /></mesh>)}
    <mesh geometry={path} receiveShadow><meshStandardMaterial color="#cfc6ae" roughness={0.95} /></mesh>
    <mesh position={[POND.c[0], 0.2, POND.c[1]]} rotation-x={-Math.PI / 2}><circleGeometry args={[POND.r, 28]} /><primitive object={m.water} attach="material" /></mesh>
    {/* havuz kenarı yerden yükselir (önceden havada duran düz halkaydı) */}
    <mesh position={[POND.c[0], 0.17, POND.c[1]]} castShadow receiveShadow><cylinderGeometry args={[POND.r + 0.45, POND.r + 0.5, 0.34, 28, 1, true]} /><primitive object={m.stone} attach="material" /></mesh>
    <mesh position={[POND.c[0], 0.34, POND.c[1]]} rotation-x={-Math.PI / 2} receiveShadow><ringGeometry args={[POND.r, POND.r + 0.45, 28]} /><primitive object={m.stone} attach="material" /></mesh>
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
      if (x > OLD_KOSK.x0 - 2 && x < KOSK.x1 + 2 && z > KOSK.z0 - 2 && z < KOSK.z1 + 3) continue; if (Math.abs(x) < 2.2 && z > KOSK.z1) continue; if (Math.hypot(x - TREE.c[0], z - TREE.c[1]) < 3.5 || Math.hypot(x - POND.c[0], z - POND.c[1]) < 4) continue;
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
