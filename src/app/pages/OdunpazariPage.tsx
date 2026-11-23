import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const OdunpazariGame = lazy(() => import('../games/odunpazari/OdunpazariGame'));

/** /oyun/odunpazari — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function OdunpazariPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Odunpazarı'na gidiliyor…</div>}>
      <OdunpazariGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
