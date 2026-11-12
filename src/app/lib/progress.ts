import { useSyncExternalStore } from 'react';

/** Oyun ilerlemesi (localStorage). Her tarihi nokta için en iyi skor ve oynanma sayısı. */
export interface Progress {
  sites: Record<string, { best: number; plays: number }>;
  test: { best: number; last: number; plays: number } | null;
}
const KEY = 'turkiyeyi-kesfet-progress-v1';
const empty: Progress = { sites: {}, test: null };
let cache: Progress = read();
const listeners = new Set<() => void>();

function read(): Progress {
  try { return { ...empty, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return empty; }
}
function write(p: Progress) {
  cache = p;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* gizli sekme */ }
  listeners.forEach((l) => l());
}
export function recordSite(id: string, score: number) {
  const prev = cache.sites[id];
  write({ ...cache, sites: { ...cache.sites, [id]: { best: Math.max(prev?.best ?? 0, score), plays: (prev?.plays ?? 0) + 1 } } });
}
export function recordTest(score: number) {
  write({ ...cache, test: { best: Math.max(cache.test?.best ?? 0, score), last: score, plays: (cache.test?.plays ?? 0) + 1 } });
}
export function resetProgress() { write(empty); }
export function useProgress(): Progress {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => cache);
}
