/**
 * Diyalog sistemi — saf mantık (React'e bağımlı değil, test edilir).
 * Veri: dialogues.json. Satırlar daktilo efektiyle yazılır; "geç" önce satırı tamamlar, ikinci kez sonraki satıra geçer.
 * Dudak senkronu da buradan beslenir: son yazılan harf sesliyse ağız açılır.
 */
import raw from './dialogues.json';

export type Anim = 'talk' | 'point';
export type LookAt = 'tower' | 'stone' | 'view' | 'player' | 'ferry';
export type Scene = 'vapur' | 'yanasma' | 'kule' | 'teras' | 'donus';
export interface Line { speaker: 'can'; anim: Anim; lookAt: LookAt; text: string }
export type Trigger = { type: 'enter' } | { type: 'random'; pool: string } | { type: 'reach'; spot: string } | { type: 'interact' };
export interface Dialogue { id: string; scene: Scene; trigger: Trigger; lines: Line[] }

export const CHARACTER = raw.character;
export const DIALOGUES = raw.dialogues as Dialogue[];
export const byId = (id: string) => DIALOGUES.find((d) => d.id === id);
export const find = (scene: Scene, pred: (t: Trigger) => boolean) => DIALOGUES.filter((d) => d.scene === scene && pred(d.trigger));

export const CPS = 38;                      // harf / sn (Türkçe okuma hızına yakın, rahat)
export const PUNCT_PAUSE = 0.18;            // virgül/nokta sonrası ek bekleme (sn)

/** Rastgele sırayla, tekrarsız (tohumlu Fisher–Yates) */
export function shuffle<T>(items: T[], seed: number): T[] {
  const a = items.slice(); let s = Math.max(1, Math.floor(seed) % 2147483647);
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Daktilo: geçen süreye göre görünen harf sayısı (noktalama sonrası kısa duraklama) */
export function visibleChars(text: string, elapsed: number, cps = CPS): number {
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    t += 1 / cps + (/[.,!?;:…]/.test(text[i]) ? PUNCT_PAUSE : 0);
    if (t > elapsed) return i;
  }
  return text.length;
}
export const lineDuration = (text: string, cps = CPS) => {
  let t = 0; for (const ch of text) t += 1 / cps + (/[.,!?;:…]/.test(ch) ? PUNCT_PAUSE : 0); return t;
};

export interface Playback { dialogue: Dialogue; line: number; start: number; revealed: boolean }
export type Advance = { state: Playback | null; event: 'complete-line' | 'next-line' | 'end' };

/** Geç / devam: yazılıyorsa satırı tamamla, tamamsa sonraki satır, son satırsa kapat */
export function advance(p: Playback, now: number): Advance {
  const text = p.dialogue.lines[p.line].text;
  const done = p.revealed || visibleChars(text, now - p.start) >= text.length;
  if (!done) return { state: { ...p, revealed: true }, event: 'complete-line' };
  if (p.line + 1 < p.dialogue.lines.length) return { state: { ...p, line: p.line + 1, start: now, revealed: false }, event: 'next-line' };
  return { state: null, event: 'end' };
}
export const shownText = (p: Playback, now: number) => {
  const text = p.dialogue.lines[p.line].text;
  return p.revealed ? text : text.slice(0, visibleChars(text, now - p.start));
};
export const isTyping = (p: Playback, now: number) => !p.revealed && visibleChars(p.dialogue.lines[p.line].text, now - p.start) < p.dialogue.lines[p.line].text.length;

const VOWELS = 'aeıioöuüâîûAEIİOÖUÜ';
/** Dudak senkronu: 0..1 ağız açıklığı. Yazılırken son harfe göre; sesli harfte açık, sessizde yarı, boşluk/noktalamada kapalı */
export function mouthOpen(p: Playback | null, now: number): number {
  if (!p || !isTyping(p, now)) return 0;
  const text = p.dialogue.lines[p.line].text, n = visibleChars(text, now - p.start);
  const ch = text[Math.max(0, n - 1)] ?? ' ';
  if (VOWELS.includes(ch)) return 0.85 + 0.15 * Math.sin(now * 40);
  if (/[a-zçğşA-ZÇĞŞ]/i.test(ch)) return 0.35;
  return 0.05;
}
