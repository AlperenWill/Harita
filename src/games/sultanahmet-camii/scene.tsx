/**
 * Sultanahmet — sahne (R3F). Yapı geometrisi prosedüreldir; dosya varlığı yoktur (bkz. assets/).
 * Işık huzmeleri ve havuzlar tek bir InstancedMesh'tir: saat değiştikçe yalnızca matrisler güncellenir,
 * huzme sayısı ne olursa olsun 2 çizim çağrısı.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import type { Tier } from '../core/device';
import { motifTexture, wallTileTexture } from './assets/motifs';
import { COURT, DOME, DOOR, HALL, MIHRAB_X, arcadeColumns, minarets, sunVector, windows, shafts, type MotifId, type V3 } from './layout';
import { POOL_R, STAGES } from './mechanics';

/* ---------- ortak geometriler ve malzemeler ---------- */
const BOX = new THREE.BoxGeometry(1, 1, 1);
const HEMI = (seg: number) => new THREE.SphereGeometry(1, seg, Math.max(6, seg / 2), 0, Math.PI * 2, 0, Math.PI / 2);
const _o = new THREE.Object3D();
export function Instances({ geo = BOX, mat, items, cast = false }: { geo?: THREE.BufferGeometry; mat: THREE.Material; items: { pos: V3; scale?: V3; rot?: V3 }[]; cast?: boolean }) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geo, mat, items.length);
    items.forEach((it, i) => { _o.position.set(...it.pos); _o.rotation.set(...(it.rot ?? [0, 0, 0])); _o.scale.set(...(it.scale ?? [1, 1, 1])); _o.updateMatrix(); m.setMatrixAt(i, _o.matrix); });
    m.computeBoundingSphere(); return m;
  }, [geo, mat, items]);
  useEffect(() => () => { mesh.dispose(); }, [mesh]);
  mesh.castShadow = cast; mesh.receiveShadow = true;
  return <primitive object={mesh} />;
}
const Block = ({ p, s, m, cast = false }: { p: V3; s: V3; m: THREE.Material; cast?: boolean }) => <mesh geometry={BOX} material={m} position={p} scale={s} castShadow={cast} receiveShadow />;

/** Kubbe içi kalem işi: tepede madalyon, eşmerkezli bezeme kuşakları (yarım kürenin v ekseni boyunca) */
let _dome: THREE.CanvasTexture | null = null;
function domeTexture() {
  if (_dome) return _dome;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d')!;
  g.fillStyle = '#e9eef5'; g.fillRect(0, 0, 512, 256);
  const band = (y: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(0, y, 512, h); };
  band(0, 26, '#1d4e9e'); band(26, 6, '#c9a23f');                       // tepe madalyonu (v=0 kubbenin tepesi)
  for (let i = 0; i < 32; i++) { g.fillStyle = i % 2 ? '#2aa3a8' : '#1d4e9e'; g.beginPath(); g.ellipse(i * 16 + 8, 46, 6, 12, 0, 0, 7); g.fill(); }
  band(64, 4, '#c23a2e'); band(118, 10, '#1d4e9e');
  for (let i = 0; i < 24; i++) { const x = i * (512 / 24) + 10; g.strokeStyle = '#1d4e9e'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 70); g.quadraticCurveTo(x + 10, 94, x, 116); g.quadraticCurveTo(x - 10, 94, x, 70); g.stroke(); }
  band(128, 22, '#f3e9d2');                                            // yazı kuşağı (stilize)
  g.fillStyle = '#1d4e9e'; for (let x = 6; x < 512; x += 14) g.fillRect(x, 133 + ((x / 14) % 3) * 2, 8, 10 - ((x / 14) % 3) * 2);
  band(150, 4, '#c9a23f');
  for (let i = 0; i < 40; i++) { g.fillStyle = '#ffffff'; g.fillRect(i * 12.8 + 3, 200, 7, 40); g.fillStyle = '#9bb5d6'; g.fillRect(i * 12.8 + 4, 202, 5, 36); }  // kubbe eteğindeki pencereler
  _dome = new THREE.CanvasTexture(c); _dome.colorSpace = THREE.SRGBColorSpace; return _dome;
}

