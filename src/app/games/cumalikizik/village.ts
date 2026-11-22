/**
 * Cumalıkızık — "Kapı Kapı Cumalıkızık": köyün sokak ağı, evler, simge yapılar ve 10 durak (saf veri; three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, -z güney. Köy Uludağ'ın kuzey eteğindedir; yokuş güneye (−z) doğru çıkar.
 * Sokak planı, evlerin yerleşimi ve ölçüleri TEMSİLÎDİR (köyün gerçek planından değil, dokusundan esinlenir).
 * Kaynaklar ve doğrulama notları: docs/CUMALIKIZIK.md.
 */
export type V2 = [number, number];

/* ===================== arazi ===================== */
/** Güneye doğru hafif yokuş (~%7) + yumuşak dalga */
export function heightAt(x: number, z: number): number {
  return -z * 0.07 + Math.sin(x * 0.045) * 0.5 + Math.sin(z * 0.03 + 1) * 0.4;
}

/* ===================== sokaklar ===================== */
export interface Street { id: string; pts: V2[]; w: number }
/** Ana yol köyün alt girişinden meydana çıkar; ara sokaklar meydandan dağılır */
export const STREETS: Street[] = [
  { id: 'ana', pts: [[2, 78], [-2, 52], [3, 30], [0, 10]], w: 4.4 },
  { id: 'yukari', pts: [[-2, -10], [-9, -34], [-3, -58], [-6, -84]], w: 3.4 },
  { id: 'dogu', pts: [[9, -4], [30, -10], [52, -24]], w: 3.2 },
  { id: 'bati', pts: [[-1, 34], [-22, 28], [-44, 30], [-58, 14]], w: 2.8 },
  { id: 'dar', pts: [[30, -10], [27, -38], [8, -50], [-4, -54]], w: 2.2 },
  { id: 'hamam', pts: [[-58, 14], [-48, -12], [-26, -12], [-9, -7]], w: 2.6 },
];
export const SQUARE = { c: [0, 0] as V2, r: 11 };
/** Meydandaki çınar gövdesi ve oturma sekisi (çarpışma) */
export const PLANE_TREE = { c: [-3.5, 3] as V2, r: 1.6 };

/** Noktanın bir doğru parçasına uzaklığı ve parçadaki konumu */
export function segDist(p: V2, a: V2, b: V2): { d: number; t: number } {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L));
  return { d: Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dz * t)), t };
}
/** Sokak içinde mi (kenardan `pad` m pay ile; negatif pay sokağı genişletir) */
export function onStreet(x: number, z: number, pad = 0): boolean {
  if (Math.hypot(x - SQUARE.c[0], z - SQUARE.c[1]) < SQUARE.r - pad) return true;
  for (const s of STREETS) for (let i = 0; i < s.pts.length - 1; i++) if (segDist([x, z], s.pts[i], s.pts[i + 1]).d < s.w / 2 - pad) return true;
  return false;
}

/* ===================== simge yapılar ===================== */
/** Cuma Camii: meydanın batısında, kapısı meydana bakar (ölçü temsilî) */
export const MOSQUE = { c: [-18.5, -1] as V2, w: 10, d: 10, yaw: -Math.PI / 2 };
/** Köy hamamı: hamam sokağının kuzeyinde (ölçü temsilî) */
export const HAMAM = { c: [-37, -4] as V2, w: 12, d: 8 };
/** Meydan çeşmesi (temsilî) */
export const FOUNTAIN = { c: [7.5, -7.8] as V2, yaw: -0.8 };

/** Yürünebilir: sokak/meydan içinde, çınarın ve çeşmenin dışında */
export function walkable(x: number, z: number): boolean {
  if (!onStreet(x, z, 0.3)) return false;
  if (Math.hypot(x - PLANE_TREE.c[0], z - PLANE_TREE.c[1]) < PLANE_TREE.r + 0.3) return false;
  if (Math.abs(x - FOUNTAIN.c[0]) < 1.4 && Math.abs(z - FOUNTAIN.c[1]) < 0.9) return false;
  return true;
}
/** Duvar boyunca kayarak hareket */
export function slide(p: V2, dx: number, dz: number): V2 {
  let [x, z] = p;
  if (walkable(x + dx, z)) x += dx;
  if (walkable(x, z + dz)) z += dz;
  return [x, z];
}

