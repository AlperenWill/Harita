/**
 * Diyarbakır Surları — 3B modeller (ortak manzara kiti).
 * Koyu bazalt sur, mazgallar ve iç korkuluk; yuvarlak büyük burçlar (Ulu Beden, Yedi Kardeş, Nur Burcu), kare burçlar, Mardin Kapı;
 * burçlarda açık renk yazı kuşağı ve çift başlı kartal kabartması; sur içinde bazalt evler ve sur üstüne çıkan merdiven;
 * doğuda Hevsel Bahçeleri, Dicle ve On Gözlü Köprü. Ölçüler ve yazıların biçimi TEMSİLÎDİR (docs/DIYARBAKIR-SUR.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useFrame } from '@react-three/fiber';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { BRIDGE, BRIDGE_X0, GATE, HEVSEL, HOUSES, INSIDE, RAMP, RIVER, TARGETS, TOWERS, WALK_Y, WALL, terrainBase, type Tower } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.62, 0.6).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const slab = (p: Parts, x0: number, x1: number, z0: number, z1: number, h: number, y0 = 0, s = 3) => { const g = bx(x1 - x0, h, z1 - z0, s); g.translate((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2); p.push(g); };
/** Silindir yüzeyini dünya ölçeğinde dokular (u: çevre/s, v: yükseklik/s) */
function cyl(r: number, h: number, seg: number, s: number, open = false, t0 = 0, tl = Math.PI * 2) {
  const g = new THREE.CylinderGeometry(r, r, h, seg, 1, open, t0, tl), uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * r * tl) / s, (uv.getY(i) * h) / s); return g;
}
/** Doğu yakası (Dicle'nin ötesi) ve genel zemin yüksekliği */
export function landY(x: number, z: number) { if (x > RIVER.x1 + 4) return HEVSEL.y + Math.min(30, (x - RIVER.x1 - 4) * 0.22); if (x > RIVER.x0 - 6) return RIVER.y - 2.5; if (x < WALL.eastX && z < WALL.zIn) return 0; return terrainBase(x, z); }

