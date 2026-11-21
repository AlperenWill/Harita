/**
 * Galata Kulesi — birinci şahıs oyuncu: bütün bölümlerde kamera, yürüme ve bölüm kuralları.
 *
 * Bakış serbest (yaw sınırsız, pitch yalnızca boyun sınırı). Masaüstü: WASD/oklar yürür, tıkla → imleç kilidi,
 * fareyle bak (GalataTowerGame). Dokunmatik: sol joystick yürür, ekranın geri kalanında sürükleme bakar.
 * Bölüm kuralları:
 *   zindan   — dikdörtgen oda; fener bakışı izler (DungeonScene); armalar bulununca kapıya yürü
 *   merdiven — sarmal: konum açısından basamak yüksekliği; çıkmak nefes harcar; pencereye bakınca "Pencereden bak (E)"
 *   sergi    — yuvarlak oda; vitrinlerin çevresinden dolan; yakındaki vitrine bakınca "İncele"
 *   teras    — balkon halkası; uzak tarihi noktaya bakınca (dürbünle daha kolay) "Tanı (E)" çıkar
 * Hiçbir kart kendiliğinden açılmaz: Player yalnızca bakılan hedefi 'near' olayıyla bildirir, kartı oyuncu E ile açar.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { Chapter } from './store';
import { DOOR, DOOR_REACH, DUNGEON, DUNGEON_AREA, TOWER } from './dungeon';
import { EXHIBITS, EXHIBIT_AREA, EXIT, EXIT_REACH, INSPECT_REACH, VITRINE_CIRCLES, vitrinePos } from './exhibits';
import { VIEWPOINTS, toLocal } from './panorama';
import * as St from './StaircaseMechanic';
import { WALK_SPEED, clampTo, lookError, pushOut, walk, yawError, type Area } from './firstPerson';
import { BALCONY_R } from './TowerExterior';
import { galataAudio } from './AudioManager';

export const EYE = 1.62;
export const TERRACE_AREA: Area = { kind: 'ring', rMin: TOWER.outerR - 0.5 + 0.4, rMax: BALCONY_R - 0.45 };
const TERRACE_EYE = TOWER.terraceY + 1.65;
/** Oyuncunun anlık durumu (React durumu değildir) */
export const fp = { x: 0, y: EYE, z: 0, yaw: 0, pitch: 0, theta: 0, breath: 1, bob: 0, zoom: false, frozen: false };
/** Girdi: -1..1 (ileri, sağa) */
export const move = { fwd: 0, strafe: 0 };

export type PlayerEvent =
  | { type: 'dungeon-door' } | { type: 'stairs-top' } | { type: 'window'; id: string } | { type: 'exhibit-exit' }
  | { type: 'near'; id: string | null } | { type: 'viewpoint'; index: number } | { type: 'hold'; progress: number } | { type: 'breath'; value: number };

/** Bölüm başlangıç konumu */
export function spawn(c: Chapter) {
  Object.assign(fp, { pitch: 0, bob: 0, zoom: false, breath: 1 });
  if (c === 'zindan') Object.assign(fp, { x: 0.6, z: DUNGEON.len / 2 - 1.4, yaw: 0 });
  if (c === 'merdiven') { const r = (St.WALK_MIN + St.WALK_MAX) / 2, th = 0.25; Object.assign(fp, { theta: th, x: Math.cos(th) * r, z: Math.sin(th) * r, yaw: Math.PI - th }); }
  if (c === 'sergi') Object.assign(fp, { x: 0, z: 0.6, yaw: Math.PI });
  if (c === 'teras' || c === 'son') { const r = (TERRACE_AREA as { rMin: number; rMax: number }).rMin + 0.5; Object.assign(fp, { x: 0, z: r, yaw: Math.PI }); }
}
const BASE_FOV: Record<Chapter, number> = { giris: 45, zindan: 64, merdiven: 72, sergi: 68, teras: 64, son: 64 };

