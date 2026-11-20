import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const EfesGame = lazy(() => import('../games/efes/EfesGame'));

/** /oyun/efes — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function EfesPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#cfe3ee] text-slate-700" role="status">Antik kente iniliyor…</div>}>
      <EfesGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
