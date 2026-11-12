import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, Html, PerformanceMonitor } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import type { MonumentSceneProps, Quality, TimeOfDay } from '../types';
import { useMonumentStore } from '../store';
import { pinnedQuality } from '../useDeviceProfile';
import data from '../data/ankara-anitkabir.json';
import {
  FLAGPOLE, HOTSPOTS, INONU, LION_ROAD, MAUSOLEUM, MAUSOLEUM_FRONT_Z, PLAZA, PODIUM_H, POSES, STAIRS, TOWER,
  isClear, lions, mausoleumColumns, porticos, stairSteps, towers, type V3,
} from './layout';
import { applyNight, createMaterials, flagTexture, type Materials } from './materials';

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
   MOZOLE
   ========================================================= */
const M_CENTER: V3 = [0, PODIUM_H, MAUSOLEUM.z];
function Mausoleum({ m, quality, night }: { m: Materials; quality: Quality; night: boolean }) {
  const lvl = useLod(M_CENTER, 260 * lodScale(quality), 520 * lodScale(quality), lodCap(quality));
  const cols = useMemo(() => mausoleumColumns(), []);
  const items = useMemo(() => {
    const s = MAUSOLEUM.colSize;
    const steps = stairSteps();
    const coarse = steps.filter((_, i) => i % 7 === 0).map((b) => ({ pos: [b.pos[0], b.pos[1] + STAIRS.rise * 3, b.pos[2]] as V3, scale: [b.size[0], STAIRS.rise * 7, b.size[2]] as V3 }));
    return {
      pillars: cols.map((p) => ({ pos: p, scale: [s, MAUSOLEUM.colH, s] as V3 })),
      capitals: cols.map((p) => ({ pos: [p[0], PODIUM_H + MAUSOLEUM.colH - 0.35, p[2]] as V3, scale: [s + 0.5, 0.7, s + 0.5] as V3 })),
      bases: cols.map((p) => ({ pos: [p[0], PODIUM_H + 0.25, p[2]] as V3, scale: [s + 0.4, 0.5, s + 0.4] as V3 })),
      steps: steps.map((b) => ({ pos: b.pos, scale: b.size })),
      coarse,
    };
  }, [cols]);
  const { w, d, h, colH, z } = MAUSOLEUM, top = PODIUM_H + colH, stairZ = -PLAZA.d / 2 - (STAIRS.steps * STAIRS.tread) / 2;
  const podFront = -PLAZA.d / 2 - STAIRS.steps * STAIRS.tread, podBack = z - d / 2 - 7;   // podyum: merdivenin bittiği yerden arka terasa

  return (
    <group>
      {/* podyum ve merdiveni kuşatan kabartma duvarları */}
      <Block pos={[0, PODIUM_H / 2, (podFront + podBack) / 2]} size={[w + 16, PODIUM_H, podFront - podBack]} mat={m.travertine} cast />
      {[-1, 1].map((s) => <Block key={s} pos={[s * (STAIRS.width / 2 + 3), PODIUM_H / 2, stairZ]} size={[6, PODIUM_H, STAIRS.steps * STAIRS.tread]} mat={m.travertineDark} cast />)}

      {lvl === 2 ? (
        <>
          {/* LOD2: tek blok + rampa (~50 üçgen) */}
          <Block pos={[0, PODIUM_H + h / 2, z]} size={[w, h, d]} mat={m.travertineLight} cast />
          <mesh geometry={BOX} material={m.travertine} position={[0, PODIUM_H / 2, stairZ]} scale={[STAIRS.width, 0.4, Math.hypot(STAIRS.steps * STAIRS.tread, PODIUM_H)]} rotation={[Math.atan2(PODIUM_H, STAIRS.steps * STAIRS.tread), 0, 0]} />
        </>
      ) : (
        <>
          <Block pos={[0, PODIUM_H + colH / 2, z]} size={[w - 10, colH, d - 10]} mat={m.travertineLight} cast />
          <Block pos={[0, top + (h - colH) / 2, z]} size={[w, h - colH, d]} mat={m.travertineLight} cast />
          <Instances mat={m.travertineLight} items={items.pillars} cast />
          <Instances mat={m.travertine} items={lvl === 0 ? items.steps : items.coarse} />
        </>
      )}

      {lvl === 0 && (
        <>
          {/* LOD0: sütun başlık ve kaideleri, kapı, yazıt panoları, hitabet kürsüsü, saçak */}
          <Instances mat={m.travertine} items={items.capitals} />
          <Instances mat={m.travertine} items={items.bases} />
          <Block pos={[0, top + (h - colH) + 0.25, z]} size={[w + 2, 0.5, d + 2]} mat={m.travertine} />
          <Block pos={[0, top - 0.6, z]} size={[w - 9.4, 1.2, d - 9.4]} mat={m.travertine} />
          <Block pos={[0, PODIUM_H + 4, MAUSOLEUM_FRONT_Z - 5 + 0.08]} size={[5, 8, 0.2]} mat={m.bronze} />
          <Block pos={[0, PODIUM_H + 8.4, MAUSOLEUM_FRONT_Z - 5 + 0.2]} size={[7, 0.8, 0.5]} mat={m.travertine} />
          {[-1, 1].map((s) => <Block key={s} pos={[s * 3.2, PODIUM_H + 4, MAUSOLEUM_FRONT_Z - 5 + 0.2]} size={[0.7, 8, 0.5]} mat={m.travertine} />)}
          {[-1, 1].map((s) => <Block key={'y' + s} pos={[s * 17, PODIUM_H + 6, MAUSOLEUM_FRONT_Z - 5 + 0.06]} size={[9, 7, 0.12]} mat={m.gold} />)}
          <Block pos={[0, PODIUM_H + 7, z - (d - 10) / 2 - 0.06]} size={[11, 10, 0.12]} mat={m.dark} />
          <Block pos={[0, PODIUM_H * 0.55 + 0.9, stairZ + 1]} size={[3.2, 1.8, 2]} mat={m.marble} />
          {[-1, 1].map((s) => <Block key={'r' + s} pos={[s * (STAIRS.width / 2 + 3), PODIUM_H * 0.5, -PLAZA.d / 2 + 0.07]} size={[5, PODIUM_H * 0.7, 0.14]} mat={m.travertineLight} />)}
        </>
      )}

      {/* meşaleler: gece modunda ışık saçar */}
      {[-1, 1].map((s) => (
        <group key={'t' + s} position={[s * (STAIRS.width / 2 + 3), PODIUM_H, -PLAZA.d / 2 - 2]}>
          <mesh geometry={CYL} material={m.bronze} position={[0, 1.1, 0]} scale={[0.5, 2.2, 0.5]} />
          <mesh geometry={CYL} material={m.bronze} position={[0, 2.4, 0]} scale={[1.1, 0.4, 1.1]} />
          {night && <mesh geometry={BLOB} material={m.flame} position={[0, 3.1, 0]} scale={[0.7, 1.1, 0.7]} />}
          {night && quality !== 'low' && <pointLight position={[0, 4, 0]} color="#ffa64a" intensity={900} distance={70} decay={2} />}
        </group>
      ))}
    </group>
  );
}

