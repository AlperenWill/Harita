/** Şanlıurfa mini oyununu (public/sanliurfa-oyun/index.html) yeni sekmede açar. */
export function PlayButton({ className = '' }: { className?: string }) {
  const open = () => window.open(`${import.meta.env.BASE_URL}sanliurfa-oyun/index.html`, '_blank', 'noopener');
  return (
    <button type="button" className={`pill-btn primary play-btn ${className}`} onClick={open}>
      🎮 Oyna
    </button>
  );
}
