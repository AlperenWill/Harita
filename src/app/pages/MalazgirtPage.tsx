import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const MalazgirtGame = lazy(() => import('../games/malazgirt/MalazgirtGame'));

/** /oyun/malazgirt — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function MalazgirtPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e9e5da] text-slate-700" role="status">Malazgirt'a gidiliyor…</div>}>
      <MalazgirtGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
