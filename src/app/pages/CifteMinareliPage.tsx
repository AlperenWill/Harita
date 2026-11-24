import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const CifteMinareliGame = lazy(() => import('../games/ciftemin/CifteMinareliGame'));

/** /oyun/cifte-minareli — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function CifteMinareliPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e6e6e2] text-slate-700" role="status">Erzurum'a gidiliyor…</div>}>
      <CifteMinareliGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