export function useMats() {
  return useMemo(() => {
    const tile = wallTileTexture().clone(); tile.needsUpdate = true; tile.repeat.set(24, 3);
    return {
      stone: new THREE.MeshStandardMaterial({ color: '#e4ded2', roughness: 0.9 }),
      stoneWarm: new THREE.MeshStandardMaterial({ color: '#e6dccb', roughness: 0.85 }),
      lead: new THREE.MeshStandardMaterial({ color: '#a7b1b8', roughness: 0.5, metalness: 0.1 }),   // kurşun kaplama
      marble: new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: 0.4 }),
      courtFloor: new THREE.MeshStandardMaterial({ color: '#cfc8bb', roughness: 0.8 }),
      carpet: new THREE.MeshStandardMaterial({ color: '#8e2b2b', roughness: 1 }),
      wallTile: new THREE.MeshStandardMaterial({ map: tile, roughness: 0.35 }),
      plaster: new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: 0.9, side: THREE.DoubleSide }),
      // kubbe içi: kalem işi mavi bezeme (yarı küre iç yüzü)
      domeIn: new THREE.MeshStandardMaterial({ map: domeTexture(), roughness: 0.8, side: THREE.BackSide }),
      glass: new THREE.MeshBasicMaterial({ color: '#fdf5df' }),
      gold: new THREE.MeshStandardMaterial({ color: '#c9a23f', roughness: 0.4, metalness: 0.8 }),
      bronze: new THREE.MeshStandardMaterial({ color: '#6e5232', roughness: 0.5, metalness: 0.6 }),
      lamp: new THREE.MeshBasicMaterial({ color: '#ffe3a8' }),
      grass: new THREE.MeshStandardMaterial({ color: '#7d9461', roughness: 1 }),
      tree: new THREE.MeshStandardMaterial({ color: '#4f6b3e', roughness: 1, flatShading: true }),
    };
  }, []);
}
type Mats = ReturnType<typeof useMats>;

/* =========================================================
   DIŞ YAPI: avlu, harim, kubbeler, minareler
   ========================================================= */
function Minaret({ pos, h, balconies, m, seg }: { pos: V3; h: number; balconies: number; m: Mats; seg: number }) {
  const shaftH = h - 9;
  return (
    <group position={pos}>
      <mesh material={m.stone} position={[0, 4, 0]} castShadow><cylinderGeometry args={[2.1, 2.3, 8, seg]} /></mesh>
      <mesh material={m.stone} position={[0, 8 + shaftH / 2, 0]} castShadow><cylinderGeometry args={[1.25, 1.5, shaftH, seg]} /></mesh>
      {Array.from({ length: balconies }).map((_, i) => {
        const y = 8 + shaftH * (0.48 + i * (0.42 / balconies));
        return (
          <group key={i} position={[0, y, 0]}>
            <mesh material={m.stone}><cylinderGeometry args={[2.0, 1.3, 1.1, seg]} /></mesh>
            <mesh material={m.stoneWarm} position={[0, 0.9, 0]}><cylinderGeometry args={[2.05, 2.05, 0.7, seg, 1, true]} /></mesh>
          </group>
        );
      })}
      <mesh material={m.lead} position={[0, 8 + shaftH + 4.5, 0]} castShadow><coneGeometry args={[1.45, 9, seg]} /></mesh>
      <mesh material={m.gold} position={[0, h + 1.2, 0]}><cylinderGeometry args={[0.06, 0.06, 2.4, 6]} /></mesh>
    </group>
  );
}

