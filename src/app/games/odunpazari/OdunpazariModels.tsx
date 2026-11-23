/**
 * Odunpazarı Evleri — 3B modeller. Yokuş aşağı taş sokak, iki yanda taş zemin katlı, renkli sıvalı, ahşap çerçeveli üst katlı konaklar,
 * sokağa taşan cumbalar, kiremit çatılar, küçük meydan ve çınarlar. Ölçüler, renkler ve pencere desenleri TEMSİLÎDİR (docs/ODUNPAZARI.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { HOUSES, LANE, SQUARE, groundY, LOT, LOT_HOUSE } from './site';

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
      if (i < N) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); /* yüz yukarı baksın */ } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; }, []);
  // meydan zemini eğimi izler (önceden düz bir düzlemdi: bir ucu toprağa gömülüyordu)
  const sq = useMemo(() => { const g = new THREE.PlaneGeometry(SQUARE.x1 - SQUARE.x0, SQUARE.z1 - SQUARE.z0, 4, 8); g.rotateX(-Math.PI / 2); g.translate((SQUARE.x0 + SQUARE.x1) / 2, 0, (SQUARE.z0 + SQUARE.z1) / 2); const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i)) + 0.03); g.computeVertexNormals(); return g; }, []);
  return <group>
    <mesh geometry={geo} material={m.street} receiveShadow />
    <mesh geometry={sq} material={m.plaza} receiveShadow />
  </group>;
}
export function Ground({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 160 : 100, g = new THREE.PlaneGeometry(400, 400, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#7f9a54'), dry = new THREE.Color('#a6a070');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, groundY(x, z) - 0.06);   // sokak şeridinin (+0.02) altında kalsın, z-çakışması olmasın
      c.copy(grass).lerp(dry, 0.3 + 0.3 * Math.sin(x * 0.04 + z * 0.03)); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}

/* ===================== konaklar ===================== */
/** Yan duvarlar, taş zemin kat, renkli sıvalı üst katlar ve sokağa taşan ahşap cumbalar, kiremit çatılar */
/** Eğik payanda: alt ucu duvarda, üst ucu sokağa doğru çıkmanın altında (önceden döndürme sırası yüzünden havada yatay duruyordu) */
function brace(x: number, y: number, z: number, ld: number, len = 1.1) { const g = bx(0.14, len, 0.14, 1); g.rotateZ(-ld * 0.7); g.translate(x + ld * Math.sin(0.7) * len / 2, y - Math.cos(0.7) * len / 2, z); return g; }
/** Sokak yönü: evin sokağa bakan yüzü (−1: −x, +1: +x). Önceden cumbalar soldaki evlerde arkaya bakıyordu. */
const laneDir = (x: number) => (x > 0 ? -1 : 1);
export function Houses({ m }: { m: Mats }) {
  const ground = useMemo(() => { const parts: Parts = [];
    for (const h of HOUSES) { const y = groundY(h.x, h.z), g = bx(h.w, FLOOR_H + 0.4, h.d, 2.2); g.translate(h.x, y + FLOOR_H / 2 - 0.2, h.z); parts.push(g); }
    return merge(parts); }, []);
  const upper = useMemo(() => HOUSES.map((h) => { const up = (h.floors - 1) * FLOOR_H, y = groundY(h.x, h.z) + FLOOR_H, ld = laneDir(h.x);
    // üst katlar sokağa 0,5 m taşar (çıkma)
    const g = bx(h.w + 0.5, up, h.d + 0.2, 2.2); g.translate(h.x + ld * 0.25, y + up / 2, h.z); return g; }), []);
  // ahşap: kat kuşağı, köşe dikmeleri, çıkma payandaları, cumba, kapı, zemin kat pencere kafesleri
  const wood = useMemo(() => { const p: Parts = [], dk: Parts = [], ir: Parts = [], cb: { i: number; g: THREE.BufferGeometry }[] = [];
    for (const h of HOUSES) { const ld = laneDir(h.x), y = groundY(h.x, h.z), fx = h.x + ld * (h.w / 2), up = (h.floors - 1) * FLOOR_H, ux = h.x + ld * (h.w / 2 + 0.5);
      p.push(bx(0.35, 0.22, h.d + 0.3, 1).translate(fx + ld * 0.3, y + FLOOR_H + 0.05, h.z));
      for (const dz of [-1, 1]) p.push(bx(0.2, up, 0.2, 1).translate(ux + ld * 0.02, y + FLOOR_H + up / 2, h.z + dz * (h.d / 2 + 0.05)));
      for (let k = -1; k <= 1; k += 2) p.push(brace(fx, y + FLOOR_H - 0.05, h.z + k * (h.d / 2 - 0.6), ld, 0.8));
      // cumba: sokağa taşan kutu + altında iki "eli böğründe" payanda
      const cw = Math.min(3.0, h.d - 1.6), cx = ux + ld * 0.55, cy = y + FLOOR_H + 0.5;
      cb.push({ i: HOUSES.indexOf(h), g: bx(1.1, FLOOR_H - 0.9, cw, 1).translate(cx, cy + (FLOOR_H - 0.9) / 2, h.z) });
      p.push(bx(1.2, 0.14, cw + 0.1, 1).translate(cx, cy + 0.02, h.z), bx(1.2, 0.14, cw + 0.1, 1).translate(cx, cy + FLOOR_H - 0.9, h.z));
      dk.push(bx(0.04, 1.1, cw - 0.5, 1).translate(cx + ld * 0.56, cy + 1.1, h.z));
      for (let k = 0; k < 3; k++) p.push(bx(0.06, 1.2, 0.08, 1).translate(cx + ld * 0.57, cy + 1.1, h.z - (cw - 0.5) / 2 + (k + 1) * ((cw - 0.5) / 4)));
      for (const dz of [-cw / 2 + 0.2, cw / 2 - 0.2]) p.push(brace(cx - ld * 0.5, cy, h.z + dz, ld, 1.0));
      // zemin kat: ahşap kapı ve demir parmaklıklı küçük pencere
      const dz0 = h.z + (h.d > 7 ? -1.6 : -1.2); p.push(bx(0.12, 2.3, 1.3, 1).translate(fx + ld * 0.06, y + 1.15, dz0)); p.push(bx(0.16, 0.14, 1.6, 1).translate(fx + ld * 0.08, y + 2.35, dz0));
      dk.push(bx(0.05, 1.0, 0.9, 1).translate(fx + ld * 0.03, y + 1.7, h.z + 1.6));
      for (let k = 0; k < 4; k++) ir.push(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 5).translate(fx + ld * 0.09, y + 1.7, h.z + 1.6 - 0.36 + k * 0.24)); }
    return { p: merge(p), dk: merge(dk), ir: merge(ir), cb }; }, []);
  const roofs = useMemo(() => HOUSES.map((h) => { const floorsH = h.floors * FLOOR_H, parts: Parts = [];
    const s2 = new THREE.Shape(); const r = h.w / 2 + 1.0, hh = 2.4; s2.moveTo(-r, 0); s2.lineTo(r, 0); s2.lineTo(0, hh); s2.closePath();
    const g = new THREE.ExtrudeGeometry(s2, { depth: h.d + 0.8, bevelEnabled: false }); g.translate(0, 0, -(h.d + 0.8) / 2);
    g.translate(h.x + laneDir(h.x) * 0.25, groundY(h.x, h.z) + floorsH + 0.2, h.z); parts.push(g); return merge(parts); }), []);
  return <group>
    <mesh geometry={ground} material={m.stone} castShadow receiveShadow />
    {upper.map((g, i) => <mesh key={i} geometry={g} material={m.paint[i % m.paint.length]} castShadow receiveShadow />)}
    <mesh geometry={wood.p} material={m.wood} castShadow receiveShadow />
    {wood.cb.map((c) => <mesh key={c.i} geometry={c.g} material={m.paint[(c.i + 2) % m.paint.length]} castShadow receiveShadow />)}
    <mesh geometry={wood.dk}><meshStandardMaterial color="#3a4a52" roughness={0.2} metalness={0.4} /></mesh>
    <mesh geometry={wood.ir}><meshStandardMaterial color="#2a2622" roughness={0.6} metalness={0.5} /></mesh>
    {roofs.map((g, i) => <mesh key={i} geometry={g} material={m.roof} castShadow />)}
  </group>;
}

/* ===================== meydan: çeşme, çınar, banklar (temsilî) ===================== */
export function SquareProps({ m }: { m: Mats }) {
  const geo = useMemo(() => { const st: Parts = [], wd: Parts = [], cx = 0, cz = (SQUARE.z0 + SQUARE.z1) / 2, y = groundY(cx, cz);
    st.push(bx(2.2, 2.6, 0.8, 1).translate(cx + 5.5, y + 1.3, SQUARE.z0 + 0.6)); st.push(bx(2.6, 0.3, 1.0, 1).translate(cx + 5.5, y + 2.75, SQUARE.z0 + 0.6));
    st.push(bx(1.8, 0.5, 0.8, 1).translate(cx + 5.5, y + 0.25, SQUARE.z0 + 1.4));
    for (const x of [-5.5, -2.5]) { wd.push(bx(2.0, 0.08, 0.5, 1).translate(x, y + 0.45, SQUARE.z1 - 1.6)); for (const dx of [-0.8, 0.8]) wd.push(bx(0.08, 0.45, 0.45, 1).translate(x + dx, y + 0.22, SQUARE.z1 - 1.6)); }
    return { st: merge(st), wd: merge(wd) }; }, []);
  const tree = useMemo(() => { const p: Parts = [], r = rng(5), x = -5, z = (SQUARE.z0 + SQUARE.z1) / 2 - 1, y = groundY(x, z);
    p.push(new THREE.CylinderGeometry(0.4, 0.6, 5, 9).translate(x, y + 2.5, z)); const leaves: Parts = [];
    for (let i = 0; i < 9; i++) leaves.push(new THREE.IcosahedronGeometry(1.8 + r(), 1).translate(x + (r() - 0.5) * 4, y + 6 + r() * 2, z + (r() - 0.5) * 4));
    return { trunk: merge(p), leaves: merge(leaves) }; }, []);
  return <group>
    <mesh geometry={geo.st} material={m.stone} castShadow receiveShadow />
    <mesh geometry={geo.wd} material={m.wood} castShadow />
    <mesh geometry={tree.trunk} material={m.wood} castShadow />
    <mesh geometry={tree.leaves} castShadow><meshStandardMaterial color="#5d8a3e" roughness={0.95} flatShading /></mesh>
  </group>;
}

/* ===================== restorasyon parseli: konak adım adım kurulur ===================== */
export const buildState = { step: 0 };
function Rise({ at, children }: { at: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null), k = useRef(0);
  useFrame((_, dt) => { const g = ref.current; if (!g) return; const t = buildState.step >= at ? 1 : 0; k.current += (t - k.current) * Math.min(1, dt * 2.6); g.scale.set(1, Math.max(0.001, k.current), 1); g.visible = k.current > 0.01; });
  return <group ref={ref} visible={false}>{children}</group>;
}
export function BuildSite({ m }: { m: Mats }) {
  const H = LOT_HOUSE, ld = -1, y = groundY(H.x, H.z), fx = H.x + ld * (H.w / 2), up = (H.floors - 1) * FLOOR_H;
  const g = useMemo(() => { const make = (fn: (p: Parts) => void) => { const p: Parts = []; fn(p); return merge(p); };
    const found = make((p) => { const t = 0.5; for (const [x0, x1, z0, z1] of [[LOT.x0, LOT.x1, LOT.z0, LOT.z0 + t], [LOT.x0, LOT.x1, LOT.z1 - t, LOT.z1], [LOT.x0, LOT.x0 + t, LOT.z0, LOT.z1], [LOT.x1 - t, LOT.x1, LOT.z0, LOT.z1]]) p.push(bx(x1 - x0, 0.4, z1 - z0, 1).translate((x0 + x1) / 2, 0.15, (z0 + z1) / 2)); });
    const scaffold = make((p) => { for (const [x, z] of [[LOT.x0 - 0.5, LOT.z0 - 0.3], [LOT.x0 - 0.5, LOT.z1 + 0.3], [LOT.x0 - 0.5, (LOT.z0 + LOT.z1) / 2]]) p.push(new THREE.CylinderGeometry(0.06, 0.06, 7.5, 6).translate(x, 3.6, z)); for (const yy of [2.2, 4.6]) p.push(bx(0.1, 0.1, LOT.z1 - LOT.z0 + 0.6, 1).translate(LOT.x0 - 0.5, yy, (LOT.z0 + LOT.z1) / 2)); });
    const stone = make((p) => { const t = 0.5, h = FLOOR_H + 0.4; p.push(bx(H.w, h, t, 2.2).translate(H.x, h / 2 - 0.2, LOT.z0 + t / 2), bx(H.w, h, t, 2.2).translate(H.x, h / 2 - 0.2, LOT.z1 - t / 2), bx(t, h, H.d, 2.2).translate(LOT.x1 - t / 2, h / 2 - 0.2, H.z));
      p.push(bx(t, h, H.d / 2 - 1.0, 2.2).translate(fx + t / 2, h / 2 - 0.2, LOT.z0 + (H.d / 2 - 1.0) / 2), bx(t, h, H.d / 2 - 0.4, 2.2).translate(fx + t / 2, h / 2 - 0.2, LOT.z1 - (H.d / 2 - 0.4) / 2), bx(t, 1.0, 1.4, 2.2).translate(fx + t / 2, FLOOR_H - 0.3, H.z - 0.3)); });
    const frame = make((p) => { const y0 = FLOOR_H, ux = fx - 0.5; p.push(bx(H.w + 0.5, 0.2, H.d + 0.2, 1).translate(H.x - 0.25, y0, H.z));
      for (let k = 0; k <= 4; k++) { const z = LOT.z0 + (k * H.d) / 4; p.push(bx(0.18, up, 0.18, 1).translate(ux, y0 + up / 2, z), bx(0.18, up, 0.18, 1).translate(LOT.x1, y0 + up / 2, z)); }
      for (const zz of [LOT.z0, LOT.z1]) for (let k = 0; k <= 3; k++) p.push(bx(0.18, up, 0.18, 1).translate(ux + (k * (LOT.x1 - ux)) / 3, y0 + up / 2, zz));
      p.push(bx(0.18, 0.18, H.d, 1).translate(ux, y0 + up, H.z), bx(0.18, 0.18, H.d, 1).translate(ux, y0 + up / 2, H.z));
      for (let k = 0; k < 4; k++) { const z = LOT.z0 + ((k + 0.5) * H.d) / 4, L = Math.hypot(H.d / 4, up / 2), br = bx(0.12, L, 0.12, 1); br.rotateX((k % 2 ? 1 : -1) * Math.atan2(H.d / 4, up / 2)); br.translate(ux, y0 + up / 4, z); p.push(br); } });
    const infill = make((p) => { const ux = fx - 0.5; p.push(bx(0.12, up - 0.2, H.d - 0.2, 1).translate(ux + 0.04, FLOOR_H + up / 2, H.z), bx(0.12, up - 0.2, H.d - 0.2, 1).translate(LOT.x1 - 0.04, FLOOR_H + up / 2, H.z));
      for (const zz of [LOT.z0 + 0.04, LOT.z1 - 0.04]) p.push(bx(LOT.x1 - ux, up - 0.2, 0.12, 1).translate((ux + LOT.x1) / 2, FLOOR_H + up / 2, zz)); });
    const plaster = make((p) => { const ux = fx - 0.5; p.push(bx(0.06, up - 0.1, H.d + 0.05, 1).translate(ux - 0.06, FLOOR_H + up / 2, H.z), bx(LOT.x1 - ux, up - 0.1, 0.06, 1).translate((ux + LOT.x1) / 2, FLOOR_H + up / 2, LOT.z1 + 0.08), bx(LOT.x1 - ux, up - 0.1, 0.06, 1).translate((ux + LOT.x1) / 2, FLOOR_H + up / 2, LOT.z0 - 0.08)); });
    const cumba = make((p) => { const cw = Math.min(3.0, H.d - 1.6), cx = fx - 0.5 - 0.55, cy = FLOOR_H + 0.5; p.push(bx(1.1, FLOOR_H - 0.9, cw, 1).translate(cx, cy + (FLOOR_H - 0.9) / 2, H.z));
      p.push(bx(0.04, 1.1, cw - 0.5, 1).translate(cx + ld * 0.56, cy + 1.1, H.z));
      for (const dz of [-cw / 2 + 0.2, cw / 2 - 0.2]) p.push(brace(cx - ld * 0.5, cy, H.z + dz, ld, 1.0)); });
    const roof = make((p) => { const s2 = new THREE.Shape(), r = H.w / 2 + 1.0; s2.moveTo(-r, 0); s2.lineTo(r, 0); s2.lineTo(0, 2.4); s2.closePath(); const e = new THREE.ExtrudeGeometry(s2, { depth: H.d + 0.8, bevelEnabled: false }); e.translate(H.x - 0.25, FLOOR_H + up + 0.2, H.z - (H.d + 0.8) / 2); p.push(e); });
    return { found, scaffold, stone, frame, infill, plaster, cumba, roof }; }, [H, fx, up]);
  const mudMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9a7a54', roughness: 1 }), []);
  return <group position-y={y}>
    <mesh geometry={g.found} material={m.stone} receiveShadow />
    <mesh geometry={g.scaffold} material={m.wood} />
    <Rise at={1}><mesh geometry={g.stone} material={m.stone} castShadow receiveShadow /></Rise>
    <Rise at={2}><mesh geometry={g.frame} material={m.wood} castShadow /></Rise>
    <Rise at={3}><mesh geometry={g.infill} material={mudMat} castShadow receiveShadow /></Rise>
    <Rise at={4}><mesh geometry={g.plaster} material={m.paint[1]} castShadow receiveShadow /></Rise>
    <Rise at={5}><mesh geometry={g.cumba} material={m.paint[3]} castShadow /></Rise>
    <Rise at={6}><mesh geometry={g.roof} material={m.roof} castShadow /></Rise>
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
