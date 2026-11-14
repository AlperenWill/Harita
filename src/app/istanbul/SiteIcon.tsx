import type { GameDefinition } from '../../games/core/types';

/** Yapı türü ikonları: cami = minare, saray = kubbe, müze = sütunlu cephe, sarnıç = kemer + su */
export function SiteIcon({ kind, size = 18 }: { kind: GameDefinition['kind']; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true } as const;
  if (kind === 'cami') return <svg {...p}><path d="M11 2h2l.6 3H10.4zM10.5 6h3v2h-3zM10 9h4v1.5h-4zM10.5 11h3v11h-3z" /><path d="M3 22v-6a4 4 0 0 1 4-4 4 4 0 0 1 2.5.9V22zM21 22v-6a4 4 0 0 0-4-4 4 4 0 0 0-2.5.9V22z" opacity=".55" /></svg>;
  if (kind === 'saray') return <svg {...p}><path d="M12 3a7 7 0 0 1 7 7H5a7 7 0 0 1 7-7zM11.5 1h1v2.2h-1zM4 11h16v2H4zM5 13.5h2.5V20H5zM10.75 13.5h2.5V20h-2.5zM16.5 13.5H19V20h-2.5zM3 20.5h18V22H3z" /></svg>;
  if (kind === 'sarnic') return <svg {...p}><path d="M2 4h20v2H2zM3 6h2v10H3zM11 6h2v10h-2zM19 6h2v10h-2zM5 6c0 3 2.5 5 3 5s3-2 3-5zM13 6c0 3 2.5 5 3 5s3-2 3-5z" /><path d="M2 18c2 0 2-1.2 4-1.2s2 1.2 4 1.2 2-1.2 4-1.2 2 1.2 4 1.2 2-1.2 4-1.2V22H2z" opacity=".6" /></svg>;
  return <svg {...p}><path d="M3 6l9-4 9 4v1.5H3zM4 8.5h16V10H4zM5.5 11H8v8H5.5zM10.75 11h2.5v8h-2.5zM16 11h2.5v8H16zM3 20h18v2H3z" /></svg>;
}
