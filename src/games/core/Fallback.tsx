import { useEffect, useState } from 'react';
import { ExternalLink, Pause, Play } from 'lucide-react';
import type { GameDefinition } from './types';

/**
 * WebGL desteklemeyen cihazlar için yedek: Vikipedi'den çalışma anında çekilen yüksek çözünürlüklü fotoğraf
 * (Wikimedia Commons lisansıyla, kaynak bağlantılı) + tarayıcının Türkçe sesli okuması (Web Speech API).
 * Depoya fotoğraf ya da ses dosyası eklenmez.
 */
export function Fallback({ def }: { def: GameDefinition }) {
  const [img, setImg] = useState<{ src: string; page?: string } | null>(null);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    fetch(`https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(def.fallback.wikiTitle.replace(/ /g, '_'))}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setImg({ src: j.originalimage?.source ?? j.thumbnail?.source, page: j.content_urls?.desktop?.page }))
      .catch(() => {});
    return () => speechSynthesis?.cancel();
  }, [def]);
  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(`${def.name}. ${def.fallback.narration}`);
    u.lang = 'tr-TR'; u.rate = 0.95; u.onend = () => setSpeaking(false);
    speechSynthesis.speak(u); setSpeaking(true);
  };
  return (
    <div className="absolute inset-0 overflow-y-auto bg-ink text-white">
      {img?.src ? <img src={img.src} alt={def.name} className="h-[60vh] w-full object-cover" /> : <div className="grid h-[40vh] place-items-center bg-[#1b2533] text-white/50">Fotoğraf yüklenemedi</div>}
      <div className="mx-auto max-w-2xl p-5">
        <p className="text-sm text-white/60">Cihazın 3D oyunları desteklemiyor; yapıyı fotoğraf ve sesli anlatımla tanıyabilirsin.</p>
        <h1 className="mt-2 text-2xl font-bold">{def.name}</h1>
        <p className="mt-2 text-white/80">{def.fallback.narration}</p>
        {'speechSynthesis' in window && (
          <button onClick={speak} className="btn-primary mt-4 h-11 px-5">{speaking ? <Pause size={18} /> : <Play size={18} />} {speaking ? 'Durdur' : 'Sesli anlatımı dinle'}</button>
        )}
        {img?.page && <a href={img.page} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-1.5 text-xs text-white/60 hover:text-white"><ExternalLink size={13} /> Fotoğraf: Vikipedi / Wikimedia Commons</a>}
      </div>
    </div>
  );
}
