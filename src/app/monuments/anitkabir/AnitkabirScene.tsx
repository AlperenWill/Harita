import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, Html, PerformanceMonitor } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import type { MonumentSceneProps, Quality, TimeOfDay } from '../types';
import { useMonumentStore } from '../store';
import { pinnedQuality } from '../useDeviceProfile';
import data from '../data/ankara-anitkabir.json';
import { walkInput } from '../walkInput';
import {
  FLAGPOLE, HOTSPOTS, INONU, LION_ROAD, MAUSOLEUM, PLAZA, PODIUM_H, POSES, STAIRS, STAIRS_DEPTH,
  STAIR_X0, TOWER, WALK, buildings, groundHeight, isClear, lamps, lions, mausoleumColumns, stairSteps, towers, type V3,
} from './layout';
import { applyNight, createMaterials, flagTexture, type Materials } from './materials';
import { HALL, allColliders, levelFloor, museumBlocked, nearestInteract, type Level } from './interior';
import { HallInterior, HallShell, Museum, MuseumDoor } from './AnitkabirInterior';
import { interact } from './interact';

/* =========================================================
   Ortak geometri ve InstancedMesh yardımcıları
   ========================================================= */
const BOX = new THREE.BoxGeometry(1, 1, 1);
const PYRAMID = new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4);
const CONE = new THREE.ConeGeometry(1, 1, 6);
const BLOB = new THREE.IcosahedronGeometry(1, 0);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 10);

interface Item { pos: V3; scale?: V3; rotY?: number }
const _o = new THREE.Object3D();
/**
 * Tekrarlayan her parça tek bir InstancedMesh'tir: 44 sütun = 1 draw call (44 yerine).
 * Sahnenin tamamı ~35 draw call ile çizilir; mobil GPU'larda asıl darboğaz olan çağrı sayısı düşük kalır.
 */
function Instances({ geo = BOX, mat, items, cast = false, receive = true }: { geo?: THREE.BufferGeometry; mat: THREE.Material; items: Item[]; cast?: boolean; receive?: boolean }) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geo, mat, items.length);
    items.forEach((it, i) => {
      _o.position.set(...it.pos); _o.rotation.set(0, it.rotY ?? 0, 0); _o.scale.set(...(it.scale ?? [1, 1, 1]));
      _o.updateMatrix(); m.setMatrixAt(i, _o.matrix);
    });
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
    return m;
  }, [geo, mat, items]);
  useEffect(() => () => { mesh.dispose(); }, [mesh]);
  mesh.castShadow = cast; mesh.receiveShadow = receive;
  return <primitive object={mesh} />;
}
const Block = ({ pos, size, mat, cast = false }: { pos: V3; size: V3; mat: THREE.Material; cast?: boolean }) => (
  <mesh geometry={BOX} material={mat} position={pos} scale={size} castShadow={cast} receiveShadow />
);
/** Yerel ofseti rotY ile döndürüp dünya konumuna ekler (aslan parçaları için) */
const offset = (p: V3, rotY: number, o: V3): V3 => [p[0] + o[0] * Math.cos(rotY) + o[2] * Math.sin(rotY), p[1] + o[1], p[2] - o[0] * Math.sin(rotY) + o[2] * Math.cos(rotY)];
function seeded(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Kırma çatı: uzun eksen boyunca mahyası olan dört yüzlü çatı (fotoğraftaki gri metal çatılar) */
function hipRoof(w: number, d: number, h: number) {
  const alongX = w >= d, L = alongX ? w : d, S = alongX ? d : w, r = (L - S) / 2;
  const P = (a: number, y: number, b: number): V3 => (alongX ? [a, y, b] : [b, y, a]);
  const A = P(-L / 2, 0, -S / 2), B = P(L / 2, 0, -S / 2), C = P(L / 2, 0, S / 2), D = P(-L / 2, 0, S / 2), R1 = P(-r, h, 0), R2 = P(r, h, 0);
  const tris = [A, B, R2, A, R2, R1, C, D, R1, C, R1, R2, D, A, R1, B, C, R2].flat();
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3)); g.computeVertexNormals(); return g;
}

/* =========================================================
   LOD: kamera uzaklığına göre 0 (yakın) / 1 (orta) / 2 (uzak)
   ========================================================= */
function useLod(center: V3, near: number, far: number, cap: number) {
  const [lvl, setLvl] = useState(Math.max(1, cap));
  const acc = useRef(0), c = useMemo(() => new THREE.Vector3(...center), [center]);
  useFrame(({ camera }, dt) => {
    acc.current += dt; if (acc.current < 0.2) return; acc.current = 0;      // saniyede 5 kontrol yeterli
    const d = camera.position.distanceTo(c);
    // histerezis: sınırda titreyen LOD geçişini önler
    const next = Math.max(cap, d < near * (lvl === 0 ? 1.1 : 1) ? 0 : d < far * (lvl <= 1 ? 1.1 : 1) ? 1 : 2);
    if (next !== lvl) setLvl(next);
  });
  return lvl;
}
const lodCap = (q: Quality) => (q === 'low' ? 1 : 0);
const lodScale = (q: Quality) => (q === 'high' ? 1 : q === 'medium' ? 0.7 : 0.5);

