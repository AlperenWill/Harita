import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const SeytanGame = lazy(() => import('../games/seytan/SeytanGame'));

/** /oyun/seytan-kalesi — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function SeytanPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Kanyona gidiliyor…</div>}>
      <SeytanGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
