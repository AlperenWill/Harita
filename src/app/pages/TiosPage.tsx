import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const TiosGame = lazy(() => import('../games/tios/TiosGame'));

/** /oyun/tios — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function TiosPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e9e5da] text-slate-700" role="status">Tios’a gidiliyor…</div>}>
      <TiosGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
