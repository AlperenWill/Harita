import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const CisternGame = lazy(() => import('../games/yerebatan/CisternGame'));

/** /oyun/yerebatan — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function YerebatanPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#140b07] text-white/70" role="status">Sarnıca iniliyor…</div>}>
      <CisternGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
