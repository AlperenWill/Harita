/**
 * Efes — "Zaman Penceresi": rota, yapı konumları ve Zaman Penceresi noktaları (saf; test edilir).
 * Koordinat: metre; x doğu, z güney, y yukarı. Plan STİLİZEDİR: gerçek sıralama korunur, mesafeler kısaltılmıştır.
 *
 * Gezi (gerçek ziyaretçi yolu, yukarıdan aşağı): Odeon (Devlet Agorası) → Kuretler Caddesi (yokuş aşağı): Trajan Çeşmesi,
 * Hadrian Tapınağı, Yamaç Evler → Celsus Kütüphanesi meydanı → Mermer Cadde (kuzeye) → Büyük Tiyatro → Arkadiane (limana inen cadde).
 */
export type V3 = [number, number, number];
export type Surface = 'mermer' | 'toprak';

/** Kuretler Caddesi eğimi: doğuda yüksek, Celsus meydanında 0 */
export const groundY = (x: number, z: number) => (z > -14 ? Math.max(0, x - 8) * 0.11 : 0);

const WP: [number, number][] = [
  [104, -10], [96, -2], [84, 0], [70, 0], [56, 0], [44, 0], [30, 0], [18, 0], [8, 1], [3, -4], [4, -16], [6, -34], [8, -52], [10, -70], [12, -86], [13, -96], [6, -101], [-8, -102],
];
const PTS: V3[] = WP.map(([x, z]) => [x, groundY(x, z), z]);
const LENS = [0]; for (let i = 1; i < PTS.length; i++) LENS.push(LENS[i - 1] + Math.hypot(PTS[i][0] - PTS[i - 1][0], PTS[i][1] - PTS[i - 1][1], PTS[i][2] - PTS[i - 1][2]));
export const ROUTE_LEN = LENS[LENS.length - 1];
export function routeAt(s: number): { p: V3; dir: [number, number] } {
  const c = Math.max(0, Math.min(ROUTE_LEN, s)); let i = 1; while (i < LENS.length - 1 && LENS[i] < c) i++;
  const a = PTS[i - 1], b = PTS[i], k = (c - LENS[i - 1]) / Math.max(1e-6, LENS[i] - LENS[i - 1]);
  const x = a[0] + (b[0] - a[0]) * k, z = a[2] + (b[2] - a[2]) * k, dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1;
  return { p: [x, groundY(x, z), z], dir: [dx / l, dz / l] };
}
export function closestS(x: number, z: number): number { let best = 0, bd = Infinity; for (let s = 0; s <= ROUTE_LEN; s += 0.5) { const p = routeAt(s).p, d = Math.hypot(p[0] - x, p[2] - z); if (d < bd) { bd = d; best = s; } } return best; }

/* ---------- yapılar (merkez, yön) ---------- */
export const CELSUS = { x: -13, z: 2, w: 21, h: 16.5 } as const;          // cephe doğuya bakar
export const THEATRE = { x: 62, z: -98, r: 44 } as const;                 // oturma yeri batıya (caddeye) açılır
export const ODEON = { x: 104, z: -26, r: 14 } as const;
export const TRAJAN = { x: 70, z: 9 } as const;                           // cephe kuzeye (caddeye) bakar
export const HADRIAN = { x: 44, z: -8 } as const;                         // cephe güneye (caddeye) bakar
export const TERRACE = { x: 30, z: 20 } as const;                         // Yamaç Evler: caddenin güneyinde, yamaçta
export const HARBOR_X = -150;                                             // Arkadiane'nin vardığı antik liman (bugün kara)

