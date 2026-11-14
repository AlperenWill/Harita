/**
 * Galata Kulesi — "Zamanın Nefesi". Ana oyun bileşeni: bölüm akışı, girdiler ve arayüz.
 *
 * Kulenin hafızası dört bölümde, aşağıdan yukarıya yaşanır:
 *   Zindan (Ceneviz)  → fenerle gizli armaları bul           · kamera: birinci şahıs, kilitli; yalnızca ileri/geri
 *   Merdiven          → vuruşa göre yukarı kaydır, sahanlıkta nefes al · kamera: sarmal boyunca kilitli
 *   Sergi (Osmanlı)   → vitrinlere yaklaş, dinle               · kamera: kendiliğinden kilitlenen yakın yörünge
 *   Teras (bugün)     → 4 tarihi noktaya yatay kaydır          · kamera: panorama kaydırıcı, serbest dönüş yok
 * Kaybetme yok, süre baskısı yok. Serbest kamera hiçbir bölümde yok.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, Flashlight, Hand, RotateCw, Volume2, VolumeX } from 'lucide-react';
import { CHAPTERS, CHAPTER_LABEL, useGalata, type Chapter } from './store';
import { galataAudio, type Floor } from './AudioManager';
import { supportsWebGL, useDevice } from './device';
import { CRESTS, FIND_SECONDS } from './dungeon';
import { EXHIBITS, type Exhibit } from './exhibits';
import { VIEWPOINTS } from './panorama';
import * as Stair from './StaircaseMechanic';
import DungeonScene from './DungeonScene';
import StaircaseScene from './StaircaseScene';
import ExhibitScene from './ExhibitScene';
import TerracePanorama, { City, SUN_DIR } from './TerracePanorama';
import { TowerExterior } from './TowerExterior';
import Fallback from './Fallback';

const FLOOR: Record<Chapter, Floor> = { giris: 'giris', zindan: 'zindan', merdiven: 'merdiven', sergi: 'sergi', teras: 'teras', son: 'teras' };
const now = () => performance.now() / 1000;

const INTRO_TEXT = 'Galata Kulesi 1348’de Cenevizliler tarafından yapıldı. Yüzyıllar boyunca gözetleme kulesi, zindan ve yangın kulesi oldu. Şimdi kulenin hafızasına aşağıdan yukarıya tırmanacaksın.';
const STAIR_TEXT = 'Merdiven dar ve dönerek yükseliyor. Her vuruşta yukarı kaydır; sahanlıklarda dur ve nefes al.';
const TERRACE_TEXT = 'Terasa ulaştın. Gün batıyor. Yatay kaydırarak kuleden görülen dört tarihi noktaya bak.';

export default function GalataTowerGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}

function Game({ onExit }: { onExit: () => void }) {
  const device = useDevice();
  const g = useGalata();
  const [fade, setFade] = useState(false);
  const [card, setCard] = useState<{ title: string; era?: string; text: string; source?: { title: string; url: string } } | null>(null);

  // ---------- ses ----------
  useEffect(() => { galataAudio.setMuted(g.muted); }, [g.muted]);
  useEffect(() => { galataAudio.setFloor(FLOOR[g.chapter]); }, [g.chapter]);
  useEffect(() => () => galataAudio.dispose(), []);

  const go = useCallback((c: Chapter) => {
    setFade(true); setCard(null); galataAudio.hush();
    setTimeout(() => { useGalata.getState().setChapter(c); setTimeout(() => setFade(false), 120); }, 550);
  }, []);
  // test/inceleme: ?debug ile bölümler arası atlama (window.__galata.setChapter('teras'))
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __galata: unknown }).__galata = { setChapter: go }; }, [go]);
  const narrate = useCallback((title: string, text: string, extra?: { era?: string; source?: { title: string; url: string } }) => {
    setCard({ title, text, ...extra }); galataAudio.speak(text);
  }, []);

  // ---------- girdiler (paylaşılan referanslar; React durumu tetiklemez) ----------
  const aim = useRef({ x: 0, y: 0 });
  const move = useRef(0);
  const keys = useRef(new Set<string>());
  const climb = useRef(Stair.createClimb(now() + 1.6));
  const steps = useRef(0), judgeRef = useRef(0);
  const holds = useRef<Record<string, number>>({});
  const [, force] = useState(0);
  const [lastJudge, setLastJudge] = useState<{ j: Stair.Judgement; t: number } | null>(null);
  const [locked, setLocked] = useState<Exhibit | null>(null);

  // klavye: W/S/↑/↓ ileri-geri, boşluk/↑ basamak, ←/→ panorama
  const onStairEvents = useCallback((evs: Stair.ClimbEvent[]) => {
    for (const e of evs) {
      if (e.type === 'step') { galataAudio.footstep(e.judgement === 'tam'); judgeRef.current = e.judgement === 'tam' ? 1 : 0.6; setLastJudge({ j: e.judgement, t: now() }); }
      if (e.type === 'miss') setLastJudge({ j: e.judgement, t: now() });
      if (e.type === 'landing') { galataAudio.chime(); setCard({ title: `${e.flight}. sahanlık`, text: 'Pencereden gelen ışığın önünde dur. Basılı tut ve nefes al.' }); }
      if (e.type === 'breath-done') { setCard(null); galataAudio.breath(0.1); }
      if (e.type === 'top') { galataAudio.chime(); setTimeout(() => go('sergi'), 900); }
    }
    steps.current = climb.current.steps; force((n) => n + 1);
  }, [go]);
  const stairStep = useCallback(() => { const r = Stair.stepInput(climb.current, now()); climb.current = r.state; onStairEvents(r.events); }, [onStairEvents]);
  const breathDown = useCallback(() => { if (climb.current.phase === 'breath') { climb.current = Stair.holdStart(climb.current, now()); galataAudio.breath(Stair.BREATH_FULL); force((n) => n + 1); } }, []);
  const breathUp = useCallback(() => { const r = Stair.holdEnd(climb.current, now()); climb.current = r.state; onStairEvents(r.events); }, [onStairEvents]);
  const pan = useCallback((d: number) => {
    const i = (useGalata.getState().viewpoint + d + VIEWPOINTS.length) % VIEWPOINTS.length;
    useGalata.getState().setViewpoint(i, VIEWPOINTS[i].id);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const c = useGalata.getState().chapter;
      if (['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown'].includes(e.code)) keys.current.add(e.code);
      if (c === 'merdiven' && (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !e.repeat) { e.preventDefault(); climb.current.phase === 'breath' ? breathDown() : stairStep(); }
      if (c === 'teras' && !e.repeat) { if (e.code === 'ArrowLeft') pan(-1); if (e.code === 'ArrowRight') pan(1); }
    };
    const up = (e: KeyboardEvent) => { keys.current.delete(e.code); if (useGalata.getState().chapter === 'merdiven' && ['Space', 'ArrowUp', 'KeyW'].includes(e.code)) breathUp(); };
    addEventListener('keydown', down); addEventListener('keyup', up);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); };
  }, [stairStep, breathDown, breathUp, pan]);

  // ileri/geri: klavye + ekrandaki basılı tutulan düğmeler
  const btnMove = useRef(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const k = keys.current, kb = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
      move.current = THREE.MathUtils.clamp(kb + btnMove.current, -1, 1);
      // merdiven: vuruş tıkı ve nefes halkasının kendiliğinden tamamlanması
      if (useGalata.getState().chapter === 'merdiven') {
        const t = now(), r = Stair.tick(climb.current, t); if (r.events.length) { climb.current = r.state; onStairEvents(r.events); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [onStairEvents]);

  // bölüm girişleri
  useEffect(() => {
    if (g.chapter === 'merdiven') { climb.current = Stair.createClimb(now() + 1.6); steps.current = 0; setCard({ title: 'Merdiven', text: STAIR_TEXT }); galataAudio.speak(STAIR_TEXT); }
    if (g.chapter === 'zindan') { aim.current = { x: 0, y: 0 }; setCard({ title: 'Zindan', era: 'Ceneviz · 1348', text: 'Karanlıkta yalnızca fenerin var. Feneri ekranda sürükleyerek duvarları tara; gizli armaları bul.' }); }
    if (g.chapter === 'teras') { useGalata.getState().setViewpoint(0, VIEWPOINTS[0].id); setCard(null); galataAudio.speak(TERRACE_TEXT); }
    if (g.chapter === 'sergi') setLocked(null);
  }, [g.chapter]);

  // teras: her yeni noktada kart + anlatım
  useEffect(() => {
    if (g.chapter !== 'teras') return;
    const v = VIEWPOINTS[g.viewpoint];
    const t = setTimeout(() => narrate(v.name, v.text, { era: v.era, source: v.source }), 1400);
    return () => clearTimeout(t);
  }, [g.chapter, g.viewpoint, narrate]);

  // zindan: tutma ilerlemesini arayüze yansıt (10 Hz)
  const [holdMax, setHoldMax] = useState(0);
  useEffect(() => {
    if (g.chapter !== 'zindan') return;
    const id = setInterval(() => setHoldMax(Math.max(0, ...Object.values(holds.current)) / FIND_SECONDS), 100);
    return () => clearInterval(id);
  }, [g.chapter]);

  const onFind = useCallback((id: string) => {
    const c = CRESTS.find((x) => x.id === id)!;
    useGalata.getState().findCrest(id); galataAudio.chime();
    narrate(c.name, c.text, { era: 'Ceneviz · 14. yüzyıl', source: { title: 'Wikipedia — Galata Tower', url: 'https://en.wikipedia.org/wiki/Galata_Tower' } });
  }, [narrate]);
  const onLock = useCallback((e: Exhibit) => {
    setLocked((cur) => { if (cur) return cur; narrate(e.name, e.text, { era: e.era, source: e.source }); return e; });
  }, [narrate]);

  // ---------- dokunma hareketleri ----------
  const gesture = useRef<{ x: number; y: number; t: number; fired: boolean } | null>(null);
  const toNdc = (e: React.PointerEvent) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) }; };
  const onPointerDown = (e: React.PointerEvent) => {
    galataAudio.unlock();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gesture.current = { x: e.clientX, y: e.clientY, t: now(), fired: false };
    if (g.chapter === 'zindan') aim.current = toNdc(e);
    if (g.chapter === 'merdiven' && climb.current.phase === 'breath') breathDown();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (g.chapter === 'zindan' && (e.pointerType === 'mouse' || gesture.current)) aim.current = toNdc(e);
    const gs = gesture.current; if (!gs || gs.fired) return;
    const dx = e.clientX - gs.x, dy = e.clientY - gs.y;
    // yukarı kaydırma = bir basamak (vuruş anı, kaydırmanın eşiği geçtiği an)
    if (g.chapter === 'merdiven' && climb.current.phase === 'climb' && dy < -35 && Math.abs(dy) > Math.abs(dx)) { gs.fired = true; stairStep(); }
    if (g.chapter === 'teras' && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) { gs.fired = true; pan(dx < 0 ? 1 : -1); }
  };
  const onPointerUp = () => {
    if (g.chapter === 'merdiven' && climb.current.phase === 'breath') breathUp();
    gesture.current = null;
  };

  const start = (c: Chapter) => { galataAudio.unlock(); go(c); };
  const allCrests = g.crests.length >= CRESTS.length, allExhibits = g.exhibits.length >= EXHIBITS.length, allViews = g.viewed.length >= VIEWPOINTS.length;
  const chapterIdx = CHAPTERS.indexOf(g.chapter);

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-black text-white" style={{ touchAction: 'none' }}>
      <Canvas shadows={device.shadows} dpr={device.dpr} gl={{ antialias: device.antialias, powerPreference: 'high-performance' }}
        camera={{ fov: 50, near: 0.1, far: 40000, position: [60, 30, 60] }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}>
        <Suspense fallback={null}>
          {g.chapter === 'giris' && <Intro blocks={Math.round(device.cityBlocks / 2)} />}
          {g.chapter === 'zindan' && <DungeonScene input={{ aim, move }} found={g.crests} open={allCrests} onHold={(h) => { holds.current = h; }} onFind={onFind} />}
          {g.chapter === 'merdiven' && <StaircaseScene steps={steps} judge={judgeRef} />}
          {g.chapter === 'sergi' && <ExhibitScene move={move} seen={g.exhibits} locked={locked} onLock={onLock} />}
          {(g.chapter === 'teras' || g.chapter === 'son') && <TerracePanorama index={g.viewpoint} shadows={device.shadows} blocks={device.cityBlocks} />}
        </Suspense>
      </Canvas>

      {/* hareket katmanı: fener yönlendirme, yukarı/yatay kaydırma, basılı tutma */}
      {g.chapter !== 'giris' && g.chapter !== 'son' && (
        <div className="absolute inset-0" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
      )}

      {/* üst çubuk */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-3">
        <button onClick={onExit} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/55 backdrop-blur" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
        <button onClick={() => { galataAudio.unlock(); g.setMuted(!g.muted); }} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/55 backdrop-blur" aria-label={g.muted ? 'Sesi aç' : 'Sesi kapat'}>{g.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        {g.chapter !== 'giris' && (
          <div className="mx-auto flex flex-col items-center gap-1 rounded-2xl bg-black/55 px-4 py-2 backdrop-blur">
            <div className="flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={Math.min(4, chapterIdx)}>
              {CHAPTERS.slice(1, 5).map((c, i) => <span key={c} className={`h-1.5 w-9 rounded-full ${i + 1 < chapterIdx ? 'bg-amber-300' : i + 1 === chapterIdx ? 'bg-white' : 'bg-white/25'}`} />)}
            </div>
            <p className="text-xs text-white/85">{CHAPTER_LABEL[g.chapter]}</p>
          </div>
        )}
      </div>

      {g.chapter === 'giris' && <IntroCard reached={g.reached} completed={!!g.completedAt} onStart={start} />}
      {g.chapter === 'zindan' && <DungeonHud found={g.crests.length} hold={holdMax} done={allCrests} onNext={() => go('merdiven')} btnMove={btnMove} />}
      {g.chapter === 'merdiven' && <StairHud climb={climb} last={lastJudge} onStep={stairStep} />}
      {g.chapter === 'sergi' && <ExhibitHud seen={g.exhibits.length} locked={!!locked} done={allExhibits} btnMove={btnMove}
        onContinue={() => { if (locked) { useGalata.getState().seeExhibit(locked.id); setLocked(null); setCard(null); galataAudio.hush(); } }} onNext={() => go('teras')} />}
      {g.chapter === 'teras' && <TerraceHud index={g.viewpoint} viewed={g.viewed} onPick={(i) => g.setViewpoint(i, VIEWPOINTS[i].id)} onPan={pan} done={allViews}
        onFinish={() => { g.complete(); setCard(null); go('son'); }} />}
      {g.chapter === 'son' && <EndCard crests={g.crests.length} exhibits={g.exhibits.length} views={g.viewed.length} onReplay={() => { g.restart(); go('zindan'); }} onExit={onExit} />}

      {card && g.chapter !== 'giris' && g.chapter !== 'son' && <StoryCard {...card} onClose={g.chapter === 'sergi' ? undefined : () => setCard(null)} />}
      <div className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
      <PortraitHint />
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
const glass = 'rounded-2xl bg-black/60 backdrop-blur';

