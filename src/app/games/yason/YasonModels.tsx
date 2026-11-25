/**
 * Yason — 3B modeller: deniz, yeşil burun ve kara, ağaçlar ve yol; doğu-batı doğrultulu küçük bazilika: açık-koyu bantlı taş duvarlar,
 * taş taş örülmüş batı cephesi (bulmaca hücreleri), kabartmalı kapı çerçevesi, güney kapısı, kiremit beşik çatı, doğuda üç apsis, çatıda
 * küçük kubbe; içeride iki sıra sütun ve kemerler, sıvalı duvarlar. Ölçüler ve desen TEMSİLÎDİR.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex } from '../shared/scenery';
import { CH, COLS, COL_R, FACADE, LAND, MISSING, cellY, cellZ, key, toneOf } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => { const n = g.index ? g.toNonIndexed() : g; if (!n.attributes.normal) n.computeVertexNormals(); if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; }))!;
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); return g; };
export const TONE_COL = { acik: '#d8cfbd', koyu: '#6e6559' } as const;

export interface Mats { band: THREE.MeshStandardMaterial; stone: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial; grass: THREE.MeshStandardMaterial; sea: THREE.MeshStandardMaterial; rock: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; floor: THREE.MeshStandardMaterial; cell: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    // açık-koyu bantlı kesme taş: 1 m'de ~1,4 sıra
    const bd = canvasTex(256, 256, (g, r) => { const rows = 7, h = 256 / rows; for (let i = 0; i < rows; i++) { const y = i * h; let x = -r() * 40; while (x < 256) { const w = 40 + r() * 30, base = i % 2 ? [110, 101, 89] : [216, 207, 189], v = (r() - 0.5) * 18; g.fillStyle = `rgb(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v | 0})`; g.fillRect(x + 1, y + 1, w - 2, h - 2); x += w; } g.fillStyle = 'rgba(60,55,48,.5)'; g.fillRect(0, y, 256, 1.5); }
      for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.1})`; g.fillRect(r() * 256, r() * 256, 2, 2); } });
    const cl = canvasTex(128, 128, (g, r) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { const v = 200 + r() * 55 | 0; g.fillStyle = `rgba(${v - 40},${v - 45},${v - 55},${r() * 0.35})`; g.fillRect(r() * 128, r() * 128, 2, 2); } g.strokeStyle = 'rgba(40,35,30,.3)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 125, 125); });
    const tile = canvasTex(256, 256, (g, r) => { g.fillStyle = '#7c3a28'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 16) for (let x = (y / 16) % 2 ? -8 : 0; x < 256; x += 16) { const v = r(); g.fillStyle = `rgb(${150 + v * 40 | 0},${70 + v * 25 | 0},${48 + v * 15 | 0})`; g.beginPath(); g.ellipse(x + 8, y + 10, 7, 9, 0, 0, Math.PI); g.fill(); } });
    const pl = canvasTex(256, 256, (g, r) => { g.fillStyle = '#e8e1d3'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '190,175,150' : '250,246,238'},${0.15 + r() * 0.2})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 10 + r() * 40, 8 + r() * 30, r() * 3, 0, 7); g.fill(); } });
    const fl = canvasTex(256, 256, (g, r) => { for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) { const v = 150 + r() * 40 | 0; g.fillStyle = `rgb(${v},${v - 8},${v - 18})`; g.fillRect(x + 1, y + 1, 62, 62); } });
    const gt = groundTex(); gt.map.repeat.set(80, 80);
    return {
      band: new THREE.MeshStandardMaterial({ map: bd, roughness: 0.85 }),
      stone: new THREE.MeshStandardMaterial({ color: '#cfc5b0', roughness: 0.85 }),
      roof: new THREE.MeshStandardMaterial({ map: tile, roughness: 0.8, side: THREE.DoubleSide }),
      plaster: new THREE.MeshStandardMaterial({ map: pl, roughness: 0.95, side: THREE.DoubleSide }),
      grass: new THREE.MeshStandardMaterial({ color: '#86a65a', map: gt.map, roughness: 1 }),
      sea: new THREE.MeshStandardMaterial({ color: '#2e6a7d', roughness: 0.12, metalness: 0.2 }),
      rock: new THREE.MeshStandardMaterial({ color: '#7c7468', roughness: 1, side: THREE.DoubleSide }),
      wood: new THREE.MeshStandardMaterial({ color: '#6b4a30', roughness: 0.8 }),
      floor: new THREE.MeshStandardMaterial({ map: fl, roughness: 0.8 }),
      cell: new THREE.MeshStandardMaterial({ map: cl, roughness: 0.85 }),
    };
  }, []);
}

/* ===================== burun ===================== */
export function Land({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const sea = new THREE.PlaneGeometry(2400, 2400); sea.rotateX(-Math.PI / 2); sea.translate(0, -0.9, 0);
    // burun: elips yayla + denize inen kayalık kenar; güneyde ana kara
    const NA = 96, NR = 8, pos: number[] = [], uv: number[] = [], idx: number[] = [], r = rng(3);
    for (let j = 0; j <= NR; j++) for (let i = 0; i <= NA; i++) { const a = (i / NA) * Math.PI * 2, t = j / NR, k = t < 0.6 ? t / 0.6 : 1 + (t - 0.6) / 0.4 * (0.06 + r() * 0.03), y = t < 0.6 ? 0 : -(t - 0.6) / 0.4 * 2.6;
      pos.push(LAND.cx + Math.cos(a) * LAND.rx * k, y, LAND.cz + Math.sin(a) * LAND.rz * k); uv.push(Math.cos(a) * k * 8, Math.sin(a) * k * 8); }
    for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, b, c, b, d, c); }   // üst yüz yukarı bakar
    const cape = new THREE.BufferGeometry(); cape.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cape.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); cape.setIndex(idx); cape.computeVertexNormals();
    const main = new THREE.PlaneGeometry(400, 220, 60, 30); main.rotateX(-Math.PI / 2); main.translate(0, 0, LAND.mainZ + 110);
    { const p = main.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), x = p.getX(i); p.setY(i, Math.max(0, z - LAND.mainZ - 30) * 0.25 + Math.sin(x * 0.04) * Math.max(0, z - LAND.mainZ - 30) * 0.05); } main.computeVertexNormals(); }
    const rocks: THREE.BufferGeometry[] = []; for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, s = 0.8 + r() * 1.8, d = new THREE.DodecahedronGeometry(s, 0); d.scale(1, 0.6, 1); rocks.push(at(d, LAND.cx + Math.cos(a) * LAND.rx * 1.05, -0.9, LAND.cz + Math.sin(a) * LAND.rz * 1.05)); }
    const path = new THREE.PlaneGeometry(3, 60); path.rotateX(-Math.PI / 2); path.translate(-2, 0.02, 22);   // kilise önünden ana karadaki yamacın eteğine kadar (önceden tarlanın ortasında bitiyordu)
    const tr: THREE.BufferGeometry[] = [], cr: THREE.BufferGeometry[] = []; for (let i = 0; i < 46; i++) { const x = (r() - 0.5) * 70, z = (r() - 0.5) * 70 - 4; if (Math.abs(x) < 16 && Math.abs(z) < 12) continue; if (Math.abs(x + 2) < 4 && z > -4) continue; if (!(z > LAND.mainZ || Math.hypot(x / LAND.rx, (z - LAND.cz) / LAND.rz) < 0.92)) continue; const s = 0.8 + r() * 0.5;
      tr.push(at(new THREE.CylinderGeometry(0.15 * s, 0.22 * s, 3 * s, 7), x, 1.5 * s, z)); for (let k = 0; k < 4; k++) cr.push(at(new THREE.IcosahedronGeometry((1.2 + r() * 0.6) * s, 2), x + (r() - 0.5) * 2 * s, (3.8 + r() * 1.4) * s, z + (r() - 0.5) * 2 * s)); }
    return { sea, cape, main, rocks: merge(rocks), path, tr: merge(tr), cr: merge(cr) };
  }, []);
  return <group>
    <group userData={{ noCast: true }}><mesh geometry={g.sea} material={m.sea} /></group>
    <mesh geometry={g.cape} material={m.grass} receiveShadow />
    <mesh geometry={g.main} material={m.grass} receiveShadow />
    <mesh geometry={g.rocks} material={m.rock} castShadow receiveShadow />
    <mesh geometry={g.path} receiveShadow><meshStandardMaterial color="#b9ab90" roughness={1} /></mesh>
    <mesh geometry={g.tr} material={m.wood} castShadow />
    <mesh geometry={g.cr} castShadow><meshStandardMaterial color="#4e7a35" roughness={0.95} /></mesh>
  </group>;
}

