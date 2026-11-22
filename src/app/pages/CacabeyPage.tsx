import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const CacabeyGame = lazy(() => import('../games/cacabey/CacabeyGame'));

/** /oyun/cacabey — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function CacabeyPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Medreseye gidiliyor…</div>}>
      <CacabeyGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
