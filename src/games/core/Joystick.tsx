import { useRef } from 'react';
import { walkInput } from './walkInput';

/** Dokunmatik sanal joystick (masaüstünde gizli). Değerler walkInput'a yazılır, React durumu tetiklenmez. */
export function Joystick({ className = '' }: { className?: string }) {
  const knob = useRef<HTMLSpanElement>(null);
  const set = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    walkInput.x = x; walkInput.y = y; if (knob.current) knob.current.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
  };
  const reset = () => { walkInput.x = walkInput.y = 0; if (knob.current) knob.current.style.transform = ''; };
  return (
    <div className={`grid h-28 w-28 touch-none place-items-center rounded-full border-2 border-white/80 bg-white/30 backdrop-blur [@media(pointer:fine)]:hidden ${className}`}
      aria-label="Yürüme joystick'i" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); set(e); }}
      onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) set(e); }} onPointerUp={reset} onPointerCancel={reset}>
      <span ref={knob} className="h-12 w-12 rounded-full bg-brand shadow-lg" />
    </div>
  );
}
