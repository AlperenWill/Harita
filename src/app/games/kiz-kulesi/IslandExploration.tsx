/**
 * Bölüm 2 — Ada ve kule (varış), teras ve dönüş.
 *   yanasma: vapur iskelede, iskele tahtası iner; Can önden yürür (lead), oyuncu geride kalırsa bekler; kapıya varınca kule içi.
 *   kule   : dar merdiven. Oyuncu önden çıkar, Can arkadan gelir (behind) ve duvardaki taşlarda durdurup işaret ederek anlatır.
 *   teras  : çatı terası; Can manzarayı gösterir (iki yaka). Etkileşim düğmesi ek bilgi açar.
 *   donus  : iskelede veda; oyuncu vapura binince oyun biter.
 * Kamera her yerde otomatik takip eder; yön bölüme göre sabittir, oyuncu yalnızca yakınlaştırır.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Character, CAN, PLAYER, newRig, type RigState } from './NPCController';
import { followTarget, stepToward } from './npc';
import { DOOR, LEAD_ROUTE, PLAYER_START, ROOF_Y, SHAFT_HALF, STAIR_LEN, STONES, TERRACE_START, ISLAND, areaAt, heightAt, slide, stairAt, terraceOk, FERRY_YAW } from './island';
import { DOCK, bob } from './ferry';
import { FerryModel } from './FerryScene';
import { Gangboard, KizKulesi, LANDMARKS, Shores } from './TowerModel';
import { Water, type FoamRefs } from './Water';
import { mouthOpen } from './dialogue';
import { now, useKiz, type Phase } from './store';
import { walk } from './input';

type Dev = { shadows: boolean; water: number; blocks: number };
const SPEED = 2.4;
const wrap = (a: number) => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
const turn = (r: RigState, want: number, dt: number, k = 6) => { r.yaw += wrap(want - r.yaw) * (1 - Math.exp(-dt * k)); };
const faceTo = (r: RigState, x: number, z: number) => Math.atan2(-(x - r.x), -(z - r.z));

/** NPC'nin konuşma durumunu diyalogdan doldur; işaret hedefini dünyadan seç */
function applyDialogue(c: RigState, pl: RigState, targets: Partial<Record<string, THREE.Vector3>>, dt: number) {
  const pb = useKiz.getState().playback, line = pb ? pb.dialogue.lines[pb.line] : null;
  c.talking = !!line; c.mouth = mouthOpen(pb, now());
  c.point = line?.anim === 'point' ? targets[line.lookAt] ?? null : null;
  c.look = line ? new THREE.Vector3(pl.x, pl.y + 1.6, pl.z) : null;
  if (line && c.speed < 0.2) turn(c, c.point ? faceTo(c, c.point.x, c.point.z) : faceTo(c, pl.x, pl.z), dt, 4);
}

/** Sabit yönlü takip kamerası; hareket girdisini kameranın yönüne göre dünyaya çevirir */
function useFollowCamera(target: React.MutableRefObject<RigState>, offset: THREE.Vector3, lookUp = 1.2) {
  const { camera } = useThree();
  const pos = useRef<THREE.Vector3 | null>(null), want = useMemo(() => new THREE.Vector3(), []), look = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), r = target.current, z = useKiz.getState().zoom;
    want.set(r.x + offset.x * z, r.y + offset.y * z, r.z + offset.z * z);
    if (!pos.current) pos.current = want.clone();
    pos.current.lerp(want, 1 - Math.exp(-dt * 4));
    camera.position.copy(pos.current); look.set(r.x, r.y + lookUp, r.z); camera.lookAt(look);
  });
  return () => { const f = new THREE.Vector2(-offset.x, -offset.z).normalize(); return { fx: f.x, fz: f.y, rx: -f.y, rz: f.x }; };
}
function moveFromInput(axes: { fx: number; fz: number; rx: number; rz: number }) {
  const len = Math.hypot(walk.x, walk.y); if (len < 0.08) return null;
  const k = Math.min(1, len) / len;
  return { x: (axes.rx * walk.x - axes.fx * walk.y) * k, z: (axes.rz * walk.x - axes.fz * walk.y) * k };
}

