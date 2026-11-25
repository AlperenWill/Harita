import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const YasonGame = lazy(() => import('../games/yason/YasonGame'));

/** /oyun/yason — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function YasonPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e9e5da] text-slate-700" role="status">Yason Burnu'na gidiliyor…</div>}>
      <YasonGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