/* =========================================================
   MOZOLE (dış)
   ========================================================= */
const M_CENTER: V3 = [MAUSOLEUM.x, PODIUM_H, 0];
function Mausoleum({ m, quality, night }: { m: Materials; quality: Quality; night: boolean }) {
  // sütunlar yapının kimliği: genel görünümde de (LOD1) görünür, yalnızca çok uzakta tek bloğa iner
  const lvl = useLod(M_CENTER, 260 * lodScale(quality), 1100, lodCap(quality));
  const cols = useMemo(() => mausoleumColumns(), []);
  const items = useMemo(() => {
    const s = MAUSOLEUM.colSize, steps = stairSteps();
    const coarse = steps.filter((_, i) => i % 7 === 0).map((b) => ({ pos: [b.pos[0], b.pos[1] + STAIRS.rise * 3, b.pos[2]] as V3, scale: [b.size[0], STAIRS.rise * 7, b.size[2]] as V3 }));
    return {
      pillars: cols.map((p) => ({ pos: p, scale: [s, MAUSOLEUM.colH, s] as V3 })),
      capitals: cols.map((p) => ({ pos: [p[0], PODIUM_H + MAUSOLEUM.colH - 0.35, p[2]] as V3, scale: [s + 0.5, 0.7, s + 0.5] as V3 })),
      bases: cols.map((p) => ({ pos: [p[0], PODIUM_H + 0.25, p[2]] as V3, scale: [s + 0.4, 0.5, s + 0.4] as V3 })),
      steps: steps.map((b) => ({ pos: b.pos, scale: b.size })),
      coarse,
    };
  }, [cols]);
  const { len, wid, h, colH, x, podium } = MAUSOLEUM, top = PODIUM_H + colH, stairX = STAIR_X0 + STAIRS_DEPTH / 2;
  const hx0 = HALL.front, dw = HALL.door.w, dh = HALL.door.h;

  return (
    <group>
      {/* kaide (72 × 52 m) ve merdiveni kuşatan kabartma duvarları */}
      <Block pos={[(podium.x0 + podium.x1) / 2, PODIUM_H / 2, 0]} size={[podium.x1 - podium.x0, PODIUM_H, podium.halfW * 2]} mat={m.travertine} cast />
      {[-1, 1].map((s) => <Block key={s} pos={[stairX, PODIUM_H / 2, s * (STAIRS.width / 2 + 3)]} size={[STAIRS_DEPTH, PODIUM_H, 6]} mat={m.travertineDark} cast />)}

      {lvl === 2 ? (
        <>
          {/* LOD2: tek blok + rampa (~50 üçgen) */}
          <Block pos={[x, PODIUM_H + h / 2, 0]} size={[len, h, wid]} mat={m.travertineLight} cast />
          <mesh geometry={BOX} material={m.travertine} position={[stairX, PODIUM_H / 2, 0]} scale={[Math.hypot(STAIRS_DEPTH, PODIUM_H), 0.4, STAIRS.width]} rotation={[0, 0, Math.atan2(PODIUM_H, STAIRS_DEPTH)]} />
        </>
      ) : (
        <>
          {/* Şeref Holü kabuğu: ön duvar (üç giriş), sütun araları pencereli yan cepheler, Ankara Kalesi'ne bakan pencereli arka duvar */}
          <HallShell m={m} />
          {/* çatı levhası ve kurşun kaplama */}
          <Block pos={[x, top + (h - colH) / 2, 0]} size={[len, h - colH, wid]} mat={m.travertineLight} cast />
          <Block pos={[x, top + (h - colH) + 0.12, 0]} size={[len - 3, 0.24, wid - 3]} mat={m.roofMetal} />
          <Instances mat={m.travertineLight} items={items.pillars} cast />
          <Instances mat={m.travertine} items={lvl === 0 ? items.steps : items.coarse} />
        </>
      )}

      {lvl === 0 && (
        <>
          {/* LOD0: sütun başlık ve kaideleri, kapı kasası, yazıt panoları, hitabet kürsüsü, saçak */}
          <Instances mat={m.travertine} items={items.capitals} />
          <Instances mat={m.travertine} items={items.bases} />
          <Block pos={[x, top + (h - colH) + 0.3, 0]} size={[len + 1.6, 0.4, wid + 1.6]} mat={m.travertine} />
          {[-1, 1].map((s) => <Block key={'k' + s} pos={[hx0 - 0.15, PODIUM_H + dh / 2, s * (dw / 2 + 0.3)]} size={[0.5, dh, 0.6]} mat={m.bronze} />)}
          <Block pos={[hx0 - 0.15, PODIUM_H + dh + 0.3, 0]} size={[0.5, 0.6, dw + 1.2]} mat={m.bronze} />
          {/* Gençliğe Hitabe (solda) ve Onuncu Yıl Nutku (sağda): taş üzerine altın varak yazı panoları, kapılar arasında */}
          {[-1, 1].map((s) => <Block key={'y' + s} pos={[hx0 - 0.07, PODIUM_H + 6, s * 8.6]} size={[0.14, 7, 5.6]} mat={m.gold} />)}
          <Block pos={[STAIR_X0 + STAIRS_DEPTH * 0.5, PODIUM_H * 0.5 + 0.9, 0]} size={[2, 1.8, 3.2]} mat={m.marble} />
          {[-1, 1].map((s) => <Block key={'r' + s} pos={[STAIR_X0 - 0.07, PODIUM_H * 0.5, s * (STAIRS.width / 2 + 3)]} size={[0.14, PODIUM_H * 0.7, 5]} mat={m.travertineLight} />)}
        </>
      )}

      {/* meşaleler: gece modunda ışık saçar */}
      {[-1, 1].map((s) => (
        <group key={'t' + s} position={[STAIR_X0 + 2, PODIUM_H, s * (STAIRS.width / 2 + 3)]}>
          <mesh geometry={CYL} material={m.bronze} position={[0, 1.1, 0]} scale={[0.5, 2.2, 0.5]} />
          <mesh geometry={CYL} material={m.bronze} position={[0, 2.4, 0]} scale={[1.1, 0.4, 1.1]} />
          {night && <mesh geometry={BLOB} material={m.flame} position={[0, 3.1, 0]} scale={[0.7, 1.1, 0.7]} />}
          {night && quality !== 'low' && <pointLight position={[0, 4, 0]} color="#ffa64a" intensity={900} distance={70} decay={2} />}
        </group>
      ))}
    </group>
  );
}

