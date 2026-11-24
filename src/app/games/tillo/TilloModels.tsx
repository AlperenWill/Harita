/**
 * Tillo — 3B modeller: kesme taş türbe (kare oda, kasnaklı kubbe, batıda kapı, doğu duvarında pencereler), iki sanduka, köy evleri,
 * doğuda gedikli sırt, güneş ve ışık hüzmesi. Ölçüler ve biçimler TEMSİLÎDİR (docs/TILLO.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, weather } from '../shared/scenery';
import { DOOR, HOUSES, RIDGE, ROOM, SAND, WINDOWS, WIN_Y, groundY } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const slab = (p: Parts, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, s = 2) => { if (x1 - x0 < 0.01 || z1 - z0 < 0.01 || y1 - y0 < 0.01) return; const g = bx(x1 - x0, y1 - y0, z1 - z0, s); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); p.push(g); };
const H = ROOM.half, T = ROOM.t, WW = 0.55, WH = 0.8;

export interface Mats { stone: THREE.MeshStandardMaterial; dressed: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; cloth: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('tillo-tas', ['#b9a27f', '#ae9774', '#c3ad8a', '#a48d6b'], [26, 14], [44, 40]);
    const dr = stoneTex('tillo-kesme', ['#c8b391', '#bea986', '#d0bc9b'], [24, 6], [60, 30]);
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.5, roughness: 0.92 })),
      dressed: weather(new THREE.MeshStandardMaterial({ map: dr.map, bumpMap: dr.bump, bumpScale: 0.4, roughness: 0.9 })),
      dark: new THREE.MeshStandardMaterial({ color: '#2a231c', roughness: 1 }),
      cloth: new THREE.MeshStandardMaterial({ color: '#2f5a3c', roughness: 0.95 }),
      plaster: new THREE.MeshStandardMaterial({ color: '#e7dcc6', roughness: 0.95 }),
      wood: new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.85 }),
    };
  }, []);
}

/** Türbe: duvarlar (kapı ve doğu penceresi açıklıklarıyla), kasnak, kubbe; içeride sıva ve iki sanduka. win: açık pencere */
export function Tomb({ m, win }: { m: Mats; win: number }) {
  const { walls, inner, dome, sand, covers } = useMemo(() => { const walls: Parts = [], inner: Parts = [], sand: Parts = [], covers: Parts = [], y0 = 0, y1 = ROOM.H;
    // kuzey, güney duvarları
    slab(walls, -H - T, H + T, -H - T, -H, y0, y1); slab(walls, -H - T, H + T, H, H + T, y0, y1);
    // batı: kapı açıklığı
    const dz0 = DOOR.z - DOOR.w / 2, dz1 = DOOR.z + DOOR.w / 2; slab(walls, -H - T, -H, -H, dz0, y0, y1); slab(walls, -H - T, -H, dz1, H, y0, y1); slab(walls, -H - T, -H, dz0, dz1, 2.4, y1);
    // doğu: üç pencere yuvası (açık olan boş, ötekiler taşla örülü — örgü ayrı çizilir)
    const zs = [-H, ...WINDOWS.flatMap((z) => [z - WW / 2, z + WW / 2]), H];
    for (let i = 0; i < zs.length - 1; i += 2) slab(walls, H, H + T, zs[i], zs[i + 1], y0, y1);
    for (const z of WINDOWS) { slab(walls, H, H + T, z - WW / 2, z + WW / 2, y0, WIN_Y - WH / 2); slab(walls, H, H + T, z - WW / 2, z + WW / 2, WIN_Y + WH / 2, y1); }
    // saçak silmesi ve kasnak
    slab(walls, -H - T - 0.15, H + T + 0.15, -H - T - 0.15, H + T + 0.15, y1, y1 + 0.35, 1.5);
    const drum = new THREE.CylinderGeometry(H - 0.2, H, 1.4, 8); drum.rotateY(Math.PI / 8); drum.translate(0, y1 + 1.05, 0); walls.push(drum);
    // iç sıva yüzleri (pencere ve kapı boşlukları dışında, ince)
    const lin = (x0: number, x1: number, z0: number, z1: number) => slab(inner, x0, x1, z0, z1, 0.15, y1 - 0.05, 3);
    lin(-H + 0.02, H - 0.02, -H + 0.01, -H + 0.03); lin(-H + 0.02, H - 0.02, H - 0.03, H - 0.01);
    lin(-H + 0.01, -H + 0.03, -H, dz0); lin(-H + 0.01, -H + 0.03, dz1, H);
    const cl = new THREE.PlaneGeometry(2 * H, 2 * H); cl.rotateX(Math.PI / 2); cl.translate(0, y1 - 0.05, 0); inner.push(cl);
    const dome = new THREE.SphereGeometry(H - 0.2, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2); dome.translate(0, y1 + 1.75, 0);
    const uv = dome.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 8, uv.getY(i) * 2.5);
    // sandukalar: taş kaide + yeşil örtü, başta sarık taşı
    for (const sx of SAND.xs) { slab(sand, sx - SAND.w / 2, sx + SAND.w / 2, SAND.z0, SAND.z1, 0.15, 0.55, 1); const c = bx(SAND.w + 0.08, 0.4, SAND.z1 - SAND.z0 + 0.06, 1); c.translate(sx, 0.75, (SAND.z0 + SAND.z1) / 2); covers.push(c);
      const hs = new THREE.CylinderGeometry(0.16, 0.13, 0.5, 12); hs.translate(sx, 1.2, SAND.z0 + 0.15); sand.push(hs); const tb = new THREE.SphereGeometry(0.2, 12, 8); tb.scale(1, 0.7, 1); tb.translate(sx, 1.5, SAND.z0 + 0.15); covers.push(tb); }
    return { walls: merge(walls), inner: merge(inner), dome, sand: merge(sand), covers: merge(covers) }; }, []);
  // örülü (kapalı) pencereler: açık olan dışındakiler
  const plugs = useMemo(() => WINDOWS.map((z) => { const g = bx(T - 0.06, WH, WW, 1); g.translate(H + T / 2, WIN_Y, z); return g; }), []);
  return <group>
    <mesh geometry={walls} material={m.dressed} castShadow receiveShadow />
    <mesh geometry={inner} material={m.plaster} receiveShadow />
    <mesh geometry={dome} material={m.dressed} castShadow receiveShadow />
    <mesh geometry={sand} material={m.stone} castShadow receiveShadow />
    <mesh geometry={covers} material={m.cloth} castShadow receiveShadow />
    {plugs.map((g, i) => i !== win && <mesh key={i} geometry={g} material={m.stone} castShadow receiveShadow />)}
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.15, 0]} receiveShadow><planeGeometry args={[2 * H, 2 * H]} /><meshStandardMaterial color="#a8987c" roughness={0.95} /></mesh>
  </group>;
}
/** Köy evleri: düz damlı taş evler */
export function Houses({ m }: { m: Mats }) {
  const g = useMemo(() => { const p: Parts = [], d: Parts = []; for (const h of HOUSES) { slab(p, h.x - h.w / 2, h.x + h.w / 2, h.z - h.d / 2, h.z + h.d / 2, -0.5, h.h, 2.5); slab(p, h.x - h.w / 2 - 0.15, h.x + h.w / 2 + 0.15, h.z - h.d / 2 - 0.15, h.z + h.d / 2 + 0.15, h.h, h.h + 0.3, 1.5);
    for (const s of [-1, 1]) { const w = new THREE.PlaneGeometry(0.7, 0.9); w.translate(h.x + s * h.w * 0.25, h.h * 0.55, h.z + h.d / 2 + 0.01); d.push(w); } }
    return { p: merge(p), d: merge(d) }; }, []);
  return <group><mesh geometry={g.p} material={m.stone} castShadow receiveShadow /><mesh geometry={g.d} material={m.dark} /></group>;
}
/** Arazi + doğuda gedikli sırt (gedik tam doğu yönünde) */
export function Ground() {
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(900, 900, 180, 180); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), a = new THREE.Color('#b79f6f'), b = new THREE.Color('#8f8a55');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let y = groundY(x, z);
      if (x > 30) { const t = Math.min(1, (x - 30) / (RIDGE.x - 30)), nf = Math.min(1, Math.max(0, 1 - (Math.abs(z) - 1.5) / 7.5)), near = Math.min(1, Math.max(0, (x - RIDGE.x + 20) / 20));
        const top = RIDGE.top * (1 - 0.88 * nf) + Math.sin(z * 0.05) * 3 * (1 - nf);
        y = Math.max(y, x < RIDGE.x ? t * t * (RIDGE.top * (1 - near) + top * near) : top - (x - RIDGE.x) * 0.3); }
      p.setY(i, y); c.copy(a).lerp(b, 0.4 + 0.3 * Math.sin(x * 0.07 + z * 0.05)); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, []);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow castShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 8; i++) { const a = Math.PI * (0.6 + (i / 7) * 1.6) + r() * 0.15, dd = 800 + r() * 400; out.push({ p: [Math.cos(a) * dd, -10, Math.sin(a) * dd], g: mountainGeo(380 + r() * 200, 120 + r() * 100, 60 + i, 2, '#9a8a64') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
/** Işık hüzmesi: pencereden sandukalara (ya da yanlış yere) giden saydam şerit ve vurduğu yerde parıltı */
export function Beam({ from, to, glow, on }: { from: [number, number, number]; to: [number, number, number]; glow: [number, number, number][]; on: number }) {
  const ref = useRef<THREE.Mesh>(null), mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd38a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const gmat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffc46a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  useEffect(() => { const b = ref.current; if (!b) return; const a = new THREE.Vector3(...from), c = new THREE.Vector3(...to), d = c.clone().sub(a); b.position.copy(a).addScaledVector(d, 0.5); b.scale.set(0.42, 0.62, d.length()); b.lookAt(c); }, [from, to]);
  mat.opacity = 0.32 * on; gmat.opacity = 0.75 * on;
  return <group>
    <mesh ref={ref} material={mat}><boxGeometry args={[1, 1, 1]} /></mesh>
    {glow.map((p, i) => <mesh key={i} position={p} rotation-x={-Math.PI / 2} material={gmat}><circleGeometry args={[0.32, 20]} /></mesh>)}
  </group>;
}
