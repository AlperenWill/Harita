/**
 * SEKA Kâğıt Müzesi — 3B modeller. Kırmızı tuğla fabrika salonu (testere dişli çatı, tavan penceresi), uzun kâğıt makinesi (kurutma silindirleri,
 * pres merdaneleri, beyaz kâğıt şeridi), cam vitrinler, matbaa makineleri, avluda baca ve havuz. Ölçüler, makine hattı ve vitrin içerikleri
 * TEMSİLÎDİR (docs/SEKA.md).
 */
import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, useGrassCards } from '../shared/scenery';
import { CHIMNEY, DOOR, HALL, MACHINE, PANEL_HALF, POND, PRESSES, STATIONS, VITRINS, WALL_T, YARD } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.62, 0.6).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const slab = (p: Parts, x0: number, x1: number, z0: number, z1: number, h: number, y0 = 0, s = 2.4) => { const g = bx(x1 - x0, h, z1 - z0, s); g.translate((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2); p.push(g); };
const H = 9;

/* ===================== malzemeler ===================== */
export interface Mats { brick: THREE.MeshStandardMaterial; floor: THREE.MeshStandardMaterial; steel: THREE.MeshStandardMaterial; paper: THREE.MeshStandardMaterial; glass: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; water: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const br = canvasTex(256, 256, (g, r) => { g.fillStyle = '#9a4a34'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 16) for (let x = 0; x < 256; x += 32) { const v = 0.78 + r() * 0.4, o = ((y / 16) % 2) * 16; g.fillStyle = `rgb(${(158 * v) | 0},${(74 * v) | 0},${(52 * v) | 0})`; g.fillRect(x + o + 1, y + 1, 30, 14); } });
    br.repeat.set(1, 1);
    const fl = canvasTex(256, 256, (g, r) => { g.fillStyle = '#a7a39a'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '60,58,54' : '220,216,206'},${r() * 0.14})`; g.fillRect(r() * 256, r() * 256, 4, 4); } g.strokeStyle = 'rgba(70,66,60,0.35)'; g.lineWidth = 2; for (let i = 0; i < 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } });
    fl.repeat.set(16, 8);
    const rf = canvasTex(256, 256, (g, r) => { g.fillStyle = '#6a6e70'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * 256, r() * 256, 40, 2); } });
    return {
      brick: new THREE.MeshStandardMaterial({ map: br, roughness: 0.95 }),
      floor: new THREE.MeshStandardMaterial({ map: fl, roughness: 0.85 }),
      steel: new THREE.MeshStandardMaterial({ color: '#8c949a', roughness: 0.4, metalness: 0.7 }),
      paper: new THREE.MeshStandardMaterial({ color: '#f4f0e4', roughness: 0.9 }),
      glass: new THREE.MeshStandardMaterial({ color: '#cfe6ef', transparent: true, opacity: 0.22, roughness: 0.05 }),
      dark: new THREE.MeshStandardMaterial({ color: '#25272a', roughness: 0.6, metalness: 0.4 }),
      roof: new THREE.MeshStandardMaterial({ map: rf, roughness: 0.8 }),
      water: new THREE.MeshStandardMaterial({ color: '#4a7f8c', roughness: 0.15, metalness: 0.1 }),
    };
  }, []);
}

/* ===================== fabrika salonu ===================== */
export function Hall({ m, tier }: { m: Mats; tier: Tier }) {
  const walls = useMemo(() => { const p: Parts = [], B = HALL, t = WALL_T;
    slab(p, B.x0, B.x1, B.z0, B.z0 + t, H, 0); slab(p, B.x0, B.x0 + t, B.z0, B.z1, H, 0); slab(p, B.x1 - t, B.x1, B.z0, B.z1, H, 0);
    slab(p, B.x0, DOOR.x0, B.z1 - t, B.z1, H, 0); slab(p, DOOR.x1, B.x1, B.z1 - t, B.z1, H, 0); slab(p, DOOR.x0, DOOR.x1, B.z1 - t, B.z1, H - 4.4, 4.4);
    // pencere şeritleri: koyu bantlar (dış yüzde)
    return merge(p); }, []);
  const roof = useMemo(() => { const p: Parts = [], W = HALL.x1 - HALL.x0, n = 8, w = W / n;
    // testere dişli çatı: her diş eğimli bir levha ve dikey cam yüzü
    for (let i = 0; i < n; i++) { const x0 = HALL.x0 + i * w, s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, 2.4); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: HALL.z1 - HALL.z0 + 1, bevelEnabled: false }); g.translate(x0, H, HALL.z0 - 0.5); p.push(g); }
    return merge(p); }, []);
  const glassFaces = useMemo(() => { const p: Parts = [], W = HALL.x1 - HALL.x0, n = 8, w = W / n;
    for (let i = 0; i < n; i++) { const g = new THREE.PlaneGeometry(HALL.z1 - HALL.z0, 2.2); g.rotateY(-Math.PI / 2); g.translate(HALL.x0 + (i + 1) * w - 0.02, H + 1.3, (HALL.z0 + HALL.z1) / 2); p.push(g); }
    return merge(p); }, []);
  // uzun duvarlarda yüksek fabrika pencereleri (iç ve dış yüzde aydınlık camlar, demir kayıtlarıyla)
  const wins = useMemo(() => { const gl: Parts = [], fr: Parts = [];
    for (let x = HALL.x0 + 4; x <= HALL.x1 - 4; x += 6) for (const [z, ry] of [[HALL.z0 + WALL_T + 0.02, 0], [HALL.z0 - 0.02, Math.PI], [HALL.z1 - WALL_T - 0.02, Math.PI], [HALL.z1 + 0.02, 0]] as const) {
      const g = new THREE.PlaneGeometry(3.6, 3.4); g.rotateY(ry); g.translate(x, 6.4, z); gl.push(g);
      for (let k = -1; k <= 1; k++) { const v = bx(0.08, 3.4, 0.08, 1); v.translate(x + k * 1.2, 6.4, z); fr.push(v); } for (const yy of [5.25, 6.4, 7.55]) { const h = bx(3.6, 0.08, 0.08, 1); h.translate(x, yy, z); fr.push(h); } }
    return { gl: merge(gl), fr: merge(fr) }; }, []);
  const floor = useMemo(() => { const g = new THREE.PlaneGeometry(HALL.x1 - HALL.x0 - 0.2, HALL.z1 - HALL.z0 - 0.2); g.rotateX(-Math.PI / 2); g.translate(0, 0.02, 0); return g; }, []);
  const vit = useMemo(() => { const base: Parts = [], glass: Parts = [], goods: Parts = [], r = rng(31);
    for (const v of VITRINS) { const cx = (v.x0 + v.x1) / 2, cz = (v.z0 + v.z1) / 2, w = v.x1 - v.x0, d = v.z1 - v.z0;
      base.push(bx(w, 0.9, d, 1.5).translate(cx, 0.45, cz)); glass.push(new THREE.BoxGeometry(w - 0.1, 1.8, d - 0.1).translate(cx, 1.8, cz));
      for (let k = 0; k < 3; k++) goods.push(bx(0.5, 0.05 + r() * 0.5, 0.4, 0.5).translate(cx - 0.9 + k * 0.9, 1.0 + 0.2, cz)); }
    return { base: merge(base), glass: merge(glass), goods: merge(goods) }; }, []);
  const presses = useMemo(() => { const dk: Parts = [], st: Parts = [];
    for (const q of PRESSES) { const cx = (q.x0 + q.x1) / 2, cz = (q.z0 + q.z1) / 2, w = q.x1 - q.x0, d = q.z1 - q.z0;
      dk.push(bx(w, 1.6, d, 1.5).translate(cx, 0.8, cz)); const c = new THREE.CylinderGeometry(0.5, 0.5, d - 0.3, 14); c.rotateX(Math.PI / 2); c.translate(cx - w / 4, 2, cz); st.push(c); const c2 = c.clone(); c2.translate(w / 2, 0, 0); st.push(c2); }
    return { dk: merge(dk), st: merge(st) }; }, []);
  const lights = tier === 'low' ? [[-14, 0], [14, 0]] : [[-24, -8], [-8, -8], [8, -8], [-24, 8], [-8, 8], [8, 8], [24, 0]];
  return <group>
    <mesh geometry={walls} material={m.brick} castShadow receiveShadow />
    <mesh geometry={roof} material={m.roof} castShadow />
    <mesh geometry={glassFaces}><meshStandardMaterial color="#dfeaf0" emissive="#cfe0ea" emissiveIntensity={0.5} side={THREE.DoubleSide} transparent opacity={0.6} /></mesh>
    <mesh geometry={floor} material={m.floor} receiveShadow />
    <mesh geometry={wins.gl}><meshStandardMaterial color="#e8f0f4" emissive="#dfeaf2" emissiveIntensity={0.9} /></mesh>
    <mesh geometry={wins.fr} material={m.dark} />
    <mesh geometry={vit.base} material={m.dark} castShadow receiveShadow />
    <mesh geometry={vit.glass} material={m.glass} />
    <mesh geometry={vit.goods} material={m.paper} />
    <mesh geometry={presses.dk} material={m.dark} castShadow receiveShadow />
    <mesh geometry={presses.st} material={m.steel} castShadow />
    {lights.map(([x, z], i) => <pointLight key={i} position={[x, 6.4, z]} color="#fff0d6" intensity={tier === 'low' ? 60 : 70} distance={22} decay={2} />)}
  </group>;
}

/* ===================== avlu, baca, havuz ===================== */
export function Yard({ m }: { m: Mats }) {
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(YARD.x1 - YARD.x0, YARD.z1 - YARD.z0); g.rotateX(-Math.PI / 2); g.translate(0, 0.01, (YARD.z0 + YARD.z1) / 2); return g; }, []);
  const chimney = useMemo(() => { const p: Parts = [], H2 = 38;
    const c = new THREE.CylinderGeometry(CHIMNEY.r * 0.7, CHIMNEY.r, H2, 20); c.translate(CHIMNEY.c[0], H2 / 2, CHIMNEY.c[1]); p.push(c);
    return merge(p); }, []);
  const bands = useMemo(() => { const p: Parts = [];
    for (const y of [30, 33, 36]) { const c = new THREE.CylinderGeometry(CHIMNEY.r * 0.7 + 0.15 + (38 - y) * 0.01, CHIMNEY.r * 0.7 + 0.15 + (38 - y) * 0.01, 1.2, 20); c.translate(CHIMNEY.c[0], y, CHIMNEY.c[1]); p.push(c); }
    return merge(p); }, []);
  return <group>
    <mesh geometry={geo} material={m.floor} receiveShadow />
    <mesh geometry={chimney} material={m.brick} castShadow receiveShadow />
    <mesh geometry={bands} material={m.paper} />
    <mesh position={[POND.c[0], 0.08, POND.c[1]]} rotation-x={-Math.PI / 2}><circleGeometry args={[POND.r, 28]} /><primitive object={m.water} attach="material" /></mesh>
    <mesh position={[POND.c[0], 0.2, POND.c[1]]} rotation-x={-Math.PI / 2} castShadow receiveShadow><ringGeometry args={[POND.r, POND.r + 0.5, 28]} /><primitive object={m.dark} attach="material" /></mesh>
  </group>;
}
export function Ground({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(500, 500, tier === 'high' ? 40 : 20, tier === 'high' ? 40 : 20); g.rotateX(-Math.PI / 2); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} position={[0, -0.25, 0]} receiveShadow userData={{ noCast: true }}><meshStandardMaterial color="#8da466" map={tex.map} bumpMap={tex.bump} bumpScale={0.2} roughness={1} /></mesh>;
}
export function Trees({ n }: { n: number }) {
  const geo = useMemo(() => { const r = rng(3), parts: Parts = []; const t = new THREE.CylinderGeometry(0.3, 0.45, 3.6, 7); t.translate(0, 1.8, 0); parts.push(t);
    for (let i = 0; i < 6; i++) { const a = r() * 6.28, d = i ? 1.5 + r() : 0, c = new THREE.IcosahedronGeometry(2 + r() * 0.5, 1); c.translate(Math.cos(a) * d, 5 + r() * 1.2, Math.sin(a) * d); parts.push(c); }
    const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4f7a3a', roughness: 0.95 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(21), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 8 && k < n; i++) { const x = -110 + r() * 220, z = -60 + r() * 150;
      const nearHall = x > HALL.x0 - 6 && x < HALL.x1 + 6 && z > HALL.z0 - 6 && z < HALL.z1 + 6, inYard = x > YARD.x0 - 1 && x < YARD.x1 + 1 && z > YARD.z0 - 1 && z < YARD.z1 + 1;
      if (nearHall || inYard) continue;
      o.position.set(x, -0.25, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.9 + r() * 0.6); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -110 + r() * 220, z = -60 + r() * 150;
      if ((x > HALL.x0 - 2 && x < HALL.x1 + 2 && z > HALL.z0 - 2 && z < HALL.z1 + 2) || (x > YARD.x0 && x < YARD.x1 && z > YARD.z0 && z < YARD.z1)) continue;
      o.position.set(x, -0.2, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.23 + r() * 0.05, 0.45, 0.4 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + r() * 0.2, dd = 650 + r() * 300; out.push({ p: [Math.cos(a) * dd, -8, Math.sin(a) * dd], g: mountainGeo(340 + r() * 160, 130 + r() * 110, 250 + i, 0, '#5d7048') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}

/* ===================== kâğıt hattı (çalıştırılabilir) ===================== */
/** Çalışan bölüm sayısı ve son bölüm çalıştıktan sonra geçen süre (rulo büyür); oyun yöneticisi yazar, model okur */
export const line = { running: 0, reel: 0 };
type Roll = { x: number; y: number; r: number; st: number; dir?: number };
/** Hamur kasası, elek masası, pres merdaneleri, iki sıra kurutma silindiri ve buhar başlığı, kalender yığını ve sarıcı. Bölüm i, line.running > i
 * olunca çalışır: merdaneleri döner, kâğıt şeridi o bölüme ulaşır. Biçimler ve ölçüler TEMSİLÎDİR. */
export function PaperLine({ m }: { m: Mats }) {
  const M = MACHINE, D = M.z1 - M.z0, L = D - 0.5;
  const wireTex = useMemo(() => { const t = canvasTex(128, 128, (g) => { g.fillStyle = '#3d4f5c'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#6f8494'; g.lineWidth = 1; for (let i = 0; i < 128; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); } g.fillStyle = 'rgba(255,255,255,0.10)'; for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 6, 128); }); t.repeat.set(10, 2); return t; }, []);
  const mats = useMemo(() => ({ wire: new THREE.MeshStandardMaterial({ map: wireTex, roughness: 0.5, metalness: 0.4 }),
    wet: new THREE.MeshStandardMaterial({ color: '#cdc7b6', roughness: 0.35, transparent: true, opacity: 0.92 }),
    felt: new THREE.MeshStandardMaterial({ color: '#3b3a37', roughness: 1 }),
    hood: new THREE.MeshStandardMaterial({ color: '#4f6b5a', roughness: 0.6, metalness: 0.3 }),
    steam: new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.0, roughness: 1, depthWrite: false }) }), [wireTex]);
  const frame = useMemo(() => { const st: Parts = [], dk: Parts = [];
    dk.push(bx(M.x1 - M.x0, 0.5, D, 4).translate((M.x0 + M.x1) / 2, 0.25, 0));
    // hamur kasası ve besleme borusu
    st.push(bx(3.2, 2.1, D - 0.4, 2).translate(-24, 1.55, 0)); const lip = bx(0.6, 0.3, D - 0.4, 1); lip.translate(-22.2, 1.35, 0); st.push(lip);
    const pipe = new THREE.CylinderGeometry(0.35, 0.35, 4, 12); pipe.translate(-25, 4.6, 0); st.push(pipe); const pipe2 = new THREE.CylinderGeometry(0.35, 0.35, 6, 12); pipe2.rotateZ(Math.PI / 2); pipe2.translate(-28, 6.4, 0); st.push(pipe2);
    // elek masası: ayaklar ve emiş kutuları
    for (let x = -20.5; x <= -9.5; x += 2.75) for (const z of [-D / 2 + 0.2, D / 2 - 0.2]) st.push(bx(0.25, 0.8, 0.25, 1).translate(x, 0.8, z));
    for (let x = -19; x <= -11; x += 2) dk.push(bx(1.2, 0.5, D - 0.8, 1).translate(x, 0.85, 0));
    // yan çerçeveler: pres, kurutma, kalender, sarıcı
    for (const [x0, x1, h] of [[-9, -3, 2.6], [-3, 10, 4.2], [10, 11.6, 4.2], [12, 14, 3.2]] as const) for (const z of [-D / 2 + 0.15, D / 2 - 0.15]) { st.push(bx(x1 - x0, 0.3, 0.3, 2).translate((x0 + x1) / 2, h, z)); st.push(bx(0.3, h - 0.5, 0.3, 1).translate(x0 + 0.15, 0.5 + (h - 0.5) / 2, z)); st.push(bx(0.3, h - 0.5, 0.3, 1).translate(x1 - 0.15, 0.5 + (h - 0.5) / 2, z)); }
    // pres keçeleri: merdanelerin üstünden geçen koyu bantlar (görsel)
    const felt = bx(6, 0.06, L, 2); felt.translate(-6, 2.42, 0); dk.push(felt);
    // kumanda panoları
    for (const q of STATIONS) { const d = bx(PANEL_HALF[0] * 2, 1.0, PANEL_HALF[1] * 2, 1); d.translate(q.panel[0], 0.5, q.panel[1]); dk.push(d); const top = bx(PANEL_HALF[0] * 2, 0.08, 0.7, 1); top.rotateX(-0.5); top.translate(q.panel[0], 1.1, q.panel[1] + 0.05); st.push(top); }
    return { st: merge(st), dk: merge(dk) }; }, [D, L, M.x0, M.x1]);
  const rolls = useMemo(() => { const o: Roll[] = [];
    o.push({ x: -21, y: 1.0, r: 0.35, st: 1 }, { x: -9.3, y: 1.0, r: 0.4, st: 1 });
    for (const x of [-8, -6, -4]) o.push({ x, y: 1.95, r: 0.45, st: 2, dir: -1 }, { x, y: 1.0, r: 0.45, st: 2 });
    for (let i = 0; i < 7; i++) o.push({ x: -2 + i * 1.9, y: 1.45, r: 0.85, st: 3 }); for (let i = 0; i < 6; i++) o.push({ x: -1.05 + i * 1.9, y: 3.15, r: 0.85, st: 3, dir: -1 });
    for (let i = 0; i < 5; i++) o.push({ x: 10.8, y: 0.95 + i * 0.66, r: 0.31, st: 4, dir: i % 2 ? -1 : 1 });
    return o; }, []);
  const rollRefs = useRef<(THREE.Mesh | null)[]>([]), webRefs = useRef<(THREE.Object3D | null)[]>([]), reelRef = useRef<THREE.Mesh>(null), lamps = useRef<(THREE.Mesh | null)[]>([]), steamRefs = useRef<(THREE.Mesh | null)[]>([]);
  const steamMats = useMemo(() => [0, 1, 2, 3, 4, 5].map(() => mats.steam.clone()), [mats]);
  const lampMats = useMemo(() => STATIONS.map(() => new THREE.MeshStandardMaterial({ color: '#b33', emissive: '#b33', emissiveIntensity: 0.8 })), []);
  useFrame(({ clock }, dt) => { const run = line.running, t = clock.elapsedTime;
    rolls.forEach((r, i) => { const mm = rollRefs.current[i]; if (mm && run > r.st) mm.rotation.y -= (r.dir ?? 1) * dt * 2.2 / r.r; });
    if (run > 1) wireTex.offset.x -= dt * 0.35;
    webRefs.current.forEach((w, i) => { if (w) w.visible = run > i; });
    if (run >= 5) line.reel = Math.min(1, line.reel + dt * 0.02);
    if (reelRef.current) { const rr = 0.3 + line.reel * 1.1; reelRef.current.scale.set(rr, 1, rr); reelRef.current.visible = run >= 5; if (run >= 5) reelRef.current.rotation.y -= dt * 2.2 / rr; }
    lampMats.forEach((mt, i) => { const c = i < run ? '#2fbf62' : i === run ? (Math.sin(t * 6) > 0 ? '#f2b233' : '#5a4a20') : '#b33'; mt.color.set(c); mt.emissive.set(c); });
    steamRefs.current.forEach((sm, i) => { if (!sm) return; const ph = (t * 0.25 + i / 6) % 1; sm.visible = run >= 4; sm.position.y = 4.8 + ph * 3.2; sm.scale.setScalar(0.5 + ph * 1.2); (sm.material as THREE.MeshStandardMaterial).opacity = 0.35 * (1 - ph); });
  });
  const hy = 1.3;   // ıslak tabakanın elek üstündeki yüksekliği
  return <group>
    <mesh geometry={frame.st} material={m.steel} castShadow receiveShadow />
    <mesh geometry={frame.dk} material={m.dark} castShadow receiveShadow />
    {/* elek bandı */}
    <mesh position={[-15, 1.22, 0]} rotation-x={-Math.PI / 2} receiveShadow material={mats.wire}><planeGeometry args={[12, L]} /></mesh>
    {/* kurutma başlığı (buhar davlumbazı) ve bacaları */}
    <mesh position={[3.5, 4.55, 0]} material={mats.hood} castShadow><boxGeometry args={[13.4, 0.5, D + 0.2]} /></mesh>
    {[0, 4, 8].map((x) => <mesh key={x} position={[x - 1, 6.4, 0]} material={mats.hood}><cylinderGeometry args={[0.35, 0.35, 3.4, 10]} /></mesh>)}
    {rolls.map((r, i) => <group key={i} position={[r.x, r.y, 0]} rotation-x={Math.PI / 2}><mesh ref={(mm) => { rollRefs.current[i] = mm; }} material={r.st === 3 ? m.steel : r.st === 2 && r.y > 1.5 ? mats.felt : m.steel} castShadow><cylinderGeometry args={[r.r, r.r, L, r.st === 3 ? 22 : 14]} /></mesh></group>)}
    {/* kâğıt şeridi: bölüm bölüm (0: hamur perdesi, 1: elekteki ıslak tabaka, 2: pres, 3: kurutma, 4: kalender) */}
    <group ref={(o) => { webRefs.current[0] = o; }}><mesh position={[-21.6, 1.3, 0]} rotation-z={-0.2} material={mats.wet}><boxGeometry args={[1.3, 0.05, L - 0.2]} /></mesh></group>
    <group ref={(o) => { webRefs.current[1] = o; }}><mesh position={[-15, hy, 0]} material={mats.wet}><boxGeometry args={[12, 0.04, L - 0.3]} /></mesh></group>
    <group ref={(o) => { webRefs.current[2] = o; }}><mesh position={[-6, 1.47, 0]} material={mats.wet}><boxGeometry args={[6.4, 0.04, L - 0.3]} /></mesh></group>
    <group ref={(o) => { webRefs.current[3] = o; }}><mesh position={[3.5, 2.3, 0]} material={m.paper}><boxGeometry args={[13, 0.04, L - 0.3]} /></mesh></group>
    <group ref={(o) => { webRefs.current[4] = o; }}><mesh position={[11.6, 2.2, 0]} rotation-z={0.25} material={m.paper}><boxGeometry args={[3.2, 0.04, L - 0.3]} /></mesh></group>
    {/* sarıcı: büyüyen kâğıt rulosu */}
    <group position={[13.2, 1.8, 0]} rotation-x={Math.PI / 2}><mesh ref={reelRef} material={m.paper} castShadow visible={false}><cylinderGeometry args={[1, 1, L, 28]} /></mesh></group>
    <group position={[13.2, 1.8, 0]} rotation-x={Math.PI / 2}><mesh material={m.dark}><cylinderGeometry args={[0.22, 0.22, D + 0.4, 10]} /></mesh></group>
    {/* buhar */}
    {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} ref={(mm) => { steamRefs.current[i] = mm; }} position={[(i % 3) * 4 - 1 + (i > 2 ? 0.6 : 0), 5, (i % 2) - 0.5]} material={steamMats[i]} visible={false}><sphereGeometry args={[0.6, 10, 8]} /></mesh>)}
    {/* pano lambaları */}
    {STATIONS.map((q, i) => <mesh key={q.id} ref={(mm) => { lamps.current[i] = mm; }} position={[q.panel[0] + 0.35, 1.35, q.panel[1] + 0.1]} material={lampMats[i]}><sphereGeometry args={[0.1, 10, 8]} /></mesh>)}
  </group>;
}
