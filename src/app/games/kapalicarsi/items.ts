/**
 * Tezgâhtaki nesneler (saf; test edilir). Her dükkânın tezgâhında 5 nesne durur; dükkân kimliğinden deterministik üretilir.
 * Hedef dükkânda aranan eşya, yem dükkânında "benzer ama sahte" eşya bulunur. Başka dükkânlarda da arada aynı türden
 * ama tarife uymayan çeşitler çıkar: oyuncu tarifi (malzeme, süs) dikkatle okumalıdır.
 */
import { rng, type Layout } from './ProceduralStreetGenerator';

export type Kind = 'anahtar' | 'harita' | 'pusula' | 'kutu' | 'tespih' | 'mal';
export interface CounterItem { kind: Kind; variant: number; label: string; role: 'hedef' | 'yem' | null; color: string; accent: string }
/** Tür başına çeşitler: 0 = hedef (tarife uyar), 1 = yem, 2–3 = başka çeşitler */
export const VARIANTS: Record<Exclude<Kind, 'mal'>, { label: string; color: string; accent: string }[]> = {
  anahtar: [{ label: 'Pirinç anahtar; kulpunda sekiz köşeli yıldız oyması', color: '#c9a24a', accent: '#8a6a2a' }, { label: 'Paslı demir anahtar', color: '#6b4a3a', accent: '#4a2e22' }, { label: 'Gümüş renkli düz kulplu anahtar', color: '#c8c8cc', accent: '#9a9aa0' }, { label: 'Pirinç anahtar; kulpu düz halka', color: '#c9a24a', accent: '#c9a24a' }],
  harita: [{ label: 'Deri kılıfa sarılmış, yıpranmış rulo harita', color: '#e8d9b0', accent: '#6b3d22' }, { label: 'Yeni basılmış katlanmış turist haritası', color: '#7ec0e8', accent: '#e8d24a' }, { label: 'Çerçeveli eski gravür', color: '#e0d2b0', accent: '#3a2a1a' }, { label: 'Kılıfsız rulo harita', color: '#e8d9b0', accent: '#e8d9b0' }],
  pusula: [{ label: 'Gümüş cep pusulası; kapağında lale kabartması, zinciri kopuk', color: '#d8d8de', accent: '#b8b8c0' }, { label: 'Plastik oyuncak pusula', color: '#d8402a', accent: '#f2f2f2' }, { label: 'Pirinç gemici pusulası', color: '#c9a24a', accent: '#2a2a2a' }, { label: 'Gümüş pusula; kapağı düz', color: '#d8d8de', accent: '#d8d8de' }],
  kutu: [{ label: 'Koyu ceviz kutu; kapağında sedef yıldızlar', color: '#4a2e1c', accent: '#f2ece0' }, { label: 'Mavi boyalı tahta kutu', color: '#2f5fa8', accent: '#f2c230' }, { label: 'Bakır kakmalı kutu', color: '#7a4a2a', accent: '#c06a3a' }, { label: 'Koyu ceviz kutu; kapağı düz', color: '#4a2e1c', accent: '#4a2e1c' }],
  tespih: [{ label: 'Otuz üç taneli bal rengi kehribar tespih, gümüş imameli', color: '#e0a030', accent: '#d8d8de' }, { label: 'Cam boncuklu renkli tespih', color: '#3ab0d8', accent: '#e0453a' }, { label: 'Abanoz tespih', color: '#2a1a12', accent: '#2a1a12' }, { label: 'Kehribar renkli plastik tespih', color: '#f2b84a', accent: '#f2b84a' }],
};
const MAL: Record<string, string[]> = {
  kuyumcu: ['Altın bilezik', 'Gümüş yüzük', 'Telkâri broş'], halici: ['Küçük kilim parçası', 'Yün yumağı', 'Halı fırçası'], bakirci: ['Bakır cezve', 'Kalaylı tas', 'Bakır tepsi'],
  baharatci: ['Bir avuç sumak', 'Pul biber', 'Lokum kutusu'], lambaci: ['Mozaik cam lamba', 'Pirinç kandil', 'Renkli cam fanus'], cinici: ['Lale desenli tabak', 'Çini karo', 'Seramik kase'],
  antikaci: ['Eski cep saati', 'Pirinç havan', 'Sepya fotoğraf'], kumasci: ['İpek eşarp', 'Peştemal', 'Yağlık'],
};
export function counterItems(L: Layout, shopId: number): CounterItem[] {
  const r = rng(L.seed * 31 + shopId * 7919), kind = L.item.id as Exclude<Kind, 'mal'>, V = VARIANTS[kind], s = L.shops[shopId], out: CounterItem[] = [];
  const add = (v: number, role: CounterItem['role']) => out.push({ kind, variant: v, label: V[v].label, role, color: V[v].color, accent: V[v].accent });
  if (shopId === L.target) { add(0, 'hedef'); add(2, null); add(3, null); }
  else if (shopId === L.decoy) { add(1, 'yem'); add(3, null); }
  else if (L.item.trades.includes(s.trade) && r() < 0.6) { add(2 + Math.floor(r() * 2), null); if (r() < 0.4) add(1, null); }
  const mal = MAL[s.trade]; while (out.length < 5) out.push({ kind: 'mal', variant: out.length, label: mal[Math.floor(r() * mal.length)], role: null, color: '#b8a070', accent: '#6a5030' });
  // karıştır (hedef hep aynı yerde durmasın)
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  // ikinci "yem" rolü yalnızca yem dükkânında: başka dükkândaki 1. çeşit sıradan bir benzerdir
  return out.map((it) => (it.role === null || shopId === L.target || shopId === L.decoy ? it : { ...it, role: null }));
}