function IntroCard({ reached, completed, onStart }: { reached: Chapter; completed: boolean; onStart: (c: Chapter) => void }) {
  const resume = CHAPTERS.indexOf(reached) > 1 && CHAPTERS.indexOf(reached) < 5 ? reached : null;
  return (
    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-8">
      <div className={`${glass} mx-auto max-w-xl p-5`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">İstanbul · Beyoğlu · 1348</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Galata Kulesi: Zamanın Nefesi</h1>
        <p className="mt-2 text-sm text-white/80">{INTRO_TEXT}</p>
        <ul className="mt-3 grid grid-cols-2 gap-1.5 text-xs text-white/75 sm:grid-cols-4">
          <li>🔦 Zindan: armaları bul</li><li>🫁 Merdiven: ritimle çık</li><li>🏺 Sergi: dinle</li><li>🌇 Teras: manzara</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => onStart('zindan')} className="h-12 flex-1 rounded-xl bg-brand px-5 font-semibold">{completed ? 'Yeniden başla' : 'Başla'}</button>
          {resume && <button onClick={() => onStart(resume)} className="h-12 rounded-xl border border-white/30 px-4 text-sm font-semibold">Devam: {CHAPTER_LABEL[resume]}</button>}
        </div>
      </div>
    </div>
  );
}

