/**
 * WebGL yoksa: fotoğraf + sesli anlatım. Fotoğraflar Vikipedi'nin özet servisinden (Wikimedia Commons) gelir.
 * Not: Bunlar 360° fotoğraf değildir; depoda lisanslı 360° görüntü bulunmadığı için en yakın yedek budur.
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { VIEWPOINTS } from './panorama';
import { galataAudio } from './AudioManager';

const SLIDES = [
  { wiki: 'Galata_Kulesi', name: 'Galata Kulesi', text: 'Cenevizliler kuleyi 1348’de Galata surlarının parçası olarak yaptı. Osmanlı döneminde zindan ve yangın gözetleme kulesi oldu; bugün müzedir.' },
  ...VIEWPOINTS.map((v) => ({ wiki: v.id === 'bogaz' ? 'İstanbul_Boğazı' : v.id === 'ayasofya' ? 'Ayasofya' : v.id === 'suleymaniye' ? 'Süleymaniye_Camii' : 'Kız_Kulesi', name: v.name, text: v.text })),
];

function useWikiImage(title: string) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let off = false;
    fetch(`https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`).then((r) => r.json())
      .then((j) => { if (!off) setSrc(j.originalimage?.source ?? j.thumbnail?.source ?? null); }).catch(() => {});
    return () => { off = true; };
  }, [title]);
  return src;
}

export default function Fallback({ onExit }: { onExit: () => void }) {
  const [i, setI] = useState(0);
  const s = SLIDES[i], img = useWikiImage(s.wiki);
  return (
    <div className="fixed inset-0 flex flex-col bg-ink text-white">
      <div className="flex items-center gap-2 p-3">
        <button onClick={onExit} className="grid h-11 w-11 place-items-center rounded-full bg-white/10" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
        <p className="text-sm text-white/70">Bu cihazda 3D desteklenmiyor — fotoğraflı anlatım</p>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {img ? <img src={img} alt={s.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-white/50">Fotoğraf yükleniyor…</div>}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-5 pt-16">
          <h2 className="text-2xl font-bold">{s.name}</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/85">{s.text}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setI((i + SLIDES.length - 1) % SLIDES.length)} className="grid h-11 w-11 place-items-center rounded-full bg-white/15" aria-label="Önceki"><ChevronLeft /></button>
            <button onClick={() => galataAudio.speak(s.text)} className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-4 font-semibold"><Volume2 size={18} /> Dinle</button>
            <button onClick={() => setI((i + 1) % SLIDES.length)} className="grid h-11 w-11 place-items-center rounded-full bg-white/15" aria-label="Sonraki"><ChevronRight /></button>
          </div>
          <p className="mt-2 text-[11px] text-white/50">Fotoğraf: Vikipedi / Wikimedia Commons</p>
        </div>
      </div>
    </div>
  );
}
