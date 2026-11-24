/**
 * Malazgirt — 3B modeller: bozkır ovası, kuzeye uzanan taş kenarlı yürüyüş yolu, yol boyunca bilgi panoları (tarih ve başlık), yolun
 * ucunda merasim alanı (alçak sahne ve basamaklar), namazgah (mihraplı alçak duvar), uzakta dağlar. Biçimler TEMSİLÎDİR.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards } from '../shared/scenery';
import { useFrame } from '@react-three/fiber';
import { ARCH, BOARD_ORDER, EVENTS, MAP_STEPS, NAMAZGAH, PATH, PLAZA, STAGE, TABLE, TARGETS, boardPos, groundY, type V2 } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];

export interface Mats { stone: THREE.MeshStandardMaterial; gravel: THREE.MeshStandardMaterial; post: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('malazgirt-tas', ['#4c4844', '#57524c', '#423e3a', '#5e5953'], [26, 14], [44, 40]);
    const gr = canvasTex(256, 256, (g, r) => { g.fillStyle = '#c9bea6'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 4000; i++) { const v = 150 + r() * 80 | 0; g.fillStyle = `rgba(${v},${v - 10},${v - 25},0.6)`; g.fillRect(r() * 256, r() * 256, 2, 2); } });
    gr.repeat.set(2, 60);
    return { stone: new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.5, roughness: 0.92 }), gravel: new THREE.MeshStandardMaterial({ map: gr, roughness: 1, side: THREE.DoubleSide }), post: new THREE.MeshStandardMaterial({ color: '#5a5048', roughness: 0.8 }) };
  }, []);
}
export function Ground() {
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(500, 500, 120, 120); g.rotateX(-Math.PI / 2); const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i)) - 0.03); g.computeVertexNormals(); return g; }, []);
  const tex = useMemo(() => groundTex(), []);
  return <group userData={{ noCast: true }}>
    <mesh geometry={geo} receiveShadow><meshStandardMaterial color="#b8a874" map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.6, 0]}><planeGeometry args={[8000, 8000]} /><meshStandardMaterial color="#ad9f6c" roughness={1} /></mesh>
  </group>;
}
/** Yol: çakıl şerit (araziyi izler) ve iki yanda kenar taşları */
export function Path({ m }: { m: Mats }) {
  const g = useMemo(() => { const pos: number[] = [], uv: number[] = [], idx: number[] = [], n = 120, L = PATH.z1 - PATH.z0;
    for (let i = 0; i <= n; i++) { const z = PATH.z1 - (i / n) * L; for (const s of [-1, 1]) { const x = (s * PATH.w) / 2; pos.push(x, groundY(x, z) + 0.04, z); uv.push(s < 0 ? 0 : 1, i / n); } if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } }
    const p = new THREE.BufferGeometry(); p.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); p.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); p.setIndex(idx); p.computeVertexNormals();
    const e: Parts = []; for (let z = PATH.z0; z < PATH.z1; z += 1.5) for (const s of [-1, 1]) { const b = bx(0.35, 0.25, 1.3, 1); b.translate((s * (PATH.w + 0.35)) / 2, groundY((s * PATH.w) / 2, z) + 0.12, z); e.push(b); }
    const plaza = new THREE.CircleGeometry(PLAZA.r, 48); plaza.rotateX(-Math.PI / 2); plaza.translate(0, groundY(0, PLAZA.z) + 0.05, PLAZA.z);
    return { p, e: merge(e), plaza }; }, []);
  return <group>
    <mesh geometry={g.p} material={m.gravel} receiveShadow />
    <mesh geometry={g.plaza} material={m.gravel} receiveShadow />
    <mesh geometry={g.e} material={m.stone} castShadow receiveShadow />
  </group>;
}
/** Bilgi panoları: iki ayak, pano yüzünde tarih ve başlık; alınan panoda yüz soluklaşır */
export function Boards({ m, got }: { m: Mats; got: string[] }) {
  const texs = useMemo(() => BOARD_ORDER.map((id) => { const e = EVENTS.find((q) => q.id === id)!; return canvasTex(512, 320, (g) => { g.fillStyle = '#2f3a40'; g.fillRect(0, 0, 512, 320); g.fillStyle = '#e9dfc4'; g.textAlign = 'center'; g.font = 'bold 40px sans-serif'; g.fillText(e.date, 256, 120); g.font = '32px sans-serif'; g.fillText(e.name, 256, 190); g.strokeStyle = '#e9dfc4'; g.lineWidth = 4; g.strokeRect(16, 16, 480, 288); }); }), []);
  return <group>{BOARD_ORDER.map((id, k) => { const [x, z] = boardPos(k), y = groundY(x, z), face = -Math.sign(x) * Math.PI / 2;
    return <group key={id} position={[x, y, z]} rotation-y={face}>
      {[-0.9, 0.9].map((s) => <mesh key={s} material={m.post} position={[s, 0.9, -0.05]} castShadow><boxGeometry args={[0.1, 1.8, 0.1]} /></mesh>)}
      <mesh position={[0, 1.7, 0]} castShadow><boxGeometry args={[2.2, 1.4, 0.08]} /><meshStandardMaterial color="#3a3530" roughness={0.8} /></mesh>
      <mesh position={[0, 1.7, 0.045]}><planeGeometry args={[2.1, 1.3]} /><meshStandardMaterial map={texs[k]} roughness={0.7} transparent opacity={got.includes(id) ? 0.55 : 1} /></mesh>
    </group>; })}</group>;
}
/** Merasim alanı ve namazgah */
export function Plaza({ m }: { m: Mats }) {
  const g = useMemo(() => { const p: Parts = [], dk: Parts = [], y = groundY(0, PLAZA.z);
    const st = bx(STAGE.x1 - STAGE.x0, 1, STAGE.z1 - STAGE.z0, 2); st.translate((STAGE.x0 + STAGE.x1) / 2, y + 0.5, (STAGE.z0 + STAGE.z1) / 2); p.push(st);
    for (let k = 0; k < 3; k++) { const b = bx(STAGE.x1 - STAGE.x0 + 2, 0.3 * (3 - k), 0.8, 1.5); b.translate(0, y + 0.15 * (3 - k), STAGE.z1 + 0.4 + k * 0.8); p.push(b); }
    const ny = groundY(NAMAZGAH.x, NAMAZGAH.z), w = bx(12, 1.4, 0.6, 1.5); w.translate(NAMAZGAH.x, ny + 0.7, NAMAZGAH.z - 4); p.push(w);
    const mh = bx(2, 2.6, 0.9, 1.5); mh.translate(NAMAZGAH.x, ny + 1.3, NAMAZGAH.z - 4.1); p.push(mh);
    const s = new THREE.Shape(); s.moveTo(-0.55, 0); s.lineTo(-0.55, 1.4); s.quadraticCurveTo(-0.55, 2.1, 0, 2.3); s.quadraticCurveTo(0.55, 2.1, 0.55, 1.4); s.lineTo(0.55, 0); s.closePath(); const ng = new THREE.ShapeGeometry(s, 6); ng.translate(NAMAZGAH.x, ny + 0.05, NAMAZGAH.z - 3.63); dk.push(ng);
    const fl = new THREE.PlaneGeometry(12, 7); fl.rotateX(-Math.PI / 2); fl.translate(NAMAZGAH.x, ny + 0.06, NAMAZGAH.z - 0.5);
    return { p: merge(p), dk: merge(dk), fl }; }, []);
  return <group>
    <mesh geometry={g.p} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.dk}><meshStandardMaterial color="#2a2622" roughness={1} /></mesh>
    <mesh geometry={g.fl} receiveShadow><meshStandardMaterial color="#cfc3a6" roughness={0.95} /></mesh>
  </group>;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -120 + r() * 240, z = -170 + r() * 330; if (Math.abs(x) < PATH.w / 2 + 1 && z > PATH.z0 - 2 && z < PATH.z1 + 2) continue; if (Math.hypot(x, z - PLAZA.z) < PLAZA.r + 1) continue;
      o.position.set(x, groundY(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.5; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.12 + r() * 0.04, 0.45, 0.5 + r() * 0.12); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Mountains() {
  const list = useMemo(() => [
    { p: [900, -10, 1800] as [number, number, number], g: mountainGeo(1300, 900, 3, 0.45, '#7d7462') },
    { p: [-1600, -10, -400] as [number, number, number], g: mountainGeo(900, 380, 7, 0.9, '#857a62') },
    { p: [600, -10, -1800] as [number, number, number], g: mountainGeo(1100, 420, 11, 0.9, '#857a62') },
    { p: [1900, -10, -200] as [number, number, number], g: mountainGeo(800, 300, 13, 1, '#8a7f66') },
  ], []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}

/* ===================== okçuluk alanı ===================== */
/** Hedefler (saman yastık, halkalı yüz, ayaklı), atış çizgisi, çit */
export function Range({ m }: { m: Mats }) {
  const face = useMemo(() => canvasTex(256, 256, (g) => { const c = ['#f2ece0', '#2b2b2b', '#3f7fb0', '#c8402f', '#e8c33a']; for (let i = 0; i < 5; i++) { g.fillStyle = c[i]; g.beginPath(); g.arc(128, 128, 126 - i * 25, 0, 7); g.fill(); } }), []);
  const fence = useMemo(() => { const p: Parts = []; const [lx, lz] = ARCH.line; for (let x = lx; x < lx + 48; x += 3) for (const s of [-1, 1]) { const post = bx(0.12, 1.1, 0.12, 1); post.translate(x, groundY(x, lz + s * 7.2) + 0.55, lz + s * 7.2); p.push(post); const rail = bx(3, 0.08, 0.06, 1); rail.translate(x + 1.5, groundY(x, lz + s * 7.2) + 0.95, lz + s * 7.2); p.push(rail); }
    const line = bx(0.15, 0.04, 14, 1); line.translate(lx + 0.4, groundY(lx, lz) + 0.03, lz); p.push(line); return merge(p); }, []);
  return <group>
    <mesh geometry={fence} material={m.post} castShadow />
    {TARGETS.map((t, i) => { const y = groundY(t.x, t.z); return <group key={i} position={[t.x, y, t.z]}>
      <mesh rotation-z={Math.PI / 2} position={[0, t.y, 0]} castShadow><cylinderGeometry args={[t.r + 0.1, t.r + 0.1, 0.4, 24]} /><meshStandardMaterial color="#c9b47a" roughness={1} /></mesh>
      <mesh position={[-0.21, t.y, 0]} rotation-y={-Math.PI / 2}><circleGeometry args={[t.r, 32]} /><meshStandardMaterial map={face} roughness={0.9} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} material={m.post} position={[0.15, t.y / 2, s * 0.4]} rotation-z={0.2}><boxGeometry args={[0.08, t.y + 0.4, 0.08]} /></mesh>)}
    </group>; })}
  </group>;
}
/** Uçan ve saplanan oklar: oyun bu diziyi günceller, burada çizilir */
export const arrows: { p: THREE.Vector3; v: THREE.Vector3; stuck: boolean }[] = [];
export function Arrows() {
  const ref = useRef<THREE.InstancedMesh>(null), o = useMemo(() => new THREE.Object3D(), []), up = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const geo = useMemo(() => { const shaft = new THREE.CylinderGeometry(0.014, 0.014, 0.8, 5); shaft.rotateX(Math.PI / 2); const fl = new THREE.BoxGeometry(0.06, 0.005, 0.12); fl.translate(0, 0, -0.34); const fl2 = fl.clone(); fl2.rotateZ(Math.PI / 2); return merge([shaft, fl, fl2]); }, []);
  useFrame(() => { const mm = ref.current; if (!mm) return; arrows.forEach((a, i) => { if (i >= 32) return; o.position.copy(a.p); o.quaternion.setFromUnitVectors(up, a.v.clone().normalize()); o.updateMatrix(); mm.setMatrixAt(i, o.matrix); }); mm.count = Math.min(32, arrows.length); mm.instanceMatrix.needsUpdate = true; });
  return <instancedMesh ref={ref} args={[geo, undefined, 32]} frustumCulled={false}><meshStandardMaterial color="#6b4a2e" roughness={0.8} /></instancedMesh>;
}