function HoldButton({ dir, btnMove, label, children }: { dir: number; btnMove: React.MutableRefObject<number>; label: string; children: React.ReactNode }) {
  const set = (v: number) => (e: React.PointerEvent) => { e.stopPropagation(); btnMove.current = v; };
  return (
    <button aria-label={label} onPointerDown={set(dir)} onPointerUp={set(0)} onPointerLeave={set(0)} onPointerCancel={set(0)}
      className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-white/20 backdrop-blur active:bg-white/35">{children}</button>
  );
}

function DungeonHud({ found, hold, done, onNext, btnMove }: { found: number; hold: number; done: boolean; onNext: () => void; btnMove: React.MutableRefObject<number> }) {
  return (
    <>
      <div className={`${glass} pointer-events-none absolute left-1/2 top-20 flex -translate-x-1/2 items-center gap-2 px-4 py-2 text-sm`}>
        <Flashlight size={16} className="text-amber-300" /> Arma {found}/{CRESTS.length}
        {hold > 0 && <span className="ml-1 h-1.5 w-16 overflow-hidden rounded-full bg-white/20"><span className="block h-full bg-amber-300" style={{ width: `${hold * 100}%` }} /></span>}
      </div>
      <div className="pointer-events-none absolute bottom-5 left-5 flex flex-col gap-2">
        <HoldButton dir={1} btnMove={btnMove} label="İleri"><ChevronUp /></HoldButton>
        <HoldButton dir={-1} btnMove={btnMove} label="Geri"><ChevronDown /></HoldButton>
      </div>
      <p className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-xs text-white/60">Feneri yönlendirmek için ekranı sürükle · W/S ile ileri-geri</p>
      {done && <button onClick={onNext} className="absolute bottom-20 left-1/2 h-12 -translate-x-1/2 rounded-xl bg-brand px-6 font-semibold shadow-lg">Merdivene geç</button>}
    </>
  );
}

