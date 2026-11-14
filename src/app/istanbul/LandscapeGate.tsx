import { RotateCw } from 'lucide-react';

/**
 * Mobilde zorunlu yatay mod: dikey tutulan dokunmatik cihazlarda deneyimin üstünü kapatır.
 * Görünürlük CSS ile belirlenir (JS gerekmez). Destekleyen tarayıcılarda tam ekran + yatay kilit önerilir;
 * iOS Safari kilidi desteklemez, kullanıcının cihazı çevirmesi gerekir.
 */
export function LandscapeGate() {
  const canLock = typeof screen !== 'undefined' && !!(screen.orientation as ScreenOrientation & { lock?: unknown })?.lock;
  const lock = async () => {
    try {
      await document.documentElement.requestFullscreen?.();
      await (screen.orientation as ScreenOrientation & { lock: (o: string) => Promise<void> }).lock('landscape');
    } catch { /* desteklenmiyor */ }
  };
  return (
    <div className="fixed inset-0 z-[1200] hidden flex-col items-center justify-center gap-5 bg-ink/95 p-8 text-center text-white [@media(pointer:coarse)_and_(orientation:portrait)]:flex" role="alert">
      <RotateCw size={56} className="animate-spin text-brand [animation-duration:3s]" />
      <p className="text-lg font-semibold">Lütfen telefonu yan çevirin</p>
      <p className="max-w-xs text-sm text-white/70">İstanbul Katmanları yatay ekranda deneyimlenmek üzere tasarlandı.</p>
      {canLock && <button onClick={lock} className="btn-primary h-12 px-6">Tam ekran ve yatay</button>}
    </div>
  );
}
