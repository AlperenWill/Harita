import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const AmasyaGame = lazy(() => import('../games/amasya/AmasyaGame'));

/** /oyun/amasya — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function AmasyaPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e9e5da] text-slate-700" role="status">Amasya'ya gidiliyor…</div>}>
      <AmasyaGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