export function Exterior({ m, tier }: { m: Mats; tier: Tier }) {
  const seg = tier === 'low' ? 12 : tier === 'medium' ? 20 : 32;
  const hemi = useMemo(() => HEMI(seg), [seg]);
  const hx = HALL.len / 2, hz = HALL.wid / 2, H = HALL.wallH, t = HALL.wall, d2 = DOOR.w / 2;
  const arc = useMemo(() => arcadeColumns(), []);
  const smallDomes = useMemo(() => {
    const out: { pos: V3; scale: V3 }[] = [];
    // revak kubbeleri (avlunun üç kenarı)
    const a = COURT.arcadeD, x0 = COURT.x - COURT.len / 2 + a / 2, x1 = COURT.x + COURT.len / 2 - a / 2, z = COURT.wid / 2 - a / 2;
    for (let i = 0; i <= 8; i++) { const x = x0 + ((x1 - x0) * i) / 8; out.push({ pos: [x, COURT.wallH, -z], scale: [2.6, 2.4, 2.6] }, { pos: [x, COURT.wallH, z], scale: [2.6, 2.4, 2.6] }); }
    for (let i = 1; i < 8; i++) out.push({ pos: [x0, COURT.wallH, -z + (2 * z * i) / 8], scale: [2.6, 2.4, 2.6] });
    // harimin köşe kubbeleri
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push({ pos: [sx * 17.5, H, sz * 17.5], scale: [6, 5, 6] });
    return out;
  }, [H]);
  const halfDome = useMemo(() => new THREE.SphereGeometry(1, seg, Math.max(6, seg / 2), 0, Math.PI, 0, Math.PI / 2), [seg]);

  return (
    <group>
      {/* harim duvarları (içi boş; giriş duvarında kapı) */}
      <Block p={[0, H / 2, -hz + t / 2]} s={[HALL.len, H, t]} m={m.stone} cast />
      <Block p={[0, H / 2, hz - t / 2]} s={[HALL.len, H, t]} m={m.stone} cast />
      <Block p={[hx - t / 2, H / 2, 0]} s={[t, H, HALL.wid]} m={m.stone} cast />
      {[-1, 1].map((s) => <Block key={s} p={[-hx + t / 2, H / 2, s * (d2 + (hz - d2) / 2)]} s={[t, H, hz - d2]} m={m.stone} cast />)}
      <Block p={[-hx + t / 2, DOOR.h + (H - DOOR.h) / 2, 0]} s={[t, H - DOOR.h, DOOR.w]} m={m.stone} />
      {/* çatı: merkez kubbe çevresindeki düz kurşun örtü, ana kubbe kasnağı ve kubbe */}
      {/* çatı levhası: ortada kubbe açıklığı bırakılır (içeriden kubbe görünsün) */}
      {(() => { const o = DOME.r + 0.6; return [
        <Block key="rn" p={[0, H + 0.4, -(o + (HALL.wid / 2 - o) / 2)]} s={[HALL.len, 0.8, HALL.wid / 2 - o]} m={m.lead} />,
        <Block key="rs" p={[0, H + 0.4, o + (HALL.wid / 2 - o) / 2]} s={[HALL.len, 0.8, HALL.wid / 2 - o]} m={m.lead} />,
        <Block key="rw" p={[-(o + (HALL.len / 2 - o) / 2), H + 0.4, 0]} s={[HALL.len / 2 - o, 0.8, 2 * o]} m={m.lead} />,
        <Block key="re" p={[o + (HALL.len / 2 - o) / 2, H + 0.4, 0]} s={[HALL.len / 2 - o, 0.8, 2 * o]} m={m.lead} />,
      ]; })()}
      {/* pandantif bölgesi: kare açıklığın köşelerini kapatan, ortası daire boş levha */}
      <mesh geometry={useMemo(() => { const o = DOME.r + 0.6, sh = new THREE.Shape([new THREE.Vector2(-o, -o), new THREE.Vector2(o, -o), new THREE.Vector2(o, o), new THREE.Vector2(-o, o)]);
        sh.holes.push(new THREE.Path().absarc(0, 0, DOME.r + 0.5, 0, Math.PI * 2, true)); return new THREE.ShapeGeometry(sh, seg); }, [seg])}
        material={m.plaster} position={[0, H + 0.8, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      {/* kubbe kasnağı: açık uçlu silindirler */}
      <mesh material={m.stone} position={[0, H + 2.4, 0]} castShadow><cylinderGeometry args={[DOME.r + 0.6, DOME.r + 1.2, 3.6, seg, 1, true]} /></mesh>
      <mesh material={m.plaster} position={[0, DOME.drumY - 0.6, 0]}><cylinderGeometry args={[DOME.r + 0.4, DOME.r + 0.6, 2.8, seg, 1, true]} /></mesh>
      <mesh geometry={hemi} material={m.lead} position={[0, DOME.drumY + 0.8, 0]} scale={[DOME.r + 0.4, DOME.r * 0.95, DOME.r + 0.4]} castShadow />
      <mesh material={m.gold} position={[0, DOME.drumY + DOME.r + 2.6, 0]}><cylinderGeometry args={[0.1, 0.1, 3, 6]} /></mesh>
      {/* dört yarım kubbe */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((r, i) => (
        <mesh key={i} geometry={halfDome} material={m.lead} position={[Math.cos(r) * DOME.r, H + 0.8, -Math.sin(r) * DOME.r]} rotation={[0, r + Math.PI / 2, 0]} scale={[DOME.r * 0.98, DOME.r * 0.8, DOME.r * 0.98]} castShadow />
      ))}
      <Instances geo={hemi} mat={m.lead} items={smallDomes} />
      {/* yan cephe kemer sıraları (pencere izleri) */}
      <Instances mat={m.glass} items={windows().map((w) => ({ pos: [w.pos[0] + w.wall.n[0] * (t + 0.02), w.pos[1], w.pos[2] + w.wall.n[1] * (t + 0.02)] as V3, scale: (w.wall.along === 'z' ? [0.05, 4, 2.2] : [2.2, 4, 0.05]) as V3 }))} />

      {/* avlu: çevre duvarı (batıda giriş), revaklar, şadırvan, mermer zemin */}
      <Block p={[COURT.x, 0.05, 0]} s={[COURT.len, 0.1, COURT.wid]} m={m.courtFloor} />
      {[-1, 1].map((s) => <Block key={'cw' + s} p={[COURT.x, COURT.wallH / 2, s * (COURT.wid / 2 - 0.5)]} s={[COURT.len, COURT.wallH, 1]} m={m.stone} cast />)}
      {[-1, 1].map((s) => <Block key={'cg' + s} p={[COURT.x - COURT.len / 2 + 0.5, COURT.wallH / 2, s * (d2 + (COURT.wid / 2 - d2) / 2)]} s={[1, COURT.wallH, COURT.wid / 2 - d2]} m={m.stone} cast />)}
      <Block p={[COURT.x - COURT.len / 2 + 0.5, DOOR.h + (COURT.wallH + 3 - DOOR.h) / 2, 0]} s={[1.4, COURT.wallH + 3 - DOOR.h, DOOR.w + 2]} m={m.stoneWarm} />
      <Instances mat={m.marble} items={arc.map((c) => ({ pos: [c[0], (COURT.wallH - 0.6) / 2, c[2]] as V3, scale: [0.9, COURT.wallH - 0.6, 0.9] as V3 }))} cast />
      <group position={[COURT.x, 0, 0]}>
        <mesh material={m.marble} position={[0, 0.7, 0]}><cylinderGeometry args={[3, 3.2, 1.4, 6]} /></mesh>
        {Array.from({ length: 6 }).map((_, i) => <mesh key={i} material={m.marble} position={[Math.cos((i * Math.PI) / 3) * 2.7, 2.7, Math.sin((i * Math.PI) / 3) * 2.7]}><cylinderGeometry args={[0.18, 0.18, 2.6, 8]} /></mesh>)}
        <mesh geometry={hemi} material={m.lead} position={[0, 4, 0]} scale={[3.4, 2, 3.4]} />
      </group>

      {minarets().map((mi, i) => <Minaret key={i} {...mi} m={m} seg={tier === 'low' ? 8 : 16} />)}
    </group>
  );
}


/* =========================================================
   İÇ MEKÂN: fil ayakları, halı, çini kuşak, kubbe içi, mihrap, minber, kandiller, gizli desen panoları
   ========================================================= */
export function Interior({ m, tier, revealed, current }: { m: Mats; tier: Tier; revealed: MotifId[]; current: MotifId | null }) {
  const hx = HALL.len / 2 - HALL.wall, hz = HALL.wid / 2 - HALL.wall, seg = tier === 'low' ? 16 : 32;
  const hemi = useMemo(() => HEMI(seg), [seg]);
  const lamps = useMemo(() => { const out: { pos: V3; scale: V3 }[] = []; for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; out.push({ pos: [Math.cos(a) * 13, 4.6, Math.sin(a) * 13], scale: [0.22, 0.22, 0.22] }); } return out; }, []);
  return (
    <group>
      <Block p={[0, 0.03, 0]} s={[hx * 2, 0.06, hz * 2]} m={m.carpet} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} material={m.stoneWarm} position={[sx * DOME.piers, HALL.wallH / 2, sz * DOME.piers]} castShadow receiveShadow>
          <cylinderGeometry args={[DOME.pierR, DOME.pierR + 0.2, HALL.wallH, 16]} />
        </mesh>
      )))}
      {([[0, -hz + 0.06, HALL.len - 4, 0], [0, hz - 0.06, HALL.len - 4, Math.PI], [hx - 0.06, 0, HALL.wid - 4, -Math.PI / 2], [-hx + 0.06, 0, HALL.wid - 4, Math.PI / 2]] as const).map(([x, z, w, r], i) => (
        <mesh key={i} material={m.wallTile} position={[x, 4.2, z]} rotation={[0, r, 0]}><planeGeometry args={[w, 5.6]} /></mesh>
      ))}
      <mesh geometry={hemi} material={m.domeIn} position={[0, DOME.drumY + 0.8, 0]} scale={[DOME.r, DOME.r * 0.95, DOME.r]} />
      <Block p={[hx - 0.2, 4, 0]} s={[0.4, 8, 4]} m={m.marble} />
      <Block p={[hx - 0.25, 3.6, 0]} s={[0.3, 6, 2.6]} m={m.gold} />
      <group position={[MIHRAB_X - 1.5, 0, 6.2]}>
        <Block p={[0, 2.5, 0]} s={[3, 5, 2]} m={m.marble} cast />
        <mesh material={m.gold} position={[0, 7, 0]}><coneGeometry args={[0.9, 3, 8]} /></mesh>
      </group>
      <mesh material={m.bronze} position={[0, 4.75, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[13, 0.08, 6, 64]} /></mesh>
      <Instances geo={hemi} mat={m.lamp} items={lamps} />
      {STAGES.map((s) => <HiddenPanel key={s.motif} motif={s.motif} pos={s.panel.pos} n={s.panel.wall.n} along={s.panel.wall.along} open={revealed.includes(s.motif)} active={current === s.motif} />)}
      <pointLight position={[0, 10, 0]} color="#ffdcae" intensity={tier === 'low' ? 320 : 420} distance={60} decay={2} />
    </group>
  );
}

