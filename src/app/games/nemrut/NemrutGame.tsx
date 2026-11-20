/**
 * Nemrut Dağı — "Tanrıların Tahtı": rehbersiz keşif oyunu. Ana yönetici.
 *
 * Oyuncu zirvede serbestçe yürür (joystick / WASD), kamera üçüncü şahıstan izler ve sürükleyerek çevrilir. Rehber yoktur; defterdeki
 * yedi görev yol gösterir: doğu terasında gün doğumu, tahtların yazıtları, kırılıp düşmüş üç yazıt parçası, Pers adlarını doğru tanrıların
 * tahtına yerleştirme (çözülünce doğu terasının başları sanal olarak gövdelerine kalkar), Aslan Horoskobu'nda üç gezegen, dört el sıkışma
 * steli ve batı terasında gün batımı. Zaman akar (1 gerçek saniye = 1 dakika; ×20 hızlandırılabilir); güneş, sis, yıldızlar ve tanrı
 * ışınları DynamicLightingSystem.atmosphere(saat) çıktısından beslenir.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { EffectComposer, GodRays, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { create } from 'zustand';
import { ArrowLeft, BookOpen, Check, Captions, CaptionsOff, ExternalLink, FastForward, Search, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { Character, newRig, type Palette } from '../kiz-kulesi/NPCController';
import { keys, readKeys, walk } from '../kiz-kulesi/input';
import { Joystick } from '../shared/Joystick';
import { PHASE_LABEL, SUNRISE, WIND_DIR, approach, atmosphere, phaseOf, shouldUpdate } from './DynamicLightingSystem';
import { FIGURES, TERRACE_X, heightAt } from './terrain';
import { AREA_LABEL, FRAGMENTS, HOROSCOPE, PODIUM, QUESTS, START, THINGS, RING, areaAt, hitPlanet, matches, nearFragment, nearestThing, slide, walkable, watching, type Area, type Fragment, type Persian, type Progress, type Thing } from './site';
import { Scatter, Terrain, type Tier } from './ProceduralTerrain';
import { Monuments, PODIUM_TOP } from './Monuments';
import { clock, wrapHour } from './time';
import { nemrutAudio } from './AudioManager';

const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
function detectTier(): Tier {
  const q = new URLSearchParams(location.search).get('q'); if (q === 'low' || q === 'medium' || q === 'high') return q;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low';
  return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high';
}
const HIKER: Palette = { skin: '#c99272', hair: '#151515', top: '#b5452f', pants: '#3a3a42', shoes: '#5a4a3a', scarf: '#2f5f8f' };

/* ---------- durum ---------- */
interface S extends Omit<Progress, 'area' | 'hour'> {
  started: boolean; area: Area; hourShown: number; speed: 1 | 20; card: Thing | null; prompt: Thing | null; puzzle: boolean; journal: boolean;
  toast: { text: string; ok: boolean; t: number } | null; muted: boolean; tts: boolean; endShown: boolean;
  set: (p: Partial<S>) => void;
}
const INITIAL = { started: false, area: 'guney' as Area, hourShown: SUNRISE - 0.45, speed: 1 as const, card: null, prompt: null, puzzle: false, journal: false, toast: null, endShown: false, read: [] as string[], frags: [] as string[], placed: [] as string[], planets: [] as string[], seen: [] as string[], watched: [] as string[] };
const useNem = create<S>((set) => ({ ...INITIAL, muted: false, tts: true, set: (p) => set(p) }));
const live = { player: newRig(START.at[0], START.at[1], START.yaw), cam: { yaw: START.yaw, pitch: 0.28, dist: 6, drag: 0 }, hour: SUNRISE - 0.45, restore: { current: 0 }, dragging: false };
const progress = (s: S): Progress => ({ area: s.area, hour: live.hour, read: s.read, frags: s.frags, placed: s.placed, planets: s.planets, seen: s.seen, watched: s.watched });
const toast = (text: string, ok = true) => { useNem.getState().set({ toast: { text, ok, t: performance.now() } }); nemrutAudio.chime(ok); };

export default function NemrutGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}

