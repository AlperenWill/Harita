/**
 * Dolmabahçe — kristal avize: binlerce damla kristal TEK InstancedMesh (tek draw call), ampuller ikinci, yaldızlı gövde birkaç ağ.
 *
 * KRİSTAL YERLEŞİM MATEMATİĞİ (avize yerel koordinatı, y aşağı negatif):
 *   Katlar k = 0..K−1: yarıçap r_k ve yükseklik y_k (alttan üste daralan konik bir silüet).
 *   1) SARKAN DİZİLER: her kat halkasında n_k = ⌊2π·r_k / aralık⌋ dizi; dizi j açısı θ_j = 2πj/n_k (+ kat başına yarım kaydırma).
 *      Dizideki i'nci damla: p = (r_k·cosθ_j, y_k − i·ℓ, r_k·sinθ_j); boyut alta doğru küçülür s_i = s0·(1 − 0,12·i).
 *   2) ÇELENKLER (festoon): kat halkasında ardışık iki kol arasında sarkan kemer. Kemer parametresi u ∈ [0,1]:
 *      açı θ = θ_a + u·Δθ,  yükseklik y = y_k − sarkma·(1 − (2u − 1)²)   (parabol: uçlarda 0, ortada en derin)
 *   3) Her örneğin dönüşümü: M = T(p) · R_y(θ + π/2) · R_x(hafif salınım) · S(s). Damlalar yüzlerini dışa çevirir;
 *      R_y rastgele değil θ'ya bağlıdır: avize döndükçe parıltılar halka boyunca "akar".
 *   Geometri: sekiz yüzlü uzun bir çift piramit (prizma damla) — az üçgen (~16), çok faset: her faset ışığı ayrı yöne kırar/yansıtır.
 * LOD: kamera uzaktaysa (ReflectionOptimizer.chandelierLod) damlalar yerine tek bir cam silüet (torna) + ampuller çizilir.
 * Döndürme: kristal grubu çok yavaş döner (0,03 rad/sn); sabit ışık altında bile parıltılar hareket eder.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { crystal, goldPlain } from './LuxuryMaterialSystem';
import { chandelierLod, type Lod, type Plan } from './ReflectionOptimizer';

export interface Spec { tiers: { r: number; y: number; drops: number; sag: number }[]; spacing: number; dropLen: number; dropSize: number; arms: number; lamps: number }
/** Muayede'nin dev avizesi (stilize; gerçekte ~4,5 ton, 750 lamba) */
export const GRAND: Spec = { tiers: [{ r: 1.3, y: -3.4, drops: 6, sag: 0.4 }, { r: 2.4, y: -2.6, drops: 5, sag: 0.5 }, { r: 3.3, y: -1.7, drops: 5, sag: 0.6 }, { r: 3.9, y: -0.8, drops: 4, sag: 0.55 }, { r: 3.4, y: 0.2, drops: 3, sag: 0.45 }, { r: 2.4, y: 1.1, drops: 3, sag: 0.35 }, { r: 1.3, y: 1.9, drops: 3, sag: 0.25 }], spacing: 0.17, dropLen: 0.15, dropSize: 0.05, arms: 24, lamps: 750 };
export const SALON: Spec = { tiers: [{ r: 0.6, y: -1.4, drops: 5, sag: 0.25 }, { r: 1.1, y: -0.9, drops: 4, sag: 0.3 }, { r: 1.4, y: -0.3, drops: 3, sag: 0.3 }, { r: 1.0, y: 0.3, drops: 3, sag: 0.2 }], spacing: 0.15, dropLen: 0.12, dropSize: 0.042, arms: 12, lamps: 96 };

export interface Drop { p: [number, number, number]; yaw: number; swing: number; s: number }
/** Saf: avizedeki tüm damlaların yeri (kristal sayısı ölçeği `scale` ile seyreltilir: düşük kademede her k'ıncı dizi) */
export function crystalLayout(spec: Spec, scale = 1): Drop[] {
  const out: Drop[] = [], keep = (j: number) => scale >= 1 || (j * 9301 + 49297) % 233280 / 233280 < scale;
  spec.tiers.forEach((t, k) => {
    const n = Math.floor((2 * Math.PI * t.r) / spec.spacing), off = (k % 2) * Math.PI / n;
    for (let j = 0; j < n; j++) {
      if (!keep(j + k * 1000)) continue; const th = (2 * Math.PI * j) / n + off;
      for (let i = 0; i < t.drops; i++) out.push({ p: [t.r * Math.cos(th), t.y - i * spec.dropLen, t.r * Math.sin(th)], yaw: th + Math.PI / 2, swing: ((j * 7 + i * 3) % 5 - 2) * 0.03, s: spec.dropSize * (1 - 0.12 * i) });
    }
    const da = (2 * Math.PI) / spec.arms, per = Math.max(6, Math.round((t.r * da) / (spec.spacing * 0.6)));
    for (let a = 0; a < spec.arms; a++) for (let u = 1; u < per; u++) {   // çelenk kemerleri
      if (!keep(a * 31 + u + k * 77)) continue; const v = u / per, th = a * da + v * da, y = t.y - 0.08 - t.sag * (1 - (2 * v - 1) ** 2), r = t.r * 1.03;
      out.push({ p: [r * Math.cos(th), y, r * Math.sin(th)], yaw: th + Math.PI / 2, swing: 0, s: spec.dropSize * 0.55 });
    }
  });
  return out;
}
/** Prizma damla: uzun sekiz yüzlü çift piramit (üst kısa, alt uzun) */
function dropGeometry() {
  const pts = [[0, 0.9], [0.32, 0.35], [0.36, 0.0], [0.28, -0.5], [0, -1.6]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 8).toNonIndexed();
}
/** Kamera için avize çevresinde yavaş yörünge (aşağıdan yukarı bakan) */
export function orbitCamera(center: [number, number, number], t: number, R = 8.5, below = 13.5, w = 0.12): [number, number, number] {
  return [center[0] + R * Math.cos(w * t), center[1] - below, center[2] + R * Math.sin(w * t)];
}

