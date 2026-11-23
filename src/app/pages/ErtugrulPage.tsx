import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const ErtugrulGame = lazy(() => import('../games/ertugrul/ErtugrulGame'));

/** /oyun/meydanmedrese — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function ErtugrulPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Söğüt'e gidiliyor…</div>}>
      <ErtugrulGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
