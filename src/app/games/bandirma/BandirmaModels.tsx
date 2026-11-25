/**
 * Bandırma — 3B modeller: park (çim, yollar, ağaçlar), beton kızaklar üstünde buharlı gemi kopyası (kesitten örülmüş gövde, küpeşte,
 * tahta güverte), ortada salon ve üstünde kaptan köşkü, baca, iki direk ve halatlar, kıçta bayrak, iskele merdiveni, salonda harita masası.
 * Gemi boyu ve eni kaynaktan; renkler, üst yapı ve güverte düzeni TEMSİLÎDİR.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex } from '../shared/scenery';
import { BULWARK, GANG, PARK, SALON, SHIP, TABLE, halfBeam } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => { const n = g.index ? g.toNonIndexed() : g; if (!n.attributes.normal) n.computeVertexNormals(); if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; }))!;
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); return g; };
const DY = SHIP.deckY, HALF = SHIP.L / 2, KEEL = 1.0;

export interface Mats { hull: THREE.MeshStandardMaterial; deck: THREE.MeshStandardMaterial; white: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; funnel: THREE.MeshStandardMaterial; concrete: THREE.MeshStandardMaterial; grass: THREE.MeshStandardMaterial; pave: THREE.MeshStandardMaterial; win: THREE.MeshStandardMaterial; rope: THREE.MeshStandardMaterial; panel: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    // gövde: siyah üst, altta kırmızı (v ekseni gövde yüksekliği boyunca), perçin sıraları
    const hl = canvasTex(64, 256, (g, r) => { g.fillStyle = '#1d1f22'; g.fillRect(0, 0, 64, 256); g.fillStyle = '#8e2b22'; g.fillRect(0, 170, 64, 86); g.fillStyle = '#d9d4c6'; g.fillRect(0, 164, 64, 4); g.fillStyle = 'rgba(255,255,255,.08)'; for (let y = 10; y < 160; y += 22) for (let x = 2; x < 64; x += 8) g.fillRect(x, y, 2, 2); for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.15})`; g.fillRect(r() * 64, r() * 256, 2, 4); } });
    const dk = canvasTex(256, 256, (g, r) => { for (let y = 0; y < 256; y += 16) { const v = r(); g.fillStyle = `rgb(${165 + v * 25 | 0},${132 + v * 20 | 0},${92 + v * 15 | 0})`; g.fillRect(0, y, 256, 15); g.fillStyle = '#3a2a1c'; g.fillRect(0, y + 15, 256, 1); for (let x = (y / 16) % 2 ? 40 : 0; x < 256; x += 80) g.fillRect(x, y, 1, 15); } }); dk.repeat.set(8, 1);
    const wn = canvasTex(256, 64, (g) => { g.fillStyle = '#f1eee6'; g.fillRect(0, 0, 256, 64); for (let i = 0; i < 4; i++) { const cx = 32 + i * 64; g.fillStyle = '#6b6a66'; g.beginPath(); g.arc(cx, 28, 13, 0, 7); g.fill(); g.fillStyle = '#25313a'; g.beginPath(); g.arc(cx, 28, 10, 0, 7); g.fill(); } });
    const pn = canvasTex(256, 128, (g, r) => { g.fillStyle = '#6a4329'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#4a2d1a'; g.lineWidth = 4; for (let x = 0; x < 256; x += 64) g.strokeRect(x + 6, 10, 52, 108); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(30,15,5,${r() * 0.2})`; g.fillRect(r() * 256, r() * 128, 1, 6); } });
    const pv = canvasTex(256, 256, (g, r) => { g.fillStyle = '#9c968b'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) for (let x = (y / 32) % 2 ? -20 : 0; x < 256; x += 40) { const v = 150 + r() * 40 | 0; g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(x + 2, y + 2, 36, 28); } });
    const gt = groundTex(); gt.map.repeat.set(60, 60);
    return {
      hull: new THREE.MeshStandardMaterial({ map: hl, roughness: 0.55, metalness: 0.2, side: THREE.DoubleSide }),
      deck: new THREE.MeshStandardMaterial({ map: dk, roughness: 0.85 }),
      white: new THREE.MeshStandardMaterial({ color: '#f1eee6', roughness: 0.6 }),
      wood: new THREE.MeshStandardMaterial({ color: '#7a5434', roughness: 0.7 }),
      dark: new THREE.MeshStandardMaterial({ color: '#1f2226', roughness: 0.6 }),
      funnel: new THREE.MeshStandardMaterial({ color: '#c9a45a', roughness: 0.5 }),
      concrete: new THREE.MeshStandardMaterial({ color: '#a9a69d', roughness: 0.95 }),
      grass: new THREE.MeshStandardMaterial({ color: '#7f9a52', map: gt.map, roughness: 1 }),
      pave: new THREE.MeshStandardMaterial({ map: pv, roughness: 0.9 }),
      win: new THREE.MeshStandardMaterial({ map: wn, roughness: 0.6 }),
      rope: new THREE.MeshStandardMaterial({ color: '#3b342c', roughness: 0.9 }),
      panel: new THREE.MeshStandardMaterial({ map: pn, roughness: 0.75, side: THREE.DoubleSide }),
    };
  }, []);
}

/* ===================== park ===================== */
export function Park({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const ground = new THREE.PlaneGeometry(600, 600); ground.rotateX(-Math.PI / 2);
    const path = merge([at(new THREE.PlaneGeometry(PARK.x1 - PARK.x0, 6).rotateX(-Math.PI / 2), 0, 0.02, GANG.z1 + 3), at(new THREE.PlaneGeometry(8, 30).rotateX(-Math.PI / 2), GANG.x, 0.02, GANG.z1 + 15)]);
    { const u = path.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * 12, u.getY(i) * 2); }
    const r = rng(11), trunks: THREE.BufferGeometry[] = [], crowns: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 30; i++) { const x = PARK.x0 + r() * (PARK.x1 - PARK.x0), z = r() < 0.5 ? -14 - r() * 6 : 24 + r() * 14; if (Math.abs(x - GANG.x) < 7 && z > 0) continue; const s = 0.8 + r() * 0.5;
      trunks.push(at(new THREE.CylinderGeometry(0.15 * s, 0.22 * s, 3.4 * s, 7), x, 1.7 * s, z)); for (let k = 0; k < 4; k++) crowns.push(at(new THREE.IcosahedronGeometry((1.3 + r() * 0.6) * s, 2), x + (r() - 0.5) * 2 * s, (4 + r() * 1.4) * s, z + (r() - 0.5) * 2 * s)); }
    // kızaklar
    const cradle = merge([-16, -8, 0, 8, 16].map((x) => at(bx(2, KEEL + 0.4, halfBeam(x) * 1.2 + 1, 2), x, (KEEL + 0.4) / 2 - 0.2, 0)));
    return { ground, path, trunks: merge(trunks), crowns: merge(crowns), cradle };
  }, []);
  return <group>
    <group userData={{ noCast: true }}><mesh geometry={g.ground} material={m.grass} receiveShadow /></group>
    <mesh geometry={g.path} material={m.pave} receiveShadow />
    <mesh geometry={g.trunks} material={m.wood} castShadow />
    <mesh geometry={g.crowns} castShadow><meshStandardMaterial color="#5d7a3a" roughness={0.95} /></mesh>
    <mesh geometry={g.cradle} material={m.concrete} castShadow receiveShadow />
  </group>;
}