function StairHud({ climb, last, onStep }: { climb: React.MutableRefObject<Stair.ClimbState>; last: { j: Stair.Judgement; t: number } | null; onStep: () => void }) {
  const ring = useRef<HTMLDivElement>(null), fill = useRef<SVGCircleElement>(null);
  const lastBeat = useRef(-1);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const s = climb.current, t = now();
      if (s.phase === 'climb' && t >= s.origin) {
        const ph = Stair.beatPhase(s, t), k = Math.floor((t - s.origin) / s.beat);
        if (k !== lastBeat.current) { lastBeat.current = k; galataAudio.tick(k % 4 === 0); }
        // nabız: vuruş anında büyük, arada küçülür
        const p = Math.min(ph, 1 - ph) * 2;
        if (ring.current) { ring.current.style.transform = `scale(${1.25 - p * 0.35})`; ring.current.style.opacity = String(1 - p * 0.6); }
      }
      if (fill.current) fill.current.style.strokeDashoffset = String(282.7 * (1 - Stair.breathFill(s, t)));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [climb]);
  const s = climb.current, fresh = last && now() - last.t < 0.7;
  const LABEL: Record<Stair.Judgement, string> = { tam: 'Tam!', iyi: 'İyi', erken: 'Erken', gec: 'Geç' };
  return (
    <>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        {s.phase === 'breath' ? (
          <div className="flex flex-col items-center gap-3">
            <svg width="110" height="110" viewBox="0 0 110 110"><circle cx="55" cy="55" r="45" fill="rgba(0,0,0,.45)" stroke="rgba(255,255,255,.2)" strokeWidth="6" />
              <circle ref={fill} cx="55" cy="55" r="45" fill="none" stroke="#fcd34d" strokeWidth="6" strokeLinecap="round" strokeDasharray="282.7" strokeDashoffset="282.7" transform="rotate(-90 55 55)" /></svg>
            <p className={`${glass} flex items-center gap-2 px-4 py-2 text-sm`}><Hand size={16} /> Basılı tut · nefes al</p>
          </div>
        ) : (
          <div ref={ring} className="h-24 w-24 rounded-full border-4 border-amber-200/90 shadow-[0_0_30px_rgba(253,230,138,.5)]" />
        )}
      </div>
      {fresh && <p className={`pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 text-2xl font-bold ${last!.j === 'tam' ? 'text-amber-300' : last!.j === 'iyi' ? 'text-white' : 'text-white/60'}`}>{LABEL[last!.j]}</p>}
      <div className={`${glass} pointer-events-none absolute bottom-5 right-5 px-4 py-2 text-right text-sm`}>
        <p className="font-semibold">{s.steps}/{Stair.TOTAL_STEPS} basamak</p>
        <p className="text-xs text-white/70">Sahanlık {Stair.flightOf(s)}/{Stair.FLIGHTS} · tempo {Math.round(60 / s.beat)}/dk</p>
      </div>
      <p className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-xs text-white/60">Halka büyüdüğünde yukarı kaydır · boşluk tuşu</p>
      {/* erişilebilirlik: kaydıramayanlar için düğme */}
      {s.phase === 'climb' && <button onPointerDown={(e) => { e.stopPropagation(); galataAudio.unlock(); onStep(); }} className="absolute bottom-5 left-5 grid h-16 w-16 place-items-center rounded-full bg-white/20 backdrop-blur" aria-label="Bir basamak çık"><ChevronUp size={28} /></button>}
    </>
  );
}

