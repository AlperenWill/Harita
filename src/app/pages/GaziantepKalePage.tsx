import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const GaziantepKaleGame = lazy(() => import('../games/gaziantepkale/GaziantepKaleGame'));

/** /oyun/meydanmedrese — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function GaziantepKalePage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Gaziantep Kalesi'ne gidiliyor…</div>}>
      <GaziantepKaleGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