/* ================= Dış dünya: iskele, ada, teras ================= */
function World({ dev, gangDown }: { dev: Dev; gangDown: React.MutableRefObject<number> }) {
  const ferry = useRef<THREE.Group>(null!);
  // iskelede vapurun burnu köpürmez; köpük yalnızca ada kıyısında (kule dibi)
  const foam: FoamRefs = { bow: useRef(new THREE.Vector3(9999, 0, 9999)), bowDir: useRef(new THREE.Vector2(0, 1)), bowAmount: useRef(0) };
  useFrame(({ clock }) => {
    const b = bob(clock.elapsedTime, 0.2);   // bağlıyken çok hafif sallanır
    ferry.current.position.set(DOCK.x, b.heave, DOCK.z); ferry.current.rotation.set(b.pitch, FERRY_YAW, b.roll, 'YXZ');
  });
  return (
    <group>
      <hemisphereLight args={['#eaf3fb', '#5b6e7a', 1]} />
      <directionalLight position={[120, 160, -80]} intensity={2.2} color="#fff6e6" castShadow={dev.shadows} shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} />
      <Water foam={foam} segments={dev.water} />
      <group ref={ferry}><FerryModel /></group>
      <Gangboard down={gangDown} />
      <KizKulesi shadows={dev.shadows} />
      <Shores blocks={dev.blocks} />
    </group>
  );
}

const TARGETS = {
  tower: new THREE.Vector3(0, 16, -1), ferry: new THREE.Vector3(DOCK.x, 3, DOCK.z),
  view: new THREE.Vector3(LANDMARKS.topkapi[0], 40, LANDMARKS.topkapi[1]),
};

export function DockScene({ phase, dev, onDoor, onBoard }: { phase: Extract<Phase, 'yanasma' | 'donus'>; dev: Dev; onDoor: () => void; onBoard: () => void }) {
  const { scene } = useThree();
  const start = phase === 'yanasma' ? PLAYER_START : { x: -14.6, z: 12.3 };
  const player = useRef<RigState>(newRig(start.x, start.z, phase === 'yanasma' ? -Math.PI / 2 : Math.PI / 2));
  const can = useRef<RigState>(phase === 'yanasma' ? newRig(LEAD_ROUTE[0].x, LEAD_ROUTE[0].z, -Math.PI / 2) : newRig(-13.6, 11.2, Math.PI / 2));
  const wp = useRef(1), gangDown = useRef(phase === 'yanasma' ? 0 : 1), done = useRef(false), t0 = useRef<number | null>(null);
  const axes = useFollowCamera(player, phase === 'yanasma' ? new THREE.Vector3(-6.5, 4.6, 4) : new THREE.Vector3(6.5, 4.6, 3.5));
  useEffect(() => { scene.background = new THREE.Color('#bcd6e6'); scene.fog = new THREE.Fog('#cfe0ea', 300, 2600); return () => { scene.fog = null; }; }, [scene]);

  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05), pl = player.current, c = can.current;
    if (t0.current === null) t0.current = clock.elapsedTime;
    const el = clock.elapsedTime - t0.current;
    if (phase === 'yanasma') gangDown.current = Math.min(1, Math.max(0, (el - 0.5) / 2.5));
    const open = gangDown.current >= 1;
    const m = moveFromInput(axes());
    if (m) {
      const n = slide(pl, m.x * SPEED * dt, m.z * SPEED * dt, open);
      pl.speed = Math.hypot(n.x - pl.x, n.z - pl.z) / dt; if (pl.speed > 0.05) pl.yaw = Math.atan2(-(n.x - pl.x), -(n.z - pl.z)); pl.x = n.x; pl.z = n.z;
    } else pl.speed = 0;
    pl.y = heightAt(pl.x, pl.z); pl.wind = 0.6;

    if (phase === 'yanasma') {
      // Can önden: sıradaki rota noktasına git; oyuncu 6 m'den uzaksa bekle
      const goal = LEAD_ROUTE[Math.min(wp.current, LEAD_ROUTE.length - 1)];
      const tg = open ? followTarget('lead', c, pl, 0, goal) : c;
      const s = stepToward(c, tg, dt);
      c.x = s.pos.x; c.z = s.pos.z; c.speed = s.speed; if (s.yaw !== null) c.yaw = s.yaw; else turn(c, faceTo(c, pl.x, pl.z), dt, 2);
      if (Math.hypot(c.x - goal.x, c.z - goal.z) < 0.5 && wp.current < LEAD_ROUTE.length - 1) wp.current++;
      if (!done.current && Math.hypot(pl.x - DOOR.x, pl.z - DOOR.z) < 1.7) { done.current = true; onDoor(); }
    } else {
      c.speed = 0; if (!useKiz.getState().playback) turn(c, faceTo(c, pl.x, pl.z), dt, 3);
      if (!done.current && areaAt(pl.x, pl.z) === 'deck' && !useKiz.getState().playback) { done.current = true; onBoard(); }
    }
    c.y = heightAt(c.x, c.z); c.wind = 0.6;
    applyDialogue(c, pl, TARGETS, dt);
  });

  return (
    <group>
      <World dev={dev} gangDown={gangDown} />
      <Character rig={player} palette={PLAYER} castShadow={dev.shadows} />
      <Character rig={can} palette={CAN} castShadow={dev.shadows} />
    </group>
  );
}

