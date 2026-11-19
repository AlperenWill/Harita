/**
 * Dolmabahçe — uyarlanabilir yansıma ve LOD (saf; test edilir).
 *
 * YANSIMA KİPLERİ
 *   planar: zemin, kameranın zemine göre aynalanmış kopyasıyla sahneyi bir kez daha çizer (drei MeshReflectorMaterial). Cilalı mermerde
 *           net, doğru perspektifli yansıma verir; maliyeti "bir sahne geçişi daha" (çözünürlük ve bulanıklık ayarlanabilir).
 *           İyileştirme: yalnızca oyuncunun bulunduğu odanın zemini yansıtıcıdır; öbür odalar düz cilalı mermerdir (her yansıtıcı ayrı geçiş ister).
 *   cube:   düzlemsel yansıma kapalı; yansıma, açılışta bir kez üretilen ortam küpünden (Lightformer'lardan) gelir. Geçiş maliyeti sıfır.
 * KRİSTAL
 *   transmission yalnızca yüksek kademede (ek bir "arkadaki opak sahne" geçişi ister).
 *   Kristal sayısı ve avize LOD'u: kamera avizeye yakınsa (dLod içinde) her damla ayrı (InstancedMesh), uzaktaysa tek bir cam siluet.
 * Pil tasarrufu: düzlemsel yansıma ve transmission kapanır, parıltı nabzı durur (SparkleHuntMechanic), kristal sayısı yarıya iner.
 */
import type { Zone } from './palace';

export type Tier = 'low' | 'medium' | 'high';
export type ReflectMode = 'planar' | 'cube';
export interface Plan { tier: Tier; saver: boolean; reflect: ReflectMode; resolution: number; blur: [number, number]; mix: number; transmission: boolean; crystalScale: number; lodNear: number; bloom: boolean; dpr: number | [number, number] }
export function reflectionPlan(tier: Tier, saver: boolean): Plan {
  const t: Tier = saver ? 'low' : tier;
  return {
    tier: t, saver, reflect: t === 'low' ? 'cube' : 'planar', resolution: t === 'high' ? 1024 : 512, blur: t === 'high' ? [300, 100] : [0, 0], mix: t === 'high' ? 1.4 : 0.9,
    transmission: t === 'high', crystalScale: t === 'high' ? 1 : t === 'medium' ? 0.6 : 0.3, lodNear: t === 'high' ? 34 : t === 'medium' ? 24 : 16, bloom: t !== 'low',
    dpr: t === 'low' ? 1 : t === 'medium' ? [1, 1.4] : [1, 1.75],
  };
}
/** Hangi odanın zemini düzlemsel yansıtıcı olsun (aynı anda en çok bir) */
export function reflectorRoom(z: Zone): 'medhal' | 'muayede' | 'sufera' | null {
  if (z === 'medhal' || z === 'sufera') return z;
  if (z === 'muayede' || z === 'avize' || z === 'koridor') return 'muayede';
  return null;   // merdiven ve Atatürk'ün odası: halı/parke, yansıtıcı gereksiz
}
export type Lod = 'detay' | 'siluet';
/** Avize LOD'u: histerezisli (sınırda titreşmesin) */
export function chandelierLod(dist: number, prev: Lod, plan: Plan): Lod {
  if (prev === 'detay') return dist > plan.lodNear * 1.15 ? 'siluet' : 'detay';
  return dist < plan.lodNear ? 'detay' : 'siluet';
}
