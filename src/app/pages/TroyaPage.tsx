import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const TroyaGame = lazy(() => import('../games/troya/TroyaGame'));

/** /oyun/troya — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function TroyaPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#dfe7ec] text-slate-700" role="status">Höyüğe çıkılıyor…</div>}>
      <TroyaGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