/* ================= Teras ================= */
export function TerraceScene({ dev }: { dev: Dev }) {
  const { scene } = useThree();
  const player = useRef<RigState>(newRig(TERRACE_START.x, TERRACE_START.z, -Math.PI / 2));
  const can = useRef<RigState>(newRig(TERRACE_START.x - 1.4, TERRACE_START.z + 0.6, -Math.PI / 2));
  player.current.y = can.current.y = ROOF_Y;
  const gangDown = useRef(1);
  // kamera doğudan, yüksekten batıya bakar: kulenin güneyinden geçen bakış Galata (KB) ile Sarayburnu'nu (BGB) aynı kadrajda tutar
  const axes = useFollowCamera(player, new THREE.Vector3(14, 8, 0.5), 1.4);
  useEffect(() => { scene.background = new THREE.Color('#bcd6e6'); scene.fog = new THREE.Fog('#cfe0ea', 400, 3200); return () => { scene.fog = null; }; }, [scene]);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), pl = player.current, c = can.current;
    const m = moveFromInput(axes());
    if (m) {
      const nx = pl.x + m.x * SPEED * dt, nz = pl.z + m.z * SPEED * dt;
      const ox = pl.x, oz = pl.z;
      if (terraceOk(nx, pl.z)) pl.x = nx; if (terraceOk(pl.x, nz)) pl.z = nz;
      pl.speed = Math.hypot(pl.x - ox, pl.z - oz) / dt; if (pl.speed > 0.05) pl.yaw = Math.atan2(-(pl.x - ox), -(pl.z - oz));
    } else pl.speed = 0;
    pl.wind = 0.9;
    const tg = followTarget('beside', c, pl, Math.atan2(-axes().fx, -axes().fz));
    const goal = terraceOk(tg.x, tg.z) ? tg : c;
    const s = stepToward(c, goal, dt); c.x = s.pos.x; c.z = s.pos.z; c.speed = s.speed; if (s.yaw !== null) c.yaw = s.yaw;
    c.wind = 0.9;
    applyDialogue(c, pl, TARGETS, dt);
  });
  return (
    <group>
      <World dev={dev} gangDown={gangDown} />
      <Character rig={player} palette={PLAYER} castShadow={dev.shadows} />
      <Character rig={can} palette={CAN} castShadow={dev.shadows} />
    </group>
  );
}