/* =========================================================
   MEYDAN, GALERİLER, KULELER, İNÖNÜ, BAYRAK
   ========================================================= */
function PlazaAndTowers({ m, quality }: { m: Materials; quality: Quality }) {
  const lvl = useLod([0, 0, 0], 300 * lodScale(quality), 600 * lodScale(quality), lodCap(quality));
  const p = useMemo(() => porticos(), []);
  const tw = useMemo(() => towers(), []);
  const items = useMemo(() => ({
    roofs: p.roofs.map((b) => ({ pos: b.pos, scale: b.size })),
    walls: p.roofs.map((b) => ({ pos: [b.pos[0], b.pos[1] / 2, b.pos[2]] as V3, scale: [b.size[0], b.pos[1], b.size[2]] as V3 })),
    pillars: p.pillars.map((q) => ({ pos: q, scale: [0.9, 6.4, 0.9] as V3 })),
    bodies: tw.map((t) => ({ pos: [t.pos[0], TOWER.h / 2, t.pos[2]] as V3, scale: [TOWER.w, TOWER.h, TOWER.d] as V3 })),
    tRoofs: tw.map((t) => ({ pos: [t.pos[0], TOWER.h + TOWER.roofH / 2, t.pos[2]] as V3, scale: [(TOWER.w / Math.SQRT2) * 1.12, TOWER.roofH, (TOWER.d / Math.SQRT2) * 1.12] as V3 })),
    spears: tw.map((t) => ({ pos: [t.pos[0], TOWER.h + TOWER.roofH + 0.9, t.pos[2]] as V3, scale: [0.18, 1.8, 0.18] as V3 })),
    cornices: tw.map((t) => ({ pos: [t.pos[0], TOWER.h - 0.2, t.pos[2]] as V3, scale: [TOWER.w + 0.8, 0.4, TOWER.d + 0.8] as V3 })),
  }), [p, tw]);
  const flag = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => { if (flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 0.9) * 0.18; });

  return (
    <group>
      <Block pos={[0, -0.16, -4]} size={[PLAZA.w + 34, 0.3, PLAZA.d + 46]} mat={m.travertine} />
      <mesh geometry={BOX} material={m.kilim} position={[0, -0.1, 0]} scale={[PLAZA.w, 0.3, PLAZA.d]} receiveShadow />
      {lvl === 2
        ? <Instances mat={m.travertine} items={items.walls} cast />
        : <><Instances mat={m.travertine} items={items.roofs} cast /><Instances mat={m.travertineLight} items={items.pillars} /></>}
      <Instances mat={m.travertine} items={items.bodies} cast />
      <Instances geo={PYRAMID} mat={m.roof} items={items.tRoofs} cast />
      {lvl === 0 && <><Instances geo={CONE} mat={m.bronze} items={items.spears} /><Instances mat={m.travertineLight} items={items.cornices} /></>}

      {/* İsmet İnönü'nün lahdi */}
      <Block pos={[INONU.pos[0], 0.3, INONU.pos[2]]} size={[5, 0.6, 3]} mat={m.travertineLight} />
      <Block pos={[INONU.pos[0], 1.25, INONU.pos[2]]} size={[3.2, 1.3, 1.5]} mat={m.redMarble} />

      {/* bayrak direği */}
      <group position={FLAGPOLE.pos}>
        <Block pos={[0, 0.9, 0]} size={[3.4, 1.8, 3.4]} mat={m.travertineLight} cast />
        <mesh geometry={CYL} material={m.steel} position={[0, FLAGPOLE.h / 2 + 1.8, 0]} scale={[0.28, FLAGPOLE.h, 0.28]} castShadow />
        <group position={[0, FLAGPOLE.h - 2, 0]}>
          <mesh ref={flag} position={[0, 0, 0]}>
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
const ROAD_MID: V3 = [LION_ROAD.startX - LION_ROAD.length / 2, 0, 0];
function LionRoad({ m, quality }: { m: Materials; quality: Quality }) {
  const lvl = useLod(ROAD_MID, 240 * lodScale(quality), 480 * lodScale(quality), lodCap(quality));
  const items = useMemo(() => {
    const L = lions();
    const part = (o: V3, s: V3) => L.map((l) => ({ pos: offset(l.pos, l.rotY, o), scale: s, rotY: l.rotY }));
    const hedges: Item[] = [];
    for (const s of [-1, 1]) hedges.push({ pos: [ROAD_MID[0], 0.6, s * (LION_ROAD.width / 2 + 6)], scale: [LION_ROAD.length, 1.2, 1.6] });
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
      <mesh geometry={BOX} material={m.paving} position={[ROAD_MID[0], -0.05, 0]} scale={[LION_ROAD.length + 24, 0.2, LION_ROAD.width]} receiveShadow />
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
   BARIŞ PARKI — instanced düşük poligonlu ağaçlar
   ========================================================= */
function PeacePark({ m, quality }: { m: Materials; quality: Quality }) {
  const count = quality === 'high' ? 760 : quality === 'medium' ? 340 : 150;
  const items = useMemo(() => {
    const R = seeded(1953), pines: Item[] = [], leafy: Item[] = [], trunks: Item[] = [];
    let guard = 0;
    while (pines.length + leafy.length < count && guard++ < count * 30) {
      const a = R() * Math.PI * 2, r = 70 + Math.sqrt(R()) * 560, x = -90 + Math.cos(a) * r, z = -30 + Math.sin(a) * r;
      if (!isClear(x, z)) continue;
      const h = 7 + R() * 7;
      if (R() > 0.42) pines.push({ pos: [x, 1.6 + h / 2, z], scale: [h * 0.26, h, h * 0.26], rotY: R() * 6 });
      else leafy.push({ pos: [x, 2 + h * 0.36, z], scale: [h * 0.42, h * 0.4, h * 0.42], rotY: R() * 6 });
      trunks.push({ pos: [x, 1.2, z], scale: [0.28, 2.4, 0.28] });
    }
    // Aslanlı Yol boyunca düzenli ağaç sıraları
    for (let x = LION_ROAD.startX - 8; x > LION_ROAD.startX - LION_ROAD.length; x -= 11) for (const s of [-1, 1]) {
      pines.push({ pos: [x, 6.6, s * (LION_ROAD.width / 2 + 11)], scale: [2, 10, 2] }); trunks.push({ pos: [x, 1, s * (LION_ROAD.width / 2 + 11)], scale: [0.3, 2, 0.3] });
    }
    return { pines, leafy, trunks };
  }, [count]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-90, -0.32, -30]} material={m.grass} receiveShadow>
        <circleGeometry args={[900, 48]} />
      </mesh>
      <Instances geo={CONE} mat={m.treeDark} items={items.pines} receive={false} />
      <Instances geo={BLOB} mat={m.treeLight} items={items.leafy} receive={false} />
      {quality === 'high' && <Instances geo={CYL} mat={m.trunk} items={items.trunks} receive={false} />}
    </group>
  );
}

/* =========================================================
   IŞIK, ATMOSFER, PARTİKÜLLER
   ========================================================= */
const TIMES: Record<TimeOfDay, { sun: V3; sunColor: string; sunI: number; sky: string; ground: string; hemiI: number; bg: string; fog: number }> = {
  sabah: { sun: [-0.85, 0.34, 0.5], sunColor: '#ffd3a1', sunI: 2.0, sky: '#cfe0f5', ground: '#8a7a5a', hemiI: 0.6, bg: '#d6e3ef', fog: 0.0019 },
  ogle: { sun: [-0.35, 1, 0.5], sunColor: '#fff3df', sunI: 2.7, sky: '#dcebfa', ground: '#9c8a66', hemiI: 0.75, bg: '#a9cdea', fog: 0.0013 },
  aksam: { sun: [0.9, 0.26, 0.42], sunColor: '#ff9d5c', sunI: 2.1, sky: '#f0c5a0', ground: '#6a5a48', hemiI: 0.5, bg: '#eab38d', fog: 0.002 },
  gece: { sun: [0.35, 0.8, -0.4], sunColor: '#8fa6d8', sunI: 0.32, sky: '#2a3757', ground: '#0d0e14', hemiI: 0.5, bg: '#0b1020', fog: 0.0022 },
};
function Atmosphere({ time, effects, shadows }: { time: TimeOfDay; effects: boolean; shadows: boolean }) {
  const t = TIMES[time], { scene } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null!);
  useEffect(() => {
    scene.background = new THREE.Color(t.bg);
    // Üstel sis: uzaktaki ağaçları ve park sınırını yumuşatır, düşük poligonlu arka planı gizler
    scene.fog = effects ? new THREE.FogExp2(t.bg, t.fog) : null;
  }, [scene, t, effects]);
  useEffect(() => {
    const l = sun.current; l.target.position.set(0, 0, -45); l.target.updateMatrixWorld();
    const c = l.shadow.camera; c.left = -150; c.right = 150; c.top = 150; c.bottom = -150; c.near = 10; c.far = 700; c.updateProjectionMatrix();
  }, []);
  return (
    <>
      <hemisphereLight args={[t.sky, t.ground, t.hemiI]} />
      <directionalLight
        ref={sun} position={[t.sun[0] * 300, t.sun[1] * 300, t.sun[2] * 300 - 45]} color={t.sunColor} intensity={t.sunI}
        castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.6}
      />
    </>
  );
}
function Motes({ night }: { night: boolean }) {
  const ref = useRef<THREE.Points>(null!);
  const geo = useMemo(() => {
    const R = seeded(7), n = 140, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = (R() - 0.5) * 220; a[i * 3 + 1] = 2 + R() * 28; a[i * 3 + 2] = -40 + (R() - 0.5) * 200; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g;
  }, []);
  useFrame(({ clock }) => { ref.current.rotation.y = clock.elapsedTime * 0.01; ref.current.position.y = Math.sin(clock.elapsedTime * 0.3) * 1.5; });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color={night ? '#ffd98a' : '#fff6dc'} size={night ? 1.1 : 0.7} sizeAttenuation transparent opacity={night ? 0.85 : 0.5} depthWrite={false} />
    </points>
  );
}

