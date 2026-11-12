/**
 * "Miras." logosu: M ve nokta kırmızı (#F04448), "iras" beyaz.
 * Beyaz harfler görünsün diye her zaman koyu bir zemin üzerinde kullanılır.
 * suffix verilirse (ör. "Haritası") beyaz olarak eklenir.
 */
export function Logo({ suffix, className = '' }: { suffix?: string; className?: string }) {
  return (
    <span className={`font-extrabold tracking-tight ${className}`} aria-label={suffix ? `Miras. ${suffix}` : 'Miras.'}>
      <span className="text-brand">M</span>
      <span className="text-white">iras</span>
      <span className="text-brand">.</span>
      {suffix && <span className="text-white"> {suffix}</span>}
    </span>
  );
}
