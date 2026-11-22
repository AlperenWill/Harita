import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const BayburtGame = lazy(() => import('../games/bayburt/BayburtGame'));

/** /oyun/bayburt — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function BayburtPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Kaleye çıkılıyor…</div>}>
      <BayburtGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
