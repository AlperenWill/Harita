import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const ZeugmaGame = lazy(() => import('../games/zeugma/ZeugmaGame'));

/** /oyun/zeugma — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function ZeugmaPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Zeugma'ya gidiliyor…</div>}>
      <ZeugmaGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
