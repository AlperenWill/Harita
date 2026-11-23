/**
 * Ertuğrul Gazi Türbesi — 3B modeller. Taş duvarlı bahçe ve kapı, altıgen gövdeli kubbeli türbe, nöbet kulübeleri, iki yanda büstler, çam ve servi,
 * batıdaki tepede küçük bir cami, şenlik alanında kıl çadır, çevrede Söğüt evleri ve dağlar. Ölçüler, büstlerin biçimi ve yerleşim TEMSİLÎDİR
 * (docs/ERTUGRUL.md).
 */
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { AREA, BUSTS, GARDEN, GATE, HILL, MOSQUE, POSTS, TENT, TOMB, WALL_T, groundY } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.64, 0.58).normalize();
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const slab = (p: Parts, x0: number, x1: number, z0: number, z1: number, h: number, y0 = 0, s = 2.4) => { const g = bx(x1 - x0, h, z1 - z0, s); g.translate((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2); p.push(g); };

/* ===================== malzemeler ===================== */
export interface Mats { roof: THREE.MeshStandardMaterial; gold: THREE.MeshStandardMaterial; bronze: THREE.MeshStandardMaterial; stone: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial; dome: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; tent: THREE.MeshStandardMaterial; paving: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('ertugrul-tas', ['#c3b79f', '#b3a78e', '#cfc4ac', '#a39880'], [14, 10], [30, 40]);
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.35, roughness: 0.95 })),
      plaster: new THREE.MeshStandardMaterial({ color: '#e8dfc9', roughness: 0.95 }),
      roof: new THREE.MeshStandardMaterial({ color: '#a8553a', roughness: 0.9 }),
      gold: new THREE.MeshStandardMaterial({ color: '#d9b24a', roughness: 0.3, metalness: 0.9 }),
      bronze: new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.45, metalness: 0.6 }),
      dome: new THREE.MeshStandardMaterial({ color: '#8e9a9c', roughness: 0.5, metalness: 0.4 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 1 }),
      wood: new THREE.MeshStandardMaterial({ color: '#6d4b2e', roughness: 0.85 }),
      tent: new THREE.MeshStandardMaterial({ color: '#2f2a26', roughness: 1, side: THREE.DoubleSide }),
      paving: new THREE.MeshStandardMaterial({ color: '#cdc4ae', roughness: 0.95 }),
    };
  }, []);
}

/* ===================== zaman şeridi: dönem katmanları ===================== */
/** Oyun yöneticisi yazar: seçili dönem (0 açık mezar · 1 ilk taşlar · 2 altıgen türbe · 3 bugün) */
export const eraState = { era: 3 };
/** Dönemine göre yerden yükselen ya da yere inen katman (yükseklik ölçeği yumuşakça değişir) */
export function EraGroup({ when, children }: { when: (era: number) => boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null), k = useRef(when(eraState.era) ? 1 : 0);
  useFrame((_, dt) => { const g = ref.current; if (!g) return; const t = when(eraState.era) ? 1 : 0; k.current += (t - k.current) * Math.min(1, dt * 3.2); if (Math.abs(t - k.current) < 0.002) k.current = t;
    g.scale.set(1, Math.max(0.001, k.current), 1); g.visible = k.current > 0.01; });
  return <group ref={ref}>{children}</group>;
}
function Alem({ m, y, s = 1 }: { m: Mats; y: number; s?: number }) {
  return <group position={[TOMB.c[0], y, TOMB.c[1]]} scale={s}>
    <mesh position={[0, 0.45, 0]} material={m.gold}><cylinderGeometry args={[0.08, 0.14, 0.9, 8]} /></mesh>
    <mesh position={[0, 1.0, 0]} material={m.gold}><sphereGeometry args={[0.24, 12, 8]} /></mesh>
    <mesh position={[0, 1.6, 0]} rotation-y={Math.PI / 2} material={m.gold}><torusGeometry args={[0.32, 0.06, 6, 16, Math.PI * 1.4]} /></mesh>
  </group>;
}
const archWin = (w: number, h: number) => { const s = new THREE.Shape(), r = w / 2; s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r * 1.2); s.quadraticCurveTo(r, h - r * 0.2, 0, h); s.quadraticCurveTo(-r, h - r * 0.2, -r, h - r * 1.2); s.closePath(); return new THREE.ShapeGeometry(s, 8); };

