/**
 * Erzurum Çifte Minareli Medrese — 3B modeller: kesme taş kanatlar, kuzeyde taşan taç kapı (derin niş, kabartma panoları, boş kitabe
 * yuvası), payandalar üstünde oluklu tuğla minareler (sırlı tuğla kuşaklar), avluda iki katlı revaklar, dört eyvan, güneyde türbe,
 * doğuda Ulu Camii, batıda kale eteği, güneyde karlı dağlar. Bezemeler ve oda düzeni TEMSİLÎDİR (docs/CIFTE-MINARELI.md).
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, weather } from '../shared/scenery';
import { ARCADE, COURT, MED, MINARETS, PORTAL, TURBE, ULU, groundY } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const slab = (p: Parts, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, s = 2.5) => { if (x1 - x0 < 0.01 || z1 - z0 < 0.01 || y1 - y0 < 0.01) return; const g = bx(x1 - x0, y1 - y0, z1 - z0, s); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); p.push(g); };
function pointed(w: number, h: number) { const s = new THREE.Shape(), r = w / 2, sp = h - r * 1.15; s.moveTo(-r, 0); s.lineTo(-r, sp); s.quadraticCurveTo(-r, sp + r * 0.95, 0, h); s.quadraticCurveTo(r, sp + r * 0.95, r, sp); s.lineTo(r, 0); s.closePath(); return s; }
function spandrel(w: number, H: number, h: number) { const s = new THREE.Shape(), r = w / 2, sp = h - r * 1.15; s.moveTo(-r, 0); s.lineTo(-r, H); s.lineTo(r, H); s.lineTo(r, 0); s.lineTo(r, sp); s.quadraticCurveTo(r, sp + r * 0.95, 0, h); s.quadraticCurveTo(-r, sp + r * 0.95, -r, sp); s.closePath(); return s; }
const H = MED.h, F1 = 4.3;   // kat yüksekliği

export interface Mats { stone: THREE.MeshStandardMaterial; dressed: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; brick: THREE.MeshStandardMaterial; carve: THREE.MeshStandardMaterial; niche: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('cifte-tas', ['#a7927a', '#9c876f', '#b29d84', '#8f7b65', '#a38e76'], [26, 10], [58, 40]);
    const dr = stoneTex('cifte-kesme', ['#b8a38a', '#ad987f', '#c2ad94'], [30, 6], [70, 30]);
    const brick = canvasTex(256, 256, (g, r) => { g.fillStyle = '#c9b9a0'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 10) for (let x = -((y / 10) % 2) * 10; x < 256; x += 20) { const glaze = y % 80 >= 50 && y % 80 < 70 && ((x / 20 + y / 10) % 2 === 0); const v = 0.85 + r() * 0.25;
        g.fillStyle = glaze ? `rgb(${(46 * v) | 0},${(104 * v) | 0},${(150 * v) | 0})` : `rgb(${(160 * v) | 0},${(96 * v) | 0},${(70 * v) | 0})`; g.fillRect(x + 1, y + 1, 18, 8); } });
    const carve = canvasTex(256, 256, (g) => { g.fillStyle = '#b9a489'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#6e5a44'; g.lineWidth = 4;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = i * 64 + 32, y = j * 64 + 32; g.beginPath(); g.moveTo(x - 24, y); g.quadraticCurveTo(x - 10, y - 26, x, y - 6); g.quadraticCurveTo(x + 10, y - 26, x + 24, y); g.quadraticCurveTo(x + 10, y + 26, x, y + 6); g.quadraticCurveTo(x - 10, y + 26, x - 24, y); g.stroke(); } });
    const niche = canvasTex(256, 256, (g) => { g.fillStyle = '#a28e74'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#5f4d3a'; g.lineWidth = 3;
      for (let row = 0; row < 8; row++) for (let k = 0; k < 8; k++) { const x = k * 32 + (row % 2) * 16, y = row * 32; g.beginPath(); g.moveTo(x, y + 32); g.quadraticCurveTo(x, y + 6, x + 16, y); g.quadraticCurveTo(x + 32, y + 6, x + 32, y + 32); g.stroke(); } });
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.5, roughness: 0.92 })),
      dressed: weather(new THREE.MeshStandardMaterial({ map: dr.map, bumpMap: dr.bump, bumpScale: 0.4, roughness: 0.88 })),
      dark: new THREE.MeshStandardMaterial({ color: '#2a221b', roughness: 1 }),
      brick: new THREE.MeshStandardMaterial({ map: brick, roughness: 0.6 }),
      carve: new THREE.MeshStandardMaterial({ map: carve, bumpMap: carve, bumpScale: -1.2, roughness: 0.85 }),
      niche: new THREE.MeshStandardMaterial({ map: niche, bumpMap: niche, bumpScale: -1, roughness: 0.9 }),
    };
  }, []);
}

/* ===================== medrese ===================== */
export function Madrasa({ m }: { m: Mats }) {
  const g = useMemo(() => { const st: Parts = [], tr: Parts = [], dk: Parts = [], X0 = MED.x0, X1 = MED.x1, Z0 = MED.z0, Z1 = MED.z1, ax = COURT.x1 + ARCADE, pw = PORTAL.w / 2;
    // kuzey kanat (giriş geçidi)
    slab(st, X0, -pw, Z0, COURT.z0, 0, H); slab(st, pw, X1, Z0, COURT.z0, 0, H); slab(st, -pw, pw, Z0, COURT.z0, 5.2, H);
    // güney kanat ve güney eyvan (arkasında türbe kapısı)
    slab(st, X0, -3.6, COURT.z1, Z1, 0, H); slab(st, 3.6, X1, COURT.z1, Z1, 0, H); slab(st, -3.6, 3.6, COURT.z1, Z1, 7.6, H);
    slab(st, -3.6, -1, Z1 - 1, Z1, 0, 7.6); slab(st, 1, 3.6, Z1 - 1, Z1, 0, 7.6); slab(st, -1, 1, Z1 - 1, Z1, 3, 7.6);
    // doğu-batı kanatları ve yan eyvanlar
    for (const s of [-1, 1]) { const xa = s < 0 ? X0 : ax, xb = s < 0 ? -ax : X1; slab(st, xa, xb, COURT.z0, -2.6, 0, H); slab(st, xa, xb, 2.6, COURT.z1, 0, H);
      const back0 = s < 0 ? X0 : X1 - 3.2, back1 = s < 0 ? X0 + 3.2 : X1; slab(st, back0, back1, -2.6, 2.6, 0, H); slab(st, s < 0 ? X0 + 3.2 : ax, s < 0 ? -ax : X1 - 3.2, -2.6, 2.6, 6.8, H); }
    // revaklar: alt kat tavanı / üst kat döşemesi, dam; avlu kenarında payeler ve sivri kemerler (iki kat)
    for (const s of [-1, 1]) { const x0 = s < 0 ? -ax : COURT.x1, x1 = s < 0 ? COURT.x0 : ax; slab(tr, x0, x1, COURT.z0, COURT.z1, F1, F1 + 0.4, 1.5); slab(tr, x0, x1, COURT.z0, COURT.z1, H - 0.5, H, 1.5);
      const xp = s < 0 ? COURT.x0 : COURT.x1, n = 8, L = COURT.z1 - COURT.z0, d = L / n;
      for (let i = 0; i <= n; i++) slab(tr, xp - 0.4, xp + 0.4, COURT.z0 + i * d - 0.4, COURT.z0 + i * d + 0.4, 0, H - 0.5, 1.5);
      for (let i = 0; i < n; i++) for (const [y0, hh] of [[0, F1], [F1 + 0.4, H - 0.5 - F1 - 0.4]]) { const sp = new THREE.ExtrudeGeometry(spandrel(d - 0.8, hh, hh * 0.82), { depth: 0.6, bevelEnabled: false, curveSegments: 6 }); sp.translate(0, 0, -0.3); sp.rotateY(Math.PI / 2); sp.translate(xp, y0, COURT.z0 + (i + 0.5) * d); tr.push(sp); }
      // revak arkasında oda kapıları (iki kat)
      for (let i = 0; i < n; i++) for (const y0 of [0, F1 + 0.4]) { if (Math.abs(COURT.z0 + (i + 0.5) * d) < 3) continue; const dg = new THREE.ShapeGeometry(pointed(1.1, 2.2), 6); dg.rotateY(s < 0 ? Math.PI / 2 : -Math.PI / 2); dg.translate(s * ax - s * 0.02, y0 + 0.02, COURT.z0 + (i + 0.5) * d); dk.push(dg); } }
    // avlunun kuzey ve güney yüzleri: eyvan kemerleri
    for (const [z, w, hh] of [[COURT.z0, PORTAL.w + 0.8, 6.2], [COURT.z1, 7.2, 7.6]] as const) { const sp = new THREE.ExtrudeGeometry(spandrel(w + 0.6, H, hh), { depth: 0.5, bevelEnabled: false, curveSegments: 8 }); sp.translate(0, 0, -0.25); sp.translate(0, 0, z); tr.push(sp); }
    // dam korkuluğu
    slab(tr, X0, X1, Z0, Z0 + 0.5, H, H + 0.5, 1.5); slab(tr, X0, X1, Z1 - 0.5, Z1, H, H + 0.5, 1.5); slab(tr, X0, X0 + 0.5, Z0, Z1, H, H + 0.5, 1.5); slab(tr, X1 - 0.5, X1, Z0, Z1, H, H + 0.5, 1.5);
    // dış cephe pencereleri
    for (const s of [-1, 1]) for (let z = Z0 + 4; z < Z1 - 3; z += 6) { const w = new THREE.ShapeGeometry(pointed(0.8, 1.6), 6); w.rotateY(s < 0 ? -Math.PI / 2 : Math.PI / 2); w.translate(s * (X1 + 0.02), 5.5, z); dk.push(w); }
    return { st: merge(st), tr: merge(tr), dk: merge(dk) }; }, []);
  const floor = useMemo(() => { const p = new THREE.PlaneGeometry(MED.x1 - MED.x0 - 1, MED.z1 - MED.z0 - 1); p.rotateX(-Math.PI / 2); p.translate(0, 0.02, 0); return p; }, []);
  return <group>
    <mesh geometry={g.st} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.tr} material={m.dressed} castShadow receiveShadow />
    <mesh geometry={g.dk} material={m.dark} />
    <mesh geometry={floor} receiveShadow><meshStandardMaterial color="#b3a58d" roughness={0.95} /></mesh>
  </group>;
}

