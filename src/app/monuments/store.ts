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
  /** 'orbit': kuş bakışı kamera · 'walk': yerde yürüme (birinci şahıs) */
  mode: 'orbit' | 'walk';
  /** Yürüme modunda ışınlanma isteği (ör. mozole kapısına) */
  teleport: { x: number; z: number; yaw: number; n: number } | null;
  setActiveMonument: (id: string | null) => void;
  selectPoint: (id: string | null) => void;
  setCameraTarget: (t: string) => void;
  setTimeOfDay: (t: TimeOfDay) => void;
  setQuality: (q: Quality) => void;
  setBatterySaver: (v: boolean) => void;
  setMode: (m: 'orbit' | 'walk') => void;
  teleportTo: (x: number, z: number, yaw: number) => void;
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
  setActiveMonument: (id) => set({ activeMonument: id, selectedPoint: null, cameraTarget: 'overview', mode: 'orbit', teleport: null }),
  selectPoint: (id) => set((s) => ({ selectedPoint: id, cameraTarget: id ?? s.cameraTarget })),
  setCameraTarget: (t) => set({ cameraTarget: t }),
  setTimeOfDay: (t) => set({ timeOfDay: t }),
  setQuality: (q) => set({ quality: q }),
  setBatterySaver: (v) => set({ batterySaver: v }),
  setMode: (m) => set({ mode: m, selectedPoint: null, cameraTarget: 'overview' }),
  teleportTo: (x, z, yaw) => set((s) => ({ mode: 'walk', teleport: { x, z, yaw, n: (s.teleport?.n ?? 0) + 1 } })),
}));
