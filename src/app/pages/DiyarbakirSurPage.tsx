import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const DiyarbakirSurGame = lazy(() => import('../games/diyarbakirsur/DiyarbakirSurGame'));

/** /oyun/diyarbakir-sur — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function DiyarbakirSurPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e6e2d8] text-slate-700" role="status">Diyarbakır'a gidiliyor…</div>}>
      <DiyarbakirSurGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