/* ===================== bahçe ve türbe ===================== */
export function Garden({ m }: { m: Mats }) {
  const G = GARDEN, t = WALL_T;
  /** bahçe sınırı boyunca parça üretici: kapı açıklığı atlanır */
  const ring = (fn: (x0: number, x1: number, z0: number, z1: number) => void) => { fn(G.x0 - t, G.x1 + t, G.z0 - t, G.z0); fn(G.x0 - t, G.x0, G.z0, G.z1 + t); fn(G.x1, G.x1 + t, G.z0, G.z1 + t); fn(G.x0 - t, GATE.x0, G.z1, G.z1 + t); fn(GATE.x1, G.x1 + t, G.z1, G.z1 + t); };
  const walls = useMemo(() => { const p: Parts = [], h = 3.2;
    ring((x0, x1, z0, z1) => slab(p, x0, x1, z0, z1, h)); ring((x0, x1, z0, z1) => slab(p, x0 - 0.12, x1 + 0.12, z0 - 0.12, z1 + 0.12, 0.35, h));
    for (const x of [GATE.x0 - 0.6, GATE.x1 + 0.6]) { const c = bx(1.4, h + 1.6, 1.4, 1.5); c.translate(x, (h + 1.6) / 2, G.z1 + t / 2); p.push(c); }
    const lint = bx(GATE.x1 - GATE.x0 + 2.8, 0.7, 1.4, 1.5); lint.translate(0, h + 1.2, G.z1 + t / 2); p.push(lint);
    return merge(p); }, []);
  // 1. dönem: kazık ve çubuklardan çalı çit (temsilî)
  const fence = useMemo(() => { const p: Parts = [];
    ring((x0, x1, z0, z1) => { const along = x1 - x0 > z1 - z0, L = along ? x1 - x0 : z1 - z0, n = Math.max(1, Math.round(L / 2)), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      for (let i = 0; i <= n; i++) { const u = i / n, q = new THREE.CylinderGeometry(0.07, 0.09, 1.5, 5); q.translate(along ? x0 + u * L : cx, 0.75, along ? cz : z0 + u * L); p.push(q); }
      for (const y of [0.5, 1.1]) { const r = bx(along ? L : 0.08, 0.08, along ? 0.08 : L, 1); r.translate(cx, y, cz); p.push(r); } });
    return merge(p); }, []);
  // 2. dönem: alçak moloz taş duvar
  const low = useMemo(() => { const p: Parts = []; ring((x0, x1, z0, z1) => slab(p, x0, x1, z0, z1, 1.1)); return merge(p); }, []);
  // mezar höyüğü, baş taşı ve taş halka (1.–2. dönem)
  const grave = useMemo(() => { const earth: Parts = [], st: Parts = [], c = TOMB.c;
    const mound = new THREE.SphereGeometry(1.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); mound.scale(1, 0.4, 1.7); mound.translate(c[0], 0, c[1]); earth.push(mound);
    const head = bx(0.5, 1.3, 0.2, 1); head.translate(c[0], 0.6, c[1] - 2.3); st.push(head); const foot = bx(0.4, 0.7, 0.2, 1); foot.translate(c[0], 0.3, c[1] + 2.3); st.push(foot);
    return { earth: merge(earth), st: merge(st) }; }, []);
  const stones = useMemo(() => { const p: Parts = [], r = rng(8); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, q = new THREE.DodecahedronGeometry(0.45 + r() * 0.25, 0); q.scale(1, 0.6, 1); q.translate(TOMB.c[0] + Math.cos(a) * 5, 0.2, TOMB.c[1] + Math.sin(a) * 5); p.push(q); } return merge(p); }, []);
  const hexLow = useMemo(() => { const g = new THREE.CylinderGeometry(4.6, 4.8, 1.6, 6, 1, true); g.rotateY(Math.PI / 6); g.translate(TOMB.c[0], 0.8, TOMB.c[1]); const top = new THREE.RingGeometry(4.1, 4.8, 6, 1); top.rotateX(-Math.PI / 2); top.rotateY(Math.PI / 6); top.translate(TOMB.c[0], 1.6, TOMB.c[1]); const inner = new THREE.CylinderGeometry(4.1, 4.2, 1.6, 6, 1, true); inner.scale(-1, 1, 1); inner.rotateY(Math.PI / 6); inner.translate(TOMB.c[0], 0.8, TOMB.c[1]); return merge([g, top, inner]); }, []);
  // 3.–4. dönem: altıgen türbe (gövde, silmeler, sivri kemerli pencereler, taçkapı, kasnak, kurşun kubbe)
  const tomb = useMemo(() => { const p: Parts = [], dk: Parts = [], c = TOMB.c, r = TOMB.r, H = 5.2;
    const body = new THREE.CylinderGeometry(r, r + 0.2, H, 6); body.rotateY(Math.PI / 6); body.translate(c[0], H / 2, c[1]); p.push(body);
    for (const [y, dr, hh] of [[H, 0.3, 0.4], [H + 0.4, 0.15, 0.25], [1.1, 0.12, 0.2]] as const) { const b = new THREE.CylinderGeometry(r + dr, r + dr, hh, 6); b.rotateY(Math.PI / 6); b.translate(c[0], y, c[1]); p.push(b); }
    const step = new THREE.CylinderGeometry(r + 1.4, r + 1.6, 0.4, 6); step.rotateY(Math.PI / 6); step.translate(c[0], 0.2, c[1]); p.push(step);
    const drum = new THREE.CylinderGeometry(r * 0.86, r * 0.9, 1.1, 12); drum.translate(c[0], H + 1.05, c[1]); p.push(drum);
    // altı yüz: yüz merkezleri a = 90° + k·60° yönünde (güney yüzü kapı)
    const ap = r * Math.cos(Math.PI / 6) + 0.03;
    for (let k = 0; k < 6; k++) { const a = Math.PI / 2 + k * Math.PI / 3, nx = Math.cos(a), nz = Math.sin(a), ry = Math.atan2(nx, nz);
      if (k === 0) { const d = archWin(1.8, 3.4); d.rotateY(ry); d.translate(c[0] + nx * (ap + 0.42), 0.4, c[1] + nz * (ap + 0.42)); dk.push(d);
        const fr = bx(3.2, 4.6, 0.4, 1.5); fr.rotateY(ry); fr.translate(c[0] + nx * (ap + 0.2), 2.3, c[1] + nz * (ap + 0.2)); p.push(fr); continue; }
      for (const y of [1.6, 3.6]) { const w = archWin(0.9, y > 2 ? 1.2 : 1.5); w.rotateY(ry); w.translate(c[0] + nx * ap, y, c[1] + nz * ap); dk.push(w); } }
    return { p: merge(p), dk: merge(dk) }; }, []);
  // büstler (4. dönem) ve yerlerinde önceki dönemlerde çalılar
  const busts = useMemo(() => { const p: Parts = [], q: Parts = []; for (const b of BUSTS) { slab(p, b[0] - 0.45, b[0] + 0.45, b[1] - 0.45, b[1] + 0.45, 1.3, 0, 1); slab(p, b[0] - 0.55, b[0] + 0.55, b[1] - 0.55, b[1] + 0.55, 0.15, 1.3, 1); const h = new THREE.SphereGeometry(0.3, 12, 10); h.scale(0.9, 1.1, 1); h.translate(b[0], 2.15, b[1]); q.push(h); const sh = new THREE.CylinderGeometry(0.38, 0.5, 0.6, 10); sh.scale(1, 1, 0.6); sh.translate(b[0], 1.75, b[1]); q.push(sh); } return { base: merge(p), heads: merge(q) }; }, []);
  const bushes = useMemo(() => { const p: Parts = [], r = rng(4); for (const b of [...BUSTS, ...POSTS]) { const q = new THREE.IcosahedronGeometry(0.75 + r() * 0.25, 1); q.scale(1, 0.85, 1); q.translate(b[0], 0.6, b[1]); p.push(q); } const g = merge(p); g.computeVertexNormals(); return g; }, []);
  const booths = useMemo(() => { const p: Parts = []; for (const q of POSTS) { slab(p, q[0] - 0.8, q[0] + 0.8, q[1] - 0.8, q[1] + 0.8, 0.3, 0, 1); } return merge(p); }, []);
  const ground = useMemo(() => { const g = new THREE.PlaneGeometry(G.x1 - G.x0, G.z1 - G.z0); g.rotateX(-Math.PI / 2); g.translate(0, 0.02, (G.z0 + G.z1) / 2); return g; }, []);
  const bushMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a6b35', roughness: 0.95, flatShading: true }), []);
  const earthMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7d6a4c', roughness: 1 }), []);
  return <group>
    <EraGroup when={(e) => e >= 2}><mesh geometry={walls} material={m.stone} castShadow receiveShadow /><mesh geometry={ground} material={m.paving} receiveShadow /></EraGroup>
    <EraGroup when={(e) => e === 0}><mesh geometry={fence} material={m.wood} castShadow /><mesh geometry={stones} material={m.stone} castShadow receiveShadow /></EraGroup>
    <EraGroup when={(e) => e === 1}><mesh geometry={low} material={m.stone} castShadow receiveShadow /><mesh geometry={hexLow} material={m.stone} castShadow receiveShadow /></EraGroup>
    <EraGroup when={(e) => e <= 1}><mesh geometry={grave.earth} material={earthMat} castShadow receiveShadow /><mesh geometry={grave.st} material={m.stone} castShadow /></EraGroup>
    <EraGroup when={(e) => e >= 2}>
      <mesh geometry={tomb.p} material={m.stone} castShadow receiveShadow />
      <mesh geometry={tomb.dk} material={m.dark} />
      <mesh position={[TOMB.c[0], 6.15, TOMB.c[1]]} castShadow><sphereGeometry args={[TOMB.r * 0.86, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={m.dome} attach="material" /></mesh>
      <Alem m={m} y={6.15 + TOMB.r * 0.86} />
      <pointLight position={[TOMB.c[0], 3.2, TOMB.c[1] + TOMB.r + 1.4]} color="#ffe6bf" intensity={14} distance={14} decay={2} />
    </EraGroup>
    <EraGroup when={(e) => e <= 2}><mesh geometry={bushes} material={bushMat} castShadow receiveShadow /></EraGroup>
    <EraGroup when={(e) => e === 3}>
      <mesh geometry={busts.base} material={m.stone} castShadow receiveShadow />
      <mesh geometry={busts.heads} material={m.bronze} castShadow />
      <mesh geometry={booths} material={m.stone} receiveShadow />
      <Guards />
    </EraGroup>
  </group>;
}
/** Nöbetçiler (temsilî): nöbet noktasında durur, aralıklarla birkaç adım yürüyüp geri döner */
function Guards() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const mats = useMemo(() => ({ uni: new THREE.MeshStandardMaterial({ color: '#4c5a3e', roughness: 0.9 }), skin: new THREE.MeshStandardMaterial({ color: '#c9a184', roughness: 0.8 }), cap: new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.5 }), dark: new THREE.MeshStandardMaterial({ color: '#1f1d1a', roughness: 0.7 }) }), []);
  useFrame(({ clock }) => { const t = clock.elapsedTime % 24; refs.current.forEach((g, i) => { if (!g) return; const s = i ? -1 : 1, q = POSTS[i];
    const out = t < 3 ? t / 3 : t < 6 ? 1 : t < 9 ? 1 - (t - 6) / 3 : 0; g.position.set(q[0] + s * 0, 0.3, q[1] + out * 2.4); g.rotation.y = t >= 6 && t < 9 ? Math.PI : 0; g.position.y = 0.3 + (out > 0 && out < 1 ? Math.abs(Math.sin(clock.elapsedTime * 7)) * 0.04 : 0); }); });
  return <>{POSTS.map((_, i) => <group key={i} ref={(g) => { refs.current[i] = g; }}>
    <mesh position={[0, 1.05, 0]} material={mats.uni} castShadow><capsuleGeometry args={[0.22, 0.9, 4, 8]} /></mesh>
    {[-0.1, 0.1].map((x) => <mesh key={x} position={[x, 0.35, 0]} material={mats.dark} castShadow><cylinderGeometry args={[0.08, 0.07, 0.7, 6]} /></mesh>)}
    <mesh position={[0, 1.78, 0]} material={mats.skin}><sphereGeometry args={[0.15, 10, 8]} /></mesh>
    <mesh position={[0, 1.93, 0]} material={mats.cap}><cylinderGeometry args={[0.17, 0.17, 0.14, 12]} /></mesh>
  </group>)}</>;
}

