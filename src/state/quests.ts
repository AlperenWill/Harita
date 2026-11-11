import type { Category, HeritageSite, Period, RegionId } from '../data/types';
import { displayProvince, PERIOD_BY_ID, REGION_BY_ID } from '../data/regions';

/** Keşfedilen bir noktanın, veri dosyası yüklü olmasa da rozet hesabı için yeterli özeti. */
export interface DiscoveryRecord {
  id: string;
  name: string;
  province: string;
  region: RegionId;
  category: Category;
  period: Period;
  at: number;
}

export interface Quest {
  id: string;
  kind: 'periods' | 'all' | 'region' | 'global';
  title: string;
  description: string;
  target: number;
  progress: (d: DiscoveryRecord[], inspected: string[]) => number;
}

/**
 * İl görevi: ilde ≥3 farklı dönem varsa "Zaman Katmanları", yoksa ilin tüm noktalarını keşfet.
 * Görevler veriden türetilir, el ile yazılmaz — yeni nokta eklemek görevi otomatik günceller.
 */
export function buildProvinceQuest(province: string, sites: HeritageSite[]): Quest {
  const periods = new Set(sites.map((s) => s.period));
  const name = displayProvince(province);
  if (periods.size >= 3) {
    return {
      id: `prov-periods-${province}`,
      kind: 'periods',
      title: `Zaman Katmanları: ${name}`,
      description: `${name} ilinde 3 farklı döneme ait eser bul. (${[...periods].map((p) => PERIOD_BY_ID[p].label).join(', ')})`,
      target: 3,
      progress: (d) => new Set(d.filter((x) => x.province === province).map((x) => x.period)).size,
    };
  }
  return {
    id: `prov-all-${province}`,
    kind: 'all',
    title: `${name} Kâşifi`,
    description: `${name} ilindeki ${sites.length} miras noktasının tümünü keşfet.`,
    target: sites.length,
    progress: (d) => d.filter((x) => x.province === province).length,
  };
}

export function buildRegionQuest(region: RegionId): Quest {
  const r = REGION_BY_ID[region];
  return {
    id: `region-${region}`,
    kind: 'region',
    title: `${r.name} Gezgini`,
    description: `${r.name} Bölgesi’nde 5 miras noktası keşfet.`,
    target: 5,
    progress: (d) => d.filter((x) => x.region === region).length,
  };
}

export const GLOBAL_QUESTS: Quest[] = [
  {
    id: 'zaman-yolcusu', kind: 'global', title: 'Zaman Yolcusu',
    description: '6 farklı döneme ait eser keşfederek Anadolu’nun zaman çizelgesinde yolculuk et.',
    target: 6, progress: (d) => new Set(d.map((x) => x.period)).size,
  },
  {
    id: 'yolun-izinde', kind: 'global', title: 'Yolun İzinde',
    description: 'Kervanların izini sür: 3 han, kervansaray ya da tarihî köprü keşfet.',
    target: 3, progress: (d) => d.filter((x) => x.category === 'han' || x.category === 'kopru').length,
  },
  {
    id: 'yasayan-miras', kind: 'global', title: 'Yaşayan Mirasın Sesi',
    description: '3 somut olmayan kültürel miras ögesini dinle ve keşfet.',
    target: 3, progress: (d) => d.filter((x) => x.category === 'somut-olmayan').length,
  },
  {
    id: 'kayip-detay', kind: 'global', title: 'Kayıp Mimari Detaylar',
    description: 'Keşif modunda parıldayan 5 kayıp mimari detayı bulup incele.',
    target: 5, progress: (_d, inspected) => inspected.length,
  },
  {
    id: 'yedi-bolge', kind: 'global', title: 'Yedi İklim',
    description: 'Yedi coğrafi bölgenin her birinde en az bir nokta keşfet.',
    target: 7, progress: (d) => new Set(d.map((x) => x.region)).size,
  },
  {
    id: 'unesco', kind: 'global', title: 'Dünya Mirası Koleksiyoncusu',
    description: '5 UNESCO Dünya Mirası alanını keşfet.',
    target: 5, progress: (d) => d.filter((x) => x.category === 'unesco').length,
  },
];

export const isComplete = (q: Quest, d: DiscoveryRecord[], inspected: string[]) =>
  q.progress(d, inspected) >= q.target;
