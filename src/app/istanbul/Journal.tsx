import { Check, Lock } from 'lucide-react';
import { GAMES } from '../../games/core/registry';
import { useProgress } from '../../games/core/progress';
import { SiteIcon } from './SiteIcon';

type P = { visited: Record<string, number>; completed: Record<string, number>; finds: Record<string, string[]> };
/** Rozetler yalnızca ilerlemeyi okur; oyun mantığı içermez */
export const BADGES: { id: string; icon: string; name: string; desc: string; earned: (p: P) => boolean }[] = [
  { id: 'ilk-adim', icon: '🧭', name: 'İlk adım', desc: 'Bir yapının oyununu aç.', earned: (p) => Object.keys(p.visited).length >= 1 },
  { id: 'isik', icon: '☀️', name: 'Işığın peşinde', desc: 'Sultanahmet’te altı deseni de aç.', earned: (p) => !!p.completed['sultanahmet-camii'] },
  { id: 'yarimada', icon: '🏛️', name: 'Yarımada gezgini', desc: 'Beş yapının hepsini ziyaret et.', earned: (p) => GAMES.every((g) => p.visited[g.id]) },
];

/** Keşif Günlüğü: ziyaret edilen yapılar, tamamlanan oyunlar ve rozetler */
export function JournalPanel({ onPick }: { onPick?: (id: string) => void }) {
  const visited = useProgress((s) => s.visited), completed = useProgress((s) => s.completed), finds = useProgress((s) => s.finds);
  const st = { visited, completed, finds };
  const earned = BADGES.filter((b) => b.earned(st)).length;
  return (
    <div className="space-y-4">
      <ul className="space-y-1.5">
        {GAMES.map((g) => (
          <li key={g.id}>
            <button onClick={() => onPick?.(g.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${g.status === 'playable' ? 'bg-brand text-white' : 'bg-brand-50 text-brand'}`}><SiteIcon kind={g.kind} size={16} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{g.name}</span>
                <span className="block text-xs text-ink-muted">
                  {completed[g.id] ? 'Oyun tamamlandı' : g.status === 'playable' ? `${g.transformation.mechanic}${finds[g.id]?.length ? ` · ${finds[g.id].length} bulgu` : ''}` : 'Araştırma dosyası'}
                </span>
              </span>
              {visited[g.id]
                ? <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white" aria-label="Ziyaret edildi"><Check size={14} strokeWidth={3} /></span>
                : <span className="h-6 w-6 rounded-full border-2 border-line" aria-label="Henüz ziyaret edilmedi" />}
            </button>
          </li>
        ))}
      </ul>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Rozetler · {earned}/{BADGES.length}</p>
        <ul className="grid grid-cols-1 gap-1.5">
          {BADGES.map((b) => {
            const on = b.earned(st);
            return (
              <li key={b.id} className={`flex items-start gap-2.5 rounded-xl border px-2.5 py-2 ${on ? 'border-amber-200 bg-amber-50' : 'border-line bg-white opacity-75'}`}>
                <span className={`text-xl ${on ? '' : 'grayscale'}`} aria-hidden>{b.icon}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-semibold">{b.name}{!on && <Lock size={12} className="text-ink-muted" />}</span>
                  <span className="block text-xs text-ink-muted">{b.desc}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
