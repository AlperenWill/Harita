/**
 * İşhan — 3B modeller: vadide köy (yamaç, ceviz ağaçları, evler), haç planlı kilise (kesme taş duvarlar, kollarda beşik çatılar, on iki
 * köşeli kasnak ve konik külah, sonradan eklenmiş giriş yapıları), güneybatıda şapel kalıntısı. İçeride dört paye, kasnak ve freskli kubbe,
 * sütunlu apsis, fresk kalıntılı sıva, yazıt, zeminde kazı çukurları. Pencere altlarında çıkılan taşlar. Ölçüler dışında TEMSİLÎDİR.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, mountainGeo, stoneTex, weather } from '../shared/scenery';
import { BOUNDS, CHAPEL, CROSS, DOME, HOUSES, PEEKS, PORCHES, groundY, inChurch } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => { const n = g.index ? g.toNonIndexed() : g; if (!n.attributes.normal) n.computeVertexNormals(); if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; }))!;
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); return g; };
const H = 12, T = 1.2;

export interface Mats { stone: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial; fresco: THREE.MeshStandardMaterial; grass: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; earth: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('ishan-tas', ['#b4a487', '#c2b293', '#a8987c', '#9fa08a', '#bfae8e'], [26, 12], [50, 44]);
    const rf = canvasTex(256, 256, (g, r) => { g.fillStyle = '#6c6a5e'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 20) for (let x = (y / 20) % 2 ? -16 : 0; x < 256; x += 32) { const v = 90 + r() * 40 | 0; g.fillStyle = `rgb(${v},${v},${v - 8})`; g.fillRect(x + 1, y + 1, 30, 18); } });
    const pl = canvasTex(512, 512, (g, r) => { g.fillStyle = '#d8cdb6'; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 30; i++) { const x = r() * 512, y = r() * 512, w = 40 + r() * 120, h = 30 + r() * 90; g.fillStyle = `rgba(${[[150, 70, 50], [60, 80, 120], [170, 140, 80], [90, 110, 80]][(r() * 4) | 0].join(',')},${0.12 + r() * 0.18})`; g.fillRect(x, y, w, h); }
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,105,85,${0.2 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 50, 6 + r() * 30, r() * 3, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(80,40,30,.55)'; g.font = 'bold 22px serif'; for (let row = 0; row < 3; row++) { let x = 40; const y = 420 + row * 28; while (x < 460) { const k = (r() * 4) | 0; g.beginPath(); if (k === 0) { g.arc(x + 7, y - 9, 7, 0, 7); g.moveTo(x + 7, y - 2); g.lineTo(x + 7, y + 4); } else if (k === 1) { g.moveTo(x, y - 16); g.lineTo(x, y); g.arc(x + 6, y - 6, 6, Math.PI, 0, true); } else if (k === 2) { g.arc(x + 7, y - 8, 7, Math.PI * 0.2, Math.PI * 1.8); g.moveTo(x + 14, y - 16); g.lineTo(x + 14, y); } else { g.moveTo(x, y - 16); g.quadraticCurveTo(x + 14, y - 16, x + 7, y - 8); g.quadraticCurveTo(x, y, x + 14, y); } g.lineWidth = 3; g.strokeStyle = 'rgba(80,40,30,.6)'; g.stroke(); x += 22; } } });
    pl.repeat.set(1, 1);
    // kubbe freski: yıldızlı gök, ortada mücevherli haç, çevresinde dört melek (sade biçim)
    const fr = canvasTex(1024, 512, (g, r) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#2c4f7a'); gr.addColorStop(1, '#6a86a0'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
      for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,240,200,${0.3 + r() * 0.6})`; g.fillRect(r() * 1024, r() * 300, 2, 2); }
      g.fillStyle = '#d9b553'; g.fillRect(0, 0, 1024, 40);
      for (let k = 0; k < 4; k++) { const cx = 128 + k * 256, cy = 260; g.fillStyle = '#e8dcc4'; g.beginPath(); g.ellipse(cx, cy + 40, 30, 80, 0, 0, 7); g.fill(); g.fillStyle = '#d8b38a'; g.beginPath(); g.arc(cx, cy - 55, 20, 0, 7); g.fill(); g.strokeStyle = '#d9b553'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy - 55, 28, 0, 7); g.stroke();
        g.fillStyle = 'rgba(240,230,210,.9)'; g.beginPath(); g.moveTo(cx - 25, cy); g.quadraticCurveTo(cx - 110, cy - 60, cx - 90, cy + 70); g.closePath(); g.fill(); g.beginPath(); g.moveTo(cx + 25, cy); g.quadraticCurveTo(cx + 110, cy - 60, cx + 90, cy + 70); g.closePath(); g.fill(); }
      g.fillStyle = '#d9b553'; g.fillRect(500, 20, 24, 110); g.fillRect(470, 50, 84, 22); for (let i = 0; i < 10; i++) { g.fillStyle = ['#c0392b', '#2e86c1', '#27ae60'][i % 3]; g.beginPath(); g.arc(476 + (i % 5) * 18, 36 + Math.floor(i / 5) * 50, 4, 0, 7); g.fill(); }
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(200,190,170,${0.3 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * 1024, 200 + r() * 312, 8 + r() * 40, 6 + r() * 25, r() * 3, 0, 7); g.fill(); } });
    const gr = canvasTex(128, 128, (g, r) => { g.fillStyle = '#6e8a45'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${50 + r() * 60 | 0},${80 + r() * 60 | 0},${30 + r() * 20 | 0},.7)`; g.fillRect(r() * 128, r() * 128, 2, 3); } }); gr.repeat.set(1, 1);
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.6, roughness: 0.9 })),
      roof: new THREE.MeshStandardMaterial({ map: rf, roughness: 0.85, side: THREE.DoubleSide }),
      plaster: new THREE.MeshStandardMaterial({ map: pl, roughness: 0.95, side: THREE.DoubleSide }),
      fresco: new THREE.MeshStandardMaterial({ map: fr, roughness: 0.9, side: THREE.BackSide }),
      grass: new THREE.MeshStandardMaterial({ map: gr, roughness: 1 }),
      wood: new THREE.MeshStandardMaterial({ color: '#6d5038', roughness: 0.8 }),
      dark: new THREE.MeshStandardMaterial({ color: '#1e1a16', roughness: 1 }),
      earth: new THREE.MeshStandardMaterial({ color: '#7a6450', roughness: 1 }),
    };
  }, []);
}

/* ===================== arazi ===================== */
export function Terrain({ m }: { m: Mats }) {
  const g = useMemo(() => { const p = new THREE.PlaneGeometry(400, 400, 100, 100); p.rotateX(-Math.PI / 2); const a = p.attributes.position as THREE.BufferAttribute, uv = p.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < a.count; i++) { const x = a.getX(i), z = a.getZ(i), d = Math.max(Math.abs(x) - BOUNDS.x1, Math.abs(z) - BOUNDS.z1, 0); a.setY(i, groundY(x, z) + d * d * 0.02 + d * 0.4 + Math.sin(x * 0.07 + z * 0.05) * Math.min(3, d * 0.1) - 0.02); uv.setXY(i, uv.getX(i) * 60, uv.getY(i) * 60); }
    p.computeVertexNormals(); return p; }, []);
  const trees = useMemo(() => { const r = rng(17), tr: THREE.BufferGeometry[] = [], cr: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 40; i++) { const x = (r() - 0.5) * 120, z = (r() - 0.5) * 100; if (Math.abs(x) < 46 && Math.abs(z) < 34 && (inChurch(x, z, 6) || r() < 0.6)) continue; const s = 1 + r() * 0.6, y = groundY(x, z);
      tr.push(at(new THREE.CylinderGeometry(0.22 * s, 0.35 * s, 3.6 * s, 7), x, y + 1.8 * s, z)); for (let k = 0; k < 5; k++) cr.push(at(new THREE.IcosahedronGeometry((1.6 + r() * 0.8) * s, 2), x + (r() - 0.5) * 3 * s, y + (4.4 + r() * 1.8) * s, z + (r() - 0.5) * 3 * s)); }
    return { tr: merge(tr), cr: merge(cr) }; }, []);
  const mts = useMemo(() => [
    { p: [-260, -20, -120] as [number, number, number], g: mountainGeo(220, 260, 3, 0.85, '#5f6c45') }, { p: [240, -20, -160] as [number, number, number], g: mountainGeo(260, 300, 5, 0.8, '#5f6c45') },
    { p: [40, -20, -300] as [number, number, number], g: mountainGeo(260, 340, 7, 0.75, '#5f6c45') }, { p: [-120, -20, 280] as [number, number, number], g: mountainGeo(240, 260, 9, 0.85, '#66704a') }, { p: [220, -20, 260] as [number, number, number], g: mountainGeo(220, 240, 11, 0.85, '#66704a') },
  ], []);
  return <group>
    <group userData={{ noCast: true }}><mesh geometry={g} material={m.grass} receiveShadow />{mts.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>
    <mesh geometry={trees.tr} material={m.wood} castShadow />
    <mesh geometry={trees.cr} castShadow><meshStandardMaterial color="#4f6d33" roughness={0.95} /></mesh>
  </group>;
}

