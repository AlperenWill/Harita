import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const AniGame = lazy(() => import('../games/ani/AniGame'));

/** /oyun/ani — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function AniPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#dfe6ea] text-slate-700" role="status">Ani’ye varılıyor…</div>}>
      <AniGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
