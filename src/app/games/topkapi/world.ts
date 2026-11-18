/**
 * Topkapı Sarayı — dünya: bölgeler, yürünebilir alanlar, engeller, kapılar, rehber turu ve incelenebilir nesneler (saf; test edilir).
 *
 * Saray tek bir açık alan (üç avlu) ve üç iç mekândan oluşur. İç mekânlar dış dünyadan uzakta ayrı koordinatlardadır; bir kapıya
 * yaklaşıp girince ekran kararır ve oyuncu (rehberle birlikte) o mekâna taşınır. Böylece aynı anda yalnızca bir bölge çizilir
 * (bölge ayıklama): avlulardayken iç mekânlar, bir odadayken avlular hiç çizilmez.
 * Ölçüler kısaltılmış ve stilizedir: gerçek saray planının sadeleştirilmiş bir kurgusudur, rölöve değildir.
 * Koordinat: x doğu, z güney (−z kuzey), metre.
 */
import { makeNav, type Nav, type V2 } from '../shared/nav';
export type { V2 };
export type V3 = [number, number, number];
export type Zone = 'avlu' | 'divan' | 'harem' | 'hazine';
export const ZONE_LABEL: Record<Zone, string> = { avlu: 'Avlular', divan: 'Divan-ı Hümâyun', harem: 'Harem', hazine: 'Enderun Hazinesi' };

export interface Rect { x0: number; x1: number; z0: number; z1: number }
export interface Circle { x: number; z: number; r: number }
const R = (x0: number, x1: number, z0: number, z1: number): Rect => ({ x0, x1, z0, z1 });

/* ---------- dış dünya: üç avlu ---------- */
export const GATE1_X = -118;              // Bâb-ı Hümâyun (dış kapı)
export const GATE2_X = -60;               // Bâbüsselâm (orta kapı)
export const GATE3_X = 40;                // Bâbüssaâde (saadet kapısı)
export const GATE_HALF = 3.6;             // kapı açıklığının yarı genişliği
export const OUT: Rect = R(-117, 118, -54, 54);
/** Yapılar (dikdörtgen taban; içine girilmez) */
export const BUILDINGS: Record<string, Rect & { h: number }> = {
  ayairini: { ...R(-104, -80, -54, -38), h: 14 },
  divan: { ...R(-26, 12, -54, -37), h: 9 },
  adalet: { ...R(-36, -28, -53, -45), h: 34 },
  mutfak: { ...R(-52, 30, 40, 54), h: 7 },
  arz: { ...R(49, 65, -8, 8), h: 7 },
  kutuphane: { ...R(78, 90, -16, -4), h: 8 },
  hazine: { ...R(80, 110, 31, 50), h: 9 },
  enderun: { ...R(44, 118, -54, -34), h: 7 },
};
/** Duvarlar (kapı açıklıkları boş) */
export const WALLS: Rect[] = [
  R(GATE2_X - 1.5, GATE2_X + 1.5, -54, -GATE_HALF), R(GATE2_X - 1.5, GATE2_X + 1.5, GATE_HALF, 54),
  R(GATE3_X - 1.2, GATE3_X + 1.2, -54, -GATE_HALF), R(GATE3_X - 1.2, GATE3_X + 1.2, GATE_HALF, 54),
];
/** Revak sütunları, kuleler, havuzlar, ağaç gövdeleri (daire) */
export const DIVAN_PORTICO_Z = -33;
export const PORTICO_COLS: number[] = Array.from({ length: 8 }, (_, i) => -23 + i * 4.8);
export const HAZINE_PORTICO_Z = 27.5;
export const HAZINE_COLS: number[] = Array.from({ length: 7 }, (_, i) => 82 + i * 4.6);
export const FOUNTAINS: Circle[] = [{ x: -12, z: 6, r: 3.2 }, { x: 84, z: 4, r: 2.2 }];
export const GATE_TOWERS: Circle[] = [{ x: GATE2_X, z: -7.4, r: 3.6 }, { x: GATE2_X, z: 7.4, r: 3.6 }];
export const GATE3_COLS: Circle[] = [-2.6, 2.6].flatMap((z) => [{ x: GATE3_X + 4.2, z, r: 0.35 }, { x: GATE3_X + 8.4, z, r: 0.35 }]);

