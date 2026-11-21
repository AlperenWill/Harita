/**
 * Kız Kulesi — "Vapur Yolculuğu & Ada Keşfi". Ana oyun yöneticisi: bölüm geçişleri, girdiler, diyalog tetikleyicileri, arayüz.
 *
 * Akış: başlangıç → vapur (gidiş) → yanaşma (ada) → kule içi → teras → dönüş (veda) → son.
 * NPC odaklı: Can her bölümde oyuncunun yanındadır. Kendiliğinden konuşmaz: bölüme girince (enter), vapurda arada bir (random) ve
 * merdivende taşların yanında (reach) "Can anlatmak istiyor" çıkar; konuşma oyuncu E'ye / el düğmesine basınca başlar (dialogues.json).
 * Kamera birinci şahıstır (göz hizası); masaüstünde tıkla + fareyle, dokunmatikte sürükleyerek bakılır.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ArrowLeft, Hand, MessageCircle, Move, Ship } from 'lucide-react';
import { useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Controls, EndSheet, GameMenu, Hint as HudHint, HudTheme, Objective, StartSheet, TopRow } from '../shared/hud/Hud';
import { useSettings } from '../shared/hud/settings';
import { Footprints } from 'lucide-react';
import { PHASE_LABEL, useKiz, type Phase } from './store';
import { find, shuffle } from './dialogue';
import { kizSound } from './sound';
import { inputPause, keys, readKeys, view } from './input';
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
  const phase = useKiz((s) => s.phase), muted = useKiz((s) => s.muted), playing = useKiz((s) => !!s.playback);
  const pending = useKiz((s) => s.pending);
  const [fade, setFade] = useState(false);
  const [arrived, setArrived] = useState(false);
  const stick = useRef({ x: 0, y: 0 });

  // test/inceleme: ?debug ile bölüm atlama
  const go = useCallback((p: Phase) => {
    setFade(true); kizSound.hush();
    setTimeout(() => { useKiz.getState().setPhase(p); setTimeout(() => setFade(false), 150); }, 600);
  }, []);
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __kiz: unknown }).__kiz = { go, view }; }, [go]);

  // ses
  const G = useSettings(); useEffect(() => { useKiz.getState().setMuted(G.muted); useKiz.getState().setTts(G.tts); }, [G.muted, G.tts]);
  useEffect(() => { kizSound.setMuted(muted); }, [muted]);
  useEffect(() => { kizSound.mix(phase === 'vapur' ? 'vapur' : phase === 'kule' ? 'ic' : phase === 'baslangic' || phase === 'son' ? 'ada' : 'ada'); }, [phase]);
  useEffect(() => () => kizSound.dispose(), []);

  // girdi: klavye + joystick → walk (her karede)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      // konuşma sürerken E/Boşluk'u DialogueSystem işler (preventDefault); konuşma yoksa etkileşim
      if ((e.code === 'KeyE' || e.code === 'Space') && !e.repeat && !e.defaultPrevented && !useKiz.getState().playback && ORDER.includes(useKiz.getState().phase)) interactRef.current();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0; const loop = () => { readKeys(stick.current); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); keys.clear(); };
  }, []);

  // bölüme girişte: Can'ın anlatacağı var (oyuncu E'ye basınca başlar)
  useEffect(() => {
    const id = ENTER[phase]; if (!id) return;
    const t = setTimeout(() => useKiz.getState().offer(id), phase === 'vapur' ? 1200 : 700);
    return () => clearTimeout(t);
  }, [phase]);

  // vapurda: giriş konuşmasından sonra havuzdaki repliklere rastgele sırayla, araya sessiz anlar koyarak
  useEffect(() => {
    if (phase !== 'vapur') return;
    const pool = shuffle(find('vapur', (t) => t.type === 'random').map((d) => d.id), Date.now());
    let i = 0, quiet = 0;
    const id = setInterval(() => {
      const st = useKiz.getState();
      if (st.playback || st.pending) { quiet = 0; return; }
      if (!st.heard.includes('vapur-giris')) return;
      quiet += 1;
      if (quiet >= 6 && i < pool.length) { st.offer(pool[i++]); quiet = 0; }   // ~6 sn sessizlikten sonra yeni bir hikâye teklifi
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
    const K = useKiz.getState();
    if (K.playback) { skip(); return; }
    if (K.pending) { const id = K.pending; K.offer(null); K.play(id); return; }
    const opts = find(phase as never, (t) => t.type === 'interact');
    const d = opts.find((x) => !useKiz.getState().heard.includes(x.id)) ?? opts[0];
    if (d) useKiz.getState().play(d.id);
  };

  const interactRef = useRef(interact); interactRef.current = interact;
  // birinci şahıs bakış: fare kilidi / sürükleme
  const fpl = useFpLook(view, () => ORDER.includes(useKiz.getState().phase) && !inputPause.on, () => kizSound.unlock());

  const idx = ORDER.indexOf(phase);
  const start = () => { kizSound.unlock(); useKiz.getState().reset(); setArrived(false); go('vapur'); };

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#bcd6e6] text-white" style={{ touchAction: 'none' }}
      {...fpl.handlers}>
      <HudTheme theme={THEME}>
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

      <TopRow onExit={onExit} objective={idx >= 0 ? <Objective icon={<Ship size={15} />} label={PHASE_LABEL[phase]} done={idx} total={ORDER.length} /> : undefined}
        right={<GameMenu onPause={(v) => { inputPause.on = v; }} help={<Controls items={CONTROLS} />} onRestart={start} onExit={onExit} />} />

      {/* mobil: sol joystick, sağ etkileşim */}
      {idx >= 0 && (
        <>
          <Joystick stick={stick} />
          <LookCrosshair locked={fpl.locked} />
          {pending && !playing && <p className="pointer-events-none absolute bottom-44 right-4 z-40 flex max-w-[60vw] items-center gap-1.5 rounded-full bg-[#2f6f9a] px-3 py-1.5 text-xs font-semibold text-white shadow-lg sm:bottom-48"><MessageCircle size={14} /> Can anlatmak istiyor<span className="hidden [@media(pointer:fine)]:inline"> · E</span></p>}
          <button onPointerDown={(e) => { e.stopPropagation(); interact(); }} aria-label={playing ? 'Konuşmayı hızlandır' : pending ? 'Can ile konuş' : 'Etkileşim'}
            className={`absolute bottom-24 right-5 z-40 grid h-16 w-16 place-items-center rounded-full shadow-lg backdrop-blur sm:bottom-28 ${playing || pending ? 'bg-[#2f6f9a] text-white' : 'bg-[#f7f5f1]/85 text-[#1f1b17] ring-1 ring-black/5'} ${pending && !playing ? 'animate-pulse' : ''}`}>
            <Hand size={26} />
          </button>
        </>
      )}

      {phase === 'vapur' && !playing && <Hint text={arrived ? 'Yanaştık…' : 'Güvertede dolaş · Can’la konuşmak için E'} />}
      {phase === 'yanasma' && !playing && <Hint text="Can’ı takip et — kapıya yürü" />}
      {phase === 'kule' && !playing && <Hint text="Merdivene bak, ileri yürü: yukarı çık" />}
      {phase === 'teras' && !playing && !pending && (
        <div className="absolute bottom-24 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
          <p className="rounded-full bg-[#f7f5f1]/90 px-3 py-1 text-xs text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md">Etkileşim düğmesi: Can’a soru sor</p>
          <button onClick={() => go('donus')} className="inline-flex h-12 items-center gap-2 rounded-2xl px-5 font-bold text-white shadow-lg" style={{ background: THEME.accent }}><Ship size={18} /> Vapura dön</button>
        </div>
      )}
      {phase === 'donus' && !playing && !pending && <Hint text="İskele tahtasından vapura bin" />}

      <DialogueBox />

      {phase === 'baslangic' && <TitleCard onStart={start} onExit={onExit} />}
      {phase === 'son' && <EndCard onReplay={start} onExit={onExit} />}
      <div className={`pointer-events-none absolute inset-0 z-50 bg-white transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
      </HudTheme>
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
  return <HudHint>{text}<span className="hidden [@media(pointer:fine)]:inline"> · WASD</span></HudHint>;
}
function TitleCard({ onStart, onExit }: { onStart: () => void; onExit?: () => void }) {
  const completed = useKiz((s) => !!s.completedAt);
  return <StartSheet kicker="İstanbul · Üsküdar açıkları" title="Kız Kulesi: Vapur Yolculuğu & Ada Keşfi" intro={<>Rehberin Can ile vapura bin, Kız Kulesi’ne yanaş, dar merdivenlerden terasa çık. Can yol boyunca kulenin hikâyesini anlatacak.</>}
    controls={CONTROLS} cta={completed ? 'Yeniden başla' : 'Vapura bin'} ctaIcon={<Ship size={18} />} onStart={onStart} onExit={onExit} />;
}
function EndCard({ onReplay, onExit }: { onReplay: () => void; onExit: () => void }) {
  const heard = useKiz((s) => s.heard.length);
  return <EndSheet kicker="Görüşmek üzere" title="“Bir dahaki sefere gün batımında!”" text={`Can’dan ${heard} hikâye dinledin: Bizans kulesinden 18. yüzyıl fenerine, karantina istasyonundan 2023’teki müzeye.`} stayLabel="Yeniden oyna" onStay={onReplay} onExit={onExit} badge={<Ship size={24} />} />;
}
const THEME = { accent: '#2f6f9a' };
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b>: yürü</> },
  { icon: <Move size={16} />, text: <>Bilgisayarda tıkla, fareyle bak (Esc bırakır) · telefonda ekranı sürükle</> },
  { icon: <Hand size={16} />, text: <>El düğmesi ya da <b>E</b> / <b>Boşluk</b>: Can’la konuş / konuşmayı geç</> },
];
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
