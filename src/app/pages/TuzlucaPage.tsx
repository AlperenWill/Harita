import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const TuzlucaGame = lazy(() => import('../games/tuzluca/TuzlucaGame'));

/** /oyun/tuzluca — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function TuzlucaPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e9e5da] text-slate-700" role="status">Tuzluca Tuz Mağaraları'na gidiliyor…</div>}>
      <TuzlucaGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
