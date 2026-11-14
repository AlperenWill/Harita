import { Check, Lock } from 'lucide-react';
import { SITES } from './sites';
import { BADGES, isCompleted, useJournal } from './store';
import { SiteIcon } from './IstanbulMap';

/** Keşif Günlüğü: ziyaret edilen yapılar (yeşil tik), tamamlanan deneyimler ve rozetler */
export function JournalPanel({ onPick }: { onPick?: (id: string) => void }) {
  const visited = useJournal((s) => s.visited);
  const finds = useJournal((s) => s.finds);
  const st = { visited, finds };
  const earned = BADGES.filter((b) => b.earned(st)).length;
  return (
    <div className="space-y-4">
      <ul className="space-y-1.5">
        {SITES.map((s) => (
          <li key={s.id}>
            <button onClick={() => onPick?.(s.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${s.status === 'playable' ? 'bg-brand text-white' : 'bg-brand-50 text-brand'}`}><SiteIcon kind={s.kind} size={16} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{s.name}</span>
                <span className="block text-xs text-ink-muted">{isCompleted(st, s.id) ? 'Deneyim tamamlandı' : s.status === 'playable' ? '3D deneyim' : 'Araştırma dosyası'}</span>
              </span>
              {visited[s.id]
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
