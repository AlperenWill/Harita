import { Suspense, lazy, useMemo, type ComponentType } from 'react';
import { GAME_BY_ID, hasModule, loadGame } from './registry';
import { supportsWebGL, useDeviceProfile } from './device';
import { useProgress } from './progress';
import { LoadingScreen } from './LoadingScreen';
import { Fallback } from './Fallback';
import { LandscapeGate } from './LandscapeGate';
import type { GameProps } from './types';

/**
 * Harita ile oyunlar arasındaki tek bağlantı: kimliğe göre oyun modülünü dinamik import ile yükler.
 * Oyun kodu yoksa (araştırma aşaması) onResearch çizilir; WebGL yoksa fotoğraf + sesli anlatım yedeği.
 */
export function GameLauncher({ id, onExit, research }: { id: string; onExit: () => void; research: ComponentType<{ id: string }> }) {
  const def = GAME_BY_ID[id];
  const device = useDeviceProfile();
  const Game = useMemo(() => (hasModule(id) ? lazy(loadGame.bind(null, id)) : null), [id]) as ComponentType<GameProps> | null;
  const { find, complete } = useProgress.getState();
  if (!def) return null;
  if (!Game) { const R = research; return <R id={id} />; }
  if (!supportsWebGL) return <Fallback def={def} />;
  return (
    <>
      <Suspense fallback={<LoadingScreen name={def.name} hint={def.transformation.mechanic} />}>
        <Game def={def} device={device} onExit={onExit} onFind={(k) => find(id, k)} onComplete={(fs) => { fs.forEach((k) => find(id, k)); complete(id); }} />
      </Suspense>
      <LandscapeGate />
    </>
  );
}
