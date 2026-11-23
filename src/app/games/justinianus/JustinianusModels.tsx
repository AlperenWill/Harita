/**
 * Justinianus (Beşköprü) Köprüsü — 3B modeller. 12 kemerli taş köprü gövdesi (kemer boşlukları kesilmiş tek parça), iki ucunda toprak rampalar ve taş
 * parapetler, tabliye kaplaması, altından akan dere, kıyı sazlıkları, kavaklar ve uzak dağlar. Ölçüler 152 m'ye kısaltılmış, kemer sayısı gerçektir;
 * kemer biçimi, malzeme ve çevre TEMSİLÎDİR (docs/JUSTINIANUS.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, useGrassCards } from '../shared/scenery';
import { ARCHES, AREA, DECK_H, DECK_X, HALF_W, RAMP_X, STREAM } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.62, 0.6).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; deck: THREE.MeshStandardMaterial; earth: THREE.MeshStandardMaterial; water: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    // taş: büyük kesme taş ve ince tuğla derzleri (ExtrudeGeometry UV'si metre cinsindendir, bu yüzden tekrar küçük tutulur)
    const st = canvasTex(256, 256, (g, r) => { g.fillStyle = '#b9a98a'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 64) { const v = 0.82 + r() * 0.3, o = ((y / 32) % 2) * 32; g.fillStyle = `rgb(${(190 * v) | 0},${(172 * v) | 0},${(140 * v) | 0})`; g.fillRect(x + o + 2, y + 2, 60, 28); }
      g.fillStyle = 'rgba(120,70,50,0.55)'; for (let y = 0; y < 256; y += 128) g.fillRect(0, y + 28, 256, 4); });
    st.repeat.set(0.1, 0.1);
    const dk = canvasTex(256, 256, (g, r) => { g.fillStyle = '#9a8f7a'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,64,54' : '210,200,180'},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 8, 4 + r() * 5, r() * 3, 0, 7); g.fill(); } });
    dk.repeat.set(20, 1.2);
    return {
      stone: new THREE.MeshStandardMaterial({ map: st, roughness: 0.95 }),
      deck: new THREE.MeshStandardMaterial({ map: dk, roughness: 0.95 }),
      earth: new THREE.MeshStandardMaterial({ color: '#8f8368', roughness: 1 }),
      water: new THREE.MeshStandardMaterial({ color: '#4a7a7e', roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.88 }),
    };
  }, []);
}

/* ===================== köprü ===================== */
export function Bridge({ m }: { m: Mats }) {
  const body = useMemo(() => {
    const pitch = (2 * DECK_X) / ARCHES, span = pitch * 0.75, r = span / 2, sh = new THREE.Shape();
    sh.moveTo(-DECK_X, 0); sh.lineTo(-DECK_X, DECK_H); sh.lineTo(DECK_X, DECK_H); sh.lineTo(DECK_X, 0);
    for (let i = ARCHES - 1; i >= 0; i--) { const cx = -DECK_X + pitch * (i + 0.5); sh.lineTo(cx + r, 0); sh.absarc(cx, 0, r, 0, Math.PI, false); }
    sh.lineTo(-DECK_X, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: HALF_W * 2, bevelEnabled: false, curveSegments: 14 }); g.translate(0, 0, -HALF_W); return g; }, []);
  const ramps = useMemo(() => { const parts: Parts = [];
    for (const side of [-1, 1]) {
      const s = new THREE.Shape(); s.moveTo(side * DECK_X, 0); s.lineTo(side * RAMP_X, 0); s.lineTo(side * DECK_X, DECK_H); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: HALF_W * 2, bevelEnabled: false }); g.translate(0, 0, -HALF_W); parts.push(g);
      // taş parapet: rampanın iki yanında eğik ince duvar
      for (const z of [-HALF_W - 0.25, HALF_W + 0.25]) { const q = new THREE.Shape(); q.moveTo(side * DECK_X, DECK_H); q.lineTo(side * RAMP_X, 0); q.lineTo(side * RAMP_X, 0.9); q.lineTo(side * DECK_X, DECK_H + 0.9); q.closePath();
        const p = new THREE.ExtrudeGeometry(q, { depth: 0.5, bevelEnabled: false }); p.translate(0, 0, z - 0.25); parts.push(p); } }
    return merge(parts); }, []);
  const parapets = useMemo(() => { const parts: Parts = [];
    for (const z of [-HALF_W - 0.25, HALF_W + 0.25]) { const p = bx(DECK_X * 2, 1, 0.5, 3); p.translate(0, DECK_H + 0.5, z); parts.push(p); }
    return merge(parts); }, []);
  const deck = useMemo(() => { const g = new THREE.PlaneGeometry(DECK_X * 2, HALF_W * 2); g.rotateX(-Math.PI / 2); g.translate(0, DECK_H + 0.02, 0); return g; }, []);
  const rampTop = useMemo(() => { const parts: Parts = [];
    for (const side of [-1, 1]) { const L = RAMP_X - DECK_X, len = Math.hypot(L, DECK_H), g = new THREE.PlaneGeometry(len, HALF_W * 2); g.rotateX(-Math.PI / 2); g.rotateZ(side * Math.atan2(DECK_H, L) * -1);
      g.translate(side * (DECK_X + L / 2), DECK_H / 2 + 0.02, 0); parts.push(g); }
    return merge(parts); }, []);
  return <group>
    <mesh geometry={body} material={m.stone} castShadow receiveShadow />
    <mesh geometry={ramps} material={m.stone} castShadow receiveShadow />
    <mesh geometry={parapets} material={m.stone} castShadow receiveShadow />
    <mesh geometry={deck} material={m.deck} receiveShadow />
    <mesh geometry={rampTop} material={m.deck} receiveShadow />
  </group>;
}

