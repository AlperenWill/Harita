/**
 * Karabük — Safranbolu: "Dönme Dolap" (detaylı). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu çarşı meydanından Cinci Hanı'nın avlusuna girer, kıvrılan yokuş sokaktan Kaymakamlar Evi'ne çıkar; taşlıktan merdivenle üst
 * kattaki sofaya, oradan harem ve selamlık odalarına geçer. Haremdeki dönme dolapta selamlıktaki misafirlerin istediği ikramı raflara
 * koyup dolabı çevirir (3 tur). 7 ayrıntı + dolap. Yürüme iki katlıdır (live.up).
 */
import { SceneFog } from '../shared/SceneFog';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, MousePointer2, Search, RotateCw, Coffee } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { CARD_DOLAP, DOLAP_AT, HOUSE_Y, ITEMS, KH, ROUNDS, SHELVES, SPOTS, START, atDolap, groundY, nearestSpot, slide, trayOk, type ItemId, type Spot } from './site';
import { Dolap, Ground, Han, Houses, Konak, Mountains, People, useMats } from './SafranboluModels';

const THEME = { accent: '#7a4a2a' };
const EYE = 1.62, WALK = 1.5, RUN = 3.4, FOV = 66;
const audio = new WalkAudio({ freq: 560, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(0.45, 0.68, 0.58).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; atDolap: boolean; dolap: boolean; round: number; shelves: (ItemId | null)[]; angle: number; busy: boolean; dolapDone: boolean; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const EMPTY = Array(SHELVES).fill(null) as (ItemId | null)[];
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, atDolap: false, dolap: false, round: 0, shelves: EMPTY, angle: 0, busy: false, dolapDone: false, endShown: false, toast: null as string | null };
const useSf = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], up: false, view: { yaw: START.yaw, pitch: 0.06 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3600) => { clearTimeout(toastT); useSf.getState().set({ toast: t }); toastT = setTimeout(() => useSf.getState().set({ toast: null }), ms); };
function openDolap() { live.x = DOLAP_AT[0] - 1.1; live.z = DOLAP_AT[1]; live.view.yaw = -Math.PI / 2; live.view.pitch = -0.36; useSf.getState().set({ dolap: true }); }
function closeDolap() { useSf.getState().set({ dolap: false }); }
function putItem(id: ItemId) { const s = useSf.getState(); if (s.busy) return; const k = s.shelves.indexOf(null); if (k < 0) { say('Raflar dolu: bir rafa dokunup boşalt.', 2200); return; } const sh = [...s.shelves]; sh[k] = id; s.set({ shelves: sh }); audio.step(700); }
function clearShelf(k: number) { const s = useSf.getState(); if (s.busy) return; const sh = [...s.shelves]; sh[k] = null; s.set({ shelves: sh }); }
function turnDolap() { const s = useSf.getState(); if (s.busy) return; if (!s.shelves.some(Boolean)) { say('Önce raflara ikram koy.', 2000); return; }
  const ok = trayOk(s.shelves, ROUNDS[s.round].want); s.set({ busy: true, angle: s.angle + Math.PI }); audio.step(300);
  setTimeout(() => { const st = useSf.getState();
    if (ok) { const next = st.round + 1; audio.tone(true);
      if (next >= ROUNDS.length) { st.set({ busy: false, shelves: EMPTY, round: next, dolap: false, dolapDone: true, card: CARD_DOLAP, angle: st.angle + Math.PI }); audio.speak(`${CARD_DOLAP.name}. ${CARD_DOLAP.text}`); }
      else { st.set({ busy: false, shelves: EMPTY, round: next, angle: st.angle + Math.PI }); say('Selamlıktan teşekkür geldi. Yeni istek var.', 2600); } }
    else { audio.tone(false); st.set({ busy: false, angle: st.angle + Math.PI }); say('Misafirler şaşırdı: istenen bu değildi. Dolap geri döndü.', 3000); } }, 1900); }

