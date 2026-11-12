/** "Urfa'nın Minik Kaşifleri — Balıklıgöl" oyununu (public/sanliurfa-oyun/) yeni sekmede açar. */
export function PlayButton({ className = '' }: { className?: string }) {
  const open = () => window.open(`${import.meta.env.BASE_URL}sanliurfa-oyun/index.html`, '_blank', 'noopener');
  return (
    <button type="button" className={`pill-btn primary play-btn ${className}`} onClick={open}>
      🎮 Oyna
    </button>
  );
}
