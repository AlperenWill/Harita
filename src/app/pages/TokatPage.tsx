import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const TokatGame = lazy(() => import('../games/tokat/TokatGame'));

/** /oyun/tokat — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function TokatPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e9e5da] text-slate-700" role="status">Tokat'a gidiliyor…</div>}>
      <TokatGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