/* Şeref Holü içi ve müze: AnitkabirInterior.tsx */

/* =========================================================
   MEYDAN, GALERİLİ BİNALAR, KULELER, İNÖNÜ, BAYRAK
   ========================================================= */
function PlazaAndBuildings({ m, quality }: { m: Materials; quality: Quality }) {
  const lvl = useLod([0, 0, 0], 300 * lodScale(quality), 1000, lodCap(quality));
  const bl = useMemo(() => buildings(), []);
  const tw = useMemo(() => towers(), []);
  const PORCH = 4;
  const { items, roofs } = useMemo(() => {
    const bodies: Item[] = [], porch: Item[] = [], pillars: Item[] = [], recess: Item[] = [], windows: Item[] = [];
    const roofs = bl.map((b) => {
      const [w, h, d] = b.size, [x, , z] = b.pos, alongX = b.portico !== '+x', sgn = b.portico === '-z' ? -1 : 1;
      bodies.push({ pos: [x, h / 2, z], scale: [w, h, d] });
      const L = alongX ? w : d, n = Math.round(L / 5);
      for (let i = 0; i <= n; i++) {
        const t = -L / 2 + (L * i) / n;
        pillars.push({ pos: alongX ? [x + t, (h - 0.8) / 2, z + sgn * (d / 2 + PORCH - 0.5)] : [x + d / 2 + PORCH - 0.5, (h - 0.8) / 2, z + t], scale: [0.9, h - 0.8, 0.9] });
        if (i < n) windows.push({ pos: alongX ? [x + t + L / n / 2, h * 0.55, z - sgn * (d / 2 + 0.03)] : [x - d / 2 - 0.03, h * 0.55, z + t + L / n / 2], scale: alongX ? [1.4, 2.4, 0.08] : [0.08, 2.4, 1.4] });
      }
      porch.push({ pos: alongX ? [x, h - 0.4, z + sgn * (d / 2 + PORCH / 2)] : [x + d / 2 + PORCH / 2, h - 0.4, z], scale: alongX ? [w, 0.8, PORCH] : [PORCH, 0.8, d] });
      recess.push({ pos: alongX ? [x, (h - 0.8) / 2, z + sgn * (d / 2 + 0.06)] : [x + d / 2 + 0.06, (h - 0.8) / 2, z], scale: alongX ? [w - 1, h - 1.4, 0.12] : [0.12, h - 1.4, d - 1] });
      const rw = alongX ? w + 1 : d + PORCH + 1, rd = alongX ? d + PORCH + 1 : w + 1;
      return { geo: hipRoof(alongX ? rw : rd, alongX ? rd : rw, 3.4), pos: (alongX ? [x, h, z + (sgn * PORCH) / 2] : [x + PORCH / 2, h, z]) as V3 };
    });
    return {
      roofs,
      items: {
        bodies, porch, pillars, recess, windows,
        tBodies: tw.map((t) => ({ pos: [t.pos[0], TOWER.h / 2, t.pos[2]] as V3, scale: [TOWER.w, TOWER.h, TOWER.d] as V3 })),
        tRoofs: tw.map((t) => ({ pos: [t.pos[0], TOWER.h + TOWER.roofH / 2, t.pos[2]] as V3, scale: [(TOWER.w / Math.SQRT2) * 1.12, TOWER.roofH, (TOWER.d / Math.SQRT2) * 1.12] as V3 })),
        spears: tw.map((t) => ({ pos: [t.pos[0], TOWER.h + TOWER.roofH + 0.9, t.pos[2]] as V3, scale: [0.18, 1.8, 0.18] as V3 })),
        cornices: tw.map((t) => ({ pos: [t.pos[0], TOWER.h - 0.2, t.pos[2]] as V3, scale: [TOWER.w + 0.8, 0.4, TOWER.d + 0.8] as V3 })),
        tWindows: tw.flatMap((t) => [-1, 1].map((s) => ({ pos: [t.pos[0], TOWER.h * 0.62, t.pos[2] + s * (TOWER.d / 2 + 0.03)] as V3, scale: [1.2, 3, 0.08] as V3 }))),
      },
    };
  }, [bl, tw]);
  useEffect(() => () => roofs.forEach((r) => r.geo.dispose()), [roofs]);
  const flag = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => { if (flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 0.9) * 0.18; });

  return (
    <group>
      <Block pos={[2, -0.16, 0]} size={[PLAZA.w + 40, 0.3, PLAZA.d + 44]} mat={m.travertine} />
      <mesh geometry={BOX} material={m.kilim} position={[0, -0.1, 0]} scale={[PLAZA.w, 0.3, PLAZA.d]} receiveShadow />
      <Instances mat={m.travertine} items={items.bodies} cast />
      {roofs.map((r, i) => <mesh key={i} geometry={r.geo} material={m.roofMetal} position={r.pos} castShadow />)}
      {lvl < 2 && <><Instances mat={m.travertine} items={items.porch} /><Instances mat={m.travertineLight} items={items.pillars} /><Instances mat={m.travertineDark} items={items.recess} /></>}
      <Instances mat={m.travertine} items={items.tBodies} cast />
      <Instances geo={PYRAMID} mat={m.roofMetal} items={items.tRoofs} cast />
      {lvl === 0 && (
        <>
          <Instances geo={CONE} mat={m.bronze} items={items.spears} />
          <Instances mat={m.travertineLight} items={items.cornices} />
        </>
      )}
      {lvl < 2 && <><Instances mat={m.windowGlow} items={items.windows} receive={false} /><Instances mat={m.windowGlow} items={items.tWindows} receive={false} /></>}

      {/* İsmet İnönü'nün lahdi */}
      <Block pos={[INONU.pos[0], 0.3, 0]} size={[3.2, 0.6, 5.2]} mat={m.travertineLight} />
      <Block pos={[INONU.pos[0], 1.25, 0]} size={[1.5, 1.3, 3.2]} mat={m.redMarble} />

      {/* bayrak direği */}
      <group position={FLAGPOLE.pos}>
        <Block pos={[0, 0.9, 0]} size={[3.4, 1.8, 3.4]} mat={m.travertineLight} cast />
        <mesh geometry={CYL} material={m.steel} position={[0, FLAGPOLE.h / 2 + 1.8, 0]} scale={[0.28, FLAGPOLE.h, 0.28]} castShadow />
        <group position={[0, FLAGPOLE.h - 2, 0]}>
          <mesh ref={flag}>
            <planeGeometry args={[10.5, 7]} onUpdate={(g) => g.translate(5.25, 0, 0)} />
            <meshStandardMaterial map={flagTexture()} side={THREE.DoubleSide} roughness={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* =========================================================
   ASLANLI YOL
   ========================================================= */
const ROAD_MID: V3 = [LION_ROAD.x, 0, LION_ROAD.startZ - LION_ROAD.length / 2];
function LionRoad({ m, quality }: { m: Materials; quality: Quality }) {
  const lvl = useLod(ROAD_MID, 240 * lodScale(quality), 480 * lodScale(quality), lodCap(quality));
  const items = useMemo(() => {
    const L = lions();
    const part = (o: V3, s: V3) => L.map((l) => ({ pos: offset(l.pos, l.rotY, o), scale: s, rotY: l.rotY }));
    const hedges: Item[] = [];
    for (const s of [-1, 1]) hedges.push({ pos: [LION_ROAD.x + s * (LION_ROAD.width / 2 + 7), 0.6, ROAD_MID[2]], scale: [1.6, 1.2, LION_ROAD.length] });
    return {
      pedestals: part([0, 0.3, 0], [1.5, 0.6, 3.4]),
      simple: part([0, 1.3, 0], [1.2, 1.5, 2.8]),
      bodies: part([0, 1.15, -0.2], [1.15, 1.1, 2.5]),
      heads: part([0, 2.0, 0.95], [0.95, 1.0, 0.95]),
      manes: part([0, 1.75, 0.55], [1.25, 1.35, 0.7]),
      paws: part([0, 0.78, 1.35], [1.15, 0.36, 0.9]),
      hedges,
    };
  }, []);
  return (
    <group>
      <mesh geometry={BOX} material={m.paving} position={[LION_ROAD.x, -0.05, ROAD_MID[2] + 4]} scale={[LION_ROAD.width, 0.2, LION_ROAD.length + 30]} receiveShadow />
      <Instances mat={m.treeDark} items={items.hedges} />
      <Instances mat={m.travertine} items={items.pedestals} />
      {lvl === 0 ? (
        <>
          <Instances mat={m.lion} items={items.bodies} cast={quality === 'high'} />
          <Instances mat={m.lion} items={items.manes} />
          <Instances mat={m.lion} items={items.heads} />
          <Instances mat={m.lion} items={items.paws} />
        </>
      ) : <Instances mat={m.lion} items={items.simple} />}
    </group>
  );
}

/* =========================================================
   BARIŞ PARKI — instanced düşük poligonlu ağaçlar, çevre yolu
   ========================================================= */
function PeacePark({ m, quality }: { m: Materials; quality: Quality }) {
  const count = quality === 'high' ? 1500 : quality === 'medium' ? 650 : 280;
  const items = useMemo(() => {
    const R = seeded(1953), pines: Item[] = [], leafy: Item[] = [], trunks: Item[] = [];
    let guard = 0;
    while (pines.length + leafy.length < count && guard++ < count * 30) {
      const a = R() * Math.PI * 2, r = 60 + Math.pow(R(), 0.7) * 560, x = 20 + Math.cos(a) * r, z = -60 + Math.sin(a) * r;
      if (!isClear(x, z)) continue;
      const h = 8 + R() * 8;
      if (R() > 0.6) pines.push({ pos: [x, 1.6 + h / 2, z], scale: [h * 0.26, h, h * 0.26], rotY: R() * 6 });
      else leafy.push({ pos: [x, 2 + h * 0.4, z], scale: [h * 0.48, h * 0.44, h * 0.48], rotY: R() * 6 });
      trunks.push({ pos: [x, 1.2, z], scale: [0.28, 2.4, 0.28] });
    }
    // Aslanlı Yol'un iki yanındaki sık ağaç bantları
    for (let z = LION_ROAD.startZ - 6; z > LION_ROAD.startZ - LION_ROAD.length; z -= 7) for (const s of [-1, 1]) for (const k of [0, 1]) {
      const x = LION_ROAD.x + s * (LION_ROAD.width / 2 + 13 + k * 8) + (R() - 0.5) * 3, h = 10 + R() * 4;
      leafy.push({ pos: [x, 2 + h * 0.4, z + (R() - 0.5) * 3], scale: [h * 0.46, h * 0.46, h * 0.46], rotY: R() * 6 });
    }
    return { pines, leafy, trunks };
  }, [count]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, -0.32, -60]} material={m.grass} receiveShadow>
        <circleGeometry args={[950, 48]} />
      </mesh>
      {/* çevre yolu ve Çankaya girişindeki otopark */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[30, -0.26, -20]} material={m.asphalt}>
        <ringGeometry args={[176, 184, 72]} />
      </mesh>
      <Block pos={[0, -0.24, PLAZA.d / 2 + 44]} size={[90, 0.1, 30]} mat={m.asphalt} />
      <Instances geo={CONE} mat={m.treeDark} items={items.pines} receive={false} />
      <Instances geo={BLOB} mat={m.treeLight} items={items.leafy} receive={false} />
      {quality === 'high' && <Instances geo={CYL} mat={m.trunk} items={items.trunks} receive={false} />}
    </group>
  );
}

