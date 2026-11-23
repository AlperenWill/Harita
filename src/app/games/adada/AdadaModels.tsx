/**
 * Adada Antik Kenti — 3B modeller. Kuzeye ve doğuya yükselen çamlı yamaç arazi (taş döşeli cadde ve agora, kademeli tiyatro çanağı renkle işlenir),
 * kırık stoa sütunları ve lentoları, Trajan Tapınağı podyumu, sütunları ve hücre duvarları, tiyatro sahne duvarı, akropol kulesi, çamlar ve dağlar.
 * Ölçüler, sütun sayıları ve yapı biçimleri TEMSİLÎDİR (docs/ADADA.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { AGORA, COLUMNS, STREET, TEMPLE, THEATRE, TOWER, groundY } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.62, 0.6).normalize();
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; marble: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('adada-kireç', ['#c9bda3', '#b9ac92', '#d4c9b0', '#a99d86'], [14, 10], [30, 40]);
    const mb = stoneTex('adada-mermer', ['#e4dccb', '#d8cfbb', '#ece5d6'], [6, 5], [60, 80]);
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.4, roughness: 0.95 })),
      marble: weather(new THREE.MeshStandardMaterial({ map: mb.map, bumpMap: mb.bump, bumpScale: 0.2, roughness: 0.8 })),
    };
  }, []);
}

/* ===================== arazi ===================== */
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 200 : 140, W = 190, g = new THREE.PlaneGeometry(W, W, N, N); g.rotateX(-Math.PI / 2); g.translate(-8, 0, -2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#8a9a58'), dry = new THREE.Color('#a8a070'), pave = new THREE.Color('#cfc4aa'), seatA = new THREE.Color('#d6cbb3'), seatB = new THREE.Color('#a89c84'), orch = new THREE.Color('#e3dac2');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, groundY(x, z));
      c.copy(grass).lerp(dry, 0.35 + 0.3 * Math.sin(x * 0.05 + z * 0.04));
      if (Math.abs(x - STREET.cx) < STREET.half && z > STREET.z0 && z < STREET.z1) c.lerp(pave, 0.85);
      if (x > AGORA.x0 && x < AGORA.x1 && z > AGORA.z0 && z < AGORA.z1) c.lerp(pave, 0.9);
      const dx = x - THEATRE.c[0], dz = z - THEATRE.c[1], r = Math.hypot(dx, dz);
      if (r < THEATRE.r0) c.lerp(orch, 0.9);
      else if (r < THEATRE.r1 && dz < 2) c.lerp(Math.floor((r - THEATRE.r0) / 0.9) % 2 ? seatA : seatB, 0.9);
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}

/* ===================== sütunlu cadde ===================== */
export function Stoas({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = [], r = rng(8);
    for (const [x, z] of COLUMNS) { const y = groundY(x, z), broken = r() < 0.28, h = broken ? 1.6 + r() * 1.6 : 4.4;
      const base = bx(1.2, 0.4, 1.2, 1); base.translate(x, y + 0.2, z); p.push(base);
      const sh = new THREE.CylinderGeometry(0.4, 0.46, h, 12); sh.translate(x, y + 0.4 + h / 2, z); p.push(sh);
      if (!broken) { const cap = bx(1.1, 0.4, 1.1, 1); cap.translate(x, y + 0.4 + h + 0.2, z); p.push(cap); } }
    // lentolar: sağlam sütun çiftleri arasında
    for (const x of [STREET.colL, STREET.colR]) for (let i = 0; i < COLUMNS.length / 2 - 1; i += 2) { if (r() < 0.45) continue; const z0 = STREET.z0 + i * STREET.step, y = groundY(x, z0);
      const b = bx(0.9, 0.7, STREET.step * 2, 2); b.translate(x, y + 5.2, z0 + STREET.step); p.push(b); }
    return merge(p); }, []);
  return <mesh geometry={geo} material={m.marble} castShadow receiveShadow />;
}

