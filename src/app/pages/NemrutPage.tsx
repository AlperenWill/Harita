import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const NemrutGame = lazy(() => import('../games/nemrut/NemrutGame'));

/** /oyun/nemrut — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function NemrutPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#05070d] text-white/70" role="status">Zirveye çıkılıyor…</div>}>
      <NemrutGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
