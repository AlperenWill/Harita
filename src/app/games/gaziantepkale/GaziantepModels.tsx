/**
 * Gaziantep Kalesi — 3B modeller. Höyük üzerinde dairesel kireç taşı surlar ve mazgallar, 12 yuvarlak burç, güneydeki kapı, içeride Osmanlı
 * hamamı ve cami kalıntıları, Panorama Müzesi, kuyu, kalenin çevresindeki kent evleri ve dağlar. Ölçüler, burç yerleşimi ve iç yapılar TEMSİLÎDİR
 * (docs/GAZIANTEP-KALE.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { BATH, GATE_HALF, MOSQUE, MUSEUM, PLAZA_R, RING, TOWERS, TOWER_R, WELL, groundY, DAMAGE, inDamageArc } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.45, 0.64, 0.62).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; ruin: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('antep-kale', ['#b9ac92', '#a89c82', '#c7bba1', '#9a8e76'], [14, 10], [30, 40]);
    const rn = stoneTex('antep-kalinti', ['#a89a80', '#988a72', '#b6a98f'], [10, 8], [30, 40]);
    const rf = canvasTex(256, 256, (g, r) => { g.fillStyle = '#9a5a40'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '50,30,20' : '210,150,110'},${r() * 0.25})`; g.fillRect(r() * 256, r() * 256, 3, 3); } });
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.4, roughness: 0.95 })),
      ruin: weather(new THREE.MeshStandardMaterial({ map: rn.map, bumpMap: rn.bump, bumpScale: 0.4, roughness: 0.95 })),
      plaster: new THREE.MeshStandardMaterial({ color: '#e6dcc6', roughness: 0.95 }),
      roof: new THREE.MeshStandardMaterial({ map: rf, roughness: 0.9 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 1 }),
    };
  }, []);
}

/* ===================== arazi ===================== */
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 200 : 140, g = new THREE.PlaneGeometry(260, 260, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), earth = new THREE.Color('#a8a07a'), dry = new THREE.Color('#9c9468'), pave = new THREE.Color('#cdbfa4');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); p.setY(i, groundY(x, z));
      c.copy(earth).lerp(dry, 0.3 + 0.3 * Math.sin(x * 0.07 + z * 0.05)); if (r > 36 && r < PLAZA_R + 2) c.lerp(pave, 0.7); if (r < 30) c.lerp(pave, 0.25);
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}

