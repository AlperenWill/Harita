/**
 * Kyzikos Antik Kenti — 3B modeller. Bataklığa yakın ova, mermer podyum ve rampa, kırık Korinth sütunları, düşmüş kolon kütükleri, devasa
 * sütun başlığı, çukur biçiminde amfiteatr (oturma sıraları arazi rengiyle), kazı çukurları, çıpa taşı, kıstağın ardında Kapıdağ ve deniz.
 * Ölçüler, sütun sayısı ve yerleşim TEMSİLÎDİR (docs/KYZIKOS.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { AMPHI, ANCHOR, CAPITAL, COLUMNS, DRUMS, OBST_R, PODIUM, PODIUM_H, RAMP, TRENCHES } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.64, 0.58).normalize();
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];

/** Yalnızca çanak: podyum ve rampa ayrı geometri olarak çizilir */
function bowlY(x: number, z: number): number {
  const d = Math.hypot((x - AMPHI.c[0]) / AMPHI.a, (z - AMPHI.c[1]) / AMPHI.b);
  return d < 1 ? -AMPHI.depth * (1 - d * d) : 0;
}

/* ===================== malzemeler ===================== */
export interface Mats { marble: THREE.MeshStandardMaterial; stone: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const mb = stoneTex('kyzikos-mermer', ['#e8e2d2', '#ddd5c2', '#efe9da', '#d3cab5'], [10, 8], [44, 60]);
    const st = stoneTex('kyzikos-tas', ['#b3a78e', '#a39780', '#c0b49b'], [14, 10], [30, 40]);
    return {
      marble: weather(new THREE.MeshStandardMaterial({ map: mb.map, bumpMap: mb.bump, bumpScale: 0.25, roughness: 0.8 })),
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.4, roughness: 0.95 })),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2218', roughness: 1 }),
      wood: new THREE.MeshStandardMaterial({ color: '#6d4b2e', roughness: 0.85 }),
    };
  }, []);
}

/* ===================== arazi ===================== */
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 250 : 170, g = new THREE.PlaneGeometry(300, 300, N, N); g.rotateX(-Math.PI / 2); g.translate(-15, 0, 0);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#7f9a52'), marsh = new THREE.Color('#6a8a50'), dirt = new THREE.Color('#b0a278'), seatA = new THREE.Color('#d8ccb0'), seatB = new THREE.Color('#9d9378'), sand = new THREE.Color('#d9c9a0');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, bowlY(x, z));
      c.copy(grass).lerp(marsh, 0.4 + 0.4 * Math.sin(x * 0.05 + z * 0.04)); if (z > 30 && Math.abs(x) < 6) c.lerp(dirt, 0.8);
      const d = Math.hypot((x - AMPHI.c[0]) / AMPHI.a, (z - AMPHI.c[1]) / AMPHI.b);
      if (d < 0.36) c.lerp(sand, 0.9); else if (d < 1) c.lerp(Math.floor(d * 14) % 2 ? seatA : seatB, 0.85);
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.2} roughness={1} /></mesh>;
}

/* ===================== tapınak ===================== */
export function Temple({ m }: { m: Mats }) {
  const base = useMemo(() => { const p: Parts = [], w = PODIUM.x1 - PODIUM.x0, d = PODIUM.z1 - PODIUM.z0;
    const pod = bx(w, PODIUM_H + 0.8, d, 3); pod.translate((PODIUM.x0 + PODIUM.x1) / 2, (PODIUM_H - 0.8) / 2, (PODIUM.z0 + PODIUM.z1) / 2); p.push(pod);
    // rampa: yan görünümü üçgen prizma
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(RAMP.z1 - RAMP.z0, 0); s.lineTo(0, PODIUM_H); s.closePath();
    const r = new THREE.ExtrudeGeometry(s, { depth: RAMP.x1 - RAMP.x0, bevelEnabled: false }); r.rotateY(-Math.PI / 2); r.translate(RAMP.x1, 0, RAMP.z0); p.push(r);
    // sütun kaideleri: dipteros planını gösteren çift sıra daire (görsel)
    for (let i = 0; i <= 6; i++) for (const z of [-22, -19.5, -6.5, -4]) { const x = PODIUM.x0 + 4 + i * 6; if (COLUMNS.some((c) => Math.hypot(c[0] - x, c[1] - z) < 1.6)) continue; const b = new THREE.CylinderGeometry(1.1, 1.2, 0.35, 14); b.translate(x, PODIUM_H + 0.17, z); p.push(b); }
    return merge(p); }, []);
  const ruins = useMemo(() => { const p: Parts = [], r = rng(6);
    COLUMNS.forEach((c, i) => { const h = i % 3 === 2 ? 4.2 : 9, y = PODIUM_H; const sh = new THREE.CylinderGeometry(0.85, 0.98, h, 16); sh.translate(c[0], y + h / 2, c[1]); p.push(sh);
      if (h > 8) { const cap = bx(2.2, 1.2, 2.2, 1.2); cap.translate(c[0], y + h + 0.6, c[1]); p.push(cap); } });
    // iki sütunun üstündeki lento parçası
    const lint = bx(5.5, 1.3, 1.9, 2); lint.translate((COLUMNS[0][0] + COLUMNS[1][0]) / 2, PODIUM_H + 10.4, (COLUMNS[0][1] + COLUMNS[1][1]) / 2); p.push(lint);
    // düşmüş kolon kütükleri
    DRUMS.forEach((c, i) => { const d = new THREE.CylinderGeometry(OBST_R, OBST_R, 2.4 + r() * 0.8, 14); d.rotateZ(Math.PI / 2); d.rotateY(r() * 3); d.translate(c[0], PODIUM_H + OBST_R, c[1]); p.push(d); void i; });
    // devasa sütun başlığı: yerde yatan, akantus yapraklı blok
    const cx = (CAPITAL.x0 + CAPITAL.x1) / 2, cz = (CAPITAL.z0 + CAPITAL.z1) / 2, w = CAPITAL.x1 - CAPITAL.x0, dd = CAPITAL.z1 - CAPITAL.z0;
    const body = bx(w, 3.2, dd, 1.5); body.translate(cx, PODIUM_H + 1.6, cz); p.push(body);
    for (let k = 0; k < 7; k++) { const leaf = bx(0.5, 2.4, 0.5, 1); leaf.translate(CAPITAL.x0 + 0.6 + k * ((w - 1.2) / 6), PODIUM_H + 3.3, cz + (k % 2 ? 0.6 : -0.6)); p.push(leaf); }
    const abacus = bx(w + 0.6, 0.7, dd + 0.6, 1.5); abacus.translate(cx, PODIUM_H + 3.55, cz); p.push(abacus);
    return merge(p); }, []);
  return <group>
    <mesh geometry={base} material={m.marble} castShadow receiveShadow />
    <mesh geometry={ruins} material={m.marble} castShadow receiveShadow />
  </group>;
}

