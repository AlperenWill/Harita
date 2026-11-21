/**
 * Hattuşa — "Kralın Yolu: Surların Gölgesinde". Ana yönetici (sahne, parça akışı durumu, kamera, ritüel, ses, arayüz).
 *
 * MÖ 1300. Oyuncu Büyükkale'deki kabulden çıkan bir elçidir. Hedef şehri gezmek değil, kapı ritüellerini yerine getirerek
 * Aslanlı Kapı → Sfenksli Kapı (Yerkapı) → Kral Kapısı üzerinden Yazılıkaya'ya ulaşmaktır (rota ve gerekçe: site.ts).
 * KAMERA: birinci şahıs, göz hizasında; yürüyüş rotaya bağlı (W/joystick bakılan yöne göre rotada ileri/geri), bakış serbest
 *   (masaüstünde tıkla + fare, dokunmatikte sürükle). Rölyef İnceleme yalnızca oyuncu E/düğmeyle isteyince açılır; kamera kendiliğinden oynamaz.
 * N / ≫ düğmesi: sıradaki kapıya / kabartmaya kendiliğinden yürü.
 * Şanlıurfa ve öteki oyunlarla tutarlılık: aynı cihaz profili (?q=), ?debug (__hattusa), pil tasarrufu, tr-TR sesli okuma (erkek bekçi sesi),
 *   WebGL yoksa Vikipedi fotoğraflı yedek, kaynaklı kartlar.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Controls, GameMenu, Hint, HudTheme, IconButton, InfoSheet, StartSheet, EndSheet, TopRow, Objective } from '../shared/hud/Hud';
import { useSettings } from '../shared/hud/settings';
import { ChevronsRight, Footprints, Info, Move } from 'lucide-react';
import { Joystick } from '../shared/Joystick';
import { applyFp, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { ArrowLeft, DoorOpen, Search, Shield } from 'lucide-react';
import { Character, newRig, type Palette, type RigState } from '../kiz-kulesi/NPCController';
import { GATES, ROUTE_LEN, WALL, YAZILIKAYA, YAZ_S, distToWall, heightAt, routeAt, type Gate, type GateId } from './site';
import { SPEECH, begin, canPerform, doorOpen, guard, newRitual, nextGate, tick, type RitualState } from './GateRitualMechanic';
import { CHUNKS, distantTerrain, streamPlan, type ChunkLevel, type Tier } from './OpenWorldStreamer';
import { WALL_DIM, erodedStone, merlonGeometry, merlonMatrices, mudMaterial, towerMatrices, wallStrip } from './AncientWallSystem';
import { reliefMaterial, rockGeometry, type ReliefKind } from './RockReliefRenderer';
import { speakTr } from '../shared/voice';
import { Polish, SkyEnvironment } from '../shared/Polish';

const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch { return false; } })();
const pinned = (() => { const q = new URLSearchParams(location.search).get('q'); return q === 'low' || q === 'medium' || q === 'high' ? (q as Tier) : null; })();
function detectTier(): Tier { if (pinned) return pinned; const nav = navigator as Navigator & { deviceMemory?: number }; if ((nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low'; return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high'; }
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
const WALK = 3.5, AUTO = 7, SUN = new THREE.Vector3(-0.55, 0.42, 0.72).normalize();
const GUARD: Palette = { skin: '#b98a66', hair: '#1a120c', top: '#5d5a3e', pants: '#3e3a2a', shoes: '#3a2a1a', kaftan: '#6b5e3a', sash: '#8a3b26', hat: 'bork', hatColor: '#4a4632', beard: '#1a120c' };

/* ---------- ses: kuru rüzgâr (açık alanda güçlü, sur dibinde boğuk), at nalları, boru, taş yontma, ahşap gıcırtısı. SU SESİ YOK. ---------- */
class HattusaAudio {
  private ctx: AudioContext | null = null; private master: GainNode | null = null; private noise: AudioBuffer | null = null; private wind: { g: GainNode; f: BiquadFilterNode } | null = null; private next = { hoof: 12, horn: 45 }; muted = false; saver = false;
  unlock() { if (this.ctx) { void this.ctx.resume(); return; } const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC()); this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(ctx.destination);
    const n = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, n, ctx.sampleRate); const d = this.noise.getChannelData(0); let b = 0; for (let i = 0; i < n; i++) { b = 0.97 * b + (Math.random() * 2 - 1) * 0.12; d[i] = b; }
    const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 0.6; const g = ctx.createGain(); g.gain.value = 0.1; s.connect(f).connect(g).connect(this.master); s.start(); this.wind = { g, f }; }
  /** açıklık 0 (sur dibi) … 1 (açık alan) */
  update(open: number, dt: number) { const ctx = this.ctx; if (!ctx || !this.wind) return; const t = ctx.currentTime; this.wind.g.gain.setTargetAtTime(0.05 + 0.2 * open, t, 0.6); this.wind.f.frequency.setTargetAtTime(280 + 700 * open, t, 0.6);
    if (this.saver) return; this.next.hoof -= dt; this.next.horn -= dt; if (this.next.hoof < 0) { this.next.hoof = 20 + Math.random() * 25; this.hooves(); } if (this.next.horn < 0) { this.next.horn = 60 + Math.random() * 40; this.horn(); } }
  private click(at: number, freq: number, amp: number, pan: number, dur = 0.05) { const ctx = this.ctx!, s = ctx.createBufferSource(); s.buffer = this.noise; const f = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 3; p.pan.value = pan; g.gain.setValueAtTime(amp, at); g.gain.exponentialRampToValueAtTime(0.001, at + dur); s.connect(f).connect(g).connect(p).connect(this.master!); s.start(at, Math.random()); s.stop(at + dur + 0.02); }
  hooves() { const ctx = this.ctx; if (!ctx || this.muted) return; const t = ctx.currentTime, pan = Math.random() * 1.6 - 0.8; for (let i = 0; i < 16; i++) this.click(t + i * 0.32 + (i % 2) * 0.09, 1100, 0.05 * (1 - Math.abs(i - 8) / 10), pan); }
  horn() { const ctx = this.ctx; if (!ctx || !this.master || this.muted) return; const t = ctx.currentTime; [220, 330].forEach((fr, i) => { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(fr * 0.97, t + i * 0.9); o.frequency.linearRampToValueAtTime(fr, t + i * 0.9 + 0.2); f.type = 'lowpass'; f.frequency.value = 900; g.gain.setValueAtTime(0, t + i * 0.9); g.gain.linearRampToValueAtTime(0.025, t + i * 0.9 + 0.15); g.gain.linearRampToValueAtTime(0, t + i * 0.9 + 1.4); o.connect(f).connect(g).connect(this.master!); o.start(t + i * 0.9); o.stop(t + i * 0.9 + 1.5); }); }
  chisel() { const ctx = this.ctx; if (!ctx || this.muted) return; const t = ctx.currentTime; for (let i = 0; i < 3; i++) this.click(t + i * 0.22, 3200, 0.25, 0, 0.04); }
  creak() { const ctx = this.ctx; if (!ctx || !this.master || this.muted) return; const t = ctx.currentTime, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); for (let k = 0; k < 8; k++) o.frequency.linearRampToValueAtTime(70 + Math.random() * 40, t + k * 0.25); f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 4; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.2); g.gain.linearRampToValueAtTime(0, t + 2.2); o.connect(f).connect(g).connect(this.master); o.start(t); o.stop(t + 2.3); }
  step(stone: boolean) { const ctx = this.ctx; if (!ctx || !this.noise || this.muted) return; this.click(ctx.currentTime, stone ? 1600 : 450, stone ? 0.2 : 0.3, 0, stone ? 0.06 : 0.1); }
  setMuted(m: boolean) { this.muted = m; if (m) this.hush(); if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.2); }
  speak(t: string) { if (!this.muted) speakTr(t, { gender: 'male', rate: 0.92 }); }
  hush() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  dispose() { this.hush(); void this.ctx?.close(); this.ctx = null; this.master = null; this.wind = null; }
}
const audio = new HattusaAudio();