/* ===================== kilise ===================== */
const OUTLINE: [number, number][] = [[CROSS.x0, -CROSS.hw], [CROSS.tx0, -CROSS.hw], [CROSS.tx0, -CROSS.thw], [CROSS.tx1, -CROSS.thw], [CROSS.tx1, -CROSS.hw], [CROSS.x1, -CROSS.hw], [CROSS.x1, CROSS.hw], [CROSS.tx1, CROSS.hw], [CROSS.tx1, CROSS.thw], [CROSS.tx0, CROSS.thw], [CROSS.tx0, CROSS.hw], [CROSS.x0, CROSS.hw]];
export function Church({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const stone: THREE.BufferGeometry[] = [], roof: THREE.BufferGeometry[] = [], plaster: THREE.BufferGeometry[] = [], dark: THREE.BufferGeometry[] = [];
    const wins = PEEKS.map((p) => p.win);
    // çevre duvarları: her kenar bir duvar; bakılan pencerelerde boşluk
    for (let i = 0; i < OUTLINE.length; i++) { const [ax, az] = OUTLINE[i], [bx2, bz] = OUTLINE[(i + 1) % OUTLINE.length], L = Math.hypot(bx2 - ax, bz - az), ux = (bx2 - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux;
      const midx = (ax + bx2) / 2, midz = (az + bz) / 2, inward = inChurch(midx + nx * 1.5, midz + nz * 1.5) ? 1 : -1, rot = -Math.atan2(uz, ux);
      const holes = wins.filter(([wx, , wz]) => Math.abs((wx - ax) * nx + (wz - az) * nz) < 0.2).map(([wx, , wz]) => (wx - ax) * ux + (wz - az) * uz).filter((t) => t > 0 && t < L).sort((p, q) => p - q);
      const piece = (t0: number, t1: number, y0: number, y1: number) => { if (t1 - t0 < 0.01 || y1 - y0 < 0.01) return; const a0 = t0 === 0 ? -T / 2 : t0, a1 = t1 === L ? L + T / 2 : t1, b = bx(a1 - a0, y1 - y0, T, 3), c = (a0 + a1) / 2; b.rotateY(rot); b.translate(ax + ux * c, y0 + (y1 - y0) / 2, az + uz * c); stone.push(b); };
      let t = 0; for (const h of holes) { piece(t, h - 0.5, 0, H); piece(h - 0.5, h + 0.5, 0, 2.6); piece(h - 0.5, h + 0.5, 4.3, H); t = h + 0.5; } piece(t, L, 0, H);
      // iç sıva yüzü (pencere boşluğunu kapatmadan, yukarıda ve aşağıda)
      const pl = (t0: number, t1: number, y0: number, y1: number) => { if (t1 - t0 < 0.05) return; const p = new THREE.PlaneGeometry(t1 - t0, y1 - y0); p.rotateY(rot); const c = (t0 + t1) / 2; p.translate(ax + ux * c + nx * inward * (T / 2 + 0.02), y0 + (y1 - y0) / 2, az + uz * c + nz * inward * (T / 2 + 0.02)); plaster.push(p); };
      t = 0; for (const h of holes) { pl(t, h - 0.5, 0, H - 0.2); pl(h - 0.5, h + 0.5, 0, 2.6); pl(h - 0.5, h + 0.5, 4.3, H - 0.2); t = h + 0.5; } pl(t, L, 0, H - 0.2);
      // dış yüzde süs: kör kemer dizisi (ince taş çerçeveler) ve dar pencereler
      const n = Math.max(1, Math.floor(L / 3.2)); for (let k = 0; k < n; k++) { const c = (k + 0.5) * (L / n); if (holes.some((h) => Math.abs(h - c) < 1.2)) continue; const o = -inward * (T / 2 + 0.06);
        for (const s of [-1, 1]) { const col = new THREE.BoxGeometry(0.22, 7, 0.14); col.rotateY(rot); col.translate(ax + ux * (c + s * 1.1) + nx * o, 4.6, az + uz * (c + s * 1.1) + nz * o); stone.push(col); }
        const arc = new THREE.TorusGeometry(1.1, 0.11, 6, 12, Math.PI); arc.rotateY(rot); arc.translate(ax + ux * c + nx * o, 8.1, az + uz * c + nz * o); stone.push(arc);
        if (k % 2 === 0) { const w = new THREE.PlaneGeometry(0.5, 1.8); w.rotateY(rot + (inward > 0 ? Math.PI : 0)); w.translate(ax + ux * c + nx * (o * 1.05), 5.6, az + uz * c + nz * (o * 1.05)); dark.push(w); } } }
    // çatılar: kollarda beşik çatı (taş alınlıklar), geçişte kasnak ve külah
    const gableArm = (x0: number, x1: number, z0: number, z1: number, alongX: boolean, ends: number[] = [-1, 1]) => { const w = alongX ? z1 - z0 : x1 - x0, L = alongX ? x1 - x0 : z1 - z0, rise = w * 0.32, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      for (const s of [-1, 1]) { const slab = new THREE.BoxGeometry(L + 0.8, 0.25, Math.hypot(w / 2 + 0.6, rise)); slab.rotateX(s * Math.atan2(rise, w / 2 + 0.6)); if (!alongX) slab.rotateY(Math.PI / 2); slab.translate(cx + (alongX ? 0 : s * (w / 4 + 0.3)), H + rise / 2, cz + (alongX ? s * (w / 4 + 0.3) : 0)); roof.push(slab); }
      for (const e of ends) { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, rise); sh.closePath(); const tri = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }); tri.translate(0, 0, -T / 2); if (alongX) tri.rotateY(Math.PI / 2); tri.translate(alongX ? (e < 0 ? x0 + T / 2 : x1 - T / 2) : cx, H, alongX ? cz : (e < 0 ? z0 + T / 2 : z1 - T / 2)); stone.push(tri); } };
    gableArm(CROSS.x0 - 0.6, CROSS.tx0, -CROSS.hw - 0.6, CROSS.hw + 0.6, true); gableArm(CROSS.tx1, CROSS.x1 + 0.6, -CROSS.hw - 0.6, CROSS.hw + 0.6, true);
    { const S2 = (CROSS.tx1 - CROSS.tx0) / 2 + 0.2; gableArm(CROSS.tx0 - 0.6, CROSS.tx1 + 0.6, -CROSS.thw - 0.6, -S2, false, [-1]); gableArm(CROSS.tx0 - 0.6, CROSS.tx1 + 0.6, S2, CROSS.thw + 0.6, false, [1]); }   // geçişin üstü açık: kubbe görünsün
    // geçiş üstünde kare kaide, on iki köşeli kasnak (pencereli), konik külah
    { const S2 = (CROSS.tx1 - CROSS.tx0) / 2 + 0.2, bh = DOME.drum0 - H + 1.5, by = H + bh / 2 - 0.5;   // içi boş kare kaide
      for (const s2 of [-1, 1]) { stone.push(at(bx(S2 * 2, bh, 0.8, 3), CROSS.cx, by, s2 * (S2 - 0.4)), at(bx(0.8, bh, S2 * 2, 3), CROSS.cx + s2 * (S2 - 0.4), by, 0)); }
      const sq = new THREE.Shape(); sq.moveTo(-S2, -S2); sq.lineTo(S2, -S2); sq.lineTo(S2, S2); sq.lineTo(-S2, S2); sq.closePath(); const hole = new THREE.Path(); hole.absarc(0, 0, DOME.r, 0, Math.PI * 2, false); sq.holes.push(hole);
      for (const yy of [H - 0.05, DOME.drum0]) { const ring = new THREE.ShapeGeometry(sq, 24); ring.rotateX(-Math.PI / 2); ring.translate(CROSS.cx, yy, 0); plaster.push(ring); } }
    const drum = new THREE.CylinderGeometry(DOME.r + 0.6, DOME.r + 0.6, DOME.drum1 - DOME.drum0, 12, 1, true); const du = drum.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < du.count; i++) du.setXY(i, du.getX(i) * 8, du.getY(i) * 2); stone.push(at(drum, CROSS.cx, (DOME.drum0 + DOME.drum1) / 2, 0));
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2 + Math.PI / 12, w = new THREE.PlaneGeometry(0.6, 2.2); w.rotateY(Math.PI / 2 - a); w.translate(CROSS.cx + Math.cos(a) * (DOME.r + 0.62), (DOME.drum0 + DOME.drum1) / 2, Math.sin(a) * (DOME.r + 0.62)); dark.push(w);
      const ar = new THREE.TorusGeometry(0.55, 0.08, 5, 10, Math.PI); ar.rotateY(Math.PI / 2 - a); ar.translate(CROSS.cx + Math.cos(a) * (DOME.r + 0.68), (DOME.drum0 + DOME.drum1) / 2 + 1.1, Math.sin(a) * (DOME.r + 0.68)); stone.push(ar); }
    const cone = at(new THREE.ConeGeometry(DOME.r + 1.6, 6, 12, 1, true), CROSS.cx, DOME.drum1 - 0.4 + 3, 0);   // külah: yalnız dış yüz (içeriden kubbe görünür)
    roof.push(at(new THREE.CylinderGeometry(DOME.r + 1.6, DOME.r + 1.6, 0.3, 12, 1, true), CROSS.cx, DOME.drum1 - 0.4, 0));   // saçak halkası (içi açık)
    // sonradan eklenen giriş yapıları (alçak, tek eğimli çatılı) ve şapel kalıntısı
    for (const [x0, z0, x1, z1] of PORCHES) { const w = x1 - x0, d = z1 - z0; stone.push(at(bx(w, 5, d, 3), (x0 + x1) / 2, 2.5, (z0 + z1) / 2)); const rf = new THREE.BoxGeometry(w + 0.6, 0.22, d + 0.6); roof.push(at(rf, (x0 + x1) / 2, 5.2, (z0 + z1) / 2)); }
    { const [x0, z0, x1, z1] = CHAPEL, w = x1 - x0, d = z1 - z0; for (const [px, pz, sw, sd, hh] of [[x0 + 0.4, (z0 + z1) / 2, 0.8, d, 4], [x1 - 0.4, (z0 + z1) / 2, 0.8, d, 3.2], [(x0 + x1) / 2, z0 + 0.4, w, 0.8, 3.6]] as const) stone.push(at(bx(sw, hh, sd, 3), px, hh / 2, pz));
      for (const s of [-1, 1]) stone.push(at(bx(w / 2 - 0.8, 2.4, 0.8, 3), (x0 + x1) / 2 + s * (w / 4 + 0.4), 1.2, z1 - 0.4)); }
    return { stone: merge(stone), roof: merge(roof), plaster: merge(plaster), dark: merge(dark), cone };
  }, []);
  return <group>
    <mesh geometry={g.stone} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.roof} material={m.roof} castShadow receiveShadow />
    <mesh geometry={g.cone} castShadow><meshStandardMaterial map={m.roof.map} roughness={0.85} side={THREE.FrontSide} /></mesh>
    <mesh geometry={g.plaster} material={m.plaster} receiveShadow />
    <mesh geometry={g.dark} material={m.dark} />
  </group>;
}
/** İç: zemin, dört paye ve kemerler, kasnak içi ve freskli kubbe, sütunlu apsis, kazı çukurları */
export function Interior({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const stone: THREE.BufferGeometry[] = [], plaster: THREE.BufferGeometry[] = [], earth: THREE.BufferGeometry[] = [], wood: THREE.BufferGeometry[] = [];
    const floor = new THREE.Shape(); OUTLINE.forEach(([x, z], i) => (i ? floor.lineTo(x, -z) : floor.moveTo(x, -z))); floor.closePath(); const fl = new THREE.ShapeGeometry(floor); fl.rotateX(-Math.PI / 2); fl.translate(0, 0.03, 0); const fu = fl.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < fu.count; i++) fu.setXY(i, fu.getX(i) / 4, fu.getY(i) / 4); stone.push(fl);
    const P = 3.4, PH = H + 1; for (const sx of [-1, 1]) for (const sz of [-1, 1]) stone.push(at(bx(1.6, PH, 1.6, 3), CROSS.cx + sx * P, PH / 2, sz * P));
    for (const s of [-1, 1]) { stone.push(at(bx(P * 2 + 1.6, 1.2, 1.6, 3), CROSS.cx, PH - 0.6, s * P), at(bx(1.6, 1.2, P * 2 + 1.6, 3), CROSS.cx + s * P, PH - 0.6, 0)); }   // kemer kirişleri yüksekte: pencereden kubbe görünür
    const drumIn = new THREE.CylinderGeometry(DOME.r, DOME.r, DOME.drum1 - H + 0.2, 12, 1, true); plaster.push(at(drumIn, CROSS.cx, (H + DOME.drum1) / 2, 0));
    // apsis: doğu duvarının iç yüzüne yaslı yarım silindir, yarım kubbe, sütunlar
    const AR = CROSS.hw - 1, ax = CROSS.x1 - T / 2 - 0.05, ac = ax - AR, apse = new THREE.CylinderGeometry(AR, AR, 8.5, 20, 1, true, 0, Math.PI); plaster.push(at(apse, ac, 4.25, 0));   // yarım daire doğuya taşar, içi batıya bakar
    const conch = new THREE.SphereGeometry(AR, 20, 10, 0, Math.PI, 0, Math.PI / 2); conch.rotateY(Math.PI / 2); plaster.push(at(conch, ac, 8.5, 0));
    for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k / 6) * Math.PI, x = ac + Math.cos(a) * (AR - 0.7), z = Math.sin(a) * (AR - 0.7); stone.push(at(new THREE.CylinderGeometry(0.22, 0.26, 4.2, 10), x, 2.1, z), at(bx(0.6, 0.3, 0.6, 1), x, 4.35, z)); }
    stone.push(at(bx(1.4, 1, 2.4, 1), ac + 1.2, 0.5, 0));
    // kazı: batı kolunda çukurlar, taş temeller, tahta yürüme yolu ve korkuluk
    for (const [x, z, w, d] of [[-11, -1.5, 4, 3], [-5.5, 2, 3, 2.4], [-13.5, 2.6, 2.4, 1.6]] as const) { earth.push(at(bx(w, 0.06, d, 1), x, 0.04, z)); for (let k = 0; k < 6; k++) stone.push(at(bx(0.5 + Math.random() * 0.4, 0.3, 0.4, 1), x - w / 2 + 0.3 + k * (w / 6), 0.12, z + (k % 2 ? d / 2 - 0.3 : -d / 2 + 0.3))); }
    wood.push(at(bx(14, 0.08, 1.2, 1), -9, 0.25, -3.8)); for (let x = -16; x <= -2; x += 1.4) wood.push(at(new THREE.BoxGeometry(0.06, 0.9, 0.06), x, 0.7, -3.2)); wood.push(at(new THREE.BoxGeometry(14, 0.05, 0.05), -9, 1.15, -3.2));
    return { stone: merge(stone), plaster: merge(plaster), earth: merge(earth), wood: merge(wood) };
  }, []);
  return <group>
    <mesh geometry={g.stone} material={m.stone} receiveShadow castShadow />
    <mesh geometry={g.plaster} material={m.plaster} receiveShadow />
    <mesh geometry={g.earth} material={m.earth} receiveShadow />
    <mesh geometry={g.wood} material={m.wood} />
    <mesh position={[CROSS.cx, DOME.drum1, 0]} scale={[1, 0.7, 1]} material={m.fresco}><sphereGeometry args={[DOME.r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    <pointLight position={[CROSS.cx, 7, 0]} intensity={30} distance={26} decay={1.4} color="#ffe9cc" />
    <pointLight position={[-8, 6, 0]} intensity={18} distance={18} decay={1.4} color="#ffe9cc" />
    <pointLight position={[CROSS.x1 - 4, 5, 0]} intensity={14} distance={12} decay={1.4} color="#ffe9cc" />
    <pointLight position={[CROSS.cx, DOME.drum1 - 1, 0]} intensity={16} distance={10} decay={1.4} color="#fff2dc" />
  </group>;
}
/** Pencere altlarındaki çıkma taşları ve köy evleri */
export function Village({ m }: { m: Mats }) {
  const g = useMemo(() => { const st: THREE.BufferGeometry[] = [], wd: THREE.BufferGeometry[] = [], rf: THREE.BufferGeometry[] = [];
    for (const p of PEEKS) { const b = new THREE.DodecahedronGeometry(0.75, 0); b.scale(1.1, 0.55, 0.9); st.push(at(b, p.stand[0], 0.35, p.stand[1])); }
    for (const [x0, z0, x1, z1] of HOUSES) { const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, y = groundY(cx, cz); st.push(at(bx(w, 2.6, d, 3), cx, y + 1.3, cz)); wd.push(at(bx(w + 0.4, 2.4, d + 0.4, 2), cx, y + 3.8, cz)); const r = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); r.rotateY(Math.PI / 4); r.scale(w + 1.6, 2, d + 1.6); rf.push(at(r, cx, y + 6, cz)); }
    return { st: merge(st), wd: merge(wd), rf: merge(rf) }; }, []);
  return <group>
    <mesh geometry={g.st} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.wd} material={m.wood} castShadow receiveShadow />
    <mesh geometry={g.rf} material={m.roof} castShadow receiveShadow />
  </group>;
}