const FRAME = new THREE.MeshStandardMaterial({ color: '#1d4e9e' });
/** Gizli desen panosu: açılana kadar boş kalır (yalnızca silik çerçeve); açılınca motif belirir ve kısa süre parlar */
function HiddenPanel({ motif, pos, n, along, open, active }: { motif: MotifId; pos: V3; n: [number, number]; along: 'x' | 'z'; open: boolean; active: boolean }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.3, transparent: true }), []);
  const born = useRef<number | null>(null);
  useEffect(() => { mat.map = motifTexture(motif, open); mat.needsUpdate = true; if (open) born.current = null; }, [mat, motif, open]);
  useFrame(({ clock }) => {
    if (open && born.current === null) born.current = clock.elapsedTime;
    const since = born.current === null ? 99 : clock.elapsedTime - born.current;
    mat.emissive.set('#ffe2a6');
    mat.emissiveIntensity = open ? Math.max(0, 0.6 - since * 0.25) : active ? 0.06 + Math.sin(clock.elapsedTime * 2) * 0.04 : 0;
    mat.opacity = open ? 1 : active ? 0.75 : 0.45;
  });
  const rotY = along === 'z' ? (n[0] > 0 ? -Math.PI / 2 : Math.PI / 2) : n[1] > 0 ? Math.PI : 0;
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh material={mat}><planeGeometry args={[3.2, 3.2]} /></mesh>
      <mesh material={FRAME} position={[0, 0, -0.03]}><planeGeometry args={[3.6, 3.6]} /></mesh>
    </group>
  );
}

