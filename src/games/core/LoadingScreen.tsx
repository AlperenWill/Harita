/** Ortak yükleme ekranı: boş ekran yerine yapı adı, oyunun mekaniği ve ilerleme göstergesi */
export function LoadingScreen({ name, hint }: { name: string; hint?: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-[#1b2533] to-ink text-white" role="status" aria-label={`${name} yükleniyor`}>
      <div className="w-72 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-brand" />
        <p className="mt-4 text-lg font-semibold">{name}</p>
        {hint && <p className="mt-1 text-sm text-white/60">{hint}</p>}
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-1/3 animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-brand" /></div>
      </div>
      <style>{'@keyframes loading{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}'}</style>
    </div>
  );
}