/* =========================================================
   GECE AYDINLATMASI — direkler, parlayan lambalar, ışık haleleri
   ========================================================= */
let _glowTex: THREE.CanvasTexture | null = null;
function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,240,200,1)'); r.addColorStop(0.35, 'rgba(255,205,120,.5)'); r.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return (_glowTex = new THREE.CanvasTexture(c));
}
const DISC = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
const POOL = new THREE.MeshBasicMaterial({ color: '#ffc878', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending });
function Lamps({ m, night, quality }: { m: Materials; night: boolean; quality: Quality }) {
  const { posts, bulbs, glow, pools } = useMemo(() => {
    const L = lamps(), a = new Float32Array(L.length * 3);
    L.forEach((p, i) => { a[i * 3] = p[0]; a[i * 3 + 1] = p[1] + 5.3; a[i * 3 + 2] = p[2]; });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    return {
      posts: L.map((p) => ({ pos: [p[0], p[1] + 2.5, p[2]] as V3, scale: [0.12, 5, 0.12] as V3 })),
      bulbs: L.map((p) => ({ pos: [p[0], p[1] + 5.3, p[2]] as V3, scale: [0.42, 0.42, 0.42] as V3 })),
      // lambanın yere düşen ışık havuzu: gerçek ışık hesabı yapmadan aydınlık hissi verir
      pools: L.map((p) => ({ pos: [p[0], p[1] + 0.12, p[2]] as V3, scale: [11, 1, 11] as V3 })),
      glow: g,
    };
  }, []);
  return (
    <group>
      <Instances geo={CYL} mat={m.dark} items={posts} receive={false} />
      <Instances geo={BLOB} mat={m.bulb} items={bulbs} receive={false} />
      {night && (
        <points geometry={glow}>
          <pointsMaterial map={glowTexture()} color="#ffd27a" size={14} sizeAttenuation transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      )}
      {night && <Instances geo={DISC} mat={POOL} items={pools} receive={false} />}
      {/* gerçek ışık kaynakları pahalıdır: yalnızca yüksek kalitede, meydanı ve yolu aydınlatan birkaç tane */}
      {night && quality === 'high' && (
        <>
          <pointLight position={[-30, 9, 0]} color="#ffcf8a" intensity={2600} distance={120} decay={2} />
          <pointLight position={[32, 9, 0]} color="#ffcf8a" intensity={2600} distance={120} decay={2} />
          <pointLight position={[LION_ROAD.x, 8, LION_ROAD.startZ - 90]} color="#ffcf8a" intensity={2200} distance={130} decay={2} />
        </>
      )}
    </group>
  );
}

