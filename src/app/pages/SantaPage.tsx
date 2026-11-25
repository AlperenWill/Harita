import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const SantaGame = lazy(() => import('../games/santa/SantaGame'));

/** /oyun/santa — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function SantaPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e9e5da] text-slate-700" role="status">Santa Harabeleri'ne gidiliyor…</div>}>
      <SantaGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
