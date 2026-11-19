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
      <p className="eyebrow">Hoş geldin</p>
      <h2>Haritadaki her nokta bir oyun</h2>
      <ul>
        <li>Renkli bölgeye dokun, sonra ile, sonra <b>kırmızı noktaya</b>.</li>
        <li>Gri yerlerin oyunları henüz hazır değil; yenileri eklendikçe açılır.</li>
        <li><b>Döndür:</b> sürükle · <b>Yakınlaş:</b> tekerlek ya da iki parmak</li>
      </ul>
      <button className="pill-btn primary" onClick={() => useStore.getState().dismissIntro()}>Başla</button>
    </div>
  );
}
