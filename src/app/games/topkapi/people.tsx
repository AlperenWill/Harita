/**
 * Topkapı — figürler. Kız Kulesi'nin iskeletli karakteri (Character) Osmanlı kıyafetiyle giydirilir:
 * uzun kaftan + kuşak + yaka şeridi, başlık (kavuk, sarık, börk, yemeni) ve sakal. Kıyafetler dönem havası verir; birebir kıyafet
 * rekonstrüksiyonu değildir. Rehber Hasan Efendi kurgusal bir saray kâtibidir.
 * Arka plan figürleri: duranlar (oyuncu yaklaşınca başını çevirir), konuşanlar (dudak + el hareketi) ve döngüsel yolda yürüyenler.
 * Uzaktaki figürler çizilmez (55 m); düşük kademede "minTier" figürleri hiç eklenmez.
 */
import { useMemo } from 'react';
import type { Palette } from '../kiz-kulesi/NPCController';
import { Crowd, type Walker } from '../shared/Crowd';
import { EXTRAS, type Role, type Zone } from './world';

export const HASAN: Palette = { skin: '#d6a47e', hair: '#2b1f18', top: '#2c5a4a', pants: '#2c2a26', shoes: '#6b3d22', kaftan: '#2c5a4a', sash: '#d8b25a', trim: '#c99a3a', hat: 'kavuk', hatColor: '#f4f0e6', beard: '#3b2b22' };
export const VISITOR: Palette = { skin: '#c99272', hair: '#151515', top: '#2f8f83', pants: '#3a3a42', shoes: '#e9e6df' };

const ROLE: Record<Role, Palette[]> = {
  muhafiz: [{ skin: '#c8946e', hair: '#1c1410', top: '#8e2a22', pants: '#3a2a22', shoes: '#c9a24a', kaftan: '#8e2a22', sash: '#262626', trim: '#d1a645', hat: 'bork', hatColor: '#efe9de', beard: '#2a1d16' }],
  vezir: [
    { skin: '#e0b08c', hair: '#c9c4bb', top: '#ece4cf', pants: '#ece4cf', shoes: '#d9b25a', kaftan: '#ece4cf', sash: '#2f6b4a', trim: '#d1a645', hat: 'kavuk', hatColor: '#fbf8f1', beard: '#dcd8d0' },
    { skin: '#cf9e7a', hair: '#3a2c22', top: '#7d2a3a', pants: '#3a1a22', shoes: '#d9b25a', kaftan: '#7d2a3a', sash: '#e6d6a8', trim: '#d1a645', hat: 'kavuk', hatColor: '#fbf8f1', beard: '#8a8278' },
    { skin: '#d8a985', hair: '#2a2018', top: '#2f5d43', pants: '#1f3a2a', shoes: '#d9b25a', kaftan: '#2f5d43', sash: '#c9a24a', trim: '#e7c66a', hat: 'kavuk', hatColor: '#f6f3ec', beard: '#5a4a3c' },
  ],
  hizmetkar: [{ skin: '#c48c66', hair: '#1f1510', top: '#6b5a46', pants: '#3b3024', shoes: '#4a3424', kaftan: '#6b5a46', sash: '#a4462c', hat: 'sarik', hatColor: '#e9e3d6' },
    { skin: '#d3a07c', hair: '#2a1b12', top: '#4a5a72', pants: '#2b3342', shoes: '#4a3424', kaftan: '#4a5a72', sash: '#c9a24a', hat: 'sarik', hatColor: '#efe9dc' }],
  asci: [{ skin: '#cf9a76', hair: '#2a1b12', top: '#efe8da', pants: '#8a7a64', shoes: '#4a3424', kaftan: '#efe8da', sash: '#7a4a2a', hat: 'sarik', hatColor: '#f7f3ea', beard: '#3a2a20' }],
  hanim: [{ skin: '#e6bb98', hair: '#2a1a12', top: '#d97a9a', pants: '#a54a6a', shoes: '#c9a24a', kaftan: '#d97a9a', sash: '#f2d27a', trim: '#f2d27a', hat: 'yemeni', hatColor: '#f6e9dc' },
    { skin: '#e0b28e', hair: '#3a2416', top: '#5a7fbf', pants: '#33507f', shoes: '#c9a24a', kaftan: '#5a7fbf', sash: '#efe0b8', trim: '#e9cf86', hat: 'yemeni', hatColor: '#e9c8d6' }],
  aga: [{ skin: '#6e4a36', hair: '#120c08', top: '#3a2f6b', pants: '#221c40', shoes: '#c9a24a', kaftan: '#3a2f6b', sash: '#d1a645', trim: '#d1a645', hat: 'sarik', hatColor: '#f4efe4' }],
  katip: [{ skin: '#d6a47e', hair: '#2b1f18', top: '#6a4a2a', pants: '#2c2a26', shoes: '#6b3d22', kaftan: '#6a4a2a', sash: '#e6d6a8', hat: 'sarik', hatColor: '#f4f0e6', beard: '#2b1f18' }],
};
/** Bu bölgedeki figürler */
export function Extras({ zone, low, player }: { zone: Zone; low: boolean; player: React.MutableRefObject<{ x: number; z: number }> }) {
  const list = useMemo<Walker[]>(() => EXTRAS.filter((e) => e.zone === zone && (!low || !e.minTier)).map((e, i) => ({ ...e, palette: ROLE[e.role][i % ROLE[e.role].length] })), [zone, low]);
  return <Crowd list={list} player={player} />;
}