/* ---------- kabartmalar (inceleme kartları) ---------- */
interface Relief { id: string; name: string; kind: ReliefKind; text: string; source: { title: string; url: string } }
const RELIEFS: Record<string, Relief> = {
  kral: { id: 'kral', name: 'Kral Kapısı’ndaki savaşçı tanrı', kind: 'warrior', source: { title: 'Wikipedia — Hattuşaş', url: 'https://tr.wikipedia.org/wiki/Hattu%C5%9Fa%C5%9F' },
    text: 'Kapının iç yanındaki kabartma, sivri ve boynuzlu miğferli, baltalı bir savaşçı tanrıyı gösterir. Uzun süre bir kral sanıldığı için kapıya bu ad verildi. Yerindeki kopyadır; aslı Ankara’daki Anadolu Medeniyetleri Müzesi’ndedir.' },
  alay: { id: 'alay', name: 'Yazılıkaya: tanrılar alayı', kind: 'procession', source: { title: 'Wikipedia — Yazılıkaya', url: 'https://tr.wikipedia.org/wiki/Yaz%C4%B1l%C4%B1kaya' },
    text: 'Kaya yüzeyine oyulmuş, sivri başlıklı ve kıvrık kılıçlı tanrılar yan yana yürür. Yazılıkaya, Hitit başkentinin dışındaki açık hava kaya tapınağıdır. Buradaki figürler stilize çizimdir.' },
  ana: { id: 'ana', name: 'Yazılıkaya: ana sahne', kind: 'main', source: { title: 'UNESCO — Hattusha: the Hittite Capital', url: 'https://whc.unesco.org/en/list/377' },
    text: 'Alaylar ana sahnede buluşur: fırtına tanrısı Teşup ile tanrıça Hepat karşı karşıya gelir. Hattuşa ve Yazılıkaya 1986’da UNESCO Dünya Mirası listesine girdi. Not: figürlerdeki hafif altın parıltı sanatsal bir vurgudur; kabartmalarda altın kaplama kanıtı bilinmemektedir.' },
};

/* ---------- durum ---------- */
interface S { started: boolean; ritual: RitualState; dialog: { gate: GateId; i: number } | null; warn: string | null; inspect: string | null; seen: string[]; nearRelief: string | null; muted: boolean; tts: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, ritual: newRitual(), dialog: null, warn: null, inspect: null, seen: [] as string[], nearRelief: null, endShown: false };
const useDb = create<S>((set) => ({ ...INITIAL, muted: false, tts: true, set: (p) => set(p) }));
const pause = { on: false };   // ≡ menü açıkken oyun durur
const live = { s: 0, v: 0, input: 0, auto: null as number | null, rig: newRig(0, 0, 0), speechDone: false, warnT: 0, view: { yaw: 0, pitch: 0 }, aimed: false, bob: 0 };

