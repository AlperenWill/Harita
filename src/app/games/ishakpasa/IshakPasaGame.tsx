/**
 * İshak Paşa Sarayı — "Taşın Nakışı". Ana yönetici.
 *
 * Taç kapıdan gir; selamlık → türbe → cami → harem → teras. Her durakta aşınmış bir süsleme panosu var; "Onar (E)" ile bulmaca açılır
 * (kendiliğinden açılmaz): 3×3 parçayı dokunarak çevir, motifi tamamla. Tamamlanan motif saraydaki panoya oturur ve bilgi kartı açılır.
 * KAMERA: birinci şahıs, rotaya kilitli (Troya, Ani ile aynı şema). Bulmaca açıkken yürüme durur.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { ChevronRight, Footprints, MousePointer2, Puzzle, Sparkles, X } from 'lucide-react';
import { CENTER, GRID, ROUTE_LEN, STOPS, isSolved, nearStop, rotateTile, routeAt, scramble, type Stop } from './site';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { Clouds, Sun } from '../shared/scenery';
import { LookCrosshair } from '../shared/mouseLook';
import { Boulders, Grass, Mountain, OldFortress, Palace, Panel, SUN_DIR, Terrain, useMats } from './IshakModels';
import { motifURL } from './motif';
import { Controls, EndCard, GameMenu, Hint, HudTheme, InfoCard, InteractPrompt, NavRail, Objective, StopList, TitleCard, TopBar, WalkAudio, useAudioSettings, WikiFallback, detectTier, dprFor, newLive, pinned, stepWalk, supportsWebGL, useWalkInput, wrapA, type CamState, type Tier } from '../shared/walkKit';

const audio = new WalkAudio({ freq: 380, gain: 0.1 }, 'male');
interface S { started: boolean; listOpen: boolean; done: string[]; near: Stop | null; puzzle: Stop | null; tiles: number[]; card: Stop | null; muted: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, listOpen: false, done: [] as string[], near: null, puzzle: null, tiles: [] as number[], card: null, endShown: false };
const useDb = create<S>((set) => ({ ...INITIAL, muted: false, set: (p) => set(p) }));
const live = newLive();
const pause = { on: false };   // ≡ menü açıkken oyun durur
/** Duraklar arası otomatik yürüyüş (önceki / sonraki / listeden git) */
const nav = { to: null as number | null, turn: 0, speed: 16 };
const nextIdx = () => STOPS.findIndex((x) => x.s > live.s + 2), prevIdx = () => { for (let i = STOPS.length - 1; i >= 0; i--) if (STOPS[i].s < live.s - 2) return i; return -1; };