/* ===================== kazı çukurları, çıpa taşı ===================== */
export function Excavation({ m }: { m: Mats }) {
  const frame = useMemo(() => { const p: Parts = [];
    for (const t of TRENCHES) { const cx = (t.x0 + t.x1) / 2, cz = (t.z0 + t.z1) / 2, W = t.x1 - t.x0, D = t.z1 - t.z0;
      for (const [x, z] of [[t.x0, t.z0], [t.x1, t.z0], [t.x0, t.z1], [t.x1, t.z1]] as const) { const q = bx(0.3, 1.5, 0.3, 1); q.translate(x, 0.6, z); p.push(q); }
      for (let i = 1; i < 4; i++) { const a = bx(0.04, 0.04, D, 1); a.translate(t.x0 + (W * i) / 4, 1.2, cz); p.push(a); const b = bx(W, 0.04, 0.04, 1); b.translate(cx, 1.2, t.z0 + (D * i) / 4); p.push(b); } }
    return merge(p); }, []);
  return <group>
    {TRENCHES.map((t, i) => <mesh key={i} position={[(t.x0 + t.x1) / 2, 0.05, (t.z0 + t.z1) / 2]} receiveShadow><boxGeometry args={[t.x1 - t.x0, 0.08, t.z1 - t.z0]} /><primitive object={m.dark} attach="material" /></mesh>)}
    <mesh geometry={frame} material={m.wood} castShadow />
    <mesh position={[ANCHOR.c[0], 1.0, ANCHOR.c[1]]} rotation-z={0.3} castShadow receiveShadow><boxGeometry args={[ANCHOR.r * 2.2, 2, 1.1]} /><primitive object={m.stone} attach="material" /></mesh>
    <mesh position={[ANCHOR.c[0], 1.6, ANCHOR.c[1] + 0.6]} rotation-z={0.3}><torusGeometry args={[0.35, 0.1, 8, 14]} /><primitive object={m.dark} attach="material" /></mesh>
  </group>;
}

/* ===================== çevre ===================== */
export function Reeds({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -110 + r() * 150, z = -90 + r() * 170;
      if (x > PODIUM.x0 - 2 && x < PODIUM.x1 + 2 && z > PODIUM.z0 - 2 && z < RAMP.z1 + 2) continue; if (Math.abs(x) < 4 && z > 20) continue;
      o.position.set(x, bowlY(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.5 + r() * 0.7; o.scale.set(s, s * 1.3, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.22 + r() * 0.06, 0.4, 0.38 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Poplars({ n }: { n: number }) {
  const geo = useMemo(() => { const parts: Parts = []; const t = new THREE.CylinderGeometry(0.2, 0.3, 4, 6); t.translate(0, 2, 0); parts.push(t); const c = new THREE.SphereGeometry(1.4, 10, 8); c.scale(1, 3.4, 1); c.translate(0, 7, 0); parts.push(c); const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4c7a3a', roughness: 0.95 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(3), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n; i++) { const east = i % 3 === 0, x = east ? 42 + r() * 10 : -26 + r() * 52, z = east ? -40 + r() * 80 : 53 + r() * 14; o.position.set(x, 0, z);   /* yürünebilir alanın dışında */ o.scale.setScalar(0.9 + r() * 0.5); o.rotation.set(0, r() * 6, 0); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
export function Backdrop() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 6; i++) { const x = -420 + i * 170 + r() * 40; out.push({ p: [x, -8, -520 - r() * 120], g: mountainGeo(300 + r() * 160, 220 + r() * 160, 230 + i, 1, '#5d7048') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>
    {list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.6, -300]}><planeGeometry args={[2400, 360]} /><meshStandardMaterial color="#3a7f93" roughness={0.2} metalness={0.1} /></mesh>
  </group>;
}
