/**
 * Hattuşa — açık dünya akışı (saf; test edilir).
 *
 * NEDEN: ~6 km'lik sur halkasının tamamını yakın ayrıntıda çizmek telefonu boğar. Halka, 30 örneklik (120 m) parçalara (chunk) bölünür:
 *   'hi'  : oyuncuya en yakın parçalar → tek tek taş dokulu kaide, kerpiç üst duvar, mazgallar, kuleler (aşınma gölgelendiricisi)
 *   'lo'  : orta mesafe → tek düzlemsel şerit (düz renk + basit doku), kuleler basit kutu
 *   'off' : sis mesafesinin ötesi → çizilmez (yalnızca tüm halkanın çok basit silüet şeridi kalır)
 * Histerezis: bir parça 'hi'ye R_hi içinde girer, 1,25·R_hi dışında çıkar (sınırda gidip gelme / takılma olmaz).
 * Uzak arazi: yakın arazi gerçek geometri (1,6 km kare); ötesi dağ panosu halkası (silindir + silüet dokusu, gerçek geometri yok).
 * Düşük kademe: dağ panosu ve uzak arazi kaldırılır; yalnızca gök + sis kalır. Sur ayrıntısı bir kademe düşer (LOD2).
 */
import { WALL, type V2 } from './site';

export type Tier = 'low' | 'medium' | 'high';
export type ChunkLevel = 'hi' | 'lo' | 'off';
export const CHUNK = 30;   // örnek (4 m) → 120 m
export interface Chunk { id: number; i0: number; i1: number; center: V2 }
export const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  for (let i0 = 0, id = 0; i0 < WALL.length; i0 += CHUNK, id++) { const i1 = Math.min(WALL.length, i0 + CHUNK + 1), mid = WALL[Math.floor((i0 + i1 - 1) / 2)]; out.push({ id, i0, i1, center: mid }); }
  return out;
})();
export function radii(tier: Tier) { return tier === 'high' ? { hi: 170, lo: 900 } : tier === 'medium' ? { hi: 120, lo: 700 } : { hi: 70, lo: 450 }; }
/** Parça düzeylerini hesapla (önceki düzeylerle histerezis) */
export function streamPlan(px: number, pz: number, tier: Tier, prev?: Map<number, ChunkLevel>): Map<number, ChunkLevel> {
  const r = radii(tier), out = new Map<number, ChunkLevel>();
  for (const c of CHUNKS) {
    // parçanın oyuncuya en yakın noktası (merkez değil: uzun parçada uç oyuncuya yakın olabilir)
    let d = Infinity; for (let i = c.i0; i < c.i1; i += 3) { const q = WALL[i % WALL.length]; d = Math.min(d, Math.hypot(q[0] - px, q[1] - pz)); }
    const was = prev?.get(c.id);
    const hiR = was === 'hi' ? r.hi * 1.25 : r.hi, loR = was === 'lo' || was === 'hi' ? r.lo * 1.15 : r.lo;
    out.set(c.id, d < hiR ? 'hi' : d < loR ? 'lo' : 'off');
  }
  return out;
}
export const countLevels = (m: Map<number, ChunkLevel>) => { const n = { hi: 0, lo: 0, off: 0 }; m.forEach((v) => n[v]++); return n; };
/** Uzak arazi kararı */
export const distantTerrain = (tier: Tier, saver: boolean) => ({ billboards: tier !== 'low' && !saver, farTerrain: tier !== 'low' });
