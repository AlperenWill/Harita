/**
 * Topkapı Sarayı — bölümler, odalar, raylar, portal ayıklama ve nesneler (saf; test edilir).
 * Oyun dört bölümdür: kapi (Bâb-ı Hümâyun) → avlu (kuş bakışı) → ic (Divan → Harem koridoru → Valide Sultan dairesi → hamam) → hazine.
 * Yerleşim stilizedir: odaların sırası ve bitişikliği gerçek saray planının sadeleştirilmiş bir kurgusudur, rölöve değildir.
 */
export type V3 = [number, number, number];
export type Chapter = 'kapi' | 'avlu' | 'ic' | 'hazine';
export const CHAPTERS: Chapter[] = ['kapi', 'avlu', 'ic', 'hazine'];
export const CHAPTER_LABEL: Record<Chapter, string> = { kapi: 'Bâb-ı Hümâyun', avlu: 'Avlular', ic: 'Divan ve Harem', hazine: 'Enderun Hazinesi' };

/* ---------- odalar (iç bölüm): x ekseni boyunca art arda, aralarında kapı (portal) ---------- */
export type RoomId = 'divan' | 'koridor' | 'valide' | 'hamam';
export interface Room { id: RoomId; name: string; x0: number; x1: number; halfW: number; h: number; light: string; kelvin: number; fov: number; shake: number }
export const ROOMS: Room[] = [
  { id: 'divan', name: 'Divan-ı Hümâyun (Kubbealtı)', x0: 0, x1: 14, halfW: 5.5, h: 7.5, light: '#fff6ea', kelvin: 4800, fov: 62, shake: 0 },     // beyaz / resmî
  { id: 'koridor', name: 'Harem koridoru', x0: 14, x1: 32, halfW: 1.35, h: 3.6, light: '#ffc27a', kelvin: 2400, fov: 44, shake: 1 },               // dar açı, hafif titrek
  { id: 'valide', name: 'Valide Sultan Dairesi', x0: 32, x1: 44, halfW: 4.5, h: 6, light: '#ffd49a', kelvin: 2900, fov: 60, shake: 0 },           // sarı / sıcak
  { id: 'hamam', name: 'Hamam', x0: 44, x1: 54, halfW: 3.6, h: 5, light: '#ffe6c4', kelvin: 3400, fov: 60, shake: 0 },
];
export const DOOR = { w: 1.5, h: 2.5 } as const;
/** Portallar: komşu iki oda arasındaki kapı açıklığı (x düzleminde, z = 0 ortalı) */
export const PORTALS = ROOMS.slice(0, -1).map((r, i) => ({ a: r.id, b: ROOMS[i + 1].id, x: r.x1 }));
export const roomAt = (x: number): Room => ROOMS.find((r) => x >= r.x0 && x < r.x1) ?? (x < ROOMS[0].x0 ? ROOMS[0] : ROOMS[ROOMS.length - 1]);

/**
 * PORTAL AYIKLAMA
 * Bulunulan oda her zaman tam ayrıntılı çizilir. Komşu bir oda yalnızca aradaki kapı açıklığı görüş alanındaysa çizilir;
 * oradan da zincirleme devam edilir (kapıdan görünen odanın öteki kapısı da görünüyorsa bir sonraki oda).
 * Kapı görünür mü: kapının iki kenarına (z = ±w/2) giden yatay yönlerin, bakış yönüyle açısı görüş yarı açısından (+ pay) küçükse
 * ve kapı kameranın önündeyse. Yani  angle(dir, kenar − göz) ≤ hfov/2 + pay  koşulunu en az bir kenar ya da kapının ortası sağlar.
 * Zincirde görüş, önceki kapının açısal aralığıyla daraltılır (kapıdan bakılan dar koni): [θmin, θmax] aralıkları kesiştirilir.
 * Görünmeyen odalar yerine düşük poligonlu yer tutucu (tek kutu) çizilir.
 */
