import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const HasankeyfGame = lazy(() => import('../games/hasankeyf/HasankeyfGame'));

/** /oyun/hasankeyf — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function HasankeyfPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e8e2d4] text-slate-700" role="status">Hasankeyf'e gidiliyor…</div>}>
      <HasankeyfGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