/** Ağaçlar: tohumlu yerleşim; yollardan, yapılardan ve kapı önlerinden uzak */
export interface Tree { x: number; z: number; kind: 'servi' | 'cinar'; s: number }
export function trees(): Tree[] {
  let sd = 17; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647); const out: Tree[] = [];
  // ikinci avluda yolun iki yanında servi sıraları
  for (let x = -52; x <= 34; x += 6.2) for (const z of [-11, 11]) { const s = 0.9 + r() * 0.3; if (z < 0 && x > -11 && x < -3) continue; out.push({ x, z, kind: 'servi', s }); }   // Divan yolunu kapatma
  // dağınık çınarlar ve serviler (çimenlerde)
  let guard = 0;
  while (out.length < 64 && guard++ < 2000) {
    const x = -112 + r() * 225, z = -50 + r() * 100, kind = r() < 0.55 ? 'servi' : 'cinar';
    if (Math.abs(z) < 16 || nearPath(x, z) || blockedStatic(x, z, kind === 'cinar' ? 5 : 2.4)) continue;
    out.push({ x, z, kind, s: kind === 'cinar' ? 0.8 + r() * 0.5 : 0.85 + r() * 0.4 });
  }
  return out;
}
const nearPath = (x: number, z: number) => Math.abs(z) < 4 || (x > -30 && x < 15 && z < -28 && z > -34) || (x > 78 && x < 110 && z > 18 && z < 30)
  || (x > -11 && x < -3 && z < 0 && z > -34) || (x > 90 && x < 100 && z > 0 && z < 30) || (x > 44 && x < 100 && z > 8 && z < 16);
const inRect = (x: number, z: number, r: Rect, pad = 0) => x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad;
const inCircle = (x: number, z: number, c: Circle, pad = 0) => Math.hypot(x - c.x, z - c.z) < c.r + pad;
function blockedStatic(x: number, z: number, pad: number) {
  return Object.values(BUILDINGS).some((b) => inRect(x, z, b, pad)) || WALLS.some((w) => inRect(x, z, w, pad)) || FOUNTAINS.some((f) => inCircle(x, z, f, pad)) || GATE_TOWERS.some((t) => inCircle(x, z, t, pad));
}
let TREES_CACHE: Tree[] | null = null;
export const TREES = () => (TREES_CACHE ??= trees());

/* ---------- iç mekânlar (dış dünyadan uzakta) ---------- */
export const DIVAN_IN = { cx: 1000, cz: 0, hx: 7.5, hz: 6, h: 12 } as const;          // Kubbealtı: kubbeli kare salon
export const HAREM_IN = { x0: 1100, corridorEnd: 1126, valideEnd: 1140, hamamEnd: 1151, corrHalf: 1.5, valideHalf: 5, hamamHalf: 4, h: 4.2, door: 0.85 } as const;
export const HAZINE_IN = { cx: 1200, cz: 0, hx: 9, hz: 5, h: 6 } as const;
export const VITRINES = { kasikci: [1196.4, -2.8] as V2, hancer: [1203.6, -2.8] as V2, taht: [1200, -3.6] as V2 };

