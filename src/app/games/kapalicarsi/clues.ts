/**
 * Kapalıçarşı — esnafın ipucu mantığı (saf; test edilir).
 *
 * Oyuncu bir esnafa beş sorudan birini sorar. Doğru sorular gerçeğe götürür, yanlış soru yanıltır:
 *   esnaf  → "Bu eşya hangi esnafın işine yarar?"   doğru: hedef dükkânın zanaatı
 *   yon    → "En son nerede görüldü?"                 doğru: esnafın yerinden hedefe pusula yönü + uzaklık
 *   sokak  → "Hangi sokakta?"                          yalnızca AYNI loncadan esnaf bilir (lonca içi dayanışma); öbürleri doğru esnafa yönlendirir
 *   benzer → "Buna benzer bir şey satan var mı?"       YANILTICI: benzer ama sahte bir eşyanın (yem) bulunduğu dükkâna yollar
 *   kultur → "Çarşı hakkında ne anlatırsın?"           ipucu yok; çarşının tarihinden kısa bir bilgi
 * Neden böyle: oyuncu hangi sorunun güvenilir olduğunu deneyerek öğrenir ("yanlış soru sorarsan yanlış yöne gönderilirsin").
 * Yönler esnafın bulunduğu yerden hesaplanır; farklı esnaflara sormak hedefi üçgenlemeyi sağlar.
 */
import { TRADE_LABEL, compass, distanceWord, type Esnaf, type Layout } from './ProceduralStreetGenerator';

export type Question = 'esnaf' | 'yon' | 'sokak' | 'benzer' | 'kultur';
export const QUESTIONS: { id: Question; text: string }[] = [
  { id: 'esnaf', text: 'Böyle bir eşya hangi esnafın işine yarar?' },
  { id: 'yon', text: 'En son nerede görüldü?' },
  { id: 'sokak', text: 'Hangi sokakta olabilir?' },
  { id: 'benzer', text: 'Buna benzer bir şey satan var mı?' },
  { id: 'kultur', text: 'Çarşı hakkında ne anlatırsın?' },
];
export interface Clue { q: Question; esnaf: string; text: string; leadsTo: 'hedef' | 'yem' | null }
export const FACTS = [
  'Çarşının çekirdeği Cevahir Bedesteni, İstanbul’un fethinden kısa süre sonra Fatih Sultan Mehmed döneminde yapıldı.',
  'Sokaklar orada toplanan esnafın adını taşır: Kalpakçılar, Kuyumcular, Aynacılar, Fesçiler… Her lonca kendi sokağında toplanırdı.',
  'Kalpakçılar Caddesi bugün kuyumcularıyla bilinir; adını eskiden burada satılan kürk kalpaklardan alır.',
  '1894 depreminde çarşı ağır hasar gördü; onarım yaklaşık dört yıl sürdü ve çarşı bugünkü biçimini büyük ölçüde o zaman aldı.',
  'Lonca düzeninde çırak ustanın yanında yetişirdi; zanaat böyle elden ele geçerdi.',
  'Çarşıda iki bedesten vardır: ortadaki Cevahir Bedesteni ve doğudaki Sandal Bedesteni.',
];
const TITLE = (e: Esnaf) => `${e.name} ${['Usta', 'Efendi', 'Bey', 'Hanım'][e.name.length % 4]}`;
export const esnafTitle = (e: Esnaf) => (['Ayşe', 'Fatma', 'Zeynep', 'Emine', 'Hatice'].includes(e.name) ? `${e.name} Hanım` : TITLE(e).replace(' Hanım', ' Usta'));

/** Bir esnafın bir soruya cevabı (deterministik: aynı esnaf aynı soruya hep aynı cevabı verir) */
export function answer(L: Layout, e: Esnaf, q: Question): Clue {
  const t = L.shops[L.target], d = L.shops[L.decoy], at = e.at, who = esnafTitle(e), item = L.item;
  const tl = TRADE_LABEL[t.trade], dist = (s: typeof t) => Math.hypot(s.door[0] - at[0], s.door[1] - at[1]);
  switch (q) {
    case 'esnaf': return { q, esnaf: who, leadsTo: 'hedef', text: `Öyle bir ${item.name} ancak ${tl.plural} arasında bulunur, evladım. Onların dükkânlarına bak.` };
    case 'yon': return dist(t) < 4
      ? { q, esnaf: who, leadsTo: 'hedef', text: `Hemen şu yan dükkânda gördüm sanki!` }
      : { q, esnaf: who, leadsTo: 'hedef', text: `Sabah biri elinde ${item.name} ile ${compass(at, t.door)} tarafına gidiyordu; ${distanceWord(dist(t))}.` };
    case 'sokak': return e.trade === t.trade
      ? { q, esnaf: who, leadsTo: 'hedef', text: `Biz ${tl.plural} birbirimizi tanırız. ${L.streets[L.edges[t.edge].street]?.name ?? 'Ana caddede'} tarafındaki bir ${tl.esnaf} dükkânına bırakılmış olabilir.` }
      : { q, esnaf: who, leadsTo: null, text: `Ben ${TRADE_LABEL[e.trade].esnaf}ım, o işleri bilmem. Sokağı ancak ${tl.plural} bilir; onlardan birine sor.` };
    case 'benzer': return { q, esnaf: who, leadsTo: 'yem', text: `Benzerini gördüm! ${compass(at, d.door)} tarafında, ${distanceWord(dist(d))} bir ${TRADE_LABEL[d.trade].esnaf} satıyordu.` };
    default: return { q, esnaf: who, leadsTo: null, text: FACTS[(e.id + e.name.length) % FACTS.length] };
  }
}
