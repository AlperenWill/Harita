/**
 * Nemrut Dağı — keşif oyununun dünya modeli (saf; test edilir): yürünebilir alan, anıtların yeri, incelenebilir nesneler,
 * yazıt parçaları ve görevler. Rehber yok; oyuncu defterindeki görevleri izleyerek zirvede kendi başına dolaşır.
 *
 * Yerleşim (stilize, ölçüler yaklaşık): tümülüs merkezde (~50 m yükseklik, ~150 m çap; üzerine çıkılmaz — gerçekte de yasaktır).
 * Doğu ve batı teraslarında beşer oturan dev heykel (soldan sağa: Antiochos, Kommagene, Zeus-Oromasdes, Apollon-Mithras, Herakles-Artagnes),
 * iki uçta kartal ve aslan; başlar heykellerin önünde yerde. Doğu terasında büyük sunak ve ata stelleri; batı terasında el sıkışma
 * (dexiosis) stelleri ve Aslan Horoskobu. Kuzey terası iki terası birbirine bağlayan dar, heykelsiz yoldur.
 * Oyun kurgusu: üç tahtın yazıtında tanrının Pers adı kırılıp düşmüştür; oyuncu parçaları bulup doğru tahta yerleştirir.
 */
import { FIGURES, PLATEAU_R, STATUE, TERRACE_X, TUMULUS, fallenSpot, statueSpots, type Figure } from './terrain';
import { GOLDEN, inGolden, type Terrace } from './DynamicLightingSystem';

export type V2 = [number, number];
const BODY = 0.35;

/* ---------- yerleşim ---------- */
export const RING = { r0: TUMULUS.r + 2, r1: PLATEAU_R - 2 } as const;           // yürünebilir halka (tümülüs eteği ↔ plato kenarı)
export const PODIUM = { x0: TERRACE_X - 4.2, x1: TERRACE_X + 4.6, z: 2.5 * STATUE.spacing + 13.5 } as const;   // basamaklı kaide (|x| ve |z| sınırları)
export const ALTAR = { x: TERRACE_X + 18, z: 0, half: 3.5, h: 2.4 } as const;     // doğu terası: heykellerin karşısında basamaklı büyük sunak
export const HEAD_R = 1.7;
/** Batı terası stelleri: dört el sıkışma + Aslan Horoskobu (terasın güney kenarında, kuzeye bakan bir sıra) */
export type SteleKind = 'dexiosis' | 'aslan';
export interface Stele { id: string; kind: SteleKind; x: number; z: number; god?: Figure; name: string }
export const WEST_STELAE: Stele[] = [
  { id: 'dex-kommagene', kind: 'dexiosis', x: -79, z: 40, god: 'kommagene', name: 'Antiochos ve Kommagene' },
  { id: 'dex-apollon', kind: 'dexiosis', x: -83.5, z: 40, god: 'apollon', name: 'Antiochos ve Apollon-Mithras' },
  { id: 'dex-zeus', kind: 'dexiosis', x: -88, z: 40, god: 'zeus', name: 'Antiochos ve Zeus-Oromasdes' },
  { id: 'dex-herakles', kind: 'dexiosis', x: -92.5, z: 40, god: 'herakles', name: 'Antiochos ve Herakles-Artagnes' },
  { id: 'aslan', kind: 'aslan', x: -97, z: 40, name: 'Aslan Horoskobu' },
];
/** Doğu terası: ata stelleri (kuzey ve güney kenarında, çoğu kırık) */
export const ANCESTORS: V2[] = [-1, 1].flatMap((s) => Array.from({ length: 6 }, (_, i) => [79 + i * 3.6, s * 40] as V2));
export const ROCK_INFO: V2 = [0, 104];   // başlangıçtaki bilgi tabelası