/* =========================================================
   IŞIK HUZMELERİ (InstancedMesh) ve HAVUZLAR
   ========================================================= */
let _fade: THREE.CanvasTexture | null = null;
const fadeTex = () => {
  if (_fade) return _fade;
  const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d')!, gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.75, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 64); return (_fade = new THREE.CanvasTexture(c));
};
const MAX_SHAFTS = 32;
const UP = new THREE.Vector3(0, 1, 0), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
export function LightShafts({ hour, target, particles }: { hour: number; target: React.MutableRefObject<THREE.Vector3 | null>; particles: boolean }) {
  const beams = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.7, 0.95, 1, 8, 1, true);
    const mat = new THREE.MeshBasicMaterial({ color: '#fff1cf', alphaMap: fadeTex(), transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const m = new THREE.InstancedMesh(g, mat, MAX_SHAFTS); m.frustumCulled = false; return m;
  }, []);
  const pools = useMemo(() => {
    const g = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: '#ffe7b3', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending });
    const m = new THREE.InstancedMesh(g, mat, MAX_SHAFTS); m.frustumCulled = false; return m;
  }, []);
  useEffect(() => {
    const list = shafts(hour).slice(0, MAX_SHAFTS);
    let np = 0;
    list.forEach((s, i) => {
      _a.set(...s.from); _b.set(...s.to);
      _p.copy(_a).add(_b).multiplyScalar(0.5); _q.setFromUnitVectors(UP, _s.copy(_a).sub(_b).normalize()); _s.set(1, _a.distanceTo(_b), 1);
      beams.setMatrixAt(i, _m.compose(_p, _q, _s));
      if (s.to[1] < 0.5) pools.setMatrixAt(np++, _m.compose(_p.set(s.to[0], 0.09, s.to[2]), _q.identity(), _s.set(1.6, 1, 1.6)));
    });
    beams.count = list.length; pools.count = np;
    beams.instanceMatrix.needsUpdate = true; pools.instanceMatrix.needsUpdate = true;
  }, [hour, beams, pools]);
  useEffect(() => () => { beams.geometry.dispose(); pools.geometry.dispose(); }, [beams, pools]);
  return (
    <group>
      <primitive object={beams} />
      <primitive object={pools} />
      <TargetPool target={target} />
      {particles && <Motes target={target} />}
    </group>
  );
}

