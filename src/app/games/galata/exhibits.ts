/**
 * Galata Kulesi — sergi katı: dört vitrin, her biri bir dönemi anlatır.
 * Neden bu mekanik: Müze katında oyuncudan bir beceri istemek yerine yavaşlamasını isteriz. Kamera halka
 * biçimli galeride yalnızca ileri/geri gider; bir vitrine yaklaşınca kendiliğinden kilitlenir, yavaşça
 * etrafında döner (auto-zoom orbit) ve anlatım başlar. Oyuncunun yapacağı tek şey dinlemek ve devam etmek.
 */
import { INNER_R } from './dungeon';

export interface Exhibit { id: string; name: string; era: string; text: string; angle: number; source: { title: string; url: string } }
/** angle: galeri halkasındaki konum (rad, 0 = +x) */
export const EXHIBITS: Exhibit[] = [
  { id: 'harita', name: 'Galata surlarının eski haritası', era: 'Ceneviz · 14. yüzyıl', angle: 0.3,
    text: 'Galata, Haliç’in kuzey kıyısında surlarla çevrili bir Ceneviz kolonisiydi. Kule 1348’de bu surların en yüksek noktasına, gözetleme ve savunma için yapıldı.',
    source: { title: 'Wikipedia — Galata Tower', url: 'https://en.wikipedia.org/wiki/Galata_Tower' } },
  { id: 'zincir', name: 'Zindan zinciri', era: 'Osmanlı · 16. yüzyıl', angle: 0.3 + Math.PI / 2,
    text: '16. yüzyılda kule, Kasımpaşa tersanesinde çalıştırılan esirlerin tutulduğu bir zindan olarak kullanıldı. Bu vitrin, kulenin karanlık bir dönemini hatırlatır.',
    source: { title: 'Wikipedia — Galata Tower', url: 'https://en.wikipedia.org/wiki/Galata_Tower' } },
  { id: 'kanat', name: 'Hezarfen’in kanatları (efsane)', era: 'Osmanlı · 17. yüzyıl', angle: 0.3 + Math.PI,
    text: 'Evliya Çelebi’nin anlattığına göre Hezarfen Ahmed Çelebi, Galata Kulesi’nden kanatlarla Üsküdar’a süzüldü. Olayın gerçekliği kanıtlanamamıştır; bir efsane olarak anlatılır.',
    source: { title: 'Wikipedia — Galata Tower', url: 'https://en.wikipedia.org/wiki/Galata_Tower' } },
  { id: 'durbun', name: 'Yangın gözcüsünün dürbünü', era: 'Osmanlı → Cumhuriyet', angle: 0.3 + (3 * Math.PI) / 2,
    text: 'Ahşap evlerle dolu İstanbul’da yangın büyük bir tehlikeydi. Kule 18. yüzyıldan itibaren yangın gözetleme kulesi oldu. 1794’te kendisi de yandı, sonraki yüzyıllarda defalarca onarıldı; 1965–67 onarımıyla bugünkü külahına kavuştu ve 2020’de müze olarak açıldı.',
    source: { title: 'Kültür Envanteri — Galata Kulesi', url: 'https://kulturenvanteri.com/en/yer/galata-kulesi/' } },
];

export const GALLERY_R = INNER_R - 1.5;      // yürüme halkası
export const VITRINE_R = INNER_R - 0.55;     // vitrinler duvara yakın
export const LOCK_DIST = 0.45;               // rad: vitrine bu açıdan yakınsa kilitlenir
export const START_ANGLE = 0.3 - 0.9;

/** Galeri açısına en yakın, henüz dinlenmemiş vitrin */
export function nearestExhibit(angle: number, seen: string[]): Exhibit | null {
  let best: Exhibit | null = null, bd = Infinity;
  for (const e of EXHIBITS) {
    if (seen.includes(e.id)) continue;
    const d = Math.abs(((angle - e.angle) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
    if (d < bd) { bd = d; best = e; }
  }
  return best && bd < LOCK_DIST ? best : null;
}