export default function HattusaGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}
function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier), [saver, setSaver] = useState(() => location.search.includes('saver')), S = useDb();
  const keys = useRef(new Set<string>()), stick = useRef({ x: 0, y: 0 });
  useEffect(() => { type B = EventTarget & { level: number; charging: boolean }; let b: B | null = null; const check = () => b && setSaver(b.level < 0.2 && !b.charging);
    (navigator as Navigator & { getBattery?: () => Promise<B> }).getBattery?.().then((x) => { b = x; check(); x.addEventListener('levelchange', check); }).catch(() => {}); return () => b?.removeEventListener('levelchange', check); }, []);
  const G = useSettings(); useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => { audio.saver = saver; }, [saver]);
  useEffect(() => () => { audio.dispose(); useDb.setState({ ...INITIAL, ritual: newRitual() }); Object.assign(live, { s: 0, v: 0, input: 0, auto: null, speechDone: false, aimed: false }); }, []);

  const perform = useCallback(() => { const st = useDb.getState(), g = canPerform(st.ritual, live.s); if (!g || st.dialog) return; st.set({ ritual: begin(st.ritual, g.id) }); live.speechDone = false; }, []);
  const advance = useCallback(() => { const st = useDb.getState(), d = st.dialog; if (!d) return; const L = SPEECH[d.gate].lines;
    if (d.i + 1 < L.length) { st.set({ dialog: { ...d, i: d.i + 1 } }); if (st.tts) audio.speak(L[d.i + 1]); } else { st.set({ dialog: null }); live.speechDone = true; audio.hush(); } }, []);
  const inspect = useCallback((id: string | null) => { const st = useDb.getState(); if (id) { audio.chisel(); st.set({ inspect: id, seen: st.seen.includes(id) ? st.seen : [...st.seen, id] }); if (st.tts) audio.speak(RELIEFS[id].text); } else { st.set({ inspect: null }); audio.hush(); } }, []);
  const goNext = useCallback(() => { const st = useDb.getState(), g = nextGate(st.ritual); live.auto = g ? g.s - 6 : ROUTE_LEN - 2; }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); const st = useDb.getState(); if (!st.started || e.repeat) return;
      if (e.code === 'KeyE' || e.code === 'Enter') { if (st.dialog) advance(); else if (st.inspect) inspect(null); else if (canPerform(st.ritual, live.s)) perform(); else if (st.nearRelief) inspect(st.nearRelief); }
      if (e.code === 'Escape' && st.inspect) inspect(null); if (e.code === 'KeyN') goNext(); };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0; const loop = () => { const k = keys.current; live.input = THREE.MathUtils.clamp((k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - stick.current.y, -1, 1); if (Math.abs(live.input) > 0.1) live.auto = null; raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); };
  }, [advance, perform, inspect, goNext]);
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __hattusa: unknown }).__hattusa = { go: (s: number) => { live.s = s; live.auto = null; useDb.getState().set({ started: true }); }, open: (id: GateId) => { const st = useDb.getState(); st.set({ ritual: { ...st.ritual, phase: { ...st.ritual.phase, [id]: 'open' } } }); }, perform, advance, inspect, state: () => ({ ...useDb.getState(), s: live.s }), panels: () => Object.fromEntries(Object.entries(PANELS).map(([k, m]) => [k, m ? m.getWorldPosition(new THREE.Vector3()).toArray().map((v) => +v.toFixed(1)) : null])), GATES: GATES.map((g) => ({ id: g.id, s: g.s })), ROUTE_LEN, YAZ_S }; }, [perform, advance, inspect]);
  const fpl = useFpLook(live.view, () => { const a = useDb.getState(); return a.started && !a.dialog && !a.inspect && !pause.on; }, () => audio.unlock());
  const ng = nextGate(S.ritual), can = S.started && !S.dialog && !S.inspect && !!canPerform(S.ritual, live.s);

  const nextG = GATES.find((g) => !S.ritual.passed.includes(g.id));
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#d9c9a8] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
      <Canvas dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high', powerPreference: 'high-performance' }} camera={{ fov: 60, near: 0.2, far: 4000, position: [-200, 90, 160] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.9; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}><World tier={tier} saver={saver} /><SkyEnvironment sky="#e8d9bd" sun="#ffd9a0" ground="#a88f62" sunDir={[SUN.x, SUN.y, SUN.z]} /><Polish tier={tier} saver={saver} /></Suspense>
      </Canvas>
      <TopRow onExit={onExit} objective={S.started ? <Objective icon={<Shield size={15} />} label={nextG ? `Sıradaki: ${nextG.name}` : 'Yazılıkaya’ya ulaş'} done={S.ritual.passed.length} total={GATES.length} /> : undefined} right={<>{S.started && <IconButton label="Sıradaki kapıya git (N)" onClick={goNext}><ChevronsRight size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; }} help={<Controls items={CONTROLS} />} onExit={onExit} /></>} />
      {S.warn && <p className="pointer-events-none absolute left-1/2 top-[68px] z-40 sm:top-[72px] -translate-x-1/2 rounded-xl bg-[#f7f5f1]/95 px-4 py-2 text-center text-sm font-semibold text-[#b5452f] shadow-[0_10px_30px_rgba(31,27,23,0.18)] ring-1 ring-black/5">{S.warn}</p>}
      {can && <button onPointerDown={(e) => e.stopPropagation()} onClick={perform} className="absolute bottom-24 left-1/2 z-40 flex h-12 -translate-x-1/2 animate-pulse items-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-xl" style={{ background: THEME.accent }}><DoorOpen size={18} /> Ritüeli yap: {ng?.name}<span className="hidden opacity-60 [@media(pointer:fine)]:inline">· E</span></button>}
      {S.started && !can && !S.dialog && !S.inspect && S.nearRelief && <button onPointerDown={(e) => e.stopPropagation()} onClick={() => inspect(S.nearRelief)} className="absolute bottom-24 left-1/2 z-40 flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-5 text-sm font-semibold shadow-xl"><Search size={18} /> Rölyefi incele<span className="hidden opacity-60 [@media(pointer:fine)]:inline">· E</span></button>}
      {S.dialog && <Dialog d={S.dialog} onNext={advance} />}
      {S.inspect && <ReliefCard r={RELIEFS[S.inspect]} onClose={() => inspect(null)} />}
      {S.started && <><Joystick stick={stick} onTouch={() => audio.unlock()} /><LookCrosshair locked={fpl.locked} /></>}
      {S.started && !S.dialog && !S.inspect && <Hint>Yürü ve bak · kapıda ya da kabartmada E<span className="hidden [@media(pointer:fine)]:inline"> · W/S · tıkla, fareyle bak · N: sıradaki kapı</span></Hint>}
      {!S.started && <TitleCard onExit={onExit} onStart={() => { audio.unlock(); S.set({ started: true }); }} />}
      {S.started && S.seen.includes('alay') && S.seen.includes('ana') && !S.endShown && !S.inspect && <EndCard onStay={() => S.set({ endShown: true })} onExit={onExit} />}
      </HudTheme>
    </div>
  );
}

