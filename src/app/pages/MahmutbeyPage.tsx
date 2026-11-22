import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const MahmutbeyGame = lazy(() => import('../games/mahmutbey/MahmutbeyGame'));

/** /oyun/mahmutbey — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function MahmutbeyPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Köye gidiliyor…</div>}>
      <MahmutbeyGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
