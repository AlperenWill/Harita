import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FlaskConical, Gamepad2 } from 'lucide-react';
import { GameLauncher } from '../../games/core/GameLauncher';
import { GAME_BY_ID } from '../../games/core/registry';
import { useProgress } from '../../games/core/progress';
import type { GameDefinition } from '../../games/core/types';
import { SiteIcon } from '../istanbul/SiteIcon';
import NotFound from './NotFound';

/** /istanbul/:id → o yapının bağımsız oyunu (GameLauncher dinamik import eder) ya da araştırma dosyası */
export default function IstanbulSitePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const def = GAME_BY_ID[id];
  const visit = useProgress((s) => s.visit);
  const [shown, setShown] = useState(false);
  useEffect(() => { if (def) visit(def.id); const t = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(t); }, [def, visit]);
  if (!def) return <div className="p-6"><NotFound /></div>;
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-ink">
      <GameLauncher id={def.id} onExit={() => navigate('/istanbul')} research={ResearchCard} />
      {/* haritadan gelen kararmanın devamı */}
      <div className={`pointer-events-none absolute inset-0 z-[60] bg-ink transition-opacity duration-700 ${shown ? 'opacity-0' : 'opacity-100'}`} aria-hidden />
    </div>
  );
}

export function SourceList({ def }: { def: GameDefinition }) {
  return (
    <ul className="space-y-1.5">
      {def.sources.map((s) => (
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

const CAMERA_LABEL: Record<string, string> = {
  'third-person-tracking': 'Üçüncü şahıs takip', 'locked-orbit': 'Kilitli yörünge', 'first-person-walkthrough': 'Birinci şahıs, noktadan noktaya',
  'static-wide-pan': 'Sabit geniş açı + kaydırma', 'underwater-drift': 'Su altında yavaş süzülme', 'cinematic-path': 'Sinematik rota',
};

/** Araştırması bitmiş, oyun modülü henüz yazılmamış yapı: oyun tasarımı (game.json) ve kaynaklar */
function ResearchCard({ id }: { id: string }) {
  const def = GAME_BY_ID[id], r = def.research, t = def.transformation;
  return (
    <div className="h-full overflow-y-auto bg-canvas p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/istanbul" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-brand"><ArrowLeft size={16} /> İstanbul haritası</Link>
        <article className="card p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand"><SiteIcon kind={def.kind} size={22} /></span>
            <div>
              <h1 className="text-2xl font-bold">{def.name}</h1>
              <p className="text-sm text-ink-muted">{def.district} · {def.unesco.component}</p>
            </div>
          </div>
          <p className="mt-4 text-ink-muted">{def.summary}</p>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold">Yapım</dt><dd className="text-ink-muted">{r.constructionPeriod}</dd></div>
            <div><dt className="font-semibold">Mimar</dt><dd className="text-ink-muted">{r.architect}</dd></div>
            <div className="sm:col-span-2"><dt className="font-semibold">Öne çıkanlar</dt><dd className="text-ink-muted">{r.uniqueFeatures.join(' · ')}</dd></div>
            <div className="sm:col-span-2"><dt className="font-semibold">Restorasyon</dt><dd className="text-ink-muted">{r.restorationHistory.join(' · ')}</dd></div>
          </dl>
          <div className="mt-6 rounded-xl border border-dashed border-brand/40 bg-brand-50/50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand"><FlaskConical size={16} /> Oyun tasarlandı, kodu yazılıyor</p>
            <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2"><dt className="font-semibold"><Gamepad2 size={14} className="mr-1 inline" />{t.mechanic}</dt><dd className="text-ink-muted">Çıkış noktası: {t.uniqueFeature}</dd></div>
              <div><dt className="font-semibold">Kazanma</dt><dd className="text-ink-muted">{t.winCondition}</dd></div>
              <div><dt className="font-semibold">Kamera</dt><dd className="text-ink-muted">{CAMERA_LABEL[t.camera.preset]} — {t.camera.notes}</dd></div>
              <div><dt className="font-semibold">Hedef duygu</dt><dd className="text-ink-muted">{t.targetEmotion}</dd></div>
              <div><dt className="font-semibold">Bütçe</dt><dd className="text-ink-muted">≤ {def.budget.maxAssetMB} MB · ≥ {def.budget.targetFps} FPS</dd></div>
            </dl>
          </div>
          {r.unverified?.length ? <p className="mt-4 text-xs text-amber-700">Doğrulanamayanlar: {r.unverified.join(' · ')}</p> : null}
          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink-muted">Kaynaklar</h2>
          <div className="mt-2"><SourceList def={def} /></div>
        </article>
      </div>
    </div>
  );
}
