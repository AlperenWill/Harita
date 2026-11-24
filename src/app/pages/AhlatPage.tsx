import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const AhlatGame = lazy(() => import('../games/ahlat/AhlatGame'));

/** /oyun/ahlat — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function AhlatPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e9e4d6] text-slate-700" role="status">Ahlat'a gidiliyor…</div>}>
      <AhlatGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
