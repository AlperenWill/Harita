import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import { walkInput } from '../../monuments/walkInput';
import { useJournal } from '../store';
import { TIER, type Tier } from '../quality';
import { ambience } from './audio';
import { motifTexture, wallTileTexture } from './motifs';
import {
  COURT, DOME, DOOR, HALL, MIHRAB_X, MIHRAB_ZONE, WALK, arcadeColumns, insideHall, isLit, minarets, panels, phaseOf,
  shafts, sunVector, underDome, walkColliders, windows, type MotifId, type Panel, type V3,
} from './layout';

const SITE = 'sultanahmet-camii';
export type Mode = 'orbit' | 'walk';
export interface SceneProps {
  tier: Tier;
  hour: number;
  mode: Mode;
  /** Pano seçildiğinde (dokunma): ışık alıyorsa keşfedilir */
  onPanel: (m: MotifId, lit: boolean) => void;
  /** Çift dokunma ile yakınlaşılan pano */
  zoomPanel: MotifId | null;
  setZoomPanel: (m: MotifId | null) => void;
  /** Bölge değişince (ses karışımı ve arayüz için) */
  onZone: (z: 'outside' | 'court' | 'hall') => void;
}

/* ---------- ortak geometriler ve malzemeler ---------- */
const BOX = new THREE.BoxGeometry(1, 1, 1);
const HEMI = (seg: number) => new THREE.SphereGeometry(1, seg, Math.max(6, seg / 2), 0, Math.PI * 2, 0, Math.PI / 2);
const _o = new THREE.Object3D();
function Instances({ geo = BOX, mat, items, cast = false }: { geo?: THREE.BufferGeometry; mat: THREE.Material; items: { pos: V3; scale?: V3; rot?: V3 }[]; cast?: boolean }) {
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

function useMats() {
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

function Exterior({ m, tier }: { m: Mats; tier: Tier }) {
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
   İÇ MEKÂN: fil ayakları, halı, çini kuşak, mihrap, minber, kandiller, panolar
   ========================================================= */
function Interior({ m, tier, hour, onPanel, setZoomPanel }: { m: Mats; tier: Tier; hour: number; onPanel: SceneProps['onPanel']; setZoomPanel: SceneProps['setZoomPanel'] }) {
  const hx = HALL.len / 2 - HALL.wall, hz = HALL.wid / 2 - HALL.wall, seg = tier === 'low' ? 16 : 32;
  const hemi = useMemo(() => HEMI(seg), [seg]);
  const finds = useJournal((s) => s.finds[SITE] ?? []);
  const ps = useMemo(() => panels(), []);
  const lamps = useMemo(() => { const out: { pos: V3; scale: V3 }[] = []; for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; out.push({ pos: [Math.cos(a) * 13, 4.6, Math.sin(a) * 13], scale: [0.22, 0.22, 0.22] }); } return out; }, []);
  return (
    <group>
      <Block p={[0, 0.03, 0]} s={[hx * 2, 0.06, hz * 2]} m={m.carpet} />
      {/* fil ayakları: dört kalın yivli paye */}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} material={m.stoneWarm} position={[sx * DOME.piers, HALL.wallH / 2, sz * DOME.piers]} castShadow receiveShadow>
          <cylinderGeometry args={[DOME.pierR, DOME.pierR + 0.2, HALL.wallH, 16]} />
        </mesh>
      )))}
      {/* çini kuşağı (duvarların alt kısmı) */}
      {([[0, -hz + 0.06, HALL.len - 4, 0], [0, hz - 0.06, HALL.len - 4, Math.PI], [hx - 0.06, 0, HALL.wid - 4, -Math.PI / 2], [-hx + 0.06, 0, HALL.wid - 4, Math.PI / 2]] as const).map(([x, z, w, r], i) => (
        <mesh key={i} material={m.wallTile} position={[x, 4.2, z]} rotation={[0, r, 0]}><planeGeometry args={[w, 5.6]} /></mesh>
      ))}
      {/* üst duvarlar ve kubbe içi */}
      <mesh geometry={hemi} material={m.domeIn} position={[0, DOME.drumY + 0.8, 0]} scale={[DOME.r, DOME.r * 0.95, DOME.r]} />
      <Instances geo={hemi} mat={m.domeIn} items={[-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ pos: [sx * 17.5, HALL.wallH - 0.2, sz * 17.5] as V3, scale: [5.6, 4.6, 5.6] as V3 })))} />
      {/* mihrap ve minber */}
      <Block p={[hx - 0.2, 4, 0]} s={[0.4, 8, 4]} m={m.marble} />
      <Block p={[hx - 0.25, 3.6, 0]} s={[0.3, 6, 2.6]} m={m.gold} />
      <group position={[MIHRAB_X - 1.5, 0, 6.2]}>
        <Block p={[0, 2.5, 0]} s={[3, 5, 2]} m={m.marble} cast />
        <mesh material={m.gold} position={[0, 7, 0]}><coneGeometry args={[0.9, 3, 8]} /></mesh>
      </group>
      {/* kandil halkası: alçak asılı kandiller */}
      <mesh material={m.bronze} position={[0, 4.75, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[13, 0.08, 6, 64]} /></mesh>
      <Instances geo={hemi} mat={m.lamp} items={lamps} />
      {/* çini panoları: ışık alanlar parlar; dokun = keşfet, çift dokun = yakınlaş */}
      {ps.map((p) => <TilePanel key={p.motif} p={p} found={finds.includes(`motif:${p.motif}`)} lit={isLit(p, hour)} onPanel={onPanel} setZoom={setZoomPanel} />)}
      <pointLight position={[0, 10, 0]} color="#ffdcae" intensity={tier === 'low' ? 320 : 420} distance={60} decay={2} />
    </group>
  );
}

