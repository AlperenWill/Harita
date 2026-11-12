import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Lightbulb, MapPin } from 'lucide-react';
import { SITE_BY_ID } from '../data';
import { buildSiteQuiz } from '../lib/quiz';
import { hashStr } from '../lib/random';
import { recordSite, useProgress } from '../lib/progress';
import { QuizRunner } from '../components/QuizRunner';
import NotFound from './NotFound';

export default function SiteQuizPage() {
  const { siteId = '' } = useParams();
  const site = SITE_BY_ID.get(siteId);
  const [round, setRound] = useState(0);
  const progress = useProgress();
  const questions = useMemo(() => (site ? buildSiteQuiz(site, hashStr(site.id) + round * 7919) : []), [site, round]);
  if (!site) return <NotFound />;
  const best = progress.sites[site.id]?.best;

  return (
    <div className="animate-fade-up">
      <Link to={`/oyunlar?il=${site.city.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-brand">
        <ArrowLeft size={16} /> {site.city.name} listesine dön
      </Link>
      <header className="card mb-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="chip bg-brand-50 text-brand">{site.categoryLabel}</span>
          <span className="chip bg-slate-100 text-slate-600">{site.periodLabel}</span>
          {best !== undefined && <span className="chip bg-emerald-50 text-emerald-700">En iyi skor: {best}</span>}
        </div>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{site.name}</h1>
        <p className="mt-1 inline-flex items-center gap-1 text-sm text-ink-muted"><MapPin size={14} /> {site.district ? `${site.district}, ` : ''}{site.city.name}</p>
        <p className="mt-3 text-ink-muted">{site.summary}</p>
        <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><Lightbulb size={18} className="shrink-0" /> {site.didYouKnow}</p>
      </header>
      <QuizRunner
        key={round}
        questions={questions}
        pointsPer={20}
        onFinish={(score) => recordSite(site.id, score)}
        onRestart={() => setRound((r) => r + 1)}
        extraEnd={<Link to={`/oyunlar?il=${site.city.id}`} className="btn-ghost h-12 px-6">Diğer yerler</Link>}
      />
    </div>
  );
}
