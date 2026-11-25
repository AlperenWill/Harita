/**
 * Galata Kulesi — "Zamanın Nefesi". Ana oyun bileşeni: bölüm akışı, girdiler ve arayüz.
 *
 * Bütün bölümler BİRİNCİ ŞAHIS, bakış SERBEST (360°; yukarı-aşağı yalnızca boyun sınırı). Kule aşağıdan yukarıya:
 *   Zindan (Ceneviz)  → odada dolaş; fener baktığın yere düşer, gizli armaları bakışınla bul, kapıya yürü
 *   Merdiven          → sarmal merdiveni kendin yürüyerek çık; çıkmak nefes harcar, pencere önünde dinlen;
 *                       pencerelerden bakınca kulenin tarihinden anlar (deprem, yangınlar, fırtına)
 *   Sergi (Osmanlı)   → salonda dolaş, vitrine yaklaşıp bak, "İncele"; hepsi bitince terasa çıkan kapı açılır
 *   Teras (bugün)     → balkonda kulenin çevresinde yürü, dört tarihi noktayı bul; dürbünle (yakınlaştır) bak
 * Masaüstü: WASD/oklar yürü, tıkla → fareyle bak (Esc imleci bırakır), E incele, Z dürbün.
 * Dokunmatik: sol joystick yürü, ekranın geri kalanında sürükle → bak. Kaybetme ve süre baskısı yok.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { Binoculars, Eye, Flashlight, Footprints, MousePointer2, Play, Search, Wind } from 'lucide-react';
import { ActionDock, Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Objective, RoundAction, StartSheet, TopRow } from '../shared/hud/Hud';
import { useSettings } from '../shared/hud/settings';
import { LOOK_PITCH, LOOK_YAW, LookCrosshair, useMouseLook } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { CHAPTERS, CHAPTER_LABEL, useGalata, type Chapter } from './store';
import { galataAudio, type Floor } from './AudioManager';
import { supportsWebGL, useDevice } from './device';
import { CRESTS } from './dungeon';
import { EXHIBITS } from './exhibits';
import { VIEWPOINTS, bearingOf } from './panorama';
import { WINDOWS } from './StaircaseMechanic';
import { clampPitch } from './firstPerson';
import { Player, fp, move, type PlayerEvent } from './Player';
import DungeonScene from './DungeonScene';
import StaircaseScene from './StaircaseScene';
import ExhibitScene from './ExhibitScene';
import TerracePanorama, { City, SUN_DIR } from './TerracePanorama';
import { TowerExterior } from './TowerExterior';
import Fallback from './Fallback';

const FLOOR: Record<Chapter, Floor> = { giris: 'giris', zindan: 'zindan', merdiven: 'merdiven', sergi: 'sergi', teras: 'teras', son: 'teras' };
const isTouch = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const SRC = { title: 'Wikipedia — Galata Tower', url: 'https://en.wikipedia.org/wiki/Galata_Tower' };
const INTRO_TEXT = 'Galata Kulesi 1348’de Cenevizliler tarafından yapıldı. Yüzyıllar boyunca gözetleme kulesi, zindan ve yangın kulesi oldu. Şimdi kulenin içinde, kendi gözlerinle aşağıdan yukarıya tırmanacaksın.';
const STAIR_TEXT = 'Dar sarmal merdiveni yürüyerek çık. Yükseldikçe nefesin azalır; durunca, en çok da bir pencerenin önünde dinlenince yeniden dolar. Bir pencereye bakıp E’ye basarak dışarı bak.';
const TERRACE_TEXT = 'Terasa ulaştın. Gün batıyor. Balkonda kulenin çevresinde yürü ve dört tarihi noktayı bul; birine bakınca E ile tanı. Dürbünle daha kolay seçersin.';
const DIRS = ['kuzey', 'kuzeydoğu', 'doğu', 'güneydoğu', 'güney', 'güneybatı', 'batı', 'kuzeybatı'];
const dirName = (b: number) => DIRS[Math.round(b / 45) % 8];

export default function GalataTowerGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}

function Game({ onExit }: { onExit: () => void }) {
  const device = useDevice();
  const g = useGalata();
  const [fade, setFade] = useState(false), [paused, setPaused] = useState(false);
  const [card, setCard] = useState<{ title: string; era?: string; text: string; source?: { title: string; url: string } } | null>(null);
  const [windows, setWindows] = useState<string[]>([]), [near, setNear] = useState<string | null>(null), [breath, setBreath] = useState(1), [zoom, setZoom] = useState(false);

  // ---------- ses ----------
  const G = useSettings(); useEffect(() => { galataAudio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => { galataAudio.setFloor(FLOOR[g.chapter]); }, [g.chapter]);
  useEffect(() => () => galataAudio.dispose(), []);

  const go = useCallback((c: Chapter) => {
    setFade(true); setCard(null); galataAudio.hush(); if (document.pointerLockElement) document.exitPointerLock?.();
    setTimeout(() => { useGalata.getState().setChapter(c); setTimeout(() => setFade(false), 120); }, 550);
  }, []);
  const narrate = useCallback((title: string, text: string, extra?: { era?: string; source?: { title: string; url: string } }) => {
    setCard({ title, text, ...extra }); galataAudio.speak(text);
  }, []);
  const closeCard = useCallback(() => { setCard(null); galataAudio.hush(); }, []);
  // keşif kartları okunduktan sonra kendiliğinden kapanır (telefonda joystick'i uzun süre kapatmasın)
  useEffect(() => { if (!card) return; const t = setTimeout(() => setCard(null), Math.max(9000, card.text.length * 75)); return () => clearTimeout(t); }, [card]);

  // ---------- bölüm girişleri ----------
  useEffect(() => {
    setNear(null); setZoom(false); fp.zoom = false;
    if (g.chapter === 'zindan') galataAudio.speak('Karanlıkta yalnızca fenerin var; baktığın yere düşer. Duvarları tara; fener bir armayı aydınlatınca E ile incele.');
    if (g.chapter === 'merdiven') { setWindows([]); setBreath(1); galataAudio.speak(STAIR_TEXT); }
    if (g.chapter === 'sergi') galataAudio.speak('Salonda dolaş. Bir vitrine yaklaşıp ona bakınca İncele belirir.');
    if (g.chapter === 'teras') { setCard(null); galataAudio.speak(TERRACE_TEXT); }
  }, [g.chapter]);

  // ---------- oyuncu olayları ----------
  /** Oyuncu E'ye / düğmeye basınca: bakılan hedefin kartı (bölüme göre arma, pencere, vitrin, manzara). Hiçbiri kendiliğinden açılmaz. */
  const inspect = useCallback((id: string | null) => {
    if (!id) return; const c = useGalata.getState().chapter;
    if (c === 'zindan') { onFindRef.current(id); setNear(null); return; }
    if (c === 'merdiven') { const w = WINDOWS.find((x) => x.id === id); if (!w) return; setWindows((ws) => ws.includes(w.id) ? ws : [...ws, w.id]); setNear(null); galataAudio.chime(); narrate(w.title, w.text, { era: w.era, source: w.source }); return; }
    if (c === 'teras') { const i = VIEWPOINTS.findIndex((x) => x.id === id); if (i < 0) return; const v = VIEWPOINTS[i]; useGalata.getState().setViewpoint(i, v.id); setNear(null); galataAudio.chime(); narrate(v.name, v.text, { era: v.era, source: v.source }); return; }
    const e = EXHIBITS.find((x) => x.id === id); if (!e) return;
    useGalata.getState().seeExhibit(e.id); galataAudio.chime(); narrate(e.name, e.text, { era: e.era, source: e.source });
  }, [narrate]);
  const onEvent = useCallback((e: PlayerEvent) => {
    if (e.type === 'dungeon-door') go('merdiven');
    if (e.type === 'stairs-top') { galataAudio.chime(); go('sergi'); }
    if (e.type === 'exhibit-exit') go('teras');
    if (e.type === 'breath') setBreath(e.value);
    if (e.type === 'near') setNear(e.id);
    if (e.type === 'window') { const w = WINDOWS.find((x) => x.id === e.id)!; setWindows((ws) => ws.includes(w.id) ? ws : [...ws, w.id]); galataAudio.chime(); narrate(w.title, w.text, { era: w.era, source: w.source }); }
    if (e.type === 'viewpoint') { const v = VIEWPOINTS[e.index]; useGalata.getState().setViewpoint(e.index, v.id); galataAudio.chime(); narrate(v.name, v.text, { era: v.era, source: v.source }); }
  }, [go, narrate]);
  const onFind = useCallback((id: string) => {
    const c = CRESTS.find((x) => x.id === id)!;
    useGalata.getState().findCrest(id); galataAudio.chime();
    narrate(c.name, c.text, { era: 'Ceneviz · 14. yüzyıl', source: SRC });
  }, [narrate]);
  const onFindRef = useRef(onFind); onFindRef.current = onFind;

  // ---------- girdiler ----------
  const active = g.chapter !== 'giris' && !paused && !fade;
  fp.frozen = !active;
  const look = useMouseLook((dx, dy) => { const k = fp.zoom ? 0.35 : 1; fp.yaw -= dx * LOOK_YAW * k; fp.pitch = clampPitch(fp.pitch - dy * LOOK_PITCH * k); }, () => active);
  const toggleZoom = useCallback(() => { fp.zoom = !fp.zoom; setZoom(fp.zoom); }, []);
  const stick = useRef({ x: 0, y: 0 }), keys = useRef(new Set<string>());
  const nearRef = useRef(near); nearRef.current = near; const cardRef = useRef(card); cardRef.current = card;
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); if (e.repeat) return;
      const c = useGalata.getState().chapter;
      if (e.code === 'KeyE') { if (cardRef.current) closeCard(); else if (c !== 'giris' && c !== 'son') inspect(nearRef.current); }
      if (e.code === 'KeyZ' && (c === 'teras' || c === 'son')) toggleZoom();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0;
    const loop = () => {
      const k = keys.current, kf = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0), ks = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      move.fwd = THREE.MathUtils.clamp(kf - stick.current.y, -1, 1); move.strafe = THREE.MathUtils.clamp(ks + stick.current.x, -1, 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); };
  }, [closeCard, inspect, toggleZoom]);
  // dokunmatik bakış: joystick dışındaki her sürükleme
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => { galataAudio.unlock(); look.lock(e); if (e.pointerType !== 'mouse' && active) drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || d.id !== e.pointerId) return;
    const k = useSettings.getState().sensitivity * (fp.zoom ? 0.35 : 1);
    fp.yaw += (e.clientX - d.x) * 0.006 * k; fp.pitch = clampPitch(fp.pitch + (e.clientY - d.y) * 0.005 * k); d.x = e.clientX; d.y = e.clientY;
  };
  const onPointerUp = (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) drag.current = null; };

  // test/inceleme: ?debug
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __galata: unknown }).__galata = { setChapter: go, fp, look: (yaw: number, pitch = 0) => { fp.yaw = yaw; fp.pitch = pitch; }, tp: (x: number, z: number, theta?: number) => { fp.x = x; fp.z = z; if (theta !== undefined) fp.theta = theta; }, state: () => ({ ...useGalata.getState(), windows, near, breath }) }; }, [go, windows, near, breath]);

  const start = (c: Chapter) => { galataAudio.unlock(); go(c); };
  const allCrests = g.crests.length >= CRESTS.length, allExhibits = g.exhibits.length >= EXHIBITS.length, allViews = g.viewed.length >= VIEWPOINTS.length;
  const nextView = VIEWPOINTS.find((v) => !g.viewed.includes(v.id));
  const objective = (() => {
    if (g.chapter === 'zindan') return { icon: <Flashlight size={15} />, label: allCrests ? 'Armalar tamam · ışıklı kapıya yürü' : 'Fenerle gizli armaları bul · kapı hep açık', done: g.crests.length, total: CRESTS.length };
    if (g.chapter === 'merdiven') return { icon: <Footprints size={15} />, label: 'Kulenin tepesine çık · pencerelerden bak', done: windows.length, total: WINDOWS.length };
    if (g.chapter === 'sergi') return { icon: <Search size={15} />, label: allExhibits ? 'Vitrinler tamam · ışıklı kapıdan terasa çık' : 'Vitrinleri incele · teras kapısı hep açık', done: g.exhibits.length, total: EXHIBITS.length };
    if (g.chapter === 'teras') return { icon: <Binoculars size={15} />, label: nextView ? `Bul: ${nextView.name} (${dirName(bearingOf(nextView.coord))})` : 'Bütün noktalar bulundu', done: g.viewed.length, total: VIEWPOINTS.length };
    return null;
  })();
  const hint = isTouch ? 'Sol joystick: yürü · ekranı sürükle: bak' : 'WASD: yürü · fareyle sürükle: bak';

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-black" style={{ touchAction: 'none' }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <HudTheme theme={THEME}>
      <Canvas shadows={device.shadows} dpr={device.dpr} gl={{ antialias: device.antialias, powerPreference: 'high-performance' }}
        camera={{ fov: 50, near: 0.1, far: 40000, position: [60, 30, 60] }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}>
        <Suspense fallback={null}>
          {g.chapter === 'giris' && <Intro blocks={Math.round(device.cityBlocks / 2)} />}
          {g.chapter === 'zindan' && <DungeonScene found={g.crests} open onAim={setNear} />}
          {g.chapter === 'merdiven' && <StaircaseScene />}
          {g.chapter === 'sergi' && <ExhibitScene seen={g.exhibits} near={near} open />}
          {(g.chapter === 'teras' || g.chapter === 'son') && <TerracePanorama shadows={device.shadows} blocks={device.cityBlocks} />}
          <Player chapter={g.chapter} done={{ crests: allCrests, windows, exhibits: g.exhibits, viewed: g.viewed, open: true }} onEvent={onEvent} />
        </Suspense>
      </Canvas>

      <TopRow onExit={onExit} objective={objective ? <Objective icon={objective.icon} label={objective.label} done={objective.done} total={objective.total} /> : undefined}
        right={<GameMenu onPause={setPaused} help={<Controls items={CONTROLS} />} onRestart={() => { g.restart(); go('zindan'); }} onExit={onExit}
          extra={(close) => <div className="grid grid-cols-2 gap-2" data-ui>{([['zindan', 'Zindan'], ['merdiven', 'Merdiven'], ['sergi', 'Sergi'], ['teras', 'Teras']] as [Chapter, string][]).map(([c, l]) => <button key={c} onClick={() => { close(); go(c); }} className={`h-11 rounded-xl text-sm font-semibold ring-1 ring-black/10 ${g.chapter === c ? 'bg-[#1f1b17] text-white' : 'bg-white text-[#1f1b17]'}`}>{l}</button>)}</div>} />} />
      {g.chapter !== 'giris' && <LookCrosshair locked={look.locked} />}

      {/* merdiven: nefes göstergesi */}
      {g.chapter === 'merdiven' && <div className="pointer-events-none absolute left-1/2 top-[68px] z-20 w-44 -translate-x-1/2 rounded-full bg-[#f7f5f1]/85 px-3 py-1.5 text-[11px] font-semibold text-[#1f1b17] shadow ring-1 ring-black/5 backdrop-blur-md sm:top-[72px]" style={{ marginTop: 56 }}>
        <div className="flex items-center gap-1.5"><Wind size={12} /> Nefes<div className="ml-1 h-1.5 flex-1 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${Math.round(breath * 100)}%`, background: breath < 0.3 ? '#c2453a' : THEME.accent }} /></div></div>
      </div>}
      {/* zindan: armanın üzerinde tutma ilerlemesi */}
      {near && !card && (g.chapter === 'zindan' || g.chapter === 'merdiven' || g.chapter === 'teras' || (g.chapter === 'sergi' && !g.exhibits.includes(near))) && (
        <InteractPrompt icon={<Eye size={18} />} label={g.chapter === 'zindan' ? 'Armayı incele' : g.chapter === 'merdiven' ? 'Pencereden bak' : g.chapter === 'teras' ? 'Bu yapıyı tanı' : `İncele: ${EXHIBITS.find((x) => x.id === near)?.name ?? ''}`} onClick={() => inspect(near)} />
      )}

      {g.chapter !== 'giris' && g.chapter !== 'son' && isTouch && <Joystick stick={stick} color="bg-[#b5582f]" />}
      {(g.chapter === 'teras' || g.chapter === 'son') && <ActionDock>
        {g.chapter === 'teras' && allViews && <RoundAction label="Turu bitir" primary size={68} onClick={() => { g.complete(); setCard(null); go('son'); }}><Play size={26} /></RoundAction>}
        {(g.chapter === 'teras' || g.chapter === 'son') && <RoundAction label={zoom ? 'Dürbünü indir (Z)' : 'Dürbün (Z)'} primary={!allViews && g.chapter === 'teras'} size={58} onClick={toggleZoom}><Binoculars size={24} /></RoundAction>}
      </ActionDock>}
      {g.chapter !== 'giris' && g.chapter !== 'son' && !card && <Hint>{hint}{g.chapter === 'teras' ? ' · E: tanı · Z: dürbün' : ' · E: incele'}</Hint>}

      {g.chapter === 'giris' && <IntroCard reached={g.reached} completed={!!g.completedAt} onStart={start} />}
      {g.chapter === 'son' && <EndCard crests={g.crests.length} exhibits={g.exhibits.length} views={g.viewed.length} onReplay={() => { g.restart(); go('zindan'); }} onExit={onExit} />}
      {card && g.chapter !== 'giris' && g.chapter !== 'son' && <StoryCard {...card} onClose={closeCard} />}
      <div className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
      </HudTheme>
    </div>
  );
}

