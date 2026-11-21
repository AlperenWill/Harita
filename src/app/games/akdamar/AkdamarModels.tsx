/**
 * Akdamar — 3B modeller (temsilî, ölçekli değil).
 * Pembemsi-kırmızı volkanik tüften haç planlı kilise: beşik çatılar, saçak silmeleri, üçgen nişler, dar kemerli pencereler,
 * kör kemerli on altı kenarlı kasnak ve taş külah; çevrede haçkarlar. Göl: dalga normal haritalı, gökyüzünü yansıtan su;
 * kayalık kıyılı ada, bozkır otu, çiçekli badem ağaçları; ahşap iskele ve tekne; çevrede karlı dağlar.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { ARM_W, CHURCH_R, ISLAND, PIER, RELIEFS, islandHeight, reliefPos, type Relief, type Scene } from './site';
import { rng, type Tier } from '../shared/walkKit';
import { archGeo, bx, groundTex, mountainGeo, stoneTex, useGrassCards, vNicheGeo, weather } from '../shared/scenery';

export const BASE = ISLAND.h - 1.2;
export const SUN_DIR = new THREE.Vector3(-0.5, 0.62, 0.6).normalize();

export interface Mats { tuff: THREE.Material; tuffDark: THREE.Material; roof: THREE.Material; trim: THREE.Material; hole: THREE.Material; rock: THREE.Material; wood: THREE.Material }
export function useMats(): Mats {
  return useMemo(() => {
    const mk = (key: string, pal: string[], courses?: [number, number], bw?: [number, number]) => { const t = stoneTex(key, pal, courses, bw); return weather(new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 0.3, roughness: 0.9 })); };
    return {
      tuff: mk('ak-tuff', ['#b87a64', '#c4866e', '#ad705b', '#bd8069', '#a96a56'], [34, 18], [70, 70]), tuffDark: mk('ak-tuffd', ['#94594a', '#8a5243', '#9e604f']),
      roof: mk('ak-roof', ['#8c5546', '#96604f', '#7f4c3f'], [20, 8], [36, 24]), trim: weather(new THREE.MeshStandardMaterial({ color: '#d3a088', roughness: 0.85 })),
      hole: new THREE.MeshStandardMaterial({ color: '#1e120d', roughness: 1, side: THREE.DoubleSide }), rock: new THREE.MeshStandardMaterial({ color: '#7d6c5c', roughness: 1, flatShading: true }),
      wood: new THREE.MeshStandardMaterial({ color: '#6b4a30', roughness: 0.8 }),
    };
  }, []);
}

/* ---------- göl ---------- */
export function Lake() {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const normal = useMemo(() => { const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d')!, img = g.createImageData(N, N), r = rng(4);
    const waves = Array.from({ length: 10 }, () => [r() * 6.28, 2 + Math.floor(r() * 6), 2 + Math.floor(r() * 6), 0.4 + r()]);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let dx = 0, dy = 0; for (const [ph, kx, ky, a] of waves) { const t = ((x * kx + y * ky) / N) * Math.PI * 2 + ph, d = Math.cos(t) * a; dx += d * kx; dy += d * ky; } const i = (y * N + x) * 4; img.data[i] = 128 + dx * 4; img.data[i + 1] = 128 + dy * 4; img.data[i + 2] = 255; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(260, 260); return t; }, []);
  useFrame((st) => { const n = mat.current?.normalMap; if (n) n.offset.set(st.clock.elapsedTime * 0.006, st.clock.elapsedTime * 0.004); });
  return <mesh rotation-x={-Math.PI / 2} userData={{ noCast: true }}><planeGeometry args={[9000, 9000]} /><meshStandardMaterial ref={mat} color="#1f6f8f" roughness={0.12} metalness={0.05} normalMap={normal} normalScale={new THREE.Vector2(0.35, 0.35)} envMapIntensity={1.4} /></mesh>;
}
/** Göl çevresindeki dağlar (Süphan gibi karlı doruklar; temsilî) ve Gevaş kıyısı */
export function Shore() {
  const list = useMemo(() => { const r = rng(12); return Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2 + r() * 0.2, d = 2300 + r() * 1200; return { x: Math.sin(a) * d, z: -Math.cos(a) * d, R: 700 + r() * 600, H: 280 + r() * 520, seed: i + 3, snow: 0.55 + r() * 0.3 }; }); }, []);
  const geos = useMemo(() => list.map((h) => mountainGeo(h.R, h.H, h.seed, h.snow, '#a29276')), [list]);
  const shore = useMemo(() => mountainGeo(900, 70, 7, 2, '#a99a74'), []);
  return (<group userData={{ noCast: true }}>
    {list.map((h, i) => <mesh key={i} geometry={geos[i]} position={[h.x, -10, h.z]}><meshStandardMaterial vertexColors roughness={0.95} /></mesh>)}
    <mesh geometry={shore} position={[-40, -40, 1250]} scale={[2.4, 1, 0.9]}><meshStandardMaterial vertexColors roughness={1} /></mesh>
    <group position={[-40, 0, 590]}><mesh geometry={bx(6, 0.5, 40)} material={undefined} position={[0, 1.3, 0]}><meshStandardMaterial color="#7a6550" roughness={0.9} /></mesh></group>
  </group>);
}