/* =========================================================
   IŞIK, ATMOSFER, PARTİKÜLLER
   ========================================================= */
const TIMES: Record<TimeOfDay, { sun: V3; sunColor: string; sunI: number; sky: string; ground: string; hemiI: number; bg: string; fog: number }> = {
  sabah: { sun: [0.5, 0.34, -0.85], sunColor: '#ffd3a1', sunI: 2.0, sky: '#cfe0f5', ground: '#8a7a5a', hemiI: 0.6, bg: '#d6e3ef', fog: 0.0019 },
  ogle: { sun: [-0.4, 1, 0.55], sunColor: '#fff3df', sunI: 2.7, sky: '#dcebfa', ground: '#9c8a66', hemiI: 0.75, bg: '#a9cdea', fog: 0.0013 },
  aksam: { sun: [-0.9, 0.26, 0.4], sunColor: '#ff9d5c', sunI: 2.1, sky: '#f0c5a0', ground: '#6a5a48', hemiI: 0.5, bg: '#eab38d', fog: 0.002 },
  gece: { sun: [0.35, 0.8, 0.4], sunColor: '#8fa6d8', sunI: 0.3, sky: '#2a3757', ground: '#0d0e14', hemiI: 0.45, bg: '#0b1020', fog: 0.0022 },
};
function Atmosphere({ time, effects, shadows, indoor }: { time: TimeOfDay; effects: boolean; shadows: boolean; indoor: boolean }) {
  const t = TIMES[time], { scene } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null!);
  useEffect(() => {
    scene.background = new THREE.Color(indoor ? '#141210' : t.bg);
    // Üstel sis: uzaktaki ağaçları ve park sınırını yumuşatır, düşük poligonlu arka planı gizler
    scene.fog = effects ? new THREE.FogExp2(t.bg, t.fog) : null;
  }, [scene, t, effects, indoor]);
  useEffect(() => {
    const l = sun.current; l.target.position.set(30, 0, 0); l.target.updateMatrixWorld();
    const c = l.shadow.camera; c.left = -150; c.right = 150; c.top = 150; c.bottom = -150; c.near = 10; c.far = 700; c.updateProjectionMatrix();
  }, []);
  return (
    <>
      {/* müzede (kaide içinde, gün ışığı yok) güneş kapanır, ortam ışığı loşlaşır */}
      <hemisphereLight args={indoor ? ['#f2e4cc', '#3a3026', 0.55] : [t.sky, t.ground, t.hemiI]} />
      <directionalLight
        ref={sun} position={[t.sun[0] * 300 + 30, t.sun[1] * 300, t.sun[2] * 300]} color={t.sunColor} intensity={indoor ? 0 : t.sunI}
        castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.6}
      />
    </>
  );
}
function Motes({ night }: { night: boolean }) {
  const ref = useRef<THREE.Points>(null!);
  const geo = useMemo(() => {
    const R = seeded(7), n = 140, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = 20 + (R() - 0.5) * 240; a[i * 3 + 1] = 2 + R() * 28; a[i * 3 + 2] = (R() - 0.5) * 200; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g;
  }, []);
  useFrame(({ clock }) => { ref.current.position.y = Math.sin(clock.elapsedTime * 0.3) * 1.5; });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color={night ? '#ffd98a' : '#fff6dc'} size={night ? 0.6 : 0.7} sizeAttenuation transparent opacity={night ? 0.85 : 0.5} depthWrite={false} />
    </points>
  );
}