/* ---------- yürünebilirlik ---------- */
const BODY = 0.35;
export function walkable(zone: Zone, x: number, z: number): boolean {
  if (zone === 'avlu') {
    if (!inRect(x, z, OUT, -BODY)) return false;
    if (Object.values(BUILDINGS).some((b) => inRect(x, z, b, BODY))) return false;
    if (WALLS.some((w) => inRect(x, z, w, BODY)) || GATE_TOWERS.some((t) => inCircle(x, z, t, BODY)) || FOUNTAINS.some((f) => inCircle(x, z, f, BODY))) return false;
    if (PORTICO_COLS.some((cx) => inCircle(x, z, { x: cx, z: DIVAN_PORTICO_Z, r: 0.4 }, BODY)) || HAZINE_COLS.some((cx) => inCircle(x, z, { x: cx, z: HAZINE_PORTICO_Z, r: 0.4 }, BODY))) return false;
    if (GATE3_COLS.some((c) => inCircle(x, z, c, BODY))) return false;
    return !TREES().some((t) => inCircle(x, z, { x: t.x, z: t.z, r: t.kind === 'cinar' ? 0.7 : 0.45 }, BODY));
  }
  if (zone === 'divan') {
    const d = DIVAN_IN; if (Math.abs(x - d.cx) > d.hx - BODY - 0.9 || Math.abs(z - d.cz) > d.hz - BODY - 0.9) return false;   // duvar dibi sedirler
    return true;
  }
  if (zone === 'hazine') {
    const h = HAZINE_IN; if (Math.abs(x - h.cx) > h.hx - BODY || Math.abs(z - h.cz) > h.hz - BODY) return false;
    return !Object.values(VITRINES).some(([vx, vz]) => Math.abs(x - vx) < 0.75 + BODY && Math.abs(z - vz) < 0.75 + BODY);
  }
  // harem: koridor → Valide dairesi → hamam; aralarında kapı açıklıkları
  const H = HAREM_IN;
  if (x < H.x0 + BODY || x > H.hamamEnd - BODY) return false;
  const half = x < H.corridorEnd ? H.corrHalf : x < H.valideEnd ? H.valideHalf : H.hamamHalf;
  if (Math.abs(z) > half - BODY) return false;
  for (const wx of [H.corridorEnd, H.valideEnd]) if (Math.abs(x - wx) < 0.25 + BODY && Math.abs(z) > H.door - BODY) return false;
  if (x > H.valideEnd + 1 && Math.hypot(x - (H.valideEnd + 5), z) < 1.3 + BODY) return false;          // hamamın göbek taşı
  if (x > H.corridorEnd + 1 && x < H.valideEnd && z < -H.valideHalf + 1.4 + BODY) return false;        // Valide dairesinde kuzey duvar dibi sedir
  return true;
}
/** Eksen eksen kayarak yürü */
export function slide(zone: Zone, p: V2, dx: number, dz: number): V2 {
  let [x, z] = p;
  if (walkable(zone, x + dx, z)) x += dx;
  if (walkable(zone, x, z + dz)) z += dz;
  return [x, z];
}

/* ---------- kapılar ---------- */
/** wait: rehberin kapı önünde oyuncuyu beklediği nokta */
export interface Door { id: string; zone: Zone; at: V2; r: number; to: Zone; spawn: V2; yaw: number; label: string; wait: V2 }
// yaw: three.js; 0 = −z (kuzey), π/2 = −x (batı), π = +z (güney), −π/2 = +x (doğu)
export const DOORS: Door[] = [
  { id: 'divan-gir', zone: 'avlu', at: [-7, -36.2], r: 1.6, to: 'divan', spawn: [DIVAN_IN.cx, DIVAN_IN.cz + 3.4], yaw: 0, label: 'Divan’a gir', wait: [-5.2, -34.4] },
  { id: 'divan-cik', zone: 'divan', at: [DIVAN_IN.cx, DIVAN_IN.cz + DIVAN_IN.hz - 1.2], r: 1.3, to: 'avlu', spawn: [-7, -31], yaw: Math.PI, label: 'Avluya çık', wait: [DIVAN_IN.cx + 1.8, DIVAN_IN.cz + 3.4] },
  { id: 'harem-gir', zone: 'avlu', at: [-24, -36.2], r: 1.6, to: 'harem', spawn: [HAREM_IN.x0 + 2, 0], yaw: -Math.PI / 2, label: 'Harem’e gir (Arabalar Kapısı)', wait: [-22.2, -34.4] },
  { id: 'harem-cik', zone: 'harem', at: [HAREM_IN.x0 + 0.5, 0], r: 1, to: 'avlu', spawn: [-24, -31], yaw: Math.PI, label: 'Avluya çık', wait: [HAREM_IN.x0 + 2.8, 0.7] },
  { id: 'hazine-gir', zone: 'avlu', at: [95, 30.2], r: 1.6, to: 'hazine', spawn: [HAZINE_IN.cx, HAZINE_IN.cz + 3.2], yaw: 0, label: 'Hazine’ye gir', wait: [96.8, 28.9] },
  { id: 'hazine-cik', zone: 'hazine', at: [HAZINE_IN.cx, HAZINE_IN.cz + HAZINE_IN.hz - 0.6], r: 1.2, to: 'avlu', spawn: [95, 24.5], yaw: Math.PI, label: 'Avluya çık', wait: [HAZINE_IN.cx + 1.6, HAZINE_IN.cz + 3.4] },
];
export const START: { zone: Zone; at: V2; yaw: number } = { zone: 'avlu', at: [-107, 1.2], yaw: -Math.PI / 2 };

