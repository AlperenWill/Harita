import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HeritageSite, RegionId } from '../data/types';
import { REGION_OF_PROVINCE } from '../data/regions';
import type { DiscoveryRecord } from './quests';

export type Level = 'country' | 'region' | 'province' | 'site';

interface NavState {
  level: Level;
  region: RegionId | null;
  province: string | null;
  site: HeritageSite | null;
  hovered: { kind: 'region' | 'province' | 'site'; id: string; label: string } | null;
  journalOpen: boolean;
  toast: { id: number; title: string; body: string } | null;
}

interface ProgressState {
  discovered: Record<string, DiscoveryRecord>;
  inspected: string[];
  completedQuests: string[];
  muted: boolean;
  seenIntro: boolean;
}

interface Actions {
  selectRegion: (id: RegionId) => void;
  selectProvince: (name: string) => void;
  selectSite: (s: HeritageSite) => void;
  back: () => void;
  goHome: () => void;
  setHovered: (h: NavState['hovered']) => void;
  inspectDetail: (siteId: string) => void;
  setJournal: (open: boolean) => void;
  toggleMute: () => void;
  showToast: (title: string, body: string) => void;
  markQuestComplete: (id: string) => void;
  dismissIntro: () => void;
}

export type Store = NavState & ProgressState & Actions;

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      level: 'country',
      region: null,
      province: null,
      site: null,
      hovered: null,
      journalOpen: false,
      toast: null,
      discovered: {},
      inspected: [],
      completedQuests: [],
      muted: false,
      seenIntro: false,

      selectRegion: (id) => set({ level: 'region', region: id, province: null, site: null, hovered: null }),
      selectProvince: (name) =>
        set({ level: 'province', region: REGION_OF_PROVINCE[name], province: name, site: null, hovered: null }),
      selectSite: (s) => {
        const d = get().discovered;
        const isNew = !d[s.id];
        set({
          level: 'site',
          site: s,
          province: s.province,
          region: REGION_OF_PROVINCE[s.province],
          hovered: null,
          discovered: isNew
            ? {
                ...d,
                [s.id]: {
                  id: s.id, name: s.name, province: s.province, region: REGION_OF_PROVINCE[s.province],
                  category: s.category, period: s.period, at: Date.now(),
                },
              }
            : d,
        });
        if (isNew) get().showToast('Yeni mühür', `${s.name} Keşif Günlüğü’ne eklendi.`);
      },
      back: () => {
        const { level, province } = get();
        if (level === 'site') set({ level: 'province', site: null });
        else if (level === 'province') set({ level: 'region', province: null });
        else if (level === 'region') set({ level: 'country', region: null });
        void province;
      },
      goHome: () => set({ level: 'country', region: null, province: null, site: null }),
      setHovered: (h) => set({ hovered: h }),
      inspectDetail: (siteId) => {
        if (get().inspected.includes(siteId)) return;
        set({ inspected: [...get().inspected, siteId] });
        get().showToast('Kayıp detay bulundu', 'Mimari detay Keşif Günlüğü’ne işlendi.');
      },
      setJournal: (open) => set({ journalOpen: open }),
      toggleMute: () => set({ muted: !get().muted }),
      showToast: (title, body) => set({ toast: { id: Date.now() + Math.random(), title, body } }),
      markQuestComplete: (id) => {
        if (!get().completedQuests.includes(id)) set({ completedQuests: [...get().completedQuests, id] });
      },
      dismissIntro: () => set({ seenIntro: true }),
    }),
    {
      name: 'anadolu-mirasi-v1',
      // Yalnızca ilerleme kalıcıdır; gezinme durumu her açılışta genel görünümden başlar.
      partialize: (s) => ({
        discovered: s.discovered,
        inspected: s.inspected,
        completedQuests: s.completedQuests,
        muted: s.muted,
        seenIntro: s.seenIntro,
      }),
    },
  ),
);