/* =========================================================
   KAMERA: orbit / pinch-zoom / sinematik geçişler
   ========================================================= */
const ACTION = CameraControlsImpl.ACTION;
function CameraRig({ target }: { target: string }) {
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
    c.setBoundary(new THREE.Box3(new THREE.Vector3(-380, 0, -170), new THREE.Vector3(140, 40, 110)));
    c.colliderMeshes = [collider.current];          // kamera mozole bloğunun içinden geçemez
  }, []);

  useEffect(() => {
    const c = ref.current, p = POSES[target] ?? POSES.overview;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dist = p.distance * (portrait ? 1.55 : 1);
    const sp = Math.sin(p.polar), pos: V3 = [p.target[0] + dist * sp * Math.sin(p.azimuth), p.target[1] + dist * Math.cos(p.polar), p.target[2] + dist * sp * Math.cos(p.azimuth)];
    c.smoothTime = target === 'entrance' ? 1.1 : 0.8;                         // sinematik: daha uzun sönüm
    c.setLookAt(pos[0], pos[1], pos[2], p.target[0], p.target[1], p.target[2], !reduce).then(() => { c.smoothTime = 0.35; });
  }, [target, portrait]);

  return (
    <>
      <CameraControls ref={ref} makeDefault />
      <mesh ref={collider} position={[0, (PODIUM_H + MAUSOLEUM.h) / 2, MAUSOLEUM.z]} scale={[MAUSOLEUM.w + 10, PODIUM_H + MAUSOLEUM.h + 4, MAUSOLEUM.d + 10]} geometry={BOX}>
        <meshBasicMaterial visible={false} />
      </mesh>
    </>
  );
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
  const q: Quality = saver ? 'low' : quality;
  const night = time === 'gece';
  const m = useMemo(() => createMaterials(), []);
  useEffect(() => applyNight(m, night), [m, night]);
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m]);
  return (
    <>
      <Atmosphere time={time} effects={q !== 'low'} shadows={q !== 'low' && !night} />
      <Mausoleum m={m} quality={q} night={night} />
      <PlazaAndTowers m={m} quality={q} />
      <LionRoad m={m} quality={q} />
      <PeacePark m={m} quality={q} />
      {q !== 'low' && <Motes night={night} />}
      <Hotspots onPointClick={onPointClick} />
    </>
  );
}

/**
 * <AnitkabirScene /> — harita sisteminden bağımsız çalışır.
 * isActive=false iken kare döngüsü durur (GPU ve pil harcanmaz).
 */
export default function AnitkabirScene({ isActive, cameraTarget = 'overview', onPointClick }: MonumentSceneProps) {
  const quality = useMonumentStore((s) => s.quality);
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const toEntrance = () => { useMonumentStore.getState().selectPoint(null); useMonumentStore.getState().setCameraTarget('entrance'); };
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
        <CameraRig target={cameraTarget} />
      </Canvas>
    </div>
  );
}