/* ---------- incelenebilir nesneler ---------- */
export interface Thing { id: string; zone: Zone; name: string; era: string; pos: V3; reach: number; text: string; source: { title: string; url: string } }
const SRC = {
  wiki: { title: 'Wikipedia — Topkapı Palace', url: 'https://en.wikipedia.org/wiki/Topkap%C4%B1_Palace' },
  spoon: { title: 'Wikipedia — Spoonmaker’s Diamond', url: 'https://en.wikipedia.org/wiki/Spoonmaker%27s_Diamond' },
  sabah: { title: 'Daily Sabah — Discovering Ottoman treasures at Topkapı Palace', url: 'https://www.dailysabah.com/feature/2014/11/27/discovering-ottoman-treasures-at-topkapi-palace' },
  brit: { title: 'Encyclopaedia Britannica — Topkapı Palace Museum', url: 'https://www.britannica.com/topic/Topkapi-Palace-Museum' },
  unesco: { title: 'UNESCO — Historic Areas of Istanbul', url: 'https://whc.unesco.org/en/list/356/' },
};
export const THINGS: Thing[] = [
  { id: 'babihumayun', zone: 'avlu', name: 'Bâb-ı Hümâyun', era: 'Dış kapı', pos: [GATE1_X + 1, 7.5, 0], reach: 14, text: 'Sarayın dış kapısı. Birinci avluya buradan girilir; bu avlu herkese açıktı. Topkapı Sarayı’nın yapımına II. Mehmed’in emriyle 1459’da başlandı.', source: SRC.wiki },
  { id: 'babusselam', zone: 'avlu', name: 'Bâbüsselâm (Orta Kapı)', era: 'İkinci avlunun kapısı', pos: [GATE2_X - 2, 8, 0], reach: 12, text: 'İki sivri külahlı kulesiyle tanınan orta kapı. Buradan sonra ikinci avluya, devletin yönetildiği alana girilir.', source: SRC.wiki },
  { id: 'adalet', zone: 'avlu', name: 'Adalet Kulesi', era: 'Divan', pos: [-32, 22, -46], reach: 22, text: 'Divan’ın yanında yükselen kule sarayın en yüksek noktasıdır; şehrin birçok yerinden görülürdü. Padişahın adaletinin simgesi olarak anılır.', source: SRC.wiki },
  { id: 'mutfak', zone: 'avlu', name: 'Saray mutfakları', era: 'İkinci avlu', pos: [-10, 9, 40], reach: 14, text: 'Avlunun güney kanadı boyunca uzanan mutfaklar binlerce kişiye yemek çıkarırdı. Çatıdaki sıra sıra bacalar uzaktan tanınır. Bugün mutfaklarda saray porselen koleksiyonu sergilenir.', source: SRC.brit },
  { id: 'kafes', zone: 'divan', name: 'Kafesli pencere', era: 'Divan-ı Hümâyun', pos: [DIVAN_IN.cx, 6.4, DIVAN_IN.cz - DIVAN_IN.hz + 0.1], reach: 9, text: 'Divan toplantılarında vezirler bu kubbenin altında toplanırdı. Duvarın üstündeki kafesli pencere Adalet Kulesi’ne açılır; padişahın toplantıları buradan, görünmeden izleyebildiği anlatılır. Divanda padişah tahtı bulunmaz.', source: SRC.wiki },
  { id: 'cini', zone: 'harem', name: 'İznik çinileri', era: 'Valide Sultan Dairesi', pos: [HAREM_IN.corridorEnd + 7, 1.8, HAREM_IN.valideHalf - 0.05], reach: 4.5, text: 'Duvarlar lale, karanfil, sümbül ve bahar dalı motifli İznik çinileriyle kaplıdır. Lale ve karanfil Osmanlı bezemesinin en sevilen çiçekleridir; çiçeklere sadakat ya da bereket gibi anlamlar yüklenmesi ise sonraki yorumlardır, kesin bir kaynağa dayanmaz.', source: SRC.unesco },
  { id: 'kurna', zone: 'harem', name: 'Mermer kurna', era: 'Harem hamamı', pos: [HAREM_IN.hamamEnd - 1, 0.8, -HAREM_IN.hamamHalf + 0.6], reach: 3.5, text: 'Harem hamamlarında yıkanma, mermer kurnalardan tasla su dökülerek yapılırdı. Sıcaklık bölümü alttan ısıtılır, kubbedeki küçük cam gözlerden ışık süzülürdü.', source: SRC.brit },
  { id: 'arz', zone: 'avlu', name: 'Arz Odası', era: 'Üçüncü avlu', pos: [57, 4, 8.5], reach: 9, text: 'Bâbüssaâde’nin hemen arkasındaki köşk. Padişah yabancı elçileri ve devlet büyüklerini burada kabul ederdi; geniş saçaklı çatısı ve çevresini dolanan revakıyla tanınır.', source: SRC.wiki },
  { id: 'kasikci', zone: 'hazine', name: 'Kaşıkçı Elması', era: 'Enderun Hazinesi', pos: [VITRINES.kasikci[0], 1.35, VITRINES.kasikci[1]], reach: 2.6, text: '86 karatlık, armut biçimli elmas; çevresinde 49 pırlanta bulunur. Saraya nasıl geldiği kesin olarak bilinmez; adını aldığı “kaşıkçı” hikâyesi bir halk anlatısıdır.', source: SRC.spoon },
  { id: 'hancer', zone: 'hazine', name: 'Topkapı Hançeri', era: 'Enderun Hazinesi · 1747', pos: [VITRINES.hancer[0], 1.35, VITRINES.hancer[1]], reach: 2.6, text: 'I. Mahmud’un İran hükümdarı Nadir Şah’a armağan olarak yaptırdığı hançer. Sapında üç büyük zümrüt vardır; sapın ucundaki zümrüt kapağın altında Londra yapımı küçük bir saat gizlidir. Nadir Şah öldürülünce hançer İstanbul’a geri döndü.', source: SRC.sabah },
];
export function nearestThing(zone: Zone, x: number, z: number, seen: string[] = []): Thing | null {
  let best: Thing | null = null, bd = Infinity;
  for (const t of THINGS) { if (t.zone !== zone || seen.includes(t.id)) continue; const d = Math.hypot(t.pos[0] - x, t.pos[2] - z); if (d < t.reach && d < bd) { bd = d; best = t; } }
  return best;
}
export const nearestDoor = (zone: Zone, x: number, z: number) => DOORS.find((d) => d.zone === zone && Math.hypot(d.at[0] - x, d.at[1] - z) < d.r) ?? null;