/* ================= Giriş sahnesi: kule dışarıdan, otomatik sinematik dönüş ================= */
function Intro({ blocks }: { blocks: number }) {
  const { camera, scene } = useThree();
  useEffect(() => { scene.fog = new THREE.Fog('#e7b48e', 400, 5000); (camera as THREE.PerspectiveCamera).fov = 45; (camera as THREE.PerspectiveCamera).updateProjectionMatrix(); return () => { scene.fog = null; }; }, [camera, scene]);
  useFrame(({ clock }) => {
    const a = clock.elapsedTime * 0.06 + 2.2;
    camera.position.set(Math.cos(a) * 85, 22 + Math.sin(clock.elapsedTime * 0.1) * 4, Math.sin(a) * 85);
    camera.lookAt(0, 34, 0);
  });
  return (
    <group>
      <Sky sunPosition={SUN_DIR.clone().multiplyScalar(1000).setY(60).toArray()} turbidity={6} rayleigh={2} />
      <hemisphereLight args={['#ffe2c4', '#55503f', 0.9]} />
      <directionalLight position={SUN_DIR.clone().multiplyScalar(100).setY(40).toArray()} intensity={2.2} color="#ffc28a" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[6000, 48]} /><meshStandardMaterial color="#b9a58a" roughness={1} /></mesh>
      <City count={blocks} />
      <TowerExterior />
    </group>
  );
}

