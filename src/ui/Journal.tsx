import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { CATEGORY_LABEL, PERIODS, displayProvince } from '../data/regions';
import { GLOBAL_QUESTS, buildRegionQuest } from '../state/quests';
import { REGIONS } from '../data/regions';
import { Seal } from './Seal';

/** Keşif Günlüğü (lazy chunk): koleksiyon mühürleri, rozetler, zaman çizelgesi. */
export default function Journal() {
  const discovered = useStore((s) => s.discovered);
  const inspected = useStore((s) => s.inspected);
  const completed = useStore((s) => s.completedQuests);
  const close = () => useStore.getState().setJournal(false);
  const ref = useRef<HTMLDivElement>(null);
  const list = Object.values(discovered).sort((a, b) => b.at - a.at);
  const quests = [...GLOBAL_QUESTS, ...REGIONS.map((r) => buildRegionQuest(r.id))];

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="journal-backdrop" onClick={close}>
      <div
        className="journal glass"
        role="dialog"
        aria-modal="true"
        aria-label="Keşif Günlüğü"
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="journal-head">
          <div>
            <p className="eyebrow">Miras Koleksiyoncusu</p>
            <h2>Keşif Günlüğü</h2>
          </div>
          <button className="icon-btn" onClick={close} aria-label="Kapat">✕</button>
        </header>

        <section>
          <h3>Zaman Yolcusu</h3>
          <ol className="timeline">
            {PERIODS.map((p) => {
              const n = list.filter((d) => d.period === p.id).length;
              return (
                <li key={p.id} className={n ? 'is-on' : ''} style={{ ['--c' as string]: p.color }}>
                  <span className="tl-dot" />
                  <span className="tl-label">{p.label}</span>
                  <span className="tl-n">{n}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section>
          <h3>Rozetler <small>{completed.length}/{quests.length}</small></h3>
          <ul className="badges">
            {quests.map((q) => {
              const done = completed.includes(q.id);
              const p = Math.min(q.progress(list, inspected), q.target);
              return (
                <li key={q.id} className={done ? 'is-done' : ''}>
                  <span className="badge-icon" aria-hidden="true">{done ? '✦' : '◇'}</span>
                  <div>
                    <strong>{q.title}</strong>
                    <p>{q.description}</p>
                    <div className="bar"><span style={{ width: `${(p / q.target) * 100}%` }} /></div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h3>Mühür Koleksiyonu <small>{list.length}</small></h3>
          {list.length === 0 ? (
            <p className="empty">Henüz mühür yok. Bir bölge seç, ardından bir ile ve bir miras noktasına dokun.</p>
          ) : (
            <ul className="seals">
              {list.map((d) => (
                <li key={d.id}>
                  <Seal id={d.id} period={d.period} size={56} />
                  <div>
                    <strong>{d.name}</strong>
                    <p>{displayProvince(d.province)} · {CATEGORY_LABEL[d.category]}</p>
                    {inspected.includes(d.id) && <p className="detail-tag">✓ Kayıp detay</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
