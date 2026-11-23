/**
 * SEKA Kâğıt Müzesi — 3B modeller. Kırmızı tuğla fabrika salonu (testere dişli çatı, tavan penceresi), uzun kâğıt makinesi (kurutma silindirleri,
 * pres merdaneleri, beyaz kâğıt şeridi), cam vitrinler, matbaa makineleri, avluda baca ve havuz. Ölçüler, makine hattı ve vitrin içerikleri
 * TEMSİLÎDİR (docs/SEKA.md).
 */
import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, useGrassCards } from '../shared/scenery';
import { CHIMNEY, DOOR, HALL, MACHINE, POND, PRESSES, VITRINS, WALL_T, YARD } from './site';

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
  const floor = useMemo(() => { const g = new THREE.PlaneGeometry(HALL.x1 - HALL.x0 - 0.2, HALL.z1 - HALL.z0 - 0.2); g.rotateX(-Math.PI / 2); g.translate(0, 0.02, 0); return g; }, []);
  // kâğıt makinesi: çelik şase, kurutma silindirleri, pres merdaneleri, beyaz kâğıt şeridi
  const machine = useMemo(() => { const steel: Parts = [], paper: Parts = [], M = MACHINE, cx = (M.x0 + M.x1) / 2, W = M.x1 - M.x0, D = M.z1 - M.z0;
    steel.push(bx(W, 0.8, D, 4).translate(cx, 0.4, 0));
    for (const z of [-D / 2 + 0.2, D / 2 - 0.2]) { const rail = bx(W, 0.4, 0.3, 3); rail.translate(cx, 3.4, z); steel.push(rail); }
    // yaş uç: pres merdaneleri
    for (let i = 0; i < 4; i++) { const c = new THREE.CylinderGeometry(0.7, 0.7, D - 0.4, 18); c.rotateX(Math.PI / 2); c.translate(M.x0 + 2 + i * 2.2, 1.6, 0); steel.push(c); }
    // kuru uç: iki sıra kurutma silindiri
    for (let i = 0; i < 9; i++) { const x = M.x0 + 12 + i * 2.8; for (const y of [1.9, 3.4]) { if ((i + (y > 3 ? 1 : 0)) % 2 === 0 && y > 3) continue; const c = new THREE.CylinderGeometry(1.15, 1.15, D - 0.4, 24); c.rotateX(Math.PI / 2); c.translate(x, y, 0); steel.push(c); } }
    // kâğıt şeridi: makine boyunca uzanan ince beyaz levha
    const web = bx(W - 3, 0.04, D - 0.8, 4); web.translate(cx + 0.5, 2.75, 0); paper.push(web);
    // ruloların toplandığı uç: büyük kâğıt rulosu
    const roll = new THREE.CylinderGeometry(1.5, 1.5, D - 0.4, 24); roll.rotateX(Math.PI / 2); roll.translate(M.x1 - 1.6, 1.5, 0); paper.push(roll);
    return { steel: merge(steel), paper: merge(paper) }; }, []);
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
    <mesh geometry={machine.steel} material={m.steel} castShadow receiveShadow />
    <mesh geometry={machine.paper} material={m.paper} castShadow />
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
