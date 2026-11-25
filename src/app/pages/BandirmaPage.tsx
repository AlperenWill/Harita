import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const BandirmaGame = lazy(() => import('../games/bandirma/BandirmaGame'));

/** /oyun/bandirma — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function BandirmaPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e9e5da] text-slate-700" role="status">Bandırma Vapuru'na gidiliyor…</div>}>
      <BandirmaGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
