import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const HarputGame = lazy(() => import('../games/harput/HarputGame'));

/** /oyun/harput — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function HarputPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e8e4d8] text-slate-700" role="status">Harput'a gidiliyor…</div>}>
      <HarputGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