/* ===================== cami, çadır, şehir ===================== */
export function Landmarks({ m }: { m: Mats }) {
  const y = groundY(MOSQUE.c[0], MOSQUE.c[1]);
  return <group>
    {/* erken dönemlerde tepede göçebe kıl çadırları (temsilî), sonra cami */}
    <EraGroup when={(e) => e <= 1}><group position={[MOSQUE.c[0], y, MOSQUE.c[1]]}>
      {[[0, 0, 3], [4.2, 2.6, 2], [-3.6, 3, 2.2]].map(([x, z, r], i) => <mesh key={i} position={[x, r * 0.55, z]} castShadow receiveShadow><coneGeometry args={[r + 0.6, r * 1.1, 8]} /><primitive object={m.tent} attach="material" /></mesh>)}
    </group></EraGroup>
    <EraGroup when={(e) => e >= 2}>
    <group position={[MOSQUE.c[0], y, MOSQUE.c[1]]}>
      <mesh position={[0, 2.4, 0]} castShadow receiveShadow><boxGeometry args={[7, 4.8, 7]} /><primitive object={m.plaster} attach="material" /></mesh>
      <mesh position={[0, 4.8, 0]} castShadow><sphereGeometry args={[3.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={m.dome} attach="material" /></mesh>
      <mesh position={[3.9, 6, 3.9]} castShadow><cylinderGeometry args={[0.45, 0.6, 12, 12]} /><primitive object={m.stone} attach="material" /></mesh>
      <mesh position={[3.9, 12.4, 3.9]} castShadow><coneGeometry args={[0.65, 2.4, 12]} /><primitive object={m.dome} attach="material" /></mesh>
      <mesh position={[0, 1.4, 3.52]}><planeGeometry args={[1.5, 2.6]} /><primitive object={m.dark} attach="material" /></mesh>
    </group></EraGroup>
    {/* şenlik alanındaki kıl çadır */}
    <mesh position={[TENT.c[0], 2, TENT.c[1]]} castShadow receiveShadow><coneGeometry args={[TENT.r + 0.6, 4, 8]} /><primitive object={m.tent} attach="material" /></mesh>
    <mesh position={[TENT.c[0], 4.2, TENT.c[1]]}><cylinderGeometry args={[0.05, 0.05, 1.6, 6]} /><primitive object={m.wood} attach="material" /></mesh>
  </group>;
}
export function Town({ m }: { m: Mats }) {
  const geo = useMemo(() => { const r = rng(33), walls: Parts = [], roofs: Parts = [];
    for (let i = 0; i < 70; i++) { const side = r(), x = side < 0.35 ? -72 - r() * 60 : side < 0.7 ? 72 + r() * 60 : -64 + r() * 128, z = side < 0.7 ? -36 + r() * 100 : 70 + r() * 40, w = 7 + r() * 5, d = 7 + r() * 5, h = 5 + r() * 4;
      const b = bx(w, h, d, 2.4); b.translate(x, h / 2, z); walls.push(b);
      const roof = new THREE.ConeGeometry(Math.max(w, d) * 0.72, 2.2, 4); roof.rotateY(Math.PI / 4); roof.translate(x, h + 1.1, z); roofs.push(roof); }
    return { walls: merge(walls), roofs: merge(roofs) }; }, []);
  return <group>
    <mesh geometry={geo.walls} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={geo.roofs} material={m.roof} castShadow />
  </group>;
}

/* ===================== arazi, ağaçlar, dağlar ===================== */
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 200 : 140, g = new THREE.PlaneGeometry(360, 260, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, 14);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#86a05a'), dry = new THREE.Color('#a9a672'), pave = new THREE.Color('#d2c9b2');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, groundY(x, z));
      c.copy(grass).lerp(dry, 0.3 + 0.3 * Math.sin(x * 0.05 + z * 0.04)); if (Math.abs(x) < 32 && z > 14 && z < 62) c.lerp(pave, 0.65); if (Math.abs(x) < 30 && z > GARDEN.z0 && z < GARDEN.z1) c.lerp(pave, 0.4);
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
export function Trees({ n }: { n: number }) {
  const geo = useMemo(() => { const r = rng(3), parts: Parts = []; const t = new THREE.CylinderGeometry(0.25, 0.4, 3, 7); t.translate(0, 1.5, 0); parts.push(t);
    for (let k = 0; k < 3; k++) { const c = new THREE.ConeGeometry(2.2 - k * 0.5, 3.2, 8); c.translate(0, 4 + k * 1.8 + r() * 0.2, 0); parts.push(c); }
    const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2f5a33', roughness: 0.95 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(15), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 10 && k < n; i++) { const x = -120 + r() * 240, z = -60 + r() * 150;
      if (x > AREA.x0 - 4 && x < AREA.x1 + 4 && z > AREA.z0 - 4 && z < AREA.z1 + 4) continue;
      o.position.set(x, groundY(x, z) - 0.1, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(1 + r() * 0.8); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    // bahçenin dış duvarı boyunca servi
    for (let x = -18; x <= 18; x += 12) { o.position.set(x, 0, GARDEN.z0 - 4); o.rotation.set(0, 0, 0); o.scale.setScalar(1.1); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n + 8]} castShadow receiveShadow />;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -64 + r() * 128, z = -34 + r() * 98;
      if ((x > GARDEN.x0 - 2 && x < GARDEN.x1 + 2 && z > GARDEN.z0 - 2 && z < GARDEN.z1 + 2) || (Math.abs(x) < 30 && z > 14 && z < 62)) continue;
      if (Math.hypot(x - HILL.c[0], z - HILL.c[1]) < 4.5) continue;
      o.position.set(x, groundY(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.22 + r() * 0.05, 0.4, 0.4 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + r() * 0.2, dd = 700 + r() * 300; out.push({ p: [Math.cos(a) * dd, -8, Math.sin(a) * dd], g: mountainGeo(360 + r() * 180, 140 + r() * 120, 290 + i, 0, '#5d7a48') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
