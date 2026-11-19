import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const DolmabahceGame = lazy(() => import('../games/dolmabahce/DolmabahceGame'));

/** /oyun/dolmabahce — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function DolmabahcePage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#120d08] text-white/70" role="status">Saray kapısı açılıyor…</div>}>
      <DolmabahceGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