/* ===================== malzemeler ===================== */
export interface Mats { basalt: THREE.MeshStandardMaterial; dressed: THREE.MeshStandardMaterial; band: THREE.MeshStandardMaterial; plaque: THREE.MeshStandardMaterial; eagle: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; house: THREE.MeshStandardMaterial }
/** Yazı kuşağı: kare kufi benzeri, TEMSİLÎ işaretler (okunur bir metin değil) */
function scriptTex(w: number, h: number, light: string, dark: string, seed: number, rows = 1) {
  return canvasTex(w, h, (g, r) => { g.fillStyle = light; g.fillRect(0, 0, w, h); g.fillStyle = dark;
    const rh = h / rows; for (let k = 0; k < rows; k++) { const y0 = k * rh; g.fillRect(0, y0 + rh * 0.06, w, rh * 0.05); g.fillRect(0, y0 + rh * 0.89, w, rh * 0.05);
      let x = 6; while (x < w - 10) { const t = r(), sw = rh * 0.07; const base = y0 + rh * 0.78;
        if (t < 0.35) { g.fillRect(x, y0 + rh * 0.2, sw, base - y0 - rh * 0.2); x += sw + 4 + r() * 6; }   // dikey harf
        else if (t < 0.7) { const ww = 10 + r() * 22; g.fillRect(x, base - sw, ww, sw); g.fillRect(x + ww - sw, base - rh * 0.25, sw, rh * 0.25); x += ww + 5; }   // yatay bağ
        else { g.beginPath(); g.arc(x + 8, base - rh * 0.18, rh * 0.12, Math.PI, 0); g.lineWidth = sw; g.strokeStyle = dark; g.stroke(); x += 22; } }
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.1})`; g.fillRect(r() * w, y0 + r() * rh, 2 + r() * 6, 1 + r() * 3); g.fillStyle = dark; } }
  }, true, seed);
}
/** Çift başlı kartal kabartması (şematik; saydam zemin) */
function eagleTex() {
  return canvasTex(256, 256, (g) => { g.clearRect(0, 0, 256, 256);
    const body = (c: string, o: number) => { g.fillStyle = c; g.beginPath();
      g.ellipse(128 + o, 140 + o, 26, 46, 0, 0, 7); g.fill();   // gövde
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + o + s * 18, 112 + o); g.lineTo(128 + o + s * 118, 70 + o); g.lineTo(128 + o + s * 112, 108 + o); g.lineTo(128 + o + s * 96, 112 + o); g.lineTo(128 + o + s * 104, 136 + o); g.lineTo(128 + o + s * 84, 136 + o); g.lineTo(128 + o + s * 88, 156 + o); g.lineTo(128 + o + s * 26, 160 + o); g.closePath(); g.fill();   // kanat
        g.beginPath(); g.moveTo(128 + o + s * 4, 106 + o); g.quadraticCurveTo(128 + o + s * 8, 72 + o, 128 + o + s * 22, 62 + o); g.lineTo(128 + o + s * 30, 72 + o); g.quadraticCurveTo(128 + o + s * 20, 84 + o, 128 + o + s * 20, 108 + o); g.closePath(); g.fill();   // boyun
        g.beginPath(); g.arc(128 + o + s * 28, 58 + o, 13, 0, 7); g.fill();   // baş
        g.beginPath(); g.moveTo(128 + o + s * 38, 50 + o); g.lineTo(128 + o + s * 58, 58 + o); g.lineTo(128 + o + s * 40, 66 + o); g.closePath(); g.fill();   // gaga (dışa dönük)
        g.beginPath(); g.moveTo(128 + o + s * 12, 182 + o); g.lineTo(128 + o + s * 30, 222 + o); g.lineTo(128 + o + s * 20, 224 + o); g.lineTo(128 + o + s * 4, 186 + o); g.fill(); }   // pençe
      g.beginPath(); g.moveTo(108 + o, 180 + o); g.lineTo(148 + o, 180 + o); g.lineTo(140 + o, 214 + o); g.lineTo(116 + o, 214 + o); g.fill(); };   // kuyruk
    body('rgba(8,8,8,0.7)', 4); body('#6f6a63', 0); g.fillStyle = '#1c1b19'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(128 + sx * 31, 55, 2.6, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(40,38,34,0.7)'; g.lineWidth = 2; for (let y = 120; y < 150; y += 8) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 30, y); g.lineTo(128 + s * 96, y - 30); g.stroke(); }
  }, true, 9);
}
export function useMats(): Mats {
  return useMemo(() => {
    const ba = stoneTex('diyar-bazalt', ['#3c3a38', '#33312f', '#45423f', '#2e2c2a', '#4b4844', '#3a3734'], [34, 20], [60, 70]);
    const dr = stoneTex('diyar-kesme', ['#4a4743', '#423f3b', '#524e49', '#3f3c39'], [26, 8], [70, 40]);
    const hs = stoneTex('diyar-ev', ['#3f3c39', '#4a4641', '#37342f', '#5a5650'], [22, 14], [36, 40]);
    const band = scriptTex(1024, 128, '#8f887c', '#3f3a34', 3), plaque = scriptTex(512, 256, '#99917f', '#433d35', 7, 4);
    return {
      basalt: weather(new THREE.MeshStandardMaterial({ map: ba.map, bumpMap: ba.bump, bumpScale: 0.7, roughness: 0.93 })),
      dressed: weather(new THREE.MeshStandardMaterial({ map: dr.map, bumpMap: dr.bump, bumpScale: 0.5, roughness: 0.88 })),
      band: new THREE.MeshStandardMaterial({ map: band, bumpMap: band, bumpScale: -1.2, roughness: 0.85 }),
      plaque: new THREE.MeshStandardMaterial({ map: plaque, bumpMap: plaque, bumpScale: -1, roughness: 0.85 }),
      eagle: new THREE.MeshStandardMaterial({ map: eagleTex(), transparent: true, alphaTest: 0.3, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }),
      dark: new THREE.MeshStandardMaterial({ color: '#141312', roughness: 1 }),
      wood: new THREE.MeshStandardMaterial({ color: '#5a4330', roughness: 0.85 }),
      house: weather(new THREE.MeshStandardMaterial({ map: hs.map, bumpMap: hs.bump, bumpScale: 0.5, roughness: 0.92 })),
    };
  }, []);
}

/* ===================== sur ===================== */
/** Mazgal dizisi: (x0,z0)→(x1,z1) doğrultusunda, y tabanında */
function merlons(p: Parts, x0: number, z0: number, x1: number, z1: number, y: number, step = 1.9, w = 1.1, h = 1.5, d = 0.7) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / step), a = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i <= n; i++) { const t = (i + 0.5) / (n + 1), g = bx(d, h, w, 1.5); g.rotateY(a); g.translate(x0 + (x1 - x0) * t, y + h / 2, z0 + (z1 - z0) * t); p.push(g); }
}
export function Walls({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = [], W = WALL, H = WALK_Y, gx0 = GATE.x - GATE.w / 2, gx1 = GATE.x + GATE.w / 2;
    const base = -3;   // temel: eğimli zeminde boşluk kalmasın
    slab(p, W.x0, gx0, W.zIn, W.zOut, H - base, base); slab(p, gx1, W.x1 + W.zOut, W.zIn, W.zOut, H - base, base);
    slab(p, gx0, gx1, W.zIn, W.zOut, H - GATE.h - 1.2, GATE.h + 1.2);
    // doğu kolu (kuzeye döner)
    slab(p, W.eastX - 2.4, W.eastX + 2.4, W.eastZ0, W.zIn, H - base, base);
    // batı ucu: sur kesiti (oyun alanının sınırı)
    // mazgallar: dış kenar; içte alçak korkuluk
    merlons(p, W.x0, W.zOut - 0.35, gx0 - 0.4, W.zOut - 0.35, H); merlons(p, gx1 + 0.4, W.zOut - 0.35, W.x1 + 2, W.zOut - 0.35, H);
    merlons(p, W.eastX + 2.05, W.zIn, W.eastX + 2.05, W.eastZ0, H);
    slab(p, W.x0, gx0, W.zIn, W.zIn + 0.45, 0.8, H, 1.5); slab(p, gx1, W.x1 - 2.4, W.zIn, W.zIn + 0.45, 0.8, H, 1.5);
    // sur yolunun kapı üstündeki kesintisi: iki yanda kısa korkuluk
    for (const x of [gx0 - 0.6, gx1 + 0.6]) slab(p, x - 0.3, x + 0.3, W.zIn, W.zOut, 1.1, H, 1.5);
    // payandalar (dış yüzde, burçlar arasında)
    for (let x = W.x0 + 8; x < W.x1 - 4; x += 16) { if (TOWERS.some((t) => Math.abs(t.x - x) < t.r + 4) || Math.abs(x - GATE.x) < 12) continue; slab(p, x - 1.2, x + 1.2, W.zOut, W.zOut + 1.1, 6, base, 2); }
    return merge(p); }, []);
  // kapı: iki yandaki kare burçlar, kemerli açıklık, kitabe
  const gate = useMemo(() => { const p: Parts = [], H = WALK_Y + 1.6, zc = WALL.zOut + GATE.towerD / 2 - 1;
    for (const s of [-1, 1]) { const x = GATE.x + s * (GATE.w / 2 + GATE.towerW / 2); slab(p, x - GATE.towerW / 2, x + GATE.towerW / 2, zc - GATE.towerD / 2 - 1, zc + GATE.towerD / 2, H + 3, -3);
      merlons(p, x - GATE.towerW / 2 + 0.3, zc + GATE.towerD / 2 - 0.35, x + GATE.towerW / 2 - 0.3, zc + GATE.towerD / 2 - 0.35, H, 1.8); merlons(p, x + s * (GATE.towerW / 2 - 0.35), zc + GATE.towerD / 2 - 1, x + s * (GATE.towerW / 2 - 0.35), zc - GATE.towerD / 2, H, 1.8); }
    return merge(p); }, []);
  // kemer üstü: açıklığın yarım daire kısmı sur gövdesine gömülü — yüz kaplaması
  const archFace = useMemo(() => { const o = new THREE.Shape(), r = GATE.w / 2, sp = GATE.h - r, R = r + 0.7; o.moveTo(-R, sp); o.absarc(0, sp, R, Math.PI, 0, true); o.lineTo(R, GATE.h + 1.2); o.lineTo(-R, GATE.h + 1.2); o.closePath();
    const h = new THREE.Path(); h.moveTo(-r, sp); h.absarc(0, sp, r, Math.PI, 0, true); h.lineTo(-r, sp); o.holes.push(h);
    return new THREE.ExtrudeGeometry(o, { depth: WALL.zOut - WALL.zIn, bevelEnabled: false, curveSegments: 14 }); }, []);
  return <group>
    <mesh geometry={geo} material={m.basalt} castShadow receiveShadow />
    <mesh geometry={gate} material={m.basalt} castShadow receiveShadow />
    <mesh geometry={archFace} material={m.dressed} position={[GATE.x, 0, WALL.zIn]} castShadow receiveShadow />
    {/* geçit tavanı (tonoz yerine düz koyu yüz) ve iki yanda kapı kanatları */}
    {[-1, 1].map((s) => <mesh key={s} material={m.wood} position={[GATE.x + s * (GATE.w / 2 - 0.15), 2.3, WALL.zIn + 0.5]} rotation-y={s * 1.35}><boxGeometry args={[GATE.w / 2, 4.6, 0.16]} /></mesh>)}
    <mesh material={m.plaque} position={[GATE.x, GATE.h + 1.2, WALL.zOut + 0.04]}><planeGeometry args={[3.6, 1.6]} /></mesh>
  </group>;
}

/** Burçlar: yuvarlak gövde sur yolu yüksekliğinde biter; üstte korkuluk ve mazgallar; büyüklerde yazı kuşağı */
export function Towers({ m }: { m: Mats }) {
  const { body, top, bands } = useMemo(() => { const body: Parts = [], top: Parts = [], bands: { g: THREE.BufferGeometry; t: Tower }[] = [];
    for (const t of TOWERS) { const base = Math.min(terrainBase(t.x, t.z + t.r), -0.2) - 3, H = WALK_Y - base;
      if (t.round) { const g = cyl(t.r, H, 48, 3); g.translate(t.x, base + H / 2, t.z); body.push(g);
        // alt pabuç (şev)
        const sk = new THREE.CylinderGeometry(t.r + 0.1, t.r + 0.9, 2.4 - base, 48, 1, true); { const uv = sk.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * t.r * Math.PI * 2) / 3, (uv.getY(i) * (2.4 - base)) / 3); } sk.translate(t.x, base + (2.4 - base) / 2, t.z); body.push(sk);
        // tepe: döşeme + korkuluk halkası + mazgallar
        const fl = new THREE.CylinderGeometry(t.r - 0.6, t.r - 0.6, 0.2, 40); fl.translate(t.x, WALK_Y - 0.1, t.z); top.push(fl);
        const ring = new THREE.RingGeometry(t.r - 0.6, t.r, 48); ring.rotateX(-Math.PI / 2); ring.translate(t.x, WALK_Y + 0.9, t.z);
        const wall = cyl(t.r, 0.95, 48, 3, true); wall.translate(t.x, WALK_Y + 0.45, t.z); top.push(wall, ring);
        const n = Math.round((t.r * Math.PI * 2) / 2.1);
        for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, x = t.x + Math.sin(a) * (t.r - 0.25), z = t.z + Math.cos(a) * (t.r - 0.25); if (z < WALL.zOut - 0.2) continue;
          const mg = bx(1.1, 1.4, 0.6, 1.5); mg.rotateY(a); mg.translate(x, WALK_Y + 0.9 + 0.7, z); top.push(mg); }
        // silmeler
        for (const y of [3.2, t.r > 10 ? 10.6 : 9.6]) { const sm = cyl(t.r + 0.12, 0.28, 64, 1.5, true); sm.translate(t.x, y, t.z); body.push(sm); }
        if (t.r > 10) { const tl = 1.9, g2 = new THREE.CylinderGeometry(t.r + 0.05, t.r + 0.05, 1.2, 40, 1, true, (t.id === 'ulubeden' ? 0.2 : 0.35) - tl / 2, tl), uv = g2.attributes.uv as THREE.BufferAttribute;
          for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * t.r * tl) / 9.6);
          g2.translate(t.x, 9.6, t.z); bands.push({ g: g2, t }); }
      } else { slab(body, t.x - t.r, t.x + t.r, WALL.zOut - 1, t.z + t.r, H + 1.4, base);
        merlons(top, t.x - t.r + 0.3, t.z + t.r - 0.35, t.x + t.r - 0.3, t.z + t.r - 0.35, WALK_Y + 1.4, 1.8); for (const s of [-1, 1]) merlons(top, t.x + s * (t.r - 0.35), t.z + t.r - 0.6, t.x + s * (t.r - 0.35), WALL.zOut, WALK_Y + 1.4, 1.8); } }
    return { body: merge(body), top: merge(top), bands }; }, []);
  const eagle = TARGETS.find((t) => t.id === 'yk-kartal')!, nur = TARGETS.find((t) => t.id === 'nur-yazi')!, wallP = TARGETS.find((t) => t.id === 'duvar-yazi')!;
  return <group>
    <mesh geometry={body} material={m.dressed} castShadow receiveShadow />
    <mesh geometry={top} material={m.basalt} castShadow receiveShadow />
    {bands.map(({ g, t }) => <mesh key={t.id} geometry={g} material={m.band} />)}
    <mesh material={m.eagle} position={[eagle.at[0] + eagle.n[0] * 0.08, eagle.at[1], eagle.at[2] + eagle.n[1] * 0.08]} rotation-y={Math.atan2(eagle.n[0], eagle.n[1])}><planeGeometry args={[3.6, 3.6]} /></mesh>
    <mesh material={m.plaque} position={[nur.at[0], nur.at[1], nur.at[2] + 0.05]}><planeGeometry args={[2.2, 1.1]} /></mesh>
    <mesh material={m.plaque} position={[wallP.at[0], wallP.at[1], wallP.at[2]]}><planeGeometry args={[2.6, 1.3]} /></mesh>
  </group>;
}

/** İçeriden sur üstüne çıkan merdiven; iki yanında bazalt yan duvar */
export function Stairs({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = [], n = 44, L = RAMP.zTop - RAMP.zBot;
    for (let i = 0; i < n; i++) { const z0 = RAMP.zBot + (i / n) * L, z1 = RAMP.zBot + ((i + 1) / n) * L, y = (WALK_Y * (i + 1)) / n; slab(p, RAMP.x0 - 0.05, RAMP.x1 + 0.05, z0, Math.min(z1 + 0.6, RAMP.zTop), y, 0, 1.2); }
    for (const [x0, x1] of [[RAMP.x0 - 1.0, RAMP.x0], [RAMP.x1, RAMP.x1 + 1.0]]) { const s = new THREE.Shape(); s.moveTo(RAMP.zBot, 0); s.lineTo(RAMP.zTop, 0); s.lineTo(RAMP.zTop, WALK_Y + 0.9); s.lineTo(RAMP.zBot, 0.9); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: x1 - x0, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(x1, 0, 0);
      const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3); p.push(g); }
    return merge(p); }, []);
  return <mesh geometry={geo} material={m.basalt} castShadow receiveShadow />;
}

/** Sur içi: bazalt evler (düz dam, küçük pencereler, ahşap saçak) */
export function Houses({ m }: { m: Mats }) {
  const { walls, dark, eaves } = useMemo(() => { const walls: Parts = [], dark: Parts = [], eaves: Parts = [];
    for (const h of HOUSES) { slab(walls, h.x0, h.x1, h.z0, h.z1, h.h, 0, 3); slab(walls, h.x0 - 0.15, h.x1 + 0.15, h.z0 - 0.15, h.z1 + 0.15, 0.35, h.h, 2);
      slab(eaves, h.x0 - 0.4, h.x1 + 0.4, h.z1, h.z1 + 0.6, 0.12, h.h - 0.5, 2);
      for (let x = h.x0 + 1.4; x < h.x1 - 1; x += 2.4) { const w = new THREE.PlaneGeometry(0.7, 1.0); w.translate(x, h.h - 1.8, h.z1 + 0.01); dark.push(w); }
      const d = new THREE.PlaneGeometry(1.2, 2.2); d.translate((h.x0 + h.x1) / 2, 1.1, h.z1 + 0.01); dark.push(d); }
    return { walls: merge(walls), dark: merge(dark), eaves: merge(eaves) }; }, []);
  return <group>
    <mesh geometry={walls} material={m.house} castShadow receiveShadow />
    <mesh geometry={dark} material={m.dark} />
    <mesh geometry={eaves} material={m.wood} castShadow />
  </group>;
}

/** Sur içi kent dokusu (oyuncu girmez): sıkışık bazalt ev blokları, düz damlar, kare gövdeli bir minare (temsilî) */
export function City({ m }: { m: Mats }) {
  const ref = useRef<THREE.InstancedMesh>(null), roofRef = useRef<THREE.InstancedMesh>(null);
  const list = useMemo(() => { const r = rng(77), out: { x: number; z: number; w: number; d: number; h: number }[] = [];
    for (let z = INSIDE.z0 - 3; z > -330; z -= 13) for (let x = WALL.x0 + 4; x < WALL.eastX - 6; x += 0) { const w = 6 + r() * 7, d = 7 + r() * 4; if (r() > 0.12) out.push({ x: x + w / 2, z: z - d / 2, w, d, h: 4.5 + r() * 4.5 + (r() < 0.1 ? 3 : 0) }); x += w + (r() < 0.25 ? 4 : 0.6); }
    return out; }, []);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useEffect(() => { const o = new THREE.Object3D();
    list.forEach((b, i) => { o.position.set(b.x, b.h / 2, b.z); o.scale.set(b.w, b.h, b.d); o.updateMatrix(); ref.current?.setMatrixAt(i, o.matrix);
      o.position.set(b.x, b.h + 0.15, b.z); o.scale.set(b.w + 0.3, 0.3, b.d + 0.3); o.updateMatrix(); roofRef.current?.setMatrixAt(i, o.matrix); });
    for (const mm of [ref.current, roofRef.current]) if (mm) { mm.count = list.length; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [list]);
  const minaret = useMemo(() => { const p: Parts = [], x = -20, z = -95; slab(p, x - 2.4, x + 2.4, z - 2.4, z + 2.4, 26, 0, 3); slab(p, x - 2.8, x + 2.8, z - 2.8, z + 2.8, 0.6, 22, 2); slab(p, x - 1.6, x + 1.6, z - 1.6, z + 1.6, 4, 26, 2);
    const cap = new THREE.ConeGeometry(1.4, 3, 4); cap.rotateY(Math.PI / 4); cap.translate(x, 31.5, z); p.push(cap);
    slab(p, x - 30, x - 4, z - 14, z + 8, 9, 0, 3); return merge(p); }, []);
  return <group>
    <instancedMesh ref={ref} args={[box, m.house, list.length]} castShadow receiveShadow />
    <instancedMesh ref={roofRef} args={[box, m.basalt, list.length]} receiveShadow />
    <mesh geometry={minaret} material={m.dressed} castShadow receiveShadow />
  </group>;
}

/* ===================== arazi, Hevsel, Dicle, köprü ===================== */
export function Ground({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 260 : 170, S = 1100, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2); g.translate(80, 0, 0);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(),
      dry = new THREE.Color('#b59f6e'), dry2 = new THREE.Color('#9c8a5c'), green = new THREE.Color('#5e7f3a'), green2 = new THREE.Color('#7b9447'), pave = new THREE.Color('#5a5650'), mud = new THREE.Color('#7a6a52');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let y = landY(x, z);
      c.copy(dry).lerp(dry2, 0.5 + 0.5 * Math.sin(x * 0.05 + z * 0.03));
      if (x > HEVSEL.x0 - 20 && x < RIVER.x0 - 4) { const t = Math.min(1, (x - HEVSEL.x0 + 20) / 30), plot = (Math.floor(x / 14) + Math.floor(z / 18)) % 3; c.lerp(plot === 0 ? green2 : green, t * 0.9); }
      if (x > RIVER.x0 - 8 && x < RIVER.x1 + 6) c.copy(mud);
      if (x < WALL.eastX && z < WALL.zIn) { c.copy(pave); y = 0; }
      if (x > RIVER.x1 + 6) c.lerp(green, 0.25);
      p.setY(i, y - 0.02); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
/** Sur içi sokak döşemesi (bazalt parke) */
export function Paving() {
  const tex = useMemo(() => { const t = canvasTex(256, 256, (g, r) => { g.fillStyle = '#2c2a28'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 42) { const v = 0.8 + r() * 0.35, o = ((y / 32) % 2) * 21; g.fillStyle = `rgb(${(78 * v) | 0},${(75 * v) | 0},${(70 * v) | 0})`; g.fillRect(x + o + 2, y + 2, 38, 28); g.fillRect(x + o - 256 + 2, y + 2, 38, 28); } }); t.repeat.set((INSIDE.x1 - INSIDE.x0) / 3, (WALL.zIn - INSIDE.z0) / 3); return t; }, []);
  return <mesh rotation-x={-Math.PI / 2} position={[(INSIDE.x0 + WALL.eastX) / 2, 0.01, (INSIDE.z0 + WALL.zIn) / 2]} receiveShadow><planeGeometry args={[WALL.eastX - INSIDE.x0, WALL.zIn - INSIDE.z0]} /><meshStandardMaterial map={tex} roughness={0.9} /></mesh>;
}
export function River() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4d6f6a', roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.93 }), []), ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.position.y = RIVER.y + Math.sin(clock.elapsedTime * 0.5) * 0.03; });
  return <mesh ref={ref} rotation-x={-Math.PI / 2} position={[(RIVER.x0 + RIVER.x1) / 2, RIVER.y, 0]} userData={{ noCast: true }}><planeGeometry args={[RIVER.x1 - RIVER.x0 + 10, 1400]} /><primitive object={mat} attach="material" /></mesh>;
}
/** On Gözlü Köprü: on kemer gözü, hafif sivri kemerler, aralarında selyaranlar (gerçek ölçüler değil) */
export function Bridge({ m }: { m: Mats }) {
  const geo = useMemo(() => { const L = BRIDGE.len, H = BRIDGE.h + 2, n = BRIDGE.arches, s = new THREE.Shape(), y0 = -6;
    s.moveTo(0, y0); s.lineTo(L, y0); s.lineTo(L, H); s.lineTo(0, H); s.closePath();
    const span = L / n, w = span * 0.72;
    for (let i = 0; i < n; i++) { const cx = (i + 0.5) * span, r = w / 2, sp = 3.2, hole = new THREE.Path();
      hole.moveTo(cx - r, -4); hole.lineTo(cx - r, sp); hole.quadraticCurveTo(cx - r, sp + r * 0.95, cx, sp + r * 1.2); hole.quadraticCurveTo(cx + r, sp + r * 0.95, cx + r, sp); hole.lineTo(cx + r, -4); hole.closePath(); s.holes.push(hole); }
    const g = new THREE.ExtrudeGeometry(s, { depth: 7, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -3.5);
    const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
    const p: Parts = [g];
    for (let i = 1; i < n; i++) for (const sz of [-1, 1]) { const c = new THREE.CylinderGeometry(2.1, 2.1, 9, 3); c.rotateY(sz > 0 ? 0 : Math.PI); c.translate(i * span, -1.5, sz * 4.3); p.push(c); }   // selyaranlar
    slab(p, 0, L, -3.8, -3.4, 1, H, 1.5); slab(p, 0, L, 3.4, 3.8, 1, H, 1.5);
    return merge(p); }, []);
  return <mesh geometry={geo} material={m.dressed} position={[BRIDGE_X0, RIVER.y, BRIDGE.z]} castShadow receiveShadow />;
}

/** Hevsel bahçeleri: sıra sıra meyve ağaçları ve kavaklar; uzakta seyrek ağaçlar */
export function Trees({ n }: { n: number }) {
  const kinds = useMemo(() => { const r = rng(3), paint = (g: THREE.BufferGeometry, hex: string, j: number) => { const gg = g.index ? g.toNonIndexed() : g, col: number[] = [], cc = new THREE.Color();
    for (let i = 0; i < gg.attributes.position.count; i++) { cc.set(hex).offsetHSL(0, 0, (r() - 0.5) * j); col.push(cc.r, cc.g, cc.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return gg; };
    const fruit = mergeGeometries([paint(new THREE.CylinderGeometry(0.16, 0.24, 1.6, 6).translate(0, 0.8, 0), '#5b4a38', 0.05), ...Array.from({ length: 5 }, (_, i) => { const a = r() * 6.28, d = i ? 0.9 + r() * 0.5 : 0;
      return paint(new THREE.IcosahedronGeometry(1.3 + r() * 0.4, 1).translate(Math.cos(a) * d, 2.4 + r() * 0.6, Math.sin(a) * d), '#4f7a33', 0.12); })])!;
    const poplar = mergeGeometries([paint(new THREE.CylinderGeometry(0.15, 0.25, 3, 6).translate(0, 1.5, 0), '#6e6250', 0.05), paint(new THREE.SphereGeometry(1, 9, 8).scale(1.2, 5.2, 1.2).translate(0, 7, 0), '#5f8a3c', 0.14)])!;
    for (const g of [fruit, poplar]) g.computeVertexNormals(); return [fruit, poplar]; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []), refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  useEffect(() => { const r = rng(23), o = new THREE.Object3D(), cnt = [0, 0];
    const put = (t: number, x: number, z: number, s: number) => { const mm = refs.current[t]; if (!mm || cnt[t] >= n) return; o.position.set(x, landY(x, z) - 0.1, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(s); o.updateMatrix(); mm.setMatrixAt(cnt[t]++, o.matrix); };
    for (let x = HEVSEL.x0 + 4; x < RIVER.x0 - 8; x += 6.5) for (let z = -300; z < 300; z += 6.5) { if (Math.abs(z - BRIDGE.z) < 8) continue; if ((Math.floor(x / 14) + Math.floor(z / 18)) % 3 === 0 && r() < 0.85) continue; if (Math.hypot(x - 176, z - 40) < 9 || Math.hypot(x - 246, z - 110) < 9) continue; put(0, x + (r() - 0.5) * 2, z + (r() - 0.5) * 2, 0.8 + r() * 0.5); }
    for (let z = -300; z < 300; z += 4 + r() * 4) { put(1, RIVER.x0 - 7 + r() * 2, z, 0.8 + r() * 0.5); put(1, RIVER.x1 + 6 + r() * 3, z, 0.8 + r() * 0.5); }
    for (let i = 0; i < 400; i++) { const x = -150 + r() * 220, z = 40 + r() * 240; if (z < 70 && x > -140) continue; put(r() < 0.5 ? 0 : 1, x, z, 0.8 + r() * 0.5); }
    refs.current.forEach((mm, i) => { if (!mm) return; mm.count = cnt[i]; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); }); }, [n, kinds]);
  return <group>{kinds.map((g, i) => <instancedMesh key={i} ref={(mm) => { refs.current[i] = mm; }} args={[g, mat, n]} castShadow receiveShadow />)}</group>;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 4 && k < n; i++) { const x = -140 + r() * 400, z = 3.5 + r() * 140; if (x > RIVER.x0 - 8) continue;
      if (TOWERS.some((t) => Math.hypot(x - t.x, z - t.z) < t.r + 1.5)) continue; if (Math.abs(x - GATE.x) < 12 && z < 12) continue;
      o.position.set(x, landY(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.35 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix);
      const hev = x > HEVSEL.x0 - 10; c.setHSL(hev ? 0.24 + r() * 0.04 : 0.11 + r() * 0.04, hev ? 0.45 : 0.4, hev ? 0.34 + r() * 0.08 : 0.5 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 9; i++) { const a = Math.PI * (-0.2 + (i / 8) * 1.4) + r() * 0.15, dd = 1000 + r() * 500; out.push({ p: [Math.cos(a) * dd + 100, -30, Math.sin(a) * dd], g: mountainGeo(420 + r() * 260, 120 + r() * 120, 60 + i, 2, '#8a7c5c') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
