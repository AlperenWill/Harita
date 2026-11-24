/**
 * Cacabey Medresesi — 3B modeller (öteki yeni oyunlarla aynı ortak manzara kiti).
 * Medrese duvar levhalarından kurulur (içi ve dışı görünür): kesme taş dış duvarlar, öne taşan taçkapı (sivri kemerli niş, mukarnas kavsara,
 * geometrik bezeme kuşakları), giriş holü, kubbeli orta avlu ve tepesinde aydınlık feneri, kubbeden kuyuya inen ışık huzmesi, kuyu-havuz,
 * beşik tonozlu eyvan, oda kapıları, kuzeybatı köşesinde süslemeli silindirik minare, meydan, ağaçlar ve çevredeki evler.
 * Ölçüler, iç düzen ve bezemeler TEMSİLÎDİR (docs/CACABEY.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { BUILDING, CELL_DOORS, DOME, FLOOR, MINARET, SQUARE, WELL, ZONES, inBuilding } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.45, 0.68, 0.58).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
const WALL_H = 7, T = 1.2;

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; inner: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; paving: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('cacabey-kesme', ['#cdb998', '#c2ad8a', '#d6c4a4', '#b9a37f', '#c8b392'], [30, 16], [46, 54]);
    const pv = stoneTex('cacabey-doseme', ['#b9ad98', '#ada08a', '#c4b8a4'], [50, 30], [60, 60]);
    for (const t of [pv.map, pv.bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 16); }
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.45, roughness: 0.9 })),
      inner: new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.3, roughness: 0.92, color: '#e2d6c0' }),
      dark: new THREE.MeshStandardMaterial({ color: '#2c2621', roughness: 1 }),
      paving: new THREE.MeshStandardMaterial({ map: pv.map, bumpMap: pv.bump, bumpScale: 0.35, roughness: 0.95 }),
    };
  }, []);
}
/** Selçuklu geometrik bezeme kuşağı (temsilî): iç içe yıldız ve kırık çizgiler */
function patternTex() {
  return canvasTex(512, 128, (g) => { g.fillStyle = '#cdb998'; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#8a7556'; g.lineWidth = 3;
    for (let k = 0; k < 8; k++) { const cx = 32 + k * 64, cy = 64; g.beginPath(); for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 14 : 28; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.stroke(); g.strokeRect(cx - 30, cy - 30, 60, 60); }
    g.strokeRect(4, 4, 504, 120); });
}

