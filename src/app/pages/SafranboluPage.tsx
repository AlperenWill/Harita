import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const SafranboluGame = lazy(() => import('../games/safranbolu/SafranboluGame'));

/** /oyun/safranbolu — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function SafranboluPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e9e5da] text-slate-700" role="status">Safranbolu'ya gidiliyor…</div>}>
      <SafranboluGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
