/**
 * Oylum Höyük — 3B modeller: elips höyük ve çevre ovası, güney yamacında basamaklı açma (katmanlı kesit yüzleri, düzlükler, rampalar,
 * kazık ve ip), kazı çadırı, zeytin ağaçları; kazılan kesitlerin önünde buluntular (tablet, çömlek, kap). Biçimler TEMSİLÎDİR.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, useGrassCards } from '../shared/scenery';
import { CUTS, RAMP_X, STEPS, TRENCH, natural } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const T = TRENCH;
const inT = (x: number, z: number) => x > T.x0 - 0.3 && x < T.x1 + 0.3 && z > T.z0 - 0.3 && z < T.z1 + 0.3;

/** Katman dokusu: v = dünya yüksekliği / 4 m; yatay toprak bantları, çakıl, kül şeridi */
function strataTex() { return canvasTex(256, 256, (g, r) => { const cols = ['#a7845c', '#8f6c49', '#b9976b', '#6f5a45', '#c4a57a', '#7d6248', '#9c7a52'];
  let y = 0, i = 0; while (y < 256) { const h = 14 + r() * 30; g.fillStyle = cols[i++ % cols.length]; g.fillRect(0, y, 256, h); if (r() < 0.3) { g.fillStyle = 'rgba(40,36,32,0.55)'; g.fillRect(0, y + h - 3, 256, 3); } y += h; }
  for (let k = 0; k < 500; k++) { g.fillStyle = `rgba(${r() < 0.5 ? '60,48,36' : '220,205,180'},${0.2 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 2, 0, 0, 7); g.fill(); } }); }
export function Ground({ tier }: { tier: 'low' | 'medium' | 'high' }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 320 : 220, g = new THREE.PlaneGeometry(560, 420, N, Math.round(N * 0.75)); g.rotateX(-Math.PI / 2); g.translate(0, 0, 20);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), a = new THREE.Color('#a8925f'), b = new THREE.Color('#8f9653'), bare = new THREE.Color('#a88a62');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let y = natural(x, z); if (inT(x, z)) y = Math.min(y, STEPS[2].y - 1.5);
      p.setY(i, y); c.copy(a).lerp(b, 0.35 + 0.3 * Math.sin(x * 0.03 + z * 0.04)); if (y > 2) c.lerp(bare, Math.min(0.5, y / 40)); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const far = useMemo(() => { const g = new THREE.PlaneGeometry(6000, 6000); g.rotateX(-Math.PI / 2); g.translate(0, -0.05, 0); return g; }, []);
  const tex = useMemo(() => groundTex(), []);
  return <group userData={{ noCast: true }}>
    <mesh geometry={geo} receiveShadow><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>
    <mesh geometry={far} receiveShadow><meshStandardMaterial color="#aca06a" roughness={1} /></mesh>
  </group>;
}
/** Açma: düzlükler, kesit yüzleri ve yan duvarlar (katmanlı), rampalar, kazık ve ip */
export function Trench() {
  const { faces, floors, ramps, posts, rope } = useMemo(() => { const faces: Parts = [], floors: Parts = [], ramps: Parts = [], posts: Parts = [], rope: Parts = [];
    // dikey yüz: (x0,z0)→(x1,z1) doğrultusunda, alt kenarı yb, üst kenarı ytop(t)
    const wall = (x0: number, z0: number, x1: number, z1: number, yb: (t: number) => number, yt: (t: number) => number, n = 12) => { const pos: number[] = [], uv: number[] = [], L = Math.hypot(x1 - x0, z1 - z0);
      for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, P = (t: number, top: boolean) => { const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = top ? yt(t) : yb(t); pos.push(x, y, z); uv.push((t * L) / 4, y / 4); };
        P(t0, false); P(t1, false); P(t1, true); P(t0, false); P(t1, true); P(t0, true); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); faces.push(g); };
    const S = STEPS;
    wall(T.x0, T.z0, T.x1, T.z0, () => S[0].y, (t) => natural(T.x0 + (T.x1 - T.x0) * t, T.z0));   // arka duvar (güneye bakar)
    wall(T.x0, S[1].z0, T.x1, S[1].z0, () => S[1].y, () => S[0].y); wall(T.x0, S[2].z0, T.x1, S[2].z0, () => S[2].y, () => S[1].y);
    const floorAt = (z: number) => (z < S[1].z0 ? S[0].y : z < S[2].z0 ? S[1].y : S[2].y);
    for (const [x, dir] of [[T.x0, 1], [T.x1, -1]] as const) for (let i = 0; i < 3; i++) { const z0 = S[i].z0, z1 = S[i].z1; if (dir > 0) wall(x, z1, x, z0, () => floorAt((z0 + z1) / 2), (t) => natural(x, z1 + (z0 - z1) * t)); else wall(x, z0, x, z1, () => floorAt((z0 + z1) / 2), (t) => natural(x, z0 + (z1 - z0) * t)); }
    for (const s of S) { const g = new THREE.PlaneGeometry(T.x1 - T.x0, s.z1 - s.z0); g.rotateX(-Math.PI / 2); g.translate((T.x0 + T.x1) / 2, s.y, (s.z0 + s.z1) / 2); floors.push(g); }
    // rampalar: eğimli toprak basamaklar
    for (const [zr, lo, hi] of [[S[1].z0, S[1].y, S[0].y], [S[2].z0, S[2].y, S[1].y]]) for (let k = 0; k < 6; k++) { const zz = zr + 1.6 - (k + 0.5) * (3.2 / 6), yy = lo + ((k + 1) / 6) * (hi - lo), b = bx(RAMP_X[1] - RAMP_X[0], yy - lo + 0.02, 3.2 / 6 + 0.02, 1); b.translate((RAMP_X[0] + RAMP_X[1]) / 2, lo + (yy - lo) / 2, zz); ramps.push(b); }
    // kazıklar ve ip
    const corners: [number, number][] = [[T.x0 - 0.6, T.z0 - 0.6], [T.x1 + 0.6, T.z0 - 0.6], [T.x1 + 0.6, T.z1 + 0.4], [T.x0 - 0.6, T.z1 + 0.4]];
    for (const [x, z] of corners) { const g = new THREE.CylinderGeometry(0.04, 0.05, 1.1, 6); g.translate(x, natural(x, z) + 0.45, z); posts.push(g); }
    for (let i = 0; i < 3; i++) { const [ax, az] = corners[i], [bx2, bz] = corners[i + 1], L = Math.hypot(bx2 - ax, bz - az), g = new THREE.CylinderGeometry(0.012, 0.012, L, 4); g.rotateZ(Math.PI / 2); g.rotateY(-Math.atan2(bz - az, bx2 - ax)); g.translate((ax + bx2) / 2, (natural(ax, az) + natural(bx2, bz)) / 2 + 0.85, (az + bz) / 2); rope.push(g); }
    return { faces: merge(faces), floors: merge(floors), ramps: merge(ramps), posts: merge(posts), rope: merge(rope) }; }, []);
  const strata = useMemo(() => strataTex(), []);
  const floorTex = useMemo(() => canvasTex(128, 128, (g, r) => { g.fillStyle = '#9d7f5a'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,55,40' : '200,180,150'},${0.2 + r() * 0.3})`; g.fillRect(r() * 128, r() * 128, 1.5, 1.5); } }), []);
  return <group>
    <mesh geometry={faces} receiveShadow castShadow><meshStandardMaterial map={strata} bumpMap={strata} bumpScale={0.6} roughness={1} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={floors} receiveShadow><meshStandardMaterial map={floorTex} roughness={1} /></mesh>
    <mesh geometry={ramps} receiveShadow castShadow><meshStandardMaterial color="#8f7150" roughness={1} /></mesh>
    <mesh geometry={posts} castShadow><meshStandardMaterial color="#6b4a2e" roughness={0.9} /></mesh>
    <mesh geometry={rope}><meshStandardMaterial color="#e0c440" roughness={0.7} /></mesh>
  </group>;
}
/** Kazı noktalarındaki kazılmamış toprak yığını (kazılınca kalkar) ve buluntular */
export function Finds({ dug }: { dug: number[] }) {
  const tablet = useMemo(() => canvasTex(128, 96, (g, r) => { g.fillStyle = '#b48a5e'; g.fillRect(0, 0, 128, 96); g.fillStyle = '#6b4a2e'; for (let y = 10; y < 90; y += 12) for (let x = 8; x < 120; x += 8 + r() * 6) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y + 2); g.lineTo(x, y + 4); g.fill(); } }), []);
  const pot = useMemo(() => { const pts = [[0, 0], [0.12, 0], [0.2, 0.08], [0.24, 0.22], [0.2, 0.36], [0.12, 0.42], [0.13, 0.48]].map(([a, b]) => new THREE.Vector2(a, b)); return new THREE.LatheGeometry(pts, 24); }, []);
  const jar = useMemo(() => { const pts = [[0, 0], [0.1, 0], [0.18, 0.1], [0.2, 0.24], [0.15, 0.34], [0.09, 0.38], [0.1, 0.44]].map(([a, b]) => new THREE.Vector2(a, b)); const g = new THREE.LatheGeometry(pts, 24); const h = new THREE.TorusGeometry(0.07, 0.015, 6, 16, Math.PI); h.rotateZ(-Math.PI / 2); h.translate(0.18, 0.26, 0); return merge([g, h]); }, []);
  return <group>{CUTS.map((c) => { const done = dug.includes(c.k), x = c.at[0], z = c.face[2] + 0.55, y = c.face[1] - (c.k === 0 ? 1.2 : 0.8);
    return <group key={c.k}>
      {!done && <mesh position={[x, y + 0.25, z - 0.05]} castShadow><sphereGeometry args={[0.7, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#9a7a55" roughness={1} /></mesh>}
      {done && <group position={[x, y, z]}>
        <mesh position={[0, 0.06, 0]} receiveShadow><boxGeometry args={[0.7, 0.12, 0.5]} /><meshStandardMaterial color="#d8cdb8" roughness={0.9} /></mesh>
        {c.k === 0 && <mesh position={[0, 0.16, 0]} rotation-x={-Math.PI / 2.4} castShadow><boxGeometry args={[0.24, 0.18, 0.04]} /><meshStandardMaterial map={tablet} roughness={0.9} /></mesh>}
        {c.k === 1 && <mesh geometry={pot} position={[0, 0.12, 0]} castShadow><meshStandardMaterial color="#b9714a" roughness={0.85} side={THREE.DoubleSide} /></mesh>}
        {c.k === 2 && <mesh geometry={jar} position={[0, 0.12, 0]} castShadow><meshStandardMaterial color="#8c6a4c" roughness={0.9} side={THREE.DoubleSide} /></mesh>}
      </group>}
    </group>; })}</group>;
}
/** Kazı çadırı (gölgelik) ve elek */
export function Camp() {
  const g = useMemo(() => { const p: Parts = [], x = 14, z = 140, y = natural(x, z); for (const [dx, dz] of [[-3, -2.5], [3, -2.5], [3, 2.5], [-3, 2.5]]) { const c = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6); c.translate(x + dx, y + 1.3, z + dz); p.push(c); }
    const sieve = bx(1, 0.1, 0.7, 1); sieve.translate(x - 1, y + 0.8, z); p.push(sieve); return { poles: merge(p), x, z, y }; }, []);
  return <group>
    <mesh geometry={g.poles} castShadow><meshStandardMaterial color="#6b5a48" roughness={0.8} /></mesh>
    <mesh position={[g.x, g.y + 2.65, g.z]} castShadow><boxGeometry args={[6.4, 0.05, 5.4]} /><meshStandardMaterial color="#f2efe6" roughness={0.9} side={THREE.DoubleSide} /></mesh>
  </group>;
}
export function Olives({ n }: { n: number }) {
  const geo = useMemo(() => { const r = rng(4), parts: THREE.BufferGeometry[] = [], paint = (g: THREE.BufferGeometry, hex: string, j: number) => { const gg = g.index ? g.toNonIndexed() : g, col: number[] = [], cc = new THREE.Color(); for (let i = 0; i < gg.attributes.position.count; i++) { cc.set(hex).offsetHSL(0, 0, (r() - 0.5) * j); col.push(cc.r, cc.g, cc.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return gg; };
    parts.push(paint(new THREE.CylinderGeometry(0.16, 0.26, 1.4, 6).translate(0, 0.7, 0), '#5e5040', 0.05)); for (let i = 0; i < 4; i++) { const a = r() * 6.28; parts.push(paint(new THREE.IcosahedronGeometry(0.9 + r() * 0.3, 1).scale(1.2, 0.8, 1.2).translate(Math.cos(a) * 0.6, 1.9 + r() * 0.3, Math.sin(a) * 0.6), '#7c8a5a', 0.1)); }
    const g = mergeGeometries(parts)!; g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []), ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(12), o = new THREE.Object3D(); let k = 0;
    for (let x = -400; x < 400 && k < n; x += 8) for (let z = -300; z < 420 && k < n; z += 8) { if (natural(x, z) > 0 || r() < 0.35 || (x / 250) ** 2 + (z / 180) ** 2 < 1) continue; if (Math.abs(x) < 30 && z > 160) continue;
      o.position.set(x + (r() - 0.5) * 2, 0, z + (r() - 0.5) * 2); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.8 + r() * 0.5); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const m = ref.current; if (m) { m.count = k; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -200 + r() * 400, z = -100 + r() * 300; if (inT(x, z) || Math.hypot(x - 14, z - 140) < 5) continue; o.position.set(x, natural(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.35 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.13 + r() * 0.06, 0.4, 0.45 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 8; i++) { const a = Math.PI * (i / 4) + r() * 0.3, dd = 1300 + r() * 500; out.push({ p: [Math.cos(a) * dd, -10, Math.sin(a) * dd], g: mountainGeo(500 + r() * 220, 90 + r() * 90, 60 + i, 2, '#9a8e68') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