/* ---------- 3B dünya ---------- */
function World({ tier, saver }: { tier: Tier; saver: boolean }) {
  const M = useMemo(() => ({ stone: erodedStone(saver), stoneSmall: erodedStone(saver, 0.5), mud: mudMaterial(), lo: new THREE.MeshLambertMaterial({ color: '#a8906c' }), wood: new THREE.MeshStandardMaterial({ color: '#6b4a2c', roughness: 0.85 }) }), [saver]);
  const dt = distantTerrain(tier, saver);
  return (
    <group>
      <Sky sunPosition={[SUN.x * 100, SUN.y * 100, SUN.z * 100]} turbidity={9} rayleigh={1.6} mieCoefficient={0.006} />
      <fog attach="fog" args={['#dccbaa', 300, tier === 'low' ? 1100 : 2200]} />
      <hemisphereLight args={['#f2e6cf', '#7d6a48', 0.9]} />
      <directionalLight position={SUN.clone().multiplyScalar(400).toArray()} intensity={2.2} color="#ffe2b8" />
      <Terrain tier={tier} />
      {dt.billboards && <MountainRing />}
      <WallStreamer tier={tier} M={M} />
      {GATES.map((g) => <GateBuilding key={g.id} g={g} M={M} tier={tier} saver={saver} />)}
      <Yazilikaya tier={tier} saver={saver} />
      {GATES.map((g) => <Guard key={g.id} g={g} />)}
      <Controller />
    </group>
  );
}
function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const S = tier === 'low' ? 1800 : 2800, N = tier === 'high' ? 220 : tier === 'medium' ? 170 : 110, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2); g.translate(150, 0, -300);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), steppe = new THREE.Color('#bfa96f'), green = new THREE.Color('#8f9256'), rock = new THREE.Color('#9b8c74'), r = rng(9);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = heightAt(x, z); p.setY(i, y); c.copy(steppe).lerp(green, Math.max(0, Math.sin(x * 0.004) * Math.cos(z * 0.005)) * 0.6).lerp(rock, r() < 0.12 ? 0.6 : 0); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  return <mesh geometry={geo}><meshStandardMaterial vertexColors roughness={1} /></mesh>;
}
/** Uzak dağlar: gerçek geometri yok — silindir pano + silüet dokusu (sise uygun soluk) */
function MountainRing() {
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = 2048; c.height = 256; const g = c.getContext('2d')!, r = rng(3); g.clearRect(0, 0, 2048, 256);
    for (const [col, base, amp] of [['#b9b49e', 150, 90], ['#a39c84', 190, 60]] as [string, number, number][]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, 256); let y: number = base; for (let x = 0; x <= 2048; x += 16) { y = Math.max(40, Math.min(240, y + (r() - 0.5) * amp * 0.4)); g.lineTo(x, y); } g.lineTo(2048, 256); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); return t; }, []);
  return <mesh position={[150, 60, -300]}><cylinderGeometry args={[2600, 2600, 420, 48, 1, true]} /><meshBasicMaterial map={tex} transparent side={THREE.BackSide} fog={false} depthWrite={false} color="#e6dcc6" /></mesh>;
}

