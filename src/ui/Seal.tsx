import { PERIOD_BY_ID } from '../data/regions';
import type { Period } from '../data/types';

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Koleksiyon mührü: her noktaya özgü, kimliğinden deterministik üretilen geometrik motif.
 * Sekiz kollu yıldız + yaprak halkası — çini geometrisinden sadeleştirilmiş, klişeye kaçmayan bir dil.
 */
export function Seal({ id, period, size = 64, locked = false }: { id: string; period: Period; size?: number; locked?: boolean }) {
  const h = hash(id);
  const petals = 6 + (h % 4) * 2; // 6, 8, 10, 12
  const inner = 0.28 + ((h >> 3) % 5) * 0.03;
  const rot = (h >> 7) % 45;
  const c = locked ? '#5b534b' : PERIOD_BY_ID[period].color;
  const star = Array.from({ length: 16 }, (_, i) => {
    const r = i % 2 ? inner * 50 : 34;
    const a = (i * Math.PI) / 8;
    return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill={locked ? '#2b2622' : '#f3ebe0'} stroke={c} strokeWidth="3" />
      <g transform={`rotate(${rot} 50 50)`} opacity={locked ? 0.4 : 1}>
        {Array.from({ length: petals }).map((_, i) => (
          <ellipse key={i} cx="50" cy="13" rx="4.5" ry="9" fill={c} opacity="0.55" transform={`rotate(${(360 / petals) * i} 50 50)`} />
        ))}
        <polygon points={star} fill={c} />
        <circle cx="50" cy="50" r={8 + (h % 5)} fill={locked ? '#2b2622' : '#f3ebe0'} />
        <circle cx="50" cy="50" r="4" fill={c} />
      </g>
    </svg>
  );
}
