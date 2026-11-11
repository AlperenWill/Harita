import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Html } from '@react-three/drei';
import { useStore } from '../../state/store';
import { CATEGORY_LABEL, ELEVATION, PERIOD_BY_ID, displayProvince } from '../../data/regions';
import { elevationToHeight, toWorld } from '../../geo/projection';
import { HOTSPOT, SiteModel, modelKindFor } from './models';
import { Dust, LightShafts } from './Atmosphere';
import { ambient, presetFor } from '../../audio/ambient';
import { useWikiImage } from '../../ui/useWikiImage';
import { Seal } from '../../ui/Seal';
import { PALETTE } from '../theme';

/**
 * 3D keşif modu — ayrı bir chunk olarak yalnızca ilk miras noktası açıldığında indirilir.
 * Harita sahnesinden çıkılmaz: model, ilin üst yüzeyine yerleştirilir ve kamera etrafında döner.
 */
export default function ExploreMode() {
  const site = useStore((s) => s.site);
  const muted = useStore((s) => s.muted);

  useEffect(() => {
    if (!site || muted) {
      ambient.stop();
      return;
    }
    ambient.play(presetFor(site.period, site.category), site.category === 'kopru');
    return () => ambient.stop();
  }, [site, muted]);

  if (!site) return null;
  return <SiteStage key={site.id} />;
}

function SiteStage() {
  const site = useStore((s) => s.site)!;
  const inspected = useStore((s) => s.inspected.includes(site.id));
  const kind = useMemo(() => modelKindFor(site), [site]);
  const [x, z] = toWorld(site.coord[0], site.coord[1]);
  const y = elevationToHeight(ELEVATION[site.province]);
  const root = useRef<THREE.Group>(null!);

  // Belirme animasyonu: model yerden yükselir
  useFrame((_, dt) => {
    const g = root.current;
    const k = 1 - Math.exp(-dt * 4);
    g.scale.setScalar(g.scale.x + (1 - g.scale.x) * k);
  });

  return (
    <group position={[x, y + 0.002, z]}>
      {/* Zemin: ilin yüzeyinde sıcak taş bir platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[0.85, 48]} />
        <meshStandardMaterial color="#efe3cf" roughness={1} transparent opacity={0.55} />
      </mesh>
      <group ref={root} scale={0.01}>
        <SiteModel site={site} kind={kind} />
        {!inspected && <Hotspot position={HOTSPOT[kind]} siteId={site.id} />}
      </group>
      <ContactShadows position={[0, 0.003, 0]} scale={2} blur={2.2} opacity={0.55} far={1} resolution={256} frames={1} />
      <Dust />
      <LightShafts />
      <pointLight position={[0.4, 0.9, 0.5]} intensity={1.4} distance={3} color="#ffd9a0" />
      <Html position={[0, 0.3, 0]} className="info-anchor" zIndexRange={[20, 0]}>
        <InfoCard />
      </Html>
    </group>
  );
}

/** "Kayıp mimari detay": nefes alan bir ışık noktası; tıklanınca incelenir ve koleksiyona işlenir. */
function Hotspot({ position, siteId }: { position: [number, number, number]; siteId: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((st) => {
    const s = 1 + Math.sin(st.clock.elapsedTime * 3) * 0.25;
    ref.current.scale.setScalar(s);
  });
  return (
    <mesh
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        useStore.getState().inspectDetail(siteId);
      }}
      onPointerOver={() => (document.body.style.cursor = 'zoom-in')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <sphereGeometry args={[0.035, 12, 8]} />
      <meshBasicMaterial color={PALETTE.saffron} toneMapped={false} />
      <mesh>
        <sphereGeometry args={[0.07, 12, 8]} />
        <meshBasicMaterial color={PALETTE.saffron} transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </mesh>
  );
}

function InfoCard() {
  const site = useStore((s) => s.site)!;
  const inspected = useStore((s) => s.inspected.includes(site.id));
  const wiki = useWikiImage(site.wiki);
  const [collapsed, setCollapsed] = useState(() => window.matchMedia('(max-height: 520px)').matches);
  const period = PERIOD_BY_ID[site.period];

  return (
    <article className={`info-card glass${collapsed ? ' is-collapsed' : ''}`} aria-live="polite">
      <div className="info-media">
        {wiki?.thumb ? (
          <img src={wiki.thumb} alt={site.name} loading="lazy" decoding="async" />
        ) : (
          <div className="info-media-fallback">
            <Seal id={site.id} period={site.period} size={72} />
          </div>
        )}
        <span className="chip" style={{ background: period.color }}>{period.label}</span>
      </div>
      <header className="info-head">
        <p className="eyebrow">
          {CATEGORY_LABEL[site.category]} · {displayProvince(site.province)}
        </p>
        <h2>{site.name}</h2>
        <button className="icon-btn info-toggle" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed} aria-label={collapsed ? 'Kartı genişlet' : 'Kartı daralt'}>
          {collapsed ? '＋' : '－'}
        </button>
      </header>
      {!collapsed && (
        <div className="info-body">
          <p>{site.summary}</p>
          <aside className="did-you-know">
            <strong>Biliyor muydunuz?</strong>
            <p>{site.didYouKnow}</p>
          </aside>
          <p className={`detail-quest${inspected ? ' is-done' : ''}`}>
            {inspected
              ? `✓ Kayıp detay incelendi${site.detail ? `: ${site.detail}` : ''}`
              : 'Modelin üzerinde parıldayan kayıp mimari detayı bul ve incele.'}
          </p>
          {wiki?.url && (
            <a className="source" href={wiki.url} target="_blank" rel="noreferrer">
              Fotoğraf ve kaynak: Vikipedi / Wikimedia Commons ↗
            </a>
          )}
        </div>
      )}
    </article>
  );
}