/* ---------- rehber turu: Hasan Efendi (kurgusal saray kâtibi) ---------- */
export interface Stop { id: string; zone: Zone; at: V2; look: V3; lines: string[]; next?: string }
export const GUIDE = { name: 'Hasan Efendi', role: 'saray kâtibi (kurgusal rehber)' } as const;
export const TOUR: Stop[] = [
  { id: 'giris', zone: 'avlu', at: [-104, 3], look: [GATE1_X, 7, 0], lines: ['Hoş geldin! Ben Hasan Efendi, bu sarayda kâtiplik ederim. Bugün sana sarayı gezdireceğim.', 'Arkandaki büyük kapı Bâb-ı Hümâyun. Bu ilk avluya halk da girebilirdi. Gel, orta kapıya yürüyelim.'] },
  { id: 'babusselam', zone: 'avlu', at: [GATE2_X - 6, 4], look: [GATE2_X, 9, 0], lines: ['İşte Bâbüsselâm: iki sivri külahlı kule. Bu kapıdan sonra devletin yönetildiği ikinci avluya girilir.', 'İçeride yavaş ol; burası sessizliğin avlusudur. Beni izle, Divan’a gidiyoruz.'] },
  { id: 'divan-on', zone: 'avlu', at: [-12, -29], look: [-32, 20, -48], lines: ['Şu yüksek kule Adalet Kulesi, sarayın en yüksek yeri. Hemen önündeki revaklı yapı Divan-ı Hümâyun.', 'Vezirler orada toplanır, devlet işlerini görüşür. Kapıdan içeri gir, ben de geliyorum.'] },
  { id: 'divan-ic', zone: 'divan', at: [DIVAN_IN.cx + 2.4, DIVAN_IN.cz + 1.2], look: [DIVAN_IN.cx, 6.4, DIVAN_IN.cz - DIVAN_IN.hz], lines: ['Kubbealtı burası. Yukarıdaki kafesli pencereyi görüyor musun? Kulenin içine açılır.', 'Padişahın toplantıları oradan, görünmeden izlediği anlatılır. Burada taht yoktur. Şimdi çık; Harem’in kapısı hemen solda.'] },
  { id: 'harem-giris', zone: 'harem', at: [HAREM_IN.x0 + 6, 0.7], look: [HAREM_IN.x0 + 14, 1.6, 0], lines: ['Burası Harem, hanedanın yaşadığı, dışarıya kapalı bölüm. Bu dar yola Altın Yol derler.', 'Duvarlardaki çinilere bak. İleride Valide Sultan’ın dairesi var.'] },
  { id: 'valide', zone: 'harem', at: [HAREM_IN.corridorEnd + 3, 2.4], look: [HAREM_IN.corridorEnd + 7, 1.8, HAREM_IN.valideHalf], lines: ['Valide Sultan Dairesi. Haremde en saygın kişi padişahın annesiydi.', 'Çinilerdeki laleye, karanfile bak; İznik ustalarının işi. Hamam hemen ileride.'] },
  { id: 'hamam', zone: 'harem', at: [HAREM_IN.valideEnd + 2.6, 1.8], look: [HAREM_IN.valideEnd + 5, 3.8, 0], lines: ['Hamamın kubbesindeki cam gözlerden ışık süzülür. Kurnalardan tasla su dökülerek yıkanılırdı.', 'Şimdi avluya dönelim; saadet kapısından üçüncü avluya geçeceğiz.'] },
  { id: 'babussaade', zone: 'avlu', at: [GATE3_X - 5, -4], look: [GATE3_X, 6, 0], lines: ['Bâbüssaâde, yani saadet kapısı. Padişahın özel dünyası bu kapının ardında başlar.', 'Saçağın altından geç; hemen karşında Arz Odası var.'] },
  { id: 'arz', zone: 'avlu', at: [52, 11.5], look: [57, 4, 0], lines: ['Arz Odası. Padişah elçileri ve devlet büyüklerini burada kabul ederdi.', 'Sağ tarafta revaklı yapı Enderun Hazinesi. Gel, hazineyi görelim.'] },
  { id: 'hazine', zone: 'hazine', at: [HAZINE_IN.cx, HAZINE_IN.cz + 0.6], look: [HAZINE_IN.cx, 1.4, HAZINE_IN.cz - 3], lines: ['İşte hazine. Solda Kaşıkçı Elması, sağda Topkapı Hançeri.', 'Vitrinlere yaklaş, elinde çevirir gibi incele. Gezimiz burada bitiyor; sarayda dilediğin gibi dolaşabilirsin.'] },
];
export const stopIndex = (id: string) => TOUR.findIndex((s) => s.id === id);
/** Rehber nereye gitsin: oyuncu aynı bölgedeyse sıradaki durağa; değilse oyuncunun girdiği kapının önüne (onu izler) */
export const STOP_RADIUS = 4.2;


