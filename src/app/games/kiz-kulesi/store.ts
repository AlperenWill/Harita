import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { advance, byId, type Playback } from './dialogue';

/**
 * Kız Kulesi oyun durumu (Zustand).
 * Bölümler: baslangic → vapur → yanasma → kule → teras → donus → son. Kaybetme yok.
 * Kalıcı olan yalnızca tercihler (sesli okuma, yakınlaştırma, sessiz) ve "tamamlandı" bilgisi.
 */
export type Phase = 'baslangic' | 'vapur' | 'yanasma' | 'kule' | 'teras' | 'donus' | 'son';
export const PHASE_LABEL: Record<Phase, string> = {
  baslangic: 'Başlangıç', vapur: 'Vapur yolculuğu', yanasma: 'Ada', kule: 'Kule içi', teras: 'Teras', donus: 'Dönüş', son: 'Son',
};
export const now = () => performance.now() / 1000;

interface KizState {
  phase: Phase;
  playback: Playback | null;
  heard: string[];
  queue: string[];          // sırada bekleyen diyaloglar
  tts: boolean; muted: boolean; zoom: number;
  completedAt: number | null;
  setPhase: (p: Phase) => void;
  play: (id: string, queueIfBusy?: boolean) => boolean;
  next: () => 'complete-line' | 'next-line' | 'end' | null;
  setTts: (v: boolean) => void; setMuted: (v: boolean) => void;
  zoomBy: (d: number) => void;
  complete: () => void;
  reset: () => void;
}
export const ZOOM = { min: 0.65, max: 1.6 } as const;

export const useKiz = create<KizState>()(
  persist(
    (set, get) => ({
      phase: 'baslangic', playback: null, heard: [], queue: [], tts: true, muted: false, zoom: 1, completedAt: null,
      setPhase: (phase) => set({ phase, playback: null, queue: [] }),
      play: (id, queueIfBusy = true) => {
        const d = byId(id); if (!d) return false;
        if (get().playback) { if (queueIfBusy && !get().queue.includes(id)) set((s) => ({ queue: [...s.queue, id] })); return false; }
        set((s) => ({ playback: { dialogue: d, line: 0, start: now(), revealed: false }, heard: s.heard.includes(id) ? s.heard : [...s.heard, id] }));
        return true;
      },
      next: () => {
        const p = get().playback; if (!p) return null;
        const r = advance(p, now());
        if (r.event === 'end') {
          const [head, ...rest] = get().queue;
          set({ playback: null, queue: rest });
          if (head) setTimeout(() => get().play(head), 600);
        } else set({ playback: r.state });
        return r.event;
      },
      setTts: (tts) => set({ tts }), setMuted: (muted) => set({ muted }),
      zoomBy: (d) => set((s) => ({ zoom: Math.min(ZOOM.max, Math.max(ZOOM.min, +(s.zoom + d).toFixed(2))) })),
      complete: () => set((s) => ({ completedAt: s.completedAt ?? Date.now() })),
      reset: () => set({ phase: 'baslangic', playback: null, heard: [], queue: [] }),
    }),
    { name: 'miras-kiz-kulesi-v1', partialize: (s) => ({ tts: s.tts, muted: s.muted, zoom: s.zoom, completedAt: s.completedAt }) },
  ),
);
