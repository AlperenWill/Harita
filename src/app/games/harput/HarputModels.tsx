/**
 * Harput — 3B modeller: kayalık tepe, tepe düzlüğünde yuvarlak surlar ve burçlar, güneyde kapı, doğuda gedik (örülen sıralar), harç
 * teknesi, zindan ağzı; yamaçlarda sürüler; aşağıda eski Harput evleri, Ulu Camii ve eğik tuğla minare. Ölçüler TEMSİLÎDİR.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, weather } from '../shared/scenery';
import { BREACH_A, BREACH_HALF, COURSES, GATE_A, GATE_HALF, HERDS, HILL, MOSQUE, TROUGH, WALL, terrain } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const Y = HILL.top;

export interface Mats { stone: THREE.MeshStandardMaterial; rock: THREE.MeshStandardMaterial; brick: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; house: THREE.MeshStandardMaterial; fresh: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('harput-sur', ['#9d8f7c', '#918371', '#a89a86', '#857866'], [24, 16], [40, 50]);
    const rk = stoneTex('harput-kaya', ['#8d8170', '#837764', '#998d79'], [60, 50], [100, 120]);
    const hs = stoneTex('harput-ev', ['#c4b294', '#b9a78a', '#ccbb9e', '#b2a083'], [20, 12], [36, 40]), fr = stoneTex('harput-yeni', ['#cdbfa6', '#c4b59b', '#d4c7ae'], [24, 10], [40, 50]);
    const brick = canvasTex(256, 256, (g, r) => { g.fillStyle = '#b8a48a'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 10) for (let x = -((y / 10) % 2) * 10; x < 256; x += 20) { const v = 0.82 + r() * 0.3; g.fillStyle = `rgb(${(165 * v) | 0},${(100 * v) | 0},${(70 * v) | 0})`; g.fillRect(x + 1, y + 1, 18, 8); } });
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.6, roughness: 0.93 })),
      rock: new THREE.MeshStandardMaterial({ map: rk.map, bumpMap: rk.bump, bumpScale: 1, roughness: 0.97 }),
      brick: new THREE.MeshStandardMaterial({ map: brick, roughness: 0.85 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a231c', roughness: 1 }),
      house: weather(new THREE.MeshStandardMaterial({ map: hs.map, bumpMap: hs.bump, bumpScale: 0.4, roughness: 0.95 })),
      fresh: new THREE.MeshStandardMaterial({ map: fr.map, bumpMap: fr.bump, bumpScale: 0.5, roughness: 0.9 }),
    };
  }, []);
}
export function Ground({ m }: { m: Mats }) {
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(260, 260, 200, 200); g.rotateX(-Math.PI / 2); g.translate(0, 0, 15);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), gr = new THREE.Color('#a39d70'), rk = new THREE.Color('#9a8e7a');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = terrain(x, z); p.setY(i, y - 0.02); const d = Math.hypot(x, z); c.copy(gr).lerp(rk, d > HILL.platR && d < HILL.r ? 0.7 : 0.2); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, []);
  const tex = useMemo(() => groundTex(), []);
  void m;
  return <group userData={{ noCast: true }}>
    <mesh geometry={geo} receiveShadow><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.3} roughness={1} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.1, 0]}><planeGeometry args={[6000, 6000]} /><meshStandardMaterial color="#a59e70" roughness={1} /></mesh>
  </group>;
}
const angDiff = (a: number, b: number) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
/** Surlar: kapı ve gedik dışındaki yaylar, burçlar, mazgallar; gedikte örülen sıralar */
export function Walls({ m, courses }: { m: Mats; courses: number }) {
  const g = useMemo(() => { const p: Parts = [], R = WALL.r, T = WALL.t, H = WALL.h, n = 120;
    for (let i = 0; i < n; i++) { const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2; if (angDiff(am, GATE_A) < GATE_HALF || angDiff(am, BREACH_A) < BREACH_HALF) continue;
      const len = R * (a1 - a0) + 0.05, b = bx(T, H + 3, len, 2.5); b.rotateY(-am); b.translate(Math.cos(am) * (R + T / 2), Y + (H + 3) / 2 - 3, Math.sin(am) * (R + T / 2)); p.push(b);
      if (i % 2 === 0) { const mm = bx(T * 0.5, 1.2, len * 0.6, 1.5); mm.rotateY(-am); mm.translate(Math.cos(am) * (R + T * 0.8), Y + H + 0.6, Math.sin(am) * (R + T * 0.8)); p.push(mm); } }
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.2; if (angDiff(a, GATE_A) < 0.3 || angDiff(a, BREACH_A) < 0.3) continue; const t = new THREE.CylinderGeometry(3.6, 3.9, H + 6, 18); t.translate(Math.cos(a) * (R + T), Y + (H + 6) / 2 - 3, Math.sin(a) * (R + T)); p.push(t); }
    // kapının üstü (lento) ve iki yan burç
    const ga = GATE_A, gl = 2 * GATE_HALF * R + 0.2, lt = bx(T, 3, gl, 2); lt.rotateY(-ga); lt.translate(Math.cos(ga) * (R + T / 2), Y + H - 1.5, Math.sin(ga) * (R + T / 2)); p.push(lt);
    for (const s of [-1, 1]) { const a = ga + s * (GATE_HALF + 0.08), t = new THREE.CylinderGeometry(2.8, 3, H + 4, 16); t.translate(Math.cos(a) * (R + T), Y + (H + 4) / 2 - 3, Math.sin(a) * (R + T)); p.push(t); }
    // gediğin tabanı ve yıkıntı
    const r = rng(3); for (let i = 0; i < 14; i++) { const a = BREACH_A + (r() - 0.5) * BREACH_HALF * 2.4, d = R + T + 1 + r() * 4, b = bx(0.6 + r() * 0.8, 0.4 + r() * 0.5, 0.6 + r() * 0.8, 1); b.rotateY(r() * 3); b.translate(Math.cos(a) * d, terrain(Math.cos(a) * d, Math.sin(a) * d) + 0.2, Math.sin(a) * d); p.push(b); }
    return merge(p); }, []);
  const course = useMemo(() => { const len = 2 * BREACH_HALF * WALL.r + 0.3, b = bx(WALL.t, H_C, len, 2); return b; }, []);
  return <group>
    <mesh geometry={g} material={m.stone} castShadow receiveShadow />
    {Array.from({ length: COURSES }, (_, i) => i < courses && <mesh key={i} geometry={course} material={m.fresh} position={[Math.cos(BREACH_A) * (WALL.r + WALL.t / 2), Y + H_C / 2 + i * H_C, Math.sin(BREACH_A) * (WALL.r + WALL.t / 2)]} rotation-y={-BREACH_A} castShadow receiveShadow />)}
  </group>;
}
const H_C = 1.1;
/** Harç teknesi (sütle karılınca açık renk), zindan ağzı, iskele */
export function Works({ m, mortar }: { m: Mats; mortar: number }) {
  return <group>
    <group position={[TROUGH[0], Y, TROUGH[1]]}>
      <mesh material={m.stone} position={[0, 0.35, 0]} castShadow receiveShadow><boxGeometry args={[2, 0.7, 1.2]} /></mesh>
      <mesh position={[0, 0.71, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[1.7, 0.9]} /><meshStandardMaterial color={mortar > 0 ? '#ece6d6' : '#6f6656'} roughness={0.6} /></mesh>
    </group>
    <group position={[-10, Y, -12]}>
      <mesh material={m.stone} position={[0, 0.4, 0]} castShadow receiveShadow><boxGeometry args={[3.4, 0.8, 2.6]} /></mesh>
      <mesh material={m.dark} position={[0, 0.81, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[2.2, 1.4]} /></mesh>
    </group>
  </group>;
}
/** Sürüler: yamaçta otlayan koyunlar (yuvarlak gövdeler) */
export function Herds({ milked }: { milked: number[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => { const b = new THREE.SphereGeometry(0.45, 10, 8); b.scale(1.3, 0.9, 0.9); b.translate(0, 0.65, 0); const h = new THREE.SphereGeometry(0.2, 8, 6); h.translate(0.6, 0.8, 0); return merge([b, h]); }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ece6da', roughness: 1 }), []);
  useEffect(() => { const o = new THREE.Object3D(), r = rng(7); let k = 0;
    HERDS.forEach(([hx, hz]) => { for (let i = 0; i < 9; i++) { const x = hx + (r() - 0.5) * 5, z = hz + (r() - 0.5) * 5; o.position.set(x, terrain(x, z), z); o.rotation.set(0, r() * 6, 0); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); } });
    if (ref.current) { ref.current.count = k; ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); } }, []);
  void milked;
  return <instancedMesh ref={ref} args={[geo, mat, 27]} castShadow />;
}
/** Eski Harput evleri, Ulu Camii ve eğik minare (minare doğuya eğik; açı temsilî) */
export function Town({ m }: { m: Mats }) {
  const houses = useMemo(() => { const p: Parts = [], r = rng(13); for (let i = 0; i < 40; i++) { const a = Math.PI * (0.15 + r() * 0.7), d = 46 + r() * 30, x = Math.cos(a) * d, z = Math.sin(a) * d; if (x > MOSQUE.x0 - 6 && x < MOSQUE.x1 + 6 && z > MOSQUE.z0 - 6 && z < MOSQUE.z1 + 8) continue; if (Math.abs(x) < 6) continue;
    const w = 5 + r() * 4, dd = 5 + r() * 4, h = 3 + r() * 3, b = bx(w, h + 2, dd, 2.5); b.translate(x, terrain(x, z) + h / 2 - 1, z); p.push(b); } return merge(p); }, []);
  const mosque = useMemo(() => { const p: Parts = [], d: Parts = [], { x0, x1, z0, z1 } = MOSQUE, y = terrain((x0 + x1) / 2, (z0 + z1) / 2); const b = bx(x1 - x0, 7, z1 - z0, 2.5); b.translate((x0 + x1) / 2, y + 2.5, (z0 + z1) / 2); p.push(b);
    const top = bx(x1 - x0 + 0.4, 0.4, z1 - z0 + 0.4, 2); top.translate((x0 + x1) / 2, y + 6.2, (z0 + z1) / 2); p.push(top);
    for (let x = x0 + 2.5; x < x1 - 1; x += 3.5) { const w = new THREE.PlaneGeometry(0.9, 1.6); w.translate(x, y + 3.6, z1 + 0.02); d.push(w); }
    const door = new THREE.PlaneGeometry(1.8, 2.8); door.translate((x0 + x1) / 2, y + 0.4, z1 + 0.03); d.push(door);
    return { g: merge(p), d: merge(d), y }; }, []);
  const minaret = useMemo(() => { const g = new THREE.CylinderGeometry(1.4, 1.8, 22, 20); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 8); g.translate(0, 11, 0); return g; }, []);
  const [mx, mz] = MOSQUE.minaret, my = terrain(mx, mz) - 1;
  return <group>
    <mesh geometry={houses} material={m.house} castShadow receiveShadow />
    <mesh geometry={mosque.g} material={m.stone} castShadow receiveShadow />
    <mesh geometry={mosque.d} material={m.dark} />
    <group position={[mx, my, mz]} rotation-z={-0.09}>
      <mesh geometry={minaret} material={m.brick} castShadow receiveShadow />
      <mesh material={m.brick} position={[0, 22.4, 0]}><cylinderGeometry args={[1.6, 1.4, 0.8, 20]} /></mesh>
    </group>
  </group>;
}
export function Mountains() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + r() * 0.3, dd = 1400 + r() * 500; out.push({ p: [Math.cos(a) * dd, -10, Math.sin(a) * dd], g: mountainGeo(500 + r() * 300, 220 + r() * 220, 60 + i, 0.8, '#867a62') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
