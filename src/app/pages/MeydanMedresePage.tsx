import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const MeydanMedreseGame = lazy(() => import('../games/meydanmedrese/MeydanMedreseGame'));

/** /oyun/meydanmedrese — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function MeydanMedresePage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Meydan Medresesi'ne gidiliyor…</div>}>
      <MeydanMedreseGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