export default function IshakPasaGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <WikiFallback wiki="İshak Paşa Sarayı" alt="İshak Paşa Sarayı" items={STOPS} onExit={onExit} speak={(t) => audio.speak(t)} />;
  return <Game onExit={onExit} />;
}
function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier), S = useDb();
  useAudioSettings(audio);
  useEffect(() => () => { audio.dispose(); useDb.setState(INITIAL); Object.assign(live, newLive()); nav.to = null; nav.turn = 0; }, []);
  const close = useCallback(() => { useDb.getState().set({ card: null }); audio.hush(); }, []);
  const tap = useCallback((i: number) => { const s = useDb.getState(), p = s.puzzle; if (!p || i === CENTER) return; const tiles = rotateTile(s.tiles, i); audio.click();
    if (isSolved(tiles)) { audio.tone(true); s.set({ tiles, puzzle: null, card: p, done: [...s.done, p.id] }); audio.speak(`${p.name}. ${p.text}`); } else s.set({ tiles }); }, []);
  const solveAll = useCallback(() => { const s = useDb.getState(); if (!s.puzzle) return; s.tiles.forEach((v, i) => { for (let k = 0; k < (4 - v) % 4; k++) tap(i); }); }, [tap]);
  const input = useWalkInput(live, () => useDb.getState().started, (e) => { const s = useDb.getState(); if ((e.code === 'Escape' || e.code === 'KeyE') && s.card) close(); else if (e.code === 'Escape' && s.puzzle) { e.preventDefault(); s.set({ puzzle: null }); } else if (e.code === 'KeyE' && !s.puzzle && s.near && !s.done.includes(s.near.id)) s.set({ puzzle: s.near }); }, () => audio.unlock(), () => { const s = useDb.getState(); return s.started && !s.card && !s.puzzle && !s.listOpen; });

  const goTo = useCallback((i: number) => { if (i < 0 || i >= STOPS.length) return; nav.to = STOPS[i].s; nav.speed = Math.max(16, Math.abs(nav.to - live.s) / 3); useDb.getState().set({ card: null, puzzle: null, listOpen: false }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); Object.assign(live, newLive()); nav.to = null; useDb.setState({ ...INITIAL, started: true }); }, []);
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __ishak: unknown }).__ishak = { go: (s: number) => { live.s = s; useDb.getState().set({ started: true }); }, look: (y: number, p = 0) => { live.yaw = y; live.pitch = p; }, tap, solveAll, goTo, state: () => ({ ...useDb.getState(), s: live.s }), STOPS, ROUTE_LEN }; }, [tap, solveAll, goTo]);
  const lastTap = useRef(0);
  const onDown = (e: React.PointerEvent) => { input.onPointerDown(e); if (e.pointerType !== 'mouse' && useDb.getState().started) { const t = performance.now(); if (t - lastTap.current < 300) goTo(nextIdx()); lastTap.current = t; } };
  const nI = S.started ? nextIdx() : -1, pI = S.started ? prevIdx() : -1, nextStop = STOPS.find((x) => !S.done.includes(x.id));
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#e3e8ec]" style={{ touchAction: 'none' }} {...input} onPointerDown={onDown} onPointerCancel={input.onPointerUp}>
      <HudTheme theme={THEME}>
      <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={dprFor(tier)} gl={{ antialias: tier === 'high' }} camera={{ fov: 62, near: 0.1, far: 6000, position: [120, 30, 90] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.72; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}><World tier={tier} done={S.done} /><SkyEnvironment sky="#d3e2ee" sun="#ffe6c6" ground="#a8956a" sunDir={[0.55, 0.5, 0.67]} /><Polish tier={tier} /></Suspense>
      </Canvas>
      <TopBar onExit={onExit} objective={S.started ? <Objective icon={<Sparkles size={15} />} label={nextStop ? `Sıradaki: ${nextStop.name}` : 'Bütün nakışlar onarıldı'} done={S.done.length} total={STOPS.length} /> : undefined} menu={<GameMenu onPause={(v) => { pause.on = v; }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
      {S.started && !S.listOpen && !S.puzzle && <NavRail onNext={() => goTo(nI)} onPrev={() => goTo(pI)} onTurn={() => { nav.turn += Math.PI; }} onList={() => S.set({ listOpen: true, card: null })} nextDisabled={nI < 0} prevDisabled={pI < 0} listLabel="Nakış listesi" />}
      {S.listOpen && <StopList title="Nakışlar" items={STOPS.map((x) => ({ id: x.id, name: x.name, done: S.done.includes(x.id) }))} doneLabel="Onarıldı" todoLabel="Henüz onarılmadı" onGo={goTo} onRead={(i) => { const x = STOPS[i]; S.set({ listOpen: false, card: x }); audio.speak(`${x.name}. ${x.text}`); }} onRestart={restart} onClose={() => S.set({ listOpen: false })} />}
      <LookCrosshair locked={input.locked} />
      {S.puzzle && <PuzzlePanel stop={S.puzzle} tiles={S.tiles} onTap={tap} onLeave={() => S.set({ puzzle: null })} />}
      {S.started && !S.puzzle && !S.card && S.near && !S.done.includes(S.near.id) && <InteractPrompt icon={<Puzzle size={18} />} label={`Onar: ${S.near.name}`} onClick={() => S.set({ puzzle: S.near })} />}
      {S.started && !S.puzzle && !S.card && <Hint>Dikey sürükle: yürü · yatay: bak · çift dokun: sonraki durak<span className="hidden [@media(pointer:fine)]:inline"> · WASD: bakılan yöne yürü · fareyle sürükle: bak</span></Hint>}
      {S.card && !S.listOpen && <InfoCard kicker={`Nakış ${S.done.indexOf(S.card.id) + 1} / ${STOPS.length} · ${S.card.motifName}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} />}
      {!S.started && <TitleCard kicker="Ağrı · Doğubayazıt · 18. yüzyıl" title="İshak Paşa Sarayı: Taşın Nakışı" note="Plan stilizedir; motifler saraydaki süslemelerden esinlenilmiş temsilî çizimlerdir." cta="Taç kapıdan gir" onExit={onExit} controls={CONTROLS} icon={<Puzzle size={18} />} onStart={() => { audio.unlock(); S.set({ started: true }); }}>
        <p>Ağrı Dağı’na bakan sarayın avlularını gez. Her durakta yüzyıllar içinde aşınmış bir taş süsleme var: parçalara dokunarak çevir, motifi tamamla, panoyu yerine oturt.</p></TitleCard>}
      {S.started && S.done.length === STOPS.length && !S.endShown && !S.card && <EndCard kicker="Bütün nakışlar tamam" title="Saray yeniden süslendi" text="Taç kapıdan terasa kadar altı süsleme panosunu tamamladın. Sarayda Osmanlı, Selçuklu ve İran ustalarının izleri yan yana durur." onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}

/* ---------- bulmaca paneli ---------- */
function PuzzlePanel({ stop, tiles, onTap, onLeave }: { stop: Stop; tiles: number[]; onTap: (i: number) => void; onLeave: () => void }) {
  const url = motifURL(stop.motif), size = 'min(72vw, 300px, 46vh)';
  return (
    <div className="absolute inset-x-3 bottom-4 z-40 mx-auto max-w-sm" onPointerDown={(e) => e.stopPropagation()}>
      <div className="rounded-3xl bg-[#f7f5f1] p-4 text-[#1f1b17] shadow-[0_18px_50px_rgba(31,27,23,0.25)] ring-1 ring-black/5">
        <div className="flex items-start gap-2"><div><p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: THEME.accent }}>Nakış bulmacası · {stop.name}</p><h2 className="text-base font-bold">{stop.motifName}</h2></div>
          <button onClick={onLeave} className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/5" aria-label="Bulmacayı kapat"><X size={16} /></button></div>
        <div className="mx-auto mt-3 grid gap-[3px] rounded-lg bg-[#5a4128] p-[3px]" style={{ width: size, height: size, gridTemplateColumns: `repeat(${GRID}, 1fr)` }}>
          {tiles.map((r, i) => <button key={i} onClick={() => onTap(i)} aria-label={`Parça ${i + 1}${i === CENTER ? ' (sabit)' : ''}`} className={`relative overflow-hidden rounded-sm transition-transform duration-200 ${i === CENTER ? 'ring-2 ring-black/30' : 'active:scale-95'}`}
            style={{ backgroundImage: `url(${url})`, backgroundSize: `${GRID * 100}% ${GRID * 100}%`, backgroundPosition: `${((i % GRID) / (GRID - 1)) * 100}% ${(Math.floor(i / GRID) / (GRID - 1)) * 100}%`, transform: `rotate(${r * 90}deg)` }} />)}
        </div>
        <p className="mt-2 text-center text-xs text-[#857b70]">Parçaya dokun: 90° döner. Ortadaki parça sabit; kemer yukarıda, ışık üstten gelir.</p>
      </div>
    </div>
  );
}

/* ---------- arayüz teması ve kontroller (ortak HUD) ---------- */
const THEME = { accent: '#a8782c' };
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Dikey sürükle ya da <b>WASD</b>: bakılan yöne yürü (yolun çevresinde serbest)</> },
  { icon: <MousePointer2 size={16} />, text: <>Yatay sürükle ya da <b>fareyle sürükle</b>: bak</> },
  { icon: <Puzzle size={16} />, text: <><b>E</b> / Onar: panoyu aç · parçaya dokun: 90° döner; motifi tamamla</> },
  { icon: <ChevronRight size={16} />, text: <>Sağdaki oklar ya da çift dokunuş: sonraki / önceki durak</> },
];

/* ---------- 3B dünya (modeller: IshakModels.tsx) ---------- */
function World({ tier, done }: { tier: Tier; done: string[] }) {
  const m = useMats(), g = useRef<THREE.Group>(null), { scene } = useThree();
  useEffect(() => { scene.environmentIntensity = 0.3; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[550, 500, 670]} turbidity={3} rayleigh={2} mieCoefficient={0.006} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#d6e0e6', 420, 5600]} />
      <hemisphereLight args={['#d3e2ee', '#7d6c4c', 0.35]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={7} color="#ffe6c6" />
      {tier !== 'low' && <Clouds />}
      <Terrain tier={tier} />
      <Mountain />
      <Palace m={m} />
      <OldFortress m={m} />
      <Boulders m={m} n={tier === 'low' ? 40 : 120} />
      {tier !== 'low' && <Grass n={tier === 'high' ? 7000 : 3500} />}
      {STOPS.map((s) => <Panel key={s.id} stop={s} done={done.includes(s.id)} m={m} />)}
      <Controller />
    </group>
  );
}

/* ---------- hareket + kamera ---------- */
const _m = new THREE.Matrix4(), _l = new THREE.Vector3(), _q = new THREE.Quaternion();
function Controller() {
  const { camera } = useThree(), cs = useRef<CamState>({ step: 0, bob: 0, head: NaN }), last = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useDb.getState();
    if (!S.started) { camera.position.set(110, 26, 70); camera.quaternion.copy(_q.setFromRotationMatrix(_m.lookAt(camera.position, _l.set(0, 6, -6), THREE.Object3D.DEFAULT_UP))); return; }
    if (nav.to !== null) { const d = nav.to - live.s, st = Math.sign(d) * Math.min(Math.abs(d), nav.speed * dt); live.s += st; live.v = 0; if (st) audio.step(800); if (Math.abs(nav.to - live.s) < 0.01) nav.to = null; }
    if (nav.turn) { const k = Math.sign(nav.turn) * Math.min(Math.abs(nav.turn), dt * 4); live.yaw += k; nav.turn -= k; }
    if (stepWalk(camera, live, cs.current, { ROUTE_LEN, routeAt }, dt, !S.card && !S.puzzle && !S.listOpen && nav.to === null && !pause.on, 3.2, 1.65, 1.2)) audio.step(800);
    const n = nav.to === null ? nearStop(live.s) : null, id = n?.id ?? '';   // yolculuk sırasında aradaki duraklar bulmaca açmaz
    const focus = S.puzzle ?? S.card;   // bulmaca/kart açıkken kamera panoya döner: tamamlanan motif görünür
    if (focus) { const [px, py, pz] = focus.panel.at, dx = px - camera.position.x, dz = pz - camera.position.z, want = wrapA(Math.atan2(-dx, -dz) - cs.current.head);
      live.yaw += wrapA(want - live.yaw) * (1 - Math.exp(-dt * 3)); live.pitch += (THREE.MathUtils.clamp(Math.atan2(py - camera.position.y + (S.puzzle ? -1.2 : 0), Math.hypot(dx, dz)), -0.5, 0.5) - live.pitch) * (1 - Math.exp(-dt * 3)); }
    if (id !== last.current) { last.current = id;
      if (n && !S.done.includes(n.id)) S.set({ near: n, tiles: scramble(STOPS.indexOf(n) + 1), card: null });   // bulmaca kendiliğinden açılmaz: "Onar" (E)
      else S.set({ near: n, ...(n ? {} : { card: null, puzzle: null }) }); }
  });
  return null;
}
