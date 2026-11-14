import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Galata Kulesi oyun durumu (Zustand). Oyun bölümleri sırayla açılır; kaybetme yoktur.
 * Kalıcı olan yalnızca "tamamlandı" bilgisi ve en son ulaşılan bölümdür (yeniden açınca kaldığı yerden sürer).
 */
export type Chapter = 'giris' | 'zindan' | 'merdiven' | 'sergi' | 'teras' | 'son';
export const CHAPTERS: Chapter[] = ['giris', 'zindan', 'merdiven', 'sergi', 'teras', 'son'];
export const CHAPTER_LABEL: Record<Chapter, string> = {
  giris: 'Giriş', zindan: 'Zindan · Ceneviz', merdiven: 'Merdiven', sergi: 'Sergi · Osmanlı', teras: 'Teras · Bugün', son: 'Kulenin hafızası',
};

interface GalataState {
  chapter: Chapter;
  crests: string[];
  exhibits: string[];
  viewpoint: number;
  viewed: string[];
  muted: boolean;
  reached: Chapter;
  completedAt: number | null;
  setChapter: (c: Chapter) => void;
  findCrest: (id: string) => void;
  seeExhibit: (id: string) => void;
  setViewpoint: (i: number, id: string) => void;
  setMuted: (m: boolean) => void;
  complete: () => void;
  restart: () => void;
}
const fresh = { crests: [] as string[], exhibits: [] as string[], viewpoint: 0, viewed: [] as string[] };

export const useGalata = create<GalataState>()(
  persist(
    (set) => ({
      chapter: 'giris', ...fresh, muted: false, reached: 'giris', completedAt: null,
      setChapter: (chapter) => set((s) => ({ chapter, reached: CHAPTERS.indexOf(chapter) > CHAPTERS.indexOf(s.reached) ? chapter : s.reached })),
      findCrest: (id) => set((s) => (s.crests.includes(id) ? s : { crests: [...s.crests, id] })),
      seeExhibit: (id) => set((s) => (s.exhibits.includes(id) ? s : { exhibits: [...s.exhibits, id] })),
      setViewpoint: (viewpoint, id) => set((s) => ({ viewpoint, viewed: s.viewed.includes(id) ? s.viewed : [...s.viewed, id] })),
      setMuted: (muted) => set({ muted }),
      complete: () => set((s) => ({ completedAt: s.completedAt ?? Date.now() })),
      restart: () => set({ chapter: 'giris', ...fresh }),
    }),
    { name: 'miras-galata-v1', partialize: (s) => ({ muted: s.muted, reached: s.reached, completedAt: s.completedAt }) },
  ),
);
