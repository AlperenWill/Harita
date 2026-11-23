/**
 * Selimiye Camii — 3B modeller. Kesme taş duvarlı ibadet mekânı (45 × 36 m), sekiz ayak ve aralarında kemerler, ayakların taşıdığı büyük kubbe,
 * pencere sıraları, mihrap duvarında çini panosu, halı ve avizeler; revaklı avlu, havuz; dört üç şerefeli minare; çevrede Edirne evleri ve ağaçlar.
 * Ölçüler, kemer ve kubbe ayrıntıları ve bezeme desenleri TEMSİLÎDİR (docs/SELIMIYE.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { AREA, COLUMNS, COURT, DOOR, GATE, HALL, MINARETS, MINARET_R, OCT_R, PILLARS, PILLAR_R, POOL, WALL_T } from './site';

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
const H = 20, F = 0.25;
const DOME_R = 15.75, DOME_Y = 26;

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; inner: THREE.MeshStandardMaterial; carpet: THREE.MeshStandardMaterial; tile: THREE.MeshStandardMaterial; dome: THREE.MeshStandardMaterial; glow: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; paving: THREE.MeshStandardMaterial; water: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('selimiye-kesme', ['#d9cfb6', '#cfc4a8', '#e2d9c2', '#c3b89c'], [12, 8], [34, 44]);
    const inner = canvasTex(256, 256, (g, r) => { g.fillStyle = '#efe6d0'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,100,70' : '255,250,235'},${r() * 0.06})`; g.fillRect(r() * 256, r() * 256, 5, 5); } });
    const carpet = canvasTex(256, 256, (g, r) => { g.fillStyle = '#7d2a28'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#d6b66a'; g.lineWidth = 3; for (let i = 0; i < 4; i++) g.strokeRect(8 + i * 10, 8 + i * 10, 240 - i * 20, 240 - i * 20); g.fillStyle = '#2d4a6e'; for (let y = 60; y < 200; y += 40) for (let x = 60; x < 200; x += 40) { g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x + 14, y); g.lineTo(x, y + 14); g.lineTo(x - 14, y); g.fill(); } for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.1})`; g.fillRect(r() * 256, r() * 256, 2, 2); } });
    carpet.repeat.set(6, 4);
    // çini: beyaz zeminde kobalt ve mercan kırmızısı lale/karanfil desenleri (temsilî)
    const tile = canvasTex(256, 256, (g, r) => { g.fillStyle = '#f2f0e8'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) { g.strokeStyle = '#2f5f9a'; g.lineWidth = 2; g.strokeRect(x + 2, y + 2, 60, 60); g.fillStyle = '#2f5f9a'; g.beginPath(); g.arc(x + 32, y + 32, 12, 0, 7); g.fill(); g.fillStyle = '#c4452e'; for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; g.beginPath(); g.ellipse(x + 32 + Math.cos(a) * 20, y + 32 + Math.sin(a) * 20, 8, 4, a, 0, 7); g.fill(); } g.fillStyle = r() < 0.5 ? '#3a8a7a' : '#2f5f9a'; g.beginPath(); g.arc(x + 32, y + 32, 4, 0, 7); g.fill(); } });
    tile.repeat.set(3, 2);
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.3, roughness: 0.9 })),
      inner: new THREE.MeshStandardMaterial({ map: inner, roughness: 0.95, side: THREE.DoubleSide }),
      carpet: new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 }),
      tile: new THREE.MeshStandardMaterial({ map: tile, roughness: 0.4 }),
      dome: new THREE.MeshStandardMaterial({ color: '#7f8d87', roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide }),
      glow: new THREE.MeshStandardMaterial({ color: '#f4f6f6', emissive: '#e8f0f4', emissiveIntensity: 0.9, side: THREE.DoubleSide }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 1 }),
      paving: new THREE.MeshStandardMaterial({ color: '#d4cbb4', roughness: 0.95 }),
      water: new THREE.MeshStandardMaterial({ color: '#4a7f8c', roughness: 0.12, metalness: 0.15 }),
      plaster: new THREE.MeshStandardMaterial({ color: '#ece4d0', roughness: 0.95 }),
    };
  }, []);
}

/* ===================== cami: duvarlar, ayaklar, kubbe ===================== */
export function Mosque({ m, tier }: { m: Mats; tier: Tier }) {
  const walls = useMemo(() => { const p: Parts = [], B = HALL, t = WALL_T, y = F - 0.1, h = H;
    slab(p, B.x0 - t, B.x1 + t, B.z0 - t, B.z0, h, y); slab(p, B.x0 - t, B.x0, B.z0, B.z1 + t, h, y); slab(p, B.x1, B.x1 + t, B.z0, B.z1 + t, h, y);
    slab(p, B.x0 - t, DOOR.x0, B.z1, B.z1 + t + 1.5, h, y); slab(p, DOOR.x1, B.x1 + t, B.z1, B.z1 + t + 1.5, h, y); slab(p, DOOR.x0, DOOR.x1, B.z1, B.z1 + t + 1.5, h - 8, y + 8);
    // avlu yan duvarı ve güney duvarı (alçak)
    const C = COURT, ch = 5.5;
    slab(p, B.x0 - t, B.x0, C.z0, C.z1 + t, ch, y); slab(p, B.x1, B.x1 + t, C.z0, C.z1 + t, ch, y);
    slab(p, B.x0 - t, GATE.x0, C.z1, C.z1 + t, ch, y); slab(p, GATE.x1, B.x1 + t, C.z1, C.z1 + t, ch, y); slab(p, GATE.x0, GATE.x1, C.z1, C.z1 + t, ch - 2.6, y + 2.6);
    return merge(p); }, []);
  // tavan: ortasında kubbe açıklığı olan döşeme
  const ceiling = useMemo(() => { const s = new THREE.Shape(); const B = HALL; s.moveTo(B.x0, B.z0); s.lineTo(B.x1, B.z0); s.lineTo(B.x1, B.z1); s.lineTo(B.x0, B.z1); s.closePath();
    const hole = new THREE.Path(); hole.absarc(0, 0, DOME_R, 0, Math.PI * 2, true); s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: false, curveSegments: 40 }); g.rotateX(Math.PI / 2); g.translate(0, H + F + 0.2, 0); return g; }, []);
  const pillars = useMemo(() => { const p: Parts = [];
    for (const q of PILLARS) { const c = new THREE.CylinderGeometry(PILLAR_R, PILLAR_R + 0.25, H - 1, 18); c.translate(q[0], F + (H - 1) / 2, q[1]); p.push(c); const cap = bx(PILLAR_R * 2 + 0.8, 1, PILLAR_R * 2 + 0.8, 1.5); cap.translate(q[0], F + H - 0.5, q[1]); p.push(cap); }
    // ayaklar arasında kemerler
    for (let k = 0; k < 8; k++) { const a = (k + 1) * Math.PI / 4, rm = OCT_R * Math.cos(Math.PI / 8), cx = Math.cos(a) * rm, cz = Math.sin(a) * rm, side = 2 * OCT_R * Math.sin(Math.PI / 8) / 2 - PILLAR_R;
      const t = new THREE.TorusGeometry(side, 0.65, 8, 24, Math.PI); t.rotateY(-a + Math.PI / 2); t.translate(cx, F + H - 1.5, cz); p.push(t); }
    return merge(p); }, []);
  const windows = useMemo(() => { const p: Parts = [], B = HALL;
    const add = (x: number, y: number, z: number, ry: number, w: number, h: number) => { const g = new THREE.PlaneGeometry(w, h); g.rotateY(ry); g.translate(x, y, z); p.push(g); };
    for (let i = 0; i < 6; i++) { const x = B.x0 + 4 + i * ((B.x1 - B.x0 - 8) / 5); add(x, F + 6, B.z0 + 0.02, 0, 1.6, 4.2); add(x, F + 13, B.z0 + 0.02, 0, 1.6, 3.4); }
    for (let k = 0; k < 4; k++) { const z = B.z0 + 5 + k * 8; for (const s of [-1, 1]) { add(s * (B.x1 - 0.02), F + 6, z, -s * Math.PI / 2, 1.6, 4.2); add(s * (B.x1 - 0.02), F + 13, z, -s * Math.PI / 2, 1.6, 3.4); } }
    for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2; const g = new THREE.PlaneGeometry(1.3, 3.2); g.rotateY(-a + Math.PI / 2); g.translate(Math.cos(a) * (DOME_R - 0.7), DOME_Y + 1.2, Math.sin(a) * (DOME_R - 0.7)); p.push(g); }
    return merge(p); }, []);
  const drum = useMemo(() => { const g = new THREE.CylinderGeometry(DOME_R, DOME_R, DOME_Y - H - F + 1, 40, 1, true); g.translate(0, (DOME_Y + H + F) / 2, 0); return g; }, []);
  const mihrab = useMemo(() => { const p: Parts = []; slab(p, -2.4, 2.4, HALL.z0 + 0.02, HALL.z0 + 0.6, 8, F, 1); return merge(p); }, []);
  const minber = useMemo(() => { const p: Parts = []; for (let i = 0; i < 9; i++) slab(p, 7.5, 9.3, HALL.z0 + 1.2 + i * 0.8, HALL.z0 + 2 + i * 0.8, 0.6 + i * 0.45, F, 1); slab(p, 7.4, 9.4, HALL.z0 + 8.4, HALL.z0 + 10, 0.9, F, 1); return merge(p); }, []);
  return <group>
    <mesh geometry={walls} material={m.stone} castShadow receiveShadow />
    <mesh geometry={ceiling} material={m.inner} castShadow receiveShadow />
    <mesh geometry={pillars} material={m.stone} castShadow receiveShadow />
    <mesh geometry={drum} material={m.inner} castShadow />
    <mesh position={[0, DOME_Y, 0]} castShadow><sphereGeometry args={[DOME_R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={m.dome} attach="material" /></mesh>
    <mesh position={[0, DOME_Y, 0]}><sphereGeometry args={[DOME_R - 0.4, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={m.inner} attach="material" /></mesh>
    <mesh position={[0, DOME_Y + DOME_R + 1, 0]}><sphereGeometry args={[0.9, 12, 10]} /><primitive object={m.dome} attach="material" /></mesh>
    <mesh geometry={windows}><primitive object={m.glow} attach="material" /></mesh>
    {/* halı, mihrap, minber, çini panosu */}
    <mesh rotation-x={-Math.PI / 2} position={[0, F + 0.02, 0]} receiveShadow><planeGeometry args={[HALL.x1 - HALL.x0 - 2, HALL.z1 - HALL.z0 - 2]} /><primitive object={m.carpet} attach="material" /></mesh>
    <mesh geometry={mihrab} material={m.stone} />
    <mesh position={[0, F + 3.2, HALL.z0 + 0.62]}><planeGeometry args={[3.4, 5.2]} /><primitive object={m.dark} attach="material" /></mesh>
    <mesh position={[-8, F + 5, HALL.z0 + 0.04]}><planeGeometry args={[6, 8]} /><primitive object={m.tile} attach="material" /></mesh>
    <mesh position={[8, F + 5, HALL.z0 + 0.04]}><planeGeometry args={[6, 8]} /><primitive object={m.tile} attach="material" /></mesh>
    <mesh geometry={minber} material={m.stone} castShadow receiveShadow />
    {/* avizeler */}
    {(tier === 'low' ? [[0, 0]] : [[0, 0], [-9, -8], [9, -8], [-9, 8], [9, 8]]).map(([x, z], i) => <group key={i} position={[x, F + 12.5, z]}><mesh><torusGeometry args={[1.4, 0.08, 8, 24]} /><meshStandardMaterial color="#d6b66a" emissive="#ffd88a" emissiveIntensity={0.6} /></mesh><pointLight color="#ffe3b5" intensity={tier === 'low' ? 140 : 160} distance={26} decay={2} /></group>)}
  </group>;
}

/* ===================== avlu ===================== */
export function Court({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = [], C = COURT;
    for (const q of COLUMNS) { const c = new THREE.CylinderGeometry(0.4, 0.45, 4.2, 12); c.translate(q[0], F + 2.1, q[1]); p.push(c); const cap = bx(1, 0.35, 1, 1); cap.translate(q[0], F + 4.4, q[1]); p.push(cap); }
    for (const x of [-19.5, 19.5]) { const b = bx(1.2, 0.6, C.z1 - C.z0 - 1, 3); b.translate(x, F + 4.8, (C.z0 + C.z1) / 2); p.push(b); }
    return merge(p); }, []);
  const roof = useMemo(() => { const p: Parts = [], C = COURT; for (const x of [-21, 21]) { const g = bx(3.4, 0.5, C.z1 - C.z0 - 1, 3); g.translate(x, F + 5.2, (C.z0 + C.z1) / 2); p.push(g); } return merge(p); }, []);
  return <group>
    <mesh geometry={geo} material={m.stone} castShadow receiveShadow />
    <mesh geometry={roof} material={m.stone} castShadow receiveShadow />
    <mesh rotation-x={-Math.PI / 2} position={[0, F + 0.02, (COURT.z0 + COURT.z1) / 2]} receiveShadow><planeGeometry args={[COURT.x1 - COURT.x0, COURT.z1 - COURT.z0]} /><primitive object={m.paving} attach="material" /></mesh>
    <mesh position={[POOL.c[0], F + 0.08, POOL.c[1]]} rotation-x={-Math.PI / 2}><circleGeometry args={[POOL.r, 28]} /><primitive object={m.water} attach="material" /></mesh>
    <mesh position={[POOL.c[0], F + 0.45, POOL.c[1]]} rotation-x={-Math.PI / 2} castShadow receiveShadow><ringGeometry args={[POOL.r, POOL.r + 0.7, 28]} /><primitive object={m.stone} attach="material" /></mesh>
    <mesh position={[POOL.c[0], F + 2.2, POOL.c[1]]} castShadow><cylinderGeometry args={[0.3, 0.5, 4, 10]} /><primitive object={m.stone} attach="material" /></mesh>
    <mesh position={[POOL.c[0], F + 4.6, POOL.c[1]]} castShadow><sphereGeometry args={[2.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={m.dome} attach="material" /></mesh>
  </group>;
}

/* ===================== minareler ===================== */
export function Minarets({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = [], Ht = 71;
    for (const q of MINARETS) {
      const body = new THREE.CylinderGeometry(MINARET_R * 0.62, MINARET_R, Ht, 22); body.translate(q[0], Ht / 2, q[1]); p.push(body);
      for (const y of [34, 50, 62]) { const b = new THREE.CylinderGeometry(MINARET_R * 1.45, MINARET_R * 1.1, 0.9, 22); b.translate(q[0], y, q[1]); p.push(b);
        const rail = new THREE.CylinderGeometry(MINARET_R * 1.45, MINARET_R * 1.45, 1.1, 22, 1, true); rail.translate(q[0], y + 1, q[1]); p.push(rail); }
      const cone = new THREE.ConeGeometry(MINARET_R * 0.8, 7, 20); cone.translate(q[0], Ht + 3.5, q[1]); p.push(cone); }
    return merge(p); }, []);
  return <mesh geometry={geo} material={m.stone} castShadow receiveShadow />;
}

/* ===================== meydan, şehir, çevre ===================== */
export function Ground({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(420, 320, tier === 'high' ? 40 : 20, tier === 'high' ? 40 : 20); g.rotateX(-Math.PI / 2); g.translate(0, 0, 30);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#86a05a'), pave = new THREE.Color('#cfc6b0');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); c.copy(grass).lerp(pave, Math.abs(x) < 44 && z > -28 && z < 86 ? 0.8 : 0); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} position={[0, -0.12, 0]} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.15} roughness={1} /></mesh>;
}
export function City({ m }: { m: Mats }) {
  const geo = useMemo(() => { const r = rng(33), walls: Parts = [], roofs: Parts = [];
    for (let i = 0; i < 110; i++) { const side = r(), x = side < 0.3 ? -78 - r() * 70 : side < 0.6 ? 78 + r() * 70 : -72 + r() * 144, z = side < 0.6 ? -40 + r() * 140 : 96 + r() * 50, w = 7 + r() * 6, d = 7 + r() * 5, h = 5 + r() * 5;
      const b = bx(w, h, d, 2.4); b.translate(x, h / 2, z); walls.push(b);
      const roof = new THREE.ConeGeometry(Math.max(w, d) * 0.72, 2.4, 4); roof.rotateY(Math.PI / 4); roof.translate(x, h + 1.2, z); roofs.push(roof); }
    return { walls: merge(walls), roofs: merge(roofs) }; }, []);
  return <group>
    <mesh geometry={geo.walls} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={geo.roofs} material={m.dark} castShadow />
  </group>;
}
export function Trees({ n }: { n: number }) {
  const geo = useMemo(() => { const parts: Parts = []; const t = new THREE.CylinderGeometry(0.3, 0.45, 3.6, 7); t.translate(0, 1.8, 0); parts.push(t); for (let k = 0; k < 3; k++) { const c = new THREE.ConeGeometry(2.4 - k * 0.5, 3.4, 8); c.translate(0, 4.2 + k * 1.9, 0); parts.push(c); } const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#33603a', roughness: 0.95 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(15), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 10 && k < n; i++) { const x = -130 + r() * 260, z = -50 + r() * 190; if (x > AREA.x0 - 4 && x < AREA.x1 + 4 && z > AREA.z0 - 4 && z < AREA.z1 + 4) continue;
      o.position.set(x, 0, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(1 + r() * 0.7); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -70 + r() * 140, z = -36 + r() * 126; if (Math.abs(x) < 46 && z > -28 && z < 86) continue;
      o.position.set(x, -0.1, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.22 + r() * 0.05, 0.4, 0.4 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + r() * 0.2, dd = 800 + r() * 300; out.push({ p: [Math.cos(a) * dd, -8, Math.sin(a) * dd], g: mountainGeo(340 + r() * 160, 110 + r() * 90, 310 + i, 0, '#6a8250') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
