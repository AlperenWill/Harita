import { useStore } from '../state/store';
import { useContextQuests } from '../state/useQuestWatcher';

/** Sağ üstte, bağlama göre en anlamlı tek görevi gösteren küçük takipçi. */
export function QuestTracker() {
  const quests = useContextQuests();
  const discovered = useStore((s) => s.discovered);
  const inspected = useStore((s) => s.inspected);
  const level = useStore((s) => s.level);
  const list = Object.values(discovered);
  const q =
    level === 'site'
      ? quests.find((x) => x.id === 'kayip-detay')!
      : quests.find((x) => x.progress(list, inspected) < x.target) ?? quests[0];
  const p = Math.min(q.progress(list, inspected), q.target);
  return (
    <aside className="quest glass" aria-label="Aktif görev">
      <p className="eyebrow">Aktif görev</p>
      <h3>{q.title}</h3>
      <p className="quest-desc">{q.description}</p>
      <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={q.target} aria-valuenow={p}>
        <span style={{ width: `${(p / q.target) * 100}%` }} />
      </div>
      <p className="quest-count">{p} / {q.target}</p>
    </aside>
  );
}