/* ---------- rehberin yolu: bölge başına ızgara + hedef başına BFS akış alanı ---------- */
/** Rehber o an nereye yürümeli: sıradaki durak bu bölgedeyse durağa; değilse doğru kapının önüne (oyuncuyu bekler) */
export function guideGoal(zone: Zone, i: number): { at: V2; door: Door | null } {
  const st = TOUR[Math.min(i, TOUR.length - 1)];
  if (st.zone === zone) return { at: st.at, door: null };
  const d = zone === 'avlu' ? DOORS.find((x) => x.zone === 'avlu' && x.to === st.zone)! : DOORS.find((x) => x.zone === zone && x.to === 'avlu')!;
  return { at: d.wait, door: d };
}
const BOUNDS: Record<Zone, { x0: number; x1: number; z0: number; z1: number; cell: number }> = {
  avlu: { x0: OUT.x0, x1: OUT.x1, z0: OUT.z0, z1: OUT.z1, cell: 1 },
  divan: { x0: DIVAN_IN.cx - DIVAN_IN.hx, x1: DIVAN_IN.cx + DIVAN_IN.hx, z0: -DIVAN_IN.hz, z1: DIVAN_IN.hz, cell: 0.5 },
  harem: { x0: HAREM_IN.x0, x1: HAREM_IN.hamamEnd, z0: -HAREM_IN.valideHalf, z1: HAREM_IN.valideHalf, cell: 0.25 },
  hazine: { x0: HAZINE_IN.cx - HAZINE_IN.hx, x1: HAZINE_IN.cx + HAZINE_IN.hx, z0: -HAZINE_IN.hz, z1: HAZINE_IN.hz, cell: 0.5 },
};
const navs = new Map<Zone, Nav>();
const nav = (zone: Zone) => { let n = navs.get(zone); if (!n) { n = makeNav({ walkable: (x, z) => walkable(zone, x, z), bounds: BOUNDS[zone] }); navs.set(zone, n); } return n; };
/** İki nokta arası düz yol açık mı */
export const clearLine = (zone: Zone, a: V2, b: V2) => nav(zone).clearLine(a, b);
/** Bir sonraki ara hedef: görüş açıksa doğrudan hedef; değilse akış alanında birkaç hücre ileri */
export const nextWaypoint = (zone: Zone, p: V2, goal: V2) => nav(zone).nextWaypoint(p, goal);
/** Rehberin bir adımı (saf): hedefe en fazla speed·dt kadar yürü; varınca null yön */
export const guideStep = (zone: Zone, p: V2, goal: V2, dt: number, speed: number) => nav(zone).step(p, goal, dt, speed);