/* ===================== evler ===================== */
export interface House {
  id: string; x: number; z: number; w: number; d: number;
  /** cephenin baktığı yön (sokağa doğru), dünya y ekseni etrafında; cephe normali (−sin, −cos) */
  yaw: number; floors: 2 | 3; color: string; cumba: boolean; door: boolean; base: number;
}
/** Sıva renkleri (bugünkü köyde görülen renklerden esinlenir; temsilî) */
export const COLORS = ['#efe7d6', '#e9d38f', '#9fb6cf', '#b9a3c8', '#e7c3a6', '#f3efe6', '#c9d6b0', '#ead9b8'];
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
/** Bir ev dikdörtgeninin köşe ve kenar örnek noktaları */
export function houseSamples(h: Pick<House, 'x' | 'z' | 'w' | 'd' | 'yaw'>, n = 4): V2[] {
  const c = Math.cos(h.yaw), s = Math.sin(h.yaw), out: V2[] = [];
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const u = (i / n - 0.5) * h.w, v = (j / n - 0.5) * h.d; out.push([h.x + u * c + v * s, h.z - u * s + v * c]); }
  return out;
}
/** Nokta evin dikdörtgeni içinde mi (`m` m pay ile) */
export function inHouse(h: Pick<House, 'x' | 'z' | 'w' | 'd' | 'yaw'>, x: number, z: number, m = 0): boolean {
  const c = Math.cos(h.yaw), s = Math.sin(h.yaw), dx = x - h.x, dz = z - h.z, u = dx * c - dz * s, v = dx * s + dz * c;
  return Math.abs(u) < h.w / 2 + m && Math.abs(v) < h.d / 2 + m;
}
/** Sokağın `side` yanında, `t` konumunda, cephesi sokağa bakan ev */
function placeOn(st: Street, seg: number, t: number, side: 1 | -1, d: number) {
  const a = st.pts[seg], b = st.pts[seg + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), nx = (-dz / L) * side, nz = (dx / L) * side;
  const off = st.w / 2 + 0.35 + d / 2, x = a[0] + dx * t + nx * off, z = a[1] + dz * t + nz * off;
  // cephe normali (−sin yaw, −cos yaw) sokağa, yani (−nx, −nz) yönüne bakar
  return { x, z, yaw: Math.atan2(nx, nz) };
}
const blockedBySpecial = (p: V2) =>
  (Math.abs(p[0] - MOSQUE.c[0]) < MOSQUE.w / 2 + 1.5 && Math.abs(p[1] - MOSQUE.c[1]) < MOSQUE.d / 2 + 1.5) ||
  (Math.abs(p[0] - HAMAM.c[0]) < HAMAM.w / 2 + 1.2 && Math.abs(p[1] - HAMAM.c[1]) < HAMAM.d / 2 + 1.2) ||
  Math.hypot(p[0] - SQUARE.c[0], p[1] - SQUARE.c[1]) < SQUARE.r + 0.6;
const overlaps = (a: House, b: House) => Math.hypot(a.x - b.x, a.z - b.z) < (Math.hypot(a.w, a.d) + Math.hypot(b.w, b.d)) / 2 &&
  (houseSamples(b, 4).some((p) => inHouse(a, p[0], p[1], 0.15)) || houseSamples(a, 4).some((p) => inHouse(b, p[0], p[1], 0.15)));

