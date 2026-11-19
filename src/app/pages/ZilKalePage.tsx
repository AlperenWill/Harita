import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const ZilKaleGame = lazy(() => import('../games/zilkale/ZilKaleGame'));

/** /oyun/zilkale — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function ZilKalePage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#b7c2c3] text-slate-700" role="status">Vadiye sis çöküyor…</div>}>
      <ZilKaleGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