/* ===================== gemi ===================== */
/** Gövde: x boyunca kesitlerden örülür (küpeşte üstünden omurgaya, oradan öbür küpeşteye) */
function hullGeo() {
  const NX = 80, NS = 16, pos: number[] = [], uv: number[] = [], idx: number[] = [], top = DY + 0.9;
  for (let i = 0; i <= NX; i++) { const t = i / NX, x = -HALF + t * SHIP.L, hb = Math.max(0.05, halfBeam(Math.min(HALF - 0.01, Math.max(-HALF + 0.01, x)))), sheer = 0.5 * ((2 * t - 1) ** 2), bot = KEEL + Math.max(0, (Math.abs(2 * t - 1) - 0.7) / 0.3) * 1.6;
    for (let j = 0; j <= NS; j++) { const s = j / NS, a = Math.PI * s, side = Math.cos(a), dn = Math.sin(a), z = hb * side * (1 - 0.35 * dn ** 4), y = top + sheer - (top + sheer - bot) * dn ** 0.6; pos.push(x, y, z); uv.push(t * 12, 1 - Math.abs(dn) ** 0.6 * 0.98 - 0.01); } }
  for (let i = 0; i < NX; i++) for (let j = 0; j < NS; j++) { const a = i * (NS + 1) + j, b = a + 1, c = a + NS + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function deckGeo() {
  const s = new THREE.Shape(), N = 60; for (let i = 0; i <= N; i++) { const x = -HALF + (i / N) * SHIP.L; const hb = Math.max(0.02, halfBeam(Math.min(HALF - 0.01, Math.max(-HALF + 0.01, x)))); if (i === 0) s.moveTo(x, -hb); else s.lineTo(x, -hb); }
  for (let i = N; i >= 0; i--) { const x = -HALF + (i / N) * SHIP.L; s.lineTo(x, Math.max(0.02, halfBeam(Math.min(HALF - 0.01, Math.max(-HALF + 0.01, x))))); }
  const g = new THREE.ShapeGeometry(s, 4); g.rotateX(-Math.PI / 2); const u = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) / 6, u.getY(i) / 2); g.translate(0, DY, 0); return g;
}
export function Ship({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const white: THREE.BufferGeometry[] = [], dark: THREE.BufferGeometry[] = [], wood: THREE.BufferGeometry[] = [], rope: THREE.BufferGeometry[] = [], win: THREE.BufferGeometry[] = [], panel: THREE.BufferGeometry[] = [];
    const { x0, x1, hw, door, h } = SALON, T = 0.15, L = x1 - x0, cx = (x0 + x1) / 2;
    // salon: dış duvarlar (kıç yüzünde kapı), lombozlu yanlar, çatı
    for (const s of [-1, 1]) { white.push(at(bx(L, h, T, 2), cx, DY + h / 2, s * (hw - T / 2))); const w = new THREE.PlaneGeometry(L - 1, 0.7); if (s < 0) w.rotateY(Math.PI); win.push(at(w, cx, DY + 1.5, s * (hw + 0.005))); }
    white.push(at(bx(T, h, hw * 2, 2), x1 - T / 2, DY + h / 2, 0));
    for (const s of [-1, 1]) white.push(at(bx(T, h, hw - door, 2), x0 + T / 2, DY + h / 2, s * (door + (hw - door) / 2)));
    white.push(at(bx(T, h - 2.1, door * 2, 2), x0 + T / 2, DY + 2.1 + (h - 2.1) / 2, 0));
    white.push(at(bx(L + 0.4, 0.15, hw * 2 + 0.4, 2), cx, DY + h + 0.07, 0));
    // iç: ahşap kaplama, harita masası ve sıralar
    for (const s of [-1, 1]) panel.push(at(new THREE.PlaneGeometry(L - 0.4, h - 0.2).rotateY(s < 0 ? 0 : Math.PI), cx, DY + h / 2, s * (hw - T - 0.01)));
    wood.push(at(bx(TABLE.w, 0.08, TABLE.d, 1), TABLE.x, DY + 0.9, TABLE.z), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => at(new THREE.BoxGeometry(0.07, 0.86, 0.07), TABLE.x + sx * (TABLE.w / 2 - 0.1), DY + 0.43, TABLE.z + sz * (TABLE.d / 2 - 0.1)))));
    for (const s of [-1, 1]) wood.push(at(bx(L - 3, 0.45, 0.5, 1), cx + 1, DY + 0.22, s * (hw - 0.45)));
    // kaptan köşkü: salonun ön üstünde camlı kabin, dümen
    const bx0 = x1 - 3.4, bh = 2.1, by = DY + h + 0.15;
    white.push(at(bx(3.4, 0.9, hw * 2 + 0.6, 2), bx0 + 1.7, by + 0.45, 0), at(bx(3.6, 0.12, hw * 2 + 0.9, 2), bx0 + 1.7, by + bh + 0.06, 0));
    for (const zz of [-1, 1]) for (const xx of [bx0 + 0.1, bx0 + 3.3]) white.push(at(new THREE.BoxGeometry(0.12, bh, 0.12), xx, by + bh / 2, zz * (hw + 0.24)));
    dark.push(at(new THREE.BoxGeometry(3.3, bh - 0.9, 0.03), bx0 + 1.7, by + 0.9 + (bh - 0.9) / 2, hw + 0.28), at(new THREE.BoxGeometry(3.3, bh - 0.9, 0.03), bx0 + 1.7, by + 0.9 + (bh - 0.9) / 2, -hw - 0.28), at(new THREE.BoxGeometry(0.03, bh - 0.9, hw * 2 + 0.5), bx0 + 3.38, by + 0.9 + (bh - 0.9) / 2, 0));
    { const wheel = new THREE.TorusGeometry(0.45, 0.04, 6, 16); wheel.rotateY(Math.PI / 2); wood.push(at(wheel, bx0 + 2.6, by + 1.3, 0)); }
    // baca, direkler, cunda ve halatlar, kıçta bayrak direği, filika
    const funnel = at(new THREE.CylinderGeometry(0.85, 0.95, 6.5, 20), -3, DY + h + 3.3, 0), ftop = at(new THREE.CylinderGeometry(0.87, 0.87, 1.2, 20), -3, DY + h + 6.1, 0);
    for (const mx of [-15, 14]) { dark.push(at(new THREE.CylinderGeometry(0.13, 0.2, 15, 10), mx, DY + 7.5, 0)); dark.push(at(new THREE.BoxGeometry(0.12, 0.12, 5).rotateY(0), mx, DY + 10, 0)); }
    const line = (a: THREE.Vector3, b: THREE.Vector3) => { const L2 = a.distanceTo(b), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); const cc = new THREE.CylinderGeometry(0.018, 0.018, L2, 4); cc.applyQuaternion(q); cc.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); return cc; };
    const topF = new THREE.Vector3(14, DY + 15, 0), topA = new THREE.Vector3(-15, DY + 15, 0);
    rope.push(line(topF, new THREE.Vector3(HALF - 0.3, DY + 1.2, 0)), line(topF, topA), line(topA, new THREE.Vector3(-HALF + 0.6, DY + 1.2, 0)));
    for (const [mx, top] of [[14, topF], [-15, topA]] as const) for (const s of [-1, 1]) for (const dx of [-1.6, 0, 1.6]) rope.push(line(top.clone().setY(top.y - 2), new THREE.Vector3(mx + dx, DY + 0.9, s * (halfBeam(mx + dx) - 0.1))));
    dark.push(at(new THREE.CylinderGeometry(0.05, 0.06, 4, 6), -HALF + 1.2, DY + 2.5, 0));
    for (const s of [-1, 1]) { const boat = new THREE.CylinderGeometry(0.55, 0.35, 4, 8, 1, false, 0, Math.PI); boat.rotateZ(Math.PI / 2); boat.rotateX(Math.PI); white.push(at(boat, -5.5, DY + h + 0.75, s * (hw - 0.4))); }
    // küpeşte üstü ahşap trabzan
    const rail: THREE.BufferGeometry[] = []; for (let i = 0; i < 60; i++) { const xa = -HALF + 0.6 + (i / 60) * (SHIP.L - 1.2), xb = -HALF + 0.6 + ((i + 1) / 60) * (SHIP.L - 1.2); for (const s of [-1, 1]) { const za = s * (halfBeam(xa) - BULWARK / 2), zb = s * (halfBeam(xb) - BULWARK / 2), Lr = Math.hypot(xb - xa, zb - za), b = new THREE.BoxGeometry(Lr + 0.02, 0.08, 0.22); b.rotateY(-Math.atan2(zb - za, xb - xa)); rail.push(at(b, (xa + xb) / 2, DY + 0.92 + 0.5 * ((2 * ((xa + xb) / 2 + HALF) / SHIP.L - 1) ** 2), (za + zb) / 2)); } }
    // iskele merdiveni: basamaklar ve tırabzanlar
    const steps: THREE.BufferGeometry[] = [], n = 16; for (let i = 0; i < n; i++) { const z = GANG.z1 - (i + 0.5) * ((GANG.z1 - GANG.z0) / n), y = DY * ((i + 1) / n); steps.push(at(bx(GANG.w, 0.08, (GANG.z1 - GANG.z0) / n + 0.02, 1), GANG.x, y - 0.04, z)); }
    for (const s of [-1, 1]) { const a = new THREE.Vector3(GANG.x + s * GANG.w / 2, 1, GANG.z1), b = new THREE.Vector3(GANG.x + s * GANG.w / 2, DY + 1, GANG.z0); rope.push(line(a, b)); for (let k = 0; k <= 5; k++) { const t = k / 5, p = a.clone().lerp(b, t); dark.push(at(new THREE.BoxGeometry(0.05, 1, 0.05), p.x, p.y - 0.5, p.z)); } }
    steps.push(at(bx(GANG.w + 0.3, 0.25, 1.2, 1), GANG.x, DY - 0.1, GANG.z0 - 0.1));
    return { hull: hullGeo(), deck: deckGeo(), white: merge(white), dark: merge(dark), wood: merge([...wood, ...rail, ...steps]), rope: merge(rope), win: merge(win), panel: merge(panel), funnel, ftop };
  }, []);
  return <group>
    <mesh geometry={g.hull} material={m.hull} castShadow receiveShadow />
    <mesh geometry={g.deck} material={m.deck} receiveShadow />
    <mesh geometry={g.white} material={m.white} castShadow receiveShadow />
    <mesh geometry={g.dark} material={m.dark} castShadow />
    <mesh geometry={g.wood} material={m.wood} castShadow receiveShadow />
    <mesh geometry={g.rope} material={m.rope} />
    <mesh geometry={g.win} material={m.win} />
    <mesh geometry={g.panel} material={m.panel} />
    <mesh geometry={g.funnel} material={m.funnel} castShadow />
    <mesh geometry={g.ftop} material={m.dark} castShadow />
    <Flag />
  </group>;
}
function Flag() {
  const tex = useMemo(() => canvasTex(192, 128, (g) => { g.fillStyle = '#d0202a'; g.fillRect(0, 0, 192, 128); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(70, 64, 34, 0, 7); g.fill(); g.fillStyle = '#d0202a'; g.beginPath(); g.arc(80, 64, 27, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 7 : 16; g.lineTo(112 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.closePath(); g.fill(); }), []);
  return <mesh position={[-HALF + 1.2 - 0.9, DY + 4, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[1.8, 1.2]} /><meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.8} /></mesh>;
}
/** Harita masasındaki deniz haritası (şematik) */
export function chartCanvas(size = 512): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = size; c.height = Math.round(size * 0.62); const g = c.getContext('2d')!, W = c.width, H = c.height;
  g.fillStyle = '#e9dcc0'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#c9d6cf'; g.beginPath(); const sea = [[0.08, 0.2], [0.13, 0.27], [0.2, 0.3], [0.3, 0.34], [0.42, 0.38], [0.55, 0.45], [0.6, 0.36], [0.66, 0.3], [0.78, 0.24], [0.9, 0.18], [0.97, 0.22], [0.96, 0.62], [0.85, 0.82], [0.62, 0.9], [0.4, 0.92], [0.2, 0.86], [0.08, 0.7], [0.04, 0.42]];
  sea.forEach(([x, y], i) => (i ? g.lineTo(x * W, (1 - y) * H) : g.moveTo(x * W, (1 - y) * H))); g.closePath(); g.fill(); g.strokeStyle = '#7a6a50'; g.lineWidth = 2; g.stroke();
  g.strokeStyle = 'rgba(90,80,60,.25)'; g.lineWidth = 1; for (let x = 0; x < W; x += W / 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += H / 5) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = '#5a4a32'; g.font = `italic ${Math.round(W / 22)}px Georgia, serif`; g.textAlign = 'center'; g.fillText('Karadeniz', W * 0.5, H * 0.35); g.fillStyle = '#8a7a5a'; g.font = `${Math.round(W / 30)}px Georgia, serif`; g.fillText('Anadolu', W * 0.5, H * 0.88);
  return c;
}
export function ChartOnTable() {
  const tex = useMemo(() => { const t = new THREE.CanvasTexture(chartCanvas(512)); t.colorSpace = THREE.SRGBColorSpace; return t; }, []);
  return <mesh position={[TABLE.x, DY + 0.945, TABLE.z]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}><planeGeometry args={[TABLE.d * 0.95, TABLE.d * 0.95 * 0.62 * 1.3]} /><meshStandardMaterial map={tex} roughness={0.8} /></mesh>;
}
