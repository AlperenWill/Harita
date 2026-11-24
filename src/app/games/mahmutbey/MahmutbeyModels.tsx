/**
 * Kasaba Köyü Mahmut Bey Camii — 3B modeller (öteki yeni oyunlarla aynı ortak manzara kiti).
 * Moloz taş duvarlar (köşelerde kesme taş), geniş saçaklı kiremit kırma çatı, ahşap son cemaat yeri; içeride ahşap direkler ve yastıklı
 * başlıklar, kirişli düz tavan ve kalem işi boyalı bezemeler, korkuluklu ahşap mahfil, mihrap, ahşap minber, halılar; dışarıda ahşap köy evleri,
 * mezarlık, ceviz ve kavaklar, ormanlı tepeler. Direk sayısı, ölçüler ve bezeme desenleri TEMSİLÎDİR (docs/MAHMUTBEY.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { CEMETERY, FLOOR, HALL, HOUSES, MAHFIL, MIHRAB, MINBAR, PORCH, POSTS, VILLAGE, WALL_T, inBuilding, terrainBase, FADED, GRID, cellCenter, motifAt } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.64, 0.58).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
const H = 5.6;

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; paint: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('mahmutbey-moloz', ['#a89c86', '#998d77', '#b5a991', '#8e836e', '#a3967f'], [16, 12], [22, 34]);
    const wood = canvasTex(128, 512, (g, r) => { g.fillStyle = '#7a5434'; g.fillRect(0, 0, 128, 512); for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '45,28,16' : '150,108,70'},${0.2 + r() * 0.3})`; g.lineWidth = 1 + r() * 2; const x = r() * 128; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, 170, x - 6, 340, x + 3, 512); g.stroke(); } });
    // kalem işi: kırmızı-lacivert-yeşil zeminde rumi ve geometrik bordürler (temsilî)
    const paint = canvasTex(512, 128, (g, r) => { g.fillStyle = '#8a5a34'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#7a2a22'; g.fillRect(0, 16, 512, 96); g.fillStyle = '#e6c56a'; g.fillRect(0, 12, 512, 5); g.fillRect(0, 111, 512, 5);
      for (let k = 0; k < 8; k++) { const cx = 32 + k * 64; g.fillStyle = k % 2 ? '#2d4a6e' : '#3e6a4a'; g.beginPath(); for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; g.lineTo(cx + Math.cos(a) * 26, 64 + Math.sin(a) * 26); } g.fill(); g.strokeStyle = '#e6c56a'; g.lineWidth = 2; g.stroke();
        g.fillStyle = '#f0e6cc'; g.beginPath(); g.arc(cx, 64, 7, 0, 7); g.fill(); for (let j = 0; j < 4; j++) { const a = (j / 4) * Math.PI * 2 + r() * 0.1; g.beginPath(); g.ellipse(cx + Math.cos(a) * 15, 64 + Math.sin(a) * 15, 6, 3, a, 0, 7); g.fill(); } } });
    const rf = canvasTex(256, 256, (g, r) => { g.fillStyle = '#8f4a34'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 16) for (let x = 0; x < 256; x += 14) { const v = 0.75 + r() * 0.4; g.fillStyle = `rgb(${(160 * v) | 0},${(80 * v) | 0},${(56 * v) | 0})`; g.fillRect(x + ((y / 16) % 2) * 7, y, 12, 14); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + ((y / 16) % 2) * 7, y + 12, 12, 3); } for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,70,40,${r() * 0.3})`; g.beginPath(); g.arc(r() * 256, r() * 256, 4 + r() * 12, 0, 7); g.fill(); } });
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.5, roughness: 0.95 })),
      wood: new THREE.MeshStandardMaterial({ map: wood, roughness: 0.75 }),
      paint: new THREE.MeshStandardMaterial({ map: paint, roughness: 0.8 }),
      roof: new THREE.MeshStandardMaterial({ map: rf, roughness: 0.85 }),
      plaster: new THREE.MeshStandardMaterial({ color: '#ece3d2', roughness: 0.95 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a241f', roughness: 1 }),
    };
  }, []);
}

/* ===================== cami ===================== */
export function Mosque({ m }: { m: Mats }) {
  const walls = useMemo(() => { const parts: THREE.BufferGeometry[] = [], t = WALL_T, y = FLOOR;
    const add = (x0: number, x1: number, z0: number, z1: number, h = H, y0 = 0) => { const g = bx(x1 - x0, h, z1 - z0, 2.2); g.translate((x0 + x1) / 2, y + y0 + h / 2, (z0 + z1) / 2); parts.push(g); };
    add(HALL.x0 - t, HALL.x1 + t, HALL.z0 - t, HALL.z0); add(HALL.x0 - t, HALL.x0, HALL.z0, HALL.z1 + t); add(HALL.x1, HALL.x1 + t, HALL.z0, HALL.z1 + t);
    add(HALL.x0 - t, -1.1, HALL.z1, HALL.z1 + t); add(1.1, HALL.x1 + t, HALL.z1, HALL.z1 + t); add(-1.1, 1.1, HALL.z1, HALL.z1 + t, H - 2.5, 2.5);   // kapılı giriş duvarı
    return merge(parts); }, []);
  // iç sıva (duvarların iç yüzü açık renk): ince levhalar
  const inner = useMemo(() => { const parts: THREE.BufferGeometry[] = [], y = FLOOR + H / 2;
    const p = (w: number, x: number, z: number, ry: number) => { const g = new THREE.PlaneGeometry(w, H); g.rotateY(ry); g.translate(x, y, z); parts.push(g); };
    p(HALL.x1 - HALL.x0, 0, HALL.z0 + 0.01, 0); p(HALL.z1 - HALL.z0, HALL.x0 + 0.01, (HALL.z0 + HALL.z1) / 2, Math.PI / 2); p(HALL.z1 - HALL.z0, HALL.x1 - 0.01, (HALL.z0 + HALL.z1) / 2, -Math.PI / 2);
    // giriş duvarının iç yüzü (önceden taş görünüyordu): kapı boşluğunun iki yanı ve üstü
    for (const [x0, x1] of [[HALL.x0, -1.1], [1.1, HALL.x1]]) p(x1 - x0, (x0 + x1) / 2, HALL.z1 - 0.01, Math.PI);
    { const g = new THREE.PlaneGeometry(2.2, H - 2.5); g.rotateY(Math.PI); g.translate(0, FLOOR + 2.5 + (H - 2.5) / 2, HALL.z1 - 0.01); parts.push(g); }
    return merge(parts); }, []);
  // ahşap iskelet: direkler, yastıklı başlıklar, ana kirişler, tavan kirişleri (kalem işi), tavan tahtası
  const timber = useMemo(() => { const parts: THREE.BufferGeometry[] = [], y = FLOOR;
    for (const [x, z] of POSTS) { const g = new THREE.CylinderGeometry(0.28, 0.32, H - 0.6, 10); g.translate(x, y + (H - 0.6) / 2, z); parts.push(g); const cap = bx(1.1, 0.5, 1.1, 1); cap.translate(x, y + H - 0.35, z); parts.push(cap); }
    for (const z of [-3.6, 1.6]) { const g = bx(HALL.x1 - HALL.x0, 0.45, 0.45, 2); g.translate(0, y + H - 0.12, z); parts.push(g); }
    return merge(parts); }, []);
  const beams = useMemo(() => { const parts: THREE.BufferGeometry[] = [], y = FLOOR + H + 0.1;
    for (let x = HALL.x0 + 0.5; x <= HALL.x1 - 0.4; x += 0.95) { const g = bx(0.26, 0.3, HALL.z1 - HALL.z0, 2.6); g.translate(x, y, (HALL.z0 + HALL.z1) / 2); parts.push(g); }
    return merge(parts); }, []);
  const ceiling = useMemo(() => { const g = new THREE.PlaneGeometry(HALL.x1 - HALL.x0, HALL.z1 - HALL.z0); g.rotateX(Math.PI / 2); g.translate(0, FLOOR + H + 0.26, (HALL.z0 + HALL.z1) / 2); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 12); return g; }, []);
  // mahfil: direklerin önünde, giriş duvarı boyunca ahşap döşeme ve boyalı korkuluk
  const mahfil = useMemo(() => { const parts: THREE.BufferGeometry[] = [], y = FLOOR + MAHFIL.y;
    const deck = bx(HALL.x1 - HALL.x0, 0.25, MAHFIL.z1 - MAHFIL.z0, 2); deck.translate(0, y, (MAHFIL.z0 + MAHFIL.z1) / 2); parts.push(deck);
    for (const x of [-5, 0, 5]) { if (Math.abs(x) < 1.5) continue; const g = new THREE.CylinderGeometry(0.16, 0.18, MAHFIL.y, 8); g.translate(x, FLOOR + MAHFIL.y / 2, MAHFIL.z0 + 0.2); parts.push(g); }
    return merge(parts); }, []);
  const roof = useMemo(() => { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 5, uv.getY(i) * 3); return g; }, []);
  const rug = useMemo(() => canvasTex(256, 256, (g, r) => { g.fillStyle = '#8a2a24'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#d9b46a'; g.lineWidth = 6; for (let i = 0; i < 4; i++) g.strokeRect(10 + i * 14, 10 + i * 14, 236 - i * 28, 236 - i * 28); g.fillStyle = '#2d4a6e'; g.beginPath(); g.moveTo(128, 70); g.lineTo(186, 128); g.lineTo(128, 186); g.lineTo(70, 128); g.fill(); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.1})`; g.fillRect(r() * 256, r() * 256, 2, 2); } }), []);
  return <group>
    <mesh geometry={walls} material={m.stone} castShadow receiveShadow />
    <mesh geometry={inner} material={m.plaster} receiveShadow />
    <mesh geometry={timber} material={m.wood} castShadow receiveShadow />
    <mesh geometry={beams} material={m.paint} castShadow />
    <mesh geometry={ceiling} material={m.paint} />
    <mesh geometry={mahfil} material={m.wood} castShadow receiveShadow />
    <mesh position={[0, FLOOR + MAHFIL.y + 0.6, MAHFIL.z0 + 0.05]}><planeGeometry args={[HALL.x1 - HALL.x0, 0.9]} /><meshStandardMaterial map={m.paint.map} roughness={0.8} side={THREE.DoubleSide} /></mesh>
    {/* çatı: geniş saçaklı kırma çatı; son cemaat yerini de örter */}
    <mesh geometry={roof} material={m.roof} position={[0, FLOOR + H + 0.5, 1]} scale={[HALL.x1 - HALL.x0 + 2 * WALL_T + 2.4, 3.2, HALL.z1 - HALL.z0 + 2 * WALL_T + 6]} castShadow receiveShadow />
    {/* zemin ve halılar */}
    <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR + 0.01, (HALL.z0 + HALL.z1) / 2]} receiveShadow><planeGeometry args={[HALL.x1 - HALL.x0, HALL.z1 - HALL.z0]} /><meshStandardMaterial map={m.wood.map} color="#b08a64" roughness={0.8} /></mesh>
    {[-4, 0, 4].map((x) => <mesh key={x} rotation-x={-Math.PI / 2} position={[x, FLOOR + 0.02, -2]} receiveShadow><planeGeometry args={[3.4, 9]} /><meshStandardMaterial map={rug} roughness={1} /></mesh>)}
    {/* mihrap: güney duvarında sivri kemerli niş (boyalı çerçeve) */}
    <group position={[MIHRAB[0], FLOOR, MIHRAB[1] + 0.05]}>
      <mesh material={m.dark} position={[0, 1.6, 0.01]}><planeGeometry args={[1.3, 2.8]} /></mesh>
      <mesh position={[0, 1.8, 0.02]}><planeGeometry args={[2.4, 3.6]} /><meshStandardMaterial map={m.paint.map} transparent opacity={0.9} /></mesh>
      <mesh material={m.dark} position={[0, 1.6, 0.03]}><planeGeometry args={[1.3, 2.8]} /></mesh>
    </group>
    {/* minber: ahşap, merdivenli */}
    <group position={[(MINBAR.x0 + MINBAR.x1) / 2, FLOOR, (MINBAR.z0 + MINBAR.z1) / 2]}>
      {Array.from({ length: 8 }, (_, i) => <mesh key={i} material={m.wood} position={[0, 0.2 + i * 0.3, 1.6 - i * 0.42]} castShadow><boxGeometry args={[0.9, 0.4 + i * 0.6, 0.45]} /></mesh>)}
      <mesh material={m.wood} position={[0, 3.6, -1.5]} castShadow><boxGeometry args={[1, 1.2, 0.8]} /></mesh>
      <mesh material={m.roof} position={[0, 4.6, -1.5]} castShadow><coneGeometry args={[0.7, 1.2, 4]} /></mesh>
    </group>
    {/* kapı: oymalı ahşap kanatlar (açık) */}
    {[-1, 1].map((s) => <mesh key={s} material={m.wood} position={[s * 1.05, FLOOR + 1.25, HALL.z1 + WALL_T + 0.05 + 0.5]} rotation-y={s * 1.2}><boxGeometry args={[1.0, 2.5, 0.08]} /></mesh>)}
    {/* son cemaat yeri: ahşap direkler, kiriş, döşeme */}
    {[-7.4, -2.6, 2.6, 7.4].map((x) => <mesh key={x} material={m.wood} position={[x, FLOOR + 1.9, PORCH.z1 - 0.4]} castShadow><cylinderGeometry args={[0.2, 0.22, 3.8, 8]} /></mesh>)}
    <mesh material={m.wood} position={[0, FLOOR + 3.9, PORCH.z1 - 0.4]} castShadow><boxGeometry args={[PORCH.x1 - PORCH.x0, 0.35, 0.35]} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR + 0.01, (PORCH.z0 + PORCH.z1) / 2]} receiveShadow><planeGeometry args={[PORCH.x1 - PORCH.x0, PORCH.z1 - PORCH.z0]} /><meshStandardMaterial map={m.wood.map} color="#9a7a58" roughness={0.85} /></mesh>
    {/* pencereler (dışarıdan koyu, içeriden ışıklı) */}
    {[-1, 1].flatMap((s) => [-5, -1, 3].map((z) => <mesh key={`${s}${z}`} position={[s * (HALL.x1 + WALL_T + 0.01), FLOOR + 2.4, z]} rotation-y={s * Math.PI / 2}><planeGeometry args={[0.9, 1.4]} /><meshStandardMaterial color="#fff4dc" emissive="#fff1d0" emissiveIntensity={0.6} /></mesh>))}
    <pointLight position={[0, FLOOR + 4.4, -1]} color="#ffe3b8" intensity={80} distance={16} decay={2} />
    <pointLight position={[0, FLOOR + 2.2, -6.5]} color="#ffd9a0" intensity={25} distance={6} decay={2} />
  </group>;
}