/** Hedef havuz: oyuncunun takip etmesi gereken ışık (nefes alan altın halka) */
function TargetPool({ target }: { target: React.MutableRefObject<THREE.Vector3 | null> }) {
  const g = useRef<THREE.Group>(null!), ring = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = target.current; g.current.visible = !!t; if (!t) return;
    g.current.position.lerp(_p.set(t.x, 0.1, t.z), 0.2);
    const s = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.06; ring.current.scale.set(s, s, s);
  });
  return (
    <group ref={g}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[POOL_R - 0.25, POOL_R, 48]} /><meshBasicMaterial color="#ffd36b" transparent opacity={0.95} depthWrite={false} toneMapped={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}><circleGeometry args={[POOL_R, 32]} /><meshBasicMaterial color="#fff0c8" transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    </group>
  );
}
/** Hedef huzmenin içinde süzülen toz (yalnızca orta/yüksek kademede) */
function Motes({ target }: { target: React.MutableRefObject<THREE.Vector3 | null> }) {
  const ref = useRef<THREE.Points>(null!);
  const geo = useMemo(() => { const a = new Float32Array(160 * 3); for (let i = 0; i < 160; i++) a.set([(Math.random() - 0.5) * 3, Math.random() * 7, (Math.random() - 0.5) * 3], i * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g; }, []);
  useFrame(({ clock }) => { const t = target.current; ref.current.visible = !!t; if (t) ref.current.position.set(t.x, Math.sin(clock.elapsedTime * 0.5) * 0.3, t.z); ref.current.rotation.y = clock.elapsedTime * 0.05; });
  return <points ref={ref} geometry={geo}><pointsMaterial color="#fff4d6" size={0.07} transparent opacity={0.8} depthWrite={false} /></points>;
}

/* =========================================================
   KARAKTER: sade bir ziyaretçi figürü
   ========================================================= */
export function Avatar({ pos, charge, target }: { pos: React.MutableRefObject<{ x: number; z: number }>; charge: React.MutableRefObject<number>; target: React.MutableRefObject<THREE.Vector3 | null> }) {
  const g = useRef<THREE.Group>(null!), halo = useRef<THREE.Mesh>(null!), arrow = useRef<THREE.Group>(null!);
  const arrowGeo = useMemo(() => { const sh = new THREE.Shape(); sh.moveTo(0, 1.9); sh.lineTo(0.55, 1.1); sh.lineTo(0.2, 1.1); sh.lineTo(0.2, 0.75); sh.lineTo(-0.2, 0.75); sh.lineTo(-0.2, 1.1); sh.lineTo(-0.55, 1.1); sh.closePath(); return new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2).rotateY(Math.PI); }, []);
  const last = useRef({ x: 0, z: 0 });
  useFrame((_, dt) => {
    const p = pos.current, dx = p.x - last.current.x, dz = p.z - last.current.z;
    g.current.position.set(p.x, 0, p.z);
    if (Math.hypot(dx, dz) > 0.002) g.current.rotation.y = THREE.MathUtils.lerp(g.current.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-dt * 10));
    last.current = { ...p };
    const c = charge.current; (halo.current.material as THREE.MeshBasicMaterial).opacity = c * 0.7; halo.current.scale.setScalar(0.6 + c * 0.8);
    // yön oku: havuz uzaktaysa karakterin ayağında hedefi gösterir
    const t = target.current, d = t ? Math.hypot(t.x - p.x, t.z - p.z) : 0;
    arrow.current.visible = !!t && d > POOL_R + 1.5;
    if (t) { arrow.current.position.set(p.x, 0.1, p.z); arrow.current.rotation.y = Math.atan2(t.x - p.x, t.z - p.z); }
  });
  return (
    <>
    <group ref={arrow}><mesh geometry={arrowGeo}><meshBasicMaterial color="#ffd36b" transparent opacity={0.9} depthWrite={false} toneMapped={false} /></mesh></group>
    <group ref={g}>
      <mesh position={[0, 0.75, 0]} castShadow><cylinderGeometry args={[0.28, 0.42, 1.5, 12]} /><meshStandardMaterial color="#F04448" roughness={0.8} /></mesh>
      <mesh position={[0, 1.72, 0]} castShadow><sphereGeometry args={[0.24, 16, 12]} /><meshStandardMaterial color="#e9c39b" roughness={0.9} /></mesh>
      <mesh position={[0, 1.78, -0.05]}><sphereGeometry args={[0.26, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#f4f1ea" roughness={0.9} /></mesh>
      <mesh ref={halo} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.6, 0.9, 32]} /><meshBasicMaterial color="#ffd27a" transparent opacity={0} depthWrite={false} /></mesh>
    </group>
    </>
  );
}

