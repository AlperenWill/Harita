import { useState } from 'react';
import { useStore } from '../state/store';
import { REGIONS, REGION_BY_ID, REGION_OF_PROVINCE, displayProvince } from '../data/regions';
import { PLAYABLES, playablesIn } from '../data/playables';
import { loadRegionSites } from '../data/heritage';
import { openPlayable } from './PlayButton';

const countIn = (region: string) => PLAYABLES.filter((p) => REGION_OF_PROVINCE[p.province] === region).length;

/**
 * Alt panel: ülke → bölge çipleri (oyunu olmayanlar "yakında"), bölge → oyunu olan iller, il → oyun kartları.
 * Haritadaki her şey src/data/playables.ts listesinden gelir.
 */
export function Dock() {
  const level = useStore((s) => s.level);
  const region = useStore((s) => s.region);
  const province = useStore((s) => s.province);
  const [open, setOpen] = useState(true);
  const st = useStore.getState();

  if (level === 'site') return null;

  let title = `Bir bölge seç · ${PLAYABLES.length} oynanabilir yer`;
  let body: JSX.Element | null = null;

  if (level === 'country') {
    body = (
      <ul className="chips">
        {REGIONS.map((r) => {
          const n = countIn(r.id);
          return (
            <li key={r.id}>
              <button className="chip-btn" style={{ ['--c' as string]: n ? r.color : '#c9c4bc' }} disabled={!n}
                onClick={() => st.selectRegion(r.id)} onMouseEnter={() => n && loadRegionSites(r.id)}>
                {r.name} <small>{n ? n : 'yakında'}</small>
              </button>
            </li>
          );
        })}
      </ul>
    );
  } else if (level === 'region' && region) {
    const r = REGION_BY_ID[region];
    const provs = r.provinces.filter((p) => playablesIn(p).length).sort((a, b) => displayProvince(a).localeCompare(displayProvince(b), 'tr'));
    title = `${r.name} · ${provs.length} il`;
    body = (
      <ul className="chips">
        {provs.map((p) => (
          <li key={p}>
            <button className="chip-btn" style={{ ['--c' as string]: r.color }} onClick={() => st.selectProvince(p)}>
              {displayProvince(p)} <small>{playablesIn(p).length}</small>
            </button>
          </li>
        ))}
      </ul>
    );
  } else if (level === 'province' && province) {
    const list = playablesIn(province);
    title = `${displayProvince(province)} · ${list.length} oyun`;
    body = (
      <ul className="game-list">
        {list.map((p) => (
          <li key={p.id} className="game-row">
            <button className="game-info" onClick={() => loadRegionSites(REGION_OF_PROVINCE[p.province]).then((all) => { const s = all.find((x) => x.id === p.id); if (s) st.selectSite(s); })}>
              <span className="game-emoji" aria-hidden="true">{p.emoji}</span>
              <span className="game-text">
                <span className="site-name">{p.name}</span>
                <span className="site-meta">{p.title}{p.depth === 'kisa' ? ' · kısa oyun' : ''}</span>
              </span>
            </button>
            <button className="pill-btn primary game-play" onClick={() => openPlayable(p)} aria-label={`${p.name} oyununu oyna`}>▶ Oyna</button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className={`dock glass${open ? '' : ' is-closed'}`} aria-label="Gezinme paneli">
      <button className="dock-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{title}</span>
        <span aria-hidden="true">{open ? '▾' : '▴'}</span>
      </button>
      {open && <div className="dock-body">{body}</div>}
    </section>
  );
}
