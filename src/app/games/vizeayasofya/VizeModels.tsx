/**
 * Vize Ayasofyası — 3B modeller. Tuğla ve taş sıralı Bizans duvarları, nef ve yan nefleri ayıran sütunlar, yan nef galerileri, yüksek çokgen kasnaklı
 * kubbe, üç çokgen apsis, narteks, yamaçta kırmızı kiremitli Vize evleri, akropol eteğinde sur parçaları, servi ve dağlar. Ölçüler, galeri düzeni ve
 * pencere sayıları TEMSİLÎDİR (docs/VIZE-AYASOFYA.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, useGrassCards } from '../shared/scenery';
import { AREA, CHURCH, DOOR, FLOOR_H, NARTHEX, NAVE, PIERS, WALL_T, groundY } from './site';

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
const F = FLOOR_H, H_AISLE = 8, H_NAVE = 13;
const DOME = { c: [0, -2] as [number, number], r: 5.2, drumY: 13, drumH: 4.4 };

/* ===================== malzemeler ===================== */
export interface Mats { wall: THREE.MeshStandardMaterial; inner: THREE.MeshStandardMaterial; floor: THREE.MeshStandardMaterial; marble: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; lead: THREE.MeshStandardMaterial; glow: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; stone: THREE.MeshStandardMaterial; house: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    // Bizans duvar düzeni: sıra sıra kesme taş, aralarda üçlü tuğla bandı (temsilî)
    const wl = canvasTex(256, 256, (g, r) => { for (let y = 0; y < 256; y += 32) { const brick = (y / 32) % 4 >= 2; for (let x = 0; x < 256; x += brick ? 24 : 48) { const v = 0.8 + r() * 0.3; g.fillStyle = brick ? `rgb(${(168 * v) | 0},${(88 * v) | 0},${(64 * v) | 0})` : `rgb(${(196 * v) | 0},${(184 * v) | 0},${(160 * v) | 0})`; g.fillRect(x + 1, y + 1, (brick ? 22 : 46), 30); } } });
    wl.repeat.set(0.3, 0.3);
    const inner = canvasTex(256, 256, (g, r) => { g.fillStyle = '#d9cfb8'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,100,70' : '255,250,235'},${r() * 0.08})`; g.fillRect(r() * 256, r() * 256, 5, 5); } });
    const floor = canvasTex(256, 256, (g, r) => { g.fillStyle = '#cfc4a8'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(90,80,60,0.45)'; g.lineWidth = 2; for (let i = 0; i < 256; i += 64) { g.strokeRect(i + 2, 2, 60, 60); } for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.06})`; g.fillRect(r() * 256, r() * 256, 3, 3); } });
    floor.repeat.set(6, 9);
    const rf = canvasTex(256, 256, (g, r) => { g.fillStyle = '#a45a3e'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 12) for (let x = 0; x < 256; x += 16) { const v = 0.78 + r() * 0.35; g.fillStyle = `rgb(${(170 * v) | 0},${(88 * v) | 0},${(62 * v) | 0})`; g.fillRect(x + ((y / 12) % 2) * 8, y, 14, 10); } });
    return {
      wall: new THREE.MeshStandardMaterial({ map: wl, roughness: 0.95 }),
      inner: new THREE.MeshStandardMaterial({ map: inner, roughness: 0.95, side: THREE.DoubleSide }),
      floor: new THREE.MeshStandardMaterial({ map: floor, roughness: 0.7 }),
      marble: new THREE.MeshStandardMaterial({ color: '#e1d9c5', roughness: 0.55 }),
      roof: new THREE.MeshStandardMaterial({ map: rf, roughness: 0.85 }),
      lead: new THREE.MeshStandardMaterial({ color: '#7d8680', roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide }),
      glow: new THREE.MeshStandardMaterial({ color: '#f0f4f4', emissive: '#e4eef2', emissiveIntensity: 0.85, side: THREE.DoubleSide }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 1 }),
      stone: new THREE.MeshStandardMaterial({ color: '#b3a88f', roughness: 0.95 }),
      house: new THREE.MeshStandardMaterial({ color: '#ece4d2', roughness: 0.95 }),
    };
  }, []);
}

