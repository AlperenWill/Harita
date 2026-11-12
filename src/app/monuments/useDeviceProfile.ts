import { useEffect, useState } from 'react';
import { useMonumentStore } from './store';

export const supportsWebGL = (() => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
})();
/** ?q=high|medium|low: kaliteyi sabitler ve otomatik düşürmeyi kapatır (test ve profil çıkarma için) */
export const pinnedQuality = (() => {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('q') : null;
  return q === 'high' || q === 'medium' || q === 'low' ? q : null;
})();
export const isMobile = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

/**
 * Cihaz profili: mobilde orta kalite ile başlar. Pil %20'nin altındaysa (ve şarjda değilse)
 * pil tasarrufu açılır: gölge, sis ve partiküller kapanır. Battery Status API yalnızca
 * Chromium tabanlı tarayıcılarda vardır; desteklenmiyorsa bu adım sessizce atlanır.
 */
export function useDeviceProfile() {
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
  useEffect(() => {
    const st = useMonumentStore.getState();
    st.setQuality(pinnedQuality ?? (isMobile ? 'medium' : 'high'));
    const onResize = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', onResize);
    let battery: any, off = false;
    const check = () => { if (!off && battery) useMonumentStore.getState().setBatterySaver(battery.level < 0.2 && !battery.charging); };
    (navigator as any).getBattery?.().then((b: any) => { battery = b; check(); b.addEventListener('levelchange', check); b.addEventListener('chargingchange', check); }).catch(() => {});
    return () => { off = true; window.removeEventListener('resize', onResize); battery?.removeEventListener('levelchange', check); battery?.removeEventListener('chargingchange', check); };
  }, []);
  return { portrait, isMobile };
}