function Game({ onExit }: { onExit: () => void }) {
  const [tier] = useState<Tier>(detectTier), [saver, setSaver] = useState(false);
  const t: Tier = saver ? 'low' : tier;
  const S = useNem();
  const stick = useRef({ x: 0, y: 0 });
  const doneCount = QUESTS.filter((q) => q.done(progress(S))).length, allDone = doneCount === QUESTS.length;

  useEffect(() => {
    type B = EventTarget & { level: number; charging: boolean }; let b: B | null = null; const check = () => b && setSaver(b.level < 0.2 && !b.charging);
    (navigator as Navigator & { getBattery?: () => Promise<B> }).getBattery?.().then((x) => { b = x; check(); x.addEventListener('levelchange', check); x.addEventListener('chargingchange', check); }).catch(() => {});
    return () => { b?.removeEventListener('levelchange', check); b?.removeEventListener('chargingchange', check); };
  }, []);
  useEffect(() => { nemrutAudio.setMuted(S.muted); }, [S.muted]);
  useEffect(() => () => { nemrutAudio.dispose(); useNem.setState(INITIAL); Object.assign(live.player, newRig(START.at[0], START.at[1], START.yaw)); Object.assign(live.cam, { yaw: START.yaw, pitch: 0.28, dist: 6, drag: 0 }); live.hour = SUNRISE - 0.45; live.restore.current = 0; }, []);
  // tamamlanan görev bildirimi
  const prevDone = useRef<string[]>([]);
  useEffect(() => {
    const d = QUESTS.filter((q) => q.done(progress(S))).map((q) => q.id), fresh = d.filter((id) => !prevDone.current.includes(id)); prevDone.current = d;
    if (fresh.length && S.started) toast(`Görev tamam: ${QUESTS.find((q) => q.id === fresh[0])!.title}`);
    if (S.placed.length >= 3 && fresh.includes('ad')) nemrutAudio.restore();
  }, [S.read, S.frags, S.placed, S.planets, S.seen, S.watched, S.started]);   // eslint-disable-line react-hooks/exhaustive-deps

  const inspect = useCallback((th: Thing) => {
    const s = useNem.getState(), patch: Partial<S> = { card: th };
    if (th.kind === 'taht' && th.terrace === 'dogu' && th.god && !s.read.includes(th.god)) patch.read = [...s.read, th.god];
    if (th.kind === 'stel' && !s.seen.includes(th.id)) patch.seen = [...s.seen, th.id];
    s.set(patch); if (s.tts) nemrutAudio.speak(th.text);
  }, []);
  const closeCard = useCallback(() => { useNem.getState().set({ card: null, puzzle: false }); nemrutAudio.hush(); }, []);
  const place = useCallback((f: Persian, th: Thing) => {
    const s = useNem.getState(); if (!th.god) return;
    if (matches(f, th.god)) { s.set({ placed: [...s.placed, f] }); toast(`Doğru! ${FIGURES.find((x) => x.id === th.god)!.name.toUpperCase()}`); }
    else toast(`Bu ad bu tanrıya uymuyor. İpucu: ${FRAGMENTS.find((x) => x.id === f)!.clue}`, false);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useNem.getState(); if (!s.started || e.repeat) return;
      if (e.code === 'KeyE' || e.code === 'KeyF') { if (s.card) closeCard(); else if (s.prompt) inspect(s.prompt); }
      if (e.code === 'Escape') closeCard();
      if (e.code === 'KeyJ') s.set({ journal: !s.journal });
      if (e.code === 'KeyT') s.set({ speed: s.speed === 1 ? 20 : 1 });
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0; const loop = () => { readKeys(stick.current); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); keys.clear(); };
  }, [inspect, closeCard]);
  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __nem: unknown }).__nem = {
      tp: (x: number, z: number, yaw = 0, pitch = 0.28, dist = 6) => { Object.assign(live.player, { x, z, yaw }); Object.assign(live.cam, { yaw, pitch, dist, drag: 3 }); useNem.getState().set({ started: true }); },
      hour: (h: number) => { live.hour = h; }, inspect: (id: string) => { const th = THINGS().find((x) => x.id === id); if (th) inspect(th); },
      give: (p: Partial<S>) => useNem.getState().set(p), state: () => ({ ...useNem.getState(), player: { ...live.player }, hour: live.hour }),
    };
  }, [inspect]);

  const ptr = useRef(new Map<number, { x: number; y: number }>()), pinch = useRef<number | null>(null);
  const onDown = (e: React.PointerEvent) => { nemrutAudio.unlock(); ptr.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); };
  const onMove = (e: React.PointerEvent) => {
    const p = ptr.current.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; ptr.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptr.current.size === 2) { const [a, b] = [...ptr.current.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch.current) live.cam.dist = THREE.MathUtils.clamp(live.cam.dist * (pinch.current / d), 2, 14); pinch.current = d; return; }
    if (useNem.getState().card) return;
    live.cam.yaw -= dx * 0.006; live.cam.pitch = THREE.MathUtils.clamp(live.cam.pitch + dy * 0.004, -0.7, 1.25); live.cam.drag = 1.5;
  };
  const onUp = (e: React.PointerEvent) => { ptr.current.delete(e.pointerId); if (ptr.current.size < 2) pinch.current = null; };
  const onWheel = (e: React.WheelEvent) => { live.cam.dist = THREE.MathUtils.clamp(live.cam.dist * (1 + Math.sign(e.deltaY) * 0.1), 2, 14); };
  const ph = phaseOf(S.hourShown);

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#05070d] text-white" style={{ touchAction: 'none' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp} onWheel={onWheel}>
      <Canvas shadows={t !== 'low'} dpr={t === 'low' ? 1 : [1, 1.6]} gl={{ antialias: t === 'high', powerPreference: 'high-performance' }} camera={{ fov: 55, near: 0.3, far: 6000, position: [150, 60, 160] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}>
        <Suspense fallback={null}>
          <Atmos tier={t} volumetric={t !== 'low'} />
          <Terrain tier={t} />
          <Scatter tier={t} />
          <Monuments restoreEast={live.restore} collected={S.frags} placed={S.placed} shadows={t !== 'low'} hi={t !== 'low'} />
          <Player />
          {S.started ? <Controller /> : <TitleCam />}
        </Suspense>
      </Canvas>

      {/* üst çubuk */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-3" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={onExit} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/55" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
        <button onClick={() => { nemrutAudio.unlock(); S.set({ muted: !S.muted }); }} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/55" aria-label={S.muted ? 'Sesi aç' : 'Sesi kapat'}>{S.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <button onClick={() => { S.set({ tts: !S.tts }); if (S.tts) nemrutAudio.hush(); }} className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-full ${S.tts ? 'bg-amber-500 text-black' : 'bg-black/55'}`} aria-label={S.tts ? 'Sesli okumayı kapat' : 'Sesli okumayı aç'} aria-pressed={S.tts}>{S.tts ? <Captions size={18} /> : <CaptionsOff size={18} />}</button>
        {S.started && (
          <button onClick={() => S.set({ journal: !S.journal })} className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full bg-black/55 px-4 text-sm font-semibold" aria-expanded={S.journal}>
            <BookOpen size={17} /> Defter <span className="rounded-full bg-amber-400 px-2 text-xs text-black">{doneCount}/{QUESTS.length}</span>
          </button>
        )}
        {S.started && (
          <div className="pointer-events-auto ml-auto flex items-center gap-1 rounded-2xl bg-black/55 p-1 pl-3">
            <div className="text-right leading-tight"><p className="text-sm font-bold tabular-nums">{clock(S.hourShown)}</p><p className="text-[10px] text-white/60">{PHASE_LABEL[ph]} · {AREA_LABEL[S.area]}</p></div>
            <button onClick={() => S.set({ speed: S.speed === 1 ? 20 : 1 })} aria-pressed={S.speed === 20} className={`ml-1 grid h-9 w-11 place-items-center rounded-xl text-xs font-bold ${S.speed === 20 ? 'bg-amber-400 text-black' : 'bg-white/15'}`} aria-label="Zamanı hızlandır"><FastForward size={16} /></button>
          </div>
        )}
      </div>
      {S.journal && <Journal onClose={() => S.set({ journal: false })} />}

      {S.started && (
        <>
          <Joystick stick={stick} onTouch={() => nemrutAudio.unlock()} />
          {S.prompt && !S.card && (
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => inspect(S.prompt!)} className={`absolute bottom-24 right-4 z-40 flex h-12 max-w-[64vw] items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-lg sm:bottom-28 ${S.seen.includes(S.prompt.id) || (S.prompt.god && S.read.includes(S.prompt.god)) ? 'bg-black/60' : 'bg-amber-400 text-black'}`}>
              <Search size={18} className="shrink-0" /><span className="truncate">İncele: {S.prompt.name}</span><span className="hidden opacity-70 [@media(pointer:fine)]:inline">· E</span>
            </button>
          )}
          {!S.card && !S.journal && <NextHint />}
        </>
      )}
      {S.card && !S.puzzle && <Card th={S.card} onClose={closeCard} onPlace={place} onPuzzle={() => S.set({ puzzle: true })} />}
      {S.puzzle && <Horoscope onClose={() => S.set({ puzzle: false })} />}
      {S.toast && <Toast key={S.toast.t} />}
      {!S.started && <TitleCard onStart={() => { nemrutAudio.unlock(); S.set({ started: true }); }} />}
      {allDone && !S.endShown && !S.card && <EndCard onStay={() => S.set({ endShown: true })} onExit={onExit} />}
    </div>
  );
}