/* ===================== sur, burçlar, kapı ===================== */
/** Oyun yöneticisi yazar: onarılan hasarların kimlikleri */
export const repairState = { fixed: [] as string[] };
const STUB = 1.6;   // gedikte ayakta kalan alt duvarın, zeminden yüksekliği
export function Walls({ m }: { m: Mats }) {
  // silindir UV'si 0–1: duvar ölçekli doku burçlarda dev taşlar veriyordu; burçlara ayrı tekrar oranlı kopya
  const towerMat = useMemo(() => { const mm = m.stone.clone(); for (const k of ['map', 'bumpMap'] as const) { const t = m.stone[k]; if (t) { const c = t.clone(); c.repeat.set(12, 5); c.needsUpdate = true; mm[k] = c; } } return mm; }, [m.stone]);
  const ring = useMemo(() => { const parts: Parts = [], N = 540, rm = (RING.r0 + RING.r1) / 2, gate = (GATE_HALF + 3.2) / rm, r = rng(77);
    for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; const d = Math.abs(((a - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (d < gate) continue;
      const seg = (2 * Math.PI * rm) / N, x = Math.cos(a) * rm, z = Math.sin(a) * rm, y = groundY(x, z);
      if (inDamageArc(a)) { const h = STUB + 1.35 - 0.6 + r() * 1.2; const g = bx(RING.r1 - RING.r0, h, seg * 1.05, 2.4); g.rotateY(-a); g.translate(x, y - 1.35 + h / 2, z); parts.push(g); continue; }
      const g = bx(RING.r1 - RING.r0, RING.h + 1.5, seg * 1.05, 2.4); g.rotateY(-a); g.translate(x, y + RING.h / 2 - 0.6, z); parts.push(g);
      if (i % 3 === 0) { const b = bx(RING.r1 - RING.r0 + 0.1, 1.1, seg * 1.6, 1.4); b.rotateY(-a); b.translate(x, y + RING.h + 0.7, z); parts.push(b); } }
    return merge(parts); }, []);
  const towers = useMemo(() => { const parts: Parts = [];
    for (const t of TOWERS) { const y = groundY(t[0], t[1]), H = RING.h + 3.4, g = new THREE.CylinderGeometry(TOWER_R, TOWER_R + 0.5, H, 24); g.translate(t[0], y + H / 2 - 0.6, t[1]); parts.push(g);
      const band = new THREE.CylinderGeometry(TOWER_R + 0.18, TOWER_R + 0.18, 0.35, 24); band.translate(t[0], y + H - 1.2, t[1]); parts.push(band);
      for (let k = 0; k < 16; k++) { if (k % 2) continue; const a = (k / 16) * Math.PI * 2, mg = bx(0.95, 1.0, 0.6, 1.2); mg.rotateY(-a + Math.PI / 2); mg.translate(t[0] + Math.cos(a) * (TOWER_R - 0.25), y + H + 0.0, t[1] + Math.sin(a) * (TOWER_R - 0.25)); parts.push(mg); } }
    return merge(parts); }, []);
  // kapı: iki yanda kalın kuleli kütle, ortada sivri kemerli geçit (önceden düz kare delikti), üstte mazgallı korkuluk
  const gate = useMemo(() => { const parts: Parts = [], rm = (RING.r0 + RING.r1) / 2, y = groundY(0, rm), W = GATE_HALF + 3.2, Hh = RING.h + 3.0, D = RING.r1 - RING.r0 + 1.6;
    // dış hat kemeri de içerir (delik kullanılmaz: tabana değen delik üçgenlemede kesilmiyordu)
    const hw = GATE_HALF - 0.05, sp = 3.0, sh = new THREE.Shape(); sh.moveTo(-W, -1); sh.lineTo(-hw, -1); sh.lineTo(-hw, sp); sh.quadraticCurveTo(-hw, sp + 1.6, 0, sp + 2.0); sh.quadraticCurveTo(hw, sp + 1.6, hw, sp); sh.lineTo(hw, -1); sh.lineTo(W, -1); sh.lineTo(W, Hh); sh.lineTo(-W, Hh); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 12 }); g.translate(0, y - 0.6, rm - D / 2); parts.push(g);
    for (let k = 0; k < 7; k++) { const x = -W + 0.6 + k * ((2 * W - 1.2) / 6), mg = bx(0.9, 1.1, 0.7, 1.2); mg.translate(x, y - 0.6 + Hh + 0.55, rm + D / 2 - 0.35); parts.push(mg); }
    const arch = new THREE.TorusGeometry(hw + 0.25, 0.22, 6, 16, Math.PI); arch.scale(1, 1.1, 1); arch.translate(0, y - 0.6 + sp + 0.6, rm + D / 2 + 0.05); parts.push(arch);
    return merge(parts); }, []);
  return <group>
    <mesh geometry={ring} material={m.stone} castShadow receiveShadow />
    <mesh geometry={towers} material={towerMat} castShadow receiveShadow />
    <mesh geometry={gate} material={m.stone} castShadow receiveShadow />
    {DAMAGE.map((d) => <DamagePatch key={d.id} id={d.id} a={d.a} half={d.half} m={m} />)}
  </group>;
}
/** Bir hasar yayı: onarılınca yerden yükselen üst duvar ve mazgallar; onarılmadan önce iç tarafta moloz yığını */
function DamagePatch({ id, a, half, m }: { id: string; a: number; half: number; m: Mats }) {
  const rm = (RING.r0 + RING.r1) / 2, base = groundY(Math.cos(a) * rm, Math.sin(a) * rm);
  const geo = useMemo(() => { const up: Parts = [], rub: Parts = [], N = 18, r = rng(Math.round(a * 1000));
    for (let i = 0; i < N; i++) { const aa = a - half + ((i + 0.5) / N) * 2 * half, seg = (2 * half * rm) / N, x = Math.cos(aa) * rm, z = Math.sin(aa) * rm, y = groundY(x, z) - base;
      const h0 = STUB - 0.6, H = RING.h + 0.15 - h0; const g = bx(RING.r1 - RING.r0, H, seg * 1.05, 2.4); g.rotateY(-aa); g.translate(x, y + h0 + H / 2, z); up.push(g);
      if (i % 3 === 0) { const b = bx(RING.r1 - RING.r0 + 0.1, 1.1, seg * 1.6, 1.4); b.rotateY(-aa); b.translate(x, y + RING.h + 0.7, z); up.push(b); } }
    for (let k = 0; k < 26; k++) { const aa = a + (r() - 0.5) * half * 1.8, rr = RING.r0 - 1 - r() * 3.2, q = new THREE.DodecahedronGeometry(0.35 + r() * 0.45, 0); q.scale(1.2, 0.7, 1); q.translate(Math.cos(aa) * rr, groundY(Math.cos(aa) * rr, Math.sin(aa) * rr) - base + 0.2 + r() * 0.3, Math.sin(aa) * rr); rub.push(q); }
    return { up: merge(up), rub: merge(rub) }; }, [a, half, base, rm]);
  const upRef = useRef<THREE.Group>(null), rubRef = useRef<THREE.Group>(null), k = useRef(0);
  useFrame((_, dt) => { const t = repairState.fixed.includes(id) ? 1 : 0; k.current += (t - k.current) * Math.min(1, dt * 1.6);
    if (upRef.current) { upRef.current.scale.set(1, Math.max(0.001, k.current), 1); upRef.current.visible = k.current > 0.01; }
    if (rubRef.current) { const s = 1 - k.current; rubRef.current.scale.set(1, Math.max(0.001, s), 1); rubRef.current.visible = s > 0.01; } });
  return <group position-y={base}>
    <group ref={upRef} visible={false}><mesh geometry={geo.up} material={m.stone} castShadow receiveShadow /></group>
    <group ref={rubRef}><mesh geometry={geo.rub} material={m.ruin} castShadow receiveShadow /></group>
  </group>;
}