/* ===================== kilise ===================== */
export function Church({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const band: THREE.BufferGeometry[] = [], roof: THREE.BufferGeometry[] = [], plaster: THREE.BufferGeometry[] = [], stone: THREE.BufferGeometry[] = [], wood: THREE.BufferGeometry[] = [];
    const { x0, x1, hw, t, h } = CH, L = x1 - x0, cx = (x0 + x1) / 2;
    // kuzey duvarı; güney duvarı kapıyla; doğu duvarı (apsis açıklığıyla)
    band.push(at(bx(L + t, h, t, 1.4), cx, h / 2, -hw));
    const sd = CH.side, sx0 = sd.x - sd.hw, sx1 = sd.x + sd.hw;
    band.push(at(bx(sx0 - x0 + t / 2, h, t, 1.4), (x0 - t / 2 + sx0) / 2, h / 2, hw), at(bx(x1 + t / 2 - sx1, h, t, 1.4), (sx1 + x1 + t / 2) / 2, h / 2, hw), at(bx(sx1 - sx0, h - sd.h, t, 1.4), sd.x, sd.h + (h - sd.h) / 2, hw));
    for (const s of [-1, 1]) band.push(at(bx(t, h, hw - 2.4, 1.4), x1, h / 2, s * (2.4 + (hw - 2.4) / 2)));
    band.push(at(bx(t, h - 5, 4.8, 1.4), x1, 5 + (h - 5) / 2, 0));
    // alınlıklar (batı ve doğu) ve kiremit çatı
    const rise = 2.6; for (const ex of [x0, x1]) { const sh = new THREE.Shape(); sh.moveTo(-hw - t / 2, 0); sh.lineTo(hw + t / 2, 0); sh.lineTo(0, rise); sh.closePath(); const tri = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false }); tri.translate(0, 0, -t / 2); tri.rotateY(Math.PI / 2); const u = tri.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) / 1.4, u.getY(i) / 1.4); band.push(at(tri, ex, h, 0)); }
    for (const s of [-1, 1]) { const sl = Math.hypot(hw + 0.9, rise), slab = new THREE.BoxGeometry(L + 1.4, 0.18, sl); slab.rotateX(s * Math.atan2(rise, hw + 0.9)); roof.push(at(slab, cx, h + rise / 2 - 0.05, s * (hw + 0.9) / 2)); }
    // kubbe: çatı ortasında kare kaide, sekizgen kasnak, kubbe
    stone.push(at(bx(3.6, 1.6, 3.6, 1.4), 1.5, h + rise - 0.2, 0));
    const drum = new THREE.CylinderGeometry(1.5, 1.5, 1.6, 8); band.push(at(drum, 1.5, h + rise + 1.4, 0));
    roof.push(at(new THREE.SphereGeometry(1.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 1.5, h + rise + 2.2, 0));
    // üç apsis: ortada büyük, yanlarda küçük yarım silindir ve yarım külah
    for (const [z, r, hh] of [[0, 2.4, 5.2], [-3.2, 0.9, 4], [3.2, 0.9, 4]] as const) { const cyl = new THREE.CylinderGeometry(r, r, hh, 16, 1, false, 0, Math.PI); band.push(at(cyl, x1 + t / 2 - 0.05, hh / 2, z)); const cone = new THREE.ConeGeometry(r + 0.15, 1.2, 16, 1, false, 0, Math.PI); roof.push(at(cone, x1 + t / 2 - 0.05, hh + 0.6, z)); }
    // içeride sıva, sütunlar ve kemer kirişleri, tavan
    for (const s of [-1, 1]) plaster.push(at(new THREE.PlaneGeometry(L - t, h - 0.2).rotateY(s < 0 ? 0 : Math.PI), cx, h / 2, s * (hw - t / 2 - 0.01)));
    plaster.push(at(new THREE.PlaneGeometry(2 * hw - t, h - 0.2).rotateY(-Math.PI / 2), x1 - t / 2 - 0.01, h / 2, 0));
    { const c = new THREE.PlaneGeometry(L - t, 2 * hw - t); c.rotateX(Math.PI / 2); plaster.push(at(c, cx, h - 0.05, 0)); }
    for (const [x, z] of COLS) { stone.push(at(new THREE.CylinderGeometry(COL_R, COL_R + 0.04, 4.6, 14), x, 2.3, z), at(bx(0.8, 0.3, 0.8, 1), x, 4.75, z), at(bx(0.8, 0.25, 0.8, 1), x, 0.12, z)); }
    for (const s of [-1, 1]) stone.push(at(bx(L - t, 0.6, 0.5, 1.4), cx, 5.2, s * 1.6));
    { const iap = new THREE.CylinderGeometry(2.3, 2.3, 5, 16, 1, true, 0, Math.PI); plaster.push(at(iap, x1 + t / 2 - 0.1, 2.5, 0)); }
    // batı kapısı çevresinde kabartmalı çerçeve, güney kapısı söveleri; tahta kapı kanatları
    const { hw: dw, spring, r: R } = CH.door;
    for (const s of [-1, 1]) stone.push(at(bx(0.3, spring + 0.1, 0.3, 1), x0 - t / 2 - 0.12, (spring + 0.1) / 2, s * (dw + 0.15)));
    { const arc = new THREE.TorusGeometry(R + 0.15, 0.16, 8, 18, Math.PI); arc.rotateY(Math.PI / 2); stone.push(at(arc, x0 - t / 2 - 0.12, spring, 0)); }
    for (let k = 0; k < 9; k++) { const a = (k / 8) * Math.PI, ro = new THREE.SphereGeometry(0.09, 8, 6); stone.push(at(ro, x0 - t / 2 - 0.2, spring + Math.sin(a) * (R + 0.45), Math.cos(a) * (R + 0.45))); }
    for (const s of [-1, 1]) wood.push(at(new THREE.BoxGeometry(0.06, spring, dw - 0.05), x0 + 0.1, spring / 2, s * (dw / 2) + s * 0.15));
    for (const s of [-1, 1]) stone.push(at(bx(0.25, sd.h + 0.1, 0.3, 1), sd.x + s * (sd.hw + 0.12), (sd.h + 0.1) / 2, hw + t / 2 + 0.1));
    stone.push(at(bx(sd.hw * 2 + 0.5, 0.3, 0.3, 1), sd.x, sd.h + 0.1, hw + t / 2 + 0.1));
    const floor = new THREE.PlaneGeometry(L, 2 * hw); floor.rotateX(-Math.PI / 2); const fu = floor.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < fu.count; i++) fu.setXY(i, fu.getX(i) * L / 2, fu.getY(i) * hw); floor.translate(cx, 0.03, 0);
    return { band: merge(band), roof: merge(roof), plaster: merge(plaster), stone: merge(stone), wood: merge(wood), floor };
  }, []);
  return <group>
    <mesh geometry={g.band} material={m.band} castShadow receiveShadow />
    <mesh geometry={g.roof} material={m.roof} castShadow receiveShadow />
    <mesh geometry={g.plaster} material={m.plaster} receiveShadow />
    <mesh geometry={g.stone} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.wood} material={m.wood} castShadow />
    <mesh geometry={g.floor} material={m.floor} receiveShadow />
    <pointLight position={[0, 4.6, 0]} intensity={12} distance={14} decay={1.5} color="#fff1dc" />
  </group>;
}
/** Batı cephesi: taş taş; eksik taşlar (doldurulmadıysa) boş, doldurulmuşlar seçilen tonda; bulmaca sırasında eksikler hafif parlar */
export function Facade({ m, filled, active, onCell }: { m: Mats; filled: Record<string, string>; active: boolean; onCell: (c: number, r: number) => void }) {
  const cells = useMemo(() => { const out: { c: number; r: number }[] = []; for (let r = 0; r < FACADE.rows; r++) for (let c = 0; c < FACADE.cols; c++) if (toneOf(c, r)) out.push({ c, r }); return out; }, []);
  const missing = useMemo(() => new Set(MISSING.map(([c, r]) => key(c, r))), []);
  const ref = useRef<THREE.InstancedMesh>(null), geo = useMemo(() => new THREE.BoxGeometry(CH.t, FACADE.h - 0.02, FACADE.w - 0.02), []);
  useEffect(() => { const mm = ref.current; if (!mm) return; const o = new THREE.Object3D(), col = new THREE.Color();
    cells.forEach(({ c, r }, i) => { const k = key(c, r), miss = missing.has(k), tone = miss ? filled[k] : toneOf(c, r); o.position.set(CH.x0, cellY(r), cellZ(c)); o.scale.set(miss && !tone ? (active ? 0.35 : 0.0001) : 1, 1, 1); if (miss && !tone) o.position.x = CH.x0 + CH.t * 0.3; o.updateMatrix(); mm.setMatrixAt(i, o.matrix);
      col.set(miss && !tone ? '#f3c66b' : TONE_COL[(tone ?? 'acik') as 'acik' | 'koyu']); mm.setColorAt(i, col); });
    mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; }, [cells, missing, filled, active]);
  return <instancedMesh ref={ref} args={[geo, m.cell, cells.length]} castShadow receiveShadow
    onPointerDown={(e) => { if (!active || e.instanceId === undefined) return; e.stopPropagation(); const cc = cells[e.instanceId]; onCell(cc.c, cc.r); }} />;
}
