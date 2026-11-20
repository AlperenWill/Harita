import { useStore } from '../state/store';
import { displayProvince } from '../data/regions';
import { PLAYABLE_BY_ID } from '../data/playables';
import { useWikiImage } from './useWikiImage';
import { openPlayable } from './PlayButton';

/**
 * Seçilen noktanın oyun kartı: fotoğraf, kısa bilgi ve büyük "Oyna" düğmesi.
 * Masaüstünde sağda yüzen panel, telefonda alttan açılan sayfa (CSS).
 */
export function GameCard() {
  const site = useStore((s) => s.site);
  const p = site ? PLAYABLE_BY_ID.get(site.id) : undefined;
  const wiki = useWikiImage(p?.wiki ?? site?.wiki);
  if (!site || !p) return null;
  return (
    <article className="game-card glass" aria-live="polite">
      <div className="game-media">
        {wiki?.thumb ? <img src={wiki.thumb} alt={site.name} loading="lazy" decoding="async" /> : <span className="game-media-emoji" aria-hidden="true">{p.emoji}</span>}
        <span className={`depth-chip${p.depth === 'kisa' ? ' is-short' : ''}`}>{p.depth === 'kisa' ? 'Kısa oyun' : 'Detaylı oyun'}</span>
        <button className="icon-btn card-close" onClick={() => useStore.getState().back()} aria-label="Kartı kapat">✕</button>
      </div>
      <div className="game-body">
        <p className="eyebrow">{displayProvince(site.province)}</p>
        <h2>{site.name}</h2>
        <p className="game-title">{p.emoji} {p.title}</p>
        <p className="game-blurb">{p.blurb}</p>
        <button className="pill-btn primary big-play" onClick={() => openPlayable(p)}>▶ Oyna</button>
        <details className="game-more">
          <summary>Bu yer hakkında</summary>
          <p>{site.summary}</p>
          {site.didYouKnow && <p className="dyk"><b>Biliyor muydun?</b> {site.didYouKnow}</p>}
          {wiki?.url && <a className="source" href={wiki.url} target="_blank" rel="noreferrer">Fotoğraf ve kaynak: Vikipedi ↗</a>}
        </details>
      </div>
    </article>
  );
}
