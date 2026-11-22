/**
 * Cumalıkızık — 3B modeller. Ortak manzara kiti (shared/scenery.tsx) ile.
 * Ev: ahşap hatıllı moloz taş zemin kat, kerpiç dolgulu ahşap iskeletli sıvalı üst katlar (sokağa hafif taşar), kafesli/cumbalı pencereler,
 * geniş saçaklı alaturka kiremit kırma çatı, çift kanatlı ahşap kapı. Evler parça türüne göre InstancedMesh ile çizilir.
 * Sıva renkleri, cami/hamam/çeşme biçimi ve ölçüleri TEMSİLÎDİR (docs/CUMALIKIZIK.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { FOUNTAIN, HAMAM, HOUSES, MOSQUE, PLANE_TREE, SQUARE, STREETS, WALLS, heightAt, onStreet, type House } from './village';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
/** Öğleden sonra güneşi (batıdan): cepheler yandan aydınlanır */
export const SUN_DIR = new THREE.Vector3(-0.6, 0.62, 0.5).normalize();
export const GROUND_H = 2.9, FLOOR_H = 2.7, OVERHANG = 0.45;

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 7) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; door: THREE.MeshStandardMaterial; paving: THREE.MeshStandardMaterial; white: THREE.MeshStandardMaterial; lead: THREE.MeshStandardMaterial; iron: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('kizik-moloz', ['#b3a487', '#a39478', '#c1b295', '#958871', '#bba98a', '#a89a80'], [22, 16], [18, 30]);
    for (const t of [st.map, st.bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1.6); }
    // sıvalı üst kat: beyaz zemin (örnek rengiyle çarpılır), koyu ahşap iskelet çizgileri, iki pencere (kafes)
    const pl = canvasTex(512, 256, (g, r) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.05})`; g.fillRect(r() * 512, r() * 256, 3, 3); }
      g.fillStyle = '#5b4330';
      g.fillRect(0, 0, 512, 10); g.fillRect(0, 246, 512, 10); for (const x of [0, 170, 342, 502]) g.fillRect(x, 0, 10, 256);
      for (const [x0, x1] of [[10, 170], [352, 502]]) { g.save(); g.globalAlpha = 0.55; g.lineWidth = 6; g.strokeStyle = '#5b4330'; g.beginPath(); g.moveTo(x0, 250); g.lineTo(x1, 10); g.stroke(); g.restore(); }
      for (const cx of [256]) { // orta pencere: ahşap çerçeve + kafes
        g.fillStyle = '#4a3423'; g.fillRect(cx - 62, 50, 124, 150); g.fillStyle = '#2a2622'; g.fillRect(cx - 54, 58, 108, 134);
        g.strokeStyle = '#8a6a48'; g.lineWidth = 3; for (let k = -54; k < 54; k += 12) { g.beginPath(); g.moveTo(cx + k, 58); g.lineTo(cx + k + 30, 192); g.stroke(); g.beginPath(); g.moveTo(cx + k + 30, 58); g.lineTo(cx + k, 192); g.stroke(); }
        g.fillStyle = '#4a3423'; g.fillRect(cx - 62, 120, 124, 8); }
      for (const cx of [90, 422]) { g.fillStyle = '#4a3423'; g.fillRect(cx - 34, 70, 68, 116); g.fillStyle = '#26303a'; g.fillRect(cx - 28, 76, 56, 104); g.fillStyle = '#4a3423'; g.fillRect(cx - 2, 76, 4, 104); g.fillRect(cx - 28, 124, 56, 4); }
    });
    const pb = canvasTex(256, 128, (g, r) => { g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 128); for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},0.08)`; g.fillRect(r() * 256, r() * 128, 2, 2); } }, false);
    // alaturka kiremit: sıra sıra yarım daire oluklar
    const rf = canvasTex(256, 256, (g, r) => { g.fillStyle = '#9a4a32'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 16) for (let x = 0; x < 256; x += 14) { const v = 0.75 + r() * 0.4; g.fillStyle = `rgb(${(176 * v) | 0},${(90 * v) | 0},${(60 * v) | 0})`; g.fillRect(x + ((y / 16) % 2) * 7, y, 12, 14); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + ((y / 16) % 2) * 7, y + 12, 12, 3); } for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,70,40,${r() * 0.25})`; g.beginPath(); g.arc(r() * 256, r() * 256, 4 + r() * 10, 0, 7); g.fill(); } });
    // yassı taş döşeme
    const pv = canvasTex(512, 512, (g, r) => { g.fillStyle = '#6f685d'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 260; i++) { const x = r() * 512, y = r() * 512, w = 26 + r() * 40, h = 20 + r() * 30, v = 0.75 + r() * 0.35; g.fillStyle = `rgb(${(160 * v) | 0},${(152 * v) | 0},${(138 * v) | 0})`; g.beginPath(); g.ellipse(x, y, w / 2, h / 2, r() * 3, 0, 7); g.fill(); }
      for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.08})`; g.fillRect(r() * 512, r() * 512, 2, 2); } });
    const pvb = canvasTex(256, 256, (g, r) => { g.fillStyle = '#303030'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${0.5 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 7 + r() * 10, 5 + r() * 7, r() * 3, 0, 7); g.fill(); } }, false);
    const wood = canvasTex(128, 256, (g, r) => { g.fillStyle = '#6a4a30'; g.fillRect(0, 0, 128, 256); for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '40,25,15' : '140,100,70'},${0.2 + r() * 0.3})`; g.lineWidth = 1 + r() * 2; const x = r() * 128; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, 80, x - 6, 170, x + 3, 256); g.stroke(); } });
    const door = canvasTex(256, 256, (g) => { g.fillStyle = '#5a3c26'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#3a2616'; g.lineWidth = 8; g.strokeRect(10, 10, 236, 236); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.stroke(); for (const y of [70, 150]) for (const x of [24, 140]) g.strokeRect(x, y - 40, 92, 70); for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(30,18,10,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(Math.random() * 256, 0); g.lineTo(Math.random() * 256, 256); g.stroke(); } });
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.5, roughness: 0.95 })),
      plaster: new THREE.MeshStandardMaterial({ map: pl, bumpMap: pb, bumpScale: 0.1, roughness: 0.9 }),
      roof: new THREE.MeshStandardMaterial({ map: rf, roughness: 0.85 }),
      wood: new THREE.MeshStandardMaterial({ map: wood, roughness: 0.8 }),
      dark: new THREE.MeshStandardMaterial({ color: '#4a3423', roughness: 0.85 }),
      door: new THREE.MeshStandardMaterial({ map: door, roughness: 0.75 }),
      paving: new THREE.MeshStandardMaterial({ map: pv, bumpMap: pvb, bumpScale: 0.6, roughness: 0.92 }),
      white: new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: 0.9 }),
      lead: new THREE.MeshStandardMaterial({ color: '#8d949a', roughness: 0.5, metalness: 0.4 }),
      iron: new THREE.MeshStandardMaterial({ color: '#2c2a28', roughness: 0.45, metalness: 0.7 }),
    };
  }, []);
}

/* ===================== evler ===================== */
const _o = new THREE.Object3D(), _m = new THREE.Matrix4(), _c = new THREE.Color();
/** Ev parçaları (yerel: cephe +z yönünde değil −z'ye bakar; yaw ile döner). Her parça: [ox, oy, oz, sx, sy, sz] */
function partsOf(h: House) {
  const top = GROUND_H + h.floors === 3 ? 0 : 0;   // (yalnızca okunabilirlik)
  void top;
  const upH = (h.floors - 1) * FLOOR_H, front = -h.d / 2;
  return {
    base: [0, GROUND_H / 2 - 0.6, 0, h.w, GROUND_H + 1.2, h.d],
    // üst katlar sokağa OVERHANG m taşar (çıkma); arka yüz aynı hizada
    upper: [0, GROUND_H + upH / 2, -OVERHANG / 2, h.w, upH, h.d + OVERHANG],
    beams: [0.85, 1.75].map((y) => [0, y, front - 0.02, h.w + 0.04, 0.16, 0.06]),
    eave: [0, GROUND_H - 0.08, front - OVERHANG / 2, h.w, 0.16, OVERHANG + 0.1],
    cumba: h.cumba ? [0, GROUND_H + FLOOR_H * (h.floors === 3 ? 1.5 : 0.5), front - OVERHANG - 0.45, Math.min(3.2, h.w * 0.42), FLOOR_H * 0.78, 0.9] : null,
    roof: [0, GROUND_H + upH, -OVERHANG / 2, (h.w + 1.6) * 1.0, 2.1, h.d + OVERHANG + 1.6],
    door: h.door ? [h.w * 0.18, 1.15, front - 0.04, 1.7, 2.3, 0.08] : null,
  };
}
function setInst(mesh: THREE.InstancedMesh | null, i: number, h: House, p: number[], color?: string) {
  if (!mesh) return;
  _o.position.set(p[0], p[1], p[2]); _o.rotation.set(0, 0, 0); _o.scale.set(p[3], p[4], p[5]); _o.updateMatrix();
  _m.makeRotationY(h.yaw).setPosition(h.x, h.base, h.z); _m.multiply(_o.matrix); mesh.setMatrixAt(i, _m);
  if (color) mesh.setColorAt(i, _c.set(color));
}
export function Houses({ m }: { m: Mats }) {
  const N = HOUSES.length;
  const refs = { base: useRef<THREE.InstancedMesh>(null), upper: useRef<THREE.InstancedMesh>(null), beam: useRef<THREE.InstancedMesh>(null), eave: useRef<THREE.InstancedMesh>(null), cumba: useRef<THREE.InstancedMesh>(null), roof: useRef<THREE.InstancedMesh>(null), door: useRef<THREE.InstancedMesh>(null) };
  const roofGeo = useMemo(() => { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 2.5); return g; }, []);
  // kutu: yan yüzlerde doku, üst/alt düz (pencere tavanda görünmesin)
  const upperMats = useMemo(() => { const side = m.plaster, flat = new THREE.MeshStandardMaterial({ color: '#d9cfbd', roughness: 0.9 }); return [side, side, flat, flat, side, side]; }, [m]);
  const cumbaMats = useMemo(() => [m.plaster, m.plaster, m.dark, m.dark, m.plaster, m.plaster], [m]);
  useEffect(() => {
    const cnt = { beam: 0, cumba: 0, door: 0 };
    HOUSES.forEach((h, i) => { const P = partsOf(h);
      setInst(refs.base.current, i, h, P.base); setInst(refs.upper.current, i, h, P.upper, h.color); setInst(refs.eave.current, i, h, P.eave); setInst(refs.roof.current, i, h, P.roof);
      for (const b of P.beams) setInst(refs.beam.current, cnt.beam++, h, b);
      if (P.cumba) setInst(refs.cumba.current, cnt.cumba++, h, P.cumba, h.color);
      if (P.door) setInst(refs.door.current, cnt.door++, h, P.door); });
    const fin = (r: React.RefObject<THREE.InstancedMesh>, n: number) => { const mm = r.current; if (!mm) return; mm.count = n; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); };
    fin(refs.base, N); fin(refs.upper, N); fin(refs.eave, N); fin(refs.roof, N); fin(refs.beam, cnt.beam); fin(refs.cumba, cnt.cumba); fin(refs.door, cnt.door);
  }, [N]);   // eslint-disable-line react-hooks/exhaustive-deps
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return (<group>
    <instancedMesh ref={refs.base} args={[box, m.stone, N]} castShadow receiveShadow />
    <instancedMesh ref={refs.upper} args={[box, upperMats, N]} castShadow receiveShadow />
    <instancedMesh ref={refs.beam} args={[box, m.wood, N * 2]} castShadow />
    <instancedMesh ref={refs.eave} args={[box, m.wood, N]} castShadow />
    <instancedMesh ref={refs.cumba} args={[box, cumbaMats, N]} castShadow receiveShadow />
    <instancedMesh ref={refs.roof} args={[roofGeo, m.roof, N]} castShadow receiveShadow />
    <instancedMesh ref={refs.door} args={[box, m.door, N]} />
  </group>);
}
/** Durak evinin kapısındaki iki tokmak (büyük: erkek, küçük: kadın) ve halkası */
export function Knockers({ h, m }: { h: House; m: Mats }) {
  const P = partsOf(h).door!; if (!P) return null;
  const ring = useMemo(() => new THREE.TorusGeometry(1, 0.18, 8, 20), []);
  return <group position={[h.x, h.base, h.z]} rotation-y={h.yaw}>
    <group position={[P[0], P[1], P[2] - 0.07]}>
      <mesh geometry={ring} material={m.iron} position={[-0.4, 0.35, 0]} scale={0.11} castShadow />
      <mesh geometry={ring} material={m.iron} position={[0.4, 0.15, 0]} scale={0.07} castShadow />
      <mesh material={m.iron} position={[-0.4, 0.46, -0.01]}><boxGeometry args={[0.08, 0.08, 0.04]} /></mesh>
      <mesh material={m.iron} position={[0.4, 0.22, -0.01]}><boxGeometry args={[0.06, 0.06, 0.04]} /></mesh>
    </group>
  </group>;
}
/** Avlu duvarı ve çift kanatlı avlu kapısı (durak evinin yanında) */
export function CourtGate({ h, m }: { h: House; m: Mats }) {
  return <group position={[h.x, h.base, h.z]} rotation-y={h.yaw}>
    <mesh geometry={bx(4.4, 2.6, 0.6, 2)} material={m.stone} position={[h.w / 2 + 2.2, 1.3 - 0.3, -h.d / 2 + 0.3]} castShadow receiveShadow />
    <mesh material={m.door} position={[h.w / 2 + 2.2, 1.15, -h.d / 2 - 0.02]}><boxGeometry args={[2.2, 2.3, 0.1]} /></mesh>
    <mesh material={m.roof} position={[h.w / 2 + 2.2, 2.55, -h.d / 2 + 0.3]} rotation-x={0}><boxGeometry args={[4.8, 0.18, 1.2]} /></mesh>
  </group>;
}

/** Sokak boyunca avlu/bahçe duvarları: ahşap hatıllı moloz taş, üstü kiremit örtülü */
export function Walls({ m }: { m: Mats }) {
  const N = WALLS.length, wall = useRef<THREE.InstancedMesh>(null), cap = useRef<THREE.InstancedMesh>(null), beam = useRef<THREE.InstancedMesh>(null);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useEffect(() => { const o = new THREE.Object3D(), r = rng(31);
    WALLS.forEach(([x, z, yaw, L], i) => { const y = heightAt(x, z), h = 2.1 + Math.sin(x * 0.21 + z * 0.17) * 0.18; void r;
      o.rotation.set(0, yaw, 0); o.position.set(x, y + h / 2 - 0.4, z); o.scale.set(0.5, h + 0.8, L); o.updateMatrix(); wall.current?.setMatrixAt(i, o.matrix);
      o.position.set(x, y + h - 0.35, z); o.scale.set(0.8, 0.14, L); o.updateMatrix(); cap.current?.setMatrixAt(i, o.matrix);
      o.position.set(x, y + 0.9, z); o.scale.set(0.54, 0.12, L); o.updateMatrix(); beam.current?.setMatrixAt(i, o.matrix); });
    for (const mm of [wall.current, cap.current, beam.current]) if (mm) { mm.count = N; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [N]);
  return <group>
    <instancedMesh ref={wall} args={[box, m.stone, N]} castShadow receiveShadow />
    <instancedMesh ref={cap} args={[box, m.roof, N]} castShadow />
    <instancedMesh ref={beam} args={[box, m.wood, N]} />
  </group>;
}

/* ===================== zemin, sokaklar ===================== */
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => {
    const N = tier === 'high' ? 220 : tier === 'medium' ? 170 : 120, g = new THREE.PlaneGeometry(700, 700, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), r = rng(3);
    const grass = new THREE.Color('#7f8f4f'), dark = new THREE.Color('#5f7040'), dirt = new THREE.Color('#9a8a68');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), far = Math.max(0, Math.hypot(x, z) - 110); let y = heightAt(x, z) - 0.05;
      if (z < -100) y += (-z - 100) * 0.12;   // Uludağ'a doğru dikleşen yamaç
      y += far * 0.04 * (0.5 + 0.5 * Math.sin(x * 0.02));
      p.setY(i, y); uv.setXY(i, x / 700 + 0.5, -z / 700 + 0.5);
      const n = Math.sin(x * 0.05) * Math.cos(z * 0.04) * 0.5 + 0.5; c.copy(grass).lerp(dark, n * 0.6 + (z < -100 ? 0.3 : 0)).lerp(dirt, r() * 0.15 + (Math.hypot(x, z) < 90 ? 0.25 : 0));
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
/** Sokak döşemesi: her parça için araziye oturan şerit; meydan için daire. UV dünya ölçeğinde (1 doku = 4 m). */
export function Streets({ m }: { m: Mats }) {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const lift = (g: THREE.BufferGeometry) => { const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, heightAt(x, z) + 0.04); uv.setXY(i, x / 4, z / 4); } g.computeVertexNormals(); return g; };
    for (const s of STREETS) for (let i = 0; i < s.pts.length - 1; i++) {
      const a = s.pts[i], b = s.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) + s.w * 0.9, g = new THREE.PlaneGeometry(s.w + 0.4, L, 4, Math.ceil(L / 0.8));
      g.rotateX(-Math.PI / 2); g.rotateY(Math.atan2(b[0] - a[0], b[1] - a[1])); g.translate((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2); parts.push(lift(g.toNonIndexed()));
    }
    const sq = new THREE.CircleGeometry(SQUARE.r + 0.3, 48, 0, Math.PI * 2); sq.rotateX(-Math.PI / 2); sq.translate(SQUARE.c[0], 0, SQUARE.c[1]);
    const sub = new THREE.PlaneGeometry(1, 1); void sub;
    parts.push(lift(sq.toNonIndexed()));
    return mergeGeometries(parts)!;
  }, []);
  return <mesh geometry={geo} material={m.paving} receiveShadow userData={{ noCast: true }} />;
}

/* ===================== simge yapılar ===================== */
/** Cuma Camii: sıvalı kare harim, kırma kiremit çatı, ahşap direkli son cemaat yeri, tek şerefeli taş minare (temsilî) */
export function Mosque({ m }: { m: Mats }) {
  const { c, w, d, yaw } = MOSQUE, y = heightAt(c[0], c[1]), H = 6.5;
  const roofGeo = useMemo(() => { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); return g; }, []);
  const winTex = useMemo(() => canvasTex(256, 128, (g) => { g.fillStyle = '#f1ece2'; g.fillRect(0, 0, 256, 128); for (const x of [40, 128, 216]) { g.fillStyle = '#5b4330'; g.fillRect(x - 18, 26, 36, 64); g.fillStyle = '#2a3440'; g.fillRect(x - 13, 31, 26, 54); g.beginPath(); g.arc(x, 31, 13, Math.PI, 0); g.fill(); } g.fillStyle = '#9b8f7c'; g.fillRect(0, 112, 256, 16); }), []);
  return <group position={[c[0], y, c[1]]} rotation-y={yaw}>
    <mesh geometry={bx(w, 1.6, d, 3)} material={m.stone} position={[0, 0, 0]} castShadow receiveShadow />
    <mesh position={[0, H / 2 + 0.6, 0]} castShadow receiveShadow><boxGeometry args={[w, H, d]} /><meshStandardMaterial map={winTex} roughness={0.9} /></mesh>
    <mesh geometry={roofGeo} material={m.roof} position={[0, H + 0.6, 0]} scale={[w + 1.8, 3.2, d + 1.8]} castShadow />
    {/* son cemaat yeri: yerelde −z cephe (meydana bakan) */}
    <mesh material={m.wood} position={[0, H - 0.4 + 0.6, -d / 2 - 1.8]} castShadow><boxGeometry args={[w + 0.6, 0.25, 3.8]} /></mesh>
    <mesh geometry={roofGeo} material={m.roof} position={[0, H - 0.2 + 0.6, -d / 2 - 1.8]} scale={[w + 1.4, 0.9, 4.6]} castShadow />
    {[-w / 2 + 0.3, -w / 6, w / 6, w / 2 - 0.3].map((x) => <mesh key={x} material={m.wood} position={[x, (H - 0.4) / 2 + 0.6, -d / 2 - 3.4]} castShadow><boxGeometry args={[0.24, H - 0.4, 0.24]} /></mesh>)}
    <mesh material={m.door} position={[0, 1.9, -d / 2 - 0.02]}><boxGeometry args={[1.8, 2.6, 0.08]} /></mesh>
    {/* minare: kare taş kaide, 12 köşe gövde, şerefe, kurşun külah */}
    <group position={[w / 2 + 1.2, 0, d / 2 - 1.2]}>
      <mesh geometry={bx(2.4, 5, 2.4, 2)} material={m.stone} position={[0, 2.5, 0]} castShadow />
      <mesh material={m.white} position={[0, 5 + 6, 0]} castShadow><cylinderGeometry args={[0.85, 0.95, 12, 12]} /></mesh>
      <mesh material={m.stone} position={[0, 16.4, 0]} castShadow><cylinderGeometry args={[1.35, 0.9, 0.8, 12]} /></mesh>
      <mesh material={m.white} position={[0, 18, 0]} castShadow><cylinderGeometry args={[0.75, 0.8, 2.6, 12]} /></mesh>
      <mesh material={m.lead} position={[0, 20.6, 0]} castShadow><coneGeometry args={[0.85, 2.8, 12]} /></mesh>
    </group>
  </group>;
}
/** Köy hamamı: taş gövde, iki kubbe (fil gözlü), kemerli giriş */
export function Hamam({ m }: { m: Mats }) {
  const { c, w, d } = HAMAM, y = heightAt(c[0], c[1]);
  const eyes = useMemo(() => { const out: [number, number, number][] = []; for (const [cx, R] of [[-2.6, 2.6], [3.2, 2]] as const) for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, el = 0.55; out.push([cx + Math.cos(a) * R * Math.cos(el), 4 + R * Math.sin(el) * 0.9, Math.sin(a) * R * Math.cos(el)]); } return out; }, []);
  return <group position={[c[0], y, c[1]]}>
    <mesh geometry={bx(w, 5, d, 3)} material={m.stone} position={[0, 1.5, 0]} castShadow receiveShadow />
    {[[-2.6, 2.6], [3.2, 2]].map(([cx, R], i) => <mesh key={i} material={m.lead} position={[cx, 4, 0]} scale={[1, 0.9, 1]} castShadow><sphereGeometry args={[R, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>)}
    {eyes.map((e, i) => <mesh key={i} position={e}><sphereGeometry args={[0.13, 6, 4]} /><meshStandardMaterial color="#cfe6ee" emissive="#9fc8d6" emissiveIntensity={0.3} /></mesh>)}
    <mesh material={m.dark} position={[-2, 1.3, -d / 2 - 0.02]}><boxGeometry args={[1.6, 2.6, 0.06]} /></mesh>
    <mesh material={m.stone} position={[-2, 2.9, -d / 2 - 0.15]}><torusGeometry args={[0.95, 0.18, 6, 12, Math.PI]} /></mesh>
  </group>;
}
/** Meydan çeşmesi (temsilî): taş ayna taşı, kemer, yalak */
export function Fountain({ m }: { m: Mats }) {
  const { c, yaw } = FOUNTAIN, y = heightAt(c[0], c[1]);
  return <group position={[c[0], y, c[1]]} rotation-y={yaw}>
    <mesh geometry={bx(2.6, 2.8, 0.8, 2)} material={m.white} position={[0, 1.4, 0.2]} castShadow receiveShadow />
    <mesh material={m.stone} position={[0, 0.35, -0.5]} castShadow><boxGeometry args={[2.2, 0.7, 0.9]} /></mesh>
    <mesh position={[0, 0.66, -0.5]} rotation-x={-Math.PI / 2}><planeGeometry args={[2, 0.7]} /><meshStandardMaterial color="#5f8a96" roughness={0.1} metalness={0.2} /></mesh>
    <mesh material={m.iron} position={[0, 1.35, -0.25]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.04, 0.04, 0.3, 6]} /></mesh>
    <mesh material={m.white} position={[0, 2.85, 0.1]}><boxGeometry args={[3, 0.2, 1.1]} /></mesh>
  </group>;
}

/* ===================== bitki örtüsü ve dağ ===================== */
function treeGeo(kind: 'cinar' | 'kestane' | 'ceviz', seed: number, big = 1) {
  const r = rng(seed), parts: THREE.BufferGeometry[] = [];
  const paint = (g: THREE.BufferGeometry, hex: string, j: number) => { const c = new THREE.Color(), col: number[] = []; const gg = g.index ? g.toNonIndexed() : g; for (let i = 0; i < gg.attributes.position.count; i++) { c.set(hex).offsetHSL(0, 0, (r() - 0.5) * j); col.push(c.r, c.g, c.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.deleteAttribute('uv'); return gg; };
  const noisy = (g: THREE.BufferGeometry, a: number) => { const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const k = 1 + Math.sin(p.getX(i) * 4.1 + p.getY(i) * 3.3) * Math.cos(p.getZ(i) * 3.7) * a; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } return g; };
  const trunkH = kind === 'cinar' ? 5 * big : 3.2, trunkR = kind === 'cinar' ? 0.75 * big : 0.3;
  parts.push(paint(new THREE.CylinderGeometry(trunkR * 0.6, trunkR, trunkH, 14).translate(0, trunkH / 2, 0), kind === 'cinar' ? '#7d6b58' : '#5a4330', 0.08));
  const n = kind === 'cinar' ? 9 : 6, R = kind === 'cinar' ? 3.4 * big : kind === 'kestane' ? 2.2 : 2.6, col = kind === 'cinar' ? '#5f7a3a' : kind === 'kestane' ? '#4f6a30' : '#627a3c';
  for (let i = 0; i < n; i++) { const a = r() * 6.28, d = i ? R * (0.6 + r() * 0.5) : 0; parts.push(paint(noisy(new THREE.IcosahedronGeometry(R * (0.7 + r() * 0.35), 1), 0.12).translate(Math.cos(a) * d, trunkH + R * 0.4 + r() * R * 0.7, Math.sin(a) * d), col, 0.12)); }
  const g = mergeGeometries(parts)!; g.computeVertexNormals(); return g;
}
export function PlaneTree() {
  const geo = useMemo(() => treeGeo('cinar', 5, 1.5), []), mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []);
  const y = heightAt(PLANE_TREE.c[0], PLANE_TREE.c[1]);
  return <group position={[PLANE_TREE.c[0], y, PLANE_TREE.c[1]]}>
    <mesh geometry={geo} material={mat} castShadow receiveShadow />
    {/* gövdenin çevresinde taş oturma sekisi */}
    <mesh position={[0, 0.25, 0]} castShadow receiveShadow><cylinderGeometry args={[PLANE_TREE.r + 0.2, PLANE_TREE.r + 0.3, 0.5, 20]} /><meshStandardMaterial color="#a59a86" roughness={0.9} /></mesh>
  </group>;
}
/** Bahçe ağaçları: evlerin arkasında ve köyün çevresinde kestane ve ceviz; sokağa ve evlere girmez */
export function Trees({ n }: { n: number }) {
  const kinds = useMemo(() => [treeGeo('kestane', 11), treeGeo('ceviz', 12)], []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  useEffect(() => { const r = rng(77), o = new THREE.Object3D(), cnt = [0, 0];
    const inHouse = (x: number, z: number) => HOUSES.some((h) => Math.hypot(h.x - x, h.z - z) < Math.max(h.w, h.d) * 0.75 + 2);
    for (let i = 0; i < n * 8 && cnt[0] + cnt[1] < n; i++) { const x = (r() - 0.5) * 300, z = -180 + r() * 300; if (onStreet(x, z, -3) || inHouse(x, z) || Math.hypot(x - MOSQUE.c[0], z - MOSQUE.c[1]) < 12 || Math.hypot(x - HAMAM.c[0], z - HAMAM.c[1]) < 10) continue;
      const t = r() < 0.6 ? 0 : 1, m = refs.current[t]; if (!m) continue; o.position.set(x, heightAt(x, z) + (z < -100 ? (-z - 100) * 0.12 : 0) - 0.1, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.8 + r() * 0.6); o.updateMatrix(); m.setMatrixAt(cnt[t]++, o.matrix); }
    refs.current.forEach((m, i) => { if (!m) return; m.count = cnt[i]; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }); }, [n]);
  return <group>{kinds.map((g, i) => <instancedMesh key={i} ref={(mm) => { refs.current[i] = mm; }} args={[g, mat, n]} castShadow receiveShadow />)}</group>;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 5 && k < n; i++) { const x = (r() - 0.5) * 170, z = -100 + r() * 190; if (onStreet(x, z, -0.4) || HOUSES.some((h) => Math.abs(h.x - x) < h.w / 2 + 0.6 && Math.abs(h.z - z) < h.d / 2 + 0.6 && Math.hypot(h.x - x, h.z - z) < Math.max(h.w, h.d))) continue;
      o.position.set(x, heightAt(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.45 + r() * 0.5; o.scale.set(s, s * (0.8 + r() * 0.5), s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.2 + r() * 0.06, 0.35, 0.42 + r() * 0.15); ref.current?.setColorAt(k, c); k++; }
    const m = ref.current; if (m) { m.count = k; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
/** Uludağ (güneyde, karlı) ve çevre sırtlar */
export function Mountains() {
  const list = useMemo(() => { const r = rng(21), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    out.push({ p: [-150, -10, -1500], g: mountainGeo(1300, 760, 4, 0.66, '#5f6d44') });
    for (let i = 0; i < 9; i++) { const a = Math.PI * 0.55 + (i / 8) * Math.PI * 0.9, dd = 900 + r() * 500; out.push({ p: [Math.sin(a) * dd * 1.4, -20, Math.cos(a) * dd - 200], g: mountainGeo(420 + r() * 260, 120 + r() * 160, 40 + i, 2, '#7d8a5a') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