/* =========================================================
   KAMERA 1: kuş bakışı — orbit / pinch-zoom / sinematik geçişler
   ========================================================= */
const ACTION = CameraControlsImpl.ACTION;
function CameraRig({ target, enabled }: { target: string; enabled: boolean }) {
  const ref = useRef<CameraControlsImpl>(null!);
  const collider = useRef<THREE.Mesh>(null!);
  const size = useThree((s) => s.size);
  const portrait = size.height > size.width;

  useEffect(() => {
    const c = ref.current;
    c.touches.one = ACTION.TOUCH_ROTATE;            // tek parmak: döndür
    c.touches.two = ACTION.TOUCH_DOLLY_TRUCK;       // iki parmak: pinch-zoom + kaydır
    c.mouseButtons.left = ACTION.ROTATE; c.mouseButtons.right = ACTION.TRUCK; c.mouseButtons.wheel = ACTION.DOLLY;
    c.minDistance = 34; c.maxDistance = 760;        // model içine girmeyi ve sonsuza uzaklaşmayı engelle
    c.minPolarAngle = 0.15; c.maxPolarAngle = 1.46; // zeminin altına inilemez
    c.dollyToCursor = true; c.smoothTime = 0.35; c.draggingSmoothTime = 0.12;
    c.setBoundary(new THREE.Box3(new THREE.Vector3(-170, 0, -380), new THREE.Vector3(190, 40, 120)));
    c.colliderMeshes = [collider.current];          // kamera mozole bloğunun içinden geçemez
  }, []);

  useEffect(() => {
    const c = ref.current; c.enabled = enabled;
    if (!enabled) return;
    const p = POSES[target] ?? POSES.overview;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dist = p.distance * (portrait ? 1.55 : 1);
    const sp = Math.sin(p.polar), pos: V3 = [p.target[0] + dist * sp * Math.sin(p.azimuth), p.target[1] + dist * Math.cos(p.polar), p.target[2] + dist * sp * Math.cos(p.azimuth)];
    c.smoothTime = target === 'entrance' ? 1.1 : 0.8;                         // sinematik: daha uzun sönüm
    c.setLookAt(pos[0], pos[1], pos[2], p.target[0], p.target[1], p.target[2], !reduce).then(() => { c.smoothTime = 0.35; });
  }, [target, portrait, enabled]);

  return (
    <>
      <CameraControls ref={ref} makeDefault />
      <mesh ref={collider} position={[MAUSOLEUM.x, (PODIUM_H + MAUSOLEUM.h) / 2, 0]} scale={[MAUSOLEUM.len + 10, PODIUM_H + MAUSOLEUM.h + 4, MAUSOLEUM.wid + 10]} geometry={BOX}>
        <meshBasicMaterial visible={false} />
      </mesh>
    </>
  );
}