/* ---------- yürünebilirlik ---------- */
const inBox = (x: number, z: number, x0: number, x1: number, z0: number, z1: number, pad = BODY) => x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad;
export function walkable(x: number, z: number): boolean {
  const r = Math.hypot(x, z);
  if (r < RING.r0 + BODY || r > RING.r1 - BODY) return false;
  if (inBox(Math.abs(x), z, PODIUM.x0, PODIUM.x1, -PODIUM.z, PODIUM.z)) return false;
  if (inBox(x, z, ALTAR.x - ALTAR.half, ALTAR.x + ALTAR.half, ALTAR.z - ALTAR.half, ALTAR.z + ALTAR.half)) return false;
  for (const s of [1, -1] as const) for (let i = 0; i < 5; i++) { const f = fallenSpot(s, i); if (Math.hypot(x - f.x, z - f.z) < HEAD_R * (i === 2 ? 1.18 : 1) + BODY) return false; }
  if (WEST_STELAE.some((s) => inBox(x, z, s.x - 1.3, s.x + 1.3, s.z - 0.5, s.z + 0.5))) return false;
  if (ANCESTORS.some(([sx, sz]) => inBox(x, z, sx - 1.1, sx + 1.1, sz - 0.45, sz + 0.45))) return false;
  return !inBox(x, z, ROCK_INFO[0] - 0.9, ROCK_INFO[0] + 0.9, ROCK_INFO[1] - 0.2, ROCK_INFO[1] + 0.2);
}
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; if (walkable(x + dx, z)) x += dx; if (walkable(x, z + dz)) z += dz; return [x, z]; }
export type Area = 'dogu' | 'bati' | 'kuzey' | 'guney';
/** Oyuncunun bulunduğu bölüm (görevler ve ses için) */
export function areaAt(x: number, z: number): Area {
  if (x > TERRACE_X - 8 && Math.abs(z) < 44) return 'dogu';
  if (x < -(TERRACE_X - 8) && Math.abs(z) < 44) return 'bati';
  return z < 0 ? 'kuzey' : 'guney';
}
export const AREA_LABEL: Record<Area, string> = { dogu: 'Doğu Terası', bati: 'Batı Terası', kuzey: 'Kuzey Terası', guney: 'Güney yamacı' };
export const START = { at: [6, 100] as V2, yaw: 0.9 };   // güneyden, ziyaretçi yolunun ucu; yüz kuzeydoğuya

/* ---------- yazıt parçaları (oyun kurgusu) ---------- */
export type Persian = 'oromasdes' | 'mithras' | 'artagnes';
export interface Fragment { id: Persian; at: V2; word: string; clue: string; god: Figure }
export const FRAGMENTS: Fragment[] = [
  { id: 'oromasdes', at: [28, -94], word: 'OROMASDES', god: 'zeus', clue: 'Pers inancının yüce tanrısı Ahura Mazda’nın Yunanca yazılışı. Yunan tanrılarının başıyla eşleşir.' },
  { id: 'mithras', at: [-58, 76], word: 'MITHRAS', god: 'apollon', clue: 'Pers ışık ve antlaşma tanrısı; güneşle ilişkilendirilir.' },
  { id: 'artagnes', at: [-104, -26], word: 'ARTAGNES', god: 'herakles', clue: 'Pers zafer tanrısı Verethragna’nın Kommagene’deki adı; güç ve savaşla ilgilidir.' },
];
export const PICK_R = 1.8;
export const nearFragment = (x: number, z: number, have: string[]) => FRAGMENTS.find((f) => !have.includes(f.id) && Math.hypot(f.at[0] - x, f.at[1] - z) < PICK_R) ?? null;
/** Bir tahta hangi Pers adı yerleştirilebilir: doğru eşleşme mi */
export const matches = (fragment: Persian, throne: Figure) => FRAGMENTS.find((f) => f.id === fragment)!.god === throne;

