import { create } from 'zustand';
import type { Quality, TimeOfDay } from './types';

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
  setActiveMonument: (id: string | null) => void;
  selectPoint: (id: string | null) => void;
  setCameraTarget: (t: string) => void;
  setTimeOfDay: (t: TimeOfDay) => void;
  setQuality: (q: Quality) => void;
  setBatterySaver: (v: boolean) => void;
}

export const useMonumentStore = create<MonumentState>((set) => ({
  activeMonument: null,
  selectedPoint: null,
  cameraTarget: 'overview',
  timeOfDay: 'ogle',
  quality: 'high',
  batterySaver: false,
  setActiveMonument: (id) => set({ activeMonument: id, selectedPoint: null, cameraTarget: 'overview' }),
  selectPoint: (id) => set((s) => ({ selectedPoint: id, cameraTarget: id ?? s.cameraTarget })),
  setCameraTarget: (t) => set({ cameraTarget: t }),
  setTimeOfDay: (t) => set({ timeOfDay: t }),
  setQuality: (q) => set({ quality: q }),
  setBatterySaver: (v) => set({ batterySaver: v }),
}));
