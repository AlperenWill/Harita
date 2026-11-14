import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const MaidensTowerGame = lazy(() => import('../games/kiz-kulesi/MaidensTowerGame'));

/** /oyun/kiz-kulesi — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function KizKulesiPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#bcd6e6] text-ink/70" role="status">Vapur hazırlanıyor…</div>}>
      <MaidensTowerGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
