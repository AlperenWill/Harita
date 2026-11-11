import { useStore } from '../state/store';
import { REGION_BY_ID, displayProvince } from '../data/regions';

export function TopBar() {
  const { level, region, province, site } = useStore();
  const count = useStore((s) => Object.keys(s.discovered).length);
  const muted = useStore((s) => s.muted);
  const st = useStore.getState();

  const crumbs: { label: string; onClick?: () => void }[] = [{ label: 'Türkiye', onClick: level !== 'country' ? st.goHome : undefined }];
  if (region) crumbs.push({ label: REGION_BY_ID[region].name, onClick: level !== 'region' ? () => st.selectRegion(region) : undefined });
  if (province) crumbs.push({ label: displayProvince(province), onClick: level === 'site' ? () => st.selectProvince(province) : undefined });
  if (site) crumbs.push({ label: site.name });

  return (
    <header className="topbar">
      <div className="brand glass">
        <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
          <path d="M16 2l3.5 8.5L28 14l-8.5 3.5L16 26l-3.5-8.5L4 14l8.5-3.5z" fill="var(--cini)" />
          <circle cx="16" cy="14" r="3" fill="var(--bg)" />
        </svg>
        <span>Anadolu Mirası</span>
      </div>
      <nav className="crumbs glass" aria-label="Konum">
        {level !== 'country' && (
          <button className="icon-btn" onClick={st.back} aria-label="Bir üst seviyeye dön (Esc)">←</button>
        )}
        <ol>
          {crumbs.map((c, i) => (
            <li key={i}>
              {c.onClick ? <button onClick={c.onClick}>{c.label}</button> : <span aria-current="location">{c.label}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <div className="actions">
        <button className="icon-btn glass" onClick={st.toggleMute} aria-pressed={!muted} aria-label={muted ? 'Ambiyans sesini aç' : 'Ambiyans sesini kapat'}>
          {muted ? '🔇' : '🔊'}
        </button>
        <button className="pill-btn glass" onClick={() => st.setJournal(true)}>
          <span className="pill-label">Keşif Günlüğü</span> <span className="count">{count}</span>
        </button>
      </div>
    </header>
  );
}
