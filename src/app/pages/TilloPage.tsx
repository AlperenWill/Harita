import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const TilloGame = lazy(() => import('../games/tillo/TilloGame'));

/** /oyun/tillo — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function TilloPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#ece4d4] text-slate-700" role="status">Tillo'ya gidiliyor…</div>}>
      <TilloGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
