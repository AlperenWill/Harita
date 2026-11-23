import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const SekaGame = lazy(() => import('../games/seka/SekaGame'));

/** /oyun/meydanmedrese — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function SekaPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">SEKA fabrikasına gidiliyor…</div>}>
      <SekaGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
