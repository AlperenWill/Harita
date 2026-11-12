/** İl → o ile ait mini oyun (public/ altındaki bağımsız, tek klasörlük oyunlar). */
export const GAMES: Record<string, { path: string; label: string }> = {
  Şanlıurfa: { path: 'sanliurfa-oyun/index.html', label: '🎮 Oyna' },
  İzmir: { path: 'izmir-efes/index.html', label: '🎮 Efes’i Oyna' },
};

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
