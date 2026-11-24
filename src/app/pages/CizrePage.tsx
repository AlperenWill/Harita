import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const CizreGame = lazy(() => import('../games/cizre/CizreGame'));

/** /oyun/cizre — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function CizrePage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#eee4d6] text-slate-700" role="status">Cizre'ye gidiliyor…</div>}>
      <CizreGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