/* ===================== medrese ===================== */
type W = { x0: number; x1: number; z0: number; z1: number; h: number; y0?: number };
function wallGeo(list: W[], mat: 'outer' | 'inner') { void mat; return merge(list.filter((w) => w.h > 0.01 && w.x1 > w.x0 && w.z1 > w.z0).map((w) => { const g = bx(w.x1 - w.x0, w.h, w.z1 - w.z0, 2.2); g.translate((w.x0 + w.x1) / 2, FLOOR + (w.y0 ?? 0) + w.h / 2, (w.z0 + w.z1) / 2); return g; })); }
/** Ortasında açıklık bırakan duvar (açıklık eksen boyunca ortada) */
function gapWall(w: W, gap: number, gapH: number): W[] {
  const alongX = w.x1 - w.x0 > w.z1 - w.z0, c = alongX ? (w.x0 + w.x1) / 2 : (w.z0 + w.z1) / 2, a0 = alongX ? w.x0 : w.z0, a1 = alongX ? w.x1 : w.z1, g0 = c - gap / 2, g1 = c + gap / 2;
  const mk = (s: number, e: number, h: number, y0: number): W => (alongX ? { ...w, x0: s, x1: e, h, y0 } : { ...w, z0: s, z1: e, h, y0 });
  return [mk(a0, g0, w.h, 0), mk(g1, a1, w.h, 0), mk(g0, g1, w.h - gapH, gapH)];
}
const mergeAll = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
export function Madrasa({ m }: { m: Mats }) {
  const B = BUILDING, Z = ZONES, D = DOME;
  const outer = useMemo(() => wallGeo([
    { x0: B.x0, x1: B.x1, z0: B.z0, z1: B.z0 + T, h: WALL_H }, { x0: B.x0, x1: B.x0 + T, z0: B.z0, z1: B.z1, h: WALL_H }, { x0: B.x1 - T, x1: B.x1, z0: B.z0, z1: B.z1, h: WALL_H },
    ...gapWall({ x0: B.x0, x1: B.x1, z0: B.z1 - T, z1: B.z1, h: WALL_H }, 4.2, 4.4),
  ], 'outer'), [B]);
  const inner = useMemo(() => wallGeo([
    // hol yan duvarları
    { x0: Z.hol.x0 - 0.8, x1: Z.hol.x0, z0: Z.hol.z0 - 0.6, z1: B.z1 - T, h: 6.4 }, { x0: Z.hol.x1, x1: Z.hol.x1 + 0.8, z0: Z.hol.z0 - 0.6, z1: B.z1 - T, h: 6.4 },
    // avlu duvarları: güneyde hol kapısı, kuzeyde eyvan kemeri, yanlarda kapalı (oda kapıları boyalı)
    ...gapWall({ x0: Z.avlu.x0 - 0.8, x1: Z.avlu.x1 + 0.8, z0: Z.avlu.z1, z1: Z.avlu.z1 + 0.6, h: D.base - FLOOR }, 3, 3.6),
    ...gapWall({ x0: Z.avlu.x0 - 0.8, x1: Z.avlu.x1 + 0.8, z0: Z.avlu.z0 - 0.6, z1: Z.avlu.z0, h: D.base - FLOOR }, 7.2, 6.2),
    { x0: Z.avlu.x0 - 0.8, x1: Z.avlu.x0, z0: Z.avlu.z0 - 0.6, z1: Z.avlu.z1 + 0.6, h: D.base - FLOOR }, { x0: Z.avlu.x1, x1: Z.avlu.x1 + 0.8, z0: Z.avlu.z0 - 0.6, z1: Z.avlu.z1 + 0.6, h: D.base - FLOOR },
    // eyvan yan duvarları
    { x0: Z.eyvan.x0 - 0.8, x1: Z.eyvan.x0, z0: B.z0 + T, z1: Z.avlu.z0 - 0.6, h: 6.4 }, { x0: Z.eyvan.x1, x1: Z.eyvan.x1 + 0.8, z0: B.z0 + T, z1: Z.avlu.z0 - 0.6, h: 6.4 },
  ], 'inner'), [B, Z, D]);
  // düz dam: kubbe ve eyvan tonozu dışında; avlunun üstünde kubbeye geçiş (dairesel açıklıklı tavan)
  const roof = useMemo(() => { const parts: THREE.BufferGeometry[] = [], y = FLOOR + WALL_H;
    const add = (x0: number, x1: number, z0: number, z1: number) => { const g = bx(x1 - x0, 0.6, z1 - z0, 2.2); g.translate((x0 + x1) / 2, y + 0.3, (z0 + z1) / 2); parts.push(g); };
    add(B.x0, Z.avlu.x0 - 0.8, B.z0, B.z1); add(Z.avlu.x1 + 0.8, B.x1, B.z0, B.z1);
    add(Z.avlu.x0 - 0.8, Z.avlu.x1 + 0.8, Z.avlu.z1 + 0.6, B.z1); add(Z.avlu.x0 - 0.8, Z.eyvan.x0 - 0.8, B.z0, Z.avlu.z0 - 0.6); add(Z.eyvan.x1 + 0.8, Z.avlu.x1 + 0.8, B.z0, Z.avlu.z0 - 0.6);
    // kubbe kasnağı tabanı: kare kaide, ortası daire boşluk
    const s = new THREE.Shape(); const hw = Z.avlu.x1 + 0.8; s.moveTo(-hw, -hw); s.lineTo(hw, -hw); s.lineTo(hw, hw); s.lineTo(-hw, hw); s.closePath(); const hole = new THREE.Path(); hole.absarc(0, 0, D.r, 0, Math.PI * 2, true); s.holes.push(hole);
    const ring = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 40 }); ring.rotateX(-Math.PI / 2); ring.translate(0, D.base, 0); const uv = ring.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.2, uv.getY(i) / 2.2); parts.push(ring);
    return merge(parts); }, [B, Z, D]);
  const dome = useMemo(() => { const t0 = Math.asin(D.oculus / D.r); return { out: new THREE.SphereGeometry(D.r + 0.4, 40, 16, 0, Math.PI * 2, t0, Math.PI / 2 - t0), inn: new THREE.SphereGeometry(D.r - 0.05, 40, 16, 0, Math.PI * 2, t0, Math.PI / 2 - t0) }; }, [D]);
  // eyvan tonozu: yarım silindirin ÜST yarısı (önceden alt yarısı seçilmişti: tonoz hamak gibi aşağı sarkıyordu); dışta taş kabuk, kuzey ucunda yarım daire alınlık
  const vault = useMemo(() => { const L = Z.avlu.z0 - 0.6 - (B.z0 + T) + 0.4, cz = (Z.avlu.z0 - 0.6 + B.z0 + T) / 2;
    const inn = new THREE.CylinderGeometry(4.0, 4.0, L, 24, 1, true, Math.PI / 2, Math.PI); inn.rotateX(Math.PI / 2); inn.translate(0, FLOOR + 6.4, cz);
    const out = new THREE.CylinderGeometry(4.8, 4.8, L + 0.8, 24, 1, true, Math.PI / 2, Math.PI); out.rotateX(Math.PI / 2); out.translate(0, FLOOR + 6.4, cz - 0.4);
    const sh = new THREE.Shape(); sh.moveTo(-4.8, 0); sh.absarc(0, 0, 4.8, Math.PI, 0, true); sh.lineTo(-4.8, 0); const end = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false, curveSegments: 20 }); end.translate(0, FLOOR + 6.4 - 0.01, B.z0);
    const rimS = new THREE.Shape(); rimS.moveTo(-4.8, 0); rimS.absarc(0, 0, 4.8, Math.PI, 0, true); rimS.lineTo(4.0, 0); rimS.absarc(0, 0, 4.0, 0, Math.PI, false); rimS.closePath(); const rim = new THREE.ExtrudeGeometry(rimS, { depth: 0.6, bevelEnabled: false, curveSegments: 20 }); rim.translate(0, FLOOR + 6.4, Z.avlu.z0 - 0.6);
    return { inn, out: mergeAll([out, end, rim]) }; }, [B, Z]);
  const pat = useMemo(() => patternTex(), []);
  return <group>
    <mesh geometry={outer} material={m.stone} castShadow receiveShadow />
    <mesh geometry={inner} material={m.inner} castShadow receiveShadow />
    <mesh geometry={roof} material={m.stone} castShadow receiveShadow />
    <mesh geometry={vault.inn} material={m.inner} receiveShadow material-side={THREE.DoubleSide} />
    <mesh geometry={vault.out} material={m.stone} castShadow receiveShadow material-side={THREE.DoubleSide} />
    <mesh geometry={dome.out} material={m.stone} position={[0, D.base + 1, 0]} castShadow />
    <mesh geometry={dome.inn} material={m.inner} position={[0, D.base + 1, 0]} material-side={THREE.BackSide} />
    {/* aydınlık feneri: kubbenin tepesinde kısa, açık bir silindir */}
    <mesh material={m.stone} position={[0, D.base + 1 + D.r * Math.cos(Math.asin(D.oculus / D.r)) + 0.5, 0]} castShadow><cylinderGeometry args={[D.oculus + 0.35, D.oculus + 0.45, 1.2, 20, 1, true]} /></mesh>
    {/* iç döşeme */}
    <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR + 0.01, -0.5]} receiveShadow><planeGeometry args={[B.x1 - B.x0 - 2, B.z1 - B.z0 - 2]} /><meshStandardMaterial map={m.paving.map} color="#d8ccb6" roughness={0.9} /></mesh>
    {/* oda kapıları ve iç bezeme kuşağı */}
    {CELL_DOORS.map(([x, z], i) => <mesh key={i} material={m.dark} position={[x + (x < 0 ? 0.02 : -0.02), FLOOR + 1.3, z]} rotation-y={x < 0 ? Math.PI / 2 : -Math.PI / 2}><planeGeometry args={[1.1, 2.4]} /></mesh>)}
    {[-1, 1].map((s) => <mesh key={'k' + s} position={[s * (Z.avlu.x1 - 0.02), FLOOR + 6.6, 0]} rotation-y={s < 0 ? Math.PI / 2 : -Math.PI / 2}><planeGeometry args={[14, 0.9]} /><meshStandardMaterial map={pat} roughness={0.9} /></mesh>)}
  </group>;
}
/** Taçkapı: öne taşan yüksek blok, sivri kemerli derin niş, kademeli (mukarnas benzeri) kavsara, bezeme kuşakları */
export function Portal({ m }: { m: Mats }) {
  const z = BUILDING.z1, W = 10, H = 10.4, D = 1.8, pat = useMemo(() => patternTex(), []);
  const frame = useMemo(() => { const s = new THREE.Shape(); s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, H); s.lineTo(-W / 2, H); s.closePath();
    const h = new THREE.Path(), r = 2.6, sp = 6.4; h.moveTo(-r, 0); h.lineTo(-r, sp); h.quadraticCurveTo(-r, sp + r * 0.9, 0, sp + r * 1.25); h.quadraticCurveTo(r, sp + r * 0.9, r, sp); h.lineTo(r, 0); h.closePath(); s.holes.push(h);
    const g = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false, curveSegments: 10 }); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.2, uv.getY(i) / 2.2); return g; }, []);
  const muq = useMemo(() => { const parts: THREE.BufferGeometry[] = [], r = rng(4); for (let row = 0; row < 5; row++) { const n = 5 - row, w = 5.2 / 5; for (let k = 0; k < n; k++) { const g = bx(w * 0.92, 0.62, 0.5 + row * 0.25, 1); g.translate(-((n - 1) * w) / 2 + k * w, 6.4 + row * 0.62, -0.25 - row * 0.12 + (r() - 0.5) * 0.05); parts.push(g); } } return merge(parts); }, []);
  return <group position={[0, FLOOR - 0.2, z]}>
    <mesh geometry={frame} material={m.stone} castShadow receiveShadow />
    <mesh geometry={muq} material={m.stone} position={[0, 0, D - 0.1]} castShadow />
    {[-1, 1].map((s) => <mesh key={s} position={[s * 3.9, 5.2, D + 0.02]}><planeGeometry args={[1.2, 9.6]} /><meshStandardMaterial map={pat} roughness={0.9} /></mesh>)}
    <mesh position={[0, 9.8, D + 0.02]}><planeGeometry args={[W - 0.4, 0.8]} /><meshStandardMaterial map={pat} roughness={0.9} /></mesh>
    {/* yazıt levhası (temsilî) */}
    <mesh position={[0, 4.9, 0.08]}><planeGeometry args={[3.6, 0.6]} /><meshStandardMaterial color="#b5a07d" roughness={0.9} /></mesh>
  </group>;
}
/** Kuyu-havuz ve aydınlık fenerinden inen ışık huzmesi */
export function Well({ m }: { m: Mats }) {
  const beam = useRef<THREE.Mesh>(null), y0 = FLOOR + 0.6, yTop = DOME.base + 1 + DOME.r;
  useFrame(({ clock }) => { const mt = beam.current?.material as THREE.MeshBasicMaterial | undefined; if (mt) mt.opacity = 0.12 + Math.sin(clock.elapsedTime * 0.5) * 0.02; });
  return <group position={[WELL.c[0], 0, WELL.c[1]]}>
    <mesh material={m.stone} position={[0, FLOOR + 0.3, 0]} castShadow receiveShadow><cylinderGeometry args={[WELL.r + 0.35, WELL.r + 0.45, 0.6, 28, 1, true]} /></mesh>
    <mesh material={m.stone} position={[0, FLOOR + 0.62, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[WELL.r - 0.05, WELL.r + 0.4, 28]} /></mesh>
    <mesh position={[0, y0 - 0.15, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[WELL.r - 0.05, 32]} /><meshStandardMaterial color="#2f4f5a" roughness={0.02} metalness={0.6} envMapIntensity={2.2} /></mesh>
    <mesh ref={beam} position={[0, (y0 + yTop) / 2, 0]} userData={{ noCast: true }}><cylinderGeometry args={[DOME.oculus * 0.95, WELL.r * 0.9, yTop - y0, 24, 1, true]} /><meshBasicMaterial color="#fff6dc" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} /></mesh>
    <pointLight position={[0, DOME.base - 1, 0]} color="#fff3d8" intensity={90} distance={16} decay={2} />
  </group>;
}
/** Kuzeybatı köşesinde silindirik minare: kare kaide, bezemeli gövde (sırlı tuğla kuşakları temsilî), şerefe, külah */
export function Minaret({ m }: { m: Mats }) {
  const { c, r, h } = MINARET;
  const tex = useMemo(() => canvasTex(256, 512, (g) => { g.fillStyle = '#a5684a'; g.fillRect(0, 0, 256, 512); for (let y = 0; y < 512; y += 10) for (let x = 0; x < 256; x += 22) { g.fillStyle = (y / 10) % 2 ? '#b2775a' : '#9b5f42'; g.fillRect(x + ((y / 10) % 2) * 11, y, 20, 8); }
    for (let band = 0; band < 6; band++) { const y0 = 40 + band * 80; g.fillStyle = '#2f8a8f'; for (let x = 0; x < 256; x += 32) { g.beginPath(); g.moveTo(x, y0 + 16); g.lineTo(x + 16, y0); g.lineTo(x + 32, y0 + 16); g.lineTo(x + 16, y0 + 32); g.closePath(); g.fill(); } } }), []);
  return <group position={[c[0], 0, c[1]]}>
    <mesh geometry={bx(r * 2 + 1.4, 6, r * 2 + 1.4, 2.2)} material={m.stone} position={[0, 3, 0]} castShadow receiveShadow />
    <mesh position={[0, 6 + (h - 8) / 2, 0]} castShadow><cylinderGeometry args={[r * 0.88, r, h - 8, 20]} /><meshStandardMaterial map={tex} roughness={0.75} /></mesh>
    <mesh material={m.stone} position={[0, h - 2.2, 0]} castShadow><cylinderGeometry args={[r + 0.6, r * 0.9, 0.7, 20]} /></mesh>
    <mesh position={[0, h - 0.8, 0]} castShadow><cylinderGeometry args={[r * 0.7, r * 0.75, 2.2, 16]} /><meshStandardMaterial map={tex} roughness={0.75} /></mesh>
    <mesh position={[0, h + 1.2, 0]} castShadow><coneGeometry args={[r * 0.8, 2.2, 16]} /><meshStandardMaterial color="#8d949a" roughness={0.5} metalness={0.3} /></mesh>
  </group>;
}

/* ===================== meydan ve çevre ===================== */
export function Ground({ tier, m }: { tier: Tier; m: Mats }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 160 : 110, g = new THREE.PlaneGeometry(900, 900, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), steppe = new THREE.Color('#b0a46c'), green = new THREE.Color('#8c9458');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.max(0, Math.hypot(x, z) - 160); p.setY(i, -0.05 + d * 0.05 * (0.6 + 0.4 * Math.sin(x * 0.01 + z * 0.012))); c.copy(steppe).lerp(green, 0.3 + 0.3 * Math.sin(x * 0.02)); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  const sq = SQUARE;
  return <group>
    <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} roughness={1} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[(sq.x0 + sq.x1) / 2, 0.02, (sq.z0 + sq.z1) / 2]} material={m.paving} receiveShadow userData={{ noCast: true }}><planeGeometry args={[sq.x1 - sq.x0 + 10, sq.z1 - sq.z0 + 10]} /></mesh>
  </group>;
}
/** Meydanı çevreleyen evler (sıvalı, düz ya da kırma damlı; temsilî) */
export function Town({ n }: { n: number }) {
  const body = useRef<THREE.InstancedMesh>(null), roof = useRef<THREE.InstancedMesh>(null);
  const tex = useMemo(() => canvasTex(128, 256, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 256); for (let f = 0; f < 4; f++) for (let k = 0; k < 3; k++) { g.fillStyle = '#56636c'; g.fillRect(12 + k * 40, 20 + f * 60, 20, 30); } }), []);
  const mats = useMemo(() => { const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), top = new THREE.MeshStandardMaterial({ color: '#b5ad9e' }); return [side, side, top, top, side, side]; }, [tex]);
  useEffect(() => { const r = rng(61), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0; const sq = SQUARE;
    for (let i = 0; i < n * 6 && k < n; i++) { const a = r() * Math.PI * 2, d = 58 + r() * 160, x = Math.cos(a) * d, z = Math.sin(a) * d + 8; if (x > sq.x0 - 8 && x < sq.x1 + 8 && z > sq.z0 - 8 && z < sq.z1 + 8) continue;
      const w = 9 + r() * 8, dd = 9 + r() * 7, h = 6 + Math.floor(r() * 3) * 3; o.position.set(x, h / 2 - 0.1, z); o.rotation.set(0, Math.round(r() * 3) * (Math.PI / 2) + (r() - 0.5) * 0.1, 0); o.scale.set(w, h, dd); o.updateMatrix(); body.current?.setMatrixAt(k, o.matrix); body.current?.setColorAt(k, c.set(['#efe8da', '#e6d6c0', '#f4f1ea', '#dfd2bc'][Math.floor(r() * 4)]));
      o.position.set(x, h - 0.1, z); o.scale.set(w * 1.05, 2, dd * 1.05); o.updateMatrix(); roof.current?.setMatrixAt(k, o.matrix); k++; }
    for (const mm of [body.current, roof.current]) if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  const roofGeo = useMemo(() => { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); return g; }, []);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return <group><instancedMesh ref={body} args={[box, mats, n]} castShadow receiveShadow /><instancedMesh ref={roof} args={[roofGeo, undefined, n]} castShadow><meshStandardMaterial color="#9a5040" roughness={0.85} /></instancedMesh></group>;
}
export function Trees({ n }: { n: number }) {
  const geo = useMemo(() => { const r = rng(3), parts: THREE.BufferGeometry[] = [], paint = (g: THREE.BufferGeometry, hex: string, j: number) => { const gg = g.index ? g.toNonIndexed() : g, col: number[] = [], cc = new THREE.Color(); for (let i = 0; i < gg.attributes.position.count; i++) { cc.set(hex).offsetHSL(0, 0, (r() - 0.5) * j); col.push(cc.r, cc.g, cc.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.deleteAttribute('uv'); return gg; };
    parts.push(paint(new THREE.CylinderGeometry(0.22, 0.35, 3.4, 7).translate(0, 1.7, 0), '#6a5644', 0.05)); for (let i = 0; i < 6; i++) { const a = r() * 6.28, d = i ? 1.3 + r() * 0.7 : 0; parts.push(paint(new THREE.IcosahedronGeometry(1.6 + r() * 0.5, 1).translate(Math.cos(a) * d, 4.4 + r() * 1.4, Math.sin(a) * d), '#5d7a38', 0.12)); }
    const g = mergeGeometries(parts)!; g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []), ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const pts: [number, number][] = [[-30, 30], [-30, 10], [-30, -10], [30, 30], [30, 10], [30, -10], [-20, 40], [20, 40], [-34, -22], [34, -22]]; const o = new THREE.Object3D(), r = rng(9); let k = 0;
    for (const [x, z] of pts.slice(0, n)) { if (inBuilding(x, z, 4)) continue; o.position.set(x, 0, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.9 + r() * 0.3); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    if (ref.current) { ref.current.count = k; ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, 12]} castShadow receiveShadow />;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = (r() - 0.5) * 400, z = (r() - 0.5) * 400; if (x > SQUARE.x0 - 4 && x < SQUARE.x1 + 4 && z > SQUARE.z0 - 4 && z < SQUARE.z1 + 4) continue;
      o.position.set(x, -0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.14 + r() * 0.05, 0.35, 0.5 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Mountains() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + r() * 0.3, dd = 1100 + r() * 600; out.push({ p: [Math.cos(a) * dd, -20, Math.sin(a) * dd], g: mountainGeo(500 + r() * 300, 160 + r() * 180, 60 + i, 2, '#a09470') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