/* ===================== kum masası ===================== */
export function MapTable({ m, step }: { m: Mats; step: number }) {
  const relief = useMemo(() => canvasTex(512, 384, (g, r) => { g.fillStyle = '#c7b68a'; g.fillRect(0, 0, 512, 384); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '150,130,90' : '215,200,160'},0.35)`; g.beginPath(); g.ellipse(r() * 512, r() * 384, 20 + r() * 50, 10 + r() * 30, r() * 3, 0, 7); g.fill(); }
    g.strokeStyle = '#6d8fa0'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 60); g.bezierCurveTo(160, 40, 300, 90, 512, 50); g.stroke();
    g.fillStyle = '#4a4540'; g.fillRect(200, 40, 40, 26); g.fillStyle = '#2f2a26'; g.font = 'bold 18px sans-serif'; g.fillText('Malazgirt', 248, 60); }), []);
  const refs = useRef<(THREE.Mesh | null)[]>([]), [tx, tz] = TABLE.at, y0 = groundY(tx, tz) + TABLE.h;
  const toW = (p: V2) => new THREE.Vector3(tx + p[0] * TABLE.w * 0.45, y0 + 0.09, tz + p[1] * TABLE.d * 0.45);
  // birlik sayısı en çok olan adıma göre jetonlar: 3 Bizans + 1 arka koruma + 4 Selçuklu
  const slots = useMemo(() => ({ b: 3, s: 4 }), []);
  useFrame((_, dt) => { const st = MAP_STEPS[Math.max(0, Math.min(MAP_STEPS.length - 1, step))];
    for (let i = 0; i < slots.b + 1 + slots.s; i++) { const mesh = refs.current[i]; if (!mesh) continue; let p: V2 | undefined;
      if (i < slots.b) p = st.b[i] ?? st.b[st.b.length - 1]; else if (i === slots.b) p = st.r; else p = st.s[i - slots.b - 1] ?? st.s[st.s.length - 1];
      mesh.position.lerp(toW(p), Math.min(1, dt * 3)); mesh.visible = i < slots.b ? i < st.b.length || st.b.length === 1 : i === slots.b ? true : i - slots.b - 1 < st.s.length; } });
  return <group>
    <mesh material={m.post} position={[tx, y0 / 2 + groundY(tx, tz) / 2, tz]} castShadow receiveShadow><boxGeometry args={[TABLE.w, TABLE.h, TABLE.d]} /></mesh>
    <mesh position={[tx, y0 + 0.01, tz]} rotation-x={-Math.PI / 2}><planeGeometry args={[TABLE.w - 0.3, TABLE.d - 0.3]} /><meshStandardMaterial map={relief} roughness={1} /></mesh>
    {Array.from({ length: slots.b + 1 + slots.s }, (_, i) => <mesh key={i} ref={(mm) => { refs.current[i] = mm; }} position={toW([0, 0])} castShadow>
      <boxGeometry args={i <= slots.b ? [0.55, 0.16, 0.22] : [0.4, 0.16, 0.4]} /><meshStandardMaterial color={i < slots.b ? '#2f5f9a' : i === slots.b ? '#8fb1d8' : '#9a4a2e'} roughness={0.6} /></mesh>)}
  </group>;
}