/* ---------- oyuncu ve kamera ---------- */
function Player() { const rig = useMemo(() => ({ current: live.player }), []); return <Character rig={rig} palette={HIKER} castShadow />; }
function TitleCam() {
  const { camera } = useThree();
  useFrame(({ clock: c }) => { const a = c.elapsedTime * 0.03 + 0.4; camera.position.set(TERRACE_X + 40 + Math.cos(a) * 18, 9 + Math.sin(a) * 2, Math.sin(a) * 30); camera.lookAt(TERRACE_X, 6, 0); });
  return null;
}
const _c = new THREE.Vector3(), _l = new THREE.Vector3(), _f = new THREE.Vector3();
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Kamera noktası açık mı: tümülüsün/arazinin ve heykel kaidesinin içinde değil */
const camOk = (x: number, y: number, z: number) => y > heightAt(x, z) + 0.4 && !(Math.abs(x) > PODIUM.x0 - 0.5 && Math.abs(x) < PODIUM.x1 + 0.5 && Math.abs(z) < PODIUM.z && y < PODIUM_TOP + 9.8)
  && !(y < 4.2 && Math.hypot(x, z) > RING.r0 && Math.hypot(x, z) < RING.r1 && !walkable(x, z));   // baş, stel, sunak
function Controller() {
  const { camera } = useThree();
  const camPos = useRef(camera.position.clone()), look = useRef(new THREE.Vector3(live.player.x, 1.5, live.player.z));
  const st = useRef({ key: '', area: '', step: 0, shown: 0, watchT: 0 });
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useNem.getState(), p = live.player, cam = live.cam;
    // zaman
    live.hour = wrapHour(live.hour + (dt * S.speed) / 60);
    st.current.shown += dt; if (st.current.shown > 0.5) { st.current.shown = 0; S.set({ hourShown: live.hour }); }
    // yürüyüş (kameraya göre)
    const frozen = !!S.card || S.puzzle;
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    const mx = fx * -walk.y + rx * walk.x, mz = fz * -walk.y + rz * walk.x, ml = Math.hypot(mx, mz);
    const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 5.4 : 3.5) * Math.min(1, ml);
    if (!frozen && ml > 0.08) {
      const [nx, nz] = slide([p.x, p.z], (mx / ml) * speed * dt, (mz / ml) * speed * dt), moved = Math.hypot(nx - p.x, nz - p.z);
      p.speed = dt > 0 ? moved / dt : 0; p.x = nx; p.z = nz; p.yaw += wrap(Math.atan2(-mx, -mz) - p.yaw) * (1 - Math.exp(-dt * 12));
      st.current.step += moved; if (st.current.step > 0.8) { st.current.step = 0; nemrutAudio.step(); }
      if (cam.drag <= 0 && Math.abs(walk.x) < 0.5 && walk.y < -0.3) cam.yaw += wrap(p.yaw - cam.yaw) * (1 - Math.exp(-dt * 0.8));
    } else p.speed = 0;
    cam.drag -= dt; p.y = Math.max(0, heightAt(p.x, p.z));
    p.wind = atmosphere(live.hour).wind;
    // bölüm, parça toplama, yakındaki nesne, gün doğumu/batımı
    const area = areaAt(p.x, p.z); if (area !== st.current.area) { st.current.area = area; S.set({ area }); }
    const fr = nearFragment(p.x, p.z, S.frags); if (fr && !frozen) { S.set({ frags: [...S.frags, fr.id] }); toast(`Yazıt parçası bulundu: “${fr.word}”`); }
    const th = frozen ? null : nearestThing(p.x, p.z); if ((th?.id ?? '') !== st.current.key) { st.current.key = th?.id ?? ''; S.set({ prompt: th }); }
    const w = watching(area, live.hour);
    if (w && !S.watched.includes(w)) { st.current.watchT += Math.min(raw, 0.5);   // gerçek süre (düşük kare hızında da 4 sn)
      if (st.current.watchT > 4) { st.current.watchT = 0; S.set({ watched: [...S.watched, w] }); } } else st.current.watchT = 0;
    live.restore.current = approach(live.restore.current, S.placed.length >= 3 ? 1 : 0, dt, 1.4);

    // kamera
    const head = p.y + 1.6, card = S.card; let blocked = false;
    if (card) {
      const dx = card.at[0] - p.x, dz = card.at[1] - p.z; if (Math.hypot(dx, dz) > 0.6) cam.yaw += wrap(Math.atan2(-dx, -dz) - cam.yaw) * (1 - Math.exp(-dt * 3));
      _c.set(p.x + Math.sin(cam.yaw) * 4.2, head + 1.2, p.z + Math.cos(cam.yaw) * 4.2);
      { const n = 17; let ok = 0; for (let i = 1; i <= n; i++) { const f = i / n; if (!camOk(p.x + (_c.x - p.x) * f, head + (_c.y - head) * f, p.z + (_c.z - p.z) * f)) break; ok = f; }   // inceleme kamerası da heykel/kayaya girmesin
        if (ok < 1) { blocked = true; const f = Math.max(0.1, ok - 0.05); _c.set(p.x + (_c.x - p.x) * f, head + (_c.y - head) * f, p.z + (_c.z - p.z) * f); } }
      _c.y = Math.max(_c.y, heightAt(_c.x, _c.z) + 0.5); _l.set(card.at[0], Math.max(card.y, 1), card.at[1]).lerp(_f.set(p.x, head, p.z), 0.2);
    } else {
      const D = cam.dist, cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      _c.set(p.x + Math.sin(cam.yaw) * cp * D, head + sp * D, p.z + Math.cos(cam.yaw) * cp * D);
      const n = Math.ceil(D / 0.25); let ok = 0;
      for (let i = 1; i <= n; i++) { const f = i / n; if (!camOk(p.x + (_c.x - p.x) * f, head + (_c.y - head) * f, p.z + (_c.z - p.z) * f)) break; ok = f; }
      if (ok < 1) { blocked = true; const f = Math.max(0.1, ok - 0.05); _c.set(p.x + (_c.x - p.x) * f, head + (_c.y - head) * f, p.z + (_c.z - p.z) * f); }
      _c.y = Math.max(_c.y, heightAt(_c.x, _c.z) + 0.5);
      _l.set(p.x, head, p.z); if (cam.pitch < 0) _l.y += -cam.pitch * 12;   // yukarı bakış: heykellerin tepesi
    }
    const k = 1 - Math.exp(-dt * (card ? 3 : 9));
    // engel araya girince kamera yumuşatılmadan içeri alınır (heykelin/kayanın içinden görünmesin)
    _f.set(p.x, head, p.z);
    if (camPos.current.distanceTo(_c) > 40) { camPos.current.copy(_c); look.current.copy(_l); } else { if (blocked && _c.distanceTo(_f) < camPos.current.distanceTo(_f)) camPos.current.copy(_c); else camPos.current.lerp(_c, k); look.current.lerp(_l, k); }
    camera.position.copy(camPos.current); camera.lookAt(look.current);
    camera.getWorldDirection(_f);
    nemrutAudio.update(atmosphere(live.hour).wind, [camera.position.x, camera.position.y, camera.position.z], [_f.x, _f.y, _f.z], p.x < 0 ? -TERRACE_X : TERRACE_X);
  });
  return null;
}