const FRAME = new THREE.MeshStandardMaterial({ color: '#1d4e9e' });
function TilePanel({ p, found, lit, onPanel, setZoom }: { p: Panel; found: boolean; lit: boolean; onPanel: SceneProps['onPanel']; setZoom: SceneProps['setZoomPanel'] }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.3 }), []);
  const glow = useRef<THREE.Mesh>(null!);
  // ışık motifi ortaya çıkarır: aydınlanan ya da keşfedilmiş pano tam renkli, diğerleri silik
  useEffect(() => { mat.map = motifTexture(p.motif, found || lit); mat.needsUpdate = true; }, [mat, p.motif, found, lit]);
  useFrame(({ clock }) => {
    const target = lit ? 0.12 + Math.sin(clock.elapsedTime * 2.2) * 0.05 : 0;
    mat.emissive.set('#ffe2a6'); mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.12;
    (glow.current.material as THREE.MeshBasicMaterial).opacity = mat.emissiveIntensity * 4;
  });
  const rotY = p.wall.along === 'z' ? (p.wall.n[0] > 0 ? -Math.PI / 2 : Math.PI / 2) : p.wall.n[1] > 0 ? Math.PI : 0;
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta < 8) onPanel(p.motif, lit); };
  return (
    <group position={p.pos} rotation={[0, rotY, 0]}>
      <mesh material={mat} onClick={click} onDoubleClick={(e) => { e.stopPropagation(); setZoom(p.motif); }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
        <planeGeometry args={[3.2, 3.2]} />
      </mesh>
      {/* hale panonun arkasında: motifi örtmeden kenarlardan parlar */}
      <mesh ref={glow} position={[0, 0, -0.05]}>
        <planeGeometry args={[4.4, 4.4]} />
        <meshBasicMaterial color="#ffd98a" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* çerçeve */}
      <mesh material={FRAME} position={[0, 0, -0.03]}><planeGeometry args={[3.6, 3.6]} /></mesh>
    </group>
  );
}

/* =========================================================
   IŞIK HUZMELERİ — güneşin saatine göre pencerelerden içeri
   ========================================================= */
let _fade: THREE.CanvasTexture | null = null;
const fadeTex = () => {
  if (_fade) return _fade;
  const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d')!, gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.75, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 64); return (_fade = new THREE.CanvasTexture(c));
};
function Shafts({ hour, particles }: { hour: number; particles: boolean }) {
  const list = useMemo(() => shafts(hour), [hour]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff1cf', alphaMap: fadeTex(), transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), []);
  const pool = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe7b3', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const items = useMemo(() => list.map(({ from, to }) => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), len = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.clone().sub(b).normalize());
    return { mid, len, q, to: b };
  }), [list]);
  const dust = useMemo(() => {
    if (!particles || !items.length) return null;
    const n = 400, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const s = items[i % items.length], t = Math.random(), off = () => (Math.random() - 0.5) * 1.6;
      const p = s.mid.clone().add(new THREE.Vector3(0, 1, 0).applyQuaternion(s.q).multiplyScalar((t - 0.5) * s.len)); arr.set([p.x + off(), p.y + off(), p.z + off()], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3)); return g;
  }, [items, particles]);
  const dustRef = useRef<THREE.Points>(null);
  useFrame(({ clock }) => { if (dustRef.current) dustRef.current.position.y = Math.sin(clock.elapsedTime * 0.4) * 0.3; });
  return (
    <group>
      {items.map((s, i) => (
        <group key={i}>
          <mesh material={mat} position={s.mid} quaternion={s.q}><cylinderGeometry args={[0.7, 0.95, s.len, 8, 1, true]} /></mesh>
          {s.to.y < 0.5 && <mesh material={pool} position={[s.to.x, 0.09, s.to.z]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.6, 16]} /></mesh>}
        </group>
      ))}
      {dust && <points ref={dustRef} geometry={dust}><pointsMaterial color="#fff4d6" size={0.08} transparent opacity={0.7} depthWrite={false} /></points>}
    </group>
  );
}