/* ---------- incelenebilir nesneler ---------- */
export type ThingKind = 'taht' | 'bas' | 'stel' | 'aslan' | 'sunak' | 'tumulus' | 'ata' | 'tabela' | 'koruyucu';
export interface Thing { id: string; kind: ThingKind; name: string; at: V2; y: number; reach: number; text: string; god?: Figure; terrace?: Terrace; source: { title: string; url: string } }
const SRC = {
  unesco: { title: 'UNESCO — Nemrut Dağ', url: 'https://whc.unesco.org/en/list/448/' },
  whe: { title: 'World History Encyclopedia — Exploring Mount Nemrut', url: 'https://www.worldhistory.org/article/1589/' },
  brit: { title: 'Britannica — Nemrut Dağ', url: 'https://www.britannica.com/place/Nemrut-Dag' },
  iranica: { title: 'Encyclopædia Iranica — Nemrud Dagi', url: 'https://iranicaonline.org/articles/nemrud-dagi' },
};
const THRONE_TEXT: Record<Figure, string> = {
  antiochos: 'Kommagene Kralı I. Antiochos (MÖ 1. yüzyıl). Kutsal alanı kendisi için yaptırdı ve kendi heykelini tanrıların arasına koydu. Yazıtları Yunancadır.',
  kommagene: 'Krallığın kendisini temsil eden bereket ve talih tanrıçası (Tykhe). Sıradaki tek kadın figür.',
  zeus: 'Sıranın ortasındaki en büyük taht. Yazıt Yunan Zeus’unu bir Pers tanrısıyla birleştirir; Pers adının bulunduğu parça kırılıp düşmüş.',
  apollon: 'Işık ve güneş tanrısı; yazıtta Helios ve Hermes adları da geçer. Pers adının bulunduğu parça kırılıp düşmüş.',
  herakles: 'Güç kahramanı; yazıtta savaş tanrısı Ares’in adı da geçer. Pers adının bulunduğu parça kırılıp düşmüş.',
};
const HEAD_TEXT: Record<Figure, string> = {
  antiochos: 'Kralın başı. Başlar zamanla gövdelerden düştü; düşüşün nedeni olarak depremler de kasıtlı tahribat da öne sürülür.',
  kommagene: 'Tanrıçanın başı; meyve ve başaklardan bir başlıkla tasvir edilir.',
  zeus: 'Sıranın en büyük başı. Başlar 2–3 m yüksekliğindedir.',
  apollon: 'Sakalsız, genç yüzlü ışık tanrısı.',
  herakles: 'Güç ve savaş tanrısının başı. Burunlardaki hasar kasıtlı tahribatı düşündürür.',
};
export function things(): Thing[] {
  const out: Thing[] = [];
  for (const s of [1, -1] as const) {
    const terrace: Terrace = s > 0 ? 'dogu' : 'bati';
    statueSpots(s).forEach((st, i) => {
      const f = fallenSpot(s, i), fig = FIGURES[i];
      out.push({ id: `taht-${terrace}-${st.id}`, kind: 'taht', name: `Taht: ${fig.name}`, at: [s * (PODIUM.x1 + 0.8), st.z], y: 4.5, reach: 3.8, text: THRONE_TEXT[st.id], god: st.id, terrace, source: SRC.iranica });
      out.push({ id: `bas-${terrace}-${st.id}`, kind: 'bas', name: `Baş: ${fig.name}`, at: [f.x, f.z], y: 1.4, reach: 3.6, text: HEAD_TEXT[st.id], god: st.id, terrace, source: SRC.whe });
    });
    out.push({ id: `koruyucu-${terrace}`, kind: 'koruyucu', name: 'Aslan ve kartal', at: [s * (TERRACE_X + 6.5), 3.5 * STATUE.spacing], y: 2.5, reach: 4, text: 'Heykel sırasının iki ucunda koruyucu aslan ve kartal figürleri durur.', terrace, source: SRC.whe });
  }
  for (const st of WEST_STELAE) out.push(st.kind === 'aslan'
    ? { id: st.id, kind: 'aslan', name: st.name, at: [st.x, st.z - 1.4], y: 1.8, reach: 3, terrace: 'bati', source: SRC.iranica, text: 'Aslan gövdesi üzerinde 19 yıldız (Aslan takımyıldızı), boynunda bir hilal ve sırtının üstünde üç büyük gezegen. Gezegenler Yunanca yazıtlarla Mars, Jüpiter ve Merkür olarak adlandırılır. Geleneksel tarih MÖ 62’dir; MÖ 109 gibi başka tarihler de önerilmiştir.' }
    : { id: st.id, kind: 'stel', name: `El sıkışma: ${st.name}`, at: [st.x, st.z - 1.4], y: 1.8, reach: 2.6, god: st.god, terrace: 'bati', source: SRC.whe, text: 'Kabartmada kral bir tanrıyla el sıkışır (dexiosis): kralın tanrılarla eşit görülme isteğinin bir ifadesi.' });
  out.push(
    { id: 'sunak', kind: 'sunak', name: 'Büyük sunak', at: [ALTAR.x - ALTAR.half - 2, 0], y: 2, reach: 5, terrace: 'dogu', source: SRC.whe, text: 'Doğu terasında heykellerin karşısında büyük, basamaklı bir sunak bulunur. Batı terasında böyle bir ana sunak yoktur.' },
    { id: 'atalar', kind: 'ata', name: 'Ata stelleri', at: [88, 38.4], y: 1.5, reach: 5, terrace: 'dogu', source: SRC.brit, text: 'Terasın kenarlarında kralın atalarını gösteren kabartmalı steller dizilidir: Antiochos soyunu hem Pers hem Makedon krallarına bağlar. Çoğu bugün parçalıdır.' },
    { id: 'tumulus', kind: 'tumulus', name: 'Tümülüs', at: [0, -RING.r0 - 2], y: 12, reach: 9, source: SRC.unesco, text: 'Kırma kireçtaşından yapay tepe: bugün yaklaşık 50 m yüksekliğinde ve 150 m çapında (başlangıçta ~60 m olduğu tahmin edilir). Kralın mezarının altında olduğu düşünülür; mezar odası bugüne kadar bulunamadı. Tümülüse çıkmak yasaktır.' },
    { id: 'tabela', kind: 'tabela', name: 'Bilgi tabelası', at: [ROCK_INFO[0], ROCK_INFO[1] - 1.2], y: 1.2, reach: 2.6, source: SRC.unesco, text: 'Nemrut Dağı, yaklaşık 2.134 m yükseklikte. Anıt 1881’de Osmanlı için yol araştıran Alman mühendis Karl Sester tarafından yeniden bulundu; 1987’de UNESCO Dünya Mirası Listesi’ne girdi.' },
  );
  return out;
}
let THINGS_CACHE: Thing[] | null = null;
export const THINGS = () => (THINGS_CACHE ??= things());
export function nearestThing(x: number, z: number): Thing | null {
  let best: Thing | null = null, bs = Infinity;
  for (const t of THINGS()) { const d = Math.hypot(t.at[0] - x, t.at[1] - z) / t.reach; if (d < 1 && d < bs) { bs = d; best = t; } }
  return best;
}