function ExhibitHud({ seen, locked, done, btnMove, onContinue, onNext }: { seen: number; locked: boolean; done: boolean; btnMove: React.MutableRefObject<number>; onContinue: () => void; onNext: () => void }) {
  return (
    <>
      <div className={`${glass} pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 px-4 py-2 text-sm`}>Vitrin {seen}/{EXHIBITS.length}</div>
      {!locked && (
        <div className="pointer-events-none absolute bottom-5 left-5 flex flex-col gap-2">
          <HoldButton dir={1} btnMove={btnMove} label="İleri yürü"><ChevronUp /></HoldButton>
          <HoldButton dir={-1} btnMove={btnMove} label="Geri yürü"><ChevronDown /></HoldButton>
        </div>
      )}
      {locked && <button onClick={onContinue} className="absolute bottom-6 left-1/2 h-12 -translate-x-1/2 rounded-xl bg-brand px-6 font-semibold shadow-lg">Devam</button>}
      {!locked && done && <button onClick={onNext} className="absolute bottom-6 left-1/2 h-12 -translate-x-1/2 rounded-xl bg-brand px-6 font-semibold shadow-lg">Terasa çık</button>}
      {!locked && !done && <p className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/60">Galeride yürü; bir vitrine yaklaşınca kamera kendiliğinden yakınlaşır</p>}
    </>
  );
}

function TerraceHud({ index, viewed, onPick, onPan, done, onFinish }: { index: number; viewed: string[]; onPick: (i: number) => void; onPan: (d: number) => void; done: boolean; onFinish: () => void }) {
  return (
    <>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => onPan(-1)} className="grid h-11 w-11 place-items-center rounded-full bg-black/55 backdrop-blur" aria-label="Önceki nokta"><ChevronLeft /></button>
          <div className={`${glass} flex gap-1 p-1`}>
            {VIEWPOINTS.map((v, i) => (
              <button key={v.id} onClick={() => onPick(i)} className={`h-10 rounded-xl px-3 text-xs font-semibold sm:text-sm ${i === index ? 'bg-white text-ink' : 'text-white/85'}`}>
                {v.name}{viewed.includes(v.id) && i !== index ? ' ✓' : ''}
              </button>
            ))}
          </div>
          <button onClick={() => onPan(1)} className="grid h-11 w-11 place-items-center rounded-full bg-black/55 backdrop-blur" aria-label="Sonraki nokta"><ChevronRight /></button>
        </div>
        {done ? <button onClick={onFinish} className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold shadow-lg">Kulenin hafızasını tamamla</button>
          : <p className="text-xs text-white/70">Yatay kaydır ya da ←/→ · {viewed.length}/{VIEWPOINTS.length} nokta</p>}
      </div>
    </>
  );
}

