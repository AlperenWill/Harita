/**
 * Hasankeyf — 3B modeller. Güney yakada kalker kayalık (mağara ağızları, kale surları, saray kalıntısı), kıyıda El Rızk minaresi ve
 * yıkık evler; Dicle'de Eski Köprü'nün ayakları ve tek kemeri; kuzey yakada düzlük, yokuş, yol, yaylada Kültür Park; Zeynel Bey
 * Türbesi ve tekerlekli taşıyıcı platform (SPMT). Ölçüler ve süslemeler TEMSİLÎDİR (docs/HASANKEYF.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useFrame } from '@react-three/fiber';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { BRIDGE, CLIFF, MINARET, PARK, PAD, PLATEAU_Y, RIVER, ROAD, ROAD_W, TOMB_R, nearestOnRoad, terrainY } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(0.45, 0.62, 0.64).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const slab = (p: Parts, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, s = 3) => { const g = bx(x1 - x0, y1 - y0, z1 - z0, s); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); p.push(g); };
function scaleUV(g: THREE.BufferGeometry, su: number, sv: number) { const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; }

/* ===================== malzemeler ===================== */
export interface Mats { lime: THREE.MeshStandardMaterial; cliff: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; brick: THREE.MeshStandardMaterial; tile: THREE.MeshStandardMaterial; steel: THREE.MeshStandardMaterial; tyre: THREE.MeshStandardMaterial; yellow: THREE.MeshStandardMaterial; pave: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const ls = stoneTex('hk-kesme', ['#d3c19e', '#c8b591', '#dacaa8', '#bfa982'], [26, 10], [60, 40]);
    // tuğla: yatay sıralar, araya yer yer sırlı (firuze) tuğla bantları (bezeme TEMSİLÎ)
    const brick = canvasTex(256, 256, (g, r) => { g.fillStyle = '#9b6a4a'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 8) for (let x = -(y / 8 % 2) * 8; x < 256; x += 16) { const v = 0.8 + r() * 0.35; g.fillStyle = `rgb(${(176 * v) | 0},${(120 * v) | 0},${(84 * v) | 0})`; g.fillRect(x + 1, y + 1, 14, 6); } });
    const tile = canvasTex(256, 128, (g) => { g.fillStyle = '#2f6f7a'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#d9c9a0'; g.lineWidth = 4; for (let x = 0; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 16, 20); g.lineTo(x + 32, 64); g.lineTo(x + 16, 108); g.closePath(); g.stroke(); } g.fillStyle = '#1d4f58'; g.fillRect(0, 0, 256, 8); g.fillRect(0, 120, 256, 8); });
    const pave = canvasTex(256, 256, (g, r) => { g.fillStyle = '#b9ab90'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) { const v = 0.85 + r() * 0.25; g.fillStyle = `rgb(${(205 * v) | 0},${(192 * v) | 0},${(166 * v) | 0})`; g.fillRect(x + 2, y + 2, 28, 28); } });
    return {
      lime: weather(new THREE.MeshStandardMaterial({ map: ls.map, bumpMap: ls.bump, bumpScale: 0.4, roughness: 0.9 }), -200),
      cliff: (() => { const t = canvasTex(512, 512, (g, r) => { g.fillStyle = '#c9b691'; g.fillRect(0, 0, 512, 512);
        // yatay katmanlar (kalker tabakaları), çatlaklar, lekeler
        let y = 0; while (y < 512) { const h = 6 + r() * 28, v = 0.82 + r() * 0.3; g.fillStyle = `rgb(${(205 * v) | 0},${(186 * v) | 0},${(148 * v) | 0})`; g.fillRect(0, y, 512, h); g.fillStyle = 'rgba(70,55,35,0.25)'; g.fillRect(0, y + h - 1.5, 512, 1.5); y += h; }
        for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(60,48,32,${0.2 + r() * 0.3})`; g.lineWidth = 1 + r(); g.beginPath(); let x = r() * 512, yy = r() * 512; g.moveTo(x, yy); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 14; yy += 6 + r() * 16; g.lineTo(x, yy); } g.stroke(); }
        for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,75,50' : '235,225,200'},${0.06 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 40, 4 + r() * 14, 0, 0, 7); g.fill(); }
        for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,250,235'},${r() * 0.12})`; g.fillRect(r() * 512, r() * 512, 1.5, 1.5); } }); return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 1.5, roughness: 0.97 }); })(),
      dark: new THREE.MeshStandardMaterial({ color: '#3a3025', roughness: 1 }),
      brick: weather(new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9 }), -200),
      tile: new THREE.MeshStandardMaterial({ map: tile, roughness: 0.45 }),
      steel: new THREE.MeshStandardMaterial({ color: '#4c5257', roughness: 0.5, metalness: 0.6 }),
      tyre: new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.9 }),
      yellow: new THREE.MeshStandardMaterial({ color: '#d9a21b', roughness: 0.55 }),
      pave: new THREE.MeshStandardMaterial({ map: pave, roughness: 0.92 }),
    };
  }, []);
}