/* ---------- atmosfer: güneş (gölge oyuncuyu izler), gökyüzü, sis, yıldızlar, sis bulutları, tanrı ışınları ---------- */
function Atmos({ tier, volumetric }: { tier: Tier; volumetric: boolean }) {
  const { scene, camera } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null!), hemi = useRef<THREE.HemisphereLight>(null!), disc = useRef<THREE.Mesh>(null!), stars = useRef<THREE.Points>(null!), fogs = useRef<THREE.InstancedMesh>(null!);
  const sky = useRef<{ material: THREE.ShaderMaterial }>(null!);
  const st = useRef({ last: -1, t: 0 });
  const starGeo = useMemo(() => { const n = tier === 'low' ? 700 : 2200, a = new Float32Array(n * 3); let s = 5; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < n; i++) { const u = r() * Math.PI * 2, v = Math.acos(r() * 0.98), R = 3800; a.set([Math.cos(u) * Math.sin(v) * R, Math.cos(v) * R, Math.sin(u) * Math.sin(v) * R], i * 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g; }, [tier]);
  const fog = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!, gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const n = tier === 'medium' ? 26 : 44, seeds = Array.from({ length: n }, (_, i) => ({ a: (i * 2.399) % (Math.PI * 2), d: 160 + ((i * 53) % 260), y: -30 + ((i * 17) % 50), s: 90 + ((i * 31) % 110), ph: i * 37.7 }));
    return { tex: new THREE.CanvasTexture(c), n, seeds };
  }, [tier]);
  useEffect(() => { scene.fog = volumetric ? new THREE.FogExp2('#888', 0.002) : new THREE.Fog('#888', 120, 1400); scene.background = new THREE.Color('#05070d'); return () => { scene.fog = null; }; }, [scene, volumetric]);
  useEffect(() => { const c = sun.current.shadow.camera; c.left = -45; c.right = 45; c.top = 45; c.bottom = -45; c.near = 10; c.far = 600; c.updateProjectionMatrix(); }, []);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color() }), []);
  useFrame(({ clock: c }, raw) => {
    const dt = Math.min(raw, 0.1), S = st.current, now = c.elapsedTime;
    if (!shouldUpdate(now, S.last, live.dragging)) return; S.last = now;
    const a = atmosphere(live.hour), ex = a.exposure, p = live.player;
    const night = a.day < 0.04, dir = night ? [-a.sun[0], Math.max(0.35, -a.sun[1]), -a.sun[2]] : [a.sun[0], Math.max(0.03, a.sun[1]), a.sun[2]];
    sun.current.position.set(p.x + dir[0] * 300, dir[1] * 300, p.z + dir[2] * 300); sun.current.target.position.set(p.x, 2, p.z); sun.current.target.updateMatrixWorld();
    if (night) sun.current.color.setRGB(0.45, 0.55, 0.8); else sun.current.color.setRGB(...a.sunColor); sun.current.intensity = (night ? 0.12 : a.sunIntensity) * ex;
    hemi.current.color.setRGB(...a.ambientSky); hemi.current.groundColor.setRGB(...a.ambientGround); hemi.current.intensity = a.ambient * ex;
    tmp.c.setRGB(...a.fogColor); scene.fog!.color.copy(tmp.c); (scene.background as THREE.Color).copy(tmp.c);
    if (scene.fog instanceof THREE.FogExp2) scene.fog.density = a.fogDensity * 0.85; else { (scene.fog as THREE.Fog).near = 60; (scene.fog as THREE.Fog).far = Math.min(2600, 2.2 / a.fogDensity); }
    if (sky.current) { const u = sky.current.material.uniforms; u.sunPosition.value.set(a.sun[0], a.sun[1], a.sun[2]).multiplyScalar(1000); u.rayleigh.value = 0.6 + (1 - Math.min(1, Math.max(0, a.elevation / 30))) * 2.6; u.turbidity.value = 4 + a.fogDensity * 2200; }
    (stars.current.material as THREE.PointsMaterial).opacity = a.stars; stars.current.visible = a.stars > 0.02; stars.current.rotation.y = live.hour * 0.26;
    disc.current.position.set(camera.position.x + a.sun[0] * 3000, camera.position.y + a.sun[1] * 3000, camera.position.z + a.sun[2] * 3000);
    disc.current.visible = a.elevation > -3; (disc.current.material as THREE.MeshBasicMaterial).color.setRGB(a.sunColor[0], a.sunColor[1], a.sunColor[2]).multiplyScalar(0.5 + a.godRays * 2.5);
    if (fogs.current) {
      S.t += dt * (8 + a.wind * 26); const dens = Math.min(1, a.fogDensity / 0.006);
      fog.seeds.forEach((f, i) => { const drift = ((S.t + f.ph * 6) % 700) - 350; tmp.p.set(Math.cos(f.a) * f.d + WIND_DIR[0] * drift, f.y + Math.sin(S.t * 0.01 + f.ph) * 6, Math.sin(f.a) * f.d + WIND_DIR[1] * drift); tmp.q.copy(camera.quaternion); const k = f.s * (0.7 + dens * 0.8) * (1 - (Math.abs(drift) / 350) * 0.6); fogs.current.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s.set(k, k * 0.45, 1))); });
      fogs.current.instanceMatrix.needsUpdate = true; const mm = fogs.current.material as THREE.MeshBasicMaterial; mm.opacity = 0.08 + dens * 0.45; mm.color.setRGB(...a.fogColor).lerp(new THREE.Color(1, 1, 1), 0.35 * a.day);
    }
  });
  return (
    <>
      <Sky ref={sky as never} distance={450000} sunPosition={[0, 1, 0]} mieCoefficient={0.006} mieDirectionalG={0.85} />
      <points ref={stars} geometry={starGeo}><pointsMaterial color="#dfe8ff" size={tier === 'low' ? 2.2 : 1.7} sizeAttenuation={false} transparent depthWrite={false} fog={false} /></points>
      <mesh ref={disc}><sphereGeometry args={[70, 20, 14]} /><meshBasicMaterial color="#fff2cc" fog={false} toneMapped={false} transparent depthWrite={false} /></mesh>
      <hemisphereLight ref={hemi} args={['#fff', '#444', 0.6]} />
      <directionalLight ref={sun} castShadow={tier !== 'low'} shadow-mapSize={tier === 'high' ? [2048, 2048] : [1024, 1024]} shadow-bias={-0.0005} shadow-normalBias={0.05} />
      {volumetric && <instancedMesh ref={fogs} args={[undefined, undefined, fog.n]} frustumCulled={false}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={fog.tex} transparent depthWrite={false} fog={false} /></instancedMesh>}
      {volumetric && <Rays disc={disc} />}
    </>
  );
}
function Rays({ disc }: { disc: React.MutableRefObject<THREE.Mesh> }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  if (!ready || !disc.current) return null;
  return (
    <EffectComposer multisampling={0}>
      <GodRays sun={disc.current} samples={40} density={0.94} decay={0.93} weight={0.5} exposure={0.34} clampMax={1} blur />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette darkness={0.45} offset={0.3} />
    </EffectComposer>
  );
}