function StoryCard({ title, era, text, source, onClose }: { title: string; era?: string; text: string; source?: { title: string; url: string }; onClose?: () => void }) {
  return (
    <div className="pointer-events-auto absolute right-3 top-20 w-[min(22rem,calc(100%-1.5rem))] rounded-2xl bg-white p-4 text-ink shadow-2xl" role="dialog" aria-label={title}>
      {era && <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">{era}</p>}
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{text}</p>
      {source && <a href={source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 underline">{source.title} <ExternalLink size={12} /></a>}
      {onClose && <button onClick={onClose} className="mt-3 block h-9 w-full rounded-lg bg-slate-100 text-sm font-semibold">Tamam</button>}
    </div>
  );
}

function EndCard({ crests, exhibits, views, onReplay, onExit }: { crests: number; exhibits: number; views: number; onReplay: () => void; onExit: () => void }) {
  const text = useMemo(() => 'Ceneviz gözetleme kulesi, Osmanlı zindanı ve yangın kulesi, bugün bir müze. Galata Kulesi’nin altı yüzyıllık hafızasını aşağıdan yukarıya yaşadın.', []);
  useEffect(() => { galataAudio.speak(text); }, [text]);
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/40 p-5">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center text-ink shadow-2xl">
        <p className="text-sm font-semibold text-brand">Gün batımı · 51 metre</p>
        <h2 className="mt-1 text-2xl font-bold">Kulenin hafızası</h2>
        <p className="mt-2 text-sm text-slate-600">{text}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-amber-50 p-2"><b className="block text-lg">{crests}</b>arma</div>
          <div className="rounded-xl bg-amber-50 p-2"><b className="block text-lg">{exhibits}</b>vitrin</div>
          <div className="rounded-xl bg-amber-50 p-2"><b className="block text-lg">{views}</b>manzara</div>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onReplay} className="h-11 flex-1 rounded-xl border border-line font-semibold">Yeniden oyna</button>
          <button onClick={onExit} className="h-11 flex-1 rounded-xl bg-brand font-semibold text-white">Haritaya dön</button>
        </div>
      </div>
    </div>
  );
}

function PortraitHint() {
  return (
    <div className="pointer-events-none fixed inset-x-3 top-16 hidden items-center gap-2 rounded-xl bg-black/75 px-3 py-2 text-xs text-white [@media(pointer:coarse)_and_(orientation:portrait)]:flex">
      <RotateCw size={16} className="text-brand" /> Daha geniş görüş için telefonu yatay çevir.
    </div>
  );
}
