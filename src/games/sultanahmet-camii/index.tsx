/**
 * Sultanahmet Camii — "Işık Takibi" (bağımsız oyun modülü; GameLauncher tarafından dinamik import edilir).
 * Döngü: güneş ilerler → zeminde bir ışık havuzu oluşur ve kayar → oyuncu havuzun içinde kalır → desen açılır.
 * Girdi: dokunmatikte joystick ya da zemine dokunarak hedef seçme; masaüstünde WASD/ok tuşları ya da tıklama.
 * Kamera oyuncuya verilmez (camera.ts).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { GameCanvas } from '../core/GameCanvas';
import { sound } from '../core/audio';
import { walkInput } from '../core/walkInput';
import type { DeviceProfile } from '../core/device';
import type { GameProps } from '../core/types';
import { useLightTrackingCamera } from './camera';
import { STAGES, Steering, createGame, step, targetPool, type GameEvent, type GameState } from './mechanics';
import { insideHall, type MotifId } from './layout';
import { Avatar, Exterior, FloorPicker, Interior, LightShafts, Surroundings, useMats } from './scene';
import { Hud, RevealCard, WinScreen, type HudState } from './ui';

const KEYS: Record<string, [number, number]> = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };

export default function SultanahmetGame({ device, onComplete, onFind, onExit }: GameProps) {
  const [round, setRound] = useState(0);
  const [muted, setMuted] = useState(false);
  const [card, setCard] = useState<MotifId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hud, setHud] = useState<HudState>(() => ({ ...pick(createGame()), near: false, distance: null, intro: true }));
  const [final, setFinal] = useState<GameState | null>(null);
  const skip = useRef<() => void>(() => {});

  useEffect(() => { const start = () => sound.start('courtyard-water'); start(); addEventListener('pointerdown', start, { once: true }); return () => { removeEventListener('pointerdown', start); sound.stop(); }; }, []);
  useEffect(() => { sound.setMuted(muted); }, [muted]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  const onEvents = useCallback((evs: GameEvent[], s: GameState) => {
    for (const e of evs) {
      if (e.type === 'reveal') { sound.chime(); onFind(e.motif); setCard(e.motif); }
      if (e.type === 'rewind') setToast('Işık kaçtı — güneş biraz geri sarıldı');
      if (e.type === 'win') { onComplete(s.revealed); setFinal(s); }
    }
  }, [onComplete, onFind]);

  const replay = () => { setFinal(null); setCard(null); setRound((r) => r + 1); setHud({ ...pick(createGame()), near: false, distance: null, intro: false }); };

  return (
    <div className="relative h-full min-h-[100dvh] w-full overflow-hidden bg-ink">
      <GameCanvas device={device} camera={{ fov: 55, near: 0.3, far: 900, position: [-170, 85, 110] }}>
        <World key={round} device={device} paused={!!card || !!final} intro={round === 0} skip={skip} onHud={setHud} onEvents={onEvents} />
      </GameCanvas>
      {hud.intro && <button className="absolute inset-0 cursor-pointer" aria-label="Girişi atla" onClick={() => skip.current()} />}
      <Hud h={hud} muted={muted} onMute={() => setMuted((m) => !m)} onExit={onExit} toast={toast} />
      {card && !final && <RevealCard motif={card} onClose={() => setCard(null)} />}
      {final && <WinScreen revealed={final.revealed} seconds={final.elapsed} rewinds={final.rewinds} onReplay={replay} onExit={onExit} />}
    </div>
  );
}

const pick = (s: GameState) => ({ stage: s.stage, hour: s.hour, charge: s.charge, revealed: s.revealed, done: s.done });

function World({ device, paused, intro, skip, onHud, onEvents }: {
  device: DeviceProfile; paused: boolean; intro: boolean; skip: React.MutableRefObject<() => void>;
  onHud: (h: HudState) => void; onEvents: (e: GameEvent[], s: GameState) => void;
}) {
  const m = useMats();
  const game = useRef(createGame());
  const avatar = useRef({ ...game.current.avatar });
  const charge = useRef(0);
  const target = useRef<THREE.Vector3 | null>(null);
  const yaw = useRef(Math.PI / 2);
  const goal = useRef<{ x: number; z: number } | null>(null);
  const steer = useMemo(() => new Steering(), []);
  const keys = useRef(new Set<string>());
  const [introOn, setIntroOn] = useState(intro);
  // saat sahneye 0,02 saatlik (~1 dk) adımlarla verilir: huzme matrisleri her karede değil, gerektiğinde güncellenir
  const [hour, setHour] = useState(game.current.hour);
  const lastHud = useRef(0);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (KEYS[e.code]) { keys.current.add(e.code); goal.current = null; e.preventDefault(); } };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); };
  }, []);

  skip.current = useLightTrackingCamera({ avatar, target, yaw }, introOn, () => setIntroOn(false), matchMedia('(prefers-reduced-motion: reduce)').matches);

  const _cam = useThree((st) => st.camera);
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05);
    let s = game.current;
    if (!introOn && !paused && !s.done) {
      // ekran girdisi → kameraya göre dünya yönü
      let ix = walkInput.x, iy = walkInput.y;
      for (const k of keys.current) { ix += KEYS[k][0]; iy += KEYS[k][1]; }
      let move = { x: 0, z: 0 };
      if (Math.hypot(ix, iy) > 0.1) {
        goal.current = null;
        const fx = Math.sin(yaw.current), fz = Math.cos(yaw.current);
        move = { x: fx * -iy + -fz * ix, z: fz * -iy + fx * ix };
      } else if (goal.current) {
        move = steer.direction(s.avatar, goal.current, dt);
        if (move.x === 0 && move.z === 0) goal.current = null;
      }
      const r = step(s, move, dt);
      game.current = s = r.state;
      if (r.events.length) onEvents(r.events, s);
    }
    avatar.current = s.avatar; charge.current = s.charge;
    if (import.meta.env.DEV || location.search.includes('debug')) (window as unknown as { __game: unknown }).__game = { s, cam: _cam.position.toArray(), target: target.current?.toArray() };
    const pool = s.done ? null : targetPool(STAGES[s.stage], s.hour);
    if (pool) (target.current ??= new THREE.Vector3()).set(pool[0], 0, pool[2]); else target.current = null;
    if (Math.abs(s.hour - hour) >= 0.02 || (s.hour < hour)) setHour(s.hour);
    if (clock.elapsedTime - lastHud.current > 0.1) {
      lastHud.current = clock.elapsedTime;
      const distance = pool ? Math.hypot(s.avatar.x - pool[0], s.avatar.z - pool[2]) : null;
      onHud({ ...pick(s), near: distance !== null && distance < 2.2, distance, intro: introOn });
    }
    sound.mix({ water: insideHall(s.avatar.x, s.avatar.z) ? 0.08 : 0.35, wind: 0.25, pad: introOn ? 0.4 : 0.9 });
  });

  const current = game.current.done ? null : STAGES[game.current.stage].motif;
  return (
    <>
      <Surroundings m={m} hour={hour} tier={device.tier} fog={device.fog} shadows={device.shadows} />
      <Exterior m={m} tier={device.tier} />
      <Interior m={m} tier={device.tier} revealed={game.current.revealed} current={current} />
      <LightShafts hour={hour} target={target} particles={device.particles} />
      <Avatar pos={avatar} charge={charge} target={target} />
      {!introOn && <FloorPicker onPick={(x, z) => { goal.current = { x, z }; }} />}
    </>
  );
}
