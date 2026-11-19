import { PLAYABLE_BY_ID, playableUrl, type Playable } from '../data/playables';

/**
 * Oyunu açar. 3D harita ana uygulamada iframe içinde çalışır; uygulama içi oyunlar üst pencerede açılır
 * (oyunun "geri" düğmesi haritaya döner), public/ altındaki bağımsız oyunlar da aynı sekmede açılır.
 */
export function openPlayable(p: Playable) {
  const url = playableUrl(p, import.meta.env.BASE_URL);
  try { (window.top ?? window).location.href = url; } catch { window.location.href = url; }
}

/** Miras noktasının oyunu varsa "Oyna" düğmesi; yoksa hiçbir şey çizmez. */
export function PlayButton({ siteId, className = '' }: { siteId: string; className?: string }) {
  const p = PLAYABLE_BY_ID.get(siteId);
  if (!p) return null;
  return (
    <button type="button" className={`pill-btn primary play-btn ${className}`} onClick={() => openPlayable(p)}>
      ▶ Oyna: {p.title}
    </button>
  );
}
