/**
 * Anıtkabir iç mekânları (çizim): Şeref Holü kabuğu ve içi (v2), Atatürk ve Kurtuluş Savaşı Müzesi.
 * Ölçü ve kaynak notları: interior.ts. Müze yalnızca ziyaretçi içerideyken çizilir (dışarıda GPU harcamaz).
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { MAUSOLEUM, PODIUM_H, mausoleumColumns, type V3 } from './layout';
import { COL_Z, DOORS, HALL, INNER, LIBRARY, MUSE1, MUSE2, PANORAMAS, SARCOPHAGUS, SARC_SIZE, SHOWCASES, VAULTS, arcOf, pierXs, torchPositions, type Level, type Panorama, type Showcase, type Vault } from './interior';
import type { Materials } from './materials';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 14);
const B = ({ p, s, m }: { p: V3; s: V3; m: THREE.Material }) => <mesh geometry={BOX} material={m} position={p} scale={s} castShadow receiveShadow />;
const _o = new THREE.Object3D();
function Inst({ geo = BOX, mat, items }: { geo?: THREE.BufferGeometry; mat: THREE.Material; items: { p: V3; s: V3; r?: number }[] }) {
  const mesh = useMemo(() => { const m = new THREE.InstancedMesh(geo, mat, items.length); items.forEach((it, i) => { _o.position.set(...it.p); _o.rotation.set(0, it.r ?? 0, 0); _o.scale.set(...it.s); _o.updateMatrix(); m.setMatrixAt(i, _o.matrix); }); m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.castShadow = m.receiveShadow = true; return m; }, [geo, mat, items]);
  useEffect(() => () => { mesh.dispose(); }, [mesh]);
  return <primitive object={mesh} />;
}
/** Çapraz tonoz: w (x) × d (z) dikdörtgen bölme, tepesi `rise` m yukarıda; içi aşağı bakar */
function groinVault(w: number, d: number, rise: number, n = 14) {
  const g = new THREE.PlaneGeometry(w, d, n, n); g.rotateX(Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2), z = p.getZ(i) / (d / 2); p.setY(i, rise * Math.max(Math.sqrt(Math.max(0, 1 - z * z)), Math.sqrt(Math.max(0, 1 - x * x)))); }
  g.computeVertexNormals(); return g;
}
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function rnd(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

/* =========================================================
   ŞEREF HOLÜ — dış kabuk (sütun hattında; yan cephede sütun araları pencere)
   ========================================================= */
export function HallShell({ m }: { m: Materials }) {
  const { front, x0, x1, door, window: win } = HALL, H = MAUSOLEUM.colH, y0 = PODIUM_H, hz = COL_Z;
  const sideCols = useMemo(() => mausoleumColumns().filter((c) => Math.abs(Math.abs(c[2]) - hz) < 0.01 && c[0] > front - 1).map((c) => c[0]).sort((a, b) => a - b), [hz, front]);
  const bays = useMemo(() => { const xs = [front, ...sideCols.filter((x) => x > front + 0.8 && x < x1)], out: { a: number; b: number }[] = []; for (let i = 0; i < xs.length - 1; i++) out.push({ a: xs[i] + (i === 0 ? 0 : 0.75), b: xs[i + 1] - 0.75 }); out.push({ a: xs[xs.length - 1] + 0.75, b: x1 + 1.2 }); return out; }, [sideCols, front, x1]);
  const win3 = useMemo(() => { const glass: { p: V3; s: V3 }[] = [], para: { p: V3; s: V3 }[] = [], band: { p: V3; s: V3 }[] = [], mull: { p: V3; s: V3 }[] = [];
    for (const s of [-1, 1]) for (const b of bays) { const L = b.b - b.a, cx = (b.a + b.b) / 2, z = s * hz;
      para.push({ p: [cx, y0 + 0.6, z], s: [L, 1.2, 0.6] }); band.push({ p: [cx, y0 + 13.6, z], s: [L, 1.6, 0.6] }); glass.push({ p: [cx, y0 + 7.0, z], s: [L, 11.6, 0.05] });
      for (let k = 1; k < 3; k++) mull.push({ p: [b.a + (L * k) / 3, y0 + 7.0, z], s: [0.12, 11.6, 0.14] });
      for (const yy of [4.2, 8.6]) mull.push({ p: [cx, y0 + yy, z], s: [L, 0.12, 0.14] }); }
    return { glass, para, band, mull }; }, [bays, hz, y0]);
  const segs = [[-hz, -door.w / 2], [door.w / 2, hz]];
  const fx = (front + x0) / 2;
  return (
    <group>
      {/* ön duvar: ortada tek büyük kapı (yan giriş yok) */}
      {segs.map(([a, b], i) => <B key={i} p={[fx, y0 + H / 2, (a + b) / 2]} s={[x0 - front, H, b - a]} m={m.travertineLight} />)}
      <B p={[fx, y0 + door.h + (H - door.h) / 2, 0]} s={[x0 - front, H - door.h, door.w]} m={m.travertineLight} />
      {/* içe açık duran iki bronz kanat: dikey kasa, yatay panel çıtaları */}
      {[-1, 1].map((s) => <group key={'k' + s} position={[x0, y0, s * (door.w / 2 - 0.1)]}>
        <B p={[door.w / 4, door.h / 2, 0]} s={[door.w / 2, door.h, 0.16]} m={m.bronze} />
        {[0.12, 0.3, 0.5, 0.7, 0.88].map((k) => <B key={k} p={[door.w / 4, door.h * k, -s * 0.1]} s={[door.w / 2 - 0.3, 0.16, 0.06]} m={m.bronze} />)}
        {[0.08, 0.92].map((k) => <B key={'v' + k} p={[(door.w / 2) * k, door.h / 2, -s * 0.1]} s={[0.16, door.h - 0.4, 0.06]} m={m.bronze} />)}
      </group>)}
      {/* yan cephe: sütun araları korkuluk + bronz kayıtlı yüksek pencere + üst kuşak (sütunla hol arasında koridor YOK) */}
      <Inst mat={m.travertineLight} items={win3.para} /><Inst mat={m.travertineLight} items={win3.band} />
      <Inst mat={m.glass} items={win3.glass} /><Inst mat={m.bronze} items={win3.mull} />
      {/* arka duvar: ortada Ankara Kalesi'ne bakan büyük pencere */}
      {[-1, 1].map((s) => <B key={'a' + s} p={[x1 + 0.6, y0 + H / 2, s * (win.halfW + (hz - win.halfW) / 2)]} s={[1.2, H, hz - win.halfW]} m={m.travertineLight} />)}
      <B p={[x1 + 0.6, y0 + win.y0 / 2, 0]} s={[1.2, win.y0, win.halfW * 2]} m={m.travertineLight} />
      <B p={[x1 + 0.6, y0 + win.y1 + (H - win.y1) / 2, 0]} s={[1.2, H - win.y1, win.halfW * 2]} m={m.travertineLight} />
    </group>
  );
}

/* =========================================================
   ŞEREF HOLÜ — iç
   ========================================================= */
export function HallInterior({ m, night, lite }: { m: Materials; night: boolean; lite: boolean }) {
  const { x0, x1, halfW, nave, pierZ, pier, floorY, ceilY, galleryY, vaultRise, niche, window: win, beams, door } = HALL, len = x1 - x0, cx = (x0 + x1) / 2;
  const xs = useMemo(() => pierXs(), []);
  const bayW = len / HALL.bays, galW = halfW - pierZ - pier / 2, galC = pierZ + pier / 2 + galW / 2;
  const vault = useMemo(() => groinVault(bayW, galW, vaultRise), [bayW, galW, vaultRise]);
  const items = useMemo(() => {
    const piers: { p: V3; s: V3 }[] = [], beam: { p: V3; s: V3 }[] = [], tStem: { p: V3; s: V3 }[] = [], tBowl: { p: V3; s: V3 }[] = [], tFlame: { p: V3; s: V3 }[] = [], bars: { p: V3; s: V3 }[] = [];
    for (const x of xs.slice(1, -1)) for (const s of [-1, 1]) piers.push({ p: [x, floorY + (galleryY - floorY) / 2, s * pierZ], s: [pier, galleryY - floorY, pier] });
    for (let i = 1; i <= beams; i++) { const x = x0 + (i * len) / (beams + 1); if (x > x1 - niche.depth) continue; beam.push({ p: [x, ceilY - 0.4, 0], s: [0.45, 0.8, nave * 2] }); }
    for (const t of torchPositions()) { const s = Math.sign(t[2]); tStem.push({ p: [t[0], t[1] - 0.6, t[2]], s: [0.12, 1.6, 0.12] }); tBowl.push({ p: [t[0], t[1] + 0.3, t[2] - s * 0.05], s: [0.32, 0.35, 0.32] }); tFlame.push({ p: [t[0], t[1] + 0.75, t[2] - s * 0.05], s: [0.22, 0.5, 0.22] }); }
    for (let i = -3; i <= 3; i++) bars.push({ p: [x1 - 0.15, floorY + (win.y0 + win.y1) / 2, i * ((win.halfW * 2) / 7)], s: [0.12, win.y1 - win.y0, 0.12] });
    for (let k = 1; k <= 4; k++) bars.push({ p: [x1 - 0.15, floorY + win.y0 + (k * (win.y1 - win.y0)) / 5, 0], s: [0.12, 0.12, win.halfW * 2] });
    return { piers, beam, tStem, tBowl, tFlame, bars };
  }, [xs, floorY, galleryY, pierZ, pier, beams, len, x0, x1, niche.depth, ceilY, nave, win]);
  const vaults = useMemo(() => { const out: { p: V3 }[] = []; for (let i = 0; i < HALL.bays; i++) for (const s of [-1, 1]) out.push({ p: [x0 + bayW * (i + 0.5), galleryY, s * galC] }); return out; }, [x0, bayW, galleryY, galC]);
  const flameMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffb347' }), []);
  const sarcY = floorY + 0.6;
  return (
    <group>
      {/* zemin: orta hol kilim desenli kırmızı mermer, galeriler krem mermer */}
      <mesh geometry={BOX} material={m.hallFloor} position={[cx, floorY + 0.02, 0]} scale={[len, 0.04, (pierZ + pier / 2) * 2]} receiveShadow />
      {[-1, 1].map((s) => <mesh key={s} geometry={BOX} material={m.gallery} position={[cx, floorY + 0.02, s * galC]} scale={[len, 0.04, galW]} receiveShadow />)}
      {/* girişi işaretleyen, siyah mermerle çevrili enine kırmızı dikdörtgen */}
      <group position={[x0 + 1.9, floorY + 0.045, 0]}>
        <mesh geometry={BOX} material={m.dark} scale={[3.2, 0.01, door.w + 1.6]} /><mesh geometry={BOX} material={m.redMarble} position={[0, 0.006, 0]} scale={[2.7, 0.01, door.w + 1.1]} />
      </group>
      {/* duvar kaplamaları: kaplan postu beyaz mermer + yeşil mermer kuşak */}
      {/* giriş duvarı kaplaması: üç kapı açıklığı boş kalır (önceden tek levha kapıları kapatıyordu) */}
      {([[-halfW, -door.w / 2], [door.w / 2, halfW]] as const).map(([a, b], i) => <B key={'fw' + i} p={[x0 + 0.03, floorY + (ceilY - floorY) / 2, (a + b) / 2]} s={[0.06, ceilY - floorY, b - a]} m={m.tiger} />)}
      <B p={[x0 + 0.03, floorY + door.h + (ceilY - floorY - door.h) / 2, 0]} s={[0.06, ceilY - floorY - door.h, door.w]} m={m.tiger} />
      {[-1, 1].map((s) => <B key={'bw' + s} p={[x1 - 0.03, floorY + (galleryY + vaultRise - floorY) / 2, s * galC]} s={[0.06, galleryY + vaultRise - floorY, galW]} m={m.tiger} />)}
      {[-1, 1].map((s) => <B key={'pw' + s} p={[cx, floorY + 0.6, s * (halfW - 0.05)]} s={[len, 1.2, 0.1]} m={m.tiger} />)}
      {/* paye sıraları + kemer üstü kiriş + üst duvar (orta holün yan duvarı) */}
      <Inst mat={m.tiger} items={items.piers} />
      {[-1, 1].map((s) => <B key={'lt' + s} p={[cx, galleryY + 0.45, s * pierZ]} s={[len - niche.depth, 0.9, pier]} m={m.tiger} />)}
      {[-1, 1].map((s) => <B key={'cw' + s} p={[cx, (galleryY + 0.9 + ceilY) / 2, s * pierZ]} s={[len, ceilY - galleryY - 0.9, pier]} m={m.tiger} />)}
      {/* galeriler: dokuzar çapraz tonoz (mozaik) */}
      {vaults.map((v, i) => <mesh key={i} geometry={vault} material={m.mosaic} position={v.p} />)}
      {/* orta hol tavanı: 27 kiriş ve aralarında mozaik */}
      <mesh geometry={BOX} material={m.mosaic} position={[cx, ceilY + 0.05, 0]} scale={[len, 0.1, nave * 2 + pier]} />
      <Inst mat={m.mosaic} items={items.beam} />
      {/* niş: beyaz Afyon mermeri; içinde büyük pencere, bronz parmaklık ve sembolik lahit */}
      {[-1, 1].map((s) => <B key={'n' + s} p={[x1 - niche.depth / 2, floorY + niche.h / 2, s * (niche.halfW + 0.3)]} s={[niche.depth, niche.h, 0.6]} m={m.whiteMarble} />)}
      <B p={[x1 - niche.depth / 2, floorY + niche.h + (ceilY - floorY - niche.h) / 2, 0]} s={[niche.depth, ceilY - floorY - niche.h, niche.halfW * 2 + 1.2]} m={m.whiteMarble} />
      {[-1, 1].map((s) => <B key={'nw' + s} p={[x1 - 0.03, floorY + niche.h / 2, s * (win.halfW + (niche.halfW - win.halfW) / 2)]} s={[0.06, niche.h, niche.halfW - win.halfW]} m={m.whiteMarble} />)}
      <mesh geometry={BOX} material={m.whiteMarble} position={[x1 - niche.depth / 2, floorY + 0.03, 0]} scale={[niche.depth, 0.06, niche.halfW * 2]} receiveShadow />
      <mesh geometry={BOX} material={m.hallWindow} position={[x1 + 0.4, floorY + (win.y0 + win.y1) / 2, 0]} scale={[0.05, win.y1 - win.y0, win.halfW * 2]} />
      <Inst mat={m.bronze} items={items.bars} />
      <B p={[SARCOPHAGUS[0], floorY + 0.15, 0]} s={[3.8, 0.3, 8.8]} m={m.whiteMarble} />
      <B p={[SARCOPHAGUS[0], floorY + 0.45, 0]} s={[3.0, 0.3, 8.0]} m={m.whiteMarble} />
      <B p={[SARCOPHAGUS[0], sarcY + SARC_SIZE[1] / 2, 0]} s={SARC_SIZE} m={m.redMarble} />
      {/* 12 bronz meşale */}
      <Inst geo={CYL} mat={m.bronze} items={items.tStem} /><Inst geo={CYL} mat={m.bronze} items={items.tBowl} /><Inst geo={CYL} mat={flameMat} items={items.tFlame} />
      <pointLight position={[cx - 8, floorY + 10, 0]} color="#ffdcae" intensity={night ? 1400 : 900} distance={60} decay={2} />
      <pointLight position={[SARCOPHAGUS[0] - 4, floorY + 7, 0]} color="#ffe6c0" intensity={600} distance={30} decay={2} />
      {!lite && [-1, 1].map((s) => <pointLight key={s} position={[cx, floorY + 5, s * galC]} color="#ffe2b8" intensity={night ? 600 : 300} distance={34} decay={2} />)}
    </group>
  );
}

/* =========================================================
   MÜZE
   ========================================================= */
/** Misak-ı Millî Kulesi'ndeki müze kapısı (dışarıdan görünür) */
export function MuseumDoor({ m }: { m: Materials }) {
  const d = DOORS[0];
  return <group position={[d.at[0], 0, d.at[1] + 0.25]}>   {/* revakın arka duvarının önünde */}
    <mesh geometry={BOX} material={m.bronze} position={[0, 1.9, -0.05]} scale={[2.6, 3.8, 0.12]} />
    <mesh geometry={BOX} material={m.travertineDark} position={[0, 4.05, -0.02]} scale={[3.4, 0.5, 0.3]} />
  </group>;
}
/** Oda kabuğu: içten görünen kutu */
function Room({ x0, x1, z0, z1, y, h, wall, floor, ceil }: { x0: number; x1: number; z0: number; z1: number; y: number; h: number; wall: THREE.Material; floor: THREE.Material; ceil: THREE.Material }) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
  return <group>
    <mesh geometry={BOX} material={floor} position={[cx, y - 0.05, cz]} scale={[w, 0.1, d]} receiveShadow />
    <mesh geometry={BOX} material={ceil} position={[cx, y + h + 0.05, cz]} scale={[w, 0.1, d]} />
    {[[cx, z0 - 0.15, w, 0.3], [cx, z1 + 0.15, w, 0.3]].map(([x, z, a, b], i) => <mesh key={i} geometry={BOX} material={wall} position={[x, y + h / 2, z]} scale={[a, h, b]} receiveShadow />)}
    {[[x0 - 0.15, cz], [x1 + 0.15, cz]].map(([x, z], i) => <mesh key={'x' + i} geometry={BOX} material={wall} position={[x, y + h / 2, z]} scale={[0.3, h, d]} receiveShadow />)}
  </group>;
}
/** Kapı (bronz kanat + üstünde yazı levhası) */
function DoorSign({ at, facing, label, y }: { at: [number, number]; facing: number; label: string; y: number }) {
  const tex = useMemo(() => canvasTex(512, 96, (g) => { g.fillStyle = '#1f1b17'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#f2e6c8'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 256, 50); }), [label]);
  return <group position={[at[0], y, at[1]]} rotation-y={facing}>
    <mesh geometry={BOX} position={[0, 1.6, 0]} scale={[2.2, 3.2, 0.1]}><meshStandardMaterial color="#6b4f2e" metalness={0.6} roughness={0.4} /></mesh>
    <mesh position={[0, 3.6, 0.07]}><planeGeometry args={[2.6, 0.5]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
  </group>;
}

/* ---------- panorama resimleri (canlandırma) ---------- */
function paintPanorama(p: Panorama) {
  const W = 2048, H = Math.round((W * p.h) / p.w), r = rnd(p.id.length * 97);
  return canvasTex(W, H, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.6);
    if (p.id === 'taarruz') { sky.addColorStop(0, '#7d8fb0'); sky.addColorStop(0.7, '#f0b27a'); sky.addColorStop(1, '#f6d6a8'); }
    else if (p.id === 'canakkale') { sky.addColorStop(0, '#9fb9cf'); sky.addColorStop(1, '#e8e2d2'); }
    else { sky.addColorStop(0, '#a9b6c2'); sky.addColorStop(1, '#e6dcc4'); }
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const ridge = (y: number, amp: number, col: string, f: number) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x * f + y) * amp + Math.sin(x * f * 3.1) * amp * 0.3); g.lineTo(W, H); g.fill(); };
    ridge(H * 0.42, H * 0.05, '#8f8f88', 0.006); ridge(H * 0.5, H * 0.06, '#9a8a62', 0.004);
    if (p.id === 'canakkale') { g.fillStyle = '#4f7590'; g.fillRect(W * 0.45, H * 0.48, W * 0.55, H * 0.12);   // boğaz
      for (let i = 0; i < 9; i++) { const x = W * (0.5 + r() * 0.48), y = H * (0.5 + r() * 0.08); g.fillStyle = '#2b2b2e'; g.fillRect(x, y, 40 + r() * 40, 8); g.fillRect(x + 12, y - 12, 8, 12); g.fillStyle = 'rgba(70,70,70,.5)'; g.beginPath(); g.ellipse(x + 16, y - 30, 14, 26, 0.3, 0, 7); g.fill(); } }
    if (p.id === 'sakarya') { g.strokeStyle = '#5d7e8c'; g.lineWidth = 10; g.beginPath(); for (let x = 0; x <= W; x += 16) g.lineTo(x, H * 0.62 + Math.sin(x * 0.01) * 12); g.stroke(); }
    ridge(H * 0.6, H * 0.04, '#a89466', 0.003);
    g.fillStyle = '#b9a376'; g.fillRect(0, H * 0.72, W, H * 0.28);
    for (let i = 0; i < 26; i++) { const x = r() * W, y = H * (0.35 + r() * 0.3), s = 20 + r() * 60; const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(240,235,225,.75)'); gr.addColorStop(1, 'rgba(200,195,185,0)'); g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2); }   // top dumanı
    for (let i = 0; i < 420; i++) { const x = r() * W, y = H * (0.62 + r() * 0.34), s = 3 + (y / H - 0.6) * 22; g.fillStyle = r() < 0.5 ? '#3a3328' : '#4d4232'; g.fillRect(x, y - s * 2, s * 0.7, s * 2); g.beginPath(); g.arc(x + s * 0.35, y - s * 2.3, s * 0.35, 0, 7); g.fill(); }   // asker silüetleri
    if (p.id === 'taarruz') for (let i = 0; i < 18; i++) { const x = r() * W, y = H * 0.5 + r() * H * 0.15; g.fillStyle = 'rgba(255,200,120,.8)'; g.beginPath(); g.arc(x, y, 4 + r() * 6, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.font = `bold ${Math.round(H * 0.05)}px sans-serif`; g.fillText('canlandırma', 20, H - 16);
  });
}
function PanoramaRoom({ p, wall }: { p: Panorama; wall: THREE.Material }) {
  const tex = useMemo(() => paintPanorama(p), [p]), a = arcOf(p), y = MUSE2.y;
  const shell = useMemo(() => new THREE.CylinderGeometry(p.r + 0.3, p.r + 0.3, p.h + 0.2, 64, 1, true, p.theta - a / 2, a), [p, a]);
  const geo = useMemo(() => new THREE.CylinderGeometry(p.r, p.r, p.h, 64, 1, true, p.theta - a / 2, a), [p, a]);
  const maket = useMemo(() => { const g = new THREE.RingGeometry(p.r - 4.5, p.r - 0.05, 48, 4, p.theta - a / 2 - Math.PI / 2, a);   // halka XY düzleminde; X ekseninde yatırınca açı φ → (cos φ, −sin φ) = (sin θ, cos θ) g.rotateX(-Math.PI / 2);
    const q = g.attributes.position as THREE.BufferAttribute, col: number[] = [], c = new THREE.Color(), r = rnd(5);
    for (let i = 0; i < q.count; i++) { const d = Math.hypot(q.getX(i), q.getZ(i)), t = (d - (p.r - 4.5)) / 4.5; q.setY(i, Math.max(0, t) ** 1.6 * 1.6 + (r() - 0.5) * 0.12); c.set(t > 0.7 ? '#a99068' : '#8f7a55').offsetHSL(0, 0, (r() - 0.5) * 0.08); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [p, a]);
  return <group position={[p.c[0], y, p.c[1]]}>
    <mesh geometry={geo} position={[0, p.h / 2 + 0.1, 0]}><meshStandardMaterial map={tex} side={THREE.BackSide} roughness={0.9} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.2} /></mesh>
    {/* resmin arkası: dışarıdan sıva duvar görünür (resim arkadan görünmesin) + üst saçak */}
    <mesh geometry={shell} position={[0, p.h / 2 + 0.1, 0]} material={wall} />
    <mesh position={[0, p.h + 0.15, 0]} rotation={[-Math.PI / 2, 0, p.theta - a / 2 - Math.PI / 2]}><ringGeometry args={[p.r - 0.6, p.r + 0.35, 64, 1, 0, a]} /><meshStandardMaterial color="#2a2622" roughness={1} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={maket} receiveShadow><meshStandardMaterial vertexColors roughness={1} /></mesh>
    {/* seyir alanı: hafif yükseltilmiş daire ve korkuluk */}
    <mesh position={[0, 0.1, 0]} receiveShadow><cylinderGeometry args={[3.2, 3.2, 0.2, 40]} /><meshStandardMaterial color="#5a4a3a" roughness={0.6} /></mesh>
    <mesh position={[0, 1.0, 0]} rotation={[-Math.PI / 2, 0, p.theta - a / 2 - Math.PI / 2]}><torusGeometry args={[p.r - 4.6, 0.04, 6, 64, a]} /><meshStandardMaterial color="#3a2c20" metalness={0.5} roughness={0.4} /></mesh>
  </group>;
}
/* ---------- 18 tonozlu halka koridor ---------- */
function VaultBay({ v, m }: { v: Vault; m: Materials }) {
  const vault = useMemo(() => groinVault(v.w, v.d, 1.8, 10), [v]), y = MUSE2.y;
  const tex = useMemo(() => canvasTex(640, 384, (g) => { const r = rnd(v.i + 3); g.fillStyle = '#efe6d2'; g.fillRect(0, 0, 640, 384); g.fillStyle = '#7a1d1d'; g.fillRect(0, 0, 640, 64); g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif'; g.fillText(`${v.i + 1}. ${v.title}`.slice(0, 40), 20, 42);
    for (let k = 0; k < 3; k++) { const x = 24 + k * 205; g.fillStyle = '#3a342c'; g.fillRect(x, 90, 185, 140); const gr = g.createLinearGradient(x, 90, x, 230); gr.addColorStop(0, `rgb(${120 + r() * 60},${115 + r() * 50},${100 + r() * 40})`); gr.addColorStop(1, '#2d2822'); g.fillStyle = gr; g.fillRect(x + 6, 96, 173, 128); }
    g.fillStyle = '#4a4036'; for (let l = 0; l < 4; l++) g.fillRect(24, 262 + l * 26, 560 - l * 60 * r(), 10); g.fillStyle = 'rgba(0,0,0,.35)'; g.font = '16px sans-serif'; g.fillText('temsilî pano', 520, 372); }), [v]);
  const side = v.wallSide, off = side === '-x' ? [-(v.w / 2) + 0.12, 0] : side === '+x' ? [v.w / 2 - 0.12, 0] : side === '-z' ? [0, -(v.d / 2) + 0.12] : [0, v.d / 2 - 0.12];
  const rot = side === '-x' ? Math.PI / 2 : side === '+x' ? -Math.PI / 2 : side === '-z' ? 0 : Math.PI;
  return <group position={[v.c[0], y, v.c[1]]}>
    <mesh geometry={vault} material={m.mosaic} position={[0, 4.6, 0]} />
    <mesh position={[off[0], 2.2, off[1]]} rotation-y={rot}><planeGeometry args={[Math.min(4.2, (side === '-x' || side === '+x' ? v.d : v.w) - 1), 2.5]} /><meshStandardMaterial map={tex} roughness={0.8} /></mesh>
  </group>;
}
/* ---------- 1. bölüm vitrinleri ---------- */
function ShowcaseObj({ s, m }: { s: Showcase; m: Materials }) {
  const [w, h, d] = s.size, top = 0.9;
  const obj = s.kind === 'kiyafet' ? <group position={[0, top, 0]}>{[-0.8, 0.8].map((x) => <group key={x} position={[x, 0, 0]}><mesh position={[0, 0.7, 0]} scale={[0.32, 1.1, 0.2]} geometry={BOX}><meshStandardMaterial color={x < 0 ? '#2b2f3a' : '#4a4a3a'} /></mesh><mesh position={[0, 1.38, 0]}><sphereGeometry args={[0.1, 10, 8]} /><meshStandardMaterial color="#c9bfae" /></mesh></group>)}</group>
    : s.kind === 'fox' ? <group position={[0, top + 0.25, 0]}><mesh scale={[0.55, 0.22, 0.22]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#e9e1d0" /></mesh><mesh position={[0.48, 0.16, 0]} scale={[0.18, 0.15, 0.13]}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#e9e1d0" /></mesh>{[-0.3, 0.3].flatMap((x) => [-0.1, 0.1].map((z) => <mesh key={`${x}${z}`} position={[x, -0.25, z]} scale={[0.05, 0.25, 0.05]} geometry={BOX}><meshStandardMaterial color="#e2d8c4" /></mesh>))}</group>
    : s.kind === 'baston' ? <group position={[0, top, 0]}>{[-0.9, -0.45, 0, 0.45, 0.9].map((x) => <mesh key={x} position={[x, 0.5, 0]} rotation-z={0.08} scale={[0.025, 1, 0.025]} geometry={CYL}><meshStandardMaterial color="#3a2414" roughness={0.4} /></mesh>)}</group>
    : s.kind === 'sofra' ? <group position={[0, top + 0.05, 0]}>{[-0.9, -0.3, 0.3, 0.9].map((x) => <mesh key={x} position={[x, 0, 0]} scale={[0.22, 0.03, 0.22]} geometry={CYL}><meshStandardMaterial color="#f4f1ea" roughness={0.2} /></mesh>)}</group>
    : <group position={[0, top + 0.12, 0]}>{[-0.8, -0.2, 0.4, 1].map((x, i) => <mesh key={x} position={[x, 0.08 * i, 0]} scale={[0.25, 0.25 + 0.15 * i, 0.2]} geometry={BOX}><meshStandardMaterial color={['#7a5a34', '#a8a19a', '#2f3b4a', '#8f3b34'][i]} metalness={0.3} roughness={0.5} /></mesh>)}</group>;
  return <group position={[s.at[0], MUSE1.y, s.at[1]]}>
    <mesh geometry={BOX} position={[0, top / 2, 0]} scale={[w, top, d]}><meshStandardMaterial color="#5a4434" roughness={0.55} /></mesh>
    <mesh geometry={BOX} position={[0, top + 0.01, 0]} scale={[w - 0.1, 0.02, d - 0.1]}><meshStandardMaterial color="#8a1f24" roughness={0.9} /></mesh>
    {obj}
    <mesh geometry={BOX} material={m.glass} position={[0, top + (h - top) / 2, 0]} scale={[w, h - top, d]} />
    {/* bronz çerçeve: dört dikme + üst kasa (cam kutu boşlukta yüzmesin) */}
    {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} geometry={BOX} material={m.bronze} position={[sx * (w / 2 - 0.02), top + (h - top) / 2, sz * (d / 2 - 0.02)]} scale={[0.05, h - top, 0.05]} />))}
    <mesh geometry={BOX} material={m.bronze} position={[0, h + 0.04, 0]} scale={[w + 0.04, 0.08, d + 0.04]} />
  </group>;
}
/* ---------- kitaplık ---------- */
function Library({ m }: { m: Materials }) {
  const L = LIBRARY, y = MUSE2.y, h = 5;
  const books = useMemo(() => canvasTex(512, 256, (g) => { const r = rnd(77); g.fillStyle = '#3b2a1e'; g.fillRect(0, 0, 512, 256); for (let row = 0; row < 4; row++) { let x = 4; while (x < 508) { const w = 8 + r() * 14, hh = 40 + r() * 18; g.fillStyle = ['#6b2a22', '#2b3d4f', '#4a3a26', '#7a6a4a', '#2f4a36', '#5a1f2a'][Math.floor(r() * 6)]; g.fillRect(x, row * 64 + 60 - hh, w - 1, hh); x += w; } g.fillStyle = '#2a1d14'; g.fillRect(0, row * 64 + 58, 512, 6); } }), []);
  const shelfMat = useMemo(() => { const t = books.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 1); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }); }, [books]);
  const sideMat = useMemo(() => { const t = books.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.5, 1); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }); }, [books]);   // ~3 m'lik raf başına bir doku: kitaplar gerçek boyda
  return <group>
    {[L.z0, L.z1].map((z, i) => <mesh key={i} geometry={BOX} material={m.plaster} position={[(L.x0 + L.x1) / 2, y + h / 2, z]} scale={[L.x1 - L.x0, h, 0.3]} />)}
    {[[L.z0, -2], [2, L.z1]].map(([a, b], i) => <mesh key={'f' + i} geometry={BOX} material={m.plaster} position={[L.x0, y + h / 2, (a + b) / 2]} scale={[0.3, h, b - a]} />)}
    <mesh geometry={BOX} material={m.plaster} position={[L.x0, y + h - 0.5, 0]} scale={[0.3, 1, 4]} />
    {/* raflar: arka duvar ve yan duvarlar */}
    <mesh geometry={BOX} material={shelfMat} position={[L.x1 - 1.0, y + 1.6, 0]} scale={[0.5, 3.2, L.z1 - L.z0 - 1]} />
    {[-1, 1].map((s) => <mesh key={s} geometry={BOX} material={sideMat} position={[(L.x0 + L.x1) / 2 + 1, y + 1.6, s * (L.z1 - 0.6)]} scale={[L.x1 - L.x0 - 4, 3.2, 0.5]} />)}
    <mesh geometry={BOX} position={[(L.x0 + L.x1) / 2 - 1, y + 0.8, 0]} scale={[2.2, 0.08, 1.2]}><meshStandardMaterial color="#5a3d28" roughness={0.5} /></mesh>
    <mesh geometry={BOX} position={[(L.x0 + L.x1) / 2 - 1, y + 0.4, 0]} scale={[2, 0.8, 1]}><meshStandardMaterial color="#4a3020" roughness={0.6} /></mesh>
    <mesh geometry={BOX} material={m.plaster} position={[(L.x0 + L.x1) / 2, y + h + 0.05, 0]} scale={[L.x1 - L.x0, 0.1, L.z1 - L.z0]} />
    <pointLight position={[(L.x0 + L.x1) / 2, y + 4, 0]} color="#ffe4c0" intensity={220} distance={18} decay={2} />
  </group>;
}

