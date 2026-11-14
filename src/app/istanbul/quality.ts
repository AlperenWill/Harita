/**
 * Cihaz kademesi. Düşük kademede gölge, sis ve partiküller kapanır; yalnızca temel geometri kalır.
 * Tarayıcılar GPU modelini her zaman söylemez; bu yüzden birkaç zayıf sinyal birlikte değerlendirilir.
 * ?q=low|medium|high adres parametresi kademeyi sabitler (test ve profil çıkarma için).
 */
export type Tier = 'low' | 'medium' | 'high';

export function detectTier(): Tier {
  const pinned = new URLSearchParams(location.search).get('q');
  if (pinned === 'low' || pinned === 'medium' || pinned === 'high') return pinned;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (nav.connection?.saveData) return 'low';
  if ((nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low';
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    const gpu = ext ? String(gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    if (/Mali-[4T]|Adreno \(TM\) [1-5]\d\d|PowerVR|SwiftShader|llvmpipe/i.test(gpu)) return 'low';
  } catch { /* bilgi yok */ }
  return coarse ? 'medium' : 'high';
}

export const TIER = {
  low: { shadows: false, fog: false, particles: false, dpr: 1 as const, antialias: false },
  medium: { shadows: true, fog: true, particles: true, dpr: [1, 1.4] as [number, number], antialias: true },
  high: { shadows: true, fog: true, particles: true, dpr: [1, 1.75] as [number, number], antialias: true },
};
