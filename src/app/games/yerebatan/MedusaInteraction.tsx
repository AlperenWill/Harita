/**
 * Medusa başları — model, vurgu ışığı, yaklaşma algılama, inceleme (yakınlaşma) modu ve bilgi paneli.
 *
 * Neden: Medusa başları sarnıcın "ödül" anı. Oyuncu kuzeybatı köşeye yürüdüğünde başlardan birine 3,2 m'den
 * yakın ve ona bakıyorsa (ışın küreye çarpıyor) inceleme modu kendiliğinden açılır: kamera platformun kenarındaki
 * sabit bir bakış noktasına süzülür, başa kilitlenir ve görüş açısı 70°'den 36°'ye yavaşça daralır (zoom).
 * Oyuncu bu sırada kamerayı çeviremez (serbest kamera yok); E / dokunma / Kapat ile çıkar ve kaldığı yerden yürür.
 * Gölge: sahnede yalnızca başlar ve giriş kapısı gölge üretir/alır; başların vurgu ışıkları gölgeli spot ışığıdır.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { animated, useTransition } from '@react-spring/web';
import { ExternalLink, X } from 'lucide-react';
import { DECK_Y, MEDUSA, MEDUSA_Y, POIS, colX, rowZ, type Poi } from './cistern';
import { stoneTextures } from './CisternScene';

export const INSPECT_FOV = 36, NORMAL_FOV = 70, AUTO_DIST = 3.2;
/** İnceleme bakış noktası: başın doğusundaki platform kenarı, baş hizasının biraz üstü */
export function inspectPose(id: string) {
  const m = MEDUSA.find((x) => x.id === id)!, hx = colX(m.col[0]), hz = rowZ(m.col[1]);
  return { eye: new THREE.Vector3(hx + 2.15, DECK_Y + 1.05, hz + 0.35), target: new THREE.Vector3(hx + 0.35, MEDUSA_Y + 0.45, hz) };
}

function Snake({ curve, mat }: { curve: THREE.Curve<THREE.Vector3>; mat: THREE.Material }) {
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 24, 0.055, 6), [curve]);
  return <mesh geometry={geo} material={mat} castShadow receiveShadow />;
}
/** Stilize Medusa yüzü: yanaklar, badem gözler, burun, dudaklar; saçta yılan kıvrımları. +z yönüne bakar. */
function MedusaHead({ mat }: { mat: THREE.Material }) {
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2d2620', roughness: 0.9 }), []);
  const snakes = useMemo(() => Array.from({ length: 11 }, (_, i) => {
    const a0 = -2.4 + (i / 10) * 4.8, pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 8; k++) {
      const u = k / 8, a = a0 + Math.sin(u * 6 + i) * 0.25, r = 0.5 + u * 0.32;
      pts.push(new THREE.Vector3(Math.sin(a) * r, 0.25 + Math.cos(a) * r * 0.95, -0.05 - u * 0.12 + Math.sin(u * 9 + i) * 0.05));
    }
    return new THREE.CatmullRomCurve3(pts);
  }), []);
  return (
    <group>
      <mesh material={mat} scale={[0.5, 0.6, 0.38]} castShadow receiveShadow><sphereGeometry args={[1, 24, 18]} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={mat} position={[s * 0.19, 0.08, 0.3]} scale={[0.12, 0.06, 0.06]} castShadow><sphereGeometry args={[1, 12, 8]} /></mesh>
          <mesh material={dark} position={[s * 0.19, 0.08, 0.34]} scale={[0.055, 0.035, 0.02]}><sphereGeometry args={[1, 10, 6]} /></mesh>
          <mesh material={mat} position={[s * 0.2, 0.17, 0.3]} rotation={[0, 0, s * 0.25]} scale={[0.14, 0.025, 0.04]} castShadow><boxGeometry /></mesh>
          <mesh material={mat} position={[s * 0.25, -0.12, 0.25]} scale={[0.12, 0.1, 0.09]} castShadow><sphereGeometry args={[1, 10, 8]} /></mesh>
        </group>
      ))}
      <mesh material={mat} position={[0, -0.03, 0.38]} rotation={[0.25, 0, 0]} castShadow><coneGeometry args={[0.07, 0.24, 6]} /></mesh>
      <mesh material={mat} position={[0, -0.24, 0.32]} rotation={[0, 0, Math.PI]} scale={[1, 0.6, 1]} castShadow><torusGeometry args={[0.08, 0.025, 6, 12, Math.PI]} /></mesh>
      <mesh material={mat} position={[0, -0.26, 0.31]} scale={[1, 0.5, 1]} castShadow><torusGeometry args={[0.07, 0.022, 6, 12, Math.PI]} /></mesh>
      {snakes.map((c, i) => <Snake key={i} curve={c} mat={mat} />)}
    </group>
  );
}