/* ---------- sur akışı: parça başına 'hi' / 'lo' / 'off' ---------- */
const gateSkip = (i: number) => GATES.some((g) => { const d = Math.abs(i - g.idx), N = WALL.length; return Math.min(d, N - d) < 3; });
type Mats = { stone: THREE.Material; stoneSmall: THREE.Material; mud: THREE.Material; lo: THREE.Material; wood: THREE.Material };
function WallStreamer({ tier, M }: { tier: Tier; M: Mats }) {
  const [plan, setPlan] = useState<Map<number, ChunkLevel>>(() => new Map()), prev = useRef<Map<number, ChunkLevel>>(new Map()), acc = useRef(1);
  useFrame((_, dt) => { acc.current += dt; if (acc.current < 0.5) return; acc.current = 0; const p = routeAt(live.s).p, next = streamPlan(p[0], p[2], tier, prev.current);
    let changed = next.size !== prev.current.size; next.forEach((v, k) => { if (prev.current.get(k) !== v) changed = true; }); prev.current = next; if (changed) setPlan(next); });
  return <>{CHUNKS.map((c) => { const lv = plan.get(c.id) ?? 'off'; return lv === 'hi' ? <HiChunk key={`h${c.id}`} i0={c.i0} i1={c.i1} M={M} tier={tier} /> : lv === 'lo' ? <LoChunk key={`l${c.id}`} i0={c.i0} i1={c.i1} M={M} /> : null; })}</>;
}
const MERLON = merlonGeometry(), TOWER_LO = new THREE.BoxGeometry(8, 1, 7);
function HiChunk({ i0, i1, M, tier }: { i0: number; i1: number; M: Mats; tier: Tier }) {
  const g = useMemo(() => ({ socle: wallStrip(i0, i1, -WALL_DIM.sink, WALL_DIM.socle, WALL_DIM.thick, 0.4, gateSkip), brick: wallStrip(i0, i1, WALL_DIM.socle, WALL_DIM.socle + WALL_DIM.brick, WALL_DIM.thick - 0.8, 0.2, gateSkip),
    towers: towerMatrices(i0, i1, gateSkip), merlons: tier === 'low' ? [] : merlonMatrices(i0, i1, gateSkip) }), [i0, i1, tier]);
  useEffect(() => () => { g.socle.dispose(); g.brick.dispose(); }, [g]);   // parça boşaltılınca GPU belleği serbest
  const ts = useRef<THREE.InstancedMesh>(null), tb = useRef<THREE.InstancedMesh>(null), mr = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const o = new THREE.Matrix4(), sc = new THREE.Matrix4();
    g.towers.forEach((m, i) => { ts.current?.setMatrixAt(i, o.copy(m).multiply(sc.makeTranslation(0, WALL_DIM.socle / 2 - 0.6, 0)).multiply(new THREE.Matrix4().makeScale(1, WALL_DIM.socle + 1.2, 1))); tb.current?.setMatrixAt(i, o.copy(m).multiply(sc.makeTranslation(0, WALL_DIM.socle + 3.6, 0)).multiply(new THREE.Matrix4().makeScale(0.92, 7.2, 0.92))); });
    g.merlons.forEach((m, i) => mr.current?.setMatrixAt(i, m));
    for (const x of [ts.current, tb.current, mr.current]) if (x) { x.instanceMatrix.needsUpdate = true; x.computeBoundingSphere(); } }, [g]);
  return (<group>
    <mesh geometry={g.socle} material={M.stone} /><mesh geometry={g.brick} material={M.mud} />
    {g.towers.length > 0 && <instancedMesh ref={ts} args={[TOWER_LO, M.stoneSmall, g.towers.length]} />}
    {g.towers.length > 0 && <instancedMesh ref={tb} args={[TOWER_LO, M.mud, g.towers.length]} />}
    {g.merlons.length > 0 && <instancedMesh ref={mr} args={[MERLON, M.mud, g.merlons.length]} />}
  </group>);
}
function LoChunk({ i0, i1, M }: { i0: number; i1: number; M: Mats }) {
  const g = useMemo(() => ({ strip: wallStrip(i0, i1, -WALL_DIM.sink, WALL_DIM.socle + WALL_DIM.brick, WALL_DIM.thick, 0.3, gateSkip), towers: towerMatrices(i0, i1, gateSkip) }), [i0, i1]);
  useEffect(() => () => g.strip.dispose(), [g]);
  const t = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const s = new THREE.Matrix4(); g.towers.forEach((m, i) => t.current?.setMatrixAt(i, s.copy(m).multiply(new THREE.Matrix4().makeTranslation(0, 6, 0)).multiply(new THREE.Matrix4().makeScale(1, 13, 1)))); if (t.current) { t.current.instanceMatrix.needsUpdate = true; t.current.computeBoundingSphere(); } }, [g]);
  return (<group><mesh geometry={g.strip} material={M.lo} />{g.towers.length > 0 && <instancedMesh ref={t} args={[TOWER_LO, M.lo, g.towers.length]} />}</group>);
}

