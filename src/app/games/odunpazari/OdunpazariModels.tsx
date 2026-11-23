/**
 * Odunpazarı Evleri — 3B modeller. Yokuş aşağı taş sokak, iki yanda taş zemin katlı, renkli sıvalı, ahşap çerçeveli üst katlı konaklar,
 * sokağa taşan cumbalar, kiremit çatılar, küçük meydan ve çınarlar. Ölçüler, renkler ve pencere desenleri TEMSİLÎDİR (docs/ODUNPAZARI.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { HOUSES, LANE, SQUARE, groundY } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.45, 0.66, 0.5).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const FLOOR_H = 3;

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; street: THREE.MeshStandardMaterial; paint: THREE.MeshStandardMaterial[]; plaza: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('odunpazari-tas', ['#9c9080', '#8a8074', '#a89c8c', '#7d7468'], [14, 10], [30, 36]);
    const wood = canvasTex(128, 512, (g, r) => { g.fillStyle = '#6e4a2c'; g.fillRect(0, 0, 128, 512); for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '40,26,14' : '150,108,70'},${0.2 + r() * 0.3})`; g.lineWidth = 1 + r() * 2; const x = r() * 128; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, 170, x - 6, 340, x + 3, 512); g.stroke(); } });
    // sıva dokusu: pencereli cephe (açık boyanın üstünde ahşap çerçeveler; renk materyalde)
    const facade = canvasTex(256, 256, (g, r) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 180; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.05})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
      g.fillStyle = '#5a3c24'; for (const x of [40, 150]) { g.fillRect(x, 60, 66, 4); g.fillRect(x, 150, 66, 4); g.fillRect(x, 60, 4, 94); g.fillRect(x + 62, 60, 4, 94); g.fillRect(x + 31, 60, 3, 94); g.fillStyle = 'rgba(80,110,130,0.55)'; g.fillRect(x + 5, 65, 25, 83); g.fillRect(x + 36, 65, 25, 83); g.fillStyle = '#5a3c24'; } });
    const roofT = canvasTex(256, 256, (g, r) => { g.fillStyle = '#a4553a'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 10) for (let x = 0; x < 256; x += 14) { const v = 0.8 + r() * 0.35; g.fillStyle = `rgb(${(164 * v) | 0},${(84 * v) | 0},${(56 * v) | 0})`; g.fillRect(x + ((y / 10) % 2) * 7, y, 12, 8); } });
    const paving = canvasTex(256, 256, (g, r) => { g.fillStyle = '#8a8478'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 120; i++) { const v = r() < 0.5 ? 'rgba(70,64,56,0.22)' : 'rgba(200,192,176,0.18)'; g.fillStyle = v; g.beginPath(); g.ellipse(r() * 256, r() * 256, 7 + r() * 5, 5 + r() * 3, r() * 3, 0, 7); g.fill(); } });
    paving.repeat.set(1, 3);
    const paint = ['#e7d7a8', '#c9dfe4', '#e6b8a2', '#d9cfe6', '#f0e6cc', '#b9d5b0'].map((hex) => new THREE.MeshStandardMaterial({ map: facade, color: hex, roughness: 0.9 }));
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.4, roughness: 0.95 })),
      wood: new THREE.MeshStandardMaterial({ map: wood, roughness: 0.8 }),
      roof: new THREE.MeshStandardMaterial({ map: roofT, roughness: 0.85 }),
      street: new THREE.MeshStandardMaterial({ map: paving, roughness: 0.95 }),
      plaza: new THREE.MeshStandardMaterial({ map: paving, roughness: 0.95, color: '#d6cdb8' }),
      paint,
    };
  }, []);
}

/* ===================== sokak, meydan, arazi ===================== */
export function Street({ m }: { m: Mats }) {
  const geo = useMemo(() => { const N = 90, pos: number[] = [], idx: number[] = [], uv: number[] = [];
    for (let i = 0; i <= N; i++) { const z = LANE.z0 + (i / N) * (LANE.z1 - LANE.z0), y = groundY(0, z) + 0.02;
      pos.push(LANE.x0, y, z, LANE.x1, y, z); uv.push(0, i / 6, 1, i / 6);
      if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; }, []);
  const sq = useMemo(() => { const g = new THREE.PlaneGeometry(SQUARE.x1 - SQUARE.x0, SQUARE.z1 - SQUARE.z0, 1, 1); g.rotateX(-Math.PI / 2); g.translate((SQUARE.x0 + SQUARE.x1) / 2, groundY(0, SQUARE.z0) + 0.03, (SQUARE.z0 + SQUARE.z1) / 2); return g; }, []);
  return <group>
    <mesh geometry={geo} material={m.street} receiveShadow />
    <mesh geometry={sq} material={m.plaza} receiveShadow />
  </group>;
}
export function Ground({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 160 : 100, g = new THREE.PlaneGeometry(400, 400, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#7f9a54'), dry = new THREE.Color('#a6a070');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, groundY(x, z) - 0.15);
      c.copy(grass).lerp(dry, 0.3 + 0.3 * Math.sin(x * 0.04 + z * 0.03)); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}

/* ===================== konaklar ===================== */
/** Yan duvarlar, taş zemin kat, renkli sıvalı üst katlar ve sokağa taşan ahşap cumbalar, kiremit çatılar */
export function Houses({ m }: { m: Mats }) {
  const ground = useMemo(() => { const parts: Parts = [];
    for (const h of HOUSES) { const y = groundY(h.x, h.z), g = bx(h.w, FLOOR_H, h.d, 2.2); g.translate(h.x, y + FLOOR_H / 2, h.z); parts.push(g); }
    return merge(parts); }, []);
  const upper = useMemo(() => HOUSES.map((h) => { const up = (h.floors - 1) * FLOOR_H, parts: Parts = [], y = groundY(h.x, h.z) + FLOOR_H;
    const g = bx(h.w + 0.4, up, h.d + 0.3, 2.2); g.translate(h.x, y + up / 2, h.z); parts.push(g); return merge(parts); }), []);
  const cumba = useMemo(() => { const parts: Parts = [];
    for (const h of HOUSES) { const sx = h.cumba === 'sag' ? 1 : -1; // sokak tarafı: sağ evlerin cumbası −x'e, sol evlerinki +x'e taşar
      const y = groundY(h.x, h.z) + FLOOR_H, g = bx(1.4, FLOOR_H - 0.4, Math.min(3.2, h.d - 1.2), 1.2); g.translate(h.x - sx * (h.w / 2 + 0.2), y + (FLOOR_H - 0.4) / 2 + 0.1, h.z); parts.push(g);
      for (const dz of [-1.2, 1.2]) { const br = bx(0.3, 0.3, 0.3, 1); br.translate(h.x - sx * (h.w / 2 + 0.6), y - 0.2, h.z + dz); parts.push(br); } }
    return merge(parts); }, []);
  const roofs = useMemo(() => HOUSES.map((h) => { const floorsH = h.floors * FLOOR_H, parts: Parts = [];
    const s = new THREE.Shape(); const r = h.w / 2 + 0.7, hh = 2.4; s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(0, hh); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: h.d + 0.8, bevelEnabled: false }); g.translate(0, 0, -(h.d + 0.8) / 2);
    g.translate(h.x, groundY(h.x, h.z) + floorsH + 0.2, h.z); parts.push(g); return merge(parts); }), []);
  return <group>
    <mesh geometry={ground} material={m.stone} castShadow receiveShadow />
    {upper.map((g, i) => <mesh key={i} geometry={g} material={m.paint[i % m.paint.length]} castShadow receiveShadow />)}
    <mesh geometry={cumba} material={m.wood} castShadow receiveShadow />
    {roofs.map((g, i) => <mesh key={i} geometry={g} material={m.roof} castShadow />)}
  </group>;
}

/* ===================== çınarlar, çevre ===================== */
export function Plane({ n }: { n: number }) {
  const geo = useMemo(() => { const r = rng(3), parts: THREE.BufferGeometry[] = [];
    const trunk = new THREE.CylinderGeometry(0.3, 0.45, 3.4, 7); trunk.translate(0, 1.7, 0); parts.push(trunk);
    for (let i = 0; i < 6; i++) { const a = r() * 6.28, d = i ? 1.6 + r() : 0; const cr = new THREE.IcosahedronGeometry(2 + r() * 0.5, 1); cr.translate(Math.cos(a) * d, 4.6 + r() * 1, Math.sin(a) * d); parts.push(cr); }
    const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5d7f3a', roughness: 0.95 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const o = new THREE.Object3D(); const spots = [[-12, -58], [12, -58], [-12, -44], [13, -44], [-15, -10], [16, 0]];
    spots.slice(0, n).forEach(([x, z], i) => { o.position.set(x, groundY(x, z) - 0.05, z); o.scale.setScalar(1); o.updateMatrix(); ref.current?.setMatrixAt(i, o.matrix); });
    const mm = ref.current; if (mm) { mm.count = Math.min(n, spots.length); mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 4 && k < n; i++) { const x = -60 + r() * 120, z = -70 + r() * 110;
      if (Math.abs(x) < 14 && z > -72 && z < 42) continue;
      o.position.set(x, groundY(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.22 + r() * 0.05, 0.42, 0.42 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + r() * 0.2, dd = 700 + r() * 350; out.push({ p: [Math.cos(a) * dd, -8, Math.sin(a) * dd], g: mountainGeo(380 + r() * 200, 130 + r() * 110, 120 + i, 1.5, '#7f8a64') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