/** Taç kapı: taşan çerçeve, oyma kuşak, derin niş (yaprak dizili kavsara), kapı, boş kitabe yuvası, dört kabartma pano */
function eagleTex() { return canvasTex(256, 256, (g) => { g.fillStyle = '#b39e84'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#6e5a44'; g.lineWidth = 6; g.strokeRect(10, 10, 236, 236); g.fillStyle = '#7d6852';
  g.beginPath(); g.ellipse(128, 150, 24, 44, 0, 0, 7); g.fill(); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 16, 128); g.lineTo(128 + s * 110, 90); g.lineTo(128 + s * 100, 130); g.lineTo(128 + s * 84, 132); g.lineTo(128 + s * 90, 156); g.lineTo(128 + s * 24, 168); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(128 + s * 6, 112); g.quadraticCurveTo(128 + s * 10, 70, 128 + s * 26, 62); g.lineTo(128 + s * 32, 74); g.quadraticCurveTo(128 + s * 20, 86, 128 + s * 20, 112); g.closePath(); g.fill(); g.beginPath(); g.arc(128 + s * 30, 60, 12, 0, 7); g.fill(); g.beginPath(); g.moveTo(128 + s * 38, 54); g.lineTo(128 + s * 56, 62); g.lineTo(128 + s * 40, 68); g.fill(); }
  g.beginPath(); g.moveTo(110, 190); g.lineTo(146, 190); g.lineTo(138, 226); g.lineTo(118, 226); g.fill(); }); }
