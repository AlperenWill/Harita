import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const TopkapiGame = lazy(() => import('../games/topkapi/TopkapiGame'));

/** /oyun/topkapi — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function TopkapiPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#120d09] text-white/70" role="status">Saray kapısı açılıyor…</div>}>
      <TopkapiGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
