import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const TrabzonAyasofyaGame = lazy(() => import('../games/trabzonayasofya/TrabzonAyasofyaGame'));

/** /oyun/trabzon-ayasofya — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function TrabzonAyasofyaPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Bahçeye giriliyor…</div>}>
      <TrabzonAyasofyaGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