/* ---------- ada ---------- */
export function Island({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'low' ? 80 : 140, g = new THREE.PlaneGeometry(220, 220, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), rock = new THREE.Color('#857160'), rock2 = new THREE.Color('#6d5c4e'), grass = new THREE.Color('#a3a066'), dry = new THREE.Color('#bba977'), r = rng(8);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = islandHeight(x, z); p.setY(i, y);
      c.copy(grass).lerp(dry, (Math.sin(x * 0.09) * Math.cos(z * 0.07) + 1) * 0.3); if (y < 3) c.lerp(Math.sin(y * 2 + x * 0.3) > 0 ? rock : rock2, Math.min(1, (3 - y) / 3)); if (Math.hypot(x, z) < 21) c.lerp(dry, 0.5); c.lerp(rock, r() * 0.08);
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
/** Kıyı kayaları: adanın çevresinde, su çizgisinde */
export function ShoreRocks({ m, n }: { m: Mats; n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(21), o = new THREE.Object3D(); let k = 0; for (let i = 0; i < n * 4 && k < n; i++) { const a = r() * Math.PI * 2, d = ISLAND.r * (0.8 + r() * 0.25), x = Math.sin(a) * d, z = -Math.cos(a) * d / 1.2; if (Math.hypot(x - PIER[0], z - PIER[1] + 14) < 10) continue; o.position.set(x, islandHeight(x, z) * 0.5 - 0.6, z); o.rotation.set(r() * 3, r() * 3, r() * 3); const s = 1.2 + r() * 3.2; o.scale.set(s, s * (0.5 + r() * 0.5), s * (0.7 + r() * 0.5)); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); } if (ref.current) { ref.current.count = k; ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[undefined, m.rock, n]}><dodecahedronGeometry args={[1, 1]} /></instancedMesh>;
}
/** Ada otu (kilise düzlüğü ve iskele yolu hariç) */
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null), { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(33), o = new THREE.Object3D(), col = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 4 && k < n; i++) { const x = (r() - 0.5) * 140, z = (r() - 0.5) * 120, y = islandHeight(x, z), d = Math.hypot(x, z); if (y < 1.5 || d < 13) continue; if (Math.abs(x - PIER[0]) < 3 && z > 15) continue;
      o.position.set(x, y - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.6 + r() * 0.8; o.scale.set(s, s * (0.8 + r() * 0.5), s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); col.setHSL(0.13 + r() * 0.06, 0.3 + r() * 0.15, 0.58 + r() * 0.2); ref.current?.setColorAt(k, col); k++; }
    if (ref.current) { ref.current.count = k; ref.current.instanceMatrix.needsUpdate = true; if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true; ref.current.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} userData={{ noCast: true }} />;
}
/** Badem ağaçları: eğri gövde + üç çiçek kümesi (ada baharda badem çiçekleriyle bilinir) */
export function AlmondTrees({ n }: { n: number }) {
  const bloom = useRef<THREE.InstancedMesh>(null), trunk = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(29), o = new THREE.Object3D(), col = new THREE.Color(); let k = 0, b = 0;
    for (let i = 0; i < n * 6 && k < n; i++) { const a = r() * Math.PI * 2, d = 25 + r() * 34, x = Math.sin(a) * d, z = -Math.cos(a) * d * 0.85, y = islandHeight(x, z); if (y < 2) continue; if (Math.abs(x - PIER[0]) < 7 && z > 25) continue;
      const s = 0.8 + r() * 0.6, lean = (r() - 0.5) * 0.3; o.position.set(x, y + 1.3 * s, z); o.rotation.set(lean, r() * 3, lean); o.scale.set(s, s, s); o.updateMatrix(); trunk.current?.setMatrixAt(k++, o.matrix);
      for (let c = 0; c < 3; c++) { o.position.set(x + (r() - 0.5) * 2.4 * s, y + (2.6 + r() * 1.2) * s, z + (r() - 0.5) * 2.4 * s); o.rotation.set(r() * 3, r() * 3, 0); o.scale.setScalar((0.9 + r() * 0.6) * s); o.updateMatrix(); bloom.current?.setMatrixAt(b, o.matrix); bloom.current?.setColorAt(b, col.setHSL(0.95, 0.35 + r() * 0.25, 0.86 + r() * 0.08)); b++; } }
    for (const [m, cnt] of [[trunk.current, k], [bloom.current, b]] as const) if (m) { m.count = cnt; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); } }, [n]);
  return (<group>
    <instancedMesh ref={bloom} args={[undefined, undefined, n * 3]}><icosahedronGeometry args={[1.3, 1]} /><meshStandardMaterial roughness={0.95} flatShading /></instancedMesh>
    <instancedMesh ref={trunk} args={[undefined, undefined, n]}><cylinderGeometry args={[0.14, 0.26, 2.6, 6]} /><meshStandardMaterial color="#4e3a2e" roughness={1} /></instancedMesh>
  </group>);
}

