import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const IshanGame = lazy(() => import('../games/ishan/IshanGame'));

/** /oyun/ishan — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function IshanPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e9e5da] text-slate-700" role="status">İşhan'a gidiliyor…</div>}>
      <IshanGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
