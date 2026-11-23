import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const KyzikosGame = lazy(() => import('../games/kyzikos/KyzikosGame'));

/** /oyun/meydanmedrese — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function KyzikosPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Kyzikos'a gidiliyor…</div>}>
      <KyzikosGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
