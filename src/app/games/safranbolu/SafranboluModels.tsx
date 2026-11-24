/**
 * Safranbolu — 3B modeller: Arnavut kaldırımlı çarşı meydanı ve kıvrılan yokuş sokak; taş zemin katlı, beyaz sıvalı ahşap karkas üst
 * katları sokağa çıkmalı, geniş saçaklı kiremit çatılı evler; iki katlı revaklı Cinci Hanı (kemerli avlu cepheleri, bacalar);
 * Kaymakamlar Evi (taşlık, merdiven, sofa, harem ve selamlık odaları, sedirler, yüklük, ocak, göbekli tavan, dönme dolap).
 * Ölçek ve düzen TEMSİLÎDİR.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, mountainGeo, stoneTex } from '../shared/scenery';
import { DOLAP, DOOR_HAREM, DOOR_SELAMLIK, HAN, HOUSE_Y, KH, PLAZA, ROOMS, SOFA, SQUARE, STREET, streetX, streetY, type ItemId } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => { const n = g.index ? g.toNonIndexed() : g; if (!n.attributes.normal) n.computeVertexNormals(); if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; }))!;
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); return g; };
const UP = KH.up, HY = HOUSE_Y;

/* ---------- malzemeler ---------- */
export interface Mats { pave: THREE.MeshStandardMaterial; rubble: THREE.MeshStandardMaterial; hanStone: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial; timber: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; floor: THREE.MeshStandardMaterial; ceil: THREE.MeshStandardMaterial; cushion: THREE.MeshStandardMaterial; grass: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; facade: THREE.MeshStandardMaterial; win: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const pv = canvasTex(256, 256, (g, r) => { g.fillStyle = '#6d665d'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 260; i++) { const x = r() * 256, y = r() * 256, rx = 7 + r() * 9, ry = 6 + r() * 7, v = 120 + r() * 60 | 0; g.fillStyle = `rgb(${v},${v - 6},${v - 14})`; g.beginPath(); g.ellipse(x, y, rx, ry, r() * 3, 0, 7); g.fill(); g.strokeStyle = 'rgba(40,35,30,.5)'; g.lineWidth = 1.5; g.stroke(); } });
    const rb = stoneTex('safranbolu-moloz', ['#8d8272', '#9b9080', '#7e7466', '#a69b8a'], [14, 10], [22, 26]);
    const hs = stoneTex('safranbolu-han', ['#b9a17a', '#c7b08a', '#a8916c', '#cdb894'], [30, 16], [60, 50]);
    const pl = canvasTex(256, 256, (g, r) => { g.fillStyle = '#f2eee6'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '200,190,175' : '255,255,250'},${0.12 + r() * 0.15})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 10 + r() * 40, 8 + r() * 30, r() * 3, 0, 7); g.fill(); } });
    const tile = canvasTex(256, 256, (g, r) => { g.fillStyle = '#7c3a28'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 16) for (let x = (y / 16) % 2 ? -8 : 0; x < 256; x += 16) { const v = r(); g.fillStyle = `rgb(${150 + v * 40 | 0},${70 + v * 25 | 0},${48 + v * 15 | 0})`; g.beginPath(); g.ellipse(x + 8, y + 10, 7, 9, 0, 0, Math.PI); g.fill(); } });
    const fl = canvasTex(256, 256, (g, r) => { for (let y = 0; y < 256; y += 21) { const v = r(); g.fillStyle = `rgb(${120 + v * 30 | 0},${82 + v * 20 | 0},${50 + v * 12 | 0})`; g.fillRect(0, y, 256, 20); g.fillStyle = 'rgba(40,25,15,.6)'; g.fillRect(0, y + 20, 256, 1); for (let k = 0; k < 14; k++) { g.fillStyle = 'rgba(60,40,25,.25)'; g.fillRect(r() * 256, y + r() * 20, 30 + r() * 60, 1); } } });
    const cl = canvasTex(256, 256, (g, r) => { for (let x = 0; x < 256; x += 25) { const v = r(); g.fillStyle = `rgb(${135 + v * 25 | 0},${95 + v * 18 | 0},${58 + v * 10 | 0})`; g.fillRect(x, 0, 24, 256); g.fillStyle = '#5a3c26'; g.fillRect(x + 24, 0, 2, 256); } });
    const cu = canvasTex(128, 128, (g) => { g.fillStyle = '#9e2b25'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#d9b25c'; g.lineWidth = 3; for (let x = 8; x < 128; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 12, 64); g.lineTo(x, 128); g.stroke(); } });
    const gr = canvasTex(128, 128, (g, r) => { g.fillStyle = '#6f7d42'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${60 + r() * 60 | 0},${80 + r() * 50 | 0},${30 + r() * 20 | 0},.7)`; g.fillRect(r() * 128, r() * 128, 2, 3); } });
    // cephe: beyaz sıva, kahverengi ahşap kuşak ve dikmeler, pencereler (1 kat = 256 px, 4 pencere)
    const fc = canvasTex(512, 256, (g) => { g.fillStyle = '#f3efe6'; g.fillRect(0, 0, 512, 256); g.fillStyle = '#5b3b24'; g.fillRect(0, 0, 512, 10); g.fillRect(0, 246, 512, 10);
      for (let i = 0; i < 4; i++) { const cx = 64 + i * 128; g.fillStyle = '#5b3b24'; g.fillRect(cx - 34, 44, 68, 150); g.fillStyle = '#e9dfcf'; g.fillRect(cx - 28, 50, 56, 138); g.fillStyle = '#2f3438'; g.fillRect(cx - 24, 54, 22, 62); g.fillRect(cx + 2, 54, 22, 62); g.fillRect(cx - 24, 122, 22, 62); g.fillRect(cx + 2, 122, 22, 62);
        g.strokeStyle = '#5b3b24'; g.lineWidth = 2; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(cx - 24, 58 + k * 15); g.lineTo(cx + 24, 58 + k * 15); g.stroke(); } }
      g.fillStyle = '#5b3b24'; for (let x = 0; x <= 512; x += 128) g.fillRect(x - 4, 0, 8, 256); });
    const wn = canvasTex(128, 128, (g) => { g.fillStyle = '#5b3b24'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#dfe9ee'; g.fillRect(8, 8, 52, 112); g.fillRect(68, 8, 52, 112); g.strokeStyle = '#5b3b24'; g.lineWidth = 3; for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(8, 8 + k * 18); g.lineTo(120, 8 + k * 18); g.stroke(); } });
    const rep = (t: THREE.Texture, a: number, b: number) => { t.repeat.set(a, b); return t; };
    return {
      pave: new THREE.MeshStandardMaterial({ map: rep(pv, 1, 1), roughness: 0.9 }),
      rubble: new THREE.MeshStandardMaterial({ map: rb.map, bumpMap: rb.bump, bumpScale: 0.6, roughness: 0.92 }),
      hanStone: new THREE.MeshStandardMaterial({ map: hs.map, bumpMap: hs.bump, bumpScale: 0.5, roughness: 0.9, side: THREE.DoubleSide }),
      plaster: new THREE.MeshStandardMaterial({ map: pl, roughness: 0.95, side: THREE.DoubleSide }),
      timber: new THREE.MeshStandardMaterial({ color: '#5b3b24', roughness: 0.75 }),
      roof: new THREE.MeshStandardMaterial({ map: tile, roughness: 0.8, side: THREE.DoubleSide }),
      floor: new THREE.MeshStandardMaterial({ map: fl, roughness: 0.7 }),
      ceil: new THREE.MeshStandardMaterial({ map: cl, roughness: 0.75, side: THREE.DoubleSide }),
      cushion: new THREE.MeshStandardMaterial({ map: cu, roughness: 0.9 }),
      grass: new THREE.MeshStandardMaterial({ map: gr, roughness: 1 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a211b', roughness: 1 }),
      facade: new THREE.MeshStandardMaterial({ map: fc, roughness: 0.92 }),
      win: new THREE.MeshStandardMaterial({ map: wn, roughness: 0.4, emissive: '#c9d6dc', emissiveIntensity: 0.25 }),
    };
  }, []);
}
/** Dünya ölçekli UV'li düzlem kutu yüzü (cephe dokusu için): u = genişlik/4 m (4 pencere = 4 m) */
function facadeBox(w: number, h: number, d: number) { const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv as THREE.BufferAttribute, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, (uv.getX(k) * dims[f][0]) / 4, (uv.getY(k) * dims[f][1]) / 2.9); } return g; }

/* ===================== zemin: meydan, sokak, vadi ===================== */
export function Ground({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const sq = new THREE.PlaneGeometry(SQUARE.x1 - SQUARE.x0 + 8, SQUARE.z1 - SQUARE.z0 + 4); sq.rotateX(-Math.PI / 2); const su = sq.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < su.count; i++) su.setXY(i, su.getX(i) * 13, su.getY(i) * 7); sq.translate(0, 0.01, (SQUARE.z0 + SQUARE.z1) / 2);
    // sokak şeridi: orta çizgiyi izleyen, eğimli
    const pos: number[] = [], uv: number[] = [], idx: number[] = [], n = 90, W = STREET.w + 0.6;
    for (let i = 0; i <= n; i++) { const z = SQUARE.z1 - 1 + (i / n) * (STREET.z1 + 1.5 - SQUARE.z1 + 1), x = streetX(z), y = streetY(z) + 0.02; pos.push(x - W / 2, y, z, x + W / 2, y, z); uv.push(0, z / 3.5, W / 3.5, z / 3.5); if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); } }
    const st = new THREE.BufferGeometry(); st.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); st.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); st.setIndex(idx); st.computeVertexNormals();
    const pl = new THREE.PlaneGeometry(PLAZA.x1 - PLAZA.x0 + 2, PLAZA.z1 - PLAZA.z0 + 1); pl.rotateX(-Math.PI / 2); const pu = pl.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < pu.count; i++) pu.setXY(i, pu.getX(i) * 6, pu.getY(i) * 3); pl.translate(0, HY + 0.02, (PLAZA.z0 + PLAZA.z1) / 2);
    // vadi: meydanın ve sokağın iki yanında yükselen yamaçlar (evlerin arkası)
    const vy = new THREE.PlaneGeometry(700, 500, 120, 90); vy.rotateX(-Math.PI / 2); const p = vy.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i) + 30, d = Math.abs(x - (z > STREET.z0 ? streetX(Math.min(z, STREET.z1)) : 0)), base = z > STREET.z0 ? streetY(Math.min(z, 90)) : 0; p.setZ(i, z); p.setY(i, base - 0.3 + Math.max(0, d - 14) * 0.32 + Math.max(0, d - 60) * 0.25 + Math.sin(x * 0.05 + z * 0.03) * 2 * Math.min(1, Math.max(0, d - 14) / 20)); }
    vy.computeVertexNormals();
    return { sq, st, pl, vy };
  }, []);
  return <group>
    <mesh geometry={g.sq} material={m.pave} receiveShadow />
    <mesh geometry={g.st} material={m.pave} receiveShadow />
    <mesh geometry={g.pl} material={m.pave} receiveShadow />
    <group userData={{ noCast: true }}><mesh geometry={g.vy} material={m.grass} receiveShadow /></group>
  </group>;
}
export function Mountains() {
  const list = useMemo(() => [
    { p: [-700, -10, -900] as [number, number, number], g: mountainGeo(800, 300, 7, 1, '#6f7a4e') },
    { p: [900, -10, -500] as [number, number, number], g: mountainGeo(700, 280, 9, 1, '#6f7a4e') },
    { p: [300, -10, 1100] as [number, number, number], g: mountainGeo(900, 320, 11, 1, '#72794f') },
  ], []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}

/* ===================== çıkmalı evler ===================== */
interface House { x: number; z: number; y: number; rot: number; w: number; d: number; floors: number }
/** Sokağın ve meydanın kenarına dizilen evler: ön yüz sokağa bakar */
export const HOUSES: House[] = (() => { const out: House[] = [], r = rng(8);
  for (const side of [-1, 1]) { let z = STREET.z0 + 0.5; while (z < STREET.z1 - 2) { const w = 7 + r() * 3, zc = z + w / 2, x = streetX(zc), dxdz = (streetX(zc + 0.5) - streetX(zc - 0.5)), ang = Math.atan(dxdz), d = 8 + r() * 3;
      const nx = Math.cos(ang), off = STREET.w / 2 + 0.25 + d / 2; out.push({ x: x + side * off * nx, z: zc - side * off * Math.sin(ang), y: streetY(zc), rot: ang + (side < 0 ? Math.PI / 2 : -Math.PI / 2), w: w - 0.4, d, floors: r() < 0.5 ? 2 : 3 }); z += w; } }
  // meydanın doğu ve batısında çarşı evleri
  for (const side of [-1, 1]) for (let z = SQUARE.z0 + 1; z < SQUARE.z1 - 3; z += 8) out.push({ x: side * (SQUARE.x1 + 4.5), z: z + 4, y: 0, rot: side < 0 ? Math.PI / 2 : -Math.PI / 2, w: 7.6, d: 9, floors: 2 });
  // plazanın iki yanı
  for (const side of [-1, 1]) out.push({ x: side * (PLAZA.x1 + 4.5), z: (PLAZA.z0 + PLAZA.z1) / 2, y: HY, rot: side < 0 ? Math.PI / 2 : -Math.PI / 2, w: 8.6, d: 9, floors: 2 });
  return out; })();
/** Ev: yerel koordinatta ön yüz +z (sokak). Taş zemin kat, sıvalı üst kat(lar) sokağa 0.9 m çıkma yapar, eğik payandalar, kırma çatı */
function houseParts(h: House) {
  const G = 3, F = 2.9, up = (h.floors - 1) * F, rubble: THREE.BufferGeometry[] = [], fac: THREE.BufferGeometry[] = [], roof: THREE.BufferGeometry[] = [], tim: THREE.BufferGeometry[] = [];
  rubble.push(at(bx(h.w, G + 1.5, h.d, 3), 0, (G - 1.5) / 2, 0));
  fac.push(at(facadeBox(h.w, up, h.d + 0.9), 0, G + up / 2, 0.45));
  for (const s of [-0.38, 0, 0.38]) { const b = new THREE.BoxGeometry(0.14, 0.14, 1.3); b.rotateX(-0.75); tim.push(at(b, s * h.w, G - 0.35, h.d / 2 + 0.4)); }
  tim.push(at(new THREE.BoxGeometry(h.w + 0.05, 0.16, 0.16), 0, G + 0.02, h.d / 2 + 0.9));
  const rf = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); rf.rotateY(Math.PI / 4); rf.scale(h.w + 1.8, 2.2, h.d + 2.6); roof.push(at(rf, 0, G + up + 1.1, 0.45));
  const tr = new THREE.Matrix4().makeRotationY(h.rot).setPosition(h.x, h.y, h.z); for (const arr of [rubble, fac, roof, tim]) for (const g of arr) g.applyMatrix4(tr);
  return { rubble, fac, roof, tim };
}
export function Houses({ m }: { m: Mats }) {
  const g = useMemo(() => { const R: THREE.BufferGeometry[] = [], F: THREE.BufferGeometry[] = [], RF: THREE.BufferGeometry[] = [], T: THREE.BufferGeometry[] = [];
    for (const h of HOUSES) { const p = houseParts(h); R.push(...p.rubble); F.push(...p.fac); RF.push(...p.roof); T.push(...p.tim); }
    return { r: merge(R), f: merge(F), rf: merge(RF), t: merge(T) }; }, []);
  return <group>
    <mesh geometry={g.r} material={m.rubble} castShadow receiveShadow />
    <mesh geometry={g.f} material={m.facade} castShadow receiveShadow />
    <mesh geometry={g.rf} material={m.roof} castShadow receiveShadow />
    <mesh geometry={g.t} material={m.timber} castShadow />
  </group>;
}

/* ===================== Cinci Hanı ===================== */
/** Kemerli cephe: uzunluk L, yükseklik H, açıklık sayısı n, kemer genişliği aw, ayak yüksekliği spring; kalınlık t (yerel x boyunca, ön yüz +z) */
function arcade(L: number, H: number, n: number, aw: number, spring: number, t: number) {
  const s = new THREE.Shape(); s.moveTo(-L / 2, 0); s.lineTo(L / 2, 0); s.lineTo(L / 2, H); s.lineTo(-L / 2, H); s.closePath();
  const step = L / n; for (let i = 0; i < n; i++) { const cx = -L / 2 + step * (i + 0.5), h = new THREE.Path(); h.moveTo(cx - aw / 2, 0.001); h.lineTo(cx + aw / 2, 0.001); h.lineTo(cx + aw / 2, spring); h.absarc(cx, spring, aw / 2, 0, Math.PI, false); h.lineTo(cx - aw / 2, 0.001); s.holes.push(h); }
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 10 }); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4); g.translate(0, 0, -t / 2); return g;
}
export function Han({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const st: THREE.BufferGeometry[] = [], roof: THREE.BufferGeometry[] = [], dark: THREE.BufferGeometry[] = [], wood: THREE.BufferGeometry[] = [], plaster: THREE.BufferGeometry[] = [];
    const { x0, x1, z0, z1, h1, h2, gate, ring, court } = HAN, W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, T = 1.2;
    // dış duvarlar (güneyde kemerli kapı)
    st.push(at(bx(W, h2, T, 4), cx, h2 / 2, z0 + T / 2), at(bx(T, h2, D, 4), x0 + T / 2, h2 / 2, cz), at(bx(T, h2, D, 4), x1 - T / 2, h2 / 2, cz));
    const sw = new THREE.Shape(); sw.moveTo(x0, 0); sw.lineTo(x1, 0); sw.lineTo(x1, h2); sw.lineTo(x0, h2); sw.closePath(); const gh = new THREE.Path(); gh.moveTo(-gate, 0.001); gh.lineTo(gate, 0.001); gh.lineTo(gate, 3.2); gh.absarc(0, 3.2, gate, 0, Math.PI, false); gh.lineTo(-gate, 0.001); sw.holes.push(gh);
    const swg = new THREE.ExtrudeGeometry(sw, { depth: T, bevelEnabled: false, curveSegments: 12 }); const su = swg.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < su.count; i++) su.setXY(i, su.getX(i) / 4, su.getY(i) / 4); swg.translate(0, 0, z1 - T); st.push(swg);
    // kapı geçidi: yan duvarlar ve tonoz
    const pz0 = ring.z1, pz1 = z1 - T, pl = pz1 - pz0; for (const s of [-1, 1]) st.push(at(bx(0.6, 3.2, pl, 3), s * (gate + 0.3), 1.6, (pz0 + pz1) / 2));
    { const v = new THREE.CylinderGeometry(gate, gate, pl, 16, 1, true, -Math.PI / 2, Math.PI); v.rotateX(Math.PI / 2); st.push(at(v, 0, 3.2, (pz0 + pz1) / 2)); }
    // avlu cepheleri: zeminde kemerli revak, üstte kemerli galeri
    const sides = [{ L: court.x1 - court.x0, x: 0, z: court.z0, rot: 0 }, { L: court.x1 - court.x0, x: 0, z: court.z1, rot: Math.PI }, { L: court.z1 - court.z0, x: court.x0, z: (court.z0 + court.z1) / 2, rot: Math.PI / 2 }, { L: court.z1 - court.z0, x: court.x1, z: (court.z0 + court.z1) / 2, rot: -Math.PI / 2 }];
    for (const s of sides) { const n = Math.round(s.L / 3.4); const a1 = arcade(s.L + 0.6, h1, n, 2.3, 2.6, 0.7), a2 = arcade(s.L + 0.6, h2 - h1, n, 2.1, 2.5, 0.6); a2.translate(0, h1, 0);
      for (const a of [a1, a2]) { a.rotateY(s.rot); a.translate(s.x, 0, s.z); st.push(a); } }
    // revak tavanı (üst kat döşemesi), arkada oda cepheleri ve kapıları
    const ringRect = (y: number) => { const parts: THREE.BufferGeometry[] = []; const add = (x0r: number, x1r: number, z0r: number, z1r: number) => { const p = new THREE.PlaneGeometry(x1r - x0r, z1r - z0r); p.rotateX(Math.PI / 2); p.translate((x0r + x1r) / 2, y, (z0r + z1r) / 2); parts.push(p); };
      add(ring.x0, ring.x1, ring.z0, court.z0); add(ring.x0, ring.x1, court.z1, ring.z1); add(ring.x0, court.x0, court.z0, court.z1); add(court.x1, ring.x1, court.z0, court.z1); return parts; };
    plaster.push(...ringRect(h1 - 0.02), ...ringRect(h2 - 0.3));
    const back = [{ L: ring.x1 - ring.x0, x: 0, z: ring.z0, rot: 0 }, { L: ring.x1 - ring.x0, x: 0, z: ring.z1, rot: Math.PI }, { L: ring.z1 - ring.z0, x: ring.x0, z: (ring.z0 + ring.z1) / 2, rot: Math.PI / 2 }, { L: ring.z1 - ring.z0, x: ring.x1, z: (ring.z0 + ring.z1) / 2, rot: -Math.PI / 2 }];
    for (const b of back) { const w = bx(b.L, h2, 0.5, 4); w.rotateY(b.rot); w.translate(b.x - Math.sin(b.rot) * 0.25 * (b.rot === 0 || b.rot === Math.PI ? 0 : 1), h2 / 2, b.z - Math.cos(b.rot) * 0.25); st.push(w);
      const n = Math.round(b.L / 3.4); for (let i = 0; i < n; i++) for (const yy of [0, h1]) { const t = -b.L / 2 + (b.L / n) * (i + 0.5); if (b.rot === Math.PI && Math.abs(t) < 2.5 && yy === 0) continue; const d = new THREE.PlaneGeometry(1.1, yy ? 1.9 : 2.2); d.translate(t, yy + (yy ? 1.4 : 1.1), 0.03); d.rotateY(b.rot); d.translate(b.x, 0, b.z); (yy ? wood : dark).push(d); } }
    // avlu zemini ve revak zemini
    const fl = new THREE.PlaneGeometry(ring.x1 - ring.x0, ring.z1 - ring.z0); fl.rotateX(-Math.PI / 2); const fu = fl.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < fu.count; i++) fu.setXY(i, fu.getX(i) * 7, fu.getY(i) * 7); fl.translate(0, 0.02, (ring.z0 + ring.z1) / 2);
    // çatı: dış ile halka arasını örten kırma çatı (dört eğimli şerit) ve bacalar
    const roofRing = () => { const out: THREE.BufferGeometry[] = []; const rp = (pts: number[][]) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); const uvs = pts.map((p) => [p[0] / 4 + p[2] / 4, p[1] / 3]).flat(); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.computeVertexNormals(); out.push(geo); };
      const o = { x0: x0 - 0.8, x1: x1 + 0.8, z0: z0 - 0.8, z1: z1 + 0.8 }, i = { x0: court.x0 + 0.3, x1: court.x1 - 0.3, z0: court.z0 + 0.3, z1: court.z1 - 0.3 }, yo = h2 + 0.1, yi = h2 + 0.1, ridge = h2 + 3.2;
      const mo = { x0: (o.x0 + i.x0) / 2, x1: (o.x1 + i.x1) / 2, z0: (o.z0 + i.z0) / 2, z1: (o.z1 + i.z1) / 2 };
      const quad = (a: number[], b: number[], c: number[], d: number[]) => rp([a, b, c, a, c, d]);
      // dış etek -> mahya
      quad([o.x0, yo, o.z1], [o.x1, yo, o.z1], [mo.x1, ridge, mo.z1], [mo.x0, ridge, mo.z1]); quad([o.x1, yo, o.z0], [o.x0, yo, o.z0], [mo.x0, ridge, mo.z0], [mo.x1, ridge, mo.z0]);
      quad([o.x0, yo, o.z0], [o.x0, yo, o.z1], [mo.x0, ridge, mo.z1], [mo.x0, ridge, mo.z0]); quad([o.x1, yo, o.z1], [o.x1, yo, o.z0], [mo.x1, ridge, mo.z0], [mo.x1, ridge, mo.z1]);
      // iç etek (avluya) -> mahya
      quad([mo.x0, ridge, mo.z1], [mo.x1, ridge, mo.z1], [i.x1, yi, i.z1], [i.x0, yi, i.z1]); quad([mo.x1, ridge, mo.z0], [mo.x0, ridge, mo.z0], [i.x0, yi, i.z0], [i.x1, yi, i.z0]);
      quad([mo.x0, ridge, mo.z0], [mo.x0, ridge, mo.z1], [i.x0, yi, i.z1], [i.x0, yi, i.z0]); quad([mo.x1, ridge, mo.z1], [mo.x1, ridge, mo.z0], [i.x1, yi, i.z0], [i.x1, yi, i.z1]);
      return out; };
    roof.push(...roofRing());
    const r = rng(4); for (let k = 0; k < 26; k++) { const t = r(), side = k % 4, L = side < 2 ? x1 - x0 - 4 : z1 - z0 - 4, s = -L / 2 + t * L, px = side < 2 ? s : (side === 2 ? x0 + 2.4 : x1 - 2.4), pz = side < 2 ? (side === 0 ? z0 + 2.4 : z1 - 2.4) : cz + s; st.push(at(bx(0.9, 2.4, 0.9, 2), px, h2 + 2.6, pz)); }
    return { st: merge(st), roof: merge(roof), dark: merge(dark), wood: merge(wood), plaster: merge(plaster), fl };
  }, []);
  return <group>
    <mesh geometry={g.st} material={m.hanStone} castShadow receiveShadow />
    <mesh geometry={g.roof} material={m.roof} castShadow receiveShadow />
    <mesh geometry={g.plaster} material={m.ceil} receiveShadow />
    <mesh geometry={g.dark} material={m.dark} />
    <mesh geometry={g.wood} material={m.timber} />
    <mesh geometry={g.fl} material={m.pave} receiveShadow />
  </group>;
}

/* ===================== Kaymakamlar Evi ===================== */
export function Konak({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const { x0, x1, z0, z1 } = KH, W = x1 - x0, D = z1 - z0, cx = 0, cz = (z0 + z1) / 2, T = 0.5, G = UP - HY, F = 3.0, top = UP + F;
    const rub: THREE.BufferGeometry[] = [], pl: THREE.BufferGeometry[] = [], tim: THREE.BufferGeometry[] = [], fl: THREE.BufferGeometry[] = [], ce: THREE.BufferGeometry[] = [], win: THREE.BufferGeometry[] = [], cush: THREE.BufferGeometry[] = [], dark: THREE.BufferGeometry[] = [];
    // zemin kat: moloz taş duvarlar, ön yüzde kapı
    rub.push(at(bx(W, G + 1, T, 3), cx, HY + G / 2 - 0.5, z1 - T / 2), at(bx(T, G + 1, D, 3), x0 + T / 2, HY + G / 2 - 0.5, cz), at(bx(T, G + 1, D, 3), x1 - T / 2, HY + G / 2 - 0.5, cz));
    const fw = (W / 2 - KH.door); for (const s of [-1, 1]) rub.push(at(bx(fw, G + 1, T, 3), s * (KH.door + fw / 2), HY + G / 2 - 0.5, z0 + T / 2));
    rub.push(at(bx(KH.door * 2, G - 2.4, T, 3), 0, HY + 2.4 + (G - 2.4) / 2, z0 + T / 2));
    tim.push(at(new THREE.BoxGeometry(KH.door * 2 + 0.3, 0.2, T + 0.1), 0, HY + 2.45, z0 + T / 2));
    // taşlık zemini
    { const p = new THREE.PlaneGeometry(W, D); p.rotateX(-Math.PI / 2); p.translate(cx, HY + 0.02, cz); rub.push(p); }
    // merdiven: basamaklar ve yan korkuluk
    const S = KH.stair, n = 12; for (let i = 0; i < n; i++) { const z = S.z1 - (i + 0.5) * ((S.z1 - S.z0) / n), y = HY + (UP - HY) * ((i + 1) / n); tim.push(at(bx(S.x1 - S.x0, 0.12, (S.z1 - S.z0) / n + 0.02, 1), (S.x0 + S.x1) / 2, y - 0.06, z), at(bx(S.x1 - S.x0, y - HY - 0.12, 0.05, 1), (S.x0 + S.x1) / 2, HY + (y - HY - 0.12) / 2, z + (S.z1 - S.z0) / n / 2)); }
    for (let i = 0; i <= 6; i++) { const z = S.z0 + (i / 6) * (S.z1 - S.z0), y = HY + (UP - HY) * ((S.z1 - z) / (S.z1 - S.z0)); tim.push(at(new THREE.BoxGeometry(0.06, 0.95, 0.06), S.x0 + 0.05, y + 0.47, z)); }
    { const a = new THREE.Vector3(S.x0 + 0.05, HY + 0.95, S.z1), b = new THREE.Vector3(S.x0 + 0.05, UP + 0.95, S.z0), L = a.distanceTo(b), bar = new THREE.BoxGeometry(0.07, 0.07, L); bar.rotateX(-Math.atan2(b.y - a.y, a.z - b.z)); tim.push(at(bar, a.x, (a.y + b.y) / 2, (a.z + b.z) / 2)); }
    // üst kat döşemesi (merdiven boşluğu hariç) ve alt yüzü (taşlık tavanı)
    const slab = (y: number, down: boolean, mat: THREE.BufferGeometry[]) => { const rects = [[x0, S.x0, SOFA.z0 - 0.9, z1], [S.x0, x1, SOFA.z0 - 0.9, S.z0 - 1.2], [S.x0, x1, S.z1 + 0.4, z1]]; for (const [a, b, c, d] of rects) { const p = new THREE.PlaneGeometry(b - a, d - c); p.rotateX(down ? Math.PI / 2 : -Math.PI / 2); const u = p.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * (b - a) / 3, u.getY(i) * (d - c) / 3); p.translate((a + b) / 2, y, (c + d) / 2); mat.push(p); } };
    slab(UP + 0.01, false, fl); slab(UP - 0.15, true, ce);
    // üst kat dış duvarları: sıvalı, öne (kuzey) 0.9 m çıkma
    const UZ0 = SOFA.z0 - 0.9;
    pl.push(at(bx(T, F, z1 - UZ0, 3), x0 - T / 2 + 0.25, UP + F / 2, (UZ0 + z1) / 2), at(bx(T, F, z1 - UZ0, 3), x1 + T / 2 - 0.25, UP + F / 2, (UZ0 + z1) / 2), at(bx(W, F, T, 3), cx, UP + F / 2, z1 - T / 2));
    // ön (kuzey) duvar: pencere sırası (alt ve üst pencereler arası sıva bantları)
    pl.push(at(bx(W, 0.9, T, 3), cx, UP + 0.45, UZ0 + T / 2), at(bx(W, 0.5, T, 3), cx, top - 0.25, UZ0 + T / 2));
    for (let i = 0; i <= 7; i++) pl.push(at(bx(0.36, F - 1.4, T, 3), x0 + 0.18 + i * (W - 0.36) / 7, UP + 0.9 + (F - 1.4) / 2, UZ0 + T / 2));
    for (let i = 0; i < 7; i++) { const xx = x0 + 0.36 + (i + 0.5) * (W - 0.72) / 7, ww = (W - 0.36) / 7 - 0.36; for (const zf of [UZ0 + 0.02, UZ0 + T - 0.02]) win.push(at(new THREE.PlaneGeometry(ww, F - 1.4), xx, UP + 0.9 + (F - 1.4) / 2, zf)); }
    // güney duvarlarında ve yanlarda pencereler (iç ve dış yüzde)
    const winOn = (x: number, z: number, rotY: number) => { for (const o of [-0.27, 0.27]) { const p = new THREE.PlaneGeometry(1.1, 1.5); p.rotateY(rotY); p.translate(x + Math.sin(rotY) * o, UP + 1.6, z + Math.cos(rotY) * o); win.push(p); } };
    for (const x of [-5.4, -2.2, 1.8, 3.8]) winOn(x, z1 - T / 2, 0); for (const z of [88, 91.5]) winOn(x0 + 0.25, z, Math.PI / 2);
    // iç bölmeler: sofa ile odalar arası (iki kapı), harem ile selamlık arası (dönme dolap boşluğu), selamlık ile merdiven arası
    const wallX = (xa: number, xb: number, z: number, gaps: [number, number][]) => { let a = xa; const gs = [...gaps].sort((p, q) => p[0] - q[0]); for (const [g0, g1] of [...gs, [xb, xb] as [number, number]]) { if (g0 > a) pl.push(at(bx(g0 - a, F, 0.18, 3), (a + g0) / 2, UP + F / 2, z)); if (g1 > g0) pl.push(at(bx(g1 - g0, F - 2.2, 0.18, 3), (g0 + g1) / 2, UP + 2.2 + (F - 2.2) / 2, z)); a = g1; } };
    wallX(x0 + 0.25, S.x0, SOFA.z1, [[DOOR_HAREM[0] - 0.55, DOOR_HAREM[0] + 0.55], [DOOR_SELAMLIK[0] - 0.55, DOOR_SELAMLIK[0] + 0.55]]);
    const dz0 = DOLAP[1] - 0.55, dz1 = DOLAP[1] + 0.55, dy0 = UP + 0.6, dy1 = UP + 1.75;
    pl.push(at(bx(0.18, F, dz0 - SOFA.z1, 3), 0, UP + F / 2, (SOFA.z1 + dz0) / 2), at(bx(0.18, F, z1 - dz1, 3), 0, UP + F / 2, (dz1 + z1) / 2), at(bx(0.18, dy0 - UP, dz1 - dz0, 3), 0, (UP + dy0) / 2, DOLAP[1]), at(bx(0.18, top - dy1, dz1 - dz0, 3), 0, (dy1 + top) / 2, DOLAP[1]));
    pl.push(at(bx(0.18, F, z1 - SOFA.z1, 3), S.x0 - 0.09, UP + F / 2, (SOFA.z1 + z1) / 2));
    for (const [a, b] of [[DOOR_HAREM[0] - 0.55, DOOR_HAREM[0] + 0.55], [DOOR_SELAMLIK[0] - 0.55, DOOR_SELAMLIK[0] + 0.55]]) { tim.push(at(new THREE.BoxGeometry(0.1, 2.2, 0.24), a, UP + 1.1, SOFA.z1), at(new THREE.BoxGeometry(0.1, 2.2, 0.24), b, UP + 1.1, SOFA.z1), at(new THREE.BoxGeometry(b - a + 0.1, 0.12, 0.24), (a + b) / 2, UP + 2.2, SOFA.z1)); }
    // merdiven boşluğu korkuluğu (sofa tarafı)
    for (let x = S.x0; x <= S.x1; x += 0.4) tim.push(at(new THREE.BoxGeometry(0.05, 0.9, 0.05), x, UP + 0.45, S.z0 - 1.2)); tim.push(at(new THREE.BoxGeometry(S.x1 - S.x0, 0.07, 0.08), (S.x0 + S.x1) / 2, UP + 0.92, S.z0 - 1.2));
    // tavanlar: ahşap; selamlıkta göbek (iç içe sekizgenler), haremde sade göbek
    { const p = new THREE.PlaneGeometry(W, z1 - UZ0); p.rotateX(Math.PI / 2); const u = p.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * W / 3, u.getY(i) * (z1 - UZ0) / 3); p.translate(cx, top - 0.02, (UZ0 + z1) / 2); ce.push(p); }
    const gobek = (x: number, z: number, rings: number) => { for (let k = 0; k < rings; k++) { const r0 = 0.9 - k * 0.22, c = new THREE.CylinderGeometry(r0, r0, 0.06 + k * 0.04, 8); tim.push(at(c, x, top - 0.06 - k * 0.04, z)); } };
    gobek((ROOMS.selamlik.x0 + ROOMS.selamlik.x1) / 2, (ROOMS.selamlik.z0 + ROOMS.selamlik.z1) / 2, 4); gobek((ROOMS.harem.x0 + ROOMS.harem.x1) / 2, (ROOMS.harem.z0 + ROOMS.harem.z1) / 2, 2);
    // sedirler: sofanın önünde, haremde güney ve batı, selamlıkta güney duvar boyunca
    const sedir = (x: number, z: number, w: number, d: number) => { cush.push(at(bx(w, 0.42, d, 1), x, UP + 0.21, z)); };
    sedir(-2, SOFA.z0 - 0.4, 9, 0.8); sedir(-3.4, z1 - 0.85, 6.2, 0.8); sedir(x0 + 0.65, 88.2, 0.8, 4.2); sedir(2.4, z1 - 0.85, 4.2, 0.8);
    // yüklük (gusülhane kapılı dolap duvarı) ve ocak (haremin batı duvarı)
    tim.push(at(bx(0.5, F - 0.4, 3.4, 1), x0 + 0.55, UP + (F - 0.4) / 2, 93.1));
    for (const zz of [91.9, 93.1, 94.3]) { dark.push(at(new THREE.BoxGeometry(0.02, 2.2, 0.95), x0 + 0.81, UP + 1.25, zz)); }
    pl.push(at(bx(0.45, 1.3, 1.4, 1), x0 + 0.5, UP + 0.65, 86.2)); dark.push(at(new THREE.BoxGeometry(0.05, 0.8, 0.8), x0 + 0.74, UP + 0.5, 86.2));
    { const hood = new THREE.ConeGeometry(0.8, 1.4, 4, 1, true); hood.rotateY(Math.PI / 4); hood.scale(0.6, 1, 1); pl.push(at(hood, x0 + 0.6, UP + 2.0, 86.2)); }
    // çatı ve saçak
    const rf = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); rf.rotateY(Math.PI / 4); rf.scale(W + 2.4, 3, (z1 - UZ0) + 2.4); rf.translate(cx, top + 1.5, (UZ0 + z1) / 2);
    // dış cephe ahşap kuşakları
    tim.push(at(new THREE.BoxGeometry(W + 0.2, 0.18, 0.2), cx, UP, UZ0 - 0.02), at(new THREE.BoxGeometry(W + 0.2, 0.18, 0.2), cx, top, UZ0 - 0.02));
    for (const s of [-0.4, -0.13, 0.13, 0.4]) { const b = new THREE.BoxGeometry(0.16, 0.16, 1.4); b.rotateX(-0.8); tim.push(at(b, s * W, UP - 0.45, z0 - 0.3)); }
    return { rub: merge(rub), pl: merge(pl), tim: merge(tim), fl: merge(fl), ce: merge(ce), win: merge(win), cush: merge(cush), dark: merge(dark), roof: rf };
  }, []);
  return <group>
    <mesh geometry={g.rub} material={m.rubble} castShadow receiveShadow />
    <mesh geometry={g.pl} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={g.tim} material={m.timber} castShadow receiveShadow />
    <mesh geometry={g.fl} material={m.floor} receiveShadow />
    <mesh geometry={g.ce} material={m.ceil} receiveShadow />
    <mesh geometry={g.win} material={m.win} />
    <mesh geometry={g.cush} material={m.cushion} castShadow receiveShadow />
    <mesh geometry={g.dark} material={m.dark} />
    <mesh geometry={g.roof} material={m.roof} castShadow receiveShadow />
  </group>;
}

/* ===================== dönme dolap ===================== */
const ITEM_COL: Record<ItemId, string> = { kahve: '#3a2618', su: '#a9d3e8', lokum: '#f0c6d4', serbet: '#c8452f' };
/** Duvardaki boşlukta dönen silindir: ortada bölme, üç raf; harem tarafındaki (−x) yarıda raflardaki ikramlar görünür. angle: hedef dönüş */
export function Dolap({ m, angle, shelves }: { m: Mats; angle: number; shelves: (ItemId | null)[] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => { const g = ref.current; if (!g) return; g.rotation.y += (angle - g.rotation.y) * Math.min(1, dt * 2.2); });
  const body = useMemo(() => { const parts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.5, 0.5, 1.15, 24, 1, true, Math.PI / 2, Math.PI), new THREE.BoxGeometry(0.03, 1.15, 1.0)];
    for (let k = 0; k < 4; k++) { const d = new THREE.CylinderGeometry(0.5, 0.5, 0.03, 24, 1, false, Math.PI / 2, Math.PI); parts.push(at(d, 0, -0.575 + k * (1.15 / 3), 0)); } return merge(parts); }, []);
  return <group position={[DOLAP[0], UP + 0.6 + 0.575, DOLAP[1]]}>
    <group ref={ref}>
      <mesh geometry={body} material={m.timber} castShadow receiveShadow />
      {shelves.map((it, k) => it && <mesh key={k} position={[-0.22, -0.575 + k * (1.15 / 3) + 0.12, 0]} castShadow>
        {it === 'lokum' ? <boxGeometry args={[0.16, 0.08, 0.16]} /> : <cylinderGeometry args={[0.06, 0.05, it === 'su' || it === 'serbet' ? 0.18 : 0.1, 12]} />}
        <meshStandardMaterial color={ITEM_COL[it]} roughness={0.4} />
      </mesh>)}
    </group>
  </group>;
}
/** Selamlıkta sedirde oturan iki misafir ve sokakta birkaç kişi (sade biçim) */
export function People() {
  const g = useMemo(() => { const out: THREE.BufferGeometry[] = []; const fig = (x: number, y: number, z: number, yaw: number, sit: boolean, col: string) => {
      const c = new THREE.Color(col), parts = sit ? [at(new THREE.CapsuleGeometry(0.2, 0.42, 3, 8), 0, 0.92, 0.04), at(new THREE.SphereGeometry(0.12, 10, 8), 0, 1.42, 0.02), at(bx(0.36, 0.14, 0.45, 2), 0, 0.55, -0.2), at(bx(0.32, 0.45, 0.14, 2), 0, 0.25, -0.4)] : [at(new THREE.CapsuleGeometry(0.2, 0.55, 3, 8), 0, 1.1, 0), at(new THREE.SphereGeometry(0.12, 10, 8), 0, 1.7, 0), at(bx(0.34, 0.8, 0.2, 2), 0, 0.4, 0)];
      parts.forEach((pg, k) => { const ng = pg.index ? pg.toNonIndexed() : pg; ng.rotateY(yaw); ng.translate(x, y, z); const n = ng.attributes.position.count, cc = new Float32Array(n * 3), cl = k === 1 ? new THREE.Color('#c9a48a') : c; for (let i = 0; i < n; i++) cc.set([cl.r, cl.g, cl.b], i * 3); ng.setAttribute('color', new THREE.BufferAttribute(cc, 3)); ng.deleteAttribute('uv'); out.push(ng); }); };
    fig(1.6, UP, KH.z1 - 0.9, Math.PI, true, '#3f4a55'); fig(3.2, UP, KH.z1 - 0.9, Math.PI, true, '#6b5a3c');
    fig(-6, 0, 2, 0.6, false, '#7a6a8a'); fig(9, 0, -5, 2.4, false, '#5a6b7d'); fig(streetX(40) + 1.2, streetY(40), 40, 3.4, false, '#8a5a4a'); fig(-3, 0, -30, 1.2, false, '#6f7d5a');
    return mergeGeometries(out)!; }, []);
  return <mesh geometry={g} castShadow><meshStandardMaterial vertexColors roughness={0.85} /></mesh>;
}
