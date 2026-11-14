/**
 * Kız Kulesi — "Vapur Yolculuğu & Ada Keşfi". Ana oyun yöneticisi: bölüm geçişleri, girdiler, diyalog tetikleyicileri, arayüz.
 *
 * Akış: başlangıç → vapur (gidiş) → yanaşma (ada) → kule içi → teras → dönüş (veda) → son.
 * NPC odaklı: Can her bölümde oyuncunun yanındadır; bölüme girince (enter), vapurda rastgele sırayla (random),
 * merdivende taşlara varınca (reach) ve etkileşim düğmesine basınca (interact) konuşur (dialogues.json).
 * Kamera hiçbir bölümde serbest değildir: otomatik takip eder, oyuncu yalnızca yakınlaştırır (+/−, tekerlek, iki parmak).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ArrowLeft, Hand, Minus, Plus, Ship, Volume2, VolumeX, Captions, CaptionsOff } from 'lucide-react';
import { PHASE_LABEL, useKiz, type Phase } from './store';
import { find, shuffle } from './dialogue';
import { kizSound } from './sound';
import { keys, readKeys } from './input';
import { DialogueBox, skip } from './DialogueSystem';
import FerryScene from './FerryScene';
import { DockScene, TerraceScene, TowerInterior } from './IslandExploration';
import { KizKulesi, Shores } from './TowerModel';
import { Water, type FoamRefs } from './Water';

/* ---------- cihaz profili ---------- */
const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
type Tier = 'low' | 'medium' | 'high';
function detectTier(): Tier {
  const q = new URLSearchParams(location.search).get('q');
  if (q === 'low' || q === 'medium' || q === 'high') return q;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low';
  return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high';
}
function useDevice() {
  const [tier] = useState(detectTier);
  const [saver, setSaver] = useState(false);
  useEffect(() => {
    type B = EventTarget & { level: number; charging: boolean }; let b: B | null = null;
    const check = () => b && setSaver(b.level < 0.2 && !b.charging);
    (navigator as Navigator & { getBattery?: () => Promise<B> }).getBattery?.().then((x) => { b = x; check(); x.addEventListener('levelchange', check); x.addEventListener('chargingchange', check); }).catch(() => {});
    return () => { b?.removeEventListener('levelchange', check); b?.removeEventListener('chargingchange', check); };
  }, []);
  const t: Tier = saver ? 'low' : tier;
  return useMemo(() => ({
    tier: t, shadows: t !== 'low', water: t === 'low' ? 96 : 160, blocks: t === 'low' ? 350 : t === 'medium' ? 700 : 1100,
    dpr: (t === 'low' ? 1 : t === 'medium' ? [1, 1.4] : [1, 1.75]) as number | [number, number], antialias: t !== 'low',
  }), [t]);
}

const ORDER: Phase[] = ['vapur', 'yanasma', 'kule', 'teras', 'donus'];
const ENTER: Partial<Record<Phase, string>> = { vapur: 'vapur-giris', yanasma: 'yanasma', kule: 'kule-giris', teras: 'teras', donus: 'donus' };

export default function MaidensTowerGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}

