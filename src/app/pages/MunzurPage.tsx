import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const MunzurGame = lazy(() => import('../games/munzur/MunzurGame'));

/** /oyun/munzur — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function MunzurPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Vadiye gidiliyor…</div>}>
      <MunzurGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
