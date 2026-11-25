/**
 * Konuralp — 3B modeller: yamaca yaslanan Roma tiyatrosu (basamaklı oturma sıraları, iki ara geçit, yan uçlarda dış duvar ve altında
 * tonozlu galeri ağızları, yan istinat duvarları), orkestra döşemesi, sahne (pulpitum), yıkık sahne binası ve sütunları, kuzey yamaçta
 * şapel kalıntısı, doğu tepede köy evleri, çevrede ağaçlar ve tepeler. Biçimler ve ölçüler TEMSİLÎDİR.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { archGeo, bx, mountainGeo, stoneTex, weather } from '../shared/scenery';
import { BOUNDS, CHAPEL, PULPITUM, SEAT_TOP, SKENE, TH, groundY, hill, seatY } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
/** Sıfır uzunluklu normaller (dejenere üçgenler) gölgelendiricide NaN üretir; son işlem bunu tüm kareye yayar */
function fixNormals(g: THREE.BufferGeometry) { const n = g.attributes.normal as THREE.BufferAttribute; for (let i = 0; i < n.count; i++) if (!(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) > 1e-6)) n.setXYZ(i, 0, 1, 0); return g; }
const merge = (parts: THREE.BufferGeometry[]) => fixNormals(mergeGeometries(parts.map((g) => { const n = g.index ? g.toNonIndexed() : g; if (!n.attributes.normal) n.computeVertexNormals(); if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; }))!);
export const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); return g; };