/* =========================================================
   ÇEVRE: Sultanahmet Meydanı yeşili, ağaçlar, gökyüzü ve güneş
   ========================================================= */
function Surroundings({ m, hour, tier }: { m: Mats; hour: number; tier: Tier }) {
  const { scene } = useThree();
  const sun = sunVector(hour), el = Math.max(sun[1], 0);
  const sky = useMemo(() => new THREE.Color().setHSL(0.58, 0.45, 0.55 + el * 0.25).lerp(new THREE.Color('#f2b27a'), Math.max(0, 0.35 - el)), [el]);
  useEffect(() => { scene.background = sky; scene.fog = TIER[tier].fog ? new THREE.Fog(sky, 140, 420) : null; }, [scene, sky, tier]);
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
        color={el < 0.3 ? '#ffc58a' : '#fff4e2'} castShadow={TIER[tier].shadows} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005} />
    </group>
  );
}

/* =========================================================
   KAMERALAR
   ========================================================= */
const ACTION = CameraControlsImpl.ACTION;
function OrbitCam({ active, zoomPanel }: { active: boolean; zoomPanel: MotifId | null }) {
  const ref = useRef<CameraControlsImpl>(null!);
  const portrait = useThree((s) => s.size.height > s.size.width);
  useEffect(() => {
    const c = ref.current;
    c.touches.one = ACTION.TOUCH_ROTATE; c.touches.two = ACTION.TOUCH_DOLLY_TRUCK; c.mouseButtons.right = ACTION.TRUCK; c.dollyToCursor = true;
    c.minDistance = 25; c.maxDistance = 320; c.maxPolarAngle = 1.45; c.smoothTime = 0.6;
    c.setBoundary(new THREE.Box3(new THREE.Vector3(-140, 0, -90), new THREE.Vector3(60, 60, 90)));
    // açılış: yükseklerden sinematik alçalma (haritadan gelen geçişin devamı)
    c.setLookAt(-60, 260, 240, -20, 10, 0, false);
    c.setLookAt(-150, 70 * (portrait ? 1.4 : 1), 105 * (portrait ? 1.4 : 1), -18, 14, 0, true);
  }, [portrait]);
  useEffect(() => { ref.current.enabled = active; }, [active]);
  useEffect(() => { if (active && zoomPanel === null) ref.current.smoothTime = 0.6; }, [active, zoomPanel]);
  return <CameraControls ref={ref} makeDefault={active} />;
}

