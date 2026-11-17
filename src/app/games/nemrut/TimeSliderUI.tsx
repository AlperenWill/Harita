/**
 * Gün döngüsü denetimi: alttaki sürgü + ekranın herhangi bir yerinde tek parmakla yatay sürükleme. Çift dokunma = "en iyi ışık".
 * Neden: oyuncu burada bir turist değil, zamanı hızlandırılmış izleyen bir nöbetçidir; tek etkileşim zamanın kendisidir.
 * Sürükleme sırasında `dragging` bayrağı açılır → güneş/atmosfer güncellemesi 30 Hz'e iner (pil); bırakınca her kareye döner.
 */
import { useRef } from 'react';
import { Moon, Sparkles, Sun, Sunrise, Sunset } from 'lucide-react';
import { PHASE_LABEL, SUNRISE, SUNSET, phaseOf, type Phase } from './DynamicLightingSystem';

export const clock = (h: number) => { const m = Math.round((((h % 24) + 24) % 24) * 60); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
/** Sürükleme (px) → saat: tam ekran genişliği = 12 saat */
export const dragToHours = (px: number, width: number) => (px / Math.max(320, width)) * 12;
export const wrapHour = (h: number) => ((h % 24) + 24) % 24;
const ICON: Record<Phase, typeof Sun> = { gece: Moon, safak: Sunrise, sabah: Sunrise, ogle: Sun, altin: Sunset, alacakaranlik: Sunset };

export function TimeSlider({ hour, onChange, onDrag, onBest, golden }: { hour: number; onChange: (h: number) => void; onDrag: (d: boolean) => void; onBest: () => void; golden: [number, number] | null }) {
  const p = phaseOf(hour), Icon = ICON[p], pct = (h: number) => `${(h / 24) * 100}%`;
  return (
    <div className="pointer-events-auto absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/60 p-3 backdrop-blur">
      <div className="mb-1.5 flex items-center gap-2 text-sm">
        <Icon size={16} className="text-amber-300" /><b className="tabular-nums">{clock(hour)}</b><span className="text-white/75">{PHASE_LABEL[p]}</span>
        <button onClick={onBest} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-amber-500 px-3 text-xs font-semibold text-black"><Sparkles size={14} /> En iyi ışık</button>
      </div>
      <div className="relative h-6">
        {/* gece / gündüz şeridi ve bu terasın altın saati */}
        <div className="absolute inset-x-0 top-2.5 h-1.5 rounded-full bg-indigo-950" />
        <div className="absolute top-2.5 h-1.5 rounded-full bg-gradient-to-r from-orange-300 via-sky-200 to-rose-300" style={{ left: pct(SUNRISE), width: pct(SUNSET - SUNRISE) }} />
        {golden && <div className="absolute top-1.5 h-3.5 rounded-full border border-amber-200/90 bg-amber-300/40" style={{ left: pct(golden[0]), width: pct(golden[1] - golden[0]) }} title="Bu terasın altın saati" />}
        <input type="range" min={0} max={24} step={0.05} value={hour} aria-label="Günün saati"
          onChange={(e) => onChange(Number(e.target.value))} onPointerDown={() => onDrag(true)} onPointerUp={() => onDrag(false)} onPointerCancel={() => onDrag(false)}
          className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent accent-amber-400" />
      </div>
      <p className="mt-1 text-center text-[11px] text-white/55">Ekranı yatay sürükle: zamanı akıt · çift dokun: en iyi ışık</p>
    </div>
  );
}

/** Ekran hareketleri: tek parmak yatay sürükleme = zaman; çift dokunma = en iyi ışık */
export function useTimeGestures(hourRef: React.MutableRefObject<number>, set: (h: number) => void, onDrag: (d: boolean) => void, onBest: () => void) {
  const st = useRef<{ x: number; id: number } | null>(null), lastTap = useRef(0), moved = useRef(0);
  return {
    onPointerDown: (e: React.PointerEvent) => { st.current = { x: e.clientX, id: e.pointerId }; moved.current = 0; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); },
    onPointerMove: (e: React.PointerEvent) => { const s = st.current; if (!s || s.id !== e.pointerId) return; const dx = e.clientX - s.x; s.x = e.clientX; moved.current += Math.abs(dx); if (moved.current > 6) { onDrag(true); set(wrapHour(hourRef.current + dragToHours(dx, innerWidth))); } },
    onPointerUp: (e: React.PointerEvent) => { if (st.current?.id !== e.pointerId) return; st.current = null; onDrag(false); if (moved.current <= 6) { const t = performance.now(); if (t - lastTap.current < 320) { onBest(); lastTap.current = 0; } else lastTap.current = t; } },
    onPointerCancel: () => { st.current = null; onDrag(false); },
  };
}
