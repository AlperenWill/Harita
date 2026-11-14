import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SITES } from './sites';

/**
 * Keşif Günlüğü: ziyaret edilen yapılar, deneyim içi bulgular ve rozetler.
 * localStorage'da kalıcıdır. Rozetler bulgulardan türetilir (ayrı saklanmaz, tutarsızlık olmaz).
 */
export const MOTIFS = ['lale', 'karanfil', 'sumbul', 'servi', 'hatayi', 'rumi'] as const;
export const LIGHT_PHASES = ['sabah', 'ogle', 'ikindi'] as const;

interface JournalState {
  visited: Record<string, number>;
  /** siteId → bulunan şeylerin kimlikleri (ör. 'motif:lale', 'isik:sabah', 'mihrap', 'kubbe') */
  finds: Record<string, string[]>;
  /** Haritaya dönüşte kameranın odaklanacağı son yapı */
  lastSite: string | null;
  visit: (id: string) => void;
  find: (siteId: string, key: string) => boolean;
  reset: () => void;
}

export const useJournal = create<JournalState>()(
  persist(
    (set, get) => ({
      visited: {},
      finds: {},
      lastSite: null,
      visit: (id) => set((s) => ({ lastSite: id, visited: s.visited[id] ? s.visited : { ...s.visited, [id]: Date.now() } })),
      find: (siteId, key) => {
        const list = get().finds[siteId] ?? [];
        if (list.includes(key)) return false;
        set((s) => ({ finds: { ...s.finds, [siteId]: [...list, key] } }));
        return true;
      },
      reset: () => set({ visited: {}, finds: {}, lastSite: null }),
    }),
    { name: 'miras-istanbul-journal-v1', partialize: (s) => ({ visited: s.visited, finds: s.finds, lastSite: s.lastSite }) },
  ),
);

export interface Badge { id: string; name: string; desc: string; icon: string; site?: string; earned: (s: Pick<JournalState, 'visited' | 'finds'>) => boolean }
const has = (s: Pick<JournalState, 'finds'>, site: string, key: string) => (s.finds[site] ?? []).includes(key);
export const BADGES: Badge[] = [
  { id: 'cini-ustasi', name: 'Çini Ustası', icon: '🌷', site: 'sultanahmet-camii', desc: 'Sultanahmet’te ışığın düştüğü altı çini motifinin hepsini keşfet.',
    earned: (s) => MOTIFS.every((m) => has(s, 'sultanahmet-camii', `motif:${m}`)) },
  { id: 'isigin-yolcusu', name: 'Işığın Yolcusu', icon: '🌅', site: 'sultanahmet-camii', desc: 'Sabah, öğle ve ikindi ışığını cami içinde gör.',
    earned: (s) => LIGHT_PHASES.every((p) => has(s, 'sultanahmet-camii', `isik:${p}`)) },
  { id: 'kubbe-kasifi', name: 'Kubbe Kaşifi', icon: '🕌', site: 'sultanahmet-camii', desc: 'Ana kubbenin altında durup yukarı bak.',
    earned: (s) => has(s, 'sultanahmet-camii', 'kubbe') },
  { id: 'huzur-yuruyusu', name: 'Huzur Yürüyüşü', icon: '🕊️', site: 'sultanahmet-camii', desc: 'Avludan mihraba kadar sessizce yürü.',
    earned: (s) => has(s, 'sultanahmet-camii', 'mihrap') },
  { id: 'yarimada-gezgini', name: 'Tarihi Yarımada Gezgini', icon: '🗺️', desc: 'Haritadaki dört UNESCO noktasının hepsini ziyaret et.',
    earned: (s) => SITES.every((x) => s.visited[x.id]) },
];
/** Bir deneyim, o yapıya ait tüm rozetler kazanılınca tamamlanmış sayılır */
export const isCompleted = (s: Pick<JournalState, 'visited' | 'finds'>, siteId: string) => {
  const own = BADGES.filter((b) => b.site === siteId);
  return own.length > 0 && own.every((b) => b.earned(s));
};