const COLLIDERS = walkColliders();
const blocked = (x: number, z: number) => {
  const [bx0, bz0, bx1, bz1] = WALK.bound, r = WALK.radius;
  if (x < bx0 || x > bx1 || z < bz0 || z > bz1) return true;
  return COLLIDERS.some(([x0, z0, x1, z1]) => x > x0 - r && x < x1 + r && z > z0 - r && z < z1 + r);
};
function Walker({ onZone, zoomPanel }: { onZone: SceneProps['onZone']; zoomPanel: MotifId | null }) {
  const { camera, gl } = useThree();
  const st = useRef({ x: WALK.spawn.x, z: WALK.spawn.z, yaw: WALK.spawn.yaw, pitch: 0, bob: 0, zone: '' });
  const keys = useRef<Record<string, boolean>>({});
  const find = useJournal((s) => s.find);
  const ps = useMemo(() => panels(), []);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera, prev = { fov: cam.fov, near: cam.near };
    cam.fov = 66; cam.near = 0.2; cam.updateProjectionMatrix();
    const el = gl.domElement; let drag: { id: number; x: number; y: number } | null = null;
    const down = (e: PointerEvent) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; };
    const move = (e: PointerEvent) => { if (!drag || e.pointerId !== drag.id) return; const k = e.pointerType === 'touch' ? 0.006 : 0.004;
      st.current.yaw -= (e.clientX - drag.x) * k; st.current.pitch = THREE.MathUtils.clamp(st.current.pitch - (e.clientY - drag.y) * k, -1.2, 1.35); drag.x = e.clientX; drag.y = e.clientY; };
    const up = () => { drag = null; };
    const kd = (e: KeyboardEvent) => { keys.current[e.code] = true; }, ku = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); cam.fov = prev.fov; cam.near = prev.near; cam.updateProjectionMatrix(); walkInput.x = walkInput.y = 0; };
  }, [camera, gl]);
  // çift dokunulan panoya yakınlaş: önüne yürüt ve ona çevir
  useEffect(() => {
    if (!zoomPanel) return; const p = ps.find((x) => x.motif === zoomPanel)!;
    const s = st.current; s.x = p.pos[0] - p.wall.n[0] * 4.5; s.z = p.pos[2] - p.wall.n[1] * 4.5; s.yaw = Math.atan2(-(p.pos[0] - s.x), -(p.pos[2] - s.z)); s.pitch = 0.18;
  }, [zoomPanel, ps]);
  // otomatik testler için kanca (oyun mantığını değiştirmez)
  useEffect(() => { (window as unknown as { __walker?: unknown }).__walker = st.current; }, []);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), s = st.current, k = keys.current;
    let f = -walkInput.y, r = walkInput.x;
    if (k.KeyW || k.ArrowUp) f += 1; if (k.KeyS || k.ArrowDown) f -= 1; if (k.KeyD || k.ArrowRight) r += 1; if (k.KeyA || k.ArrowLeft) r -= 1;
    const len = Math.hypot(f, r);
    if (len > 0.05) {
      if (len > 1) { f /= len; r /= len; }
      // meditatif yürüyüş: yavaş tempo (Shift ile biraz hızlanır)
      const sp = (k.ShiftLeft || k.ShiftRight ? 7 : 3.6) * dt;
      const dx = (-Math.sin(s.yaw) * f + Math.cos(s.yaw) * r) * sp, dz = (-Math.cos(s.yaw) * f - Math.sin(s.yaw) * r) * sp;
      if (!blocked(s.x + dx, s.z)) s.x += dx; if (!blocked(s.x, s.z + dz)) s.z += dz;
      s.bob += dt * 6 * Math.min(len, 1);
    }
    camera.position.set(s.x, WALK.eye + Math.sin(s.bob) * 0.03, s.z);
    camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');
    const zone = insideHall(s.x, s.z) ? 'hall' : Math.abs(s.x - COURT.x) < COURT.len / 2 && Math.abs(s.z) < COURT.wid / 2 ? 'court' : 'outside';
    if (zone !== s.zone) { s.zone = zone; onZone(zone); }
    if (zone === 'hall') {
      if (underDome(s.x, s.z) && s.pitch > 0.95) find(SITE, 'kubbe');
      if (s.x > MIHRAB_ZONE.x && Math.abs(s.z) < MIHRAB_ZONE.r) find(SITE, 'mihrap');
    }
  });
  return null;
}

/* =========================================================
   SAHNE
   ========================================================= */
export default function SultanahmetScene(props: SceneProps) {
  const { tier, hour, mode, onPanel, zoomPanel, setZoomPanel, onZone } = props;
  const t = TIER[tier];
  const m = useMats();
  const find = useJournal((s) => s.find);
  const walking = mode === 'walk';
  // ışık dönemleri: cami içinde, ilgili saatte bulunulunca işlenir
  const [inside, setInside] = useState(false);
  useEffect(() => { const p = phaseOf(hour); if (p && walking && inside) find(SITE, `isik:${p}`); }, [hour, walking, inside, find]);
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m]);
  return (
    <Canvas shadows={t.shadows} dpr={t.dpr} gl={{ antialias: t.antialias, powerPreference: 'high-performance' }} camera={{ fov: 45, near: 0.5, far: 1200, position: [-60, 260, 240] }}>
      <Surroundings m={m} hour={hour} tier={tier} />
      <Exterior m={m} tier={tier} />
      {/* iç mekân yalnızca yürürken ya da yakındayken çizilir (LOD: uzaktan görünmez, maliyeti yok) */}
      {walking && <Interior m={m} tier={tier} hour={hour} onPanel={onPanel} setZoomPanel={setZoomPanel} />}
      {walking && <Shafts hour={hour} particles={t.particles} />}
      <OrbitCam active={!walking} zoomPanel={zoomPanel} />
      {walking && <Walker zoomPanel={zoomPanel} onZone={(z) => { setInside(z === 'hall'); onZone(z); ambience.setZone(z); }} />}
    </Canvas>
  );
}
