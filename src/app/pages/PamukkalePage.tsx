import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const PamukkaleGame = lazy(() => import('../games/pamukkale/PamukkaleGame'));

/** /oyun/pamukkale — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function PamukkalePage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#dbeef3] text-slate-700" role="status">Travertenlere çıkılıyor…</div>}>
      <PamukkaleGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