/* =========================================================
   KAMERA 2: yürüme modu — birinci şahıs, çarpışma ve merdiven çıkma
   ========================================================= */
const COLLIDERS = allColliders();
function blocked(x: number, z: number, curH: number, lv: Level = 'out') {
  const [bx0, bz0, bx1, bz1] = WALK.bound, r = WALK.radius;
  if (lv !== 'out') return museumBlocked(lv, x, z, r);
  if (x < bx0 || x > bx1 || z < bz0 || z > bz1) return true;
  if (Math.abs(groundHeight(x, z) - curH) > 0.6) return true;      // kaide kenarından düşülmez, duvara tırmanılmaz; merdiven rampa gibi çıkılır
  return COLLIDERS.some(([x0, z0, x1, z1]) => x > x0 - r && x < x1 + r && z > z0 - r && z < z1 + r);
}
function Walker() {
  const { camera, gl } = useThree();
  const teleport = useMonumentStore((s) => s.teleport);
  const st = useRef({ x: WALK.spawn.x, z: WALK.spawn.z, yaw: WALK.spawn.yaw, pitch: 0, bob: 0, level: 'out' as Level, prompt: '' });
  const keys = useRef<Record<string, boolean>>({});
  if (location.search.includes('debug')) (window as unknown as { __walk: unknown }).__walk = st.current;

  useEffect(() => { if (teleport) Object.assign(st.current, { x: teleport.x, z: teleport.z, yaw: teleport.yaw, pitch: 0, level: teleport.level ?? 'out' }); }, [teleport]);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera, prev = { fov: cam.fov, near: cam.near };
    cam.fov = 64; cam.near = 0.25; cam.updateProjectionMatrix();
    const el = gl.domElement; let drag: { id: number; x: number; y: number } | null = null;
    const down = (e: PointerEvent) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const k = e.pointerType === 'touch' ? 0.006 : 0.004;
      st.current.yaw -= (e.clientX - drag.x) * k; st.current.pitch = THREE.MathUtils.clamp(st.current.pitch - (e.clientY - drag.y) * k, -1.2, 1.2);
      drag.x = e.clientX; drag.y = e.clientY;
    };
    const up = () => { drag = null; };
    const kd = (e: KeyboardEvent) => { keys.current[e.code] = true; if (e.code === 'KeyE' && !e.repeat) interact(); if (e.code === 'Escape' && useMonumentStore.getState().exhibit) { e.preventDefault(); useMonumentStore.getState().set({ exhibit: null }); } }, ku = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => {
      el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      cam.fov = prev.fov; cam.near = prev.near; cam.updateProjectionMatrix(); walkInput.x = walkInput.y = 0;
    };
  }, [camera, gl]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05), s = st.current, k = keys.current;
    let f = -walkInput.y, r = walkInput.x;
    if (k.KeyW || k.ArrowUp) f += 1; if (k.KeyS || k.ArrowDown) f -= 1; if (k.KeyD || k.ArrowRight) r += 1; if (k.KeyA || k.ArrowLeft) r -= 1;
    const len = Math.hypot(f, r);
    if (len > 0.05) {
      if (len > 1) { f /= len; r /= len; }
      const inside = s.level !== 'out', sp = (k.ShiftLeft || k.ShiftRight ? (inside ? 6 : 16) : inside ? 3.2 : 8.5) * dt, h = groundHeight(s.x, s.z);
      const dx = (-Math.sin(s.yaw) * f + Math.cos(s.yaw) * r) * sp, dz = (-Math.cos(s.yaw) * f - Math.sin(s.yaw) * r) * sp;
      if (!blocked(s.x + dx, s.z, h, s.level)) s.x += dx;                     // eksen eksen: duvar boyunca kayarak ilerle
      if (!blocked(s.x, s.z + dz, groundHeight(s.x, s.z), s.level)) s.z += dz;
      s.bob += dt * 9 * Math.min(len, 1);
    }
    const floor = levelFloor(s.level) ?? groundHeight(s.x, s.z);
    camera.position.set(s.x, floor + WALK.eye + Math.sin(s.bob) * 0.04, s.z);
    // yakındaki kapı / incelenebilir nokta → istem (kart kendiliğinden açılmaz)
    const near = nearestInteract(s.level, s.x, s.z), pid = near ? (near.kind === 'door' ? 'door:' + near.door.id : 'ex:' + near.ex.id) : '';
    if (pid !== s.prompt) { s.prompt = pid; useMonumentStore.getState().set({ prompt: near ? { id: pid, label: near.kind === 'door' ? near.door.label : 'İncele: ' + near.ex.title } : null }); }
    camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');
  });
  return null;
}