/* ---------- kapı yapıları ---------- */
/** Parabolik kemerli geçit duvarı (Hitit kapılarında iri bloklarla oluşturulan parabol biçimli açıklık) */
function archWall(w: number, h: number, ow: number, oh: number, d: number) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath();
  const hole = new THREE.Path(); hole.moveTo(-ow / 2, 0); for (let i = 0; i <= 20; i++) { const x = -ow / 2 + (ow * i) / 20, y = oh * (1 - ((2 * x) / ow) ** 2) ** 0.6; hole.lineTo(x, Math.max(0, y)); } hole.lineTo(ow / 2, 0); hole.closePath(); s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3); return g;
}
function GateBuilding({ g, M, tier, saver }: { g: Gate; M: Mats; tier: Tier; saver: boolean }) {
  const y = heightAt(g.at[0], g.at[1]), yaw = Math.atan2(g.inward[0], g.inward[1]), arch = useMemo(() => archWall(16, WALL_DIM.socle + WALL_DIM.brick + 2, 4, 6.8, 2.4), []);
  const left = useRef<THREE.Group>(null), right = useRef<THREE.Group>(null), creaked = useRef(false);
  const relief = useMemo(() => (g.id === 'kral' ? reliefMaterial({ kind: 'warrior', aspect: [1, 2], pom: tier !== 'low' && !saver, steps: tier === 'high' ? 24 : 12, gold: 0, sun: SUN }) : null), [g.id, tier, saver]);
  useFrame(({ clock }) => { const o = doorOpen(useDb.getState().ritual, g.id); if (o > 0 && !creaked.current) { creaked.current = true; audio.creak(); }
    if (left.current) left.current.rotation.y = o * 1.35; if (right.current) right.current.rotation.y = -o * 1.35;
    if (relief && 'uniforms' in relief && relief.uniforms) { const st = useDb.getState(); relief.uniforms.uTime.value = clock.elapsedTime; if (st.inspect === 'kral') { const a = clock.elapsedTime * 0.5; relief.uniforms.uSun.value.set(Math.cos(a) * 0.8, 0.35, Math.sin(a) * 0.8 + 0.2).normalize(); } } });
  return (
    <group position={[g.at[0], y - 1, g.at[1]]} rotation-y={yaw}>
      {/* iki dış ve iç kemerli duvar + yanlarda kuleler; geçit içte (yerel z: + kente doğru) */}
      <mesh geometry={arch} material={M.stone} position={[0, 0, -3.6]} /><mesh geometry={arch} material={M.stone} position={[0, 0, 3.6]} />
      {[-1, 1].map((k) => <mesh key={k} material={M.stone} position={[k * 6.5, 7, 0]}><boxGeometry args={[5, 14, 10]} /></mesh>)}
      {[-1, 1].map((k) => <mesh key={`r${k}`} material={M.mud} position={[k * 6.5, 15, 0]}><boxGeometry args={[4.6, 4, 9.4]} /></mesh>)}
      <mesh material={M.mud} position={[0, WALL_DIM.socle + WALL_DIM.brick + 2.6, 0]}><boxGeometry args={[8, 2.4, 9.6]} /></mesh>
      {/* geçit yan duvarları ve zemin */}
      {[-1, 1].map((k) => <mesh key={`p${k}`} material={M.stone} position={[k * 2.6, 3.5, 0]}><boxGeometry args={[1.2, 7, 7.2]} /></mesh>)}
      <mesh position={[0, 1.02, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[4, 9]} /><meshStandardMaterial color="#9a8a70" roughness={1} /></mesh>
      {/* ahşap kanatlar: menteşe kenarlarda, içe açılır */}
      <group ref={left} position={[-2, 1, 0]}><mesh material={M.wood} position={[1, 3, 0]}><boxGeometry args={[2, 6, 0.25]} /></mesh></group>
      <group ref={right} position={[2, 1, 0]}><mesh material={M.wood} position={[-1, 3, 0]}><boxGeometry args={[2, 6, 0.25]} /></mesh></group>
      {g.id === 'aslanli' && [-1, 1].map((k) => <Lion key={k} x={k * 2.9} z={-4.9} />)}
      {g.id === 'sfenksli' && [-1, 1].map((k) => <Sphinx key={k} x={k * 2.9} z={4.9} />)}
      {relief && <mesh ref={(m) => { PANELS.kral = m; }} material={relief} position={[-1.98, 3.4, 2.2]} rotation-y={Math.PI / 2}><planeGeometry args={[2.2, 4.2]} /></mesh>}
    </group>
  );
}
/** Aslan protomu: kapı söveli taştan öne çıkan baş ve ön gövde (stilize) */
function Lion({ x, z }: { x: number; z: number }) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b3a387', roughness: 0.9 }), []);
  return (<group position={[x, 2.6, z]} rotation-y={Math.PI}>
    <mesh material={m} position={[0, 0, 0.4]} scale={[1, 1.6, 1.2]}><sphereGeometry args={[0.9, 14, 10]} /></mesh>
    <mesh material={m} position={[0, 1.4, 1.1]}><sphereGeometry args={[0.72, 14, 10]} /></mesh>
    <mesh material={m} position={[0, 1.2, 1.7]}><boxGeometry args={[0.6, 0.5, 0.6]} /></mesh>
    <mesh material={m} position={[0, 1.45, 0.95]} rotation-x={Math.PI / 2}><torusGeometry args={[0.72, 0.2, 8, 16]} /></mesh>
    {[-0.25, 0.25].map((k) => <mesh key={k} position={[k, 1.6, 1.68]}><sphereGeometry args={[0.08, 6, 6]} /><meshStandardMaterial color="#3a3026" /></mesh>)}
    <mesh material={m} position={[0, -1.6, 0.9]}><boxGeometry args={[0.9, 1.4, 0.8]} /></mesh>
  </group>);
}
function Sphinx({ x, z }: { x: number; z: number }) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b8a98c', roughness: 0.9 }), []);
  return (<group position={[x, 2.4, z]}>
    <mesh material={m} position={[0, 0, 0.6]} scale={[0.9, 1.2, 1.6]}><sphereGeometry args={[0.9, 14, 10]} /></mesh>
    <mesh material={m} position={[0, 1.5, 1.3]}><sphereGeometry args={[0.5, 14, 10]} /></mesh>
    <mesh material={m} position={[0, 2.05, 1.25]}><cylinderGeometry args={[0.25, 0.45, 0.6, 10]} /></mesh>
    {[-1, 1].map((k) => <mesh key={k} material={m} position={[k * 0.5, 1.1, 1.2]} rotation-z={k * 0.2}><boxGeometry args={[0.18, 1.2, 0.5]} /></mesh>)}
  </group>);
}
function Guard({ g }: { g: Gate }) {
  const rig = useMemo(() => { const side = g.dirOut ? 1 : -1, x = g.at[0] + g.inward[0] * 7 * side + g.inward[1] * 3.2, z = g.at[1] + g.inward[1] * 7 * side - g.inward[0] * 3.2; const r = newRig(x, z, 0); r.y = heightAt(x, z); return { current: r }; }, [g]);
  useFrame(() => { const r = rig.current, d = useDb.getState().dialog, p = live.rig; r.talking = d?.gate === g.id; r.mouth = r.talking ? Math.max(0, Math.sin(performance.now() * 0.015) * 0.6) : 0; r.yaw = Math.atan2(-(p.x - r.x), -(p.z - r.z)); r.look = r.talking ? new THREE.Vector3(p.x, p.y + 1.6, p.z) : null; });
  return <Character rig={rig as React.MutableRefObject<RigState>} palette={GUARD} />;
}