/* ---------- Zaman Penceresi noktaları ---------- */
export interface Window { id: string; name: string; era: string; at: [number, number]; reach: number; now: string; then: string; source: { title: string; url: string }; s: number }
const W = (title: string, url: string) => ({ title, url });
const RAW: Omit<Window, 's'>[] = [
  { id: 'odeon', name: 'Odeon', era: 'MS 2. yüzyıl', at: [ODEON.x - 4, ODEON.z + 16], reach: 10, source: W('Wikipedia — Ephesus', 'https://en.wikipedia.org/wiki/Ephesus'),
    now: 'Yarım daire biçimli küçük bir oturma yeri; üstündeki çatı çoktan yok.', then: 'Kent meclisinin (bule) toplandığı, üstü örtülü küçük salon. Konser ve konuşmalar için de kullanılırdı; yaklaşık 1.400 kişi alırdı.' },
  { id: 'trajan', name: 'Trajan Çeşmesi', era: 'MS 2. yüzyıl başı', at: [TRAJAN.x, 2], reach: 9, source: W('Wikipedia — Ephesus', 'https://en.wikipedia.org/wiki/Ephesus'),
    now: 'İki katlı cephenin yalnızca birkaç sütunu ve alt kısmı ayakta.', then: 'İmparator Trajan adına yapılan anıtsal çeşme. Ortadaki nişte imparatorun büyük bir heykeli dururdu; su önündeki havuza akardı.' },
  { id: 'hadrian', name: 'Hadrian Tapınağı', era: 'MS 2. yüzyıl', at: [HADRIAN.x, 0], reach: 9, source: W('Wikipedia — Temple of Hadrian (Ephesus)', 'https://en.wikipedia.org/wiki/Temple_of_Hadrian,_Ephesus'),
    now: 'Kemerli küçük cephe; ayakta görülen cephenin bir bölümü kopyadır, özgün kabartmalar müzededir.', then: 'İmparator Hadrian onuruna yapılmış küçük tapınak. Ön kemerin ortasında bir kadın başı (Tykhe ya da Medusa olduğu düşünülür) kabartması vardır.' },
  { id: 'yamac', name: 'Yamaç Evler', era: 'MÖ 1. – MS 7. yüzyıl', at: [TERRACE.x, 4], reach: 9, source: W('Wikipedia — Terrace Houses, Ephesus', 'https://en.wikipedia.org/wiki/Terrace_Houses,_Ephesus'),
    now: 'Yamaca basamak basamak oturan evler bugün koruma çatısının altında; duvar resimleri ve mozaikler yerinde.', then: 'Kentin varlıklı ailelerinin evleri: iç avlular, mermer kaplı duvarlar, fresk ve mozaikler, sıcak su ve ısıtma sistemleri.' },
  { id: 'celsus', name: 'Celsus Kütüphanesi', era: 'MS 2. yüzyıl başı', at: [CELSUS.x + 12, CELSUS.z], reach: 12, source: W('Wikipedia — Library of Celsus', 'https://en.wikipedia.org/wiki/Library_of_Celsus'),
    now: 'İki katlı görkemli cephe 1970’lerde yeniden ayağa kaldırıldı; arkasındaki salon ve raflar yıkık.', then: 'Celsus adına oğlunun yaptırdığı kütüphane ve anıt mezar; Celsus’un lahdi binanın altındaydı. Binlerce parşömen rulosu duvarlardaki nişlerde saklanırdı.' },
  { id: 'tiyatro', name: 'Büyük Tiyatro', era: 'MÖ 3. yy – MS 2. yy (genişletildi)', at: [THEATRE.x - 48, THEATRE.z], reach: 12, source: W('Wikipedia — Great Theatre of Ephesus', 'https://en.wikipedia.org/wiki/Great_Theatre_of_Ephesus'),
    now: 'Panayır Dağı’nın yamacına oyulmuş dev oturma basamakları; sahne binasının yalnız alt kısmı ayakta.', then: 'Yaklaşık 25.000 kişilik tiyatro. Üç katlı sahne binası heykellerle süslüydü; tiyatro aynı zamanda halk toplantılarının yeriydi.' },
  { id: 'arkadiane', name: 'Arkadiane ve liman', era: 'MS 4.–5. yüzyıl', at: [-6, -102], reach: 10, source: W('Wikipedia — Ephesus', 'https://en.wikipedia.org/wiki/Ephesus'),
    now: 'Tiyatrodan batıya uzanan sütunlu cadde bugün tarlalarda bitiyor: deniz kilometrelerce geri çekildi.', then: 'Limandan kente uzanan, iki yanı revaklı ana cadde; geceleri fenerlerle aydınlatıldığı yazılır. Limanın zamanla alüvyonla dolması kentin gerilemesinde büyük rol oynadı.' },
];
export const WINDOWS: Window[] = RAW.map((w) => ({ ...w, s: closestS(w.at[0], w.at[1]) }));
export function nearWindow(s: number): Window | null { let b: Window | null = null, bd = Infinity; for (const w of WINDOWS) { const d = Math.abs(s - w.s); if (d < w.reach && d < bd) { bd = d; b = w; } } return b; }
export function nextUnseen(s: number, seen: string[]): Window | null { let b: Window | null = null, bd = Infinity; for (const w of WINDOWS) { if (seen.includes(w.id)) continue; const d = Math.abs(s - w.s); if (d < bd) { bd = d; b = w; } } return b; }

/** Sütun dizileri (caddelerin iki yanı): [x, z] listesi */
export function colonnade(): [number, number][] {
  const out: [number, number][] = [];
  for (let x = 92; x >= 14; x -= 4.2) { out.push([x, -5.4]); if (x < 60 || x > 76) out.push([x, 5.4]); }   // Kuretler (güneyde çeşmenin önü boş)
  for (let z = -14; z >= -90; z -= 4.2) out.push([routeAt(closestS(8, z)).p[0] - 4.6, z]);                   // Mermer Cadde (batı yanı revak)
  for (let x = 0; x >= HARBOR_X + 10; x -= 4.6) { out.push([x, -96.6]); out.push([x, -107.4]); }           // Arkadiane
  return out;
}