function leafPanelTex(seed: number) { return canvasTex(256, 256, (g, r) => { g.fillStyle = '#b39e84'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#6e5a44'; g.lineWidth = 6; g.strokeRect(10, 10, 236, 236); g.lineWidth = 5;
  g.beginPath(); g.moveTo(128, 236); g.lineTo(128, 40); g.stroke(); for (let y = 60; y < 220; y += 34) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128, y + 10); g.quadraticCurveTo(128 + s * 60, y - 10 - r() * 10, 128 + s * 90, y + 20); g.quadraticCurveTo(128 + s * 50, y + 10, 128, y + 24); g.stroke(); } }, seed); }
export function Portal({ m }: { m: Mats }) {
  const z = MED.z0, dz = PORTAL.depth, fw = PORTAL.frameW, fh = PORTAL.frameH;
  const frame = useMemo(() => { const o = new THREE.Shape(); o.moveTo(-fw / 2, 0); o.lineTo(fw / 2, 0); o.lineTo(fw / 2, fh); o.lineTo(-fw / 2, fh); o.closePath();
    const w = 6, hh = 11.5, r = w / 2, sp = hh - r * 1.15, h = new THREE.Path(); h.moveTo(-r, 0.3); h.lineTo(r, 0.3); h.lineTo(r, sp); h.quadraticCurveTo(r, sp + r * 0.95, 0, hh); h.quadraticCurveTo(-r, sp + r * 0.95, -r, sp); h.closePath(); o.holes.push(h);
    const g = new THREE.ExtrudeGeometry(o, { depth: dz, bevelEnabled: false, curveSegments: 10 }); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3); g.translate(0, 0, -dz); return g; }, [fw, fh, dz]);
  const nicheBack = useMemo(() => { const g = new THREE.ShapeGeometry(pointed(6, 11.5), 10); return g; }, []);
  const panels = useMemo(() => [eagleTex(), leafPanelTex(3), leafPanelTex(7), leafPanelTex(11)], []);
  const kit = useMemo(() => canvasTex(256, 96, (g) => { g.fillStyle = '#9b876e'; g.fillRect(0, 0, 256, 96); g.strokeStyle = '#6e5a44'; g.lineWidth = 6; g.strokeRect(6, 6, 244, 84); }), []);
  return <group position={[0, 0, z]}>
    <mesh geometry={frame} material={m.carve} castShadow receiveShadow />
    <mesh geometry={nicheBack} material={m.niche} position={[0, 0.3, -0.02]} rotation-y={Math.PI} />
    <mesh material={m.dark} position={[0, PORTAL.h / 2, -0.04]} rotation-y={Math.PI}><planeGeometry args={[PORTAL.w, PORTAL.h]} /></mesh>
    <mesh material={m.dressed} position={[0, PORTAL.h + 0.6, -0.03]} rotation-y={Math.PI}><planeGeometry args={[3.8, 1.2]} /></mesh>
    <mesh position={[0, PORTAL.h + 2.2, -0.035]} rotation-y={Math.PI}><planeGeometry args={[3.2, 1.2]} /><meshStandardMaterial map={kit} roughness={0.95} /></mesh>
    {[[-4.15, 3.2, 0], [-4.15, 7.2, 1], [4.15, 3.2, 2], [4.15, 7.2, 3]].map(([x, y, i]) => <mesh key={i} position={[x, y, -dz - 0.03]} rotation-y={Math.PI}><planeGeometry args={[1.9, 2.6]} /><meshStandardMaterial map={panels[i]} bumpMap={panels[i]} bumpScale={-1.4} roughness={0.85} /></mesh>)}
  </group>;
}
/** Oluklu minareler: payanda üstünde, tuğla gövde (sırlı tuğla kuşaklar), küçük külah */
export function Minarets({ m }: { m: Mats }) {
  const g = useMemo(() => { const st: Parts = [], br: Parts = [];
    for (const [x, z] of MINARETS) { slab(st, x - 2.8, x + 2.8, z - 2.8, z + 2.8, 0, H + 0.6, 2.5);
      const base = new THREE.CylinderGeometry(2.0, 2.2, 2, 16); base.translate(x, H + 1.6, z); st.push(base);
      const sh = new THREE.CylinderGeometry(1.45, 1.75, 16, 48, 8, true), p = sh.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) { const px = p.getX(i), pz = p.getZ(i), a = Math.atan2(pz, px), k = 1 + 0.07 * Math.max(0, Math.cos(a * 12)); p.setXYZ(i, px * k, p.getY(i), pz * k); }
      sh.computeVertexNormals(); const uv = sh.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 6); sh.translate(x, H + 2.6 + 8, z); br.push(sh);
      const top = new THREE.CylinderGeometry(1.5, 1.5, 0.6, 24); top.translate(x, H + 2.6 + 16.3, z); st.push(top); const cap = new THREE.ConeGeometry(1.3, 2.4, 24); cap.translate(x, H + 2.6 + 17.8, z); st.push(cap); }
    return { st: merge(st), br: merge(br) }; }, []);
  return <group>
    <mesh geometry={g.st} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.br} material={m.brick} castShadow receiveShadow />
  </group>;
}
/** Hatuniye Türbesi: çokgen gövde, külah; kapısı güney eyvana bakar */
export function Turbe({ m }: { m: Mats }) {
  const g = useMemo(() => { const p: Parts = [], dk: Parts = [], { x, z, r } = TURBE;
    const body = new THREE.CylinderGeometry(r, r + 0.2, 8, 24, 1, true, Math.PI + 0.22, Math.PI * 2 - 0.44); const uv = body.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 12, uv.getY(i) * 3); body.translate(x, 4, z); p.push(body);
    const inner = new THREE.CylinderGeometry(r - 0.7, r - 0.7, 8, 24, 1, true, Math.PI + 0.26, Math.PI * 2 - 0.52); inner.translate(x, 4, z); dk.push(inner);
    const ring = new THREE.RingGeometry(r - 0.7, r + 0.2, 12); ring.rotateX(-Math.PI / 2); ring.translate(x, 8, z); p.push(ring);
    const cone = new THREE.ConeGeometry(r + 0.4, 4.5, 12); cone.translate(x, 10.25, z); p.push(cone);
    const sand = bx(1.2, 0.9, 2.4, 1); sand.translate(x, 0.45, z + 1); p.push(sand);
    return { p: merge(p), dk: merge(dk) }; }, []);
  return <group>
    <mesh geometry={g.p} material={m.dressed} castShadow receiveShadow />
    <mesh geometry={g.dk}><meshStandardMaterial color="#6d5d4b" roughness={1} side={THREE.BackSide} /></mesh>
    <mesh position={[TURBE.x, 7.98, TURBE.z]} rotation-x={Math.PI / 2}><circleGeometry args={[TURBE.r - 0.6, 12]} /><meshStandardMaterial color="#5c4e3f" roughness={1} /></mesh>
  </group>;
}
/** Yarım kalmış taş pano (doğu revakının arkasında): sol yarısı oyulmuş, sağ yarısı kaba */
export function HalfPanel({ m }: { m: Mats }) {
  const t = useMemo(() => canvasTex(256, 256, (g, r) => { g.fillStyle = '#b39e84'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#6e5a44'; g.lineWidth = 5; g.strokeRect(8, 8, 240, 240);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) { const x = i * 64 + 40, y = j * 60 + 38; g.beginPath(); g.arc(x, y, 22, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x - 22, y); g.lineTo(x + 22, y); g.moveTo(x, y - 22); g.lineTo(x, y + 22); g.stroke(); }
    g.strokeStyle = 'rgba(110,90,68,0.35)'; g.setLineDash([6, 6]); for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(200, j * 60 + 38, 22, 0, 7); g.stroke(); }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(80,64,48,${r() * 0.25})`; g.fillRect(140 + r() * 110, r() * 256, 2, 2); } }), []);
  void m;
  return <mesh position={[COURT.x1 + ARCADE - 0.03, 3.2, -7]} rotation-y={-Math.PI / 2}><planeGeometry args={[1.8, 1.8]} /><meshStandardMaterial map={t} bumpMap={t} bumpScale={-1} roughness={0.9} /></mesh>;
}
/** Ulu Camii (yalın, düz damlı, küçük kubbeler), kale eteği ve surlar */
export function Surroundings({ m }: { m: Mats }) {
  const g = useMemo(() => { const p: Parts = [], { x0, x1, z0, z1 } = ULU; slab(p, x0, x1, z0, z1, 0, 7.5, 3);
    for (const [dx, dz] of [[10, 8], [26, 8], [18, 32]]) { const d = new THREE.SphereGeometry(3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); d.translate(x0 + dx, 7.5, z0 + dz); p.push(d); }
    const mn = new THREE.CylinderGeometry(1.2, 1.4, 20, 16); mn.translate(x0 + 2, 10, z1 - 3); p.push(mn);
    for (let z = -60; z < 50; z += 10) { slab(p, -44, -41, z, z + 10.2, groundY(-42) - 1, groundY(-42) + 7, 3); }
    for (const z of [-40, -10, 20]) { const t = new THREE.CylinderGeometry(3.2, 3.4, 11, 16); t.translate(-42.5, groundY(-42) + 3.5, z); p.push(t); }
    const r = rng(5); for (let i = 0; i < 40; i++) { const x = -20 + r() * 110, z = 30 + r() * 80; if (x > -20 && x < 20 && z < 40) continue; const w = 6 + r() * 8, d = 6 + r() * 8; slab(p, x, x + w, z, z + d, 0, 4 + r() * 8, 3); }
    for (let i = 0; i < 30; i++) { const x = -20 + r() * 110, z = -60 - r() * 60; const w = 6 + r() * 8, d = 6 + r() * 8; slab(p, x, x + w, z, z + d, 0, 4 + r() * 8, 3); }
    return merge(p); }, []);
  return <mesh geometry={g} material={m.stone} castShadow receiveShadow />;
}
export function Ground() {
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(500, 500, 120, 120); g.rotateX(-Math.PI / 2); const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i)) - 0.02); g.computeVertexNormals(); return g; }, []);
  const tex = useMemo(() => groundTex(), []);
  const pave = useMemo(() => canvasTex(256, 256, (g, r) => { g.fillStyle = '#9d9585'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) { const v = 0.85 + r() * 0.2; g.fillStyle = `rgb(${(190 * v) | 0},${(182 * v) | 0},${(166 * v) | 0})`; g.fillRect(x + 2, y + 2, 28, 28); } }), []);
  pave.repeat.set(30, 30);
  return <group userData={{ noCast: true }}>
    <mesh geometry={geo} receiveShadow><meshStandardMaterial color="#b9ae96" map={tex.map} bumpMap={tex.bump} bumpScale={0.2} roughness={1} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[10, 0.01, -10]} receiveShadow><planeGeometry args={[100, 110]} /><meshStandardMaterial map={pave} roughness={0.95} /></mesh>
  </group>;
}
export function Mountains() {
  const list = useMemo(() => [
    { p: [200, -10, 1600] as [number, number, number], g: mountainGeo(1500, 700, 3, 0.5, '#80786a') },
    { p: [-1400, -10, 900] as [number, number, number], g: mountainGeo(900, 420, 7, 0.7, '#857a66') },
    { p: [900, -10, -1600] as [number, number, number], g: mountainGeo(1000, 360, 11, 1, '#857a66') },
  ], []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