/** Kamera bu noktada durabilir mi (binaların / odanın içine girmesin); ağaç ve sütunlar yok sayılır */
export function camClear(zone: Zone, x: number, z: number): boolean {
  const P = 0.3;
  if (zone === 'avlu') return inRect(x, z, OUT, 2) && !Object.values(BUILDINGS).some((b) => inRect(x, z, b, P)) && !WALLS.some((w) => inRect(x, z, w, P)) && !GATE_TOWERS.some((t) => inCircle(x, z, t, P));
  if (zone === 'divan') return Math.abs(x - DIVAN_IN.cx) < DIVAN_IN.hx - P && Math.abs(z) < DIVAN_IN.hz - P;
  if (zone === 'hazine') return Math.abs(x - HAZINE_IN.cx) < HAZINE_IN.hx - P && Math.abs(z) < HAZINE_IN.hz - P;
  const H = HAREM_IN; if (x < H.x0 + P || x > H.hamamEnd - P) return false;
  const half = x < H.corridorEnd ? H.corrHalf : x < H.valideEnd ? H.valideHalf : H.hamamHalf; if (Math.abs(z) > half - P) return false;
  return ![H.corridorEnd, H.valideEnd].some((wx) => Math.abs(x - wx) < 0.25 + P && Math.abs(z) > H.door - P);
}
/** Tavan yüksekliği (kamera sınırı) */
export const CEILING: Record<Zone, number> = { avlu: 60, divan: DIVAN_IN.h, harem: HAREM_IN.h, hazine: HAZINE_IN.h };
/** Ses karışımı için alt bölge */
export function subZone(zone: Zone, x: number): 'dis' | 'divan' | 'koridor' | 'valide' | 'hamam' | 'hazine' {
  if (zone === 'avlu') return 'dis'; if (zone === 'divan') return 'divan'; if (zone === 'hazine') return 'hazine';
  return x < HAREM_IN.corridorEnd ? 'koridor' : x < HAREM_IN.valideEnd ? 'valide' : 'hamam';
}