/* ===================== iç yapılar ===================== */
export function Inside({ m }: { m: Mats }) {
  const ruins = useMemo(() => { const p: Parts = [], r = rng(14);
    const lowWalls = (R: { x0: number; x1: number; z0: number; z1: number }, t: number, hMax: number) => {
      const cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2, y = groundY(cx, cz);
      for (const [x0, x1, z0, z1] of [[R.x0, R.x1, R.z0, R.z0 + t], [R.x0, R.x1, R.z1 - t, R.z1], [R.x0, R.x0 + t, R.z0, R.z1], [R.x1 - t, R.x1, R.z0, R.z1]] as const) {
        const n = Math.ceil(Math.max(x1 - x0, z1 - z0) / 1.6); for (let i = 0; i < n; i++) { const h = 0.6 + r() * hMax, ax = x1 - x0 > z1 - z0, g = bx(ax ? (x1 - x0) / n : x1 - x0, h, ax ? z1 - z0 : (z1 - z0) / n, 1.2);
          g.translate(ax ? x0 + ((i + 0.5) * (x1 - x0)) / n : (x0 + x1) / 2, y + h / 2, ax ? (z0 + z1) / 2 : z0 + ((i + 0.5) * (z1 - z0)) / n); p.push(g); } } };
    lowWalls(BATH, 0.9, 1.4); lowWalls(MOSQUE, 0.8, 1.6);
    // hamam: üç küçük kubbe kalıntısı (yarım küre kabuğu)
    for (let k = 0; k < 3; k++) { const cx = BATH.x0 + 1.8 + k * 2.2, cz = (BATH.z0 + BATH.z1) / 2, y = groundY(cx, cz), d = new THREE.SphereGeometry(1.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); d.translate(cx, y + 0.9, cz); p.push(d); }
    // cami: mihrap nişi, sütun kaideleri ve köşede kırık minare gövdesi
    { const mx = MOSQUE.x1 - 0.9, mz = MOSQUE.z1 - 0.9, my2 = groundY(mx, mz), mn = new THREE.CylinderGeometry(0.85, 1.0, 4.2, 12); mn.translate(mx, my2 + 2.1, mz); p.push(mn); const ft = bx(2.2, 1.2, 2.2, 1); ft.translate(mx, my2 + 0.6, mz); p.push(ft); }
    const my = groundY((MOSQUE.x0 + MOSQUE.x1) / 2, MOSQUE.z0), mih = bx(2, 2.6, 0.8, 1); mih.translate((MOSQUE.x0 + MOSQUE.x1) / 2, my + 1.3, MOSQUE.z0 + 0.5); p.push(mih);
    for (const dx of [-2, 2]) for (const dz of [-1, 1.4]) { const c = new THREE.CylinderGeometry(0.4, 0.5, 0.9, 10); c.translate((MOSQUE.x0 + MOSQUE.x1) / 2 + dx, groundY((MOSQUE.x0 + MOSQUE.x1) / 2, (MOSQUE.z0 + MOSQUE.z1) / 2) + 0.45, (MOSQUE.z0 + MOSQUE.z1) / 2 + dz); p.push(c); }
    // kuyu ağzı
    const wy = groundY(WELL.c[0], WELL.c[1]), well = new THREE.CylinderGeometry(WELL.r, WELL.r + 0.1, 1, 16, 1, true); well.translate(WELL.c[0], wy + 0.5, WELL.c[1]); p.push(well);
    return merge(p); }, []);
  const museum = useMemo(() => { const p: Parts = [], M = MUSEUM, cx = (M.x0 + M.x1) / 2, cz = (M.z0 + M.z1) / 2, y = groundY(cx, cz), H = 6.2;
    const b = bx(M.x1 - M.x0, H, M.z1 - M.z0, 2.4); b.translate(cx, y + H / 2, cz); p.push(b);
    return merge(p); }, []);
  const windows = useMemo(() => { const p: Parts = [], M = MUSEUM, cz = M.z1 + 0.02, y = groundY((M.x0 + M.x1) / 2, cz);
    for (let i = 0; i < 6; i++) { const g = new THREE.PlaneGeometry(1.1, 2.6); g.translate(M.x0 + 2 + i * 2.9, y + 3, cz); p.push(g); }
    const door = new THREE.PlaneGeometry(2.2, 3.4); door.translate(0, y + 1.7, cz); p.push(door);
    return merge(p); }, []);
  return <group>
    <mesh geometry={ruins} material={m.ruin} castShadow receiveShadow />
    <mesh geometry={museum} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={windows} material={m.dark} />
  </group>;
}