/* =========================================================
   HOTSPOT'LAR
   ========================================================= */
function Hotspots({ onPointClick }: { onPointClick?: (id: string) => void }) {
  const selected = useMonumentStore((s) => s.selectedPoint);
  return (
    <>
      {data.metadata.points.map((p) => (
        <Html key={p.id} position={HOTSPOTS[p.id]} center zIndexRange={[30, 0]}>
          {/* 44×44 px dokunma alanı; görünen nokta daha küçük */}
          <button
            type="button" aria-label={p.name} aria-pressed={selected === p.id}
            onClick={(e) => { e.stopPropagation(); useMonumentStore.getState().selectPoint(p.id); onPointClick?.(p.id); }}
            className="group relative grid h-11 w-11 place-items-center rounded-full outline-none"
          >
            <span className={`absolute h-7 w-7 rounded-full bg-brand/40 ${selected === p.id ? 'animate-ping' : 'opacity-0 group-hover:opacity-100 group-hover:animate-ping group-focus-visible:opacity-100'}`} />
            <span className={`relative h-4 w-4 rounded-full border-2 border-white shadow-[0_0_0_3px_rgba(240,68,72,.35)] transition group-hover:scale-125 group-hover:shadow-[0_0_14px_5px_rgba(240,68,72,.7)] ${selected === p.id ? 'scale-125 bg-white ring-4 ring-brand' : 'bg-brand'}`} />
            <span className={`pointer-events-none absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink/90 px-2 py-1 text-xs font-semibold text-white transition ${selected === p.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}>
              {p.name}
            </span>
          </button>
        </Html>
      ))}
    </>
  );
}

/* =========================================================
   SAHNE
   ========================================================= */
function World({ onPointClick }: Pick<MonumentSceneProps, 'onPointClick'>) {
  const quality = useMonumentStore((s) => s.quality);
  const saver = useMonumentStore((s) => s.batterySaver);
  const time = useMonumentStore((s) => s.timeOfDay);
  const walking = useMonumentStore((s) => s.mode === 'walk');
  const level = useMonumentStore((s) => s.level);
  const q: Quality = saver ? 'low' : quality;
  const night = time === 'gece';
  const m = useMemo(() => createMaterials(), []);
  useEffect(() => applyNight(m, night), [m, night]);
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m]);
  return (
    <>
      <Atmosphere time={time} effects={q !== 'low' && level === 'out'} shadows={q !== 'low' && !night} indoor={level !== 'out'} />
      {/* müzedeyken dış dünya çizilmez: müze zemini meydanın altında (dış zemin içeriden görünmesin) ve GPU yalnız müzeyi çizer */}
      {level === 'out' ? (
        <>
          <Mausoleum m={m} quality={q} night={night} />
          <HallInterior m={m} night={night} lite={q === 'low'} />
          <MuseumDoor m={m} />
          <PlazaAndBuildings m={m} quality={q} />
          <LionRoad m={m} quality={q} />
          <PeacePark m={m} quality={q} />
          <Lamps m={m} night={night} quality={q} />
          {q !== 'low' && <Motes night={night} />}
        </>
      ) : <Museum m={m} level={level} />}
      {!walking && <Hotspots onPointClick={onPointClick} />}
      {walking && <Walker />}
    </>
  );
}

/**
 * <AnitkabirScene /> — harita sisteminden bağımsız çalışır.
 * isActive=false iken kare döngüsü durur (GPU ve pil harcanmaz).
 */
export default function AnitkabirScene({ isActive, cameraTarget = 'overview', onPointClick }: MonumentSceneProps) {
  const quality = useMonumentStore((s) => s.quality);
  const walking = useMonumentStore((s) => s.mode === 'walk');
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const toEntrance = () => { const s = useMonumentStore.getState(); if (s.mode !== 'orbit') return; s.selectPoint(null); s.setCameraTarget('entrance'); };
  return (
    <div
      className="h-full w-full touch-none"
      onDoubleClick={toEntrance}
      onPointerUp={(e) => {                                   // dokunmatikte çift dokunma
        if (e.pointerType !== 'touch') return;
        const now = performance.now(), l = lastTap.current;
        if (now - l.t < 320 && Math.hypot(e.clientX - l.x, e.clientY - l.y) < 28) { toEntrance(); l.t = 0; } else lastTap.current = { t: now, x: e.clientX, y: e.clientY };
      }}
    >
      <Canvas
        shadows="soft"
        frameloop={isActive ? 'always' : 'never'}
        dpr={quality === 'high' ? [1, 1.75] : quality === 'medium' ? [1, 1.4] : 1}
        gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
        camera={{ fov: 42, near: 1, far: 2600, position: [120, 240, 200] }}
      >
        {/* FPS düşerse kalite bir kademe iner (yüksek → orta → düşük) */}
        {!pinnedQuality && <PerformanceMonitor onDecline={() => { const s = useMonumentStore.getState(); s.setQuality(s.quality === 'high' ? 'medium' : 'low'); }} />}
        <World onPointClick={onPointClick} />
        <CameraRig target={cameraTarget} enabled={!walking} />
      </Canvas>
    </div>
  );
}
