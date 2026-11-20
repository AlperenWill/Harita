import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { Experience } from './scene/Experience';
import { TopBar } from './ui/TopBar';
import { Dock } from './ui/Dock';
import { GameCard } from './ui/GameCard';
import { HoverTip, Intro, Toast } from './ui/Overlays';
import { useStore } from './state/store';

export default function App() {
  const level = useStore((s) => s.level);
  const [dpr, setDpr] = useState(Math.min(window.devicePixelRatio, 1.75));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useStore.getState().back();
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
        camera={{ position: [0, 62, 52], fov: 38, near: 0.05, far: 700 }}
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
        <Dock />
        <GameCard />
        <Toast />
        <Intro />
      </div>
      <HoverTip />
    </>
  );
}
