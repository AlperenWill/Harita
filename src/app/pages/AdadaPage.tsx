import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const AdadaGame = lazy(() => import('../games/adada/AdadaGame'));

/** /oyun/meydanmedrese — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function AdadaPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Adada'ya gidiliyor…</div>}>
      <AdadaGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
