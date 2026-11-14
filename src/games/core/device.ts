import { useEffect, useState } from 'react';

/**
 * Cihaz profili (tüm oyunlarda ortak):
 *  - kademe: veri tasarrufu, bellek ≤ 3 GB, ≤ 4 çekirdek ya da zayıf GPU adı → low; dokunmatik → medium; diğer → high
 *  - pil: %20'nin altında ve şarjda değilse gölge ve son işlem kapanır (Battery API yalnızca Chromium'da var)
 *  - ?q=low|medium|high adres parametresi kademeyi sabitler (test ve profil çıkarma için)
 */
export type Tier = 'low' | 'medium' | 'high';
export interface DeviceProfile {
  tier: Tier;
  batterySaver: boolean;
  mobile: boolean;
  shadows: boolean;
  fog: boolean;
  particles: boolean;
  dpr: number | [number, number];
  antialias: boolean;
}

export const supportsWebGL = (() => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
})();

export function detectTier(): Tier {
  const pinned = new URLSearchParams(location.search).get('q');
  if (pinned === 'low' || pinned === 'medium' || pinned === 'high') return pinned;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return 'low';
  if ((nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low';
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    const gpu = ext ? String(gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    if (/Mali-[4T]|Adreno \(TM\) [1-5]\d\d|PowerVR|SwiftShader|llvmpipe/i.test(gpu)) return 'low';
  } catch { /* bilgi yok */ }
  return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high';
}

export function profileFor(tier: Tier, batterySaver: boolean): DeviceProfile {
  const t: Tier = batterySaver ? 'low' : tier;
  return {
    tier, batterySaver, mobile: matchMedia('(pointer: coarse)').matches,
    shadows: t !== 'low', fog: t !== 'low', particles: t !== 'low',
    dpr: t === 'low' ? 1 : t === 'medium' ? [1, 1.4] : [1, 1.75],
    antialias: t !== 'low',
  };
}

type Battery = EventTarget & { level: number; charging: boolean };
export function useDeviceProfile(): DeviceProfile {
  const [tier] = useState(detectTier);
  const [saver, setSaver] = useState(false);
  useEffect(() => {
    let b: Battery | null = null;
    const check = () => b && setSaver(b.level < 0.2 && !b.charging);
    (navigator as Navigator & { getBattery?: () => Promise<Battery> }).getBattery?.().then((x) => {
      b = x; check(); x.addEventListener('levelchange', check); x.addEventListener('chargingchange', check);
    }).catch(() => {});
    return () => { b?.removeEventListener('levelchange', check); b?.removeEventListener('chargingchange', check); };
  }, []);
  return profileFor(tier, saver);
}