/** Dokunarak hedef seçme: harim zemininde bir noktaya dokunmak karakteri oraya yürütür */
export function FloorPicker({ onPick }: { onPick: (x: number, z: number) => void }) {
  const hx = HALL.len / 2 - HALL.wall, hz = HALL.wid / 2 - HALL.wall;
  return (
    <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={(e: ThreeEvent<MouseEvent>) => { if (e.delta < 8) onPick(e.point.x, e.point.z); }}>
      <planeGeometry args={[hx * 2, hz * 2]} /><meshBasicMaterial visible={false} />
    </mesh>
  );
}

/* =========================================================
   ÇEVRE
   ========================================================= */
export function Surroundings({ m, hour, tier, fog, shadows }: { m: Mats; hour: number; tier: Tier; fog: boolean; shadows: boolean }) {
  const { scene } = useThree();
  const sun = sunVector(hour), el = Math.max(sun[1], 0);
  const sky = useMemo(() => new THREE.Color().setHSL(0.58, 0.45, 0.55 + el * 0.25).lerp(new THREE.Color('#f2b27a'), Math.max(0, 0.35 - el)), [el]);
  useEffect(() => { scene.background = sky; scene.fog = fog ? new THREE.Fog(sky, 140, 420) : null; }, [scene, sky, fog]);
  const trees = useMemo(() => { const out: { pos: V3; scale: V3 }[] = []; let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    while (out.length < (tier === 'low' ? 30 : 80)) { const x = -180 + r() * 300, z = -120 + r() * 240; if (Math.abs(z) < 40 && x > -110 && x < 40) continue; const h = 6 + r() * 6; out.push({ pos: [x, h / 2, z], scale: [h * 0.35, h * 0.5, h * 0.35] }); } return out; }, [tier]);
  const light = useRef<THREE.DirectionalLight>(null!);
  useEffect(() => {
    const c = light.current.shadow.camera; c.left = -90; c.right = 90; c.top = 90; c.bottom = -90; c.far = 500; c.updateProjectionMatrix();
    light.current.target.position.set(-20, 0, 0); light.current.target.updateMatrixWorld();
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-30, -0.02, 0]} material={m.grass} receiveShadow><circleGeometry args={[400, 48]} /></mesh>
      <Block p={[-30, -0.01, 0]} s={[150, 0.02, 90]} m={m.courtFloor} />
      <Instances geo={useMemo(() => new THREE.IcosahedronGeometry(1, 0), [])} mat={m.tree} items={trees} cast={tier !== 'low'} />
      <hemisphereLight args={['#e6eef8', '#a39272', 1.0 + el * 0.6]} />
      <directionalLight ref={light} position={[sun[0] * 200 - 20, Math.max(sun[1], 0.05) * 200, sun[2] * 200]} intensity={1.2 + el * 2.6}
        color={el < 0.3 ? '#ffc58a' : '#fff4e2'} castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005} />
    </group>
  );
}

