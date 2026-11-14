/**
 * Galata Kulesi — merdiven: tırmanış ritmi (saf mantık; React ve three.js'e bağımlı değildir, test edilir).
 *
 * Neden bu mekanik: Kulenin içinde dar ve dönen bir merdivenle yukarı çıkmak yavaş, ritmik bir iştir.
 * Oyuncu her vuruşta (adım sesi + halka nabzı) yukarı kaydırarak bir basamak çıkar; her sahanlıkta
 * pencerenin önünde durup bir nefes alır (basılı tut). Kaçırılan vuruş cezalandırılmaz: basamak sayılmaz
 * ve üst üste kaçırılırsa tempo yavaşlar. Kaybetme yok — amaç acele etmeden, nefesle uyumlu çıkmak.
 */
export const START_BEAT = 0.8;           // sn / vuruş (75 vuruş/dk, sakin yürüyüş)
export const SLOWEST_BEAT = 1.15;        // art arda kaçırınca tempo en fazla buraya kadar yavaşlar
export const PERFECT = 0.16;             // vuruşa ± bu kadar yakınsa "tam"
export const GOOD = 0.3;                 // ± bu kadar yakınsa "iyi"
export const STEPS_PER_FLIGHT = 16;      // oyunda bir sahanlıktan diğerine (gerçek basamak sayısı değildir)
export const FLIGHTS = 3;
export const TOTAL_STEPS = STEPS_PER_FLIGHT * FLIGHTS;
export const BREATH_MIN = 2.6;           // nefes: en az bu kadar basılı tutulmalı (≈ 3–4 vuruş)
export const BREATH_FULL = 3.2;          // halkanın tamamen dolduğu süre

export type Judgement = 'tam' | 'iyi' | 'erken' | 'gec';
export type ClimbPhase = 'climb' | 'breath' | 'done';

export interface ClimbState {
  phase: ClimbPhase;
  steps: number;          // çıkılan basamak
  beat: number;           // geçerli vuruş aralığı (sn)
  origin: number;         // vuruş ızgarasının başlangıç zamanı
  combo: number;
  misses: number;         // art arda kaçırma
  holdStart: number | null;
  perfect: number; good: number; missed: number; breaths: number;
}
export type ClimbEvent =
  | { type: 'step'; judgement: 'tam' | 'iyi'; steps: number }
  | { type: 'miss'; judgement: 'erken' | 'gec' }
  | { type: 'landing'; flight: number }     // sahanlığa varıldı → nefes zamanı
  | { type: 'breath-short' }                // erken bırakıldı, yeniden dene (ceza yok)
  | { type: 'breath-done'; flight: number }
  | { type: 'tempo'; beat: number }
  | { type: 'top' };

export function createClimb(now = 0): ClimbState {
  return { phase: 'climb', steps: 0, beat: START_BEAT, origin: now, combo: 0, misses: 0, holdStart: null, perfect: 0, good: 0, missed: 0, breaths: 0 };
}

/** t anına en yakın vuruşa uzaklık (sn, işaretli: negatif = erken) */
export function offset(s: ClimbState, t: number): number {
  const k = Math.round((t - s.origin) / s.beat);
  return t - (s.origin + k * s.beat);
}
/** 0..1: geçerli vuruşun ne kadarı geçti (arayüzdeki nabız halkası için) */
export function beatPhase(s: ClimbState, t: number): number {
  const x = (t - s.origin) / s.beat;
  return x - Math.floor(x);
}

export function judge(off: number): Judgement {
  const a = Math.abs(off);
  if (a <= PERFECT) return 'tam';
  if (a <= GOOD) return 'iyi';
  return off < 0 ? 'erken' : 'gec';
}

/** Yukarı kaydırma / boşluk tuşu: bir basamak çıkma denemesi */
export function stepInput(prev: ClimbState, t: number): { state: ClimbState; events: ClimbEvent[] } {
  if (prev.phase !== 'climb') return { state: prev, events: [] };
  const s = { ...prev }, events: ClimbEvent[] = [];
  const j = judge(offset(s, t));
  if (j === 'tam' || j === 'iyi') {
    s.steps += 1; s.combo += 1; s.misses = 0;
    if (j === 'tam') s.perfect += 1; else s.good += 1;
    events.push({ type: 'step', judgement: j, steps: s.steps });
    if (s.steps >= TOTAL_STEPS) { s.phase = 'done'; events.push({ type: 'top' }); }
    else if (s.steps % STEPS_PER_FLIGHT === 0) { s.phase = 'breath'; events.push({ type: 'landing', flight: s.steps / STEPS_PER_FLIGHT }); }
  } else {
    s.combo = 0; s.misses += 1; s.missed += 1;
    events.push({ type: 'miss', judgement: j });
    if (s.misses >= 3 && s.beat < SLOWEST_BEAT) {
      // tempoyu yavaşlat; ızgarayı şimdiki ana hizala ki bir sonraki vuruş tam bir aralık sonra gelsin
      s.beat = Math.min(SLOWEST_BEAT, +(s.beat + 0.1).toFixed(2)); s.origin = t; s.misses = 0;
      events.push({ type: 'tempo', beat: s.beat });
    }
  }
  return { state: s, events };
}

/** Nefes: sahanlıkta basılı tutmaya başla */
export function holdStart(prev: ClimbState, t: number): ClimbState {
  return prev.phase === 'breath' ? { ...prev, holdStart: t } : prev;
}
/** 0..1 nefes halkasının doluluğu */
export function breathFill(s: ClimbState, t: number): number {
  return s.phase === 'breath' && s.holdStart !== null ? Math.min(1, (t - s.holdStart) / BREATH_FULL) : 0;
}
/** Nefes: bırak. Yeterince uzun tutulduysa tırmanış sürer ve vuruş ızgarası bırakma anına hizalanır. */
export function holdEnd(prev: ClimbState, t: number): { state: ClimbState; events: ClimbEvent[] } {
  if (prev.phase !== 'breath' || prev.holdStart === null) return { state: prev, events: [] };
  const held = t - prev.holdStart;
  if (held < BREATH_MIN) return { state: { ...prev, holdStart: null }, events: [{ type: 'breath-short' }] };
  const flight = prev.steps / STEPS_PER_FLIGHT;
  return { state: { ...prev, phase: 'climb', holdStart: null, origin: t, breaths: prev.breaths + 1, combo: 0 }, events: [{ type: 'breath-done', flight }] };
}

/** Basılı tutarken halka dolunca kendiliğinden bırakılmış sayılır (oyuncunun ne zaman bırakacağını düşünmesine gerek yok) */
export function tick(prev: ClimbState, t: number): { state: ClimbState; events: ClimbEvent[] } {
  if (prev.phase === 'breath' && prev.holdStart !== null && t - prev.holdStart >= BREATH_FULL - 1e-6) return holdEnd(prev, t);
  return { state: prev, events: [] };
}

/** Kat sayacı: 0 = zemin, 1..FLIGHTS */
export const flightOf = (s: ClimbState) => Math.min(FLIGHTS, Math.floor(s.steps / STEPS_PER_FLIGHT));
