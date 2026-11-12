import { useState } from 'react';
import { useStore } from '../state/store';
import { CATEGORY_LABEL, PERIOD_BY_ID, REGIONS, REGION_BY_ID, displayProvince } from '../data/regions';
import { useRegionSites } from '../state/useRegionSites';
import { loadRegionSites } from '../data/heritage';
import { PlayButton } from './PlayButton';

/**
 * Bağlama duyarlı alt panel: ülke → bölge çipleri, bölge → il çipleri, il → miras noktası listesi.
 * 3D sahnenin tamamen klavye ve ekran okuyucuyla da gezilebilmesini sağlar.
 */
export function Dock() {
  const level = useStore((s) => s.level);
  const region = useStore((s) => s.region);
  const province = useStore((s) => s.province);
  const discovered = useStore((s) => s.discovered);
  const sites = useRegionSites(region);
  const [open, setOpen] = useState(true);
  const st = useStore.getState();

  if (level === 'site') return null;

  let title = 'Bir bölge seç';
  let body: JSX.Element | null = null;

  if (level === 'country') {
    body = (
      <ul className="chips">
        {REGIONS.map((r) => (
          <li key={r.id}>
            <button
              className="chip-btn"
              style={{ ['--c' as string]: r.color }}
              onClick={() => st.selectRegion(r.id)}
              onMouseEnter={() => loadRegionSites(r.id)}
              onFocus={() => loadRegionSites(r.id)}
            >
              {r.name}
            </button>
          </li>
        ))}
      </ul>
    );
  } else if (level === 'region' && region) {
    const r = REGION_BY_ID[region];
    title = `${r.name} · ${r.provinces.length} il`;
    body = (
      <ul className="chips">
        {[...r.provinces].sort((a, b) => displayProvince(a).localeCompare(displayProvince(b), 'tr')).map((p) => {
          const n = sites?.filter((s) => s.province === p).length ?? 0;
          const d = sites?.filter((s) => s.province === p && discovered[s.id]).length ?? 0;
          return (
            <li key={p}>
              <button className="chip-btn" style={{ ['--c' as string]: r.color }} onClick={() => st.selectProvince(p)}>
                {displayProvince(p)} <small>{d}/{n}</small>
              </button>
            </li>
          );
        })}
      </ul>
    );
  } else if (level === 'province' && province) {
    const list = sites?.filter((s) => s.province === province) ?? [];
    title = `${displayProvince(province)} · ${list.length} miras noktası`;
    body = (
      <ul className="site-list">
        {list.map((s) => (
          <li key={s.id}>
            <button className={`site-btn${discovered[s.id] ? ' is-found' : ''}`} onClick={() => st.selectSite(s)}>
              <span className="dot" style={{ background: PERIOD_BY_ID[s.period].color }} />
              <span className="site-name">{s.name}</span>
              <span className="site-meta">{CATEGORY_LABEL[s.category]} · {PERIOD_BY_ID[s.period].label}</span>
              {discovered[s.id] && <span className="found" aria-label="Keşfedildi">✓</span>}
            </button>
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
      {open && <div className="dock-body">{body}{level === 'province' && province === 'Şanlıurfa' && <PlayButton className="dock-play" />}</div>}
    </section>
  );
}
