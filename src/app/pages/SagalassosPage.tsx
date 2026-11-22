import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const SagalassosGame = lazy(() => import('../games/sagalassos/SagalassosGame'));

/** /oyun/sagalassos — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function SagalassosPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Kente çıkılıyor…</div>}>
      <SagalassosGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
