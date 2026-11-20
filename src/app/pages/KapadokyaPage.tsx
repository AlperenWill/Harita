import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const BalloonGame = lazy(() => import('../games/kapadokya/BalloonGame'));

/** /oyun/kapadokya — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function KapadokyaPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#f3c9a0] text-slate-700" role="status">Balon şişiriliyor…</div>}>
      <BalloonGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
