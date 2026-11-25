import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const KonuralpGame = lazy(() => import('../games/konuralp/KonuralpGame'));

/** /oyun/konuralp — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function KonuralpPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e9e5da] text-slate-700" role="status">Prusias ad Hypium’a gidiliyor…</div>}>
      <KonuralpGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
