import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const AmasraGame = lazy(() => import('../games/amasra/AmasraGame'));

/** /oyun/amasra — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function AmasraPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e9e5da] text-slate-700" role="status">Amasra'ya gidiliyor…</div>}>
      <AmasraGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
