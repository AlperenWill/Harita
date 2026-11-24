import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const MamaHatunGame = lazy(() => import('../games/mamahatun/MamaHatunGame'));

/** /oyun/mama-hatun — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function MamaHatunPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#ebe6da] text-slate-700" role="status">Tercan'a gidiliyor…</div>}>
      <MamaHatunGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