/* ===================== güney yaka: kayalık, mağaralar, kale ===================== */
export function Cliff({ m }: { m: Mats }) {
  const { rock, caves, walls } = useMemo(() => { const r = rng(7), rock: Parts = [], caves: Parts = [], walls: Parts = [];
    // kayalık yüzü: dikey, hafif girintili ızgara
    const W = 520, H = CLIFF.top + 30, nx = 130, ny = 30, g = new THREE.PlaneGeometry(W, H, nx, ny); g.translate(0, H / 2 - 30, 0); g.rotateY(Math.PI);   // −z'ye bakar (kuzeye)
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), top = CLIFF.top + Math.sin(x * 0.02) * 4 + Math.sin(x * 0.07) * 1.5, yy = Math.min(y, top);
      const lean = Math.max(0, yy - 4) * 0.12 + Math.sin(x * 0.11 + yy * 0.2) * 0.8 + Math.sin(x * 0.03) * 3; p.setXYZ(i, x, yy, CLIFF.z + lean + (y > top ? (y - top) * 3 : 0)); }
    g.computeVertexNormals(); scaleUV(g, W / 18, H / 18); rock.push(g);
    // kayalığın üstü (yayla) ve kıyı ile kayalık arası şerit
    const top = new THREE.PlaneGeometry(W, 260); top.rotateX(-Math.PI / 2); top.translate(0, CLIFF.top - 0.5, CLIFF.z + 140); scaleUV(top, W / 10, 26); rock.push(top);
    // mağara ağızları: kemerli koyu açıklıklar, sıra sıra
    for (let i = 0; i < 260; i++) { const x = -240 + r() * 480, y = 2 + r() * (CLIFF.top - 10), w = 1.2 + r() * 1.8, h = w * (1.1 + r() * 0.5);
      if (Math.abs(x - BRIDGE.x) < 8 && y < 18) continue;
      const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, Math.PI, 0, true); s.lineTo(w / 2, 0); s.closePath();
      const cg = new THREE.ShapeGeometry(s, 5); cg.rotateY(Math.PI); const lean = Math.max(0, y - 4) * 0.12 + Math.sin(x * 0.11 + y * 0.2) * 0.8 + Math.sin(x * 0.03) * 3; cg.translate(x, y, CLIFF.z + lean - 0.25); caves.push(cg); }
    // kale surları ve burçlar kayalığın üstünde; saray kalıntısı
    for (let x = -160; x < 160; x += 10) { const z = CLIFF.z + 6 + Math.sin(x * 0.05) * 2; slab(walls, x, x + 10.2, z, z + 2, CLIFF.top - 1, CLIFF.top + 5 + (x % 30 === 0 ? 2 : 0)); if (x % 40 === 0) { const t = new THREE.CylinderGeometry(3, 3.3, 10, 16); t.translate(x, CLIFF.top + 4, z + 1); walls.push(t); } }
    slab(walls, -20, 18, CLIFF.z + 22, CLIFF.z + 40, CLIFF.top - 1, CLIFF.top + 9); slab(walls, -24, -16, CLIFF.z + 18, CLIFF.z + 24, CLIFF.top - 1, CLIFF.top + 13);
    return { rock: merge(rock), caves: merge(caves), walls: merge(walls) }; }, []);
  return <group>
    <mesh geometry={rock} material={m.cliff} receiveShadow castShadow />
    <mesh geometry={caves} material={m.dark} />
    <mesh geometry={walls} material={m.lime} castShadow receiveShadow />
  </group>;
}
/** Güney kıyısında aşağı kent: yıkık taş evler ve El Rızk Camii (minare: gövdesinde yazı ve geometrik kuşaklar, TEMSİLÎ) */
export function LowerTown({ m }: { m: Mats }) {
  const { stone, minaret, bands } = useMemo(() => { const r = rng(31), stone: Parts = [], minaret: Parts = [], bands: Parts = [];
    for (let x = -200; x < 200; x += 6 + r() * 6) { if (Math.abs(x - MINARET[0]) < 10 || Math.abs(x - BRIDGE.x) < 8) continue; const w = 4 + r() * 4, d = 4 + r() * 3, h = 2 + r() * 4, z = RIVER.z1 + 1 + r() * 2; slab(stone, x, x + w, z, z + d, -1.5, h); }
    // cami gövdesi ve minare
    slab(stone, MINARET[0] - 12, MINARET[0] - 2, MINARET[1] - 4, MINARET[1] + 6, -1.5, 7);
    const sh = new THREE.CylinderGeometry(1.7, 2, 30, 20); sh.translate(MINARET[0], 15, MINARET[1]); scaleUV(sh, 4, 10); minaret.push(sh);
    const base = new THREE.CylinderGeometry(2.6, 2.6, 4, 8); base.translate(MINARET[0], 1, MINARET[1]); scaleUV(base, 5, 1.5); minaret.push(base);
    const bal = new THREE.CylinderGeometry(2.4, 1.9, 1, 20); bal.translate(MINARET[0], 24, MINARET[1]); minaret.push(bal);
    const cap = new THREE.ConeGeometry(1.4, 3.4, 20); cap.translate(MINARET[0], 31.7, MINARET[1]); minaret.push(cap);
    for (const y of [8, 13, 18]) { const b = new THREE.CylinderGeometry(1.92 - y * 0.007, 1.92 - y * 0.007, 1.1, 20, 1, true); b.translate(MINARET[0], y, MINARET[1]); scaleUV(b, 3, 1); bands.push(b); }
    return { stone: merge(stone), minaret: merge(minaret), bands: merge(bands) }; }, []);
  return <group>
    <mesh geometry={stone} material={m.lime} castShadow receiveShadow />
    <mesh geometry={minaret} material={m.lime} castShadow receiveShadow />
    <mesh geometry={bands} material={m.tile} />
  </group>;
}
/** Eski Köprü: dört kemerli köprüden kalan ayaklar ve tek kemer (ölçüler TEMSİLÎ) */
export function Bridge({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = [], x = BRIDGE.x, wx = 7, h = 16;
    for (const z of BRIDGE.piers) { slab(p, x - wx / 2, x + wx / 2, z - 3.2, z + 3.2, -8, h); }
    slab(p, x - wx / 2, x + wx / 2, -12, -2, -4, h - 1); slab(p, x - wx / 2, x + wx / 2, RIVER.z1 + 1, RIVER.z1 + 10, -4, h);   // yaka ayakları
    // ayakta kalan kemer (spandrel tek çizgi)
    const [z0, z1] = BRIDGE.arch, r = (z1 - z0 - 6.4) / 2, s = new THREE.Shape();
    s.moveTo(-r, 1); s.lineTo(-r, h); s.lineTo(r, h); s.lineTo(r, 1); s.quadraticCurveTo(r, 11.5, 0, 12.5); s.quadraticCurveTo(-r, 11.5, -r, 1); s.closePath();
    const ag = new THREE.ExtrudeGeometry(s, { depth: wx - 0.6, bevelEnabled: false, curveSegments: 10 }); ag.translate(0, 0, -(wx - 0.6) / 2); ag.rotateY(Math.PI / 2); ag.translate(x, 0, (z0 + z1) / 2);
    scaleUV(ag, 1 / 3, 1 / 3); p.push(ag);
    return merge(p); }, []);
  return <mesh geometry={geo} material={m.lime} castShadow receiveShadow />;
}

