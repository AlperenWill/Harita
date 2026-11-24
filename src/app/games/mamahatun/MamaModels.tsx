/**
 * Mama Hatun Kümbeti — 3B modeller: sekiz dış bükey dilimli gövde, silmeler, sekiz yüzlü külah; çevresinde iç yüzünde 13 sivri kemerli
 * niş bulunan yuvarlak duvar (altısında sanduka), batıda palmet frizli kapı ve boş kitabe panosu; aşınmış dilimler (onarılınca yenilenir);
 * dışarıda kervansaray, ova ve dağlar. Ölçüler TEMSİLÎDİR (docs/MAMA-HATUN.md).
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, weather } from '../shared/scenery';
import { ERODED, GATE_A, GATE_W, KERVAN, KUMBET, NICHES, RING, SAND_NICHES, lobeAngle } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
function pointed(w: number, h: number) { const s = new THREE.Shape(), r = w / 2, sp = h - r * 1.15; s.moveTo(-r, 0); s.lineTo(-r, sp); s.quadraticCurveTo(-r, sp + r * 0.95, 0, h); s.quadraticCurveTo(r, sp + r * 0.95, r, sp); s.lineTo(r, 0); s.closePath(); return s; }

export interface Mats { stone: THREE.MeshStandardMaterial; dressed: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; eroded: THREE.MeshStandardMaterial; fresh: THREE.MeshStandardMaterial; frieze: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('mama-tas', ['#b29f86', '#a7947b', '#bba890', '#9c8a72'], [24, 12], [50, 40]);
    const dr = stoneTex('mama-kesme', ['#bfae95', '#b5a48b', '#c8b79e'], [28, 6], [70, 30]);
    const er = canvasTex(128, 256, (g, r) => { g.fillStyle = '#9c8b74'; g.fillRect(0, 0, 128, 256); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${r() < 0.6 ? '60,48,36' : '200,190,170'},${0.15 + r() * 0.35})`; g.beginPath(); g.ellipse(r() * 128, r() * 256, 2 + r() * 10, 2 + r() * 6, r() * 3, 0, 7); g.fill(); } });
    const fz = canvasTex(512, 64, (g) => { g.fillStyle = '#c2b196'; g.fillRect(0, 0, 512, 64); g.strokeStyle = '#6e5d48'; g.lineWidth = 4; for (let x = 16; x < 512; x += 32) { g.beginPath(); g.moveTo(x, 54); g.quadraticCurveTo(x - 14, 30, x, 8); g.quadraticCurveTo(x + 14, 30, x, 54); g.stroke(); g.beginPath(); g.moveTo(x - 10, 50); g.quadraticCurveTo(x - 16, 34, x - 12, 22); g.moveTo(x + 10, 50); g.quadraticCurveTo(x + 16, 34, x + 12, 22); g.stroke(); } g.fillStyle = '#6e5d48'; g.fillRect(0, 0, 512, 4); g.fillRect(0, 60, 512, 4); });
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.5, roughness: 0.92 })),
      dressed: weather(new THREE.MeshStandardMaterial({ map: dr.map, bumpMap: dr.bump, bumpScale: 0.4, roughness: 0.88 })),
      dark: new THREE.MeshStandardMaterial({ color: '#2c241c', roughness: 1 }),
      eroded: new THREE.MeshStandardMaterial({ map: er, bumpMap: er, bumpScale: 2, roughness: 1 }),
      fresh: new THREE.MeshStandardMaterial({ color: '#d2c3a8', roughness: 0.85 }),
      frieze: new THREE.MeshStandardMaterial({ map: fz, bumpMap: fz, bumpScale: -1.2, roughness: 0.85 }),
    };
  }, []);
}

/** Dilimli gövde: sekiz dış bükey dilim (yarıçap açıyla dalgalanır), dikey silmeler, kasnak ve sekiz yüzlü külah */
function lobedBody(r: number, h: number, n: number) { const g = new THREE.CylinderGeometry(r, r, h, n * 12, 6, true), p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), f = (((a / (Math.PI * 2)) * n) % 1 + 1) % 1, k = 0.9 + 0.12 * Math.sin(f * Math.PI); p.setXYZ(i, x * k, p.getY(i), z * k); }
  g.computeVertexNormals(); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r * 2.2, uv.getY(i) * h / 3); return g; }