export function visibleRooms(eye: V3, yaw: number, hfovDeg: number, margin = 0.12): RoomId[] {
  const cur = roomAt(eye[0]), out: RoomId[] = [cur.id], half = (hfovDeg * Math.PI) / 360 + margin;
  // bakış açısı: yaw = 0 → +x yönü; z'ye göre işaretli açı
  const ang = (x: number, z: number) => { let a = Math.atan2(z - eye[2], x - eye[0]) - yaw; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  for (const dirSign of [1, -1]) {
    let lo = -half, hi = half, idx = ROOMS.indexOf(cur);
    for (;;) {
      const next = idx + dirSign; if (next < 0 || next >= ROOMS.length) break;
      const px = dirSign > 0 ? ROOMS[idx].x1 : ROOMS[idx].x0;
      const a1 = ang(px, -DOOR.w / 2), a2 = ang(px, DOOR.w / 2), pLo = Math.min(a1, a2), pHi = Math.max(a1, a2);
      if (pHi - pLo > Math.PI) break;                        // kapı kameranın arkasında (açı sarması)
      lo = Math.max(lo, pLo); hi = Math.min(hi, pHi);
      if (lo > hi) break;                                    // kapı görüş konisinin dışında
      out.push(ROOMS[next].id); idx = next;
    }
  }
  return out;
}

/* ---------- raylar ---------- */
export const EYE = 1.62;
export const RAILS: Record<Exclude<Chapter, 'avlu'>, V3[]> = {
  kapi: [[-34, EYE, 0], [-22, EYE, 0], [-10, EYE, 0], [-3, EYE, 0], [6, EYE, 0]],
  ic: [[1.2, EYE, 0], [7, EYE, 0], [13, EYE, 0], [16, EYE, 0], [23, EYE, 0], [31, EYE, 0], [34.5, EYE, 0], [38, EYE, 0.6], [43, EYE, 0], [46, EYE, 0], [50.5, EYE, 0.4]],
  hazine: [[-6.5, EYE, 0], [-3.4, EYE, 0], [0, EYE, 0], [3.4, EYE, 0], [6, EYE, 0]],
};
/** Avlu: kuş bakışı, kendiliğinden süzülen kamera (konum, bakış hedefi) */
export const DRONE: { pos: V3; look: V3 }[] = [
  { pos: [-70, 26, 30], look: [-20, 0, 0] }, { pos: [-25, 34, 42], look: [20, 0, 0] }, { pos: [35, 40, 36], look: [70, 0, -6] },
  { pos: [95, 34, 26], look: [120, 0, -10] }, { pos: [150, 30, 18], look: [165, 2, -4] },
];
export const DRONE_SECONDS = 34;
/** Avludaki yapılar (kuş bakışında etiketlenir) */
export const COURT: { id: string; name: string; pos: V3; size: V3; kind: 'kapi' | 'yapi' | 'kule' }[] = [
  { id: 'bab-i-humayun', name: 'Bâb-ı Hümâyun', pos: [-40, 0, 0], size: [5, 11, 16], kind: 'kapi' },
  { id: 'aya-irini', name: 'Aya İrini', pos: [-10, 0, -34], size: [26, 14, 16], kind: 'yapi' },
  { id: 'babusselam', name: 'Bâbüsselâm (Orta Kapı)', pos: [50, 0, 0], size: [5, 10, 14], kind: 'kapi' },
  { id: 'mutfaklar', name: 'Saray mutfakları', pos: [95, 0, 34], size: [60, 7, 9], kind: 'yapi' },
  { id: 'divan', name: 'Divan-ı Hümâyun ve Adalet Kulesi', pos: [112, 0, -30], size: [16, 8, 12], kind: 'kule' },
  { id: 'harem', name: 'Harem', pos: [128, 0, -48], size: [44, 9, 22], kind: 'yapi' },
  { id: 'babussaade', name: 'Bâbüssaâde', pos: [140, 0, 0], size: [4, 8, 12], kind: 'kapi' },
  { id: 'hazine', name: 'Enderun Hazinesi (Fatih Köşkü)', pos: [176, 0, 26], size: [26, 9, 12], kind: 'yapi' },
  { id: 'kutuphane', name: 'III. Ahmed Kütüphanesi', pos: [165, 0, 0], size: [9, 8, 9], kind: 'yapi' },
];

/* ---------- nesneler ---------- */
export type Inspect = 'zoom' | 'macro' | 'rotate' | 'listen';
export interface Thing { id: string; chapter: Chapter; name: string; era: string; pos: V3; trigger: number; mode: Inspect; fov: number; from?: V3; text: string; whisper: string; source: { title: string; url: string } }
const SRC = {
  wiki: { title: 'Wikipedia — Topkapı Palace', url: 'https://en.wikipedia.org/wiki/Topkap%C4%B1_Palace' },
  spoon: { title: 'Wikipedia — Spoonmaker’s Diamond', url: 'https://en.wikipedia.org/wiki/Spoonmaker%27s_Diamond' },
  sabah: { title: 'Daily Sabah — Discovering Ottoman treasures at Topkapı Palace', url: 'https://www.dailysabah.com/feature/2014/11/27/discovering-ottoman-treasures-at-topkapi-palace' },
  bilkent: { title: 'Bilkent Üniversitesi — Topkapı: Imperial Treasury', url: 'https://www.ee.bilkent.edu.tr/~history/topkapi3.html' },
  brit: { title: 'Encyclopaedia Britannica — Topkapı Palace Museum', url: 'https://www.britannica.com/topic/Topkapi-Palace-Museum' },
  unesco: { title: 'UNESCO — Historic Areas of Istanbul', url: 'https://whc.unesco.org/en/list/356/' },
};
export const THINGS: Thing[] = [
  { id: 'tugra', chapter: 'kapi', name: 'Kapının tuğrası ve kitabesi', era: 'Bâb-ı Hümâyun', pos: [-3.06, 7.9, 0], trigger: 9, mode: 'zoom', fov: 24,
    whisper: 'Bu kapıdan geçen, sarayın düzenine girer…', text: 'Bâb-ı Hümâyun sarayın dış kapısıdır; birinci avluya buradan girilir. Kemerin üstünde kitabeler ve padişah tuğrası yer alır. Topkapı Sarayı’nın yapımına II. Mehmed’in emriyle 1459’da başlandı.', source: SRC.wiki },
  { id: 'kafes', chapter: 'ic', name: 'Kafesli pencere', era: 'Divan-ı Hümâyun', pos: [7, 5.2, -5.3], trigger: 5.5, mode: 'listen', fov: 30,
    whisper: 'Sus… vezirler konuşuyor. Kafesin ardında biri dinliyor olabilir.', text: 'Divan toplantılarında vezirler bu kubbenin altında toplanırdı. Duvarın üst kısmındaki kafesli pencere Adalet Kulesi’ne açılır; padişahın toplantıları buradan, görünmeden izleyebildiği anlatılır. Divanda padişah tahtı bulunmaz.', source: SRC.wiki },
  { id: 'kapi-sedef', chapter: 'ic', name: 'Sedef kakmalı kapı', era: 'Harem girişi', pos: [14.75, 1.3, 1.02], trigger: 1.6, mode: 'macro', fov: 22,
    whisper: 'Bu kapının ardı mahremdir…', text: 'Haremin kapıları ceviz ve abanoz üzerine sedef, bağa ve fildişi kakmalarla süslenirdi. Harem, hanedan ailesinin yaşadığı ve dışarıya kapalı bölümdü.', source: SRC.brit },
  { id: 'cini', chapter: 'ic', name: 'İznik çinileri', era: 'Valide Sultan Dairesi', pos: [38, 1.9, 4.4], trigger: 4.2, mode: 'macro', fov: 20,
    whisper: 'Duvarlarımda her mevsim bahardır.', text: 'Dairenin duvarları lale, karanfil, sümbül ve bahar dalı motifli İznik çinileriyle kaplıdır. Lale ve karanfil Osmanlı bezemesinin en sevilen çiçekleridir; çiçeklere sadakat ya da bereket gibi anlamlar yüklenmesi ise sonraki yorumlardır, kesin bir kaynağa dayanmaz.', source: SRC.unesco },
  { id: 'kurna', chapter: 'ic', name: 'Mermer kurna', era: 'Hamam', pos: [50.5, 0.75, -2.9], trigger: 3.6, mode: 'macro', fov: 24,
    whisper: 'Su hiç susmaz burada…', text: 'Harem hamamlarında yıkanma, mermer kurnalardan tasla su dökülerek yapılırdı. Sıcaklık bölümü alttan ısıtılır, kubbedeki küçük cam gözlerden ışık süzülürdü.', source: SRC.brit },
  { id: 'kasikci', chapter: 'hazine', name: 'Kaşıkçı Elması', era: 'Enderun Hazinesi', pos: [-3.4, 1.35, -2.2], trigger: 2.5, mode: 'rotate', fov: 16,
    whisper: 'Dön etrafımda; her açıdan başka bir renk göreceksin.', text: '86 karatlık, armut biçimli elmas; çevresinde 49 pırlanta bulunur. Saraya nasıl geldiği kesin olarak bilinmez; adını aldığı “kaşıkçı” hikâyesi bir halk anlatısıdır.', source: SRC.spoon },
  { id: 'hancer', chapter: 'hazine', name: 'Topkapı Hançeri', era: 'Enderun Hazinesi · 1747', pos: [3.4, 1.35, -2.2], trigger: 2.5, mode: 'rotate', fov: 14,
    whisper: 'Sapımdaki üç zümrüde yaklaş…', text: 'I. Mahmud’un İran hükümdarı Nadir Şah’a armağan olarak yaptırdığı hançer. Sapında üç büyük zümrüt vardır; sapın ucundaki zümrüt kapağın altında Londra yapımı küçük bir saat gizlidir. Nadir Şah öldürülünce hançer İstanbul’a geri döndü.', source: SRC.sabah },
];
export const thingsOf = (c: Chapter) => THINGS.filter((t) => t.chapter === c);
export const BIBLIO = SRC;
