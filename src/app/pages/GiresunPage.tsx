import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const GiresunGame = lazy(() => import('../games/giresun/GiresunGame'));

/** /oyun/giresun — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function GiresunPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Giresun Adası'na gidiliyor…</div>}>
      <GiresunGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