/* ================= Kule içi: dar merdiven ================= */
function shaftTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!;
  g.fillStyle = '#8f8270'; g.fillRect(0, 0, 256, 256);
  let s = 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < 8; y++) { let x = -r() * 40; while (x < 256) { const w = 36 + r() * 50, t = 150 + r() * 50; g.fillStyle = `rgb(${t + 10},${t},${t - 18})`; g.fillRect(x + 2, y * 32 + 2, w - 4, 28); x += w; } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 4); return t;
}
export function TowerInterior({ onTop }: { onTop: () => void }) {
  const { camera, scene } = useThree();
  const s = useRef(0.3), cs = useRef(0), done = useRef(false), heardSpots = useRef(new Set<string>());
  const player = useRef<RigState>(newRig()), can = useRef<RigState>(newRig());
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ map: shaftTexture(), roughness: 0.95, side: THREE.BackSide }), []);
  const stepM = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cbbda5', roughness: 0.9 }), []);
  const H = ROOF_Y - ISLAND.top + 3;
  const steps = useMemo(() => {
    const out: { p: THREE.Vector3; yaw: number }[] = [];
    for (let d = 0.15; d < STAIR_LEN; d += 0.3) { const a = stairAt(d); out.push({ p: new THREE.Vector3(a.x, a.y - 0.1, a.z), yaw: a.heading }); }
    return out;
  }, []);
  const stepMesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.2, 0.32), stepM, steps.length);
    steps.forEach((st, i) => m.setMatrixAt(i, new THREE.Matrix4().compose(st.p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, st.yaw, 0)), new THREE.Vector3(1, 1, 1))));
    return m;
  }, [steps, stepM]);
  const stones = useMemo(() => STONES.map((st) => {
    const a = stairAt(st.s), off = SHAFT_HALF - 0.04;
    const pos = st.wall === 'west' ? new THREE.Vector3(-off, a.y + 1.4, a.z) : st.wall === 'north' ? new THREE.Vector3(a.x, a.y + 1.4, -off) : new THREE.Vector3(off, a.y + 1.4, a.z);
    const rot = st.wall === 'west' ? Math.PI / 2 : st.wall === 'north' ? 0 : -Math.PI / 2;
    return { ...st, pos, rot };
  }), []);
  const glow = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    scene.background = new THREE.Color('#1c1712'); scene.fog = new THREE.Fog('#2a2119', 4, 14);
    (camera as THREE.PerspectiveCamera).fov = 62; (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    return () => { scene.fog = null; };
  }, [camera, scene]);

  const cam = useMemo(() => new THREE.Vector3(), []), look = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05), pl = player.current, c = can.current;
    // yalnızca yol boyunca ileri/geri (joystick yukarı = yukarı çık)
    const v = -walk.y; const ds = Math.abs(v) > 0.1 ? v * 1.6 * dt : 0;
    s.current = Math.max(0.3, Math.min(STAIR_LEN, s.current + ds));
    const a = stairAt(s.current);
    pl.x = a.x; pl.y = a.y; pl.z = a.z; pl.speed = Math.abs(ds) / dt; if (ds) pl.yaw = ds > 0 ? a.heading : a.heading + Math.PI; pl.wind = 0;
    // Can 1,8 m arkadan
    const goal = Math.max(0, s.current - 1.8); const before = cs.current;
    cs.current += Math.sign(goal - cs.current) * Math.min(Math.abs(goal - cs.current), 2.2 * dt);
    const b = stairAt(cs.current); c.x = b.x; c.y = b.y; c.z = b.z; c.speed = Math.abs(cs.current - before) / dt; if (c.speed > 0.1) c.yaw = b.heading;
    // taşlar: yanından geçerken Can durdurur ve anlatır
    for (const st of stones) if (!heardSpots.current.has(st.spot) && Math.abs(s.current - st.s) < 0.6) { heardSpots.current.add(st.spot); useKiz.getState().play(stoneDialogue(st.spot)); }
    const pb = useKiz.getState().playback, line = pb?.dialogue.lines[pb.line];
    const spot = stones.find((x) => pb?.dialogue.trigger.type === 'reach' && 'spot' in pb.dialogue.trigger && pb.dialogue.trigger.spot === x.spot);
    applyDialogue(c, pl, { stone: spot?.pos }, dt);
    if (line?.anim === 'point' && spot) c.point = spot.pos;
    glow.current.forEach((g, i) => { if (g) (g.material as THREE.MeshBasicMaterial).opacity = heardSpots.current.has(stones[i].spot) ? 0.15 : 0.35 + Math.sin(clock.elapsedTime * 3) * 0.2; });
    if (!done.current && s.current >= STAIR_LEN - 0.05 && !pb) { done.current = true; onTop(); }

    // kamera: oyuncunun arkasında, kuyunun içinde kalır
    const z = useKiz.getState().zoom, fx = -Math.sin(a.heading), fz = -Math.cos(a.heading);
    cam.set(a.x - fx * 2.2 * z - a.x * 0.25, a.y + 1.5 + 0.4 * z, a.z - fz * 2.2 * z - a.z * 0.25);
    const lim = SHAFT_HALF - 0.25; cam.x = THREE.MathUtils.clamp(cam.x, -lim, lim); cam.z = THREE.MathUtils.clamp(cam.z, -lim, lim);
    camera.position.lerp(cam, 1 - Math.exp(-dt * 5));
    look.set(a.x + fx * 1.2, a.y + 1.2, a.z + fz * 1.2); camera.lookAt(look);
  });

  return (
    <group>
      <ambientLight intensity={0.35} color="#f2dcc0" />
      <mesh material={wall} position={[0, ISLAND.top + H / 2 - 0.5, 0]}><boxGeometry args={[SHAFT_HALF * 2, H, SHAFT_HALF * 2]} /></mesh>
      <mesh position={[0, ISLAND.top - 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[SHAFT_HALF * 2, SHAFT_HALF * 2]} /><meshStandardMaterial color="#5f554a" /></mesh>
      <primitive object={stepMesh} />
      {/* merkez kuyu (merdiven ortası) */}
      <mesh position={[0, ISLAND.top + H / 2 - 0.5, 0]}><boxGeometry args={[1.6, H, 1.6]} /><meshStandardMaterial color="#a89a85" roughness={0.95} /></mesh>
      {stones.map((st, i) => (
        <group key={st.spot} position={st.pos} rotation={[0, st.rot, 0]}>
          <mesh position={[0, 0, 0.03]}><planeGeometry args={[0.9, 0.55]} /><meshStandardMaterial color="#d8c7a6" roughness={0.7} /></mesh>
          <mesh ref={(m) => { if (m) glow.current[i] = m; }} position={[0, 0, 0.05]}><planeGeometry args={[1.05, 0.7]} /><meshBasicMaterial color="#ffd27a" transparent opacity={0.3} depthWrite={false} /></mesh>
        </group>
      ))}
      {[0.25, 0.5, 0.75, 0.95].map((u) => { const a = stairAt(u * STAIR_LEN); return <pointLight key={u} position={[a.x * 0.4, a.y + 2.2, a.z * 0.4]} intensity={5} distance={6} color="#ffd9a8" />; })}
      <Character rig={player} palette={PLAYER} />
      <Character rig={can} palette={CAN} />
    </group>
  );
}
const stoneDialogue = (spot: string) => ({ 'tas-1': 'tas-bizans', 'tas-2': 'tas-fener', 'tas-3': 'tas-restorasyon' } as Record<string, string>)[spot];
