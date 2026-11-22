import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const SumelaGame = lazy(() => import('../games/sumela/SumelaGame'));

/** /oyun/sumela — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function SumelaPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Manastıra gidiliyor…</div>}>
      <SumelaGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