/* ===================== köy ===================== */
export function Ground({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 200 : 140, g = new THREE.PlaneGeometry(900, 900, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#6f9445'), lush = new THREE.Color('#577f38'), path = new THREE.Color('#9a8a6a');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), far = Math.max(0, Math.hypot(x, z) - 110); p.setY(i, terrainBase(x, z) + far * 0.14 * (0.6 + 0.4 * Math.sin(x * 0.012 + z * 0.01)));
      c.copy(grass).lerp(lush, 0.3 + 0.3 * Math.sin(x * 0.04 + z * 0.03)); if (Math.abs(x - 4) < 2.6 && z > 9) c.lerp(path, 0.85); if (Math.abs(x) < 11 && z > -12 && z < 16) c.lerp(path, 0.35);
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
/** Kastamonu köy evleri: taş zemin kat, ahşap karkas sıvalı üst kat, kiremit çatı (temsilî) */
export function Houses({ m }: { m: Mats }) {
  const N = HOUSES.length, base = useRef<THREE.InstancedMesh>(null), up = useRef<THREE.InstancedMesh>(null), roof = useRef<THREE.InstancedMesh>(null);
  const tex = useMemo(() => canvasTex(256, 128, (g) => { g.fillStyle = '#efe7d6'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#5b4330'; g.fillRect(0, 0, 256, 8); g.fillRect(0, 120, 256, 8); for (const x of [0, 84, 168, 248]) g.fillRect(x, 0, 8, 128); g.save(); g.strokeStyle = '#5b4330'; g.lineWidth = 6; g.beginPath(); g.moveTo(8, 120); g.lineTo(84, 8); g.moveTo(168, 8); g.lineTo(248, 120); g.stroke(); g.restore(); g.fillStyle = '#3a4048'; g.fillRect(106, 34, 44, 56); g.fillStyle = '#5b4330'; g.fillRect(126, 34, 4, 56); }), []);
  const upMats = useMemo(() => { const s = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), f = new THREE.MeshStandardMaterial({ color: '#d8cfbe' }); return [s, s, f, f, s, s]; }, [tex]);
  const roofGeo = useMemo(() => { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); return g; }, []);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useEffect(() => { const o = new THREE.Object3D();
    HOUSES.forEach((h, i) => { const y = terrainBase(h.x, h.z) - 0.5, gH = 3.2, uH = h.floors > 1 ? 2.8 : 0.01; o.rotation.set(0, h.yaw, 0);
      o.position.set(h.x, y + gH / 2, h.z); o.scale.set(h.w, gH, h.d); o.updateMatrix(); base.current?.setMatrixAt(i, o.matrix);
      o.position.set(h.x, y + gH + uH / 2, h.z); o.scale.set(h.w + 0.5, uH, h.d + 0.5); o.updateMatrix(); up.current?.setMatrixAt(i, o.matrix);
      o.position.set(h.x, y + gH + uH, h.z); o.scale.set(h.w + 2, 2.2, h.d + 2); o.updateMatrix(); roof.current?.setMatrixAt(i, o.matrix); });
    for (const mm of [base.current, up.current, roof.current]) if (mm) { mm.count = N; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [N]);
  return <group>
    <instancedMesh ref={base} args={[box, m.stone, N]} castShadow receiveShadow />
    <instancedMesh ref={up} args={[box, upMats, N]} castShadow receiveShadow />
    <instancedMesh ref={roof} args={[roofGeo, m.roof, N]} castShadow />
  </group>;
}
/** Mezarlık: alçak taş duvar ve mezar taşları */
export function Cemetery({ m }: { m: Mats }) {
  const geo = useMemo(() => { const parts: THREE.BufferGeometry[] = [], c = CEMETERY, r = rng(7);
    for (const [x0, z0, x1, z1] of [[c.x0, c.z0, c.x1, c.z0], [c.x0, c.z1, c.x1, c.z1], [c.x0, c.z0, c.x0, c.z1], [c.x1, c.z0, c.x1, c.z1]] as const) { const L = Math.hypot(x1 - x0, z1 - z0), g = bx(x1 === x0 ? 0.4 : L, 0.7, x1 === x0 ? L : 0.4, 1.5); g.translate((x0 + x1) / 2, terrainBase((x0 + x1) / 2, (z0 + z1) / 2) + 0.35, (z0 + z1) / 2); parts.push(g); }
    for (let i = 0; i < 14; i++) { const x = c.x0 + 1 + r() * (c.x1 - c.x0 - 2), z = c.z0 + 1 + r() * (c.z1 - c.z0 - 2), h = 0.7 + r() * 0.6, g = bx(0.35, h, 0.12, 1); g.rotateZ((r() - 0.5) * 0.15); g.translate(x, terrainBase(x, z) + h / 2, z); parts.push(g); }
    return merge(parts); }, []);
  return <mesh geometry={geo} material={m.stone} castShadow receiveShadow />;
}
export function Trees({ n }: { n: number }) {
  const kinds = useMemo(() => { const r = rng(3), paint = (g: THREE.BufferGeometry, hex: string, j: number) => { const gg = g.index ? g.toNonIndexed() : g, col: number[] = [], cc = new THREE.Color(); for (let i = 0; i < gg.attributes.position.count; i++) { cc.set(hex).offsetHSL(0, 0, (r() - 0.5) * j); col.push(cc.r, cc.g, cc.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.deleteAttribute('uv'); return gg; };
    const walnut = mergeGeometries([paint(new THREE.CylinderGeometry(0.3, 0.45, 3.6, 7).translate(0, 1.8, 0), '#5f4c3a', 0.05), ...Array.from({ length: 7 }, (_, i) => { const a = r() * 6.28, d = i ? 1.8 + r() : 0; return paint(new THREE.IcosahedronGeometry(2 + r() * 0.6, 1).translate(Math.cos(a) * d, 5 + r() * 1.6, Math.sin(a) * d), '#557a34', 0.12); })])!;
    const poplar = mergeGeometries([paint(new THREE.CylinderGeometry(0.15, 0.25, 3, 6).translate(0, 1.5, 0), '#6a5a44', 0.05), paint(new THREE.SphereGeometry(1.3, 10, 12).scale(1, 4, 1).translate(0, 7, 0), '#6f9a3e', 0.12)])!;
    const pine = mergeGeometries([paint(new THREE.CylinderGeometry(0.15, 0.3, 3, 6).translate(0, 1.5, 0), '#4a3828', 0.05), ...[0, 1, 2, 3].map((k) => paint(new THREE.ConeGeometry(2.4 - k * 0.5, 3, 8).translate(0, 3.2 + k * 1.8, 0), '#2f4a2c', 0.1))])!;
    for (const g of [walnut, poplar, pine]) g.computeVertexNormals(); return [walnut, poplar, pine]; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []), refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  useEffect(() => { const r = rng(23), o = new THREE.Object3D(), cnt = [0, 0, 0];
    for (let i = 0; i < n * 10 && cnt[0] + cnt[1] + cnt[2] < n; i++) { const far = r() < 0.5, a = r() * 6.28, d = far ? 90 + r() * 200 : 14 + r() * 70, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (inBuilding(x, z, 6) || Math.abs(x - 4) < 4 || HOUSES.some((h) => Math.hypot(h.x - x, h.z - z) < Math.max(h.w, h.d) / 2 + 3) || (x > CEMETERY.x0 - 2 && x < CEMETERY.x1 + 2 && z > CEMETERY.z0 - 2 && z < CEMETERY.z1 + 2)) continue;
      const t = far ? 2 : r() < 0.6 ? 0 : 1, mm = refs.current[t]; if (!mm) continue; const y = terrainBase(x, z) + Math.max(0, Math.hypot(x, z) - 110) * 0.14 * (0.6 + 0.4 * Math.sin(x * 0.012 + z * 0.01));
      o.position.set(x, y - 0.1, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.8 + r() * 0.5); o.updateMatrix(); mm.setMatrixAt(cnt[t]++, o.matrix); }
    refs.current.forEach((mm, i) => { if (!mm) return; mm.count = cnt[i]; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); }); }, [n, kinds]);
  return <group>{kinds.map((g, i) => <instancedMesh key={i} ref={(mm) => { refs.current[i] = mm; }} args={[g, mat, n]} castShadow receiveShadow />)}</group>;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = VILLAGE.x0 + r() * (VILLAGE.x1 - VILLAGE.x0), z = VILLAGE.z0 + r() * (VILLAGE.z1 - VILLAGE.z0);
      if (inBuilding(x, z, 1.5) || (Math.abs(x - 4) < 2.8 && z > 9) || (Math.abs(x) < 10 && z > -11 && z < 15) || HOUSES.some((h) => Math.abs(h.x - x) < h.w / 2 + 0.6 && Math.abs(h.z - z) < h.d / 2 + 0.6)) continue;
      o.position.set(x, terrainBase(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.24 + r() * 0.05, 0.45, 0.38 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Mountains() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + r() * 0.3, dd = 900 + r() * 500; out.push({ p: [Math.cos(a) * dd, -10, Math.sin(a) * dd], g: mountainGeo(450 + r() * 250, 220 + r() * 200, 50 + i, 2, '#3f5a34') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}

/* ===================== kalem işi gözleri: solmuş ve tamamlanmış ===================== */
export const paintState = { done: [] as string[] };
const MOTIF_COLORS = ['#2d4a6e', '#3e6a4a', '#d6a63c'];
export function motifTex(k: number | null) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  if (k === null) { g.fillStyle = '#b9a98c'; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(120,90,60,0.25)'; for (let i = 0; i < 60; i++) g.fillRect((i * 37) % 128, (i * 59) % 128, 10, 3); g.strokeStyle = 'rgba(122,42,34,0.35)'; g.lineWidth = 4; g.strokeRect(6, 6, 116, 116); }
  else { g.fillStyle = '#7a2a22'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#e6c56a'; g.lineWidth = 5; g.strokeRect(5, 5, 118, 118); g.fillStyle = MOTIF_COLORS[k]; g.beginPath(); for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; g.lineTo(64 + Math.cos(a) * 42, 64 + Math.sin(a) * 42); } g.fill();
    g.fillStyle = '#f0e6cc'; g.beginPath(); g.arc(64, 64, 10, 0, 7); g.fill(); for (let j = 0; j < 4; j++) { const a = (j / 4) * Math.PI * 2; g.beginPath(); g.ellipse(64 + Math.cos(a) * 24, 64 + Math.sin(a) * 24, 9, 4, a, 0, 7); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
export function PaintCells() {
  const faded = useMemo(() => motifTex(null), []), filled = useMemo(() => FADED.map((f) => motifTex(motifAt(f.i, f.j))), []);
  const refs = useRef<(THREE.MeshStandardMaterial | null)[]>([]), seen = useRef('');
  useFrame(() => { const key = paintState.done.join(); if (key === seen.current) return; seen.current = key; FADED.forEach((f, i) => { const mt = refs.current[i]; if (mt) { mt.map = paintState.done.includes(f.id) ? filled[i] : faded; mt.needsUpdate = true; } }); });
  return <group>{FADED.map((f, i) => { const [x, z] = cellCenter(f.i, f.j); return <mesh key={f.id} position={[x, FLOOR + H + 0.245, z]} rotation-x={Math.PI / 2}><planeGeometry args={[GRID.dx - 0.28, GRID.dz - 0.1]} /><meshStandardMaterial ref={(mt) => { refs.current[i] = mt; }} map={faded} roughness={0.85} /></mesh>; })}</group>;
}
