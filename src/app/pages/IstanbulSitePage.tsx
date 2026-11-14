import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FlaskConical } from 'lucide-react';
import { SITE_BY_ID } from '../istanbul/sites';
import { useJournal } from '../istanbul/store';
import { LandscapeGate } from '../istanbul/LandscapeGate';
import { SiteIcon } from '../istanbul/IstanbulMap';
import type { IstanbulSite } from '../istanbul/types';
import NotFound from './NotFound';

/** Hazır 3D deneyimler: yapı kimliği → tembel yüklenen deneyim (yeni yapı = yeni satır) */
const EXPERIENCES: Record<string, ReturnType<typeof lazy>> = {
  'sultanahmet-camii': lazy(() => import('../istanbul/sultanahmet/SultanahmetExperience')),
};

export default function IstanbulSitePage() {
  const { id = '' } = useParams();
  const site = SITE_BY_ID[id];
  const visit = useJournal((s) => s.visit);
  const [shown, setShown] = useState(false);
  useEffect(() => { if (site) visit(site.id); const t = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(t); }, [site, visit]);
  if (!site) return <div className="p-6"><NotFound /></div>;
  const Exp = EXPERIENCES[site.id];
  return (
    <div className="relative h-[calc(100dvh-3.5rem)] w-full overflow-hidden bg-ink lg:h-[100dvh]">
      {Exp ? (
        <Suspense fallback={<div className="grid h-full place-items-center text-white/70" role="status">{site.name} hazırlanıyor…</div>}>
          <Exp />
        </Suspense>
      ) : <ResearchCard site={site} />}
      {/* haritadan gelen kararmanın devamı: deneyim yavaşça belirir */}
      <div className={`pointer-events-none absolute inset-0 z-[60] bg-ink transition-opacity duration-700 ${shown ? 'opacity-0' : 'opacity-100'}`} aria-hidden />
      <LandscapeGate />
    </div>
  );
}

export function SourceList({ site }: { site: IstanbulSite }) {
  return (
    <ul className="space-y-1.5">
      {site.sources.map((s) => (
        <li key={s.url}>
          <a href={s.url} target="_blank" rel="noreferrer" className="group flex items-start gap-2 text-sm text-ink hover:text-brand">
            <ExternalLink size={14} className="mt-0.5 shrink-0 text-ink-muted group-hover:text-brand" />
            <span>{s.title} <span className="text-xs text-ink-muted">· {s.type}</span></span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Araştırması tamamlanmış ama 3D deneyimi henüz yapılmamış yapı */
function ResearchCard({ site }: { site: IstanbulSite }) {
  const r = site.researchNotes;
  return (
    <div className="h-full overflow-y-auto bg-canvas p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/istanbul" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-brand"><ArrowLeft size={16} /> İstanbul haritası</Link>
        <article className="card p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand"><SiteIcon kind={site.kind} size={22} /></span>
            <div>
              <h1 className="text-2xl font-bold">{site.name}</h1>
              <p className="text-sm text-ink-muted">{site.district} · {site.unesco.component}</p>
            </div>
          </div>
          <p className="mt-4 text-ink-muted">{site.summary}</p>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold">Yapım</dt><dd className="text-ink-muted">{r.constructionPeriod ?? r.constructionYear}</dd></div>
            <div><dt className="font-semibold">Mimar</dt><dd className="text-ink-muted">{r.architect}</dd></div>
            <div className="sm:col-span-2"><dt className="font-semibold">Öne çıkanlar</dt><dd className="text-ink-muted">{r.uniqueFeatures.join(' · ')}</dd></div>
            <div className="sm:col-span-2"><dt className="font-semibold">Restorasyon</dt><dd className="text-ink-muted">{r.restorationHistory.join(' · ')}</dd></div>
          </dl>
          <div className="mt-6 rounded-xl border border-dashed border-brand/40 bg-brand-50/50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand"><FlaskConical size={16} /> 3D deneyim hazırlanıyor</p>
            <p className="mt-1 text-sm text-ink-muted"><b>{site.gameConcept.coreMechanic}.</b> Hedef duygu: {site.gameConcept.targetEmotion.toLocaleLowerCase('tr')}.</p>
          </div>
          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink-muted">Kaynaklar</h2>
          <div className="mt-2"><SourceList site={site} /></div>
        </article>
      </div>
    </div>
  );
}
