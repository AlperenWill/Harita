import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const RakocziGame = lazy(() => import('../games/rakoczi/RakocziGame'));

/** /oyun/meydanmedrese — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function RakocziPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Rodosto'ya gidiliyor…</div>}>
      <RakocziGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
