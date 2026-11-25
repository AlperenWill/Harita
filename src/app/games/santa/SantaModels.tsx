/**
 * Santa — 3B modeller: ladin ormanlı vadi (yükseklik alanı, dere, kayalar), yamaçlara dağılmış yedi mahalle: tek katlı yıkık taş evler
 * (çatısız, kırık duvar boyları, kapı ve pencere boşlukları, moloz) ve her mahallede yıkık bir kilise (nef, apsis, kemerli kapı, kırık
 * alınlık). Uzak dağlar. Yerleşim ve biçimler TEMSİLÎDİR.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, weather } from '../shared/scenery';
import { BOUNDS, CHURCH, HAMLETS, churchAt, groundY, houses } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => { const n = g.index ? g.toNonIndexed() : g; if (!n.attributes.normal) n.computeVertexNormals(); if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; }))!;
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); return g; };

export interface Mats { stone: THREE.MeshStandardMaterial; grass: THREE.MeshStandardMaterial; rock: THREE.MeshStandardMaterial; water: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('santa-tas', ['#7d7a72', '#8a867c', '#6f6c66', '#96907f', '#7a7464'], [16, 12], [26, 30]);
    const gt = groundTex(); gt.map.repeat.set(90, 90); gt.bump.repeat.set(90, 90);
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.7, roughness: 0.95 })),
      grass: new THREE.MeshStandardMaterial({ color: '#7b955a', map: gt.map, bumpMap: gt.bump, bumpScale: 0.2, roughness: 1 }),
      rock: new THREE.MeshStandardMaterial({ color: '#6f6b63', roughness: 1 }),
      water: new THREE.MeshStandardMaterial({ color: '#6f8f96', roughness: 0.15, metalness: 0.1 }),
    };
  }, []);
}
export function Terrain({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const S = 420, N = 140, t = new THREE.PlaneGeometry(S, S, N, N); t.rotateX(-Math.PI / 2); const p = t.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), out = Math.max(0, Math.abs(x) - BOUNDS.x1, Math.abs(z) - BOUNDS.z1); p.setY(i, groundY(x, z) + out * 0.6 - 0.03); } t.computeVertexNormals();
    // dere: vadi tabanını izleyen ince şerit
    const pos: number[] = [], idx: number[] = []; for (let i = 0; i <= 80; i++) { const z = 140 - i * 3.5, x = -Math.sin(z * 0.02) * 18; for (const s of [-1, 1]) pos.push(x + s * 1.4, groundY(x, z) + 0.06, z); if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); } }
    const river = new THREE.BufferGeometry(); river.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); river.setIndex(idx); river.computeVertexNormals();
    const r = rng(5), rocks: THREE.BufferGeometry[] = []; for (let i = 0; i < 120; i++) { const x = (r() - 0.5) * 250, z = (r() - 0.5) * 250; if (HAMLETS.some((h) => Math.hypot(x - h.c[0], z - h.c[1]) < h.r + 3)) continue; const s = 0.4 + r() * 1.2, d = new THREE.DodecahedronGeometry(s, 0); d.scale(1, 0.6, 1); rocks.push(at(d, x, groundY(x, z) + s * 0.2, z)); }
    return { t, river, rocks: merge(rocks) };
  }, []);
  const mts = useMemo(() => [
    { p: [-420, -10, -200] as [number, number, number], g: mountainGeo(260, 280, 3, 0.7, '#4f5a3c') }, { p: [420, -10, -260] as [number, number, number], g: mountainGeo(280, 300, 5, 0.7, '#4f5a3c') },
    { p: [0, -10, -480] as [number, number, number], g: mountainGeo(320, 340, 7, 0.65, '#4f5a3c') }, { p: [-380, -10, 300] as [number, number, number], g: mountainGeo(260, 250, 9, 0.8, '#55603f') }, { p: [380, -10, 320] as [number, number, number], g: mountainGeo(260, 250, 11, 0.8, '#55603f') },
  ], []);
  return <group>
    <group userData={{ noCast: true }}><mesh geometry={g.t} material={m.grass} receiveShadow />{mts.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>
    <mesh geometry={g.river} material={m.water} />
    <mesh geometry={g.rocks} material={m.rock} castShadow receiveShadow />
  </group>;
}
/** Ladin ormanı: üst üste koniler (örnek çoğaltma); mahallelerin ve yolların dışında */
export function Forest({ n }: { n: number }) {
  const trunk = useRef<THREE.InstancedMesh>(null), crown = useRef<THREE.InstancedMesh>(null);
  const crownGeo = useMemo(() => merge([0, 1, 2].map((k) => at(new THREE.ConeGeometry(2.2 - k * 0.55, 3.2 - k * 0.5, 8), 0, 2.4 + k * 1.9, 0))), []);
  useEffect(() => { const r = rng(31), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 4 && k < n; i++) { const x = (r() - 0.5) * 300, z = (r() - 0.5) * 300; if (HAMLETS.some((h) => Math.hypot(x - h.c[0], z - h.c[1]) < h.r + 6)) continue; if (Math.abs(x + Math.sin(z * 0.02) * 18) < 9 && r() < 0.8) continue; if (Math.abs(x) < 6 && z > 80) continue;
      const s = 0.8 + r() * 0.9; o.position.set(x, groundY(x, z) - 0.2, z); o.rotation.set(0, r() * 3, 0); o.scale.set(s, s * (0.9 + r() * 0.4), s); o.updateMatrix(); trunk.current?.setMatrixAt(k, o.matrix); crown.current?.setMatrixAt(k, o.matrix); c.setHSL(0.34 + r() * 0.04, 0.45, 0.1 + r() * 0.06); crown.current?.setColorAt(k, c); k++; }
    for (const mm of [trunk.current, crown.current]) if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group>
    <instancedMesh ref={trunk} args={[undefined, undefined, n]} castShadow><cylinderGeometry args={[0.18, 0.28, 2.6, 6]} /><meshStandardMaterial color="#4a3a2a" roughness={1} /></instancedMesh>
    <instancedMesh ref={crown} args={[crownGeo, undefined, n]} castShadow><meshStandardMaterial roughness={1} /></instancedMesh>
  </group>;
}
/** Mahalleler: yıkık evler ve kilise */
export function Hamlets({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [], rubble: THREE.BufferGeometry[] = [];
    const wall = (x0: number, z0: number, x1: number, z1: number, y: number, h: number, t: number, gaps: [number, number, number][] = []) => {   // gaps: [konum, genişlik, yükseklik]
      const L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L, rot = -Math.atan2(uz, ux); let a = 0;
      const seg = (t0: number, t1: number, y0: number, y1: number) => { if (t1 - t0 < 0.05 || y1 - y0 < 0.05) return; const b = bx(t1 - t0, y1 - y0, t, 2.5); b.rotateY(rot); const c = (t0 + t1) / 2; b.translate(x0 + ux * c, y + y0 + (y1 - y0) / 2, z0 + uz * c); parts.push(b); };
      for (const [c, w, gh] of [...gaps].sort((p, q) => p[0] - q[0])) { seg(a, c - w / 2, 0, h); seg(c - w / 2, c + w / 2, gh, h); a = c + w / 2; } seg(a, L, 0, h);
    };
    for (const hm of HAMLETS) {
      const r = rng(hm.seed);
      for (const o of houses(hm)) { const y = groundY(o.x, o.z) - 0.3, hw = o.w / 2, hd = o.d / 2, H = () => 1.2 + r() * 1.8, t = 0.55;
        wall(o.x - hw, o.z - hd, o.x + hw, o.z - hd, y, H(), t, [[o.w * 0.5, 0.8, 1.1]]); wall(o.x + hw, o.z - hd, o.x + hw, o.z + hd, y, H(), t);
        wall(o.x + hw, o.z + hd, o.x - hw, o.z + hd, y, H(), t, [[o.w * 0.5, 1.0, 9]]); wall(o.x - hw, o.z + hd, o.x - hw, o.z - hd, y, H(), t);
        for (let k = 0; k < 6; k++) { const s = 0.25 + r() * 0.35, d = new THREE.DodecahedronGeometry(s, 0); rubble.push(at(d, o.x + (r() - 0.5) * (o.w + 1.5), y + 0.3 + s * 0.3, o.z + (r() - 0.5) * (o.d + 1.5))); } }
      // kilise: güney cephede kemerli kapı, kuzeyde yarım daire apsis, kırık alınlık
      const [cx, cz] = churchAt(hm), y = groundY(cx, cz) - 0.3, hw = CHURCH.w / 2, hl = CHURCH.l / 2, H = 5.2, t = 0.7;
      wall(cx - hw, cz + hl, cx + hw, cz + hl, y, H, t, [[hw, 1.4, 2.6]]);
      wall(cx + hw, cz + hl, cx + hw, cz - hl, y, H - 1.2 - r() * 1.5, t, [[hl * 0.6, 0.7, 3.4], [hl * 1.4, 0.7, 3.4]]);
      wall(cx - hw, cz - hl, cx - hw, cz + hl, y, H - 0.6 - r() * 1.6, t, [[hl * 0.7, 0.7, 3.4]]);
      for (const s of [-1, 1]) wall(cx + s * hw, cz - hl, cx + s * 1.3, cz - hl, y, H - 1, t);
      { const ap = new THREE.CylinderGeometry(1.4, 1.4, 3.8, 14, 1, true, Math.PI / 2, Math.PI); const u = ap.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * 2, u.getY(i) * 1.5); parts.push(at(ap, cx, y + 1.9, cz - hl)); }
      { const arc = new THREE.TorusGeometry(0.85, 0.22, 6, 12, Math.PI); parts.push(at(arc, cx, y + 2.6, cz + hl + 0.05)); }
      { const sh = new THREE.Shape(); sh.moveTo(-hw - t / 2, 0); sh.lineTo(hw * 0.2, 0); sh.lineTo(-hw * 0.4, 1.6); sh.closePath(); const tri = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false }); const u = tri.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) / 2.5, u.getY(i) / 2.5); tri.translate(cx, y + H, cz + hl - t / 2); parts.push(tri); }
      for (let k = 0; k < 10; k++) { const s = 0.3 + r() * 0.5, d = new THREE.DodecahedronGeometry(s, 0); rubble.push(at(d, cx + (r() - 0.5) * 6, y + 0.3 + s * 0.3, cz + (r() - 0.5) * 9)); }
    }
    return { parts: merge(parts), rubble: merge(rubble) };
  }, []);
  return <group>
    <mesh geometry={g.parts} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.rubble} material={m.stone} castShadow receiveShadow />
  </group>;
}
