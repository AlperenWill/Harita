/**
 * Masaüstünde fareyle bakış (Yerebatan, Konya ve Antalya oyunlarındaki gibi).
 * Sahneye tıklayınca imleç kilitlenir (Pointer Lock); fare hareketi bakışı çevirir, Esc bırakır.
 * Klavyede A/D ya da sol/sağ oklarla kamera ÇEVRİLMEZ: bakış yalnızca fareyle (ya da dokunmatikte sürüklemeyle).
 * Kart, bulmaca ya da menü açıldığında (enabled() false) kilit kendiliğinden bırakılır ki düğmelere tıklanabilsin.
 * Hassasiyet ortak ayarlardan (Menü › Ayarlar › Bakış hassasiyeti) gelir.
 */
import { useEffect, useRef, useState } from 'react';
import { useSettings } from './hud/settings';

/** apply(dx, dy): fare hareketi (piksel) → bakış değişimi; oyun kendi yaw/pitch'ini günceller */
export function useMouseLook(apply: (dx: number, dy: number) => void, enabled: () => boolean) {
  const [locked, setLocked] = useState(false), a = useRef(apply), en = useRef(enabled); a.current = apply; en.current = enabled;
  useEffect(() => {
    const mv = (e: MouseEvent) => { if (!document.pointerLockElement) return; if (!en.current()) { document.exitPointerLock?.(); return; } if (Math.abs(e.movementX) > 250 || Math.abs(e.movementY) > 250) return;   // Chromium kilit sonrası bazen tek seferlik dev sıçrama verir
      const k = useSettings.getState().sensitivity; a.current(e.movementX * k, e.movementY * k); };
    const ch = () => setLocked(!!document.pointerLockElement);
    const id = setInterval(() => { if (document.pointerLockElement && !en.current()) document.exitPointerLock?.(); }, 150);
    addEventListener('mousemove', mv); document.addEventListener('pointerlockchange', ch);
    return () => { removeEventListener('mousemove', mv); document.removeEventListener('pointerlockchange', ch); clearInterval(id); if (document.pointerLockElement) document.exitPointerLock?.(); };
  }, []);
  /** Sahnenin onPointerDown'ında çağır: farenin sol tuşuyla tıklanınca kilitle */
  const lock = (e: React.PointerEvent) => { if (e.pointerType === 'mouse' && e.button === 0 && en.current() && !document.pointerLockElement) { const el = e.currentTarget as HTMLElement; try { const p = el.requestPointerLock?.() as unknown; if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => {}); } catch { /* desteklenmiyor */ } } };
  return { locked, lock };
}
/** Kilitliyken ekranın ortasında küçük nişangâh */
export function LookCrosshair({ locked }: { locked: boolean }) {
  if (!locked) return null;
  return <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-[0_0_0_1.5px_rgba(0,0,0,0.35)]" />;
}
/** Fareyle bakış için ortak açı katsayıları (radyan / piksel) */
export const LOOK_YAW = 0.0024, LOOK_PITCH = 0.002;