/* ---------- arka plan figürleri: duranlar ve döngüsel yürüyüş yolları (testte yolların açık olduğu doğrulanır) ---------- */
export type Role = 'muhafiz' | 'vezir' | 'hizmetkar' | 'asci' | 'hanim' | 'aga' | 'katip';
export interface Extra { id: string; zone: Zone; role: Role; at: V2; yaw: number; path?: V2[]; talk?: boolean; minTier?: 'low' | 'medium' }
export const EXTRAS: Extra[] = [
  { id: 'kapici1', zone: 'avlu', role: 'muhafiz', at: [GATE2_X - 4.6, -4.9], yaw: Math.PI / 2 },
  { id: 'kapici2', zone: 'avlu', role: 'muhafiz', at: [GATE2_X - 4.6, 4.9], yaw: Math.PI / 2 },
  { id: 'kapici3', zone: 'avlu', role: 'muhafiz', at: [GATE3_X - 2.6, -4.7], yaw: Math.PI / 2 },
  { id: 'kapici4', zone: 'avlu', role: 'muhafiz', at: [GATE3_X - 2.6, 4.7], yaw: Math.PI / 2 },
  { id: 'kapici5', zone: 'avlu', role: 'muhafiz', at: [GATE1_X + 4, -5.6], yaw: -Math.PI / 2, minTier: 'medium' },
  { id: 'hizmet1', zone: 'avlu', role: 'hizmetkar', at: [-50, 2], yaw: -Math.PI / 2, path: [[-50, 2], [30, 2], [30, -2], [-50, -2]] },
  { id: 'asci1', zone: 'avlu', role: 'asci', at: [-36, 38.2], yaw: 0, talk: true },
  { id: 'asci2', zone: 'avlu', role: 'asci', at: [-34.6, 37.6], yaw: Math.PI * 0.75, minTier: 'medium' },
  { id: 'hizmet2', zone: 'avlu', role: 'hizmetkar', at: [16, 38], yaw: 0, path: [[16, 38], [16, 20], [24, 5], [36, 2.5], [24, 5], [16, 20]], minTier: 'medium' },
  { id: 'ic1', zone: 'avlu', role: 'katip', at: [46, 12], yaw: -Math.PI / 2, path: [[46, 12], [74, 12], [74, 2], [70, -1], [74, 2], [74, 12]] },
  { id: 'ic2', zone: 'avlu', role: 'hizmetkar', at: [-80, 2], yaw: -Math.PI / 2, path: [[-112, -1.5], [-64, -1.5], [-64, 1.5], [-112, 1.5]], minTier: 'medium' },
  { id: 'vezir6', zone: 'avlu', role: 'vezir', at: [-56, 1.5], yaw: -Math.PI / 2, path: [[-56, 1.5], [-9, 1.5], [-9, -29], [-9, 1.5]], minTier: 'medium' },
  { id: 'yeniceri1', zone: 'avlu', role: 'muhafiz', at: [-14, -31.4], yaw: Math.PI },
  { id: 'yeniceri2', zone: 'avlu', role: 'muhafiz', at: [0.4, -31.4], yaw: Math.PI, minTier: 'medium' },
  { id: 'sohbet1', zone: 'avlu', role: 'katip', at: [-92, -30], yaw: 2.4, talk: true },
  { id: 'sohbet2', zone: 'avlu', role: 'hizmetkar', at: [-93.4, -31.6], yaw: 0.3, minTier: 'medium' },
  { id: 'sohbet3', zone: 'avlu', role: 'vezir', at: [-90.6, -31.8], yaw: -0.5, talk: true, minTier: 'medium' },
  { id: 'vezir1', zone: 'divan', role: 'vezir', at: [DIVAN_IN.cx - 3.2, -3.7], yaw: Math.PI, talk: true },
  { id: 'vezir2', zone: 'divan', role: 'vezir', at: [DIVAN_IN.cx, -3.9], yaw: Math.PI },
  { id: 'vezir3', zone: 'divan', role: 'vezir', at: [DIVAN_IN.cx + 3.2, -3.7], yaw: Math.PI, talk: true },
  { id: 'vezir4', zone: 'divan', role: 'vezir', at: [DIVAN_IN.cx - 5.2, -0.4], yaw: -Math.PI / 2, minTier: 'medium' },
  { id: 'vezir5', zone: 'divan', role: 'vezir', at: [DIVAN_IN.cx + 5.2, -0.4], yaw: Math.PI / 2, minTier: 'medium' },
  { id: 'katip1', zone: 'divan', role: 'katip', at: [DIVAN_IN.cx + 4.6, 2.6], yaw: Math.PI * 0.8 },
  { id: 'aga1', zone: 'harem', role: 'aga', at: [HAREM_IN.corridorEnd - 1.2, 1.05], yaw: Math.PI / 2 },
  { id: 'hanim1', zone: 'harem', role: 'hanim', at: [HAREM_IN.corridorEnd + 9, -2.4], yaw: 0.6, talk: true },
  { id: 'hanim2', zone: 'harem', role: 'hanim', at: [HAREM_IN.corridorEnd + 10.2, -1.6], yaw: -2.2, minTier: 'medium' },
  { id: 'nobet1', zone: 'hazine', role: 'muhafiz', at: [HAZINE_IN.cx - 7.6, 3.6], yaw: Math.PI * 0.75 },
  { id: 'nobet2', zone: 'hazine', role: 'muhafiz', at: [HAZINE_IN.cx + 7.6, 3.6], yaw: -Math.PI * 0.75 },
];
