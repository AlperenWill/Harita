import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const YuzenAdaGame = lazy(() => import('../games/yuzenada/YuzenAdaGame'));

/** /oyun/yuzen-adalar — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function YuzenAdaPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Göle iniliyor…</div>}>
      <YuzenAdaGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