export interface Mats { seat: THREE.MeshStandardMaterial; wall: THREE.MeshStandardMaterial; marble: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; grass: THREE.MeshStandardMaterial; soil: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; leaf: THREE.MeshStandardMaterial; terra: THREE.MeshStandardMaterial; bark: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('konuralp-tas', ['#b9b2a2', '#c4bdac', '#aca595', '#cfc8b6', '#b3a994'], [14, 10], [40, 46]);
    const wl = stoneTex('konuralp-duvar', ['#9a9284', '#a69e8e', '#8e877a', '#b0a796', '#958b7a'], [24, 16], [24, 30]);
    const gr = canvasTex(128, 128, (g, r) => { g.fillStyle = '#6f8a48'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${55 + r() * 60 | 0},${90 + r() * 60 | 0},${35 + r() * 20 | 0},.7)`; g.fillRect(r() * 128, r() * 128, 2, 3); } });
    const so = canvasTex(128, 128, (g, r) => { g.fillStyle = '#7a5e42'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 700; i++) { const v = r(); g.fillStyle = `rgba(${90 + v * 60 | 0},${68 + v * 40 | 0},${45 + v * 25 | 0},.8)`; g.fillRect(r() * 128, r() * 128, 2 + r() * 3, 2 + r() * 3); } });
    const tile = canvasTex(256, 256, (g, r) => { g.fillStyle = '#7c3a28'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 16) for (let x = (y / 16) % 2 ? -8 : 0; x < 256; x += 16) { const v = r(); g.fillStyle = `rgb(${150 + v * 40 | 0},${70 + v * 25 | 0},${48 + v * 15 | 0})`; g.beginPath(); g.ellipse(x + 8, y + 10, 7, 9, 0, 0, Math.PI); g.fill(); } });
    return {
      seat: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.4, roughness: 0.9, side: THREE.DoubleSide })),
      wall: weather(new THREE.MeshStandardMaterial({ map: wl.map, bumpMap: wl.bump, bumpScale: 0.6, roughness: 0.95 })),
      marble: new THREE.MeshStandardMaterial({ color: '#d4cdbd', roughness: 0.6 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2520', roughness: 1, side: THREE.DoubleSide }),
      grass: new THREE.MeshStandardMaterial({ map: gr, roughness: 1 }),
      soil: new THREE.MeshStandardMaterial({ map: so, roughness: 1 }),
      plaster: new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: 0.9 }),
      roof: new THREE.MeshStandardMaterial({ map: tile, roughness: 0.8 }),
      leaf: new THREE.MeshStandardMaterial({ color: '#4c7236', roughness: 0.95 }),
      terra: new THREE.MeshStandardMaterial({ color: '#b86a42', roughness: 0.8 }),
      bark: new THREE.MeshStandardMaterial({ color: '#5e4a38', roughness: 1 }),
    };
  }, []);
}

/** Sınırların dışında arazi yükselir (ağaçlar da aynı yüzeye oturur) */
const outside = (x: number, z: number) => Math.max(0, x - BOUNDS.x1, BOUNDS.x0 - x, z - BOUNDS.z1, BOUNDS.z0 - z);
const terrainY = (x: number, z: number) => groundY(x, z) + outside(x, z) * 0.25;
/** Arazi: yamaç; oturma alanının altında sıraların hemen altında kalır */
export function Terrain({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const S = 420, N = 300, t = new THREE.PlaneGeometry(S, S, N, N); t.rotateX(-Math.PI / 2); const p = t.attributes.position as THREE.BufferAttribute, u = t.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); let y = groundY(x, z);
      if (z < 1.5 && r < TH.r1 + 1.5) y = Math.min(hill(x, z), seatY(r)) - 0.08;   // oturma alanının altı
      p.setY(i, y + outside(x, z) * 0.25); u.setXY(i, u.getX(i) * 140, u.getY(i) * 140); }
    t.computeVertexNormals(); return t;
  }, []);
  const mts = useMemo(() => [
    { p: [-320, -6, -220] as [number, number, number], g: mountainGeo(220, 150, 3, 0, '#4f6a3c') }, { p: [300, -6, -260] as [number, number, number], g: mountainGeo(240, 170, 5, 0, '#4a663a') },
    { p: [0, -6, -420] as [number, number, number], g: mountainGeo(280, 200, 7, 0, '#4a663a') }, { p: [-300, -6, 260] as [number, number, number], g: mountainGeo(220, 110, 9, 0, '#56703f') },
  ], []);
  return <group userData={{ noCast: true }}>
    <mesh geometry={g} material={m.grass} receiveShadow />
    {mts.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}
  </group>;
}

/** Tiyatro: sıralar, ara geçitler, merdivenler, dış duvar ve galeriler, istinat duvarları, orkestra, sahne ve sahne binası */
export function Theatre({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const seat: THREE.BufferGeometry[] = [], wall: THREE.BufferGeometry[] = [], marble: THREE.BufferGeometry[] = [], dark: THREE.BufferGeometry[] = [];
    // sıralar: her sıra bir basamak yüzü (halka dilimi) ve bir rıht (açık silindir dilimi)
    const D = 0.8; let prev = 0;
    for (let r = TH.r0; r < TH.r1 - 0.01; r += D) { const y = seatY(r + D), rr = Math.min(TH.r1, r + D);
      const tr = new THREE.RingGeometry(r, rr, 72, 1, 0, Math.PI); tr.rotateX(-Math.PI / 2); const u = tr.attributes.uv as THREE.BufferAttribute, p = tr.attributes.position as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, p.getX(i) / 2.4, p.getZ(i) / 2.4); seat.push(at(tr, 0, y, 0));
      if (y - prev > 0.02) { const rs = new THREE.CylinderGeometry(r, r, y - prev, 72, 1, true, Math.PI / 2, Math.PI); const ru = rs.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < ru.count; i++) ru.setXY(i, ru.getX(i) * r * Math.PI / 2.4, ru.getY(i) * (y - prev) / 2.4); seat.push(at(rs, 0, (y + prev) / 2, 0)); }
      prev = y; }
    // merdivenler (kerkides): her sıranın önünde yarım basamak
    for (let k = 1; k < 8; k++) { const a = Math.PI + (k / 8) * Math.PI; let p = 0; for (let r = TH.r0; r < TH.r1 - 0.01; r += D) { const y = seatY(r + D); if (y - p > 0.05) { const h = (y - p) / 2, s = bx(1.0, h, 0.4, 1); s.rotateY(-a - Math.PI / 2); marble.push(at(s, Math.cos(a) * (r + 0.2), p + h / 2 + 0.01, Math.sin(a) * (r + 0.2))); } p = y; } }
    // dış duvar: yamaca yaslanmayan kesimde, tepesi üst terasla aynı; altında galeri ağızları
    const W = 2.2, NA = 48;
    for (let i = 0; i < NA; i++) { const a0 = Math.PI + (i / NA) * Math.PI, a1 = Math.PI + ((i + 1) / NA) * Math.PI, am = (a0 + a1) / 2, R = TH.r1 + W / 2, x = Math.cos(am) * R, z = Math.sin(am) * R, base = hill(x, z) - 1.2, top = SEAT_TOP + 0.9;
      if (top - base < 1.5) continue; const len = (a1 - a0) * R + 0.05, b = bx(len, top - base, W, 3); b.rotateY(-am - Math.PI / 2); wall.push(at(b, x, (top + base) / 2, z));
      if (top - base > 6 && i % 2 === 0) { const ar = archGeo(2.4, 3.6, false); ar.rotateY(Math.PI / 2 - am); const Ro = TH.r1 + W + 0.03; dark.push(at(ar, Math.cos(am) * Ro, base + 1.2, Math.sin(am) * Ro)); } }
    // istinat duvarları: caveanın iki ucunda, z = 0 boyunca
    for (const s of [-1, 1]) { const pts: THREE.Vector2[] = [new THREE.Vector2(s * TH.r0, -1)]; for (let r = TH.r0; r <= TH.r1 + W; r += 0.8) pts.push(new THREE.Vector2(s * r, (r > TH.r1 ? SEAT_TOP : seatY(r)) + 0.9)); pts.push(new THREE.Vector2(s * (TH.r1 + W), -1));
      const e = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.9, bevelEnabled: false }); const u = e.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) / 3, u.getY(i) / 3); wall.push(at(e, 0, 0, -0.3)); }
    // orkestra: yarım daire mermer döşeme ve sahneye uzanan dikdörtgen
    { const o = new THREE.CircleGeometry(TH.r0, 48); o.rotateX(-Math.PI / 2); const ou = o.attributes.uv as THREE.BufferAttribute, op = o.attributes.position as THREE.BufferAttribute; for (let i = 0; i < ou.count; i++) ou.setXY(i, op.getX(i) / 2.4, op.getZ(i) / 2.4); seat.push(at(o, 0, 0.02, 0)); }
    // sahne (pulpitum) ve sahne binası (yıkık: üst kenarı düzensiz, üç kapı)
    { const [x0, z0, x1, z1] = PULPITUM, w = x1 - x0, d = z1 - z0; wall.push(at(bx(w, 1.4, d, 3), (x0 + x1) / 2, 0.7, (z0 + z1) / 2)); marble.push(at(bx(w + 0.2, 0.12, d + 0.2, 2), (x0 + x1) / 2, 1.46, (z0 + z1) / 2));
      for (let a = x0 + 1; a < x1; a += 2.5) dark.push(at(bx(0.9, 0.8, 0.04), a, 0.6, z0 - 0.02)); }
    { const [x0, z0, x1, z1] = SKENE, d = z1 - z0, r = rng(3);
      for (let x = x0; x < x1 - 0.01; x += 2) { const h = 3 + r() * 5 + (Math.abs(x + 1) < 8 ? 2 : 0); wall.push(at(bx(2, h, d, 3), x + 1, h / 2, (z0 + z1) / 2)); }
      for (const a of [-9, 0, 9]) { const dr = archGeo(a ? 2 : 2.8, a ? 3.4 : 4.4, false); dark.push(at(dr, a, 0, z0 - 0.03)); }
      // ön cephe sütunları: bir kısmı ayakta, bir kısmı kırık
      for (let i = 0; i < 10; i++) { const x = x0 + 3 + i * 5.1, h = i % 3 === 1 ? 1.2 + r() : 4 + r() * 3.5; marble.push(at(new THREE.CylinderGeometry(0.32, 0.36, h, 14), x, 1.46 + h / 2, 4.2)); marble.push(at(bx(0.9, 0.4, 0.9, 1), x, 1.66, 4.2)); }
      for (let i = 0; i < 6; i++) { const c = new THREE.CylinderGeometry(0.32, 0.34, 2 + r() * 2.5, 12); c.rotateZ(Math.PI / 2); c.rotateY(r() * 3); marble.push(at(c, -20 + r() * 40, 0.33, 14 + r() * 6)); } }
    // şapel: alçak duvarlar, doğuda (+x) yarım daire apsis
    { const [x0, z0, x1, z1] = CHAPEL, y = SEAT_TOP - 0.1, H = 1.4, t = 0.6, cz = (z0 + z1) / 2, w = z1 - z0;
      wall.push(at(bx(x1 - x0, H, t, 2), (x0 + x1) / 2, y + H / 2, z0 + t / 2)); wall.push(at(bx(x1 - x0, H * 0.7, t, 2), (x0 + x1) / 2, y + H * 0.35, z1 - t / 2));
      wall.push(at(bx(t, H * 0.8, w * 0.32, 2), x0 + t / 2, y + H * 0.4, z0 + w * 0.16)); wall.push(at(bx(t, H * 0.8, w * 0.32, 2), x0 + t / 2, y + H * 0.4, z1 - w * 0.16));
      const ap = new THREE.CylinderGeometry(w / 2 - 0.3, w / 2 - 0.3, H, 16, 1, true, 0, Math.PI); wall.push(at(ap, x1, y + H / 2, cz)); }
    return { seat: merge(seat), wall: merge(wall), marble: merge(marble), dark: merge(dark) };
  }, []);
  return <group>
    <mesh geometry={g.seat} material={m.seat} receiveShadow castShadow />
    <mesh geometry={g.wall} material={m.wall} receiveShadow castShadow />
    <mesh geometry={g.marble} material={m.marble} receiveShadow castShadow />
    <mesh geometry={g.dark} material={m.dark} />
  </group>;
}
/** Doğu tepede köy evleri ve çevrede ağaçlar (tiyatronun bir kısmı hâlâ evlerin altında) */
export function Surround({ m, n }: { m: Mats; n: number }) {
  const g = useMemo(() => {
    const r = rng(17), pl: THREE.BufferGeometry[] = [], rf: THREE.BufferGeometry[] = [], lf: THREE.BufferGeometry[] = [], tk: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 9; i++) { const x = 84 + (i % 3) * 13 + r() * 4, z = -60 + Math.floor(i / 3) * 16 + r() * 4, y = terrainY(x, z), w = 7 + r() * 3, d = 6 + r() * 2, h = 5.5;
      pl.push(at(bx(w, h, d, 3), x, y + h / 2 - 0.5, z)); const c = new THREE.ConeGeometry(Math.SQRT2, 1, 4, 1); c.rotateY(Math.PI / 4); c.scale((w + 1.2) / 2, 2.2, (d + 1.2) / 2); rf.push(at(c, x, y + h - 0.5 + 1.1, z)); }
    for (let i = 0; i < n * 3 && lf.length < n; i++) { const x = (r() - 0.5) * 300, z = (r() - 0.5) * 300, rr = Math.hypot(x, z); if (rr < TH.r1 + 10 || (x > 55 && x < 105 && z > -70 && z < -20) || (Math.abs(x) < 32 && z > 0 && z < 45)) continue;
      const s = 1.4 + r() * 1.6, y = terrainY(x, z) - 0.2; lf.push(at(new THREE.IcosahedronGeometry(s * 1.4, 0), x, y + s * 2.2, z)); tk.push(at(new THREE.CylinderGeometry(0.16 * s, 0.24 * s, s * 2.2, 6), x, y + s * 1.1, z)); }
    return { pl: merge(pl), rf: merge(rf), lf: merge(lf), tk: merge(tk) };
  }, [n]);
  return <group>
    <mesh geometry={g.pl} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={g.rf} material={m.roof} castShadow />
    <mesh geometry={g.lf} material={m.leaf} castShadow />
    <mesh geometry={g.tk} material={m.bark} castShadow />
  </group>;
}