/* ===================== Trajan Tapınağı ===================== */
export function Temple({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = [], T = TEMPLE, cx = (T.x0 + T.x1) / 2, w = T.x1 - T.x0, d = T.z1 - T.z0, top = groundY(cx, T.z1) + 1.7;
    const base = Math.min(groundY(cx, T.z0), groundY(cx, T.z1)) - 0.6;
    const pod = bx(w, top - base, d, 2); pod.translate(cx, (top + base) / 2, (T.z0 + T.z1) / 2); p.push(pod);
    // basamaklar (güney)
    for (let i = 0; i < 3; i++) { const s = bx(6, 0.55, 0.9, 1); s.translate(cx, top - 0.3 - i * 0.55, T.z1 + 0.45 + i * 0.9); p.push(s); }
    // ön sütunlar (6) ve yan sütunlar; bazıları kırık
    const r = rng(21);
    const col = (x: number, z: number, h: number) => { const sh = new THREE.CylinderGeometry(0.5, 0.58, h, 14); sh.translate(x, top + h / 2, z); p.push(sh); if (h > 5) { const cap = bx(1.3, 0.45, 1.3, 1); cap.translate(x, top + h + 0.22, z); p.push(cap); } };
    for (let i = 0; i < 6; i++) col(T.x0 + 1.1 + (i * (w - 2.2)) / 5, T.z1 - 1.3, r() < 0.3 ? 2 + r() * 1.8 : 6);
    for (let k = 1; k <= 3; k++) { col(T.x0 + 1.1, T.z1 - 1.3 - k * 2.6, r() < 0.5 ? 2.4 : 6); col(T.x1 - 1.1, T.z1 - 1.3 - k * 2.6, r() < 0.5 ? 2.4 : 6); }
    // hücre (naos) duvarları: kuzeyde kapalı, yanlarda kırık
    const wall = (x0: number, x1: number, z0: number, z1: number, h: number) => { const g = bx(x1 - x0, h, z1 - z0, 2); g.translate((x0 + x1) / 2, top + h / 2, (z0 + z1) / 2); p.push(g); };
    wall(T.x0 + 2, T.x1 - 2, T.z0 + 0.8, T.z0 + 1.8, 5.5); wall(T.x0 + 2, T.x0 + 3, T.z0 + 1.8, T.z1 - 4, 3.2); wall(T.x1 - 3, T.x1 - 2, T.z0 + 1.8, T.z1 - 4, 4.4);
    return merge(p); }, []);
  return <mesh geometry={geo} material={m.stone} castShadow receiveShadow />;
}

/* ===================== tiyatro sahne duvarı ve akropol kulesi ===================== */
export function Ruins({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = [], c = THEATRE.c;
    // sahne (proskenion) duvarı: orkestranın güneyinde kırık
    for (let i = 0; i < 5; i++) { const x = c[0] - 8 + i * 4, h = i % 2 ? 2.4 : 3.6, y = groundY(x, c[1] + 7.5), g = bx(3.2, h, 1.2, 1.5); g.translate(x, y + h / 2 - 0.2, c[1] + 7.5); p.push(g); }
    // akropol kulesi
    const ty = groundY(TOWER.c[0], TOWER.c[1]), t = new THREE.CylinderGeometry(TOWER.r, TOWER.r + 0.4, 9, 16); t.translate(TOWER.c[0], ty + 4, TOWER.c[1]); p.push(t);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, b = bx(1.2, 1, 1, 1); b.rotateY(-a); b.translate(TOWER.c[0] + Math.cos(a) * (TOWER.r - 0.2), ty + 9.5, TOWER.c[1] + Math.sin(a) * (TOWER.r - 0.2)); if (k % 3) p.push(b); }
    // kuleye çıkan basamaklı rampa (görsel)
    for (let i = 0; i < 6; i++) { const x = 14 + i * 1.6, g = bx(1.6, 0.5, 4, 1); g.translate(x, groundY(x, -6) + 0.1 + i * 0.1, -6); p.push(g); }
    return merge(p); }, []);
  return <mesh geometry={geo} material={m.stone} castShadow receiveShadow />;
}

/* ===================== çam ormanı, ot, dağlar ===================== */
export function Pines({ n }: { n: number }) {
  const geo = useMemo(() => { const r = rng(4), parts: Parts = [];
    const trunk = new THREE.CylinderGeometry(0.2, 0.35, 4, 6); trunk.translate(0, 2, 0); parts.push(trunk);
    for (let k = 0; k < 4; k++) { const c = new THREE.ConeGeometry(2.6 - k * 0.5, 3.2, 8); c.translate(0, 4.2 + k * 1.8 + r() * 0.2, 0); parts.push(c); }
    const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2f5a33', roughness: 0.95 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(15), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 10 && k < n; i++) { const x = -90 + r() * 150, z = -80 + r() * 150;
      const inside = x > -46 && x < 30 && z > -50 && z < 48; if (inside) continue;
      o.position.set(x, groundY(x, z) - 0.2, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(1 + r() * 0.8); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -42 + r() * 68, z = -46 + r() * 90;
      if (Math.abs(x - STREET.cx) < STREET.half + 1.5 && z > STREET.z0 && z < STREET.z1) continue; if (x > AGORA.x0 - 1 && x < AGORA.x1 + 1 && z > AGORA.z0 - 1 && z < AGORA.z1 + 1) continue;
      if (x > TEMPLE.x0 - 1 && x < TEMPLE.x1 + 1 && z > TEMPLE.z0 - 1 && z < TEMPLE.z1 + 5) continue; if (Math.hypot(x - THEATRE.c[0], z - THEATRE.c[1]) < THEATRE.r1) continue;
      o.position.set(x, groundY(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.2 + r() * 0.06, 0.38, 0.4 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Mountains() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + r() * 0.2, dd = 650 + r() * 350; out.push({ p: [Math.cos(a) * dd, -8, Math.sin(a) * dd], g: mountainGeo(380 + r() * 200, 190 + r() * 170, 190 + i, 2, '#52663f') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
