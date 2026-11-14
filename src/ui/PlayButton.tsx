/** İl → o ile ait mini oyun (public/ altındaki bağımsız, tek klasörlük oyunlar). */
export const GAMES: Record<string, { path: string; label: string }> = {
  Şanlıurfa: { path: 'sanliurfa-oyun/index.html', label: '🎮 Oyna' },
  İzmir: { path: 'izmir-efes/index.html', label: '🎮 Efes’i Oyna' },
};

/** Miras noktası → ana uygulamadaki ayrıntılı 3D anıt sahnesi */
export const MONUMENT_SCENES: Record<string, { path: string; label: string }> = {
  anitkabir: { path: 'anit/ankara-anitkabir', label: '🏛️ 3D Anıtkabir’i Keşfet' },
};

/** İl → ana uygulamadaki il deneyimi (ör. İstanbul Katmanları) */
export const PROVINCE_SCENES: Record<string, { path: string; label: string }> = {
  İstanbul: { path: 'istanbul', label: '🕌 İstanbul Katmanları’nı Aç' },
};
export function ProvinceSceneButton({ province, className = '' }: { province: string; className?: string }) {
  const scene = PROVINCE_SCENES[province];
  if (!scene) return null;
  const open = () => { const url = `${import.meta.env.BASE_URL}${scene.path}`; try { (window.top ?? window).location.href = url; } catch { window.location.href = url; } };
  return <button type="button" className={`pill-btn primary play-btn ${className}`} onClick={open}>{scene.label}</button>;
}

/** Anıt sahnesini açar. 3D harita ana uygulamada iframe içinde çalıştığından üst pencere yönlendirilir. */
export function MonumentButton({ siteId }: { siteId: string }) {
  const scene = MONUMENT_SCENES[siteId];
  if (!scene) return null;
  const open = () => {
    const url = `${import.meta.env.BASE_URL}${scene.path}`;
    try { (window.top ?? window).location.href = url; } catch { window.location.href = url; }
  };
  return (
    <button type="button" className="pill-btn primary play-btn" onClick={open}>
      {scene.label}
    </button>
  );
}

/** İlin oyununu yeni sekmede açan buton; o ilin oyunu yoksa hiçbir şey çizmez. */
export function PlayButton({ province, className = '' }: { province: string; className?: string }) {
  const game = GAMES[province];
  if (!game) return null;
  const open = () => window.open(`${import.meta.env.BASE_URL}${game.path}`, '_blank', 'noopener');
  return (
    <button type="button" className={`pill-btn primary play-btn ${className}`} onClick={open}>
      {game.label}
    </button>
  );
}
