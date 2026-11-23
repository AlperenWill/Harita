/**
 * Kyzikos Antik Kenti — 3B modeller. Bataklığa yakın ova, mermer podyum ve rampa, kırık Korinth sütunları, düşmüş kolon kütükleri, devasa
 * sütun başlığı, çukur biçiminde amfiteatr (oturma sıraları arazi rengiyle), kazı çukurları, çıpa taşı, kıstağın ardında Kapıdağ ve deniz.
 * Ölçüler, sütun sayısı ve yerleşim TEMSİLÎDİR (docs/KYZIKOS.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { AMPHI, ANCHOR, AREA, CAPITAL, COLUMNS, DRUMS, OBST_R, PIERS, PIER_R, PODIUM, PODIUM_H, RAMP, TRENCHES } from './site';

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

/* ===================== mimari parçalar ===================== */
/** Yivli sütun gövdesi: 24 yiv, yarıçap yiv boyunca hafifçe içe çekilir */
function fluted(rTop: number, rBot: number, h: number, flutes: number) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, flutes * 2, 1); const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z); if (rr < 1e-4) continue; const a = Math.atan2(z, x), k = 1 - 0.045 * (0.5 + 0.5 * Math.cos(a * flutes)); p.setX(i, x * k); p.setZ(i, z * k); }
  g.computeVertexNormals(); return g;
}
/** Attik kaide: kare plint + iki torus */
function atticBase(x: number, y: number, z: number, r: number) {
  const parts: Parts = []; const pl = bx(r * 2.5, 0.22, r * 2.5, 1); pl.translate(x, y + 0.11, z); parts.push(pl);
  const t1 = new THREE.TorusGeometry(r * 1.08, 0.12, 6, 20); t1.rotateX(Math.PI / 2); t1.translate(x, y + 0.32, z); parts.push(t1);
  const t2 = new THREE.TorusGeometry(r * 1.0, 0.09, 6, 20); t2.rotateX(Math.PI / 2); t2.translate(x, y + 0.48, z); parts.push(t2);
  return merge(parts);
}
/** Korint başlığı: çan, iki sıra akantus yaprağı, köşelerde volüt ve içbükey abaküs (temsilî) */
function corinthian(x: number, y: number, z: number, r: number, s: number): Parts {
  const p: Parts = [], h = 1.2 * s;
  const bell = new THREE.CylinderGeometry(r * 1.18, r, h, 20); bell.translate(x, y + h / 2, z); p.push(bell);
  for (const [row, n, lh, off] of [[0, 8, 0.55, 0], [1, 8, 0.8, Math.PI / 8]] as const) for (let k = 0; k < n; k++) { const a = off + (k / n) * Math.PI * 2;
    const leaf = new THREE.SphereGeometry(0.26 * s, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.62); leaf.scale(0.28, lh * 2.3, 0.95); leaf.translate(0, -0.1 * s, 0); leaf.rotateZ(-0.38); leaf.rotateY(-a); leaf.translate(x + Math.cos(a) * r * (1.02 + row * 0.08), y + h * (0.24 + row * 0.3), z + Math.sin(a) * r * (1.02 + row * 0.08)); p.push(leaf); }
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, v = new THREE.TorusGeometry(0.12 * s, 0.045 * s, 5, 10); v.rotateY(-a + Math.PI / 2); v.translate(x + Math.cos(a) * r * 1.22, y + h * 0.86, z + Math.sin(a) * r * 1.22); p.push(v); }
  const ab = bx(r * 2.7, 0.24 * s, r * 2.7, 1.5); ab.translate(x, y + h + 0.12 * s, z); p.push(ab);
  return p;
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
  const ruins = useMemo(() => { const p: Parts = [], r = rng(6), y = PODIUM_H;
    COLUMNS.forEach((c, i) => { const h = i % 3 === 2 ? 4.2 : 9 + (i % 2) * 1.4; p.push(atticBase(c[0], y, c[1], 0.98));
      const sh = fluted(0.85, 0.98, h - 0.5, 24); sh.translate(c[0], y + 0.5 + (h - 0.5) / 2, c[1]); p.push(sh);
      if (h > 8) p.push(...corinthian(c[0], y + h, c[1], 0.85, 1));
      else { const top = new THREE.CylinderGeometry(0.7, 0.85, 0.5, 9); top.rotateZ(0.12); top.translate(c[0], y + h + 0.1, c[1]); p.push(top); } });
    // iki sütunun üstündeki arşitrav parçası (üç bantlı)
    const lx = (COLUMNS[0][0] + COLUMNS[1][0]) / 2, lz = (COLUMNS[0][1] + COLUMNS[1][1]) / 2, ly = PODIUM_H + 9 + 2.4;
    for (const [hh, ww, yy] of [[0.45, 1.7, 0], [0.45, 1.8, 0.45], [0.5, 1.9, 0.9], [0.4, 2.2, 1.4]]) { const q = bx(ww, hh, 6.2, 2); q.translate(lx, ly + yy + hh / 2, lz); p.push(q); }
    // düşmüş kolon kütükleri (yivli)
    DRUMS.forEach((c) => { const d = fluted(OBST_R, OBST_R, 2.4 + r() * 0.8, 24); d.rotateZ(Math.PI / 2); d.rotateY(r() * 3); d.translate(c[0], PODIUM_H + OBST_R, c[1]); p.push(d); });
    // devasa Korint başlığı: dik duran, iki sıra akantus yapraklı çan ve köşelerde volütler
    const cx = (CAPITAL.x0 + CAPITAL.x1) / 2, cz = (CAPITAL.z0 + CAPITAL.z1) / 2;
    p.push(...corinthian(cx, y - 0.05, cz, 1.45, 2.1));
    // podyum kenarında devrik silme ve arşitrav blokları
    for (let k = 0; k < 14; k++) { const x = PODIUM.x0 + 1.2 + r() * (PODIUM.x1 - PODIUM.x0 - 2.4), z = r() < 0.5 ? PODIUM.z0 + 0.9 : -1 + r() * 1.5; if (Math.abs(x) < 7 && z > -2) continue;
      const q = bx(1.4 + r() * 1.6, 0.5 + r() * 0.5, 0.8 + r() * 0.6, 1.5); q.rotateY(r() * 0.6 - 0.3); q.translate(x, PODIUM_H + 0.4, z); p.push(q); }
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

/* ===================== amfiteatr: çanağın kenarında kemerli taşıyıcı ayak kalıntıları ===================== */
export function AmphiRuins({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = [], r = rng(21), hs: number[] = [];
    PIERS.forEach((c) => { const h = 4 + r() * 5; hs.push(h); const a = Math.atan2((c[1] - AMPHI.c[1]) / AMPHI.b, (c[0] - AMPHI.c[0]) / AMPHI.a);
      const q = bx(PIER_R * 1.6, h, PIER_R * 2, 2); q.rotateY(-a); q.translate(c[0], h / 2 - 0.2, c[1]); p.push(q);
      // kırık kemer başlangıcı: ayağın üstünden yana uzanan yay parçası
      const t = new THREE.TorusGeometry(2.6, 0.55, 6, 12, Math.PI * (0.35 + r() * 0.2)); t.rotateY(-a + Math.PI / 2); t.translate(c[0], h - 2.4, c[1]); p.push(t); });
    // iki komşu ayak yakınsa aralarında tam kemer (ayakta kalan bir göz)
    for (let i = 0; i + 1 < PIERS.length; i++) { const A = PIERS[i], B = PIERS[i + 1], d = Math.hypot(B[0] - A[0], B[1] - A[1]); if (d > 7.5) continue;
      const hh = Math.min(hs[i], hs[i + 1]) - 1, t = new THREE.TorusGeometry(d / 2 - PIER_R * 0.6, 0.7, 6, 16, Math.PI); t.rotateY(-Math.atan2(B[1] - A[1], B[0] - A[0])); t.translate((A[0] + B[0]) / 2, hh - (d / 2 - PIER_R * 0.6), (A[1] + B[1]) / 2); p.push(t); }
    return merge(p); }, []);
  return <mesh geometry={geo} material={m.stone} castShadow receiveShadow />;
}

/* ===================== zeytinlikler (yürünebilir alanın dışında, sıra sıra) ===================== */
export function Olives({ n }: { n: number }) {
  const geo = useMemo(() => { const parts: Parts = []; const t = new THREE.CylinderGeometry(0.22, 0.4, 1.8, 6); t.rotateZ(0.15); t.translate(0, 0.9, 0); parts.push(t);
    for (const [x, y, z, rr] of [[0, 2.4, 0, 1.5], [0.9, 2.1, 0.4, 1.1], [-0.8, 2.2, -0.5, 1.2], [0.2, 3.0, 0.2, 1.0]]) { const c = new THREE.IcosahedronGeometry(rr, 1); c.scale(1, 0.75, 1); c.translate(x, y, z); parts.push(c); }
    const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7c8c5a', roughness: 0.95, flatShading: true }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(77), o = new THREE.Object3D(); let k = 0;
    const out = (x: number, z: number) => x < AREA.x0 - 4 || x > AREA.x1 + 4 || z < AREA.z0 - 4 || z > AREA.z1 + 4;
    for (let x = -120; x <= 110 && k < n; x += 6) for (let z = -110; z <= 120 && k < n; z += 6) { const jx = x + (r() - 0.5) * 2, jz = z + (r() - 0.5) * 2;
      if (!out(jx, jz) || (Math.abs(jx) < 8 && jz > 50) || r() < 0.35) continue;
      o.position.set(jx, -0.05, jz); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.8 + r() * 0.5); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}

/* ===================== zaman merceği: tapınağın ve amfiteatrın eski hâli (yarı saydam, temsilî) ===================== */
/** Dipteros: çift sıra Korint sütunu, kapalı naos, alınlıklı çatı; amfiteatr: dış kemerli cephe ve oturma basamakları. Ölçüler TEMSİLÎDİR. */
export function Reconstruction({ amount }: { amount: { v: number } }) {
  const geo = useMemo(() => { const p: Parts = [], y = PODIUM_H, H = 14;
    const nx = 8, nz = 6, x0 = PODIUM.x0 + 2, x1 = PODIUM.x1 - 2, z0 = PODIUM.z0 + 2, z1 = PODIUM.z1 - 2;
    const ring = (ax0: number, ax1: number, az0: number, az1: number, cx: number, cz: number) => { for (let i = 0; i < cx; i++) for (let j = 0; j < cz; j++) { if (i > 0 && i < cx - 1 && j > 0 && j < cz - 1) continue;
      const x = ax0 + (i * (ax1 - ax0)) / (cx - 1), z = az0 + (j * (az1 - az0)) / (cz - 1); const c = fluted(0.8, 0.92, H - 1.4, 12); c.translate(x, y + (H - 1.4) / 2, z); p.push(c); p.push(...corinthian(x, y + H - 1.4, z, 0.8, 1)); } };
    ring(x0, x1, z0, z1, nx, nz); ring(x0 + 3.4, x1 - 3.4, z0 + 3.4, z1 - 3.4, nx - 2, nz - 2);
    const naos = bx(x1 - x0 - 15, H - 0.4, z1 - z0 - 12, 3); naos.translate((x0 + x1) / 2, y + (H - 0.4) / 2, (z0 + z1) / 2 - 1); p.push(naos);
    const ent = bx(x1 - x0 + 2.4, 2.4, z1 - z0 + 2.4, 3); ent.translate((x0 + x1) / 2, y + H + 1.2, (z0 + z1) / 2); p.push(ent);
    const tri = new THREE.Shape(); const hw = (x1 - x0) / 2 + 1.2; tri.moveTo(-hw, 0); tri.lineTo(hw, 0); tri.lineTo(0, 4.6); tri.closePath();
    const roof = new THREE.ExtrudeGeometry(tri, { depth: z1 - z0 + 2.4, bevelEnabled: false }); roof.translate((x0 + x1) / 2, y + H + 2.4, z0 - 1.2); p.push(roof);
    const temple = merge(p);
    // amfiteatr: dış elips cephe (açık silindir, elipse ölçeklenir) ve basamaklı oturma kuşağı
    const q: Parts = []; const wall = new THREE.CylinderGeometry(1, 1, 12, 48, 1, true); wall.scale(AMPHI.a * 1.16, 1, AMPHI.b * 1.16); wall.translate(AMPHI.c[0], 5.8, AMPHI.c[1]); q.push(wall);
    for (let k = 0; k < 6; k++) { const f = 0.42 + k * 0.12, hh = 1.6 + k * 1.8; const st = new THREE.CylinderGeometry(1.06, 1, 1.4, 48, 1, true); st.scale(AMPHI.a * f, 1, AMPHI.b * f); st.translate(AMPHI.c[0], hh - 1.6, AMPHI.c[1]); q.push(st);
      const top = new THREE.RingGeometry(f, f + 0.12, 48, 1); top.rotateX(-Math.PI / 2); top.scale(AMPHI.a, 1, AMPHI.b); top.translate(AMPHI.c[0], hh - 0.9, AMPHI.c[1]); q.push(top); }
    return { temple, amphi: merge(q) }; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f3e7cf', emissive: '#c9a46a', emissiveIntensity: 0.25, roughness: 0.6, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), []);
  const grp = useRef<THREE.Group>(null);
  useFrame(() => { mat.opacity = amount.v * 0.45; if (grp.current) grp.current.visible = amount.v > 0.01; });
  return <group ref={grp} userData={{ noCast: true }} visible={false}>
    <mesh geometry={geo.temple} material={mat} renderOrder={5} />
    <mesh geometry={geo.amphi} material={mat} renderOrder={5} />
  </group>;
}