/* ===================== kuzey yaka: arazi, yol, park ===================== */
export function Ground({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 220 : 150, g = new THREE.PlaneGeometry(700, 500, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, -250);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), dry = new THREE.Color('#bba673'), green = new THREE.Color('#8c9550'), mud = new THREE.Color('#8f7d5f');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = terrainY(x, z); p.setY(i, y); c.copy(dry).lerp(green, 0.4 + 0.3 * Math.sin(x * 0.04 + z * 0.05)); if (z > -6) c.lerp(mud, Math.min(1, (z + 6) / 5)); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
/** Taşıma yolu: arazinin üstünde stabilize şerit */
export function Road() {
  const geo = useMemo(() => { const pos: number[] = [], idx: number[] = []; const pts: [number, number][] = [];
    for (let i = 0; i < ROAD.length - 1; i++) { const [ax, az] = ROAD[i], [bx2, bz] = ROAD[i + 1], n = Math.ceil(Math.hypot(bx2 - ax, bz - az) / 3); for (let k = 0; k < n; k++) pts.push([ax + ((bx2 - ax) * k) / n, az + ((bz - az) * k) / n]); }
    pts.push(ROAD[ROAD.length - 1]);
    pts.forEach(([x, z], i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      for (const s of [-1, 1]) { const px = x + nx * s * ROAD_W / 2, pz = z + nz * s * ROAD_W / 2; pos.push(px, terrainY(px, pz) + 0.08, pz); }
      if (i > 0) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }, []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial color="#c9bb9c" roughness={1} polygonOffset polygonOffsetFactor={-2} side={THREE.DoubleSide} /></mesh>;
}
/** Kültür Park: döşeli alan ve taşınmış yapılar (hamam kubbeleri, küçük türbe, kale kapısı; biçimleri TEMSİLÎ) */
export function Park({ m }: { m: Mats }) {
  const { stone, domes } = useMemo(() => { const stone: Parts = [], domes: Parts = [], y = PLATEAU_Y, [px, pz] = PARK.at;
    slab(stone, px + 10, px + 22, pz - 18, pz - 8, y - 0.5, y + 4.5);   // hamam
    for (const [dx, dz] of [[13, -15], [19, -15], [16, -10.5]]) { const d = new THREE.SphereGeometry(2.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); d.translate(px + dx, y + 4.5, pz + dz); scaleUV(d, 4, 2); domes.push(d); }
    const oct = new THREE.CylinderGeometry(2.6, 2.6, 6, 8); oct.translate(px - 14, y + 3, pz - 12); scaleUV(oct, 5, 2); stone.push(oct); const cone = new THREE.ConeGeometry(2.9, 3, 8); cone.translate(px - 14, y + 7.5, pz - 12); stone.push(cone);
    // kale Orta Kapısı: kemerli kapı bloğu
    const s = new THREE.Shape(); s.moveTo(-4, 0); s.lineTo(-4, 9); s.lineTo(4, 9); s.lineTo(4, 0); s.lineTo(1.6, 0); s.lineTo(1.6, 4); s.absarc(0, 4, 1.6, 0, Math.PI, false); s.lineTo(-1.6, 0); s.closePath();
    const gate = new THREE.ExtrudeGeometry(s, { depth: 3, bevelEnabled: false }); gate.translate(px + 2, y - 0.3, pz - 22); scaleUV(gate, 1 / 3, 1 / 3); stone.push(gate);
    return { stone: merge(stone), domes: merge(domes) }; }, []);
  return <group>
    <mesh rotation-x={-Math.PI / 2} position={[PARK.at[0], PLATEAU_Y + 0.04, PARK.at[1]]} receiveShadow><circleGeometry args={[PARK.r, 48]} /><primitive object={m.pave} attach="material" /></mesh>
    <mesh geometry={stone} material={m.lime} castShadow receiveShadow />
    <mesh geometry={domes} material={m.lime} castShadow receiveShadow />
    <mesh position={[PAD[0], PLATEAU_Y + 0.25, PAD[1]]} receiveShadow><cylinderGeometry args={[TOMB_R + 1.2, TOMB_R + 1.4, 0.5, 32]} /><primitive object={m.lime} attach="material" /></mesh>
  </group>;
}

/* ===================== türbe ve taşıyıcı ===================== */
/** Zeynel Bey Türbesi: silindirik tuğla gövde, sırlı bantlar, kubbe (içi sekizgen; bezeme TEMSİLÎ) */
export function Tomb({ m }: { m: Mats }) {
  const g = useMemo(() => { const body = new THREE.CylinderGeometry(TOMB_R, TOMB_R, 9, 40); body.translate(0, 4.5, 0); scaleUV(body, 6, 3);
    const drum = new THREE.CylinderGeometry(TOMB_R * 0.82, TOMB_R * 0.9, 1.6, 40); drum.translate(0, 9.8, 0); scaleUV(drum, 5, 0.6);
    const dome = new THREE.SphereGeometry(TOMB_R * 0.82, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 0.85, 1); dome.translate(0, 10.6, 0); scaleUV(dome, 5, 2);
    const band = new THREE.CylinderGeometry(TOMB_R + 0.03, TOMB_R + 0.03, 1.6, 40, 1, true); band.translate(0, 6.6, 0); scaleUV(band, 7, 1);
    const band2 = band.clone(); band2.translate(0, -3.6, 0);
    const door = new THREE.PlaneGeometry(1.5, 2.6); door.translate(0, 1.4, TOMB_R + 0.04);
    return { brick: merge([body, drum, dome]), tile: merge([band, band2]), door }; }, []);
  return <group>
    <mesh geometry={g.brick} material={m.brick} castShadow receiveShadow />
    <mesh geometry={g.tile} material={m.tile} castShadow />
    <mesh geometry={g.door} material={m.dark} />
  </group>;
}
/** Tekerlekli modüler taşıyıcı: çelik platform, sıra sıra tekerlek, sarı modüller */
export function Transporter({ m }: { m: Mats }) {
  const g = useMemo(() => { const deck: Parts = [], tyres: Parts = [], yel: Parts = [];
    slab(deck, -6, 6, -5, 5, 1.3, 1.9, 2);
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const x = -5 + i * 2, z = s * 3.6; const t = new THREE.CylinderGeometry(0.55, 0.55, 0.5, 14); t.rotateX(Math.PI / 2); t.translate(x, 0.55, z - 0.35); tyres.push(t); const t2 = t.clone(); t2.translate(0, 0, 0.7); tyres.push(t2); slab(yel, x - 0.5, x + 0.5, z - 0.8, z + 0.8, 1.0, 1.3, 1); }
    slab(yel, -6.3, -5.8, -4.6, 4.6, 1.3, 2.6, 1);   // kumanda kabini
    return { deck: merge(deck), tyres: merge(tyres), yel: merge(yel) }; }, []);
  return <group>
    <mesh geometry={g.deck} material={m.steel} castShadow receiveShadow />
    <mesh geometry={g.tyres} material={m.tyre} castShadow />
    <mesh geometry={g.yel} material={m.yellow} castShadow />
  </group>;
}

/* ===================== su ve doğa ===================== */
export function Water({ level }: { level: { y: number } }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4f7f86', roughness: 0.18, metalness: 0.1, transparent: true, opacity: 0.92 }), []);
  useFrame(({ clock }) => { if (ref.current) ref.current.position.y = level.y + Math.sin(clock.elapsedTime * 0.5) * 0.03; });
  return <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, level.y, 0]} userData={{ noCast: true }}><planeGeometry args={[3000, 3000]} /><primitive object={mat} attach="material" /></mesh>;
}
export function Trees({ n }: { n: number }) {
  const kinds = useMemo(() => { const r = rng(3), paint = (g: THREE.BufferGeometry, hex: string, j: number) => { const gg = g.index ? g.toNonIndexed() : g, col: number[] = [], cc = new THREE.Color();
    for (let i = 0; i < gg.attributes.position.count; i++) { cc.set(hex).offsetHSL(0, 0, (r() - 0.5) * j); col.push(cc.r, cc.g, cc.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return gg; };
    const poplar = mergeGeometries([paint(new THREE.CylinderGeometry(0.15, 0.25, 3, 6).translate(0, 1.5, 0), '#6e6250', 0.05), paint(new THREE.SphereGeometry(1, 9, 8).scale(1.1, 4.8, 1.1).translate(0, 6.5, 0), '#6a8a3e', 0.14)])!;
    const bush = mergeGeometries([paint(new THREE.CylinderGeometry(0.15, 0.22, 1.4, 6).translate(0, 0.7, 0), '#5b4a38', 0.05), paint(new THREE.IcosahedronGeometry(1.6, 1).translate(0, 2.2, 0), '#71803f', 0.14)])!;
    for (const g of [poplar, bush]) g.computeVertexNormals(); return [poplar, bush]; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []), refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  useEffect(() => { const r = rng(23), o = new THREE.Object3D(), cnt = [0, 0];
    const put = (t: number, x: number, z: number, s: number) => { const mm = refs.current[t]; if (!mm || cnt[t] >= n) return; o.position.set(x, terrainY(x, z) - 0.1, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(s); o.updateMatrix(); mm.setMatrixAt(cnt[t]++, o.matrix); };
    for (let x = -300; x < 300; x += 7 + r() * 8) { if (Math.abs(x - 50) < 14 || Math.abs(x - BRIDGE.x) < 14 || Math.abs(x + 14) < 14 || Math.abs(x - 16) < 14 || Math.abs(x - 30) < 10) continue; put(0, x, -4 - r() * 3, 0.8 + r() * 0.5); }
    for (let i = 0; i < n * 3; i++) { const x = -300 + r() * 600, z = -20 - r() * 300; const near = nearestOnRoad(x, z).d < ROAD_W / 2 + 5; if (near || Math.hypot(x - PARK.at[0], z - PARK.at[1]) < PARK.r + 4) continue; put(r() < 0.3 ? 0 : 1, x, z, 0.7 + r() * 0.6); }
    refs.current.forEach((mm, i) => { if (!mm) return; mm.count = cnt[i]; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); }); }, [n, kinds]);
  return <group>{kinds.map((g, i) => <instancedMesh key={i} ref={(mm) => { refs.current[i] = mm; }} args={[g, mat, n]} castShadow receiveShadow />)}</group>;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -150 + r() * 300, z = -4 - r() * 320; if (ROAD.some(([rx, rz]) => Math.hypot(rx - x, rz - z) < ROAD_W / 2 + 1) || Math.hypot(x - PARK.at[0], z - PARK.at[1]) < PARK.r) continue;
      o.position.set(x, terrainY(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.35 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.13 + r() * 0.06, 0.4, 0.45 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 9; i++) { const a = Math.PI * (0.9 + (i / 8) * 1.2) + r() * 0.15, dd = 900 + r() * 400; out.push({ p: [Math.cos(a) * dd, -10, Math.sin(a) * dd - 200], g: mountainGeo(420 + r() * 220, 110 + r() * 100, 60 + i, 2, '#a08d68') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