export function CrystalChandelier({ spec, at, scale, plan, lightIntensity = 30 }: { spec: Spec; at: [number, number, number]; scale: number; plan: Plan; lightIntensity?: number }) {
  const drops = useMemo(() => crystalLayout(spec, plan.crystalScale), [spec, plan.crystalScale]);
  const mats = useMemo(() => ({ glass: crystal(plan.transmission), gold: goldPlain(), bulb: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(3.2), toneMapped: false }), sil: new THREE.MeshPhysicalMaterial({ color: '#f6fbff', roughness: 0.05, transparent: true, opacity: 0.35, envMapIntensity: 2.2, clearcoat: 1, depthWrite: false }) }), [plan.transmission]);
  const crystals = useMemo(() => {
    const im = new THREE.InstancedMesh(dropGeometry(), mats.glass, drops.length), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    drops.forEach((d, i) => im.setMatrixAt(i, M4.compose(new THREE.Vector3(...d.p), q.setFromEuler(e.set(d.swing, d.yaw, 0, 'YXZ')), new THREE.Vector3(d.s, d.s, d.s))));
    im.frustumCulled = false; return im;
  }, [drops, mats.glass]);
  const bulbs = useMemo(() => {   // ampuller: katlar boyunca kollar üstünde (lamba sayısı ölçekle seyreltilir)
    const n = Math.max(12, Math.round(spec.lamps * Math.max(0.35, plan.crystalScale))), im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), mats.bulb, n), M4 = new THREE.Matrix4(), T = spec.tiers;
    for (let i = 0; i < n; i++) { const t = T[i % T.length], a = (i / n) * Math.PI * 2 * 7.3; im.setMatrixAt(i, M4.makeTranslation(t.r * 1.05 * Math.cos(a), t.y + 0.22, t.r * 1.05 * Math.sin(a))); }
    return im;
  }, [spec, plan.crystalScale, mats.bulb]);
  const sil = useMemo(() => new THREE.LatheGeometry(spec.tiers.map((t) => new THREE.Vector2(t.r, t.y)).concat([new THREE.Vector2(0.2, spec.tiers[spec.tiers.length - 1].y + 0.6)]).sort((a, b) => a.y - b.y), 24), [spec]);
  const group = useRef<THREE.Group>(null!), detail = useRef<THREE.Group>(null!), silRef = useRef<THREE.Mesh>(null!), lod = useRef<Lod>('siluet');
  const wp = useMemo(() => new THREE.Vector3(...at), [at]);
  useFrame(({ camera }, dt) => {
    group.current.rotation.y += dt * 0.03;
    lod.current = chandelierLod(camera.position.distanceTo(wp), lod.current, plan);
    detail.current.visible = lod.current === 'detay'; silRef.current.visible = lod.current === 'siluet';
  });
  return (
    <group position={at} scale={scale}>
      <group ref={group}>
        {/* yaldızlı gövde: orta gövde, kat halkaları, tavan zinciri */}
        <mesh material={mats.gold} position={[0, 0, 0]}><cylinderGeometry args={[0.12, 0.2, (spec.tiers[spec.tiers.length - 1].y - spec.tiers[0].y) + 0.8, 10]} /></mesh>
        {spec.tiers.map((t, k) => <mesh key={k} material={mats.gold} position={[0, t.y + 0.05, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[t.r, 0.035, 6, 48]} /></mesh>)}
        <mesh material={mats.gold} position={[0, spec.tiers[spec.tiers.length - 1].y + 4, 0]}><cylinderGeometry args={[0.04, 0.04, 8, 6]} /></mesh>
        <mesh material={mats.gold} position={[0, spec.tiers[0].y - spec.tiers[0].drops * spec.dropLen - 0.2, 0]}><sphereGeometry args={[0.16, 12, 10]} /></mesh>
        <group ref={detail}><primitive object={crystals} /></group>
        <mesh ref={silRef} geometry={sil} material={mats.sil} />
        <primitive object={bulbs} />
      </group>
      <pointLight position={[0, spec.tiers[0].y - 0.5, 0]} color="#ffcf90" intensity={lightIntensity} distance={30 * scale} decay={1.6} />
    </group>
  );
}
