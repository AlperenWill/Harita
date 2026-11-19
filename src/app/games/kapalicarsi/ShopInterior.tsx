/**
 * Kapalıçarşı — dükkân içi (yalnızca girilen dükkân çizilir: "doku akışı"nın karşılığı; ayrıntılı ağlar ve sıcak ışık o an üretilir).
 *
 * Yerel koordinat: orijin cephe çizgisinin ortası (zemin), +z dükkânın içine, x dükkân boyunca. Kamera kapıdan tezgâha yaklaşır
 * (BazaarGame), tezgâhtaki 5 nesneye dokunulunca o nesneye yakınlaşır ve nesne yavaşça döner.
 * Işık: tavandan sarkan sıcak ampul (gerçek pointLight, 2700 K civarı ton) + vitrin ampulleri; sokak tarafı daha soğuk kalır.
 * Her zanaatın kendi düzeni: kuyumcuda camlı vitrin, halıcıda üst üste halılar ve duvarda asılı kilimler, bakırcıda tavandan sarkan
 * kazanlar, lambacıda yanan renkli cam lambalar, aktarda baharat külahları ve çuvallar, çinicide duvarda tabaklar, antikacıda saat
 * ve kutular, kumaşçıda rulo kumaşlar.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SHOP_D, SHOP_W, type Layout, type Shop, type Trade } from './ProceduralStreetGenerator';
import { counterItems, type CounterItem } from './items';
import { OPEN_H } from './Architecture';

export const COUNTER = { z: 1.75, y: 0.95, xs: [-0.9, -0.45, 0, 0.45, 0.9] } as const;
/** Dükkânın dünya dönüşümü: cephe noktası + yön (yerel +z içeri) */
export function shopFrame(s: Shop) {
  const fx = s.center[0] - s.normal[0] * (SHOP_D / 2), fz = s.center[1] - s.normal[1] * (SHOP_D / 2);
  return { x: fx, z: fz, yaw: Math.atan2(s.normal[0], s.normal[1]) };
}
/** Yerel nokta → dünya */
export function toWorld(s: Shop, lx: number, ly: number, lz: number): THREE.Vector3 {
  const f = shopFrame(s), c = Math.cos(f.yaw), sn = Math.sin(f.yaw);
  return new THREE.Vector3(f.x + lx * c + lz * sn, ly, f.z - lx * sn + lz * c);
}

/** Tezgâh nesnesinin modeli (türüne göre) */
function ItemModel({ it }: { it: CounterItem }) {
  const M = useMemo(() => ({ a: new THREE.MeshStandardMaterial({ color: it.color, metalness: ['#c9a24a', '#c8c8cc', '#d8d8de'].includes(it.color) ? 0.85 : 0.1, roughness: 0.35 }), b: new THREE.MeshStandardMaterial({ color: it.accent, metalness: 0.4, roughness: 0.4 }) }), [it]);
  switch (it.kind) {
    case 'anahtar': return (
      <group rotation-x={-Math.PI / 2}>
        <mesh material={M.a} position={[0, 0.06, 0]}><torusGeometry args={[0.045, 0.012, 8, 20]} /></mesh>
        {it.variant === 0 && <mesh material={M.b} position={[0, 0.06, 0]}><circleGeometry args={[0.03, 8]} /></mesh>}
        <mesh material={M.a} position={[0, -0.04, 0]}><cylinderGeometry args={[0.008, 0.008, 0.14, 8]} /></mesh>
        {[0, 1].map((k) => <mesh key={k} material={M.a} position={[0.018, -0.08 - k * 0.025, 0]}><boxGeometry args={[0.03, 0.012, 0.008]} /></mesh>)}
      </group>);
    case 'harita': return (
      <group rotation-z={Math.PI / 2}>
        <mesh material={M.a}><cylinderGeometry args={[0.035, 0.035, 0.32, 14]} /></mesh>
        {it.variant !== 3 && <mesh material={M.b}><cylinderGeometry args={[0.04, 0.04, 0.2, 14]} /></mesh>}
      </group>);
    case 'pusula': return (
      <group>
        <mesh material={M.a}><cylinderGeometry args={[0.05, 0.05, 0.022, 20]} /></mesh>
        <mesh material={M.b} position={[0, 0.012, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.025, 0.04, 20]} /></mesh>
        <mesh material={M.a} position={[0, 0, -0.058]} rotation-x={Math.PI / 2}><torusGeometry args={[0.012, 0.004, 6, 10]} /></mesh>
      </group>);
    case 'kutu': return (
      <group>
        <mesh material={M.a} position={[0, 0.04, 0]}><boxGeometry args={[0.16, 0.08, 0.11]} /></mesh>
        {it.variant !== 3 && [-0.04, 0, 0.04].map((x) => <mesh key={x} material={M.b} position={[x, 0.081, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.012, 5]} /></mesh>)}
      </group>);
    case 'tespih': return (
      <group>{Array.from({ length: 33 }, (_, i) => { const a = (i / 33) * Math.PI * 2; return <mesh key={i} material={M.a} position={[Math.cos(a) * 0.07, 0.01, Math.sin(a) * 0.09]}><sphereGeometry args={[0.009, 6, 4]} /></mesh>; })}<mesh material={M.b} position={[0, 0.01, 0.11]}><cylinderGeometry args={[0.01, 0.006, 0.05, 8]} /></mesh></group>);
    default: return <mesh material={M.a} position={[0, 0.04, 0]}><boxGeometry args={[0.12, 0.08, 0.1]} /></mesh>;
  }
}