function Game({ onExit }: { onExit: () => void }) {
  const dev = useDevice();
  const phase = useKiz((s) => s.phase), muted = useKiz((s) => s.muted), tts = useKiz((s) => s.tts), playing = useKiz((s) => !!s.playback);
  const heard = useKiz((s) => s.heard);
  const [fade, setFade] = useState(false);
  const [arrived, setArrived] = useState(false);
  const stick = useRef({ x: 0, y: 0 });

  // test/inceleme: ?debug ile bölüm atlama
  const go = useCallback((p: Phase) => {
    setFade(true); kizSound.hush();
    setTimeout(() => { useKiz.getState().setPhase(p); setTimeout(() => setFade(false), 150); }, 600);
  }, []);
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __kiz: unknown }).__kiz = { go }; }, [go]);

  // ses
  useEffect(() => { kizSound.setMuted(muted); }, [muted]);
  useEffect(() => { kizSound.mix(phase === 'vapur' ? 'vapur' : phase === 'kule' ? 'ic' : phase === 'baslangic' || phase === 'son' ? 'ada' : 'ada'); }, [phase]);
  useEffect(() => () => kizSound.dispose(), []);

  // girdi: klavye + joystick → walk (her karede)
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.add(e.code); if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); if (e.code === 'Equal' || e.code === 'NumpadAdd') useKiz.getState().zoomBy(-0.1); if (e.code === 'Minus' || e.code === 'NumpadSubtract') useKiz.getState().zoomBy(0.1); };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0; const loop = () => { readKeys(stick.current); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); keys.clear(); };
  }, []);

  // bölüme girişte konuşma
  useEffect(() => {
    const id = ENTER[phase]; if (!id) return;
    const t = setTimeout(() => useKiz.getState().play(id), phase === 'vapur' ? 1500 : 900);
    return () => clearTimeout(t);
  }, [phase]);

  // vapurda: giriş konuşmasından sonra havuzdaki repliklere rastgele sırayla, araya sessiz anlar koyarak
  useEffect(() => {
    if (phase !== 'vapur') return;
    const pool = shuffle(find('vapur', (t) => t.type === 'random').map((d) => d.id), Date.now());
    let i = 0, quiet = 0;
    const id = setInterval(() => {
      const st = useKiz.getState();
      if (st.playback) { quiet = 0; return; }
      if (!st.heard.includes('vapur-giris')) return;
      quiet += 1;
      if (quiet >= 5 && i < pool.length) { st.play(pool[i++]); quiet = 0; }   // ~5 sn sessizlik
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // vapur yanaştı: konuşma bitince adaya geç
  useEffect(() => {
    if (phase !== 'vapur' || !arrived) return;
    const id = setInterval(() => { if (!useKiz.getState().playback) { clearInterval(id); go('yanasma'); } }, 500);
    return () => clearInterval(id);
  }, [phase, arrived, go]);

  // etkileşim düğmesi: konuşma varsa hızlandır/geç; yoksa bu bölümün etkileşim replikleri
  const interact = () => {
    kizSound.unlock();
    if (useKiz.getState().playback) { skip(); return; }
    const opts = find(phase as never, (t) => t.type === 'interact');
    const d = opts.find((x) => !useKiz.getState().heard.includes(x.id)) ?? opts[0];
    if (d) useKiz.getState().play(d.id);
  };

  // yakınlaştırma: tekerlek ve iki parmak
  const pinch = useRef<{ d: number } | null>(null), touches = useRef(new Map<number, { x: number; y: number }>());
  const onWheel = (e: React.WheelEvent) => useKiz.getState().zoomBy(Math.sign(e.deltaY) * 0.08);
  const onPtr = (e: React.PointerEvent, type: 'down' | 'move' | 'up') => {
    if (e.pointerType !== 'touch') return;
    if (type === 'up') { touches.current.delete(e.pointerId); pinch.current = null; return; }
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.current.size === 2) {
      const [a, b] = [...touches.current.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current && type === 'move') { useKiz.getState().zoomBy((pinch.current.d - d) * 0.004); }
      pinch.current = { d };
    }
  };

  const idx = ORDER.indexOf(phase);
  const start = () => { kizSound.unlock(); useKiz.getState().reset(); setArrived(false); go('vapur'); };

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#bcd6e6] text-white" style={{ touchAction: 'none' }}
      onWheel={onWheel} onPointerDown={(e) => { kizSound.unlock(); onPtr(e, 'down'); }} onPointerMove={(e) => onPtr(e, 'move')} onPointerUp={(e) => onPtr(e, 'up')} onPointerCancel={(e) => onPtr(e, 'up')}>
      <Canvas shadows={dev.shadows} dpr={dev.dpr} gl={{ antialias: dev.antialias, powerPreference: 'high-performance' }}
        camera={{ fov: 55, near: 0.1, far: 6000, position: [-60, 20, 60] }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}>
        <Suspense fallback={null}>
          {(phase === 'baslangic' || phase === 'son') && <TitleScene dev={dev} />}
          {phase === 'vapur' && <FerryScene device={dev} onArrive={() => setArrived(true)} />}
          {(phase === 'yanasma' || phase === 'donus') && <DockScene key={phase} phase={phase} dev={dev} onDoor={() => go('kule')} onBoard={() => { useKiz.getState().complete(); go('son'); }} />}
          {phase === 'kule' && <TowerInterior onTop={() => go('teras')} />}
          {phase === 'teras' && <TerraceScene dev={dev} />}
        </Suspense>
      </Canvas>

      {/* üst çubuk */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-3">
        <button onClick={onExit} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/50 backdrop-blur" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
        <button onClick={() => useKiz.getState().setMuted(!muted)} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/50 backdrop-blur" aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <button onClick={() => { useKiz.getState().setTts(!tts); if (tts) kizSound.hush(); }} className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-full backdrop-blur ${tts ? 'bg-brand' : 'bg-black/50'}`} aria-label={tts ? 'Sesli okumayı kapat' : 'Sesli okumayı aç'} aria-pressed={tts}>
          {tts ? <Captions size={18} /> : <CaptionsOff size={18} />}
        </button>
        {idx >= 0 && (
          <div className="mx-auto flex flex-col items-center gap-1 rounded-2xl bg-black/50 px-4 py-2 backdrop-blur">
            <div className="flex gap-1">{ORDER.map((p, i) => <span key={p} className={`h-1.5 w-8 rounded-full ${i < idx ? 'bg-amber-300' : i === idx ? 'bg-white' : 'bg-white/25'}`} />)}</div>
            <p className="text-xs">{PHASE_LABEL[phase]}</p>
          </div>
        )}
        {idx >= 0 && (
          <div className="pointer-events-auto ml-auto flex flex-col gap-2">
            <button onClick={() => useKiz.getState().zoomBy(-0.12)} className="grid h-11 w-11 place-items-center rounded-full bg-black/50 backdrop-blur" aria-label="Yakınlaştır"><Plus size={18} /></button>
            <button onClick={() => useKiz.getState().zoomBy(0.12)} className="grid h-11 w-11 place-items-center rounded-full bg-black/50 backdrop-blur" aria-label="Uzaklaştır"><Minus size={18} /></button>
          </div>
        )}
      </div>

      {/* mobil: sol joystick, sağ etkileşim */}
      {idx >= 0 && (
        <>
          <Joystick stick={stick} />
          <button onPointerDown={(e) => { e.stopPropagation(); interact(); }} aria-label={playing ? 'Konuşmayı hızlandır' : 'Etkileşim'}
            className={`absolute bottom-24 right-5 z-40 grid h-16 w-16 place-items-center rounded-full shadow-lg backdrop-blur sm:bottom-28 ${playing ? 'bg-brand' : 'bg-white/30'}`}>
            <Hand size={26} />
          </button>
        </>
      )}

      {phase === 'vapur' && !playing && <Hint text={arrived ? 'Yanaştık…' : 'Güvertede dolaş · Can seninle konuşacak'} />}
      {phase === 'yanasma' && !playing && <Hint text="Can’ı takip et — kapıya yürü" />}
      {phase === 'kule' && !playing && <Hint text="Joystick’i yukarı it: merdivenden çık" />}
      {phase === 'teras' && !playing && heard.includes('teras') && (
        <div className="absolute bottom-24 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
          <p className="rounded-full bg-black/50 px-3 py-1 text-xs backdrop-blur">Etkileşim düğmesi: Can’a soru sor</p>
          <button onClick={() => go('donus')} className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-5 font-semibold shadow-lg"><Ship size={18} /> Vapura dön</button>
        </div>
      )}
      {phase === 'donus' && !playing && heard.includes('donus') && <Hint text="İskele tahtasından vapura bin" />}

      <DialogueBox />

      {phase === 'baslangic' && <TitleCard onStart={start} />}
      {phase === 'son' && <EndCard onReplay={start} onExit={onExit} />}
      <div className={`pointer-events-none absolute inset-0 z-50 bg-white transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
    </div>
  );
}

/* ---------- başlık sahnesi: adanın etrafında yavaş, otomatik dönüş ---------- */
function TitleScene({ dev }: { dev: ReturnType<typeof useDevice> }) {
  const { camera, scene } = useThree();
  const foam: FoamRefs = { bow: useRef(new THREE.Vector3(9999, 0, 9999)), bowDir: useRef(new THREE.Vector2(0, 1)), bowAmount: useRef(0) };
  useEffect(() => { scene.background = new THREE.Color('#bcd6e6'); scene.fog = new THREE.Fog('#cfe0ea', 300, 2600); return () => { scene.fog = null; }; }, [scene]);
  useFrame(({ clock }) => { const a = clock.elapsedTime * 0.05 + 0.6; camera.position.set(Math.cos(a) * 75, 18, Math.sin(a) * 75); camera.lookAt(0, 10, 0); });
  return (
    <group>
      <hemisphereLight args={['#eaf3fb', '#5b6e7a', 1]} />
      <directionalLight position={[120, 160, -80]} intensity={2.2} color="#fff6e6" />
      <Water foam={foam} segments={dev.water} />
      <KizKulesi />
      <Shores blocks={dev.blocks} />
    </group>
  );
}

/* ---------- arayüz parçaları ---------- */
function Joystick({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const knob = useRef<HTMLSpanElement>(null);
  const set = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    stick.current = { x, y }; if (knob.current) knob.current.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
  };
  const reset = () => { stick.current = { x: 0, y: 0 }; if (knob.current) knob.current.style.transform = ''; };
  return (
    <div className="absolute bottom-24 left-5 z-40 grid h-28 w-28 touch-none place-items-center rounded-full border-2 border-white/80 bg-white/25 backdrop-blur sm:bottom-28 [@media(pointer:fine)]:hidden"
      aria-label="Yürüme joystick'i" onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); set(e); }}
      onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) set(e); }} onPointerUp={reset} onPointerCancel={reset}>
      <span ref={knob} className="h-12 w-12 rounded-full bg-brand shadow-lg" />
    </div>
  );
}
function Hint({ text }: { text: string }) {
  return <p className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-4 py-1.5 text-center text-xs backdrop-blur sm:text-sm">{text}<span className="hidden [@media(pointer:fine)]:inline"> · WASD</span></p>;
}
function TitleCard({ onStart }: { onStart: () => void }) {
  const completed = useKiz((s) => !!s.completedAt);
  return (
    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-8">
      <div className="mx-auto max-w-xl rounded-2xl bg-black/55 p-5 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">İstanbul · Üsküdar açıkları</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Kız Kulesi: Vapur Yolculuğu & Ada Keşfi</h1>
        <p className="mt-2 text-sm text-white/85">Rehberin Can ile vapura bin, Kız Kulesi’ne yanaş, dar merdivenlerden terasa çık. Can yol boyunca kulenin hikâyesini anlatacak.</p>
        <p className="mt-2 text-xs text-white/65">Joystick / WASD ile yürü · el düğmesi / Boşluk ile konuşmayı geç · + / − ile yakınlaştır</p>
        <button onClick={onStart} className="mt-4 h-12 w-full rounded-xl bg-brand font-semibold">{completed ? 'Yeniden başla' : 'Vapura bin'}</button>
      </div>
    </div>
  );
}
function EndCard({ onReplay, onExit }: { onReplay: () => void; onExit: () => void }) {
  const heard = useKiz((s) => s.heard.length);
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/30 p-5">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center text-ink shadow-2xl">
        <p className="text-sm font-semibold text-brand">Görüşmek üzere</p>
        <h2 className="mt-1 text-2xl font-bold">“Bir dahaki sefere gün batımında!”</h2>
        <p className="mt-2 text-sm text-slate-600">Can’dan {heard} hikâye dinledin: Bizans kulesinden 18. yüzyıl fenerine, karantina istasyonundan 2023’teki müzeye.</p>
        <div className="mt-5 flex gap-2">
          <button onClick={onReplay} className="h-11 flex-1 rounded-xl border border-line font-semibold">Yeniden oyna</button>
          <button onClick={onExit} className="h-11 flex-1 rounded-xl bg-brand font-semibold text-white">Haritaya dön</button>
        </div>
      </div>
    </div>
  );
}

/** WebGL yoksa: fotoğraf + Can'ın anlatımı (sesli) */
function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null);
  const lines = useMemo(() => find('vapur', () => true).flatMap((d) => d.lines.map((l) => l.text)), []);
  const [i, setI] = useState(0);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/K%C4%B1z_Kulesi').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  return (
    <div className="fixed inset-0 bg-ink text-white">
      {img && <img src={img} alt="Kız Kulesi" className="absolute inset-0 h-full w-full object-cover opacity-80" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/50" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/75 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <span className="mt-2 inline-block rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold">Can</span>
        <p className="mt-1">{lines[i]}</p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => kizSound.speak(lines[i])} className="h-10 rounded-lg bg-white/15 px-3 text-sm">Dinle</button>
          <button onClick={() => setI((i + 1) % lines.length)} className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold">Devam</button>
        </div>
      </div>
    </div>
  );
}