/* ---------- arayüz ---------- */
function NextHint() {
  const s = useNem(), q = QUESTS.find((x) => !x.done(progress(s)));
  if (!q) return null;
  return <p className="pointer-events-none absolute bottom-6 left-1/2 z-30 max-w-[62vw] -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-center text-xs backdrop-blur sm:text-sm"><b className="text-amber-300">Sıradaki:</b> {q.title}<span className="hidden [@media(pointer:fine)]:inline"> · WASD · sürükle: bak · J: defter · T: zaman</span></p>;
}
function Journal({ onClose }: { onClose: () => void }) {
  const s = useNem(), p = progress(s);
  return (
    <div className="absolute left-3 top-16 z-40 w-[min(25rem,calc(100%-1.5rem))] rounded-2xl bg-[#1a140d]/92 p-4 shadow-2xl backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex items-center"><h2 className="font-bold">Keşif defteri</h2><button onClick={onClose} className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Kapat"><X size={16} /></button></div>
      <ol className="mt-2 space-y-2">
        {QUESTS.map((q) => { const d = q.done(p), c = q.count?.(p); return (
          <li key={q.id} className={`rounded-xl p-2.5 ${d ? 'bg-amber-400/15' : 'bg-white/5'}`}>
            <p className="flex items-center gap-2 text-sm font-semibold">{d ? <Check size={16} className="shrink-0 text-amber-300" /> : <span className="h-4 w-4 shrink-0 rounded-full border border-white/40" />}{q.title}{c && !d && <span className="ml-auto text-xs text-white/60">{c[0]}/{c[1]}</span>}</p>
            {!d && <p className="mt-1 pl-6 text-xs text-white/65">{q.hint}</p>}
          </li>); })}
      </ol>
      {s.frags.length > 0 && <p className="mt-3 text-xs text-white/70">Çantada: {FRAGMENTS.filter((f) => s.frags.includes(f.id) && !s.placed.includes(f.id)).map((f) => f.word).join(', ') || '—'}</p>}
    </div>
  );
}
function Card({ th, onClose, onPlace, onPuzzle }: { th: Thing; onClose: () => void; onPlace: (f: Persian, th: Thing) => void; onPuzzle: () => void }) {
  const s = useNem();
  const carried: Fragment[] = FRAGMENTS.filter((f) => s.frags.includes(f.id) && !s.placed.includes(f.id));
  const needs = th.kind === 'taht' && th.god && FRAGMENTS.some((f) => f.god === th.god), solved = th.god && FRAGMENTS.some((f) => f.god === th.god && s.placed.includes(f.id));
  return (
    <div className="absolute inset-x-3 bottom-3 z-40 mx-auto max-w-lg sm:bottom-6 sm:left-auto sm:right-6 sm:mx-0" onPointerDown={(e) => e.stopPropagation()}>
      <div className="rounded-2xl bg-[#f6efe2] p-5 text-ink shadow-2xl">
        <div className="flex items-start gap-2">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-amber-700">{th.terrace ? AREA_LABEL[th.terrace] : 'Nemrut Dağı'}</p><h2 className="text-xl font-bold">{th.name}</h2></div>
          <button onClick={onClose} className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/5" aria-label="Kapat"><X size={18} /></button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{th.text}</p>
        {needs && th.terrace === 'dogu' && (solved
          ? <p className="mt-3 rounded-lg bg-amber-100 p-2 text-sm font-semibold text-amber-900"><Check size={14} className="-mt-0.5 mr-1 inline" />Pers adı yerine konuldu.</p>
          : carried.length > 0
            ? <div className="mt-3"><p className="text-xs font-semibold text-slate-500">Kırık yazıta bir parça yerleştir:</p><div className="mt-1.5 flex flex-wrap gap-2">{carried.map((f) => <button key={f.id} onClick={() => onPlace(f.id, th)} className="h-10 rounded-lg bg-amber-500 px-3 font-mono text-sm font-bold tracking-wider text-black">{f.word}</button>)}</div></div>
            : <p className="mt-3 text-xs text-slate-500">Yazıtın Pers adı eksik. Kırılan parçalar zirvenin çevresine dağılmış.</p>)}
        {needs && th.terrace === 'bati' && carried.length > 0 && <p className="mt-3 text-xs text-slate-500">Parçalar doğu terasındaki tahtlara ait.</p>}
        {th.kind === 'aslan' && <button onClick={onPuzzle} className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-amber-500 px-4 font-semibold text-black"><Sparkles size={16} /> Gezegenleri bul ({s.planets.length}/3)</button>}
        <p className="mt-3 text-[11px] text-slate-500">Oyun kurgusu: yazıt parçası bulmacası gerçek bir buluntuyu temsil etmez. Heykeller stilizedir.</p>
        <a href={th.source.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-800 underline">{th.source.title} <ExternalLink size={12} /></a>
      </div>
    </div>
  );
}
/** Aslan Horoskobu bulmacası: kabartmadaki 19 yıldız arasından üç gezegeni bul */
function Horoscope({ onClose }: { onClose: () => void }) {
  const s = useNem(), [msg, setMsg] = useState('Üç büyük, çok kollu yıldız gezegenleri gösterir. Kabartmaya dokun.');
  const tap = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100, p = hitPlanet(x, y);
    if (p) { if (!s.planets.includes(p.id)) { s.set({ planets: [...s.planets, p.id] }); nemrutAudio.chime(true); } setMsg(`Gezegen: ${p.name}`); }
    else if (HOROSCOPE.stars.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < 5)) setMsg('Bu, Aslan takımyıldızının 19 yıldızından biri.');
    else if (Math.hypot(HOROSCOPE.moon[0] - x, HOROSCOPE.moon[1] - y) < 7) setMsg('Aslanın boynundaki hilal: Ay.');
  };
  const star = (x: number, y: number, r: number, n: number) => Array.from({ length: n * 2 }, (_, i) => { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * 0.4 : r; return `${x + Math.cos(a) * rr},${y + Math.sin(a) * rr}`; }).join(' ');
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/70 p-4" onPointerDown={(e) => e.stopPropagation()}>
      <div className="w-full max-w-md rounded-2xl bg-[#2a2118] p-4 shadow-2xl">
        <div className="flex items-center"><h2 className="font-bold">Aslan Horoskobu · {s.planets.length}/3</h2><button onClick={onClose} className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Kapat"><X size={16} /></button></div>
        <svg viewBox="0 0 100 100" className="mt-3 w-full cursor-crosshair rounded-xl bg-[#c9b998]" onClick={tap} role="img" aria-label="Aslan kabartması">
          <g fill="#a8966f" stroke="#8a7852" strokeWidth={0.6}>
            <ellipse cx={50} cy={60} rx={36} ry={13} /><ellipse cx={83} cy={47} rx={11} ry={12} />
            {[25, 38, 62, 76].map((x) => <rect key={x} x={x - 3} y={66} width={6} height={24} rx={2} />)}
            <path d="M15,58 Q4,44 11,32" fill="none" strokeWidth={3} />
          </g>
          <path d={`M${HOROSCOPE.moon[0] - 5},${HOROSCOPE.moon[1] - 4} A6,6 0 1,0 ${HOROSCOPE.moon[0] + 5},${HOROSCOPE.moon[1] - 4}`} fill="none" stroke="#fff7e0" strokeWidth={1.8} />
          {HOROSCOPE.stars.map(([x, y], i) => <polygon key={i} points={star(x, y, 2.2, 8)} fill="#fff7e0" />)}
          {HOROSCOPE.planets.map((p) => <polygon key={p.id} points={star(p.at[0], p.at[1], 4.2, 12)} fill={s.planets.includes(p.id) ? '#ffcc55' : '#fff7e0'} />)}
        </svg>
        <p className="mt-3 min-h-[2.5rem] text-sm text-white/85">{msg}</p>
        <p className="mt-1 text-[11px] text-white/50">Yıldızların yeri stilize bir yerleşimdir. Yazıtlarda gezegenler Yunanca adlarıyla geçer.</p>
      </div>
    </div>
  );
}
function Toast() {
  const t = useNem((s) => s.toast); const [show, setShow] = useState(true);
  useEffect(() => { const id = setTimeout(() => setShow(false), t && !t.ok ? 5200 : 3000); return () => clearTimeout(id); }, [t]);
  if (!t || !show) return null;
  return <div className={`pointer-events-none absolute left-1/2 top-20 z-50 max-w-[90vw] -translate-x-1/2 rounded-2xl px-4 py-2 text-center text-sm font-semibold shadow-xl ${t.ok ? 'bg-amber-400 text-black' : 'bg-[#5a2a20] text-white'}`}>{t.text}</div>;
}
function TitleCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-40 p-4 sm:p-8" onPointerDown={(e) => e.stopPropagation()}>
      <div className="mx-auto max-w-xl rounded-2xl bg-black/65 p-5 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Adıyaman · UNESCO Dünya Mirası · ~2.134 m</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Nemrut Dağı: Tanrıların Tahtı</h1>
        <p className="mt-2 text-sm text-white/85">Şafaktan önce zirvedesin. Kral I. Antiochos’un tanrılarla yan yana oturduğu teraslarda kendi başına dolaş: gün doğumunu izle, kırık yazıtların parçalarını bul, tanrıların Pers adlarını yerine koy, Aslan Horoskobu’nun gezegenlerini ara.</p>
        <p className="mt-2 text-xs text-white/60">Joystick / WASD ile yürü (Shift: koş) · sürükle: bak · E: incele · J: defter · T: zamanı hızlandır</p>
        <p className="mt-1 text-[11px] text-white/45">Arazi, heykeller ve yerleşim stilizedir; ölçüler yaklaşıktır. Tümülüse çıkılmaz (gerçekte de yasaktır).</p>
        <button onClick={onStart} className="mt-4 h-12 w-full rounded-xl bg-amber-400 font-semibold text-black">Zirveye çık</button>
      </div>
    </div>
  );
}
function EndCard({ onStay, onExit }: { onStay: () => void; onExit: () => void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/35 p-5" onPointerDown={(e) => e.stopPropagation()}>
      <div className="w-full max-w-md rounded-3xl bg-[#f6efe2] p-6 text-center text-ink shadow-2xl">
        <p className="text-sm font-semibold text-amber-700">Defter tamamlandı</p>
        <h2 className="mt-1 text-2xl font-bold">Tanrıların tahtı yeniden okundu</h2>
        <p className="mt-2 text-sm text-slate-600">Gün doğumundan gün batımına kadar zirveyi gezdin, yazıtları tamamladın ve Aslan Horoskobu’nun gezegenlerini buldun. Gece çökünce yıldızlar da çıkar.</p>
        <div className="mt-5 flex gap-2">
          <button onClick={onStay} className="h-11 flex-1 rounded-xl border border-line font-semibold">Zirvede kal</button>
          <button onClick={onExit} className="h-11 flex-1 rounded-xl bg-brand font-semibold text-white">Haritaya dön</button>
        </div>
      </div>
    </div>
  );
}
function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null), [i, setI] = useState(0);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/Nemrut_Da%C4%9F%C4%B1').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  const list = THINGS().filter((t) => t.kind !== 'bas' && !(t.kind === 'taht' && t.terrace === 'bati')), th = list[i];
  return (
    <div className="fixed inset-0 bg-[#05070d] text-white">
      {img && <img src={img} alt="Nemrut Dağı" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/80 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <h2 className="mt-1 text-lg font-bold">{th.name}</h2><p className="mt-1 text-sm">{th.text}</p>
        <div className="mt-3 flex gap-2"><button onClick={() => nemrutAudio.speak(th.text)} className="h-10 rounded-lg bg-white/15 px-3 text-sm">Dinle</button><button onClick={() => setI((i + 1) % list.length)} className="h-10 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-black">Sonraki</button></div>
      </div>
    </div>
  );
}
