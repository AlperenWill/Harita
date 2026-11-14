import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Keşif Günlüğü (ortak): hangi oyun açıldı, hangisi tamamlandı, oyun içi bulgular. Oyun mantığı burada değildir. */
interface Progress {
  visited: Record<string, number>;
  completed: Record<string, number>;
  finds: Record<string, string[]>;
  lastGame: string | null;
  visit: (id: string) => void;
  complete: (id: string) => void;
  find: (id: string, key: string) => void;
}
export const useProgress = create<Progress>()(
  persist(
    (set) => ({
      visited: {}, completed: {}, finds: {}, lastGame: null,
      visit: (id) => set((s) => ({ lastGame: id, visited: s.visited[id] ? s.visited : { ...s.visited, [id]: Date.now() } })),
      complete: (id) => set((s) => ({ completed: s.completed[id] ? s.completed : { ...s.completed, [id]: Date.now() } })),
      find: (id, key) => set((s) => ((s.finds[id] ?? []).includes(key) ? s : { finds: { ...s.finds, [id]: [...(s.finds[id] ?? []), key] } })),
    }),
    { name: 'miras-games-progress-v1', partialize: (s) => ({ visited: s.visited, completed: s.completed, finds: s.finds, lastGame: s.lastGame }) },
  ),
);