/** Zanaata özgü iç düzen (raflar, asılı mallar) */
function Fittings({ trade }: { trade: Trade }) {
  const w = SHOP_W - 0.4;
  const M = useMemo(() => ({ wood: new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.7 }), glass: new THREE.MeshPhysicalMaterial({ color: '#cfe6f2', transparent: true, opacity: 0.18, roughness: 0.05 }) }), []);
  const many = useMemo(() => {
    let sd = trade.length * 97; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647); const out: { p: [number, number, number]; c: string; s: number }[] = [];
    const pal: Record<Trade, string[]> = { kuyumcu: ['#e8c25a', '#f4d47a', '#dadade'], halici: ['#8e2a2a', '#2c3f6b', '#a0522d', '#5a2a4a', '#c9a35a'], bakirci: ['#c06a3a', '#b5582a', '#d98a52'], baharatci: ['#c8361f', '#e0a020', '#7a3e16', '#3a6a2a'], lambaci: ['#3a7bd5', '#e0453a', '#2bb56a', '#f2c230', '#a64ad8'], cinici: ['#1f5fa8', '#2a8a8a', '#c8442a', '#f2efe6'], antikaci: ['#5a3a22', '#8a7a5a', '#c9a24a'], kumasci: ['#c23b6b', '#2f8a8a', '#e8c86a', '#5a3a8a'] };
    for (let i = 0; i < 26; i++) out.push({ p: [-w / 2 + 0.2 + r() * (w - 0.4), 0.4 + r() * 2.2, SHOP_D - 0.4 - r() * 0.3], c: pal[trade][i % pal[trade].length], s: 0.6 + r() * 0.6 });
    return out;
  }, [trade, w]);
  return (
    <group>
      {/* arka duvar rafları */}
      {[0.6, 1.3, 2.0, 2.7].map((y) => <mesh key={y} material={M.wood} position={[0, y, SHOP_D - 0.35]}><boxGeometry args={[w, 0.05, 0.5]} /></mesh>)}
      {trade === 'halici' && [0.15, 0.3, 0.45, 0.6].map((y, i) => <mesh key={y} position={[-0.5 + i * 0.05, y, 2.9]}><boxGeometry args={[1.6, 0.14, 1.1]} /><meshStandardMaterial color={many[i].c} roughness={0.95} /></mesh>)}
      {trade === 'kuyumcu' && [-0.9, 0.9].map((x) => <mesh key={x} material={M.glass} position={[x, 1.25, 0.6]}><boxGeometry args={[0.7, 0.6, 0.5]} /></mesh>)}
      {many.map((m, i) => {
        if (trade === 'lambaci') return <mesh key={i} position={[m.p[0], 2.4 - (i % 3) * 0.3, 0.6 + (i % 5) * 0.55]}><sphereGeometry args={[0.13 * m.s, 12, 8]} /><meshStandardMaterial color={m.c} emissive={m.c} emissiveIntensity={1.6} roughness={0.3} /></mesh>;
        if (trade === 'bakirci') return <mesh key={i} position={[m.p[0], 2.5 - (i % 2) * 0.35, 0.5 + (i % 6) * 0.5]}><sphereGeometry args={[0.16 * m.s, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6]} /><meshStandardMaterial color={m.c} metalness={0.85} roughness={0.3} side={THREE.DoubleSide} /></mesh>;
        if (trade === 'halici' && i < 4) return <mesh key={i} position={[-w / 2 + 0.05, 1.6, 0.8 + i * 0.8]} rotation-y={Math.PI / 2}><planeGeometry args={[0.7, 1.4]} /><meshStandardMaterial color={m.c} side={THREE.DoubleSide} roughness={0.95} /></mesh>;
        if (trade === 'cinici') return <mesh key={i} position={[m.p[0], m.p[1], SHOP_D - 0.12]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.15 * m.s, 0.13 * m.s, 0.02, 18]} /><meshStandardMaterial color={m.c} roughness={0.2} /></mesh>;
        if (trade === 'baharatci') return <mesh key={i} position={[m.p[0], [0.78, 1.48, 2.18][i % 3], m.p[2]]}><coneGeometry args={[0.1 * m.s, 0.22 * m.s, 10]} /><meshStandardMaterial color={m.c} roughness={0.95} /></mesh>;
        if (trade === 'kumasci') return <mesh key={i} position={[m.p[0], [0.72, 1.42, 2.12][i % 3], m.p[2]]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.6, 10]} /><meshStandardMaterial color={m.c} roughness={0.9} /></mesh>;
        return <mesh key={i} position={[m.p[0], [0.7, 1.4, 2.1][i % 3], m.p[2]]}><boxGeometry args={[0.16 * m.s, 0.12 * m.s, 0.14]} /><meshStandardMaterial color={m.c} metalness={trade === 'kuyumcu' ? 0.9 : 0.2} roughness={0.35} /></mesh>;
      })}
    </group>
  );
}

