/**
 * Trabzon Ayasofya — 3B modeller (öteki yeni oyunlarla aynı ortak manzara kiti).
 * Kilise duvar levhalarından kurulur (içi de dışı da görünür): kapalı Yunan haçı planı, haç kollarında beşik çatılar, 12 köşeli yüksek
 * kasnak ve kubbe, dört sütun ve kemerleri, apsis, narteks, üç sundurma (güneyde Âdem-Havva frizi), apsiste kartal kabartması,
 * içeride parça parça kalmış freskler ve kubbe freski, batıda çan kulesi, denize bakan bahçe, kıyı ve uzakta şehir.
 * Ölçüler, kasnak/kubbe biçimi, fresk ve kabartma görüntüleri TEMSİLÎDİR (docs/TRABZON-AYASOFYA.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, gable, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { CHURCH, COLUMNS, DOME, FLOOR, GARDEN, SEA_Y, TERRACE_Y, TOWER, ZONES, inChurch, terrainBase } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.62, 0.6).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const T = 0.8, H = 9;

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; marble: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; lead: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; glow: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('trabzon-ayasofya', ['#c9b48e', '#bda783', '#d2bf9a', '#b39c78', '#c4ad88'], [26, 14], [34, 44]);
    const mb = stoneTex('trabzon-mermer', ['#e8e2d6', '#ded7c9', '#eee9df'], [80, 40], [160, 90]);
    const rf = canvasTex(256, 256, (g, r) => { g.fillStyle = '#8f4a34'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 16) for (let x = 0; x < 256; x += 14) { const v = 0.75 + r() * 0.4; g.fillStyle = `rgb(${(160 * v) | 0},${(82 * v) | 0},${(58 * v) | 0})`; g.fillRect(x + ((y / 16) % 2) * 7, y, 12, 14); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + ((y / 16) % 2) * 7, y + 12, 12, 3); } });
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.45, roughness: 0.92 })),
      marble: new THREE.MeshStandardMaterial({ map: mb.map, roughness: 0.55 }),
      roof: new THREE.MeshStandardMaterial({ map: rf, roughness: 0.85 }),
      lead: new THREE.MeshStandardMaterial({ color: '#8b9197', roughness: 0.55, metalness: 0.35 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 1 }),
      glow: new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#fff1d0', emissiveIntensity: 0.9 }),
    };
  }, []);
}
/** Fresk: koyu mavi zemin, haleli figür bantları, kırmızı çerçeveler; çok yerde dökülmüş sıva (yalnız parçalar kalmış) */
function frescoTex(seed: number, lossy = true) {
  return canvasTex(512, 512, (g, r) => {
    g.fillStyle = '#cbbd9e'; g.fillRect(0, 0, 512, 512);
    for (let band = 0; band < 3; band++) { const y0 = 20 + band * 164; g.fillStyle = ['#2f4f6f', '#3a5a74', '#7a3326'][band]; g.fillRect(10, y0, 492, 150); g.strokeStyle = '#a8452e'; g.lineWidth = 6; g.strokeRect(10, y0, 492, 150);
      for (let k = 0; k < 6; k++) { const x = 46 + k * 82; g.fillStyle = '#e2bf62'; g.beginPath(); g.arc(x, y0 + 40, 17, 0, 7); g.fill(); g.fillStyle = '#dcbf9e'; g.beginPath(); g.arc(x, y0 + 40, 10, 0, 7); g.fill();
        g.fillStyle = ['#a33b2c', '#e2d6b8', '#3e6a55', '#7a5a8a'][Math.floor(r() * 4)]; g.beginPath(); g.moveTo(x - 20, y0 + 142); g.lineTo(x - 12, y0 + 56); g.lineTo(x + 12, y0 + 56); g.lineTo(x + 20, y0 + 142); g.fill(); } }
    if (lossy) for (let i = 0; i < 45; i++) { g.fillStyle = `rgba(${200 + r() * 20},${188 + r() * 20},${160 + r() * 20},${0.75 + r() * 0.25})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 8 + r() * 30, 6 + r() * 20, r() * 3, 0, 7); g.fill(); }   // dökülmüş sıva: kalan parçalar
    g.fillStyle = 'rgba(0,0,0,.3)'; g.font = '16px sans-serif'; g.fillText('temsilî', 448, 506);
  }, true, seed);
}
function domeFresco() {
  return canvasTex(512, 256, (g, r) => { g.fillStyle = '#2e4c6c'; g.fillRect(0, 0, 512, 256); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(230,200,120,${r() * 0.5})`; g.fillRect(r() * 512, r() * 256, 2, 2); }
    for (let k = 0; k < 12; k++) { const x = 21 + k * 42.6; g.fillStyle = '#e2bf62'; g.beginPath(); g.arc(x, 200, 13, 0, 7); g.fill(); g.fillStyle = '#e2d6b8'; g.fillRect(x - 9, 210, 18, 46); }
    g.fillStyle = '#d9b75c'; g.fillRect(0, 0, 512, 30); g.fillStyle = 'rgba(0,0,0,.25)'; g.font = '14px sans-serif'; g.fillText('temsilî', 450, 250); });
}

