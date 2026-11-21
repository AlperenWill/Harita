import { create } from 'zustand';
import type { Quality, TimeOfDay } from './types';
/** Yürüyüşte bulunulan yer (anitkabir/interior.ts ile aynı) */
export type Level = 'out' | 'muze1' | 'muze2';

/**
 * Anıt sahneleri için ortak durum. `activeMonument` ayarlandığında ilgili sahne
 * (registry üzerinden) tembel yüklenir; null olduğunda sahne kaldırılır.
 */
interface MonumentState {
  activeMonument: string | null;
  selectedPoint: string | null;
  cameraTarget: string;
  timeOfDay: TimeOfDay;
  quality: Quality;
  /** Pil < %20 ya da kullanıcı tercihi: gölge, sis ve partiküller kapanır */
  batterySaver: boolean;
  /** 'orbit': kuş bakışı kamera · 'walk': yerde yürüme (birinci şahıs) */
  mode: 'orbit' | 'walk';
  /** Yürüme modunda ışınlanma isteği (ör. mozole kapısına) */
  teleport: { x: number; z: number; yaw: number; n: number; level?: Level } | null;
  /** Yürüyüşte bulunulan yer: dışarısı, müze 1. bölüm, müze 2.–4. bölüm */
  level: Level;
  /** Yakındaki kapı ya da incelenebilir nokta (E) ve açık bilgi kartı */
  prompt: { id: string; label: string } | null;
  exhibit: { kicker: string; title: string; text: string; source?: { title: string; url: string } } | null;
  set: (p: Partial<MonumentState>) => void;
  setActiveMonument: (id: string | null) => void;
  selectPoint: (id: string | null) => void;
  setCameraTarget: (t: string) => void;
  setTimeOfDay: (t: TimeOfDay) => void;
  setQuality: (q: Quality) => void;
  setBatterySaver: (v: boolean) => void;
  setMode: (m: 'orbit' | 'walk') => void;
  teleportTo: (x: number, z: number, yaw: number, level?: Level) => void;
}

export const useMonumentStore = create<MonumentState>((set) => ({
  activeMonument: null,
  selectedPoint: null,
  cameraTarget: 'overview',
  timeOfDay: 'ogle',
  quality: 'high',
  batterySaver: false,
  mode: 'orbit',
  teleport: null,
  level: 'out', prompt: null, exhibit: null,
  set: (p) => set(p),
  setActiveMonument: (id) => set({ activeMonument: id, selectedPoint: null, cameraTarget: 'overview', mode: 'orbit', teleport: null, level: 'out', prompt: null, exhibit: null }),
  selectPoint: (id) => set((s) => ({ selectedPoint: id, cameraTarget: id ?? s.cameraTarget })),
  setCameraTarget: (t) => set({ cameraTarget: t }),
  setTimeOfDay: (t) => set({ timeOfDay: t }),
  setQuality: (q) => set({ quality: q }),
  setBatterySaver: (v) => set({ batterySaver: v }),
  setMode: (m) => set({ mode: m, selectedPoint: null, cameraTarget: 'overview', ...(m === 'orbit' ? { level: 'out' as const, prompt: null, exhibit: null } : {}) }),
  teleportTo: (x, z, yaw, level = 'out') => set((s) => ({ mode: 'walk', level, exhibit: null, teleport: { x, z, yaw, level, n: (s.teleport?.n ?? 0) + 1 } })),
}));

if (typeof location !== 'undefined' && location.search.includes('debug')) (window as unknown as { __mon: unknown }).__mon = useMonumentStore;