/** İki baş: kaide bloğu + baş (ters / yan) + gölgeli vurgu spotu */
export function Medusas({ shadows }: { shadows: boolean }) {
  const { map, normal } = useMemo(() => stoneTextures(512), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map, normalMap: normal, color: '#a7a08e', roughness: 0.45, metalness: 0.05 }), [map, normal]);
  return (
    <group>
      {MEDUSA.map((m) => {
        const x = colX(m.col[0]), z = rowZ(m.col[1]);
        return (
          <group key={m.id}>
            <mesh material={mat} position={[x, MEDUSA_Y - 0.35, z]} castShadow receiveShadow><boxGeometry args={[1.1, 1.5, 1.4]} /></mesh>
            {/* baş doğuya (platforma) bakar; ters olan z ekseninde 180°, yan olan 90° döndürülmüş */}
            <group position={[x + 0.62, MEDUSA_Y + 0.42, z]} rotation={[0, Math.PI / 2, 0]}>
              <group rotation={[0, 0, m.roll]}><MedusaHead mat={mat} /></group>
            </group>
            <SpotOn target={[x + 0.6, MEDUSA_Y + 0.4, z]} from={[x + 3.2, DECK_Y + 2.6, z + 1.6]} shadows={shadows} />
          </group>
        );
      })}
    </group>
  );
}
function SpotOn({ target, from, shadows }: { target: [number, number, number]; from: [number, number, number]; shadows: boolean }) {
  const ref = useRef<THREE.SpotLight>(null!);
  useEffect(() => { ref.current.target.position.set(...target); ref.current.target.updateMatrixWorld(); }, [target]);
  useFrame(({ clock }) => { ref.current.intensity = 34 + Math.sin(clock.elapsedTime * 1.7) * 2; });
  return <spotLight ref={ref} position={from} angle={0.42} penumbra={0.6} distance={9} decay={1.6} color="#ff8a3c" castShadow={shadows} shadow-mapSize={[512, 512]} shadow-bias={-0.002} />;
}

/* ---------- bilgi paneli (react-spring) ---------- */
export function InfoPanel({ poi, onClose, inspecting }: { poi: Poi | null; onClose: () => void; inspecting: boolean }) {
  const t = useTransition(poi, { keys: (p) => p?.id ?? 'none', from: { x: 40, opacity: 0 }, enter: { x: 0, opacity: 1 }, leave: { x: 40, opacity: 0 }, config: { tension: 240, friction: 24 } });
  return t((style, p) => p && (
    <animated.div style={{ transform: style.x.to((x) => `translateX(${x}px)`), opacity: style.opacity }}
      className="pointer-events-auto absolute right-3 top-16 z-30 w-[min(23rem,calc(100%-1.5rem))] rounded-2xl bg-black/80 p-4 text-white shadow-2xl backdrop-blur" role="dialog" aria-label={p.name}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-300">{p.kind === 'medusa' ? 'Medusa · inceleme' : p.kind === 'column' ? 'Sütun' : 'Bilgi'}</p>
      <h3 className="text-lg font-bold">{p.name}</h3>
      <p className="mt-1 text-sm text-white/85">{p.text}</p>
      <a href={p.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-white/60 underline">{p.source.title} <ExternalLink size={12} /></a>
      <button onClick={onClose} className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-white/15 text-sm font-semibold"><X size={16} /> {inspecting ? 'İncelemeden çık' : 'Kapat'} <span className="text-white/50">(E)</span></button>
    </animated.div>
  ));
}
export const medusaPoi = (id: string) => POIS.find((p) => p.id === id)!;
