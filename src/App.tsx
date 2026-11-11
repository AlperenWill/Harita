import { Suspense, lazy, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { Experience } from './scene/Experience';
import { TopBar } from './ui/TopBar';
import { Dock } from './ui/Dock';
import { QuestTracker } from './ui/QuestTracker';
import { HoverTip, Intro, RotateHint, Toast } from './ui/Overlays';
import { useStore } from './state/store';
import { useQuestWatcher } from './state/useQuestWatcher';

const Journal = lazy(() => import('./ui/Journal'));

export default function App() {
  const journalOpen = useStore((s) => s.journalOpen);
  const level = useStore((s) => s.level);
  const [dpr, setDpr] = useState(Math.min(window.devicePixelRatio, 1.75));
  useQuestWatcher();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !useStore.getState().journalOpen) useStore.getState().back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <Canvas
        className="stage"
        dpr={dpr}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 62, 52], fov: 38, near: 0.05, far: 500 }}
        onCreated={() => document.getElementById('boot')?.classList.add('is-done')}
        onPointerMissed={() => useStore.getState().setHovered(null)}
      >
        {/* FPS düşerse çözünürlüğü kademeli azalt, toparlanınca geri yükselt */}
        <PerformanceMonitor
          onDecline={() => setDpr((d) => Math.max(1, d - 0.25))}
          onIncline={() => setDpr((d) => Math.min(window.devicePixelRatio, 1.75, d + 0.25))}
        />
        <AdaptiveDpr pixelated={false} />
        <Experience />
      </Canvas>

      <div className="ui" data-level={level}>
        <TopBar />
        <QuestTracker />
        <Dock />
        <Toast />
        <Intro />
      </div>
      <HoverTip />
      {journalOpen && (
        <Suspense fallback={null}>
          <Journal />
        </Suspense>
      )}
      <RotateHint />
    </>
  );
}
