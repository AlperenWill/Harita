import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const MudurnuGame = lazy(() => import('../games/mudurnu/MudurnuGame'));

/** /oyun/mudurnu — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function MudurnuPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e9e5da] text-slate-700" role="status">Mudurnu Çarşısı’na gidiliyor…</div>}>
      <MudurnuGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