export default function SafranboluGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useSf(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], up: false, speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.06; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useSf.setState(INITIAL); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useSf.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { useSf.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useSf.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useSf.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.dolap) closeDolap(); else if (s.atDolap && !s.dolapDone) openDolap(); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape') { if (s.card) close(); else if (s.dolap) closeDolap(); }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __safranbolu: unknown }).__safranbolu = {
      go: (x: number, z: number, up = false) => { live.x = x; live.z = z; live.up = up; useSf.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; }, land: () => { live.fly = null; },
      dolap: () => { live.up = true; useSf.getState().set({ started: true, card: null }); openDolap(); },
      put: (id: ItemId) => putItem(id), turn: () => turnDolap(),
      solve: () => { const s = useSf.getState(); const w = ROUNDS[s.round]?.want ?? []; s.set({ shelves: [...w, ...Array(SHELVES - w.length).fill(null)] }); },
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useSf.getState(); return a.started && !a.card && !a.dolap && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + 1, found = S.seen.length + (S.dolapDone ? 1 : 0), done = found >= total;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#e9e5da] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.05, far: 6000, position: [START.at[0], EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} angle={S.angle} shelves={S.shelves} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#dfe7ee" sun="#fff0d6" ground="#7d7a58" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<RotateCw size={15} />} label={done ? 'Hepsini buldun' : S.dolap ? `İkram ${Math.min(S.round + 1, ROUNDS.length)}/${ROUNDS.length}` : `Ayrıntılar ${S.seen.length}/${SPOTS.length}${S.dolapDone ? '' : ' · dönme dolap'}`} done={found} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && <Toast text={S.toast} tone={S.toast?.startsWith('Misafirler şaşırdı') || S.toast?.startsWith('Raflar') || S.toast?.startsWith('Önce') ? 'bad' : 'ok'} />}
        {S.started && S.dolap && !S.card && <DolapPanel round={S.round} shelves={S.shelves} busy={S.busy} />}
        {S.started && (<>
          {!S.dolap && <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#7a4a2a]" />}
          {!S.dolap && <LookCrosshair locked={fpl.locked} />}
          {!S.card && !S.dolap && S.atDolap && !S.dolapDone && <InteractPrompt icon={<Coffee size={18} />} label="Dönme dolaba ikram hazırla" onClick={openDolap} />}
          {!S.card && !S.dolap && !(S.atDolap && !S.dolapDone) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && !S.dolap && <Hint>Cinci Hanı meydanın kuzeyinde · yokuş sokağın ucunda Kaymakamlar Evi · merdivenle üst kata, haremdeki dönme dolaba</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Karabük · Safranbolu" title="Dönme Dolap"
          intro={<>Çarşıdan <b>Cinci Hanı</b>'nın avlusuna gir, çıkmalı evlerin arasındaki yokuştan <b>Kaymakamlar Evi</b>'ne çık. Üst katta haremden <b>dönme dolapla</b> selamlıktaki misafirlere istedikleri ikramı gönder.</>}
          controls={CONTROLS} note="Evlerin, hanın ve konağın ölçüleri ve oda düzeni temsilîdir." cta="Çarşıya çık" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && !S.dolap && <EndSheet kicker="Safranbolu" title="Kervan yolundaki ev"
          text="Kervan ticaretiyle zenginleşen kentin evleri, sofanın çevresine dizilen odaları ve harem ile selamlığı ayıran düzeniyle bugün de gezilebiliyor."
          stayLabel="Çarşıda kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele</> },
  { icon: <RotateCw size={16} />, text: <>Dolap: ikramı raflara koy, <b>Dolabı çevir</b></> },
];
function DolapPanel({ round, shelves, busy }: { round: number; shelves: (ItemId | null)[]; busy: boolean }) {
  const rd = ROUNDS[Math.min(round, ROUNDS.length - 1)], name = (id: ItemId) => ITEMS.find((i) => i.id === id)!;
  return <div className="pointer-events-auto absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] mx-auto max-w-md rounded-3xl bg-[#f7f5f1]/95 p-3 text-[#1f1b17] shadow-lg ring-1 ring-black/5" onPointerDown={(e) => e.stopPropagation()}>
    <div className="mb-1 text-xs font-bold text-[#7a4a2a]">Selamlıktan istek · {round + 1}/{ROUNDS.length}</div>
    <p className="mb-2 text-sm">{rd.text}</p>
    <div className="mb-2 flex gap-2">{shelves.map((s, k) => <button key={k} disabled={busy} onClick={() => clearShelf(k)} className="flex h-12 flex-1 flex-col items-center justify-center rounded-xl bg-black/5 text-[11px] font-semibold disabled:opacity-50">
      <span className="text-[10px] text-[#857b70]">Raf {k + 1}</span>{s ? <span>{name(s).icon} {name(s).name}</span> : <span className="text-[#b5aca2]">boş</span>}</button>)}</div>
    <div className="mb-2 grid grid-cols-4 gap-1.5">{ITEMS.map((it) => <button key={it.id} disabled={busy} onClick={() => putItem(it.id)} className="rounded-xl bg-white px-1 py-2 text-[11px] font-semibold ring-1 ring-black/10 disabled:opacity-50"><div className="text-base">{it.icon}</div>{it.name}</button>)}</div>
    <div className="flex gap-2"><button disabled={busy} onClick={turnDolap} className="flex-1 rounded-xl bg-[#7a4a2a] py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Dolap dönüyor…' : 'Dolabı çevir'}</button>
      <button onClick={closeDolap} className="rounded-xl bg-black/5 px-3 py-2 text-xs font-bold">Çık</button></div>
  </div>;
}

/* ---------- 3B dünya ---------- */
function World({ tier, angle, shelves }: { tier: Tier; angle: number; shelves: (ItemId | null)[] }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low';
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.4; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3.5} rayleigh={1.3} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <SceneFog args={['#e2e5e0', 700, 4000]} />
      <hemisphereLight args={['#e7eef2', '#6f6a50', 0.55]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.2} color="#fff0d6" />
      {!low && <Clouds />}
      <Mountains />
      <Ground m={m} />
      <Houses m={m} />
      <Han m={m} />
      <Konak m={m} />
      <Dolap m={m} angle={angle} shelves={shelves} />
      <People />
      {/* konağın içi: pencerelerden gelen ışığı taklit eden yumuşak lambalar */}
      <pointLight position={[0, HOUSE_Y + 2.4, 88]} intensity={14} distance={12} decay={1.5} color="#ffe9cf" />
      <pointLight position={[-3.5, KH.up + 2.4, 90]} intensity={12} distance={9} decay={1.5} color="#fff1dc" />
      <pointLight position={[2.4, KH.up + 2.4, 90]} intensity={12} distance={9} decay={1.5} color="#fff1dc" />
      <pointLight position={[-1, KH.up + 2.4, 82.6]} intensity={10} distance={10} decay={1.5} color="#fff1dc" />
      <Markers />
    </group>
  );
}
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.9, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useSf.getState(); SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id); m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.05; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useSf.getState(), active = S.started && !S.card && !S.dolap && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const res = slide([live.x, live.z], dx, dz, live.up), [nx, nz] = res.at, moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.up = res.up; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.7) { live.step = 0; audio.step(live.up || live.z > KH.z0 ? 520 : 900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z, live.up) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const ad = S.started && atDolap(live.x, live.z, live.up); if (ad !== S.atDolap) S.set({ atDolap: ad });
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, groundY(live.x, live.z, live.up) + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}
