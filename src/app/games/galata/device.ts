import { useEffect, useState } from 'react';

/**
 * Cihaz profili (yalnızca bu oyun için):
 *  - kademe: ?q=low|medium|high sabitler; veri tasarrufu, ≤ 3 GB bellek ya da ≤ 4 çekirdek → low; dokunmatik → medium
 *  - pil %20'nin altında ve şarjda değilse gölge ve sis kapanır (Battery API yalnızca Chromium'da)
 * Gölge kuralı: zindanda her zaman kapalı (tek fener ışığı yeter), terasta açık (düşük kademe/pil tasarrufu hariç).
 */
export type Tier = 'low' | 'medium' | 'high';
export const supportsWebGL = (() => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
})();
export const isTouch = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export function detectTier(): Tier {
  const q = new URLSearchParams(location.search).get('q');
  if (q === 'low' || q === 'medium' || q === 'high') return q;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low';
  return isTouch ? 'medium' : 'high';
}

type Battery = EventTarget & { level: number; charging: boolean };
export function useDevice() {
  const [tier] = useState(detectTier);
  const [saver, setSaver] = useState(false);
  useEffect(() => {
    let b: Battery | null = null;
    const check = () => b && setSaver(b.level < 0.2 && !b.charging);
    (navigator as Navigator & { getBattery?: () => Promise<Battery> }).getBattery?.().then((x) => { b = x; check(); x.addEventListener('levelchange', check); x.addEventListener('chargingchange', check); }).catch(() => {});
    return () => { b?.removeEventListener('levelchange', check); b?.removeEventListener('chargingchange', check); };
  }, []);
  const eff: Tier = saver ? 'low' : tier;
  return {
    tier: eff, batterySaver: saver, touch: isTouch,
    shadows: eff !== 'low', fog: eff !== 'low',
    dpr: (eff === 'low' ? 1 : eff === 'medium' ? [1, 1.4] : [1, 1.75]) as number | [number, number],
    antialias: eff !== 'low',
    cityBlocks: eff === 'low' ? 500 : eff === 'medium' ? 1100 : 1800,
  };
}
export type Device = ReturnType<typeof useDevice>;