/* ---------- Aslan Horoskobu bulmacası: 19 yıldız + hilal + 3 gezegen (kabartmanın 0..100 koordinatlarında, stilize yerleşim) ---------- */
export const HOROSCOPE = {
  stars: [[22, 52], [27, 47], [33, 44], [39, 45], [45, 47], [51, 46], [57, 44], [63, 45], [68, 48], [30, 58], [40, 58], [50, 57], [60, 57], [70, 56], [76, 50], [24, 66], [74, 64], [36, 68], [62, 68]] as V2[],
  planets: [{ id: 'pyroeis', at: [36, 22] as V2, name: 'Pyroeis (Mars) — Herakles’in' }, { id: 'stilbon', at: [52, 18] as V2, name: 'Stilbon (Merkür) — Apollon’un' }, { id: 'phaethon', at: [68, 22] as V2, name: 'Phaethon (Jüpiter) — Zeus’un' }],
  moon: [78, 38] as V2,
};
export const hitPlanet = (x: number, y: number, r = 7) => HOROSCOPE.planets.find((p) => Math.hypot(p.at[0] - x, p.at[1] - y) < r) ?? null;

/* ---------- görevler (defter) ---------- */
export interface Progress { area: Area; hour: number; read: string[]; frags: string[]; placed: string[]; planets: string[]; seen: string[]; watched: string[] }
export interface Quest { id: string; title: string; hint: string; done: (p: Progress) => boolean; count?: (p: Progress) => [number, number] }
export const QUESTS: Quest[] = [
  { id: 'safak', title: 'Doğu Terası’nda gün doğumunu izle', hint: `Doğu Terası’na yürü; güneş ${hh(GOLDEN.dogu[0])}–${hh(GOLDEN.dogu[1])} arasında heykelleri aydınlatır.`, done: (p) => p.watched.includes('dogu') },
  { id: 'yazit', title: 'Doğu terasındaki beş tahtın yazıtını oku', hint: 'Heykellerin önüne git, tahtları incele.', done: (p) => FIGURES.every((f) => p.read.includes(f.id)), count: (p) => [FIGURES.filter((f) => p.read.includes(f.id)).length, 5] },
  { id: 'parca', title: 'Kırılıp düşmüş üç yazıt parçasını bul', hint: 'Parçalar zirvenin dört bir yanına dağılmış: kuzeyde, güneybatıda ve batı terasında parlıyorlar.', done: (p) => p.frags.length >= 3, count: (p) => [p.frags.length, 3] },
  { id: 'ad', title: 'Pers adlarını doğru tanrıların tahtına yerleştir', hint: 'Parçayı taşırken doğu terasındaki tahtı incele ve parçayı yerleştir.', done: (p) => p.placed.length >= 3, count: (p) => [p.placed.length, 3] },
  { id: 'horoskop', title: 'Aslan Horoskobu’nda üç gezegeni bul', hint: 'Batı Terası’nın güney kenarındaki stel sırasının batı ucunda.', done: (p) => p.planets.length >= 3, count: (p) => [p.planets.length, 3] },
  { id: 'dexiosis', title: 'Dört el sıkışma stelini incele', hint: 'Batı Terası’nın güney kenarında, Aslan Horoskobu’nun yanında.', done: (p) => WEST_STELAE.filter((s) => s.kind === 'dexiosis').every((s) => p.seen.includes(s.id)), count: (p) => [WEST_STELAE.filter((s) => s.kind === 'dexiosis' && p.seen.includes(s.id)).length, 4] },
  { id: 'gunbatimi', title: 'Batı Terası’nda gün batımını izle', hint: `Batı Terası’nda ${hh(GOLDEN.bati[0])}–${hh(GOLDEN.bati[1])} arasında bekle. Zamanı hızlandırabilirsin.`, done: (p) => p.watched.includes('bati') },
];
function hh(h: number) { const m = Math.round(h * 60); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
/** Gün doğumu/batımı izlendi mi: oyuncu ilgili terasta ve altın saat içinde */
export const watching = (area: Area, hour: number): Terrace | null => (area === 'dogu' && inGolden('dogu', hour) ? 'dogu' : area === 'bati' && inGolden('bati', hour) ? 'bati' : null);
