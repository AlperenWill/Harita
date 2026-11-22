import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const CumalikizikGame = lazy(() => import('../games/cumalikizik/CumalikizikGame'));

/** /oyun/cumalikizik — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function CumalikizikPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#dfe8ec] text-slate-700" role="status">Köye giriliyor…</div>}>
      <CumalikizikGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
