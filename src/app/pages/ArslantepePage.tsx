import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const ArslantepeGame = lazy(() => import('../games/arslantepe/ArslantepeGame'));

/** /oyun/arslantepe — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function ArslantepePage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#ece2d2] text-slate-700" role="status">Malatya'ya gidiliyor…</div>}>
      <ArslantepeGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
