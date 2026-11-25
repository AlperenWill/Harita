/**
 * Tios — 3B modeller: kıyı ve akropol tepesi (eğime göre kaya/çimen/kum renkli arazi), yarı saydam deniz ve sular altındaki mendirek,
 * Filyos Çayı, yıkık surlar ve kuleler, gözcü kulesi ve rampası, sarnıç, tapınak terası (kripta ağzı), kıyıdaki tiyatro, hamam ve
 * nymphaeum kalıntıları, taş döşeli yol, su kemeri, nekropol. Biçimler ve ölçüler TEMSİLÎDİR.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { archGeo, bx, mountainGeo, stoneTex, weather } from '../shared/scenery';
import { ACRO, AQUEDUCT, BATH, BOUNDS, CISTERN, GATE, NYMPH, RIVER, SEA_Z, TEMPLE, THEATRE, TOWER, acroD, angDiff, groundY } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
function fixNormals(g: THREE.BufferGeometry) { const n = g.attributes.normal as THREE.BufferAttribute; for (let i = 0; i < n.count; i++) if (!(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) > 1e-6)) n.setXYZ(i, 0, 1, 0); return g; }
const merge = (parts: THREE.BufferGeometry[]) => fixNormals(mergeGeometries(parts.map((g) => { const n = g.index ? g.toNonIndexed() : g; if (!n.attributes.normal) n.computeVertexNormals(); if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; }))!);
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); return g; };

export interface Mats { ground: THREE.MeshStandardMaterial; wall: THREE.MeshStandardMaterial; marble: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; sea: THREE.MeshStandardMaterial; river: THREE.MeshStandardMaterial; pave: THREE.MeshStandardMaterial; leaf: THREE.MeshStandardMaterial; brick: THREE.MeshStandardMaterial; bark: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const wl = stoneTex('tios-sur', ['#8f877a', '#9c9486', '#837b6f', '#a59c8b', '#8a8070'], [22, 16], [28, 34]);
    const noise = canvasTex(128, 128, (g, r) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 1400; i++) { const v = 200 + r() * 55 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * 128, r() * 128, 2 + r() * 2, 2 + r() * 2); } });
    noise.repeat.set(1, 1);
    const pv = canvasTex(256, 256, (g, r) => { g.fillStyle = '#6f6a60'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) for (let x = (y / 32) % 2 ? -24 : 0; x < 256; x += 48) { const v = 130 + r() * 40 | 0; g.fillStyle = `rgb(${v},${v - 4},${v - 12})`; g.fillRect(x + 2, y + 2, 44, 28); } });
    return {
      ground: new THREE.MeshStandardMaterial({ vertexColors: true, map: noise, roughness: 1 }),
      wall: weather(new THREE.MeshStandardMaterial({ map: wl.map, bumpMap: wl.bump, bumpScale: 0.6, roughness: 0.95 })),
      marble: new THREE.MeshStandardMaterial({ color: '#d2cbbb', roughness: 0.6 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2520', roughness: 1, side: THREE.DoubleSide }),
      sea: new THREE.MeshStandardMaterial({ color: '#2f7183', roughness: 0.15, metalness: 0.15, transparent: true, opacity: 0.72, depthWrite: false }),
      river: new THREE.MeshStandardMaterial({ color: '#5a7f72', roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 }),
      pave: new THREE.MeshStandardMaterial({ map: pv, roughness: 0.9 }),
      leaf: new THREE.MeshStandardMaterial({ color: '#4c7236', roughness: 0.95 }),
      brick: new THREE.MeshStandardMaterial({ color: '#9a5a3f', roughness: 0.9 }),
      bark: new THREE.MeshStandardMaterial({ color: '#5e4a38', roughness: 1 }),
    };
  }, []);
}

/** Sınırların dışında arazi yükselir (ağaçlar da aynı yüzeye oturur) */
const outside = (x: number, z: number) => Math.max(0, z - BOUNDS.z1, x - BOUNDS.x1 - 30, BOUNDS.x0 - 40 - x);
const landY = (x: number, z: number) => groundY(x, z) + outside(x, z) * 0.35;
/** Arazi: denize doğru alçalan kıyı, nehir yatağı; eğime göre kaya, kıyıda kum, öbür yerde çimen */
export function Land({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const S = 600, N = 300, t = new THREE.PlaneGeometry(S, S, N, N); t.rotateX(-Math.PI / 2); t.translate(25, 0, 0); const p = t.attributes.position as THREE.BufferAttribute, u = t.attributes.uv as THREE.BufferAttribute;
    const ys = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let y = groundY(x, z);
      if (z < SEA_Z + 2 && acroD(x, z) > 1.15) y = Math.min(y, -Math.min(4, (SEA_Z + 2 - z) * 0.18));   // deniz tabanı
      if (x > RIVER.x0 - 1 && x < RIVER.x1 + 1) y = Math.min(y, -1.2);
      y += outside(x, z) * 0.35; ys[i] = y; p.setY(i, y); u.setXY(i, x / 6, z / 6); }
    t.computeVertexNormals(); const n = t.attributes.normal as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const steep = 1 - n.getY(i), z = p.getZ(i), y = ys[i];
      if (steep > 0.25) c.set('#8a8274'); else if (y < 0.6 && z < SEA_Z + 8) c.set('#d8c79c'); else if (y < -0.2) c.set('#a99a78'); else c.set('#7f9a52');
      col.set([c.r, c.g, c.b], i * 3); }
    t.setAttribute('color', new THREE.BufferAttribute(col, 3)); return t;
  }, []);
  const mts = useMemo(() => [
    { p: [-140, -6, 330] as [number, number, number], g: mountainGeo(220, 130, 3, 0, '#4f6a3c') }, { p: [200, -6, 320] as [number, number, number], g: mountainGeo(240, 150, 5, 0, '#4a663a') },
    { p: [420, -6, 60] as [number, number, number], g: mountainGeo(200, 120, 7, 0, '#56703f') },
  ], []);
  return <group userData={{ noCast: true }}>
    <mesh geometry={g} material={m.ground} receiveShadow />
    {mts.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}
    <mesh rotation-x={-Math.PI / 2} position={[25, -0.15, SEA_Z - 300 + 1]} material={m.sea}><planeGeometry args={[1400, 600]} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[(RIVER.x0 + RIVER.x1) / 2, -0.25, (SEA_Z + BOUNDS.z1 + 60) / 2]} material={m.river}><planeGeometry args={[RIVER.x1 - RIVER.x0 + 3, BOUNDS.z1 + 60 - SEA_Z]} /></mesh>
  </group>;
}