/* ===================== ova, dere ===================== */
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 200 : 140, g = new THREE.PlaneGeometry(420, 200, N, Math.round(N * 0.5)); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#84a05a'), dry = new THREE.Color('#a8a672'), silt = new THREE.Color('#a39270');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), dx = x < STREAM.x0 ? STREAM.x0 - x : x > STREAM.x1 ? x - STREAM.x1 : 0, inBed = dx === 0, near = Math.max(0, 1 - dx / 3);
      p.setY(i, inBed ? -0.5 : -0.5 * near);   // dere yatağı: kıyıdan yumuşak inen oluk
      c.copy(grass).lerp(dry, 0.3 + 0.3 * Math.sin(x * 0.04 + z * 0.03)); c.lerp(silt, near * 0.7);
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} roughness={1} /></mesh>;
}
export function Stream({ m }: { m: Mats }) {
  const w = STREAM.x1 - STREAM.x0, cx = (STREAM.x0 + STREAM.x1) / 2;
  return <mesh position={[cx, -0.28, 0]} rotation-x={-Math.PI / 2} userData={{ noCast: true }}><planeGeometry args={[w, 200]} /><primitive object={m.water} attach="material" /></mesh>;
}

/* ===================== çevre ===================== */
export function Reeds({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 4 && k < n; i++) { const side = r() < 0.5 ? STREAM.x0 - r() * 4 : STREAM.x1 + r() * 4, z = -50 + r() * 100, x = r() < 0.7 ? side : AREA.x0 + r() * (AREA.x1 - AREA.x0);
      if (Math.abs(z) < HALF_W + 1.5 && Math.abs(x) < RAMP_X + 2) continue; if (x > STREAM.x0 - 0.3 && x < STREAM.x1 + 0.3) continue;
      o.position.set(x, -0.1, z); o.rotation.set(0, r() * 3, 0); const s = 0.6 + r() * 0.8; o.scale.set(s, s * 1.4, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.2 + r() * 0.06, 0.4, 0.36 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Poplars({ n }: { n: number }) {
  const geo = useMemo(() => { const parts: Parts = []; const t = new THREE.CylinderGeometry(0.2, 0.3, 4, 6); t.translate(0, 2, 0); parts.push(t); const c = new THREE.SphereGeometry(1.4, 10, 8); c.scale(1, 3.4, 1); c.translate(0, 7, 0); parts.push(c); const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4c7a3a', roughness: 0.95 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(3), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n; i++) { const z = (r() < 0.5 ? -1 : 1) * (52 + r() * 24), x = -150 + r() * 300; o.position.set(x, -0.2, z); o.scale.setScalar(0.9 + r() * 0.5); o.rotation.set(0, r() * 6, 0); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }   /* ova sınırının dışında */
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + r() * 0.2, dd = 700 + r() * 300; out.push({ p: [Math.cos(a) * dd, -8, Math.sin(a) * dd], g: mountainGeo(360 + r() * 180, 150 + r() * 130, 270 + i, 0, '#5d7a48') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