/* ===================== kilise ===================== */
export function Church({ m, tier }: { m: Mats; tier: Tier }) {
  const walls = useMemo(() => { const p: Parts = [], C = CHURCH, t = WALL_T, y = F - 0.1;
    // güney (narteks cephesi) ve yan duvarlar; ana kapı açık
    slab(p, C.x0, C.x1, C.z0, C.z0 + t, H_AISLE, y);                                                      // kuzey duvarı (apsislere açılan arka yüz)
    slab(p, C.x0, C.x0 + t, C.z0, C.z1, H_AISLE, y); slab(p, C.x1 - t, C.x1, C.z0, C.z1, H_AISLE, y);
    slab(p, C.x0, -DOOR, C.z1 - t, C.z1, H_AISLE - 1, y); slab(p, DOOR, C.x1, C.z1 - t, C.z1, H_AISLE - 1, y); slab(p, -DOOR, DOOR, C.z1 - t, C.z1, 3.4, y + 4.2);
    // narteks–nef ayırıcı duvar; kapı açık
    slab(p, C.x0, -DOOR, NAVE.z1, NARTHEX.z0, H_AISLE, y); slab(p, DOOR, C.x1, NAVE.z1, NARTHEX.z0, H_AISLE, y); slab(p, -DOOR, DOOR, NAVE.z1, NARTHEX.z0, 3.6, y + 4.2);
    // nef yan duvarları (yüksek): sütun sıralarının üstünde
    slab(p, -4.4, -3.6, NAVE.z0, NAVE.z1, H_NAVE - H_AISLE, y + H_AISLE); slab(p, 3.6, 4.4, NAVE.z0, NAVE.z1, H_NAVE - H_AISLE, y + H_AISLE);
    return merge(p); }, []);
  const columns = useMemo(() => { const p: Parts = [];
    for (const q of PIERS) { const c = new THREE.CylinderGeometry(0.55, 0.62, H_AISLE - 0.4, 14); c.translate(q[0], F + (H_AISLE - 0.4) / 2, q[1]); p.push(c); const cap = bx(1.3, 0.45, 1.3, 1); cap.translate(q[0], F + H_AISLE - 0.2, q[1]); p.push(cap); }
    // sütun sıralarının üstünde kemer şeridi
    for (const x of [-4, 4]) { const b = bx(0.9, 0.7, NAVE.z1 - NAVE.z0, 3); b.translate(x, F + H_AISLE + 0.35, (NAVE.z0 + NAVE.z1) / 2); p.push(b); }
    return merge(p); }, []);
  const galleries = useMemo(() => { const p: Parts = [];
    for (const [x0, x1] of [[-8, -4.4], [4.4, 8]] as const) slab(p, x0, x1, NAVE.z0, NAVE.z1, 0.45, F + 5, 1.5);
    return merge(p); }, []);
  const roofs = useMemo(() => { const p: Parts = [], W = 10;
    const s = new THREE.Shape(); s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(0, 3); s.closePath();
    // kubbenin olduğu bölüm açık bırakılır; iki yanında beşik çatılar
    const z0n = NAVE.z0 - 1, z1n = DOME.c[1] - DOME.r - 0.2, z0s = DOME.c[1] + DOME.r + 0.2, z1s = NAVE.z1 + 1;
    const nN = new THREE.ExtrudeGeometry(s, { depth: z1n - z0n, bevelEnabled: false }); nN.translate(0, F + H_NAVE, z0n); p.push(nN);
    const nS = new THREE.ExtrudeGeometry(s, { depth: z1s - z0s, bevelEnabled: false }); nS.translate(0, F + H_NAVE, z0s); p.push(nS);
    for (const sd of [-1, 1]) { const g = bx(4.6, 0.4, NAVE.z1 - NAVE.z0 + 2, 2); g.rotateZ(sd * -0.28); g.translate(sd * 6.3, F + H_AISLE + 1.4, (NAVE.z0 + NAVE.z1) / 2); p.push(g); }
    const nt = bx(NARTHEX.x1 - NARTHEX.x0 + 1.4, 0.4, NARTHEX.z1 - NARTHEX.z0 + 2.4, 2); nt.translate(0, F + H_AISLE, (NARTHEX.z0 + NARTHEX.z1) / 2); p.push(nt);
    return merge(p); }, []);
  const apses = useMemo(() => { const p: Parts = [];
    for (const [x, r] of [[0, 3.1], [-6, 1.9], [6, 1.9]] as const) { const g = new THREE.CylinderGeometry(r, r, H_AISLE + (x === 0 ? 1.5 : -0.5), 5, 1, false, Math.PI * 0.5, Math.PI); g.translate(x, F + (H_AISLE + (x === 0 ? 1.5 : -0.5)) / 2 - 0.1, CHURCH.z0 + 0.4); p.push(g); }
    return merge(p); }, []);
  const windows = useMemo(() => { const p: Parts = [], A = (x: number, y: number, z: number, ry: number, w: number, h: number) => { const g = new THREE.PlaneGeometry(w, h); g.rotateY(ry); g.translate(x, y, z); p.push(g); };
    for (let k = 0; k < 4; k++) { const z = NAVE.z0 + 4 + k * 6.5; A(-3.99, F + 10.4, z, Math.PI / 2, 1.1, 2.6); A(3.99, F + 10.4, z, -Math.PI / 2, 1.1, 2.6); }
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const g = new THREE.PlaneGeometry(0.9, 2.4); g.rotateY(-a + Math.PI / 2); g.translate(DOME.c[0] + Math.cos(a) * (DOME.r - 0.6), DOME.drumY + 2.4, DOME.c[1] + Math.sin(a) * (DOME.r - 0.6)); p.push(g); }
    return merge(p); }, []);
  return <group>
    <mesh geometry={walls} material={m.wall} castShadow receiveShadow />
    <mesh geometry={columns} material={m.marble} castShadow receiveShadow />
    <mesh geometry={galleries} material={m.inner} castShadow receiveShadow />
    <mesh geometry={roofs} material={m.roof} castShadow receiveShadow />
    <mesh geometry={apses} material={m.wall} castShadow receiveShadow />
    {/* çokgen (altıgen) kasnak ve kubbe */}
    <mesh position={[DOME.c[0], DOME.drumY + DOME.drumH / 2, DOME.c[1]]} rotation-y={Math.PI / 6} castShadow><cylinderGeometry args={[DOME.r + 0.3, DOME.r + 0.3, DOME.drumH, 6, 1, true]} /><primitive object={m.wall} attach="material" /></mesh>
    <mesh position={[DOME.c[0], DOME.drumY + DOME.drumH, DOME.c[1]]} castShadow><sphereGeometry args={[DOME.r, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={m.lead} attach="material" /></mesh>
    <mesh position={[DOME.c[0], DOME.drumY + DOME.drumH, DOME.c[1]]}><sphereGeometry args={[DOME.r - 0.3, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={m.inner} attach="material" /></mesh>
    <mesh geometry={windows}><primitive object={m.glow} attach="material" /></mesh>
    {/* nef zemini (opus sectile benzeri) */}
    <mesh rotation-x={-Math.PI / 2} position={[0, F + 0.02, (NAVE.z0 + NARTHEX.z1) / 2]} receiveShadow><planeGeometry args={[NAVE.x1 - NAVE.x0, NARTHEX.z1 - NAVE.z0]} /><primitive object={m.floor} attach="material" /></mesh>
    <mesh position={[0, F + 3.6, CHURCH.z0 + 0.45]}><planeGeometry args={[3.6, 6]} /><primitive object={m.dark} attach="material" /></mesh>
    <pointLight position={[0, F + 6.2, 0]} color="#ffe6bf" intensity={tier === 'low' ? 60 : 90} distance={26} decay={2} />
    {tier !== 'low' && <pointLight position={[0, F + 5, -12]} color="#ffdcae" intensity={50} distance={18} decay={2} />}
  </group>;
}

/* ===================== kasaba, yamaç, çevre ===================== */
export function Town({ m }: { m: Mats }) {
  const geo = useMemo(() => { const r = rng(33), walls: Parts = [], roofs: Parts = [];
    for (let i = 0; i < 80; i++) { const a = r() * Math.PI * 2, d = 62 + r() * 60, x = Math.cos(a) * d * 1.3, z = Math.sin(a) * d * 0.9 + 10, w = 7 + r() * 5, dd = 7 + r() * 4, h = 5 + r() * 4, y = groundY(x, z);
      const b = bx(w, h, dd, 2.4); b.translate(x, y + h / 2, z); walls.push(b);
      const roof = new THREE.ConeGeometry(Math.max(w, dd) * 0.72, 2.4, 4); roof.rotateY(Math.PI / 4); roof.translate(x, y + h + 1.2, z); roofs.push(roof); }
    return { walls: merge(walls), roofs: merge(roofs) }; }, []);
  return <group>
    <mesh geometry={geo.walls} material={m.house} castShadow receiveShadow />
    <mesh geometry={geo.roofs} material={m.roof} castShadow />
  </group>;
}
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 200 : 140, g = new THREE.PlaneGeometry(300, 240, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, 10);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#86a05a'), dry = new THREE.Color('#a9a672'), dirt = new THREE.Color('#bdb08a');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, groundY(x, z) - (groundY(x, z) === F ? 0.1 : 0));
      c.copy(grass).lerp(dry, 0.3 + 0.3 * Math.sin(x * 0.05 + z * 0.04)); if (Math.abs(x) < 6 && z > 16 && z < 56) c.lerp(dirt, 0.7);
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.2} roughness={1} /></mesh>;
}
export function WallRuins({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = [], r = rng(7);
    for (let i = 0; i < 12; i++) { const x = -40 + i * 7 + r() * 3, z = -34 - r() * 6, w = 4 + r() * 4, h = 1.2 + r() * 2.4; const g = bx(w, h, 1.4, 1.5); g.rotateY((r() - 0.5) * 0.3); g.translate(x, groundY(x, z) + h / 2 - 0.1, z); p.push(g); }
    return merge(p); }, []);
  return <mesh geometry={geo} material={m.stone} castShadow receiveShadow />;
}
export function Cypress({ n }: { n: number }) {
  const geo = useMemo(() => { const parts: Parts = []; const t = new THREE.CylinderGeometry(0.15, 0.25, 1.4, 6); t.translate(0, 0.7, 0); parts.push(t); const c = new THREE.ConeGeometry(1.3, 8, 9); c.translate(0, 5.2, 0); parts.push(c); const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a4d2f', roughness: 0.95 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(15), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 12 && k < n; i++) { const x = -48 + r() * 96, z = -38 + r() * 96; if (x > CHURCH.x0 - 4 && x < CHURCH.x1 + 4 && z > CHURCH.z0 - 5 && z < CHURCH.z1 + 5) continue; if (Math.abs(x) < 8 && z > 16) continue;
      const near = x < AREA.x0 + 2 || x > AREA.x1 - 2 || z < AREA.z0 + 2 || z > AREA.z1 - 2; if (!near && r() < 0.6) continue;
      o.position.set(x, groundY(x, z) - 0.1, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.8 + r() * 0.6); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -48 + r() * 96, z = -38 + r() * 96; if (x > CHURCH.x0 - 1.5 && x < CHURCH.x1 + 1.5 && z > CHURCH.z0 - 1.5 && z < CHURCH.z1 + 1.5) continue; if (Math.abs(x) < 6 && z > 16) continue;
      o.position.set(x, groundY(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.18 + r() * 0.06, 0.38, 0.4 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + r() * 0.2, dd = 750 + r() * 300; out.push({ p: [Math.cos(a) * dd, -8, Math.sin(a) * dd], g: mountainGeo(340 + r() * 160, 120 + r() * 100, 330 + i, 0, '#6a8250') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