export function ShopInterior({ L, shop, night, onPick, picked }: { L: Layout; shop: number; night: boolean; onPick: (i: number) => void; picked: number | null }) {
  const s = L.shops[shop], f = shopFrame(s), items = useMemo(() => counterItems(L, shop), [L, shop]);
  const refs = useRef<(THREE.Group | null)[]>([]), bulb = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }, dt) => {
    refs.current.forEach((g, i) => { if (!g) return; const want = picked === i ? 1 : 0; g.position.y += ((COUNTER.y + 0.02 + want * 0.32) - g.position.y) * Math.min(1, dt * 5); if (picked === i) g.rotation.y += dt * 0.9; });
    bulb.current.intensity = 6 + Math.sin(clock.elapsedTime * 13) * 0.15;   // filament titremesi
  });
  return (
    <group position={[f.x, 0, f.z]} rotation-y={f.yaw}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, SHOP_D / 2]}><planeGeometry args={[SHOP_W - 0.35, SHOP_D - 0.1]} /><meshStandardMaterial color="#6a4a30" roughness={0.8} /></mesh>
      <Fittings trade={s.trade} />
      {/* tezgâh: ahşap gövde + cam üst */}
      <mesh position={[0, COUNTER.y / 2, COUNTER.z]}><boxGeometry args={[2.3, COUNTER.y, 0.6]} /><meshStandardMaterial color="#4a2e1c" roughness={0.6} /></mesh>
      <mesh position={[0, COUNTER.y + 0.005, COUNTER.z]}><boxGeometry args={[2.32, 0.01, 0.62]} /><meshStandardMaterial color="#d8c8a8" roughness={0.25} /></mesh>
      {items.map((it, i) => (
        <group key={i} ref={(g) => { refs.current[i] = g; }} position={[COUNTER.xs[i], COUNTER.y + 0.02, COUNTER.z]} onClick={(e) => { e.stopPropagation(); onPick(i); }}>
          <ItemModel it={it} />
          <mesh visible={false}><sphereGeometry args={[0.13, 8, 6]} /></mesh>
        </group>
      ))}
      {/* sıcak ampul (gerçek ışık) + çıplak ampul */}
      <pointLight ref={bulb} position={[0, OPEN_H - 0.25, 1.3]} color={night ? '#ffc070' : '#ffcf8a'} intensity={6} distance={7} decay={1.6} />
      <mesh position={[0, OPEN_H - 0.2, 1.3]}><sphereGeometry args={[0.07, 10, 8]} /><meshBasicMaterial color={new THREE.Color('#ffd28a').multiplyScalar(4)} toneMapped={false} /></mesh>
      <mesh position={[0, OPEN_H + 0.12, 1.3]}><cylinderGeometry args={[0.005, 0.005, 0.5, 4]} /><meshStandardMaterial color="#222" /></mesh>
    </group>
  );
}
