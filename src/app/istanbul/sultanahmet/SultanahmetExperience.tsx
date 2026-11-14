import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ExternalLink, Footprints, Lightbulb, Plane, Sun, Volume2, VolumeX, X } from 'lucide-react';
import SultanahmetScene, { type Mode } from './SultanahmetScene';
import { MOTIF_INFO } from './motifs';
import { MOTIFS, PHASES, phaseOf, sunPosition, type MotifId } from './layout';
import { ambience } from './audio';
import { detectTier } from '../quality';
import { BADGES, useJournal } from '../store';
import { SITE_BY_ID } from '../sites';
import { Joystick } from '../Joystick';
import { SourceList } from '../../pages/IstanbulSitePage';

const SITE = 'sultanahmet-camii';
const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

export default function SultanahmetExperience() {
  const site = SITE_BY_ID[SITE];
  const tier = useMemo(() => detectTier(), []);
  const [hour, setHour] = useState(9.5);
  const [mode, setMode] = useState<Mode>('orbit');
  const [card, setCard] = useState<MotifId | null>(null);
  const [zoomPanel, setZoomPanel] = useState<MotifId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [zone, setZone] = useState<'outside' | 'court' | 'hall'>('outside');
  const [muted, setMuted] = useState(false);
  const [info, setInfo] = useState(false);
  const [azan, setAzan] = useState(false);
  const finds = useJournal((s) => s.finds[SITE] ?? []);
  const visited = useJournal((s) => s.visited);
  const find = useJournal((s) => s.find);
  const allFinds = useJournal((s) => s.finds);
  const motifCount = MOTIFS.filter((m) => finds.includes(`motif:${m}`)).length;
  const badges = BADGES.filter((b) => b.site === SITE);

  useEffect(() => { void ambience.azanAvailable().then(setAzan); return () => ambience.stop(); }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); }, [toast]);
  // rozet kazanılınca bildir
  const [seen, setSeen] = useState<string[]>(() => BADGES.filter((b) => b.earned({ visited, finds: allFinds })).map((b) => b.id));
  useEffect(() => {
    const now = BADGES.filter((b) => b.earned({ visited, finds: allFinds })).map((b) => b.id);
    const fresh = now.find((id) => !seen.includes(id));
    if (fresh) { const b = BADGES.find((x) => x.id === fresh)!; setToast(`${b.icon} Rozet kazandın: ${b.name}`); }
    if (now.length !== seen.length) setSeen(now);
  }, [visited, allFinds, seen]);

  const startWalk = () => { ambience.start(); ambience.setMuted(muted); setMode('walk'); setToast('Avludasın. Kapıdan geçip harime gir, sonra saati değiştirerek ışığı izle.'); };
  const onPanel = (m: MotifId, lit: boolean) => {
    if (!lit && !finds.includes(`motif:${m}`)) { setToast('Bu pano şu an gölgede. Saati değiştirerek ışığın düştüğü anı bul.'); return; }
    find(SITE, `motif:${m}`); setCard(m);
  };
  const sun = sunPosition(hour), phase = phaseOf(hour);

  return (
    <div className="relative h-full w-full">
      <SultanahmetScene tier={tier} hour={hour} mode={mode} onPanel={onPanel} zoomPanel={zoomPanel}
        setZoomPanel={(m) => { setZoomPanel(m); if (m) setTimeout(() => setZoomPanel(null), 50); }} onZone={setZone} />

      {/* üst bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-wrap items-start gap-2 p-3">
        <Link to="/istanbul" className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-xl bg-white/90 px-3 text-sm font-semibold shadow-card backdrop-blur hover:bg-white">
          <ArrowLeft size={18} /> Harita
        </Link>
        <div className="pointer-events-auto rounded-xl bg-white/90 px-4 py-2 shadow-card backdrop-blur">
          <h1 className="text-base font-bold leading-tight">{site.name}</h1>
          <p className="text-xs text-ink-muted">{site.researchNotes.constructionPeriod} · {site.researchNotes.architect}</p>
        </div>
        <div className="pointer-events-auto ml-auto flex gap-2">
          <span className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-white/90 px-3 text-sm font-semibold shadow-card backdrop-blur" title="Bulunan çini motifleri">🌷 {motifCount}/{MOTIFS.length}</span>
          <button onClick={() => { const m = !muted; setMuted(m); ambience.setMuted(m); }} className="grid h-11 w-11 place-items-center rounded-xl bg-white/90 shadow-card backdrop-blur hover:bg-white" aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button onClick={() => setInfo(true)} className="grid h-11 w-11 place-items-center rounded-xl bg-white/90 shadow-card backdrop-blur hover:bg-white" aria-label="Yapı bilgisi ve kaynaklar"><BookOpen size={18} /></button>
        </div>
      </header>

      {/* alt kontrol: zaman sürgüsü + mod */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-wrap items-end gap-2 p-3 pr-20">
        {mode === 'walk' && <Joystick className="pointer-events-auto mb-1 mr-2" />}
        <div className="pointer-events-auto min-w-[260px] flex-1 rounded-2xl bg-white/90 px-4 py-3 shadow-card backdrop-blur sm:max-w-md">
          <div className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold"><Sun size={16} className="text-amber-500" /> {fmt(hour)}</span>
            <span className="text-xs text-ink-muted">{phase ? PHASES.find((p) => p.id === phase)!.label + ' ışığı' : sun.elevation < 3 ? 'Güneş alçakta' : 'Gündüz'} · yükseklik {Math.max(0, Math.round(sun.elevation))}°</span>
          </div>
          <input type="range" min={6.5} max={19.5} step={0.25} value={hour} onChange={(e) => setHour(+e.target.value)}
            className="mt-2 w-full accent-[#F04448]" aria-label="Günün saati (ışığın yönü)" />
          <div className="mt-1 flex justify-between text-[10px] text-ink-muted"><span>06:30</span><span>Sabah</span><span>Öğle</span><span>İkindi</span><span>19:30</span></div>
        </div>
        {mode === 'orbit' ? (
          <button onClick={startWalk} className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-card hover:bg-brand-600">
            <Footprints size={18} /> Avluya in ve yürü
          </button>
        ) : (
          <button onClick={() => setMode('orbit')} className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-xl bg-white/90 px-4 text-sm font-semibold shadow-card backdrop-blur hover:bg-white">
            <Plane size={18} /> Kuş bakışı
          </button>
        )}
        {mode === 'walk' && azan && (
          <button onClick={() => ambience.playAzan()} className="pointer-events-auto inline-flex h-12 items-center rounded-xl bg-white/90 px-3 text-sm font-medium shadow-card backdrop-blur">Ezanı dinle</button>
        )}
      </div>

      {mode === 'walk' && zone !== 'hall' && (
        <p className="pointer-events-none absolute left-1/2 top-[4.5rem] z-20 -translate-x-1/2 rounded-xl bg-ink/80 px-4 py-2 text-center text-sm text-white">
          <span className="[@media(pointer:coarse)]:hidden">WASD ile yavaşça yürü, fareyi sürükleyerek bak. </span>
          <span className="[@media(pointer:fine)]:hidden">Joystick ile yürü, ekranı sürükleyerek bak. </span>
          Kapı tam karşında.
        </p>
      )}
      {mode === 'walk' && zone === 'hall' && motifCount === 0 && (
        <p className="pointer-events-none absolute left-1/2 top-[4.5rem] z-20 -translate-x-1/2 rounded-xl bg-ink/80 px-4 py-2 text-center text-sm text-white">Işık huzmelerinin düştüğü çini panolarına dokun. Çift dokunarak yakınlaş.</p>
      )}

      {toast && <div className="absolute left-1/2 top-[7.5rem] z-40 max-w-[90%] -translate-x-1/2 animate-fade-up rounded-xl bg-white px-4 py-2.5 text-center text-sm font-medium shadow-xl" role="status">{toast}</div>}

      {/* motif kartı (kaynak bağlantısı zorunlu) */}
      {card && (
        <aside className="absolute bottom-3 right-3 z-40 w-[340px] max-w-[calc(100%-1.5rem)] animate-fade-up rounded-2xl border border-line bg-white/95 p-5 shadow-2xl backdrop-blur sm:bottom-auto sm:top-[4.5rem]" aria-live="polite">
          <button onClick={() => setCard(null)} className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-xl text-ink-muted hover:bg-slate-100" aria-label="Kapat"><X size={18} /></button>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Çini motifi · {MOTIFS.indexOf(card) + 1}/6</p>
          <h2 className="mt-1 text-xl font-bold">{MOTIF_INFO[card].name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{MOTIF_INFO[card].text}</p>
          <a href={MOTIF_INFO[card].source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-start gap-1.5 text-xs font-medium text-brand hover:underline">
            <ExternalLink size={13} className="mt-0.5 shrink-0" /> Kaynak: {MOTIF_INFO[card].source.title}
          </a>
        </aside>
      )}

      {/* yapı bilgisi, rozet ilerlemesi ve kaynaklar */}
      {info && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-ink/40 p-3" onClick={() => setInfo(false)}>
          <article className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={site.name}>
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-xl font-bold">{site.name}</h2><p className="text-sm text-ink-muted">{site.unesco.component} · UNESCO {site.unesco.inscribed}</p></div>
              <button onClick={() => setInfo(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-slate-100" aria-label="Kapat"><X size={18} /></button>
            </div>
            <p className="mt-3 text-sm text-ink-muted">{site.summary}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted">{site.researchNotes.uniqueFeatures.map((f) => <li key={f}>{f}</li>)}</ul>
            <p className="mt-3 text-sm text-ink-muted"><b className="text-ink">Restorasyon:</b> {site.researchNotes.restorationHistory.join(' · ')}</p>
            {site.researchNotes.unverified && <p className="mt-2 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><Lightbulb size={16} className="shrink-0" /> Doğrulanamadığı için sahnede yaklaşık gösterilenler: {site.researchNotes.unverified.join(', ')}.</p>}
            <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">Rozetler</h3>
            <ul className="mt-2 space-y-1.5">{badges.map((b) => { const on = b.earned({ visited, finds: allFinds }); return (
              <li key={b.id} className={`flex items-center gap-2 text-sm ${on ? '' : 'opacity-60'}`}><span className={on ? '' : 'grayscale'}>{b.icon}</span><b>{b.name}</b><span className="text-ink-muted">— {b.desc}</span></li>); })}</ul>
            <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">Kaynaklar</h3>
            <div className="mt-2"><SourceList site={site} /></div>
          </article>
        </div>
      )}
    </div>
  );
}
