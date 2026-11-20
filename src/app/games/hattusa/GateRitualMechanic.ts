/**
 * Hattuşa — Sınır Geçiş Ritüeli (saf; test edilir).
 *
 * NEDEN: Hitit metinlerinde kapılar kutsal sınırlardır. Kent kapılarında tanrılara sunu yapıldığı, kapı bekçilerinin geceleri kapıları
 * mühürlediği bilinir (ör. "Muhafızlar Talimatnamesi" olarak anılan Hitit metinleri). Oyunda bu, geçişten önce yapılması gereken
 * kısa bir ritüele dönüşür. Ritüelin sözleri kurgusaldır; metinlerden alıntı değildir.
 *
 * KURAL:
 *  1) Kapıya yaklaşınca (geçidin 14 m öncesi) ritüel istemi açılır. Ritüel yapılmadan kapı KAPALIDIR: oyuncu geçidin 1,5 m önünde durur
 *     ("çarpışma"), uyarı gösterilir.
 *  2) Ritüel: eğilme (2 sn, kamera alçalır) → bekçinin sözleri → kanatlar açılır (2,5 sn). Sonra geçiş serbest.
 *  3) Yanlış yön: geçilmiş bir kapıdan 20 m'den fazla geri dönülemez (elçi geri dönmez); oyuncu orada durur, uyarı verilir.
 *  4) Kapılar sırayla: bir kapının ritüeli, öncekiler geçilmeden yapılamaz.
 */
import { GATES, type Gate, type GateId } from './site';

export type RitualPhase = 'closed' | 'bow' | 'speech' | 'opening' | 'open';
export interface RitualState { phase: Record<GateId, RitualPhase>; t: Record<GateId, number>; passed: GateId[] }
export const newRitual = (): RitualState => ({ phase: { aslanli: 'closed', sfenksli: 'closed', kral: 'closed' }, t: { aslanli: 0, sfenksli: 0, kral: 0 }, passed: [] });

export const APPROACH = 14, STOP = 1.5, BACK_LIMIT = 20, BOW_T = 2, OPEN_T = 2.5;

/** Sıradaki (henüz geçilmemiş) kapı */
export const nextGate = (st: RitualState): Gate | null => GATES.find((g) => !st.passed.includes(g.id)) ?? null;
/** Ritüel istemi gösterilsin mi: sıradaki kapının yaklaşma bölgesinde ve kapı kapalı */
export function canPerform(st: RitualState, s: number): Gate | null {
  const g = nextGate(st); if (!g || st.phase[g.id] !== 'closed') return null;
  return s > g.s - APPROACH && s < g.s + 1 ? g : null;
}
/** Ritüeli başlat */
export function begin(st: RitualState, id: GateId): RitualState { if (st.phase[id] !== 'closed') return st; return { ...st, phase: { ...st.phase, [id]: 'bow' }, t: { ...st.t, [id]: 0 } }; }
/** Zaman ilerlet: bow → speech (konuşma bitince dışarıdan 'speechDone' ile) → opening → open */
export function tick(st: RitualState, dt: number, speechDone: boolean): RitualState {
  const ph = { ...st.phase }, t = { ...st.t };
  for (const g of GATES) {
    t[g.id] += dt;
    if (ph[g.id] === 'bow' && t[g.id] > BOW_T) { ph[g.id] = 'speech'; t[g.id] = 0; }
    else if (ph[g.id] === 'speech' && speechDone) { ph[g.id] = 'opening'; t[g.id] = 0; }
    else if (ph[g.id] === 'opening' && t[g.id] > OPEN_T) { ph[g.id] = 'open'; t[g.id] = 0; }
  }
  return { ...st, phase: ph, t };
}
/** Kapı kanatlarının açıklığı (0 kapalı … 1 açık) — yumuşak */
export function doorOpen(st: RitualState, id: GateId): number {
  if (st.phase[id] === 'open') return 1; if (st.phase[id] !== 'opening') return 0;
  const k = Math.min(1, st.t[id] / OPEN_T); return k * k * (3 - 2 * k);
}
export type Warning = null | { kind: 'kapali' | 'geri'; text: string };
/**
 * Hareket sınırı: istenen s'yi kapı kuralına göre kısıtlar ve geçilen kapıları işaretler.
 * Dönüş: yeni s, güncellenmiş durum, uyarı (varsa).
 */
export function guard(st: RitualState, prevS: number, wantS: number): { s: number; st: RitualState; warn: Warning } {
  let s = wantS, warn: Warning = null, next = st;
  const g = nextGate(st);
  if (g && st.phase[g.id] !== 'open' && s > g.s - STOP) { s = Math.min(Math.max(prevS, g.s - STOP - 3), g.s - STOP); warn = { kind: 'kapali', text: `${g.name} kapalı. Bekçiye saygını göster: ritüeli yap.` }; }
  const last = [...GATES].reverse().find((x) => st.passed.includes(x.id));
  if (last && s < last.s - BACK_LIMIT) { s = last.s - BACK_LIMIT; warn = { kind: 'geri', text: 'Elçi geri dönmez. Yolun Yazılıkaya’ya.' }; }
  if (g && st.phase[g.id] === 'open' && s > g.s + 3) next = { ...st, passed: [...st.passed, g.id] };
  return { s, st: next, warn };
}

/** Bekçi sözleri (kurgusal; Hitit dönemi atmosferi için yazıldı, gerçek metin değildir) */
export const SPEECH: Record<GateId, { who: string; lines: string[] }> = {
  aslanli: { who: 'Kapı bekçisi', lines: ['Dur, elçi. Aslanlar bu kapıyı kötülükten korur.', 'Mührünü gördüm. Kralın yolu açık; selametle çık.'] },
  sfenksli: { who: 'Tapınak görevlisi', lines: ['Burası kentin en yüksek kapısı. Sfenksler Yukarı Şehir’i, tanrıların evlerini gözetir.', 'Saygın kabul edildi. Gir ve tapınakların arasından geç.'] },
  kral: { who: 'Kapı bekçisi', lines: ['Kapının iç yüzünde savaşçı tanrı nöbet tutar.', 'Yazılıkaya yolu buradan başlar. Tanrıların kayasına saygıyla var.'] },
};