export function Player({ chapter, done, onEvent }: { chapter: Chapter; done: { crests: boolean; windows: string[]; exhibits: string[]; viewed: string[]; open: boolean }; onEvent: (e: PlayerEvent) => void }) {
  const { camera } = useThree();
  const st = useRef({ step: 0, dwell: {} as Record<string, number>, near: null as string | null, sent: new Set<string>(), breathT: 0, lastBreath: 1, holdSent: 0 });
  const d = useRef(done); d.current = done;
  const ev = useRef(onEvent); ev.current = onEvent;
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  useEffect(() => { spawn(chapter); st.current = { step: 0, dwell: {}, near: null, sent: new Set(), breathT: 0, lastBreath: 1, holdSent: 0 }; }, [chapter]);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = st.current, D = d.current;
    if (chapter === 'giris') return;
    const moving = !fp.frozen && Math.hypot(move.fwd, move.strafe) > 0.05;
    const speed = WALK_SPEED * (chapter === 'merdiven' ? St.speedFactor(fp.breath) : 1) * (fp.zoom ? 0.4 : 1);
    let [x, z] = moving ? walk([fp.x, fp.z], fp.yaw, move.fwd, move.strafe, speed, dt) : [fp.x, fp.z];
    let y = EYE;
    const prevY = fp.y;

    if (chapter === 'zindan') {
      [x, z] = clampTo(DUNGEON_AREA, [x, z]); y = DUNGEON.eye;
      if (D.open && Math.hypot(x - DOOR[0], z - DOOR[1]) < DOOR_REACH && !S.sent.has('door')) { S.sent.add('door'); ev.current({ type: 'dungeon-door' }); }
    }
    if (chapter === 'merdiven') {
      [x, z] = clampTo({ kind: 'ring', rMin: St.WALK_MIN, rMax: St.WALK_MAX }, [x, z]);
      const th = St.clampTheta(St.unwrap(fp.theta, x, z));
      if (th !== St.unwrap(fp.theta, x, z)) { const r = Math.hypot(x, z); x = Math.cos(th) * r; z = Math.sin(th) * r; }   // alt ve üst uçta dur
      fp.theta = th; y = St.floorAt(th) + EYE;
      const atWin = St.WINDOWS.some((w) => St.atWindow(th, w));
      fp.breath = St.breathStep(fp.breath, y - prevY, moving, atWin, dt);
      if (Math.abs(fp.breath - S.lastBreath) > 0.02) { S.lastBreath = fp.breath; ev.current({ type: 'breath', value: fp.breath }); }
      S.breathT -= dt; if (fp.breath < 0.3 && moving && S.breathT <= 0) { galataAudio.breath(1.4); S.breathT = 2.6; }
      let nw: string | null = null;
      for (const w of St.WINDOWS) {
        if (D.windows.includes(w.id) || !St.atWindow(th, w)) continue;
        const wp: [number, number, number] = [Math.cos(w.theta) * St.WALL_R, St.windowY(w), Math.sin(w.theta) * St.WALL_R];
        if (lookError([x, y, z], fp.yaw, fp.pitch, wp) < 0.55) nw = w.id;
      }
      if (nw !== S.near) { S.near = nw; ev.current({ type: 'near', id: nw }); }
      if (th >= St.TOP_THETA && !S.sent.has('top')) { S.sent.add('top'); ev.current({ type: 'stairs-top' }); }
    }
    if (chapter === 'sergi') {
      [x, z] = pushOut(clampTo(EXHIBIT_AREA, [x, z]), VITRINE_CIRCLES); [x, z] = clampTo(EXHIBIT_AREA, [x, z]);
      let near: string | null = null, best = Infinity;
      for (const e of EXHIBITS) {
        const [vx, vz] = vitrinePos(e), dist = Math.hypot(vx - x, vz - z);
        if (dist < INSPECT_REACH && lookError([x, y, z], fp.yaw, fp.pitch, [vx, 1.2, vz]) < 0.7 && dist < best) { best = dist; near = e.id; }
      }
      if (near !== S.near) { S.near = near; ev.current({ type: 'near', id: near }); }
      if (D.open && Math.hypot(x - EXIT[0], z - EXIT[1]) < EXIT_REACH && !S.sent.has('exit')) { S.sent.add('exit'); ev.current({ type: 'exhibit-exit' }); }
    }
    if (chapter === 'teras' || chapter === 'son') {
      [x, z] = clampTo(TERRACE_AREA, [x, z]); y = TERRACE_EYE;
      if (chapter === 'teras') {
        let nv: string | null = null;
        for (const v of VIEWPOINTS) { if (D.viewed.includes(v.id)) continue;
          if (yawError([x, z], fp.yaw, toLocal(v.coord)) < (fp.zoom ? 0.09 : 0.06) && fp.pitch > -0.45 && fp.pitch < 0.35) nv = v.id; }
        if (nv !== S.near) { S.near = nv; ev.current({ type: 'near', id: nv }); }
      }
    }

    // adım sesi ve baş sallanması
    const stepLen = Math.hypot(x - fp.x, z - fp.z);
    S.step += stepLen; fp.bob += stepLen * 3.1;
    if (S.step > 0.72) { S.step = 0; galataAudio.footstep(chapter === 'merdiven'); }
    fp.x = x; fp.z = z; fp.y = y;

    const sway = moving ? Math.sin(fp.bob) * 0.035 : 0, heavy = chapter === 'merdiven' ? (1 - fp.breath) * 0.02 * Math.sin(performance.now() / 260) : 0;
    camera.position.set(x, y + sway + heavy, z);
    euler.current.set(fp.pitch, fp.yaw, 0); camera.quaternion.setFromEuler(euler.current);
    const pc = camera as THREE.PerspectiveCamera, want = fp.zoom ? 18 : BASE_FOV[chapter];
    if (Math.abs(pc.fov - want) > 0.05) { pc.fov += (want - pc.fov) * (1 - Math.exp(-dt * 6)); pc.updateProjectionMatrix(); }
  });
  return null;
}
