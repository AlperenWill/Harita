import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const GalataTowerGame = lazy(() => import('../games/galata/GalataTowerGame'));

/** /oyun/galata-kulesi — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function GalataPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-black text-white/70" role="status">Galata Kulesi hazırlanıyor…</div>}>
      <GalataTowerGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