/* ---------- kilise ---------- */
/** Kabartma çizimleri (canvas): kırmızımsı taş üstünde sade silüetler, gölgeli kenar */
function reliefTex(id: Scene, w: number, h: number) {
  const W = Math.round(256 * Math.max(1, w / h)), c = document.createElement('canvas'); c.width = W; c.height = id === 'asma' ? 64 : 256; const g = c.getContext('2d')!, Hh = c.height, r = rng(id.length * 13);
  g.fillStyle = '#ad6e58'; g.fillRect(0, 0, W, Hh); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${r() > 0.5 ? '255,220,200' : '40,15,10'},${r() * 0.12})`; g.fillRect(r() * W, r() * Hh, 2, 2); }
  g.fillStyle = '#d29a80'; g.strokeStyle = '#d29a80'; g.lineWidth = 7; g.lineCap = 'round'; g.shadowColor = 'rgba(40,10,5,.8)'; g.shadowOffsetX = 3; g.shadowOffsetY = 5; g.shadowBlur = 3;
  const man = (x: number, y: number, s: number) => { g.beginPath(); g.arc(x, y - 70 * s, 13 * s, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(x - 18 * s, y - 52 * s); g.lineTo(x + 18 * s, y - 52 * s); g.lineTo(x + 24 * s, y); g.lineTo(x - 24 * s, y); g.closePath(); g.fill(); };
  const lion = (x: number, y: number, f: number) => { g.beginPath(); g.ellipse(x, y, 34, 15, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(x + f * 34, y - 14, 16, 0, Math.PI * 2); g.fill(); [-22, -8, 10, 24].forEach((dx) => g.fillRect(x + dx, y + 6, 6, 22)); };
  if (id === 'gagik') { man(110, 230, 1.9); g.fillRect(150, 110, 44, 34); g.beginPath(); g.moveTo(146, 110); g.lineTo(172, 82); g.lineTo(198, 110); g.fill(); g.beginPath(); g.moveTo(96, 92); [-20, -10, 0, 10, 20].forEach((d, i) => g.lineTo(110 + d, i % 2 ? 84 : 70)); g.lineTo(124, 92); g.fill(); }
  if (id === 'yunus') { g.beginPath(); g.ellipse(120, 150, 92, 42, -0.15, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(205, 130); g.lineTo(245, 95); g.lineTo(240, 180); g.closePath(); g.fill(); g.fillStyle = '#ad6e58'; g.beginPath(); g.moveTo(28, 150); g.lineTo(70, 135); g.lineTo(70, 168); g.fill(); g.fillStyle = '#d29a80'; man(46, 135, 0.8); }
  if (id === 'davut') { man(70, 230, 0.95); g.beginPath(); g.moveTo(90, 140); g.lineTo(120, 110); g.stroke(); man(180, 236, 2.1); g.fillRect(212, 70, 8, 150); }
  if (id === 'adem') { g.fillRect(122, 120, 12, 120); g.beginPath(); g.arc(128, 96, 46, 0, Math.PI * 2); g.fill(); man(60, 236, 1.4); man(196, 236, 1.4); }
  if (id === 'daniel') { man(128, 236, 1.5); lion(52, 200, 1); lion(204, 200, -1); }
  if (id === 'ibrahim') { man(80, 236, 1.6); man(150, 236, 0.9); g.beginPath(); g.ellipse(205, 200, 30, 16, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(232, 186, 12, 0, Math.PI * 2); g.fill(); }
  if (id === 'hayvan') { lion(128, 110, 1); g.beginPath(); g.ellipse(128, 200, 40, 18, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(80, 190); g.lineTo(64, 170); g.stroke(); }
  if (id === 'asma') { g.lineWidth = 5; g.beginPath(); for (let x = 0; x <= W; x += 4) g.lineTo(x, 32 + Math.sin(x * 0.05) * 14); g.stroke(); for (let x = 30; x < W; x += 64) { for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + (k % 3) * 7 - 7, 40 + Math.floor(k / 3) * 8, 5, 0, Math.PI * 2); g.fill(); } g.beginPath(); g.ellipse(x + 30, 18, 10, 6, 0.5, 0, Math.PI * 2); g.fill(); } }
  g.shadowColor = 'transparent'; g.strokeStyle = 'rgba(60,25,15,.5)'; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, Hh - 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function ReliefPanel({ r, found, onClick }: { r: Relief; found: boolean; onClick: (e: ThreeEvent<MouseEvent>) => void }) {
  const tex = useMemo(() => reliefTex(r.id, r.w, r.h), [r]), { p, rotY } = reliefPos(r);
  return <mesh position={p} rotation-y={rotY} onClick={onClick} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
    <planeGeometry args={[r.w, r.h]} /><meshStandardMaterial map={tex} bumpMap={tex} bumpScale={0.6} roughness={0.85} emissive={found ? '#ffcc80' : '#000'} emissiveIntensity={found ? 0.16 : 0} polygonOffset polygonOffsetFactor={-2} /></mesh>;
}
/** Bir cephenin dekoru (yerel +z dışarı): üçgen nişler ve pencereler kabartmaların boş bıraktığı yerlere */
function FacadeDecor({ f, m }: { f: 0 | 1 | 2 | 3; m: Mats }) {
  const used = RELIEFS.filter((r) => r.facade === f && r.y < 7.5).map((r) => [r.offset - r.w / 2 - 0.3, r.offset + r.w / 2 + 0.3]);
  const free = (x: number, w: number) => used.every(([a, b]) => x + w / 2 < a || x - w / 2 > b);
  const a = (f * Math.PI) / 2, nx = Math.sin(a), nz = -Math.cos(a);
  return <group position={[nx * (CHURCH_R + 0.02), 0, nz * (CHURCH_R + 0.02)]} rotation-y={Math.atan2(nx, nz)}>
    {[-3.4, 3.4].filter((x) => free(x, 1.1)).map((x) => <mesh key={x} geometry={vNicheGeo(1.1, 4.4)} material={m.hole} position={[x, 3.6, 0.01]} />)}
    {[0].filter((x) => free(x, 1)).map((x) => <group key={x}><mesh geometry={archGeo(1.4, 3.2, false)} material={m.trim} position={[x, 3.1, 0.01]} /><mesh geometry={archGeo(0.8, 2.8, false)} material={m.hole} position={[x, 3.3, 0.02]} /></group>)}
    <mesh geometry={archGeo(0.6, 1.6, false)} material={m.hole} position={[0, 8.6, 0.01]} />
  </group>;
}
export function Church({ m, found, onPick }: { m: Mats; found: string[]; onPick: (id: Scene) => void }) {
  const L = CHURCH_R * 2, H = 9.6;
  const gableGeo = useMemo(() => { const s = new THREE.Shape(); s.moveTo(-ARM_W / 2 - 0.35, 0); s.lineTo(0, 2.4); s.lineTo(ARM_W / 2 + 0.35, 0); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: L + 0.5, bevelEnabled: false }); g.translate(0, 0, -(L + 0.5) / 2); return g; }, [L]);
  const pick = (id: Scene) => (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta < 12) onPick(id); };
  const DR = 3.4, DH = 5.2;
  return (<group position={[0, BASE, 0]}>
    <mesh geometry={bx(L + 2, 0.8, L + 2, 3)} material={m.tuffDark} position={[0, 0.1, 0]} />
    <mesh geometry={bx(ARM_W, H, L, 3)} material={m.tuff} position={[0, H / 2, 0]} />
    <mesh geometry={bx(L, H, ARM_W, 3)} material={m.tuff} position={[0, H / 2, 0]} />
    {/* köşe boşluklarında alçak dolgu: haç planın iç köşeleri */}
    {[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sz], i) => <mesh key={i} geometry={bx(2.6, H - 2.2, 2.6, 3)} material={m.tuff} position={[sx * (ARM_W / 2 + 1.3), (H - 2.2) / 2, sz * (ARM_W / 2 + 1.3)]} />)}
    {/* saçak silmeleri ve dişli bant */}
    {[0, Math.PI / 2].map((r) => <group key={r} rotation-y={r}><mesh geometry={bx(ARM_W + 0.5, 0.4, L + 0.5)} material={m.trim} position={[0, H + 0.05, 0]} />
      {Array.from({ length: 2 }, (_, s) => Array.from({ length: 14 }, (_, i) => <mesh key={`${s}-${i}`} geometry={bx(0.3, 0.3, 0.25)} material={m.trim} position={[-ARM_W / 2 + 0.4 + i * (ARM_W - 0.8) / 13, H - 0.35, (s ? 1 : -1) * (L / 2 + 0.1)]} />))}</group>)}
    {/* beşik çatılar */}
    <mesh geometry={gableGeo} material={m.roof} position={[0, H + 0.25, 0]} />
    <mesh geometry={gableGeo} material={m.roof} position={[0, H + 0.25, 0]} rotation-y={Math.PI / 2} />
    {/* kasnak: on altı kenar, kör kemerler ve dar pencereler, silme, taş külah */}
    <mesh material={m.tuff} position={[0, H + 2 + DH / 2, 0]}><cylinderGeometry args={[DR, DR, DH, 16]} /></mesh>
    {Array.from({ length: 16 }, (_, i) => (i / 16) * Math.PI * 2 + Math.PI / 16).map((a, i) => <group key={i} position={[Math.sin(a) * (DR * 0.98 + 0.03), H + 2.6, Math.cos(a) * (DR * 0.98 + 0.03)]} rotation-y={a}>
      <mesh geometry={archGeo(1, 3.6, false)} material={m.trim} />{i % 2 === 0 && <mesh geometry={archGeo(0.36, 2, false)} material={m.hole} position={[0, 0.7, 0.01]} />}</group>)}
    <mesh material={m.trim} position={[0, H + 2 + DH + 0.15, 0]}><cylinderGeometry args={[DR + 0.3, DR + 0.3, 0.35, 16]} /></mesh>
    <mesh material={m.roof} position={[0, H + 2 + DH + 0.3 + 1.7, 0]}><coneGeometry args={[DR + 0.4, 3.4, 16]} /></mesh>
    {/* doğu apsisi (yarım silindir) */}
    <group position={[CHURCH_R + 0.4, 0, 0]} rotation-y={Math.PI / 2}><mesh material={m.tuff} position={[0, H * 0.4, 0]}><cylinderGeometry args={[2.2, 2.2, H * 0.8, 14, 1, false, -Math.PI / 2, Math.PI]} /></mesh><mesh material={m.roof} position={[0, H * 0.8 + 0.6, 0]}><coneGeometry args={[2.35, 1.2, 14, 1, false, -Math.PI / 2, Math.PI]} /></mesh></group>
    {/* kuzey kapısı */}
    <group position={[0, 0.5, -CHURCH_R - 0.03]} rotation-y={Math.PI}><mesh geometry={archGeo(2.4, 3.8, false)} material={m.trim} /><mesh geometry={archGeo(1.6, 3.4, false)} material={m.hole} position={[0, 0, 0.01]} /></group>
    {([0, 1, 2, 3] as const).map((f) => <FacadeDecor key={f} f={f} m={m} />)}
    {RELIEFS.map((r) => <ReliefPanel key={r.id} r={r} found={found.includes(r.id)} onClick={pick(r.id)} />)}
  </group>);
}
/** Haçkarlar: kilisenin çevresinde haç oymalı dikili taşlar */
export function Khachkars({ m }: { m: Mats }) {
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d')!; g.fillStyle = '#a7735f'; g.fillRect(0, 0, 64, 128); g.strokeStyle = '#6e4234'; g.lineWidth = 6; g.strokeRect(6, 6, 52, 116); g.lineWidth = 7; g.beginPath(); g.moveTo(32, 20); g.lineTo(32, 100); g.moveTo(14, 46); g.lineTo(50, 46); g.stroke(); for (const [x, y] of [[32, 20], [32, 100], [14, 46], [50, 46]]) { g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fillStyle = '#6e4234'; g.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }, []);
  const list = useMemo(() => { const r = rng(61), out: { x: number; z: number; rot: number; tilt: number; h: number }[] = []; while (out.length < 9) { const a = r() * Math.PI * 2, d = 10 + r() * 1.6; if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.6 || Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.25) continue; out.push({ x: Math.sin(a) * d, z: -Math.cos(a) * d, rot: Math.atan2(Math.sin(a), -Math.cos(a)) + (r() - 0.5) * 0.4, tilt: (r() - 0.5) * 0.12, h: 1.3 + r() * 0.6 }); } return out; }, []);   // doğu apsisi ve güney yolu boş kalır
  return <group>{list.map((k, i) => <group key={i} position={[k.x, BASE - 0.1, k.z]} rotation={[k.tilt, k.rot, 0]}>
    <mesh geometry={bx(0.9, k.h, 0.22, 2)} material={m.tuffDark} position={[0, k.h / 2, 0]} />
    <mesh position={[0, k.h / 2, 0.115]}><planeGeometry args={[0.8, k.h - 0.1]} /><meshStandardMaterial map={tex} roughness={0.9} /></mesh>
    <mesh position={[0, k.h / 2, -0.115]} rotation-y={Math.PI}><planeGeometry args={[0.8, k.h - 0.1]} /><meshStandardMaterial map={tex} roughness={0.9} /></mesh>
  </group>)}</group>;
}

/* ---------- iskele ve tekne ---------- */
export function Pier({ m }: { m: Mats }) {
  return <group position={[PIER[0], 0, PIER[1] - 12]}>
    {Array.from({ length: 13 }, (_, i) => <mesh key={i} geometry={bx(4, 0.18, 1.9, 2)} material={m.wood} position={[0, 0.95, -12 + i * 2]} />)}
    {Array.from({ length: 7 }, (_, i) => [-1.8, 1.8].map((x) => <mesh key={`${i}${x}`} material={m.wood} position={[x, 0.2, -12 + i * 4]}><cylinderGeometry args={[0.14, 0.16, 2.2, 6]} /></mesh>))}
  </group>;
}
export const boatRef: { current: THREE.Group | null } = { current: null };
export function BoatMesh() {
  const g = useRef<THREE.Group>(null); useEffect(() => { boatRef.current = g.current; }, []);
  const hull = useMemo(() => { const s = new THREE.Shape(); s.moveTo(0, -4.4); s.quadraticCurveTo(1.8, -1.6, 1.6, 3.4); s.quadraticCurveTo(0, 3.8, -1.6, 3.4); s.quadraticCurveTo(-1.8, -1.6, 0, -4.4); const geo = new THREE.ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2 }); geo.rotateX(Math.PI / 2); geo.translate(0, 1.0, 0); return geo; }, []);
  return (<group ref={g}>
    <mesh geometry={hull}><meshStandardMaterial color="#f3f0e8" roughness={0.5} /></mesh>
    <mesh position={[0, 0.25, -0.4]} scale={[1.04, 1, 1.02]} geometry={hull}><meshStandardMaterial color="#2a6f93" roughness={0.6} /></mesh>
    <mesh position={[0, 1.08, 0]}><boxGeometry args={[2.9, 0.1, 6.6]} /><meshStandardMaterial color="#9a6a42" roughness={0.75} /></mesh>
    {[-1.4, 1.4].map((x) => <mesh key={x} position={[x, 1.6, -0.3]}><boxGeometry args={[0.06, 0.06, 6]} /><meshStandardMaterial color="#d8d4cc" metalness={0.5} roughness={0.3} /></mesh>)}
    <mesh position={[0, 2.05, 1.3]}><boxGeometry args={[2.2, 1.9, 2.4]} /><meshStandardMaterial color="#eae6dc" roughness={0.6} /></mesh>
    {[-1.11, 1.11].map((x) => <mesh key={x} position={[x, 2.3, 1.3]}><boxGeometry args={[0.02, 0.7, 1.9]} /><meshStandardMaterial color="#2b3f4c" roughness={0.2} metalness={0.3} /></mesh>)}
    <mesh position={[0, 3.1, 0.6]}><boxGeometry args={[2.7, 0.14, 4.2]} /><meshStandardMaterial color="#c9462f" roughness={0.6} /></mesh>
    {[[-1.25, -1.3], [1.25, -1.3]].map(([x, z]) => <mesh key={x} position={[x, 2.4, z]}><cylinderGeometry args={[0.05, 0.05, 1.4, 6]} /><meshStandardMaterial color="#d8d4cc" /></mesh>)}
  </group>);
}
