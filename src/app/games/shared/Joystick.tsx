/** Paylaşılan dokunmatik joystick (yalnızca dokunmatik ekranda görünür). Değer -1..1; y > 0 = geri. */
import { useRef } from 'react';
export function Joystick({ stick, onTouch, color = 'bg-amber-400' }: { stick: React.MutableRefObject<{ x: number; y: number }>; onTouch?: () => void; color?: string }) {
  const knob = useRef<HTMLSpanElement>(null);
  const set = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect(); let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } stick.current = { x, y }; if (knob.current) knob.current.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
  };
  const reset = () => { stick.current = { x: 0, y: 0 }; if (knob.current) knob.current.style.transform = ''; };
  return (
    <div className="absolute bottom-24 left-5 z-40 grid h-28 w-28 touch-none place-items-center rounded-full border-2 border-white/70 bg-white/20 backdrop-blur sm:bottom-28 [@media(pointer:fine)]:hidden"
      aria-label="Yürüme joystick'i" onPointerDown={(e) => { e.stopPropagation(); onTouch?.(); e.currentTarget.setPointerCapture(e.pointerId); set(e); }}
      onPointerMove={(e) => { e.stopPropagation(); if (e.currentTarget.hasPointerCapture(e.pointerId)) set(e); }} onPointerUp={(e) => { e.stopPropagation(); reset(); }} onPointerCancel={reset}>
      <span ref={knob} className={`h-12 w-12 rounded-full shadow-lg ${color}`} />
    </div>
  );
}