/* ---------- Yazılıkaya: kaya kütleleri + kabartma panoları ---------- */
export const YAZ_FRAME = (() => { const end = routeAt(ROUTE_LEN), d = end.dir; return { x: YAZILIKAYA.x + d[0] * 10, z: YAZILIKAYA.z + d[1] * 10, yaw: Math.atan2(-d[0], -d[1]) }; })();
function Yazilikaya({ tier, saver }: { tier: Tier; saver: boolean }) {
  const y = heightAt(YAZ_FRAME.x, YAZ_FRAME.z), pom = tier !== 'low' && !saver;
  const mats = useMemo(() => ({ alay: reliefMaterial({ kind: 'procession', aspect: [4, 1], pom, steps: tier === 'high' ? 24 : 12, gold: 0.25, sun: SUN }), ana: reliefMaterial({ kind: 'main', aspect: [1.3, 1], pom, steps: tier === 'high' ? 24 : 12, gold: 0.35, sun: SUN }) }), [pom, tier]);
  const rocks = useMemo(() => { const r = rng(17); return [[-10.5, 0, 0, 5.5, 6, 7], [10, 0, 0, 5, 5.5, 7], [0, 0, -11.5, 10, 6, 4], [-13, 0, -9, 6, 8, 6], [13, 0, -9, 6, 7, 6], [-9, 0, 9, 4, 3, 4]].map(([x, yy, z, sx, sy, sz], i) => ({ x, y: yy, z, s: [sx, sy, sz] as [number, number, number], g: rockGeometry(31 + i), rot: r() * 0.6 })); }, []);
  const rockMat = useMemo(() => { const m = erodedStone(saver, 0.4); m.color = new THREE.Color('#cbbd9f'); return m; }, [saver]);
  useFrame(({ clock }) => { const st = useDb.getState(); for (const [id, m] of [['alay', mats.alay], ['ana', mats.ana]] as const) { if (!('uniforms' in m) || !m.uniforms) continue; m.uniforms.uTime.value = clock.elapsedTime;
    if (st.inspect === id) { const a = clock.elapsedTime * 0.45; m.uniforms.uSun.value.set(Math.cos(a) * 0.85, 0.3, 0.5 + Math.sin(a) * 0.3).normalize(); } else m.uniforms.uSun.value.copy(SUN); } });
  return (
    <group position={[YAZ_FRAME.x, y, YAZ_FRAME.z]} rotation-y={YAZ_FRAME.yaw}>
      {rocks.map((k, i) => <mesh key={i} geometry={k.g} material={rockMat} position={[k.x, k.y + k.s[1] * 0.35, k.z]} scale={k.s} rotation-y={k.rot} />)}
      {/* alay paneli sol kayanın iç yüzünde, ana sahne arka kayada; üst kenar ≈ 4,6 m (kamera bunun altında kalır) */}
      <mesh ref={(m) => { PANELS.alay = m; }} material={mats.alay} position={[-3.6, 2.4, 1]} rotation-y={Math.PI / 2}><planeGeometry args={[9, 2.3]} /></mesh>
      <mesh ref={(m) => { PANELS.ana = m; }} material={mats.ana} position={[0, 2.4, -6.3]}><planeGeometry args={[4.2, 3.2]} /></mesh>
    </group>
  );
}
/** İncelenebilir kabartma panoları (mesh başvuruları): kamera konumu ve yüzey normali buradan okunur */
const PANELS: Record<string, THREE.Mesh | null> = { kral: null, alay: null, ana: null };

/* ---------- hareket + ritüel + kamera ---------- */
const _c = new THREE.Vector3(), _l = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
function Controller() {
  const { camera } = useThree(); if (location.search.includes('debug')) (window as unknown as { __hcam: unknown }).__hcam = camera;
  const cam = useRef({ p: new THREE.Vector3(-200, 90, 160), q: new THREE.Quaternion() }), st = useRef({ step: 0, au: 0, near: '' as string });
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useDb.getState();
    // ritüel zaman akışı + konuşma başlangıcı
    let rit = tick(S.ritual, Math.min(raw, 0.25), live.speechDone);   // ritüel süreleri gerçek zamanla (düşük kare hızında da 2 sn eğilme) if (live.speechDone) live.speechDone = false;
    for (const g of GATES) if (S.ritual.phase[g.id] === 'bow' && rit.phase[g.id] === 'speech') { S.set({ dialog: { gate: g.id, i: 0 } }); if (useSettings.getState().tts) audio.speak(SPEECH[g.id].lines[0]); }
    // hareket (ritüel/konuşma/inceleme sırasında durur)
    const busy = !!S.dialog || !!S.inspect || GATES.some((g) => ['bow', 'speech', 'opening'].includes(rit.phase[g.id]));
    const R0 = routeAt(live.s), facing = -Math.sin(live.view.yaw) * R0.dir[0] - Math.cos(live.view.yaw) * R0.dir[1] >= -0.15 ? 1 : -1;   // bakılan yöne göre rotada ileri/geri
    let want = S.started && !busy && !pause.on ? live.input * WALK * facing : 0;
    if (live.auto !== null && !busy) { const d = live.auto - live.s; if (Math.abs(d) < 0.4) live.auto = null; else want = Math.sign(d) * Math.min(AUTO, Math.abs(d) * 1.5 + 1); }
    live.v += (want - live.v) * (1 - Math.exp(-dt * 5));
    const r = guard(rit, live.s, live.s + live.v * dt); rit = r.st; const before = live.s; live.s = Math.max(0, Math.min(ROUTE_LEN, r.s)); if (r.warn && Math.abs(live.v) > 0.3) { live.warnT = 2.5; if (S.warn !== r.warn.text) S.set({ warn: r.warn.text }); live.auto = null; }
    live.warnT -= dt; if (live.warnT <= 0 && S.warn) S.set({ warn: null });
    const key = (x: RitualState) => GATES.map((g) => x.phase[g.id]).join() + '|' + x.passed.join();
    if (key(rit) !== key(S.ritual)) S.set({ ritual: rit }); else S.ritual.t = rit.t;   // süreler yerinde güncellenir (yeniden çizim yok)
    const R = routeAt(live.s), moved = live.s - before, rg = live.rig;
    rg.x = R.p[0]; rg.y = R.p[1]; rg.z = R.p[2]; rg.speed = dt > 0 ? Math.abs(moved) / dt : 0;
    if (Math.abs(moved) > 1e-4) { const yw = Math.atan2(-R.dir[0] * Math.sign(moved), -R.dir[1] * Math.sign(moved)); rg.yaw += Math.atan2(Math.sin(yw - rg.yaw), Math.cos(yw - rg.yaw)) * (1 - Math.exp(-dt * 8)); }
    const bowing = GATES.find((g) => rit.phase[g.id] === 'bow'); rg.point = bowing ? new THREE.Vector3(bowing.at[0], R.p[1] + 1.2, bowing.at[1]) : null;   // sunu jesti: el kapıya uzanır
    const nearestWall = distToWall(R.p[0], R.p[2]), stone = nearestWall < 9;
    st.current.step += Math.abs(moved); if (st.current.step > 0.8) { st.current.step = 0; audio.step(stone); }
    // yakın kabartma
    const kral = GATES[2], nearKral = Math.abs(live.s - (kral.s - 3)) < 6 && rit.phase.kral !== 'closed' ? 'kral' : null, inYaz = live.s > YAZ_S - 6;
    const nr = nearKral ?? (inYaz ? (S.seen.includes('alay') ? 'ana' : 'alay') : null); if ((nr ?? '') !== st.current.near) { st.current.near = nr ?? ''; S.set({ nearRelief: nr }); }
    // kamera
    if (!S.started) {
      _c.set(R.p[0] - 60, R.p[1] + 40, R.p[2] + 70); _l.set(GATES[0].at[0], R.p[1] + 8, GATES[0].at[1]);
      const k = 1 - Math.exp(-dt * 5), C = cam.current;
      if (C.p.distanceTo(_c) > 60) C.p.copy(_c); else C.p.lerp(_c, k); _q.setFromRotationMatrix(_m.lookAt(C.p, _l, THREE.Object3D.DEFAULT_UP)); C.q.slerp(_q, k);
      camera.position.copy(C.p); camera.quaternion.copy(C.q);
    } else {   // birinci şahıs: göz hizası; ritüelde eğilince göz alçalır
      if (!live.aimed) { live.aimed = true; live.view.yaw = Math.atan2(-R.dir[0], -R.dir[1]); live.view.pitch = 0.05; }
      live.bob += Math.abs(moved) * 3.1; const eye = R.p[1] + (bowing ? 1.2 : 1.62) + (rg.speed > 0.1 ? Math.sin(live.bob) * 0.03 : 0);
      applyFp(camera, R.p[0], Math.max(eye, heightAt(R.p[0], R.p[2]) + 1.1), R.p[2], live.view);
      const pc = camera as THREE.PerspectiveCamera; if (Math.abs(pc.fov - 64) > 0.1) { pc.fov += (64 - pc.fov) * (1 - Math.exp(-dt * 5)); pc.updateProjectionMatrix(); }
    }
    st.current.au += dt; if (st.current.au > 0.2) { audio.update(Math.min(1, Math.max(0, (nearestWall - 6) / 30)), st.current.au); st.current.au = 0; }
  });
  return null;
}

