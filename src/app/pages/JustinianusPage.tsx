import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const JustinianusGame = lazy(() => import('../games/justinianus/JustinianusGame'));

/** /oyun/meydanmedrese — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function JustinianusPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Beşköprü'ye gidiliyor…</div>}>
      <JustinianusGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
