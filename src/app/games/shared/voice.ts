/**
 * Türkçe sesli okuma (tarayıcının konuşma sentezi) — tüm oyunlar için ortak ses seçici.
 *
 * Sorun: oyunlar "ilk Türkçe sesi" seçiyordu. Windows'ta bu genellikle erkek sesi ("Microsoft Tolga"),
 * bu yüzden kadın rehber (Ayasofya'daki Elif Hoca) erkek sesiyle konuşuyordu.
 * Çözüm: rehberin cinsiyetine göre ses seçilir. Ses adlarında bilinen kadın/erkek Türkçe sesler aranır;
 * istenen cinsiyette ses yoksa eldeki ses perdesi (pitch) ile yaklaştırılır. Kesin değildir: hangi seslerin
 * bulunduğu cihaza ve tarayıcıya bağlıdır.
 */
export type VoiceGender = 'female' | 'male' | 'any';

// Bilinen Türkçe sesler (Windows, macOS/iOS, Chrome, Edge, Amazon, Samsung). Adlar küçük harfe çevrilerek aranır.
const FEMALE = ['yelda', 'emel', 'seda', 'filiz', 'zeynep', 'elif', 'ayşe', 'ayse', 'female', 'kadın', 'kadin', 'google türkçe', 'google turkce', 'x-cfs', 'x-efs'];
const MALE = ['tolga', 'ahmet', 'cem', 'kerem', 'murat', 'male', 'erkek', 'x-mfs', 'x-tmc'];

let cache: SpeechSynthesisVoice[] = [];
function voices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  const v = speechSynthesis.getVoices();
  if (v.length) cache = v;
  return cache;
}
// Chrome sesleri geç yükler: liste gelince önbelleğe al
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  voices();
  speechSynthesis.addEventListener?.('voiceschanged', () => voices());
}

/** Bir sesin cinsiyet tahmini: 'female' | 'male' | null (bilinmiyor) */
export function guessGender(name: string): 'female' | 'male' | null {
  const n = name.toLocaleLowerCase('tr');
  if (MALE.some((k) => n.includes(k)) && !n.includes('female')) return 'male';
  if (FEMALE.some((k) => n.includes(k))) return 'female';
  return null;
}

/** İstenen cinsiyete en uygun Türkçe ses; yoksa herhangi bir Türkçe ses */
export function pickVoice(list: Pick<SpeechSynthesisVoice, 'name' | 'lang' | 'localService'>[], want: VoiceGender) {
  const tr = list.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('tr'));
  if (!tr.length) return null;
  const score = (v: (typeof tr)[number]) => {
    const g = guessGender(v.name);
    let s = want === 'any' ? 0 : g === want ? 10 : g === null ? 2 : -10;
    if (/natural|online|neural|premium|enhanced/i.test(v.name)) s += 1;   // daha doğal sesler
    return s;
  };
  return [...tr].sort((a, b) => score(b) - score(a))[0];
}

/** Türkçe okur. Kadın rehber için kadın sesi seçilir; bulunamazsa erkek sesin perdesi yükseltilir. */
export function speakTr(text: string, opts: { gender?: VoiceGender; rate?: number; pitch?: number } = {}) {
  if (!('speechSynthesis' in window)) return;
  const want = opts.gender ?? 'any';
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'tr-TR'; u.rate = opts.rate ?? 0.95; u.pitch = opts.pitch ?? 1;
  const v = pickVoice(voices(), want) as SpeechSynthesisVoice | null;
  if (v) {
    u.voice = v;
    const g = guessGender(v.name);
    if (want === 'female' && g === 'male') u.pitch = 1.45;   // yalnız erkek ses varsa: perde yükseltilerek kadın sesine yaklaştırılır
    if (want === 'male' && g === 'female') u.pitch = 0.7;
  } else if (want === 'female') u.pitch = Math.max(u.pitch, 1.15);
  speechSynthesis.speak(u);
}