/* ---------- arayüz ---------- */
function Dialog({ d, onNext }: { d: { gate: GateId; i: number }; onNext: () => void }) {
  const sp = SPEECH[d.gate];
  return (
    <button onPointerDown={(e) => e.stopPropagation()} onClick={onNext} className="absolute inset-x-3 bottom-4 z-40 mx-auto block max-w-xl rounded-2xl bg-[#f7f5f1]/92 text-[#1f1b17] ring-1 ring-black/5 p-4 text-left shadow-[0_10px_30px_rgba(31,27,23,0.18)]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a8622f]">{sp.who} · kurgusal söz</p>
      <p className="mt-1 text-base leading-relaxed">{sp.lines[d.i]}</p>
      <p className="mt-2 text-right text-xs text-[#857b70]">dokun: devam</p>
    </button>
  );
}
function ReliefCard({ r, onClose }: { r: Relief; onClose: () => void }) {
  return <InfoSheet kicker="Rölyef inceleme" title={r.name} text={r.text} source={r.source} onClose={onClose} onListen={() => audio.speak(`${r.name}. ${r.text}`)} />;
}
const THEME = { accent: '#a8622f' };
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da W/S: yolda yürü (bakılan yöne)</> },
  { icon: <Move size={16} />, text: <>Bilgisayarda tıkla, fareyle bak · telefonda ekranı sürükle</> },
  { icon: <ChevronsRight size={16} />, text: <>≫ ya da N: sıradaki kapıya git</> },
  { icon: <Info size={16} />, text: <>kapıda E: “Ritüeli yap”</> },
  { icon: <Info size={16} />, text: <>kabartmada E: “Rölyefi incele”</> },
];
function TitleCard({ onStart, onExit }: { onStart: () => void; onExit?: () => void }) {
  return <StartSheet kicker="Çorum · Boğazkale · MÖ 1300 · UNESCO Dünya Mirası" title="Hattuşa: Kralın Yolu" intro={<>Hitit başkentinde bir elçisin. Saraydaki kabulden çıktın; yolun Yazılıkaya’ya. Her kapıda bekçiye saygını göster ve ritüeli yap: ritüelsiz kapı açılmaz, elçi geri dönmez.</>} controls={CONTROLS} note="Kent planı stilizedir; rota ve bekçi sözleri kurgusaldır. Kaynaklar kartlarda." cta="Yola çık" ctaIcon={<Shield size={18} />} onStart={onStart} onExit={onExit} />;
}
function EndCard({ onStay, onExit, onRestart }: { onStay: () => void; onExit: () => void; onRestart?: () => void }) {
  return <EndSheet kicker="Yazılıkaya’ya ulaştın" title="Kralın yolu tamam" text="Üç kapının ritüelini yerine getirdin ve tanrıların kayasına saygıyla vardın." stayLabel="Biraz daha kal" onStay={onStay} onExit={onExit} onRestart={onRestart} />;
}
function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/Hattu%C5%9Fa%C5%9F').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  const r = RELIEFS.kral;
  return (
    <div className="fixed inset-0 bg-[#2a2016] text-white">
      {img && <img src={img} alt="Hattuşa" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/80 p-4"><p className="text-xs text-white/60">Bu cihazda 3D (WebGL2) desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p><h2 className="mt-1 text-lg font-bold">{r.name}</h2><p className="mt-1 text-sm">{r.text}</p></div>
    </div>
  );
}