/** 1. bölümün duvar ve tavan donanımı: ahşap lambri, süpürgelik, çerçeveli fotoğraflar, tavan ışık panelleri (temsilî) */
function Muse1Dressing({ m }: { m: Materials }) {
  const M = MUSE1, L = M.x1 - M.x0, mid = (M.z0 + M.z1) / 2;
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6a4b32', roughness: 0.55 }), []);
  const panel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff7e8', emissive: '#fff1d6', emissiveIntensity: 1.2 }), []);
  const photo = useMemo(() => canvasTex(256, 320, (g) => { const r = rnd(11); g.fillStyle = '#f1ead9'; g.fillRect(0, 0, 256, 320); g.fillStyle = '#3d362e'; g.fillRect(24, 24, 208, 220); const gr = g.createLinearGradient(0, 24, 0, 244); gr.addColorStop(0, '#8d8577'); gr.addColorStop(1, '#3a332b'); g.fillStyle = gr; g.fillRect(30, 30, 196, 208); g.fillStyle = '#2a241e'; g.beginPath(); g.ellipse(128, 120, 34, 44, 0, 0, 7); g.fill(); g.fillRect(84, 160, 88, 80); for (let l = 0; l < 3; l++) { g.fillStyle = '#5a5046'; g.fillRect(40, 262 + l * 16, 176 - r() * 60, 6); } }), []);
  const frames = useMemo(() => { const out: { x: number; z: number; ry: number }[] = []; for (const [z, ry] of [[M.z0 + 0.02, 0], [M.z1 - 0.02, Math.PI]] as const) for (let x = M.x0 + 3; x < M.x1 - 2; x += 3.8) { if (SHOWCASES.some((s) => Math.abs(s.at[0] - x) < 2.2 && Math.abs(s.at[1] - z) < 2.5)) continue; out.push({ x, z, ry }); } return out; }, [M]);
  return <group>
    {[M.z0 + 0.04, M.z1 - 0.04].map((z, i) => <group key={i}>
      <mesh geometry={BOX} material={wood} position={[(M.x0 + M.x1) / 2, M.y + 0.55, z]} scale={[L, 1.1, 0.08]} />
      <mesh geometry={BOX} material={m.bronze} position={[(M.x0 + M.x1) / 2, M.y + 1.12, z]} scale={[L, 0.05, 0.1]} />
    </group>)}
    {[M.x0 + 0.04, M.x1 - 0.04].map((x, i) => <mesh key={'e' + i} geometry={BOX} material={wood} position={[x, M.y + 0.55, mid]} scale={[0.08, 1.1, M.z1 - M.z0]} />)}
    {frames.map((f, i) => <group key={'f' + i} position={[f.x, M.y + 2.6, f.z]} rotation-y={f.ry}>
      <mesh geometry={BOX} position={[0, 0, 0.03]} scale={[1.0, 1.25, 0.05]}><meshStandardMaterial color="#2b2119" roughness={0.5} /></mesh>
      <mesh position={[0, 0, 0.065]}><planeGeometry args={[0.86, 1.1]} /><meshStandardMaterial map={photo} roughness={0.8} /></mesh>
    </group>)}
    {Array.from({ length: Math.floor(L / 6) }, (_, i) => <mesh key={'p' + i} geometry={BOX} material={panel} position={[M.x0 + 3 + i * 6, M.y + M.h - 0.02, mid]} scale={[2.4, 0.03, 1.2]} />)}
  </group>;
}
export function Museum({ m, level }: { m: Materials; level: Level }) {
  const ceil = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 1 }), []);
  if (level === 'muze1') {
    const M = MUSE1, mid = (M.z0 + M.z1) / 2;
    return <group>
      <Room x0={M.x0} x1={M.x1} z0={M.z0} z1={M.z1} y={M.y} h={M.h} wall={m.plaster} floor={m.museumFloor} ceil={m.plaster} />
      {SHOWCASES.map((s) => <ShowcaseObj key={s.id} s={s} m={m} />)}
      <Muse1Dressing m={m} />
      <DoorSign at={[M.x0 + 0.2, mid]} facing={Math.PI / 2} label="Çıkış" y={M.y} />
      <DoorSign at={[M.x1 - 0.2, mid]} facing={-Math.PI / 2} label="Panoramalar →" y={M.y} />
      {[0.25, 0.5, 0.75].map((k) => <pointLight key={k} position={[M.x0 + (M.x1 - M.x0) * k, M.y + 6, mid]} color="#fff0d8" intensity={500} distance={30} decay={2} />)}
    </group>;
  }
  if (level !== 'muze2') return null;
  const M = MUSE2, I = INNER, h = M.h, y = M.y, midX = (I.x0 + I.x1) / 2;
  // iç bölüm duvarları (kapı açıklıklarıyla; museumBlocked ile aynı)
  const walls: { p: V3; s: V3 }[] = [
    { p: [I.x0, y + h / 2, (I.z0 - 4) / 2], s: [0.6, h, -4 - I.z0] }, { p: [I.x0, y + h / 2, (I.z1 + 4) / 2], s: [0.6, h, I.z1 - 4] },
    { p: [I.x1, y + h / 2, (I.z0 - 3) / 2], s: [0.6, h, -3 - I.z0] }, { p: [I.x1, y + h / 2, (I.z1 + 3) / 2], s: [0.6, h, I.z1 - 3] },
  ];
  for (const s of [-1, 1]) { walls.push({ p: [(I.x0 + midX - 4) / 2, y + h / 2, s * I.z1], s: [midX - 4 - I.x0, h, 0.6] }, { p: [(midX + 4 + I.x1) / 2, y + h / 2, s * I.z1], s: [I.x1 - midX - 4, h, 0.6] }); }
  return <group>
    <Room x0={M.x0} x1={M.x1} z0={M.z0} z1={M.z1} y={y} h={h} wall={m.plaster} floor={m.museumFloor} ceil={ceil} />
    {walls.map((w, i) => <B key={i} p={w.p} s={w.s} m={m.plaster} />)}
    {VAULTS.map((v) => <VaultBay key={v.i} v={v} m={m} />)}
    {PANORAMAS.map((p) => <PanoramaRoom key={p.id} p={p} wall={m.plaster} />)}
    <Library m={m} />
    <DoorSign at={[M.x0 + 0.2, -5]} facing={Math.PI / 2} label="← 1. bölüm" y={y} />
    <DoorSign at={[M.x0 + 0.2, 5]} facing={Math.PI / 2} label="Çıkış" y={y} />
    {/* ışık: halka koridor ve panoramalar (resimler hafif öz ışıklı) */}
    {[[M.x0 + 2.5, 0], [midX, M.z1 - 2.5], [midX, M.z0 + 2.5], [M.x1 - 2.5, 0], [I.x0 + 6, 0], [midX + 6, 0]].map(([x, z], i) => <pointLight key={i} position={[x, y + 5.5, z]} color="#ffe8c8" intensity={420} distance={30} decay={2} />)}
  </group>;
}