/** Durakların bağlandığı simge evler (önce yerleşir) */
const LANDMARK: { id: string; street: string; seg: number; t: number; side: 1 | -1; w: number; d: number; floors: 2 | 3; color: string; cumba: boolean }[] = [
  { id: 'ev-tokmak', street: 'ana', seg: 1, t: 0.55, side: 1, w: 8, d: 8, floors: 3, color: '#e9d38f', cumba: true },
  { id: 'ev-cumba', street: 'ana', seg: 2, t: 0.45, side: -1, w: 9, d: 8, floors: 3, color: '#9fb6cf', cumba: true },
  { id: 'ev-hatil', street: 'bati', seg: 0, t: 0.5, side: -1, w: 8, d: 7, floors: 2, color: '#efe7d6', cumba: false },
  { id: 'ev-kerpic', street: 'yukari', seg: 0, t: 0.62, side: 1, w: 8, d: 8, floors: 3, color: '#b9a3c8', cumba: true },
  { id: 'ev-avlu', street: 'dogu', seg: 1, t: 0.45, side: -1, w: 9, d: 8, floors: 2, color: '#e7c3a6', cumba: true },
];
export const HOUSES: House[] = (() => {
  const out: House[] = [], r = rng(1453);
  const ok = (h: House) => houseSamples(h, 5).every((p) => !onStreet(p[0], p[1], -0.25) && !blockedBySpecial(p)) && !out.some((o) => overlaps(o, h));
  for (const L of LANDMARK) {
    const st = STREETS.find((s) => s.id === L.street)!, p = placeOn(st, L.seg, L.t, L.side, L.d);
    const h: House = { id: L.id, ...p, w: L.w, d: L.d, floors: L.floors, color: L.color, cumba: L.cumba, door: true, base: heightAt(p.x, p.z) };
    if (ok(h)) out.push(h);
  }
  for (const st of STREETS) for (let seg = 0; seg < st.pts.length - 1; seg++) {
    const a = st.pts[seg], b = st.pts[seg + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (const side of [1, -1] as const) for (let s = 3; s < L - 3; s += 0) {
      const w = 5.5 + r() * 3.5, d = 6.5 + r() * 2.5, t = (s + w / 2) / L; s += w + 0.15 + r() * 0.5; if (t > 0.97) break;
      const p = placeOn(st, seg, t, side, d);
      const h: House = { id: `ev-${out.length}`, ...p, w, d, floors: r() < 0.55 ? 2 : 3, color: COLORS[Math.floor(r() * COLORS.length)], cumba: r() < 0.55, door: r() < 0.8, base: heightAt(p.x, p.z) };
      if (ok(h)) out.push(h);
    }
  }
  // arka sıra: sokak evlerinin arkasında (bahçe ardında) ikinci bir ev; damlar birbirine yaslanır, köy sık görünür
  const front = out.slice();
  for (const f of front) {
    if (r() < 0.3) continue;
    const gap = 1.5 + r() * 3, w = 6 + r() * 3, d = 6 + r() * 2.5, k = f.d / 2 + gap + d / 2, nx = Math.sin(f.yaw), nz = Math.cos(f.yaw);
    const h: House = { id: `ev-${out.length}`, x: f.x + nx * k, z: f.z + nz * k, w, d, yaw: f.yaw + (r() - 0.5) * 0.3, floors: r() < 0.6 ? 2 : 3, color: COLORS[Math.floor(r() * COLORS.length)], cumba: false, door: false, base: 0 };
    h.base = heightAt(h.x, h.z);
    if (ok(h)) out.push(h);
  }
  return out;
})();
export const houseById = (id: string) => HOUSES.find((h) => h.id === id);
/** Evin cephe ortasının önündeki sokak noktası */
export function frontOf(h: House, dist = 1.6): V2 { return [h.x - Math.sin(h.yaw) * (h.d / 2 + dist), h.z - Math.cos(h.yaw) * (h.d / 2 + dist)]; }
/** Sokak kenarında ev olmayan yerlerde ahşap hatıllı taş avlu/bahçe duvarı parçaları: [x, z, yaw, uzunluk] */
export const WALLS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [], step = 1.2;
  for (const st of STREETS) for (let seg = 0; seg < st.pts.length - 1; seg++) {
    const a = st.pts[seg], b = st.pts[seg + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, yaw = Math.atan2(ux, uz);
    for (const side of [1, -1]) for (let s = 0; s <= L; s += step) {
      const nx = -uz * side, nz = ux * side, off = st.w / 2 + 0.45, x = a[0] + ux * s + nx * off, z = a[1] + uz * s + nz * off;
      if (onStreet(x, z, -0.2) || blockedBySpecial([x, z]) || HOUSES.some((h) => inHouse(h, x, z, 0.9))) continue;
      out.push([x, z, yaw, step + 0.05]);
    }
  }
  return out;
})();

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; /** işaretin konumu */ mark: [number, number, number] }
const SRC = {
  unesco: { title: 'UNESCO — Bursa and Cumalıkızık: the Birth of the Ottoman Empire', url: 'https://whc.unesco.org/en/list/1452' },
  ktbEv: { title: 'Kültür ve Turizm Bakanlığı — Cumalıkızık Houses', url: 'https://ktb.gov.tr/EN-36102/cumalikizik-houses.html' },
  ktb: { title: 'Kültür ve Turizm Bakanlığı — Cumalıkızık', url: 'https://www.ktb.gov.tr/EN-36101/cumalikizik.html' },
  tokmak: { title: 'Köşklü & Büber — Cumalıkızık Evlerinde Kapı Halka, Tokmak ve Aynaları (Art-Sanat)', url: 'https://avesis.atauni.edu.tr/yayin/50904872-2896-430d-afda-b936dcd437b9/door-ring-knocker-and-mirrors-in-bursa-cumalikizik-houses-bursa-cumalikizik-evlerinde-kapi-halka-tokmak-ve-aynalari' },
  yapim: { title: 'ODTÜ tezi — Cumalıkızık köyündeki geleneksel evlerin yapım teknikleri', url: 'https://avesis.metu.edu.tr/yonetilen-tez/0aae4aad-7396-448f-9891-00609bcd6e33/cumalikizik-koyundeki-geleneksel-evlerin-yapim-teknikleri-bursa-turkiye' },
  trt: { title: 'TRT Haber — Yedi asırlık Osmanlı köyü Cumalıkızık', url: 'https://www.trthaber.com/haber/turkiye/yedi-asirlik-osmanli-koyu-cumalikizik-762706.html' },
  sabah: { title: 'Daily Sabah — Cumalıkızık: A 700-year-old Ottoman village', url: 'https://www.dailysabah.com/travel/2019/03/09/cumalikizik-a-700-year-old-ottoman-village' },
};
function houseSpot(id: string, hid: string, name: string, kicker: string, markY: number, text: string, source: Source): Spot {
  const h = houseById(hid)!, at = frontOf(h, 2.1), mx = h.x - Math.sin(h.yaw) * (h.d / 2 + 0.25), mz = h.z - Math.cos(h.yaw) * (h.d / 2 + 0.25);
  return { id, name, kicker, at, reach: 3.6, text, source, mark: [mx, h.base + markY, mz] };
}
export const SPOTS: Spot[] = [
  houseSpot('tokmak', 'ev-tokmak', 'İki tokmaklı kapı', 'Kapı', 2.6,
    'Kapıların çoğunda iki tokmak bulunur. Anlatılana göre küçük tokmağı kadınlar, büyüğünü erkekler çalar; evdekiler sesten kimin geldiğini anlar. Köydeki 135 evi inceleyen bir araştırma bugüne ulaşan 66 halka ile 40 tokmağı kaydetmiş ve çoğunu 19. yüzyıla tarihlendirmiştir.', SRC.tokmak),
  houseSpot('cumba', 'ev-cumba', 'Kafesli ve cumbalı pencereler', 'Ev', 6.2,
    'Evler genellikle iki-üç katlıdır. Üst katlardaki pencereler cumbalı ya da ahşap kafeslidir: içeriden sokak görülür, dışarıdan içerisi görülmez. Geniş saçaklar ahşap cepheyi yağmurdan korur.', SRC.ktbEv),
  houseSpot('hatil', 'ev-hatil', 'Ahşap hatıllı taş duvar', 'Yapım', 2.4,
    'Zemin katlar moloz taştan örülür. Taşların arasına yaklaşık 80–100 cm aralıkla ahşap hatıllar (kirişler) yerleştirilir; hatıllar duvarı bağlar ve depreme karşı esneklik kazandırır.', SRC.yapim),
  houseSpot('kerpic', 'ev-kerpic', 'Kerpiç dolgulu ahşap iskelet', 'Yapım', 5.4,
    'Üst katlar ahşap iskelet olarak kurulur, iskeletin araları kerpiçle doldurulup sıvanır. Çatılar beşik ya da kırma biçimlidir ve alaturka kiremitle örtülür. Bazı onarımlarda kerpiç dolgunun yerini tuğla almıştır.', SRC.yapim),
  { id: 'sokak', name: 'Taş döşeli dar sokaklar', kicker: 'Sokak', at: [-7.6, -40], reach: 4, mark: [-7.6, heightAt(-7.6, -40) + 2.6, -40], source: SRC.trt,
    text: 'Köyün dar ve dolambaçlı sokakları yassı taşlarla döşelidir. Evlerin üst katları sokağa doğru taşar; bazı sokaklarda karşılıklı saçaklar neredeyse birbirine değer. Bu sokak dokusu köyün yüzyıllardır korunan Osmanlı yaşam düzenini yansıtır.' },
  { id: 'cami', name: 'Cuma Camii', kicker: 'Meydan', at: [MOSQUE.c[0] + MOSQUE.w / 2 + 3.5, MOSQUE.c[1]], reach: 5, mark: [MOSQUE.c[0] + MOSQUE.w / 2 + 1.5, heightAt(MOSQUE.c[0], MOSQUE.c[1]) + 4.2, MOSQUE.c[1]], source: SRC.sabah,
    text: 'Köyün camisi meydandadır. Yapım tarihi konusunda kaynaklar ayrılır: bir kısmı 1396, bir kısmı 17. yüzyıl verir. Köyün adının da cumaları çevre köylerden insanların namaz için burada toplanmasından geldiği anlatılır.' },
  { id: 'hamam', name: 'Köy hamamı', kicker: 'Hamam', at: [HAMAM.c[0], -12], reach: 4.5, mark: [HAMAM.c[0], heightAt(HAMAM.c[0], HAMAM.c[1]) + 3.4, HAMAM.c[1] - HAMAM.d / 2 - 0.3], source: SRC.sabah,
    text: 'Köyün Osmanlı dönemi hamamı kubbeli, taş bir yapıdır. Kubbelerdeki küçük cam gözler (fil gözü) içeriye ışık verir. Hamamın yapım tarihi kesin bilinmez; bazı kaynaklar 15. yüzyıl der.' },
  houseSpot('avlu', 'ev-avlu', 'Avlu kapısı', 'Ev', 2.6,
    'Evlere sokaktan çift kanatlı ahşap avlu kapılarından girilir. Avlu duvarları da ahşap hatıllı moloz taştan örülüdür. Avluda ocak, kuyu, ahır ve bahçe bulunur; evin günlük işleri burada görülür.', SRC.ktbEv),
  { id: 'meydan', name: 'Meydan ve çınar', kicker: 'Vakıf köyü', at: [2.5, 5.5], reach: 4.5, mark: [PLANE_TREE.c[0], heightAt(0, 0) + 3.4, PLANE_TREE.c[1]], source: SRC.unesco,
    text: 'Cumalıkızık, Osmanlı Devleti\'nin kuruluş yıllarında bir vakıf köyü olarak kuruldu: geliri Bursa\'daki Orhan Gazi Külliyesi\'ne ayrılmıştı. Erken Osmanlı kırsal yerleşiminin en iyi korunmuş örneklerinden biri olarak 2014\'te Bursa ile birlikte UNESCO Dünya Mirası Listesi\'ne girdi.' },
  { id: 'uludag', name: 'Uludağ eteğinde', kicker: 'Doğa', at: [-5.6, -80], reach: 5, mark: [-5.6, heightAt(-5.6, -84) + 2.6, -84], source: SRC.ktb,
    text: 'Köy, Bursa merkezine yaklaşık 10 km uzaklıkta, Uludağ\'ın eteğindedir. Çevresindeki ormanlar ve bahçeler kestanesi, böğürtleni ve ahududusuyla bilinir. Köyde bugün de yaşayan bir topluluk vardır; ziyaretçiler evlerin önünde kurulan tezgâhlardan yerel ürünler alır.' },
];
export const START: { at: V2; yaw: number } = { at: [1.6, 74], yaw: 0 };
/** Yakındaki durak (en yakını) */
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
/** Köyün sınırları (kroki ve ızgara) */
export const BOUNDS = { x0: -70, x1: 66, z0: -96, z1: 86 };