/* ================= Arayüz parçaları ================= */
function IntroCard({ reached, completed, onStart }: { reached: Chapter; completed: boolean; onStart: (c: Chapter) => void }) {
  const resume = CHAPTERS.indexOf(reached) > 1 && CHAPTERS.indexOf(reached) < 5 ? reached : null;
  return <StartSheet kicker="İstanbul · Beyoğlu · 1348" title="Galata Kulesi: Zamanın Nefesi" intro={INTRO_TEXT} controls={CONTROLS}
    cta={completed ? 'Yeniden başla' : 'Başla'} ctaIcon={<Play size={18} />} onStart={() => onStart('zindan')}
    secondary={resume ? <button onClick={() => onStart(resume)} className="h-12 flex-1 rounded-2xl px-3 text-sm font-semibold ring-1 ring-black/10">Devam: {CHAPTER_LABEL[resume]}</button> : undefined} />;
}
function StoryCard({ title, era, text, source, onClose }: { title: string; era?: string; text: string; source?: { title: string; url: string }; onClose?: () => void }) {
  return <InfoSheet kicker={era ?? 'Galata Kulesi'} title={title} text={text} source={source} onClose={onClose} />;
}
function EndCard({ crests, exhibits, views, onReplay, onExit }: { crests: number; exhibits: number; views: number; onReplay: () => void; onExit: () => void }) {
  const text = useMemo(() => 'Ceneviz gözetleme kulesi, Osmanlı zindanı ve yangın kulesi, bugün bir müze. Galata Kulesi’nin altı yüzyıllık hafızasını aşağıdan yukarıya yaşadın.', []);
  useEffect(() => { galataAudio.speak(text); }, [text]);
  return <EndSheet kicker="Gün batımı · 51 metre" title="Kulenin hafızası" text={<>{text}<span className="mt-3 grid grid-cols-3 gap-2 text-sm">{[[crests, 'arma'], [exhibits, 'vitrin'], [views, 'manzara']].map(([n, l]) => <span key={l} className="rounded-xl bg-black/[0.04] p-2"><b className="block text-lg">{n}</b>{l}</span>)}</span></>} stayLabel="Yeniden oyna" onStay={onReplay} onExit={onExit} />;
}

const THEME = { accent: '#b5582f' };
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <><b>WASD</b> ya da oklar: yürü · telefonda sol joystick</> },
  { icon: <MousePointer2 size={16} />, text: <>Fareyle basılı tutup sürükle: 360° bak · telefonda ekranı sürükle</> },
  { icon: <Flashlight size={16} />, text: <>Zindan: fener baktığın yere düşer; armaya kısa süre tut</> },
  { icon: <Wind size={16} />, text: <>Merdiven: yürüyerek çık; nefes azalınca dur, pencere önünde dinlen</> },
  { icon: <Eye size={16} />, text: <>Sergi: vitrine yaklaşıp bak, <b>E</b> ile incele</> },
  { icon: <Binoculars size={16} />, text: <>Teras: noktayı bul, <b>Z</b> ile dürbün</> },
];
