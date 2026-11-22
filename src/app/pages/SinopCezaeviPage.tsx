import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const SinopCezaeviGame = lazy(() => import('../games/sinopcezaevi/SinopCezaeviGame'));

/** /oyun/sinop-cezaevi — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function SinopCezaeviPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Sinop'a gidiliyor…</div>}>
      <SinopCezaeviGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
