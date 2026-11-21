import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const IshakPasaGame = lazy(() => import('../games/ishakpasa/IshakPasaGame'));

/** /oyun/ishakpasa — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function IshakPasaPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e8ec] text-slate-700" role="status">Saraya çıkılıyor…</div>}>
      <IshakPasaGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