/** Kalıntılar: sur, kuleler, gözcü kulesi, sarnıç, tapınak terası, tiyatro, hamam, nymphaeum, yol, su kemeri, nekropol, mendirek */
export function Ruins({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const W: THREE.BufferGeometry[] = [], M: THREE.BufferGeometry[] = [], D: THREE.BufferGeometry[] = [], P: THREE.BufferGeometry[] = [], B: THREE.BufferGeometry[] = [], r = rng(13);
    // surlar: düzlüğün kenarında, kapı boşluğu dışında; yıkık (değişken yükseklik), aralarda kuleler
    const NA = 64; for (let i = 0; i < NA; i++) { const a0 = (i / NA) * Math.PI * 2, a1 = ((i + 1) / NA) * Math.PI * 2, am = (a0 + a1) / 2; if (angDiff(am, GATE.a) < GATE.half) continue;
      const p0 = [ACRO.cx + Math.cos(a0) * ACRO.rx * ACRO.wall, ACRO.cz + Math.sin(a0) * ACRO.rz * ACRO.wall], p1 = [ACRO.cx + Math.cos(a1) * ACRO.rx * ACRO.wall, ACRO.cz + Math.sin(a1) * ACRO.rz * ACRO.wall];
      const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + 0.1, h = 1.2 + r() * 1.4 + (i % 8 === 4 ? 0.8 : 0), b = bx(L, h + 1, 1.4, 3); b.rotateY(-Math.atan2(p1[1] - p0[1], p1[0] - p0[0]));
      W.push(at(b, (p0[0] + p1[0]) / 2, ACRO.h + h / 2 - 0.5, (p0[1] + p1[1]) / 2));
      if (i % 8 === 4) W.push(at(bx(3.4, h + 1.5, 3.4, 3), (p0[0] + p1[0]) / 2, ACRO.h + h / 2 - 0.2, (p0[1] + p1[1]) / 2)); }
    // gözcü kulesi: kare gövde, üstte mazgallı korkuluk, güneyde kapı
    { const T = TOWER, cx = (T.x0 + T.x1) / 2, cz = (T.z0 + T.z1) / 2; W.push(at(bx(T.x1 - T.x0, T.h, T.z1 - T.z0, 3), cx, ACRO.h + T.h / 2, cz));
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) W.push(at(bx(0.6, 0.7, 0.6, 1), cx + sx * 2.2, ACRO.h + T.h + 0.35, cz + sz * 2.2));   // köşe mazgalları
      D.push(at(archGeo(1.4, 2.4, false), cx, ACRO.h, T.z1 + 0.03)); }
    // sarnıç: taş kenar, karanlık su yüzü
    { const [x0, z0, x1, z1] = CISTERN, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
      for (const [dx, dz, ww, dd] of [[0, -d / 2, w, 0.6], [0, d / 2, w, 0.6], [-w / 2, 0, 0.6, d], [w / 2, 0, 0.6, d]] as [number, number, number, number][]) W.push(at(bx(ww, 0.8, dd, 2), cx + dx, ACRO.h + 0.4, cz + dz));
      const s = new THREE.PlaneGeometry(w - 0.6, d - 0.6); s.rotateX(-Math.PI / 2); D.push(at(s, cx, ACRO.h + 0.1, cz)); }
    // tapınak terası: podyum, sütun kaideleri ve kırık sütunlar, kripta ağzı (basamaklı karanlık açıklık)
    { const [x0, z0, x1, z1] = TEMPLE, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; W.push(at(bx(x1 - x0, 1.3, z1 - z0, 3), cx, ACRO.h + 0.65, cz)); M.push(at(bx(x1 - x0 + 0.2, 0.12, z1 - z0 + 0.2, 2), cx, ACRO.h + 1.36, cz));
      for (let i = 0; i < 4; i++) for (const zz of [z0 + 1, z1 - 1]) { const h = 0.6 + r() * 2.6; M.push(at(new THREE.CylinderGeometry(0.34, 0.38, h, 12), x0 + 1.4 + i * 2.4, ACRO.h + 1.42 + h / 2, zz)); }
      D.push(at(bx(2, 0.04, 1.6), cx, ACRO.h + 1.43, cz)); }
    // tiyatro: kıyıya bakan (kuzey) yarım daire sıralar, yıkık üst sıralar; sahne binası temeli
    { const [tx, tz] = THEATRE.c, D0 = 0.8; let prev = 0;
      for (let rr = THEATRE.r0; rr < THEATRE.r1 - 0.01; rr += D0) { const y = (rr + D0 - THEATRE.r0) * 0.42, a0 = Math.PI + (rr > 14 ? 0.15 + r() * 0.25 : 0), len = Math.PI - (rr > 14 ? 0.2 + r() * 0.4 : 0);
        const tr = new THREE.RingGeometry(rr, rr + D0, 48, 1, a0, len); tr.rotateX(-Math.PI / 2); const u = tr.attributes.uv as THREE.BufferAttribute, p = tr.attributes.position as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, p.getX(i) / 2.4, p.getZ(i) / 2.4); M.push(at(tr, tx, y, tz));
        const rs = new THREE.CylinderGeometry(rr, rr, y - prev + 0.02, 48, 1, true, a0 - Math.PI * 1.5, len); M.push(at(rs, tx, (y + prev) / 2, tz)); prev = y; }
      { const o = new THREE.CircleGeometry(THEATRE.r0, 32); o.rotateX(-Math.PI / 2); P.push(at(o, tx, 0.03, tz)); }
      for (let x = -14; x < 14; x += 2) { const h = 0.6 + r() * 1.6; W.push(at(bx(2, h, 3, 3), tx + x + 1, h / 2, tz - 9)); } }
    // hamam: yıkık tuğla ve taş duvarlar, kemer açıklıkları
    { const [x0, z0, x1, z1] = BATH, cx = (x0 + x1) / 2;
      const wall = (ax: number, az: number, bxp: number, bz: number, h: number) => { const L = Math.hypot(bxp - ax, bz - az), b = bx(L, h, 1, 3); b.rotateY(-Math.atan2(bz - az, bxp - ax)); B.push(at(b, (ax + bxp) / 2, h / 2, (az + bz) / 2)); };
      wall(x0, z0, x1, z0, 3.4); wall(x0, z1, x1, z1, 2.2); wall(x0, z0, x0, z1, 2.8); wall(x1, z0, x1, z1, 4.2); wall(cx, z0, cx, z1, 3.6);
      for (const xx of [x0 + 4, x1 - 4]) D.push(at(archGeo(1.8, 2.6, false), xx, 0, z0 - 0.52)); }
    // nymphaeum: üç nişli duvar ve önünde havuz
    { const [x0, z0, x1, z1] = NYMPH, cx = (x0 + x1) / 2; W.push(at(bx(x1 - x0, 4, z1 - z0, 3), cx, 2, (z0 + z1) / 2));
      for (const dx of [-3.6, 0, 3.6]) { const n = archGeo(1.6, 2.6, false); n.rotateY(Math.PI); D.push(at(n, cx + dx, 0.6, z0 - 0.03)); }
      W.push(at(bx(x1 - x0, 0.6, 0.4, 2), cx, 0.3, z0 - 3)); for (const s of [-1, 1]) W.push(at(bx(0.4, 0.6, 3, 2), cx + s * (x1 - x0) / 2, 0.3, z0 - 1.5)); }
    // taş döşeli yol: kapıdan kent merkezine
    { const ga = GATE.a, gx = ACRO.cx + Math.cos(ga) * ACRO.rx * 1.02, gz = ACRO.cz + Math.sin(ga) * ACRO.rz * 1.02, pts: [number, number][] = [[gx, gz], [2, 2], [14, 14], [30, 40]];
      for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx2, bz] = pts[i + 1], L = Math.hypot(bx2 - ax, bz - az), n = Math.ceil(L / 2);
        for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, x = ax + (bx2 - ax) * (t0 + t1) / 2, z = az + (bz - az) * (t0 + t1) / 2, q = new THREE.PlaneGeometry(3.2, L / n + 0.05); q.rotateX(-Math.PI / 2); q.rotateY(-Math.atan2(bz - az, bx2 - ax) + Math.PI / 2);
          const uu = q.attributes.uv as THREE.BufferAttribute; for (let j = 0; j < uu.count; j++) uu.setXY(j, uu.getX(j) * 0.6, uu.getY(j) * (L / n) / 5); P.push(at(q, x, groundY(x, z) + 0.04, z)); } } }
    // su kemeri: ayaklar, kemerler, üstte su kanalı; bir kesimi yıkık
    { const { z, x0, x1 } = AQUEDUCT, H = 6;
      for (let x = x0; x <= x1; x += 6) { const broken = x > 30 && x < 44; W.push(at(bx(1.8, broken ? 2 : H, 2, 3), x, (broken ? 2 : H) / 2, z));
        if (x + 6 <= x1 && !(x + 3 > 30 && x + 3 < 44)) { const ar = new THREE.TorusGeometry(2.1, 0.45, 6, 12, Math.PI); ar.scale(1, 1, 2.2); W.push(at(ar, x + 3, H - 1.6, z)); W.push(at(bx(6, 1.2, 2, 3), x + 3, H + 0.2, z)); } } }
    // nekropol: lahitler (beşik kapaklı) ve mezar taşları
    for (let i = 0; i < 16; i++) { const x = 58 + (i % 4) * 6 + r() * 2, z = 32 + Math.floor(i / 4) * 5 + r() * 1.5;
      if (i % 3 === 0) { const st = bx(0.7, 1.2 + r() * 0.5, 0.2, 1); st.rotateY(r() * 0.4); M.push(at(st, x, 0.6, z)); continue; }
      W.push(at(bx(2.2, 1, 1.1, 2), x, 0.5, z)); const lid = new THREE.CylinderGeometry(0.75, 0.75, 2.3, 3, 1); lid.rotateZ(Math.PI / 2); lid.scale(1, 0.45, 1); M.push(at(lid, x, 1.18, z)); }
    // mendirek: sular altında (bir kısmı su yüzüne yakın) büyük bloklar
    for (const [ax, az, bx2, bz] of [[-46, -43, -56, -62], [-56, -62, -78, -64]] as [number, number, number, number][]) { const L = Math.hypot(bx2 - ax, bz - az), n = Math.ceil(L / 2.2);
      for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, x = ax + (bx2 - ax) * t + (r() - 0.5) * 0.8, z = az + (bz - az) * t + (r() - 0.5) * 0.8, top = -0.35 - r() * 0.9; W.push(at(bx(2 + r() * 0.6, 1.4, 3.2 + r() * 0.6, 2), x, top - 0.7, z)); } }
    return { W: merge(W), M: merge(M), D: merge(D), P: merge(P), B: merge(B) };
  }, []);
  return <group>
    <mesh geometry={g.W} material={m.wall} castShadow receiveShadow />
    <mesh geometry={g.M} material={m.marble} castShadow receiveShadow />
    <mesh geometry={g.D} material={m.dark} />
    <mesh geometry={g.P} material={m.pave} receiveShadow />
    <mesh geometry={g.B} material={m.brick} castShadow receiveShadow />
  </group>;
}
/** Ağaçlar ve Filyos'un yeni evleri (nehrin doğusunda) */
export function Surround({ m, n }: { m: Mats; n: number }) {
  const geo = useMemo(() => {
    const r = rng(29), parts: THREE.BufferGeometry[] = [], tk: THREE.BufferGeometry[] = [];
    for (let i = 0; i < n * 4 && parts.length < n; i++) { const x = -60 + r() * 260, z = -30 + r() * 200; if (z < SEA_Z + 12 || acroD(x, z) < 1.4 || (x > RIVER.x0 - 4 && x < RIVER.x1 + 4)) continue;
      if (x > -25 && x < 90 && z > -30 && z < 66) continue;   // kalıntı alanı açık
      const s = 1.4 + r() * 1.6, y = landY(x, z) - 0.2; parts.push(at(new THREE.IcosahedronGeometry(s * 1.4, 0), x, y + s * 2.2, z)); tk.push(at(new THREE.CylinderGeometry(0.16 * s, 0.24 * s, s * 2.2, 6), x, y + s * 1.1, z)); }
    return { lf: merge(parts), tk: merge(tk) };
  }, [n]);
  return <group><mesh geometry={geo.lf} material={m.leaf} castShadow /><mesh geometry={geo.tk} material={m.bark} castShadow /></group>;
}
