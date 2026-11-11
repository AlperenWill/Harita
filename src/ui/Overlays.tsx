import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';

/** İmleci takip eden etiket (yalnızca ince imleçli cihazlarda; dokunmatikte etiketler zaten sahnede). */
export function HoverTip() {
  const hovered = useStore((s) => s.hovered);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (ref.current) ref.current.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);
  return (
    <div ref={ref} className={`hover-tip${hovered ? ' is-on' : ''}`} aria-hidden="true">
      {hovered?.label}
    </div>
  );
}

export function Toast() {
  const toast = useStore((s) => s.toast);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div className={`toast glass${visible ? ' is-on' : ''}`} role="status" aria-live="polite">
      {toast && (
        <>
          <strong>{toast.title}</strong>
          <span>{toast.body}</span>
        </>
      )}
    </div>
  );
}

export function Intro() {
  const seen = useStore((s) => s.seenIntro);
  if (seen) return null;
  return (
    <div className="intro glass" role="dialog" aria-label="Hoş geldin">
      <p className="eyebrow">Kâşif, hoş geldin</p>
      <h2>Anadolu’nun katmanlarını keşfet</h2>
      <ul>
        <li><b>Dokun / tıkla:</b> bölge → il → miras noktası</li>
        <li><b>Döndür:</b> sürükle · <b>Yakınlaş:</b> tekerlek ya da iki parmak</li>
        <li>Her keşif Günlüğüne bir <b>mühür</b> ekler; parıldayan <b>kayıp detayları</b> bul.</li>
      </ul>
      <button className="pill-btn primary" onClick={() => useStore.getState().dismissIntro()}>Keşfe başla</button>
    </div>
  );
}

/**
 * Mobil dikey modda zorunlu yatay mod uyarısı. Görünürlük CSS media query ile
 * (pointer: coarse + orientation: portrait) belirlenir; destekleyen tarayıcılarda
 * tam ekran + Screen Orientation API ile tek dokunuşta yatay kilit önerilir.
 */
export function RotateHint() {
  const canLock = typeof screen !== 'undefined' && 'orientation' in screen && 'lock' in (screen.orientation as object);
  const lock = async () => {
    try {
      await document.documentElement.requestFullscreen?.();
      await (screen.orientation as ScreenOrientation & { lock: (o: string) => Promise<void> }).lock('landscape');
    } catch {
      /* iOS Safari kilidi desteklemez: kullanıcı cihazı çevirmeli */
    }
  };
  return (
    <div className="rotate-hint" role="alert">
      <div className="phone" aria-hidden="true" />
      <p>Bu keşif yatay ekranda yaşanır.<br />Lütfen cihazını <b>yatay</b> çevir.</p>
      {canLock && <button className="pill-btn primary" onClick={lock}>Tam ekran ve yatay</button>}
    </div>
  );
}
