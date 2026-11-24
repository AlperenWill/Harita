import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const MardinGame = lazy(() => import('../games/mardin/MardinGame'));

/** /oyun/mardin — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function MardinPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#efe6d4] text-slate-700" role="status">Mardin'e gidiliyor…</div>}>
      <MardinGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
