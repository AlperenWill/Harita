import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const HagiaSophiaGame = lazy(() => import('../games/ayasofya/HagiaSophiaGame'));

/** /oyun/ayasofya — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function AyasofyaPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#0d0906] text-white/70" role="status">Ayasofya hazırlanıyor…</div>}>
      <HagiaSophiaGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