/* ===================== çevre: kent evleri, ot, dağlar ===================== */
export function City({ m }: { m: Mats }) {
  const geo = useMemo(() => { const r = rng(33), walls: Parts = [], roofs: Parts = [];
    for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, d = PLAZA_R + 6 + r() * 24, x = Math.cos(a) * d, z = Math.sin(a) * d, w = 6 + r() * 5, dd = 6 + r() * 5, h = 5 + r() * 6, y = groundY(x, z);
      const b = bx(w, h, dd, 2.4); b.rotateY(a + (r() - 0.5) * 0.5); b.translate(x, y + h / 2, z); walls.push(b);
      const t = bx(w + 0.4, 0.4, dd + 0.4, 2); t.rotateY(a); t.translate(x, y + h + 0.2, z); roofs.push(t); }
    return { walls: merge(walls), roofs: merge(roofs) }; }, []);
  return <group>
    <mesh geometry={geo.walls} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={geo.roofs} material={m.roof} castShadow receiveShadow />
  </group>;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const a = r() * 6.28, d = 2 + r() * (RING.r0 - 3), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if ([BATH, MOSQUE, MUSEUM].some((q) => x > q.x0 - 1 && x < q.x1 + 1 && z > q.z0 - 1 && z < q.z1 + 1)) continue;
      o.position.set(x, groundY(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.35 + r() * 0.3; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.15 + r() * 0.06, 0.3, 0.45 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Mountains() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + r() * 0.2, dd = 700 + r() * 300; out.push({ p: [Math.cos(a) * dd, -6, Math.sin(a) * dd], g: mountainGeo(340 + r() * 160, 90 + r() * 80, 210 + i, 0, '#a09a74') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