export function Kumbet({ m, fixed }: { m: Mats; fixed: number[] }) {
  const g = useMemo(() => { const st: Parts = [], dr: Parts = [], base = 1.2, R = KUMBET.r, H = KUMBET.h;
    const plinth = new THREE.CylinderGeometry(R + 0.35, R + 0.5, base, 32); plinth.translate(0, base / 2, 0); st.push(plinth);
    const body = lobedBody(R, H, KUMBET.lobes); body.translate(0, base + H / 2, 0); dr.push(body);
    for (let k = 0; k < KUMBET.lobes; k++) { const a = (k / KUMBET.lobes) * Math.PI * 2, s = new THREE.CylinderGeometry(0.06, 0.06, H, 6); s.translate(Math.cos(a) * R * 0.92, base + H / 2, Math.sin(a) * R * 0.92); st.push(s); }
    const cornice = new THREE.CylinderGeometry(R + 0.25, R + 0.05, 0.5, 32); cornice.translate(0, base + H + 0.25, 0); st.push(cornice);
    const cone = new THREE.ConeGeometry(R + 0.35, 3.6, KUMBET.lobes); cone.rotateY(Math.PI / KUMBET.lobes); cone.translate(0, base + H + 0.5 + 1.8, 0); const uv = cone.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, uv.getY(i) * 2); st.push(cone);
    return { st: merge(st), dr: merge(dr) }; }, []);
  // aşınmış dilimlerin yüzü: dilimin önünde ince bir kabuk; onarılınca açık renkli yeni taş
  const patches = useMemo(() => ERODED.map((k) => { const a = lobeAngle(k), tl = (Math.PI * 2) / KUMBET.lobes * 0.8; const c = new THREE.CylinderGeometry(KUMBET.r * 1.03, KUMBET.r * 1.03, 2.4, 10, 1, true, Math.PI / 2 - a - tl / 2, tl); c.translate(0, 1.2 + 1.6, 0); return { k, c }; }), []);
  return <group>
    <mesh geometry={g.st} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.dr} material={m.dressed} castShadow receiveShadow />
    {patches.map(({ k, c }) => <mesh key={k} geometry={c} material={fixed.includes(k) ? m.fresh : m.eroded} castShadow />)}
  </group>;
}
/** Yuvarlak duvar: kapı açıklığı batıda; iç yüzde 13 niş, altısında sanduka; dışta kapı çerçevesi, palmet frizi, boş kitabe panosu */
export function RingWall({ m }: { m: Mats }) {
  const g = useMemo(() => { const st: Parts = [], dk: Parts = [], sd: Parts = [], R = RING.r, T = RING.t, H = RING.h, gap = GATE_W / R;
    const wall = (r: number, open: boolean) => { const c = new THREE.CylinderGeometry(r, r, H, 96, 1, true, Math.PI / 2 - GATE_A + gap / 2, Math.PI * 2 - gap); const uv = c.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r * 2, uv.getY(i) * H / 3); c.translate(0, H / 2, 0); void open; return c; };
    st.push(wall(R + T, true)); const inner = wall(R, true); const n = inner.attributes.normal as THREE.BufferAttribute; for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); const idx = inner.index!; for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i); idx.setX(i, idx.getX(i + 2)); idx.setX(i + 2, a); } st.push(inner);
    const top = new THREE.RingGeometry(R, R + T, 96, 1, GATE_A + gap / 2, Math.PI * 2 - gap); top.rotateX(-Math.PI / 2); top.translate(0, H, 0); st.push(top);
    // kapı yanakları
    for (const s of [-1, 1]) { const a = GATE_A + s * gap / 2, b = bx(T + 0.3, H + 0.6, 0.5, 1.5); b.rotateY(-a); b.translate(Math.cos(a) * (R + T / 2), (H + 0.6) / 2, Math.sin(a) * (R + T / 2)); st.push(b); }
    // nişler (iç yüz, koyu sivri kemer) ve sandukalar
    NICHES.forEach((a, i) => { const ng = new THREE.ShapeGeometry(pointed(1.3, 2.6), 6); ng.rotateY(-a - Math.PI / 2); ng.translate(Math.cos(a) * (R - 0.02), 0.2, Math.sin(a) * (R - 0.02)); dk.push(ng);
      if (SAND_NICHES.includes(i)) { const s = bx(0.7, 0.55, 1.5, 1); s.rotateY(-a); s.translate(Math.cos(a) * (R - 0.55), 0.28, Math.sin(a) * (R - 0.55)); sd.push(s); } });
    return { st: merge(st), dk: merge(dk), sd: merge(sd) }; }, []);
  const R = RING.r, T = RING.t, gx = -(R + T) - 0.05;
  const panel = useMemo(() => canvasTex(256, 96, (g) => { g.fillStyle = '#b8a68c'; g.fillRect(0, 0, 256, 96); g.strokeStyle = '#6e5d48'; g.lineWidth = 6; g.strokeRect(6, 6, 244, 84); }), []);
  return <group>
    <mesh geometry={g.st} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.dk} material={m.dark} />
    <mesh geometry={g.sd} material={m.dressed} castShadow receiveShadow />
    <group position={[gx, 0, 0]} rotation-y={-Math.PI / 2}>
      <mesh material={m.frieze} position={[0, 3.2, 0]}><planeGeometry args={[GATE_W + 1.6, 0.5]} /></mesh>
      <mesh position={[0, 4.1, 0]}><planeGeometry args={[1.8, 0.7]} /><meshStandardMaterial map={panel} roughness={0.95} /></mesh>
      <mesh material={m.dressed} position={[0, 2.85, -0.05]}><boxGeometry args={[GATE_W + 0.4, 0.3, T + 0.2]} /></mesh>
    </group>
  </group>;
}
export function Kervansaray({ m }: { m: Mats }) {
  const g = useMemo(() => { const p: Parts = [], { x0, x1, z0, z1 } = KERVAN; const s = (a: number, b: number, c: number, d: number, h: number) => { const q = bx(b - a, h, d - c, 2.5); q.translate((a + b) / 2, h / 2, (c + d) / 2); p.push(q); };
    s(x0, x1, z0, z0 + 1.5, 5); s(x0, x1, z1 - 1.5, z1, 5); s(x0, x0 + 1.5, z0, z1, 5); s(x1 - 1.5, x1, z0, z1, 5);
    for (let x = x0 + 4; x < x1 - 2; x += 5) { const b = bx(0.9, 0.9, 0.3, 1); b.translate(x, 5.4, z1); p.push(b); }
    return merge(p); }, []);
  const door = useMemo(() => { const d = new THREE.ShapeGeometry(pointed(2.4, 3.6), 8); d.translate((KERVAN.x0 + KERVAN.x1) / 2, 0, KERVAN.z1 + 0.02); return d; }, []);
  return <group><mesh geometry={g} material={m.stone} castShadow receiveShadow /><mesh geometry={door} material={m.dark} /></group>;
}
export function Ground() {
  const tex = useMemo(() => groundTex(), []);
  return <group userData={{ noCast: true }}>
    <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[3000, 3000]} /><meshStandardMaterial color="#a9a274" map={tex.map} bumpMap={tex.bump} bumpScale={0.2} roughness={1} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} receiveShadow><circleGeometry args={[RING.r, 48]} /><meshStandardMaterial color="#b3a68e" roughness={0.95} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[10, 0.012, -14]} receiveShadow><planeGeometry args={[130, 5]} /><meshStandardMaterial color="#c3b394" roughness={1} /></mesh>
  </group>;
}
export function Mountains() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + r() * 0.3, dd = 1200 + r() * 500; out.push({ p: [Math.cos(a) * dd, -10, Math.sin(a) * dd], g: mountainGeo(500 + r() * 300, 260 + r() * 260, 60 + i, 0.75, '#857c62') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