/* ===================== kilise ===================== */
type WallSpec = { x0: number; x1: number; z0: number; z1: number; h: number; y0?: number };
/** Kapı açıklığı bırakarak duvar: `gap` (eksen boyunca merkezde) ve `gapH` yüksekliğinde */
function wallParts(w: WallSpec, gap = 0, gapH = 0): WallSpec[] {
  if (!gap) return [w];
  const alongX = w.x1 - w.x0 > w.z1 - w.z0, c = alongX ? (w.x0 + w.x1) / 2 : (w.z0 + w.z1) / 2, a0 = alongX ? w.x0 : w.z0, a1 = alongX ? w.x1 : w.z1, g0 = c - gap / 2, g1 = c + gap / 2;
  const mk = (s: number, e: number, h: number, y0: number): WallSpec => (alongX ? { ...w, x0: s, x1: e, h, y0 } : { ...w, z0: s, z1: e, h, y0 });
  return [mk(a0, g0, w.h, w.y0 ?? 0), mk(g1, a1, w.h, w.y0 ?? 0), mk(g0, g1, w.h - gapH, (w.y0 ?? 0) + gapH)];
}
function wallGeo(list: WallSpec[]) {
  return mergeGeometries(list.filter((w) => w.h > 0.01).map((w) => { const g = bx(w.x1 - w.x0, w.h, w.z1 - w.z0, 2.2); g.translate((w.x0 + w.x1) / 2, FLOOR + (w.y0 ?? 0) + w.h / 2, (w.z0 + w.z1) / 2); return g.toNonIndexed(); }))!;
}
export function Church({ m }: { m: Mats }) {
  const Z = ZONES;
  const walls = useMemo(() => {
    const L: WallSpec[] = [];
    const nx0 = Z.narteks.x0 - T / 2 - 0.4, ex = Z.naos.x1;
    // naos + narteks dış duvarları (kuzey, güney), sundurmaların arkasında kapalı
    for (const s of [-1, 1]) L.push({ x0: nx0, x1: ex, z0: s * 7.4 - (s > 0 ? T : 0), z1: s * 7.4 + (s < 0 ? T : 0), h: H });
    L.push(...wallParts({ x0: Z.batiSundurma.x1, x1: Z.narteks.x0, z0: -7.4, z1: 7.4, h: H - 0.5 }, 3.2, 3.6));   // narteks batı duvarı (kapılı)
    L.push(...wallParts({ x0: Z.narteks.x1, x1: Z.naos.x0, z0: -7.4, z1: 7.4, h: H }, 3.2, 3.8));   // naos batı duvarı (kapılı)
    for (const s of [-1, 1]) L.push({ x0: ex, x1: ex + T, z0: s > 0 ? 3.4 : -7.4, z1: s > 0 ? 7.4 : -3.4, h: H });   // doğu duvarı (apsisin iki yanı)
    // batı sundurması: yan duvarlar + açık batı kemerinin ayakları ve alınlığı
    for (const s of [-1, 1]) L.push({ x0: Z.batiSundurma.x0 - 0.4, x1: Z.batiSundurma.x1, z0: s * 5 - (s > 0 ? T : 0), z1: s * 5 + (s < 0 ? T : 0), h: 6.2 });
    L.push(...wallParts({ x0: Z.batiSundurma.x0 - 0.4 - T, x1: Z.batiSundurma.x0 - 0.4, z0: -5.8, z1: 5.8, h: 6.2 }, 7.2, 4.6));
    // kuzey ve güney sundurmaları
    for (const p of [Z.kuzeySundurma, Z.guneySundurma]) { const s = p.z0 < 0 ? -1 : 1, outer = s < 0 ? p.z0 : p.z1;
      for (const sx of [-1, 1]) L.push({ x0: sx * 4.4 - (sx > 0 ? T : 0), x1: sx * 4.4 + (sx < 0 ? T : 0), z0: Math.min(outer, s * 7.4), z1: Math.max(outer, s * 7.4), h: 6.6 });
      L.push(...wallParts({ x0: -4.4, x1: 4.4, z0: s < 0 ? outer - T : outer, z1: s < 0 ? outer : outer + T, h: 6.6 }, 5.6, 4.2)); }
    return wallGeo(L);
  }, [Z]);
  // tavan: kubbe altında 7,2 m kare boşluk; köşe bölmeleri ve haç kolları
  const ceiling = useMemo(() => { const parts: THREE.BufferGeometry[] = [], y = FLOOR + H, add = (x0: number, x1: number, z0: number, z1: number, yy = y, th = 0.5) => { const g = bx(x1 - x0, th, z1 - z0, 2.2); g.translate((x0 + x1) / 2, yy + th / 2, (z0 + z1) / 2); parts.push(g.toNonIndexed()); };
    const x0 = Z.narteks.x0 - 1.2, x1 = Z.naos.x1 + T;
    add(x0, -3.6, -7.4, 7.4); add(3.6, x1, -7.4, 7.4); add(-3.6, 3.6, -7.4, -3.6); add(-3.6, 3.6, 3.6, 7.4);
    add(Z.batiSundurma.x0 - 1.2, Z.batiSundurma.x1, -5.8, 5.8, FLOOR + 6.2);
    for (const s of [-1, 1]) add(-5.2, 5.2, s < 0 ? -11.2 : 7.4, s < 0 ? -7.4 : 11.2, FLOOR + 6.6);
    return mergeGeometries(parts)!; }, [Z]);
  // dış çatılar: haç kollarında beşik, köşelerde düz; narteks ve sundurmalarda beşik
  const roofs = useMemo(() => { const parts: THREE.BufferGeometry[] = [], y = FLOOR + H + 0.5;
    const ga = (w: number, h: number, len: number, x: number, yy: number, z: number, rotY: number) => { const g = gable(w, h, len); g.rotateY(rotY); g.translate(x, yy, z); parts.push(g.toNonIndexed()); };
    ga(7.6, 2.6, 26, 1, y, 0, Math.PI / 2);   // doğu-batı kolu
    ga(7.6, 2.6, 16.6, 0, y, 0, 0);   // kuzey-güney kolu
    ga(12, 1.6, Z.batiSundurma.x1 - Z.batiSundurma.x0 + 2.4, (Z.batiSundurma.x0 + Z.batiSundurma.x1) / 2 - 0.6, FLOOR + 6.7, 0, Math.PI / 2);
    for (const s of [-1, 1]) ga(9.6, 1.6, 4.6, 0, FLOOR + 7.1, s * 9.3, 0);
    const g = mergeGeometries(parts.map((p) => { const u = p.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * 3, u.getY(i) * 3); return p; }))!; g.computeVertexNormals(); return g; }, [Z]);
  const fres = useMemo(() => [frescoTex(3), frescoTex(7), frescoTex(11, false)], []), domeTex = useMemo(() => domeFresco(), []);
  const col = useMemo(() => new THREE.CylinderGeometry(0.42, 0.48, H, 16), []);
  const drum = useMemo(() => { const g = new THREE.CylinderGeometry(DOME.r, DOME.r, DOME.drumH, 12, 1, true); return g; }, []);
  const yDrum = DOME.base;
  return <group>
    <mesh geometry={walls} material={m.stone} castShadow receiveShadow />
    <mesh geometry={ceiling} material={m.stone} castShadow receiveShadow />
    <mesh geometry={roofs} material={m.roof} castShadow receiveShadow />
    {/* apsis: yarım silindir + yarım kubbe */}
    <mesh material={m.stone} position={[ZONES.naos.x1 + T / 2, FLOOR + 3.6, 0]} castShadow receiveShadow material-side={THREE.DoubleSide}><cylinderGeometry args={[3.4, 3.4, 7.2, 20, 1, true, 0, Math.PI]} /></mesh>   {/* θ 0..π: yarım silindir +x (doğu) yanında */}
    <mesh material={m.roof} position={[ZONES.naos.x1 + T / 2, FLOOR + 7.2, 0]} rotation-y={Math.PI / 2} castShadow><sphereGeometry args={[3.5, 20, 8, 0, Math.PI, 0, Math.PI / 2]} /></mesh>
    {/* kasnak ve kubbe */}
    <mesh geometry={drum} material={m.stone} position={[0, yDrum + DOME.drumH / 2, 0]} castShadow receiveShadow material-side={THREE.DoubleSide} />
    {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2 + Math.PI / 12; return <mesh key={i} material={m.glow} position={[Math.cos(a) * (DOME.r + 0.02), yDrum + DOME.drumH * 0.55, Math.sin(a) * (DOME.r + 0.02)]} rotation-y={-a + Math.PI / 2}><planeGeometry args={[0.7, 2.2]} /></mesh>; })}
    <mesh material={m.lead} position={[0, yDrum + DOME.drumH, 0]} castShadow><sphereGeometry args={[DOME.r + 0.25, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    <mesh position={[0, yDrum + DOME.drumH - 0.05, 0]}><sphereGeometry args={[DOME.r - 0.05, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial map={domeTex} side={THREE.BackSide} roughness={0.9} emissive="#ffffff" emissiveMap={domeTex} emissiveIntensity={0.12} /></mesh>
    <mesh position={[0, yDrum - 1, 0]}><cylinderGeometry args={[DOME.r - 0.05, DOME.r - 0.05, 2, 12, 1, true]} /><meshStandardMaterial map={fres[2]} side={THREE.BackSide} roughness={0.9} /></mesh>
    {/* sütunlar ve kubbe kemerleri */}
    {COLUMNS.map(([x, z], i) => <mesh key={i} geometry={col} material={m.marble} position={[x, FLOOR + H / 2, z]} castShadow receiveShadow />)}
    {[0, 1, 2, 3].map((i) => { const a = (i * Math.PI) / 2; return <mesh key={'k' + i} material={m.stone} position={[Math.cos(a) * 2.6, FLOOR + H - 2.6, Math.sin(a) * 2.6]} rotation-y={a + Math.PI / 2} castShadow><torusGeometry args={[2.6, 0.32, 8, 16, Math.PI]} /></mesh>; })}
    {/* iç freskler (parçalar): naos ve narteks duvarlarının iç yüzleri, apsis */}
    {[-1, 1].map((s) => <mesh key={'nf' + s} position={[0.7, FLOOR + 5.2, s * 6.58]} rotation-y={s < 0 ? 0 : Math.PI}><planeGeometry args={[18.8, 6.4]} /><meshStandardMaterial map={fres[s < 0 ? 0 : 1]} roughness={0.9} /></mesh>)}
    <mesh position={[ZONES.narteks.x0 - 0.02 + 0.03, FLOOR + 5.4, 4.6]} rotation-y={Math.PI / 2}><planeGeometry args={[3.2, 5.6]} /><meshStandardMaterial map={fres[1]} roughness={0.9} /></mesh>
    <mesh position={[ZONES.naos.x1 + T / 2 - 0.05, FLOOR + 3.6, 0]}><cylinderGeometry args={[3.3, 3.3, 6.4, 20, 1, true, 0, Math.PI]} /><meshStandardMaterial map={fres[0]} side={THREE.BackSide} roughness={0.9} /></mesh>
    {/* iç döşeme */}
    <mesh rotation-x={-Math.PI / 2} position={[(ZONES.narteks.x0 + ZONES.naos.x1) / 2, FLOOR + 0.01, 0]} receiveShadow><planeGeometry args={[ZONES.naos.x1 - ZONES.narteks.x0, 13]} /><meshStandardMaterial map={m.marble.map} roughness={0.5} color="#e6dfd2" /></mesh>
    {/* yan duvar pencereleri (dışarıdan aydınlık görünür) */}
    {[-1, 1].flatMap((s) => [-6, -1, 6].map((x) => <mesh key={`w${s}${x}`} material={m.glow} position={[x, FLOOR + 6.4, s * 7.42]} rotation-y={s < 0 ? Math.PI : 0}><planeGeometry args={[0.8, 2.4]} /></mesh>))}
    <pointLight position={[0, FLOOR + 6, 0]} color="#ffe2b8" intensity={140} distance={22} decay={2} />
    <pointLight position={[-11, FLOOR + 4, 0]} color="#ffe2b8" intensity={50} distance={12} decay={2} />
    <pointLight position={[8, FLOOR + 4, 0]} color="#ffe2b8" intensity={70} distance={14} decay={2} />
  </group>;
}
/** Güney sundurması kemer alnındaki friz (yedi sahne) ve apsisteki kartal kabartması (temsilî) */
export function Reliefs() {
  const frieze = useMemo(() => canvasTex(1024, 128, (g, r) => { g.fillStyle = '#c4ad88'; g.fillRect(0, 0, 1024, 128); g.strokeStyle = '#8f7a58'; g.lineWidth = 4;
    for (let k = 0; k < 7; k++) { const x0 = 8 + k * 144; g.strokeRect(x0, 8, 136, 112); g.fillStyle = 'rgba(90,72,50,.55)';
      for (let f = 0; f < 2; f++) { const x = x0 + 40 + f * 56; g.beginPath(); g.arc(x, 38, 10, 0, 7); g.fill(); g.fillRect(x - 9, 48, 18, 46); g.fillRect(x - 14, 54, 6, 26); g.fillRect(x + 8, 54, 6, 26); }
      if (r() < 0.7) { g.beginPath(); g.moveTo(x0 + 68, 110); g.lineTo(x0 + 68, 40); g.stroke(); g.beginPath(); g.arc(x0 + 68, 40, 18, 0, 7); g.stroke(); } } }), []);
  const eagle = useMemo(() => canvasTex(256, 256, (g) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, 256, 256); g.fillStyle = '#8f7a58';
    g.beginPath(); g.moveTo(128, 70); g.quadraticCurveTo(40, 40, 10, 120); g.quadraticCurveTo(70, 110, 110, 140); g.lineTo(118, 210); g.lineTo(138, 210); g.lineTo(146, 140); g.quadraticCurveTo(186, 110, 246, 120); g.quadraticCurveTo(216, 40, 128, 70); g.fill();
    g.beginPath(); g.arc(128, 58, 16, 0, 7); g.fill(); }), []);
  return <group>
    <mesh position={[0, FLOOR + 4.9, ZONES.guneySundurma.z1 + 0.82]}><planeGeometry args={[5.4, 0.68]} /><meshStandardMaterial map={frieze} roughness={0.9} /></mesh>
    <mesh position={[ZONES.naos.x1 + T / 2 + 3.42, FLOOR + 6.3, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[1.6, 1.6]} /><meshStandardMaterial map={eagle} transparent alphaTest={0.4} roughness={0.9} /></mesh>
  </group>;
}
/** Çan kulesi: üç katlı kare kule, en üstte kemerli açıklıklar, piramidal çatı */
export function BellTower({ m }: { m: Mats }) {
  const { c, w } = TOWER, y = terrainBase(c[0], c[1]);
  const geo = useMemo(() => { const parts: THREE.BufferGeometry[] = [];
    const add = (x0: number, x1: number, z0: number, z1: number, y0: number, h: number) => { const g = bx(x1 - x0, h, z1 - z0, 2.2); g.translate((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2); parts.push(g.toNonIndexed()); };
    add(-w / 2, w / 2, -w / 2, w / 2, 0, 16);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(sx * w / 2 - (sx > 0 ? 1.2 : 0), sx * w / 2 + (sx < 0 ? 1.2 : 0), sz * w / 2 - (sz > 0 ? 1.2 : 0), sz * w / 2 + (sz < 0 ? 1.2 : 0), 16, 5);   // açıklıklı kat: köşe ayakları
    add(-w / 2 - 0.2, w / 2 + 0.2, -w / 2 - 0.2, w / 2 + 0.2, 21, 0.6);
    for (const yy of [5.4, 10.8]) add(-w / 2 - 0.15, w / 2 + 0.15, -w / 2 - 0.15, w / 2 + 0.15, yy, 0.35);   // kat silmeleri
    return mergeGeometries(parts)!; }, [w]);
  return <group position={[c[0], y, c[1]]}>
    <mesh geometry={geo} material={m.stone} castShadow receiveShadow />
    <mesh material={m.roof} position={[0, 21.6, 0]} rotation-y={Math.PI / 4} castShadow><coneGeometry args={[w * 0.78, 3.4, 4]} /></mesh>
    <mesh material={m.dark} position={[0, 18.5, 0]}><boxGeometry args={[w - 2.3, 4.2, w - 2.3]} /></mesh>
    {[0, 1, 2, 3].map((i) => <mesh key={i} material={m.dark} position={[Math.sin((i * Math.PI) / 2) * (w / 2 + 0.01), 3, Math.cos((i * Math.PI) / 2) * (w / 2 + 0.01)]} rotation-y={(i * Math.PI) / 2}><planeGeometry args={[0.6, 1.6]} /></mesh>)}
  </group>;
}

/* ===================== bahçe, kıyı, şehir ===================== */
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => {
    const N = tier === 'high' ? 260 : tier === 'medium' ? 200 : 140, S = 640, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, 120);
    const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), r = rng(4);
    const lawn = new THREE.Color('#6e9a46'), hill = new THREE.Color('#5c7f3c'), sand = new THREE.Color('#b8a27c'), rock = new THREE.Color('#857a68');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = terrainBase(x, z); p.setY(i, y); uv.setXY(i, x / S + 0.5, -z / S + 0.5);
      c.copy(lawn).lerp(hill, Math.min(1, Math.max(0, (z - GARDEN.z1) / 40)) * 0.6 + r() * 0.08);
      if (z < GARDEN.z0 - 1 && y > 1) c.lerp(rock, 0.6); if (y <= 1.2) c.lerp(sand, 0.8);
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
export function Sea() {
  const tex = useMemo(() => { const t = canvasTex(256, 256, (g, r) => { g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 600; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.06 + r() * 0.1})`; g.lineWidth = 1 + r() * 2; const x = r() * 256, y = r() * 256, w = 10 + r() * 30; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 3, x + w, y); g.stroke(); } }, false); t.repeat.set(60, 60); return t; }, []);
  return <mesh rotation-x={-Math.PI / 2} position={[0, SEA_Y, -500]} userData={{ noCast: true }}><planeGeometry args={[3000, 940]} /><meshStandardMaterial color="#3f6f82" roughness={0.12} metalness={0.3} bumpMap={tex} bumpScale={0.2} envMapIntensity={1.3} /></mesh>;
}
/** Teras duvarı (denize bakan kenarda) ve bahçe yolları */
export function GardenWorks({ m }: { m: Mats }) {
  const geo = useMemo(() => { const parts: THREE.BufferGeometry[] = [];
    const g = bx(GARDEN.x1 - GARDEN.x0 + 4, 12, 1, 2.2); g.translate((GARDEN.x0 + GARDEN.x1) / 2, TERRACE_Y - 5.2, GARDEN.z0 - 0.6); parts.push(g.toNonIndexed());
    for (let x = GARDEN.x0; x < GARDEN.x1; x += 2.6) { const p = bx(0.35, 0.9, 0.35, 1); p.translate(x, TERRACE_Y + 1.25, GARDEN.z0 - 0.6); parts.push(p.toNonIndexed()); }
    const rail = bx(GARDEN.x1 - GARDEN.x0 + 4, 0.18, 0.5, 2); rail.translate((GARDEN.x0 + GARDEN.x1) / 2, TERRACE_Y + 1.75, GARDEN.z0 - 0.6); parts.push(rail.toNonIndexed());
    return mergeGeometries(parts)!; }, []);
  const paths = useMemo(() => { const segs: [number, number, number, number, number][] = [[-52, 22, -18, 0, 2.6], [-18, 0, -18, 0, 2.6], [-24, -12, -24, 14, 2.4], [-24, 14, 18, 14, 2.4], [18, 14, 18, -14, 2.4], [18, -14, -24, -14, 2.4], [-10, -14, -10, -30, 2.4], [-34, 4, -24, 4, 2]];
    const parts: THREE.BufferGeometry[] = []; for (const [x0, z0, x1, z1, w] of segs) { const L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.1) continue; const g = new THREE.PlaneGeometry(w, L + w); g.rotateX(-Math.PI / 2); g.rotateY(Math.atan2(x1 - x0, z1 - z0)); g.translate((x0 + x1) / 2, TERRACE_Y + 0.03, (z0 + z1) / 2); parts.push(g); }
    return mergeGeometries(parts)!; }, []);
  return <group>
    <mesh geometry={geo} material={m.stone} castShadow receiveShadow />
    <mesh geometry={paths} receiveShadow userData={{ noCast: true }}><meshStandardMaterial color="#cdbf9f" roughness={1} /></mesh>
  </group>;
}
export function Trees({ n }: { n: number }) {
  const kinds = useMemo(() => { const r = rng(3), paint = (g: THREE.BufferGeometry, hex: string, j: number) => { const gg = g.index ? g.toNonIndexed() : g, col: number[] = [], c = new THREE.Color(); for (let i = 0; i < gg.attributes.position.count; i++) { c.set(hex).offsetHSL(0, 0, (r() - 0.5) * j); col.push(c.r, c.g, c.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.deleteAttribute('uv'); return gg; };
    const cypress = mergeGeometries([paint(new THREE.CylinderGeometry(0.15, 0.22, 1.2, 6).translate(0, 0.6, 0), '#5a4330', 0.05), paint(new THREE.SphereGeometry(1, 10, 10).scale(1.1, 4.2, 1.1).translate(0, 4.6, 0), '#2f4a2a', 0.1)])!;
    const pine = mergeGeometries([paint(new THREE.CylinderGeometry(0.2, 0.32, 6, 7).translate(0, 3, 0), '#6a4a34', 0.05), ...Array.from({ length: 5 }, (_, i) => { const a = r() * 6.28, d = i ? 1.2 + r() : 0; return paint(new THREE.IcosahedronGeometry(1.6 + r() * 0.5, 1).scale(1.2, 0.6, 1.2).translate(Math.cos(a) * d, 6.2 + r() * 1.2, Math.sin(a) * d), '#3f5a30', 0.08); })])!;
    cypress.computeVertexNormals(); pine.computeVertexNormals(); return [cypress, pine]; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []), refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  useEffect(() => { const r = rng(23), o = new THREE.Object3D(), cnt = [0, 0];
    for (let i = 0; i < n * 10 && cnt[0] + cnt[1] < n; i++) { const inG = r() < 0.45, x = inG ? GARDEN.x0 + 3 + r() * (GARDEN.x1 - GARDEN.x0 - 6) : -200 + r() * 420, z = inG ? GARDEN.z0 + 4 + r() * (GARDEN.z1 - GARDEN.z0 - 6) : GARDEN.z1 + 4 + r() * 200;
      if (inChurch(x, z, 5) || Math.hypot(x - TOWER.c[0], z - TOWER.c[1]) < 7 || (x < -16 && x > -44 && Math.abs(z) < 7) ||   // batı girişinin önü açık
 (inG && (Math.abs(z - 14) < 3 || Math.abs(z + 14) < 3 || Math.abs(x + 24) < 3 || Math.abs(x - 18) < 3 || Math.abs(x + 10) < 3 && z < -12)) || (inG && x < -40 && z > 10)) continue;
      const t = inG ? (r() < 0.6 ? 0 : 1) : r() < 0.3 ? 0 : 1, m = refs.current[t]; if (!m) continue; o.position.set(x, terrainBase(x, z) - 0.1, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.8 + r() * 0.5); o.updateMatrix(); m.setMatrixAt(cnt[t]++, o.matrix); }
    refs.current.forEach((m, i) => { if (!m) return; m.count = cnt[i]; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }); }, [n]);
  return <group>{kinds.map((g, i) => <instancedMesh key={i} ref={(mm) => { refs.current[i] = mm; }} args={[g, mat, n]} castShadow receiveShadow />)}</group>;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 4 && k < n; i++) { const x = GARDEN.x0 + r() * (GARDEN.x1 - GARDEN.x0 + 60) - 30, z = GARDEN.z0 + r() * (GARDEN.z1 - GARDEN.z0 + 60);
      if (inChurch(x, z, 1.5) || Math.abs(z - 14) < 1.8 || Math.abs(z + 14) < 1.8 || Math.abs(x + 24) < 1.8 || Math.abs(x - 18) < 1.8 || (Math.abs(x + 10) < 1.8 && z < -12)) continue;
      o.position.set(x, terrainBase(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.35 + r() * 0.35; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.24 + r() * 0.05, 0.45, 0.4 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const m = ref.current; if (m) { m.count = k; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
/** Uzakta, kıyı boyunca Trabzon şehri (doğuda) */
export function City({ n }: { n: number }) {
  const body = useRef<THREE.InstancedMesh>(null), roof = useRef<THREE.InstancedMesh>(null);
  const tex = useMemo(() => canvasTex(128, 256, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 256); for (let f = 0; f < 6; f++) for (let k = 0; k < 3; k++) { g.fillStyle = '#5a6670'; g.fillRect(12 + k * 40, 14 + f * 42, 20, 24); } }), []);
  const mats = useMemo(() => { const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), top = new THREE.MeshStandardMaterial({ color: '#b8b0a2' }); return [side, side, top, top, side, side]; }, [tex]);
  useEffect(() => { const r = rng(61), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 4 && k < n; i++) { const x = 90 + r() * 420, z = -20 + r() * 180 + (x - 90) * 0.05, w = 10 + r() * 10, d = 10 + r() * 8, h = 9 + r() * 15, y = terrainBase(x, z) - 0.5;
      o.position.set(x, y + h / 2, z); o.rotation.set(0, (r() - 0.5) * 0.3, 0); o.scale.set(w, h, d); o.updateMatrix(); body.current?.setMatrixAt(k, o.matrix); body.current?.setColorAt(k, c.set(['#efe8da', '#e6d6c0', '#f4f1ea', '#d9cdb8'][Math.floor(r() * 4)]));
      o.position.set(x, y + h, z); o.scale.set(w * 1.04, 2.4, d * 1.04); o.updateMatrix(); roof.current?.setMatrixAt(k, o.matrix); k++; }
    for (const mm of [body.current, roof.current]) if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  const roofGeo = useMemo(() => { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); return g; }, []);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return <group><instancedMesh ref={body} args={[box, mats, n]} castShadow receiveShadow /><instancedMesh ref={roof} args={[roofGeo, undefined, n]}><meshStandardMaterial color="#9a5040" roughness={0.85} /></instancedMesh></group>;
}
export function Mountains() {
  const list = useMemo(() => { const r = rng(71), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 9; i++) { const a = Math.PI * 0.12 + (i / 8) * Math.PI * 0.76, dd = 900 + r() * 500; out.push({ p: [Math.cos(a) * dd * 1.3, -10, Math.sin(a) * dd], g: mountainGeo(450 + r() * 250, 300 + r() * 280, 30 + i, 0.8, '#3f5a34') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
export { CHURCH };
