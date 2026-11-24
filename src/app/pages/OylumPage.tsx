import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const OylumGame = lazy(() => import('../games/oylum/OylumGame'));

/** /oyun/oylum — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function OylumPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#ece4d2] text-slate-700" role="status">Kilis'e gidiliyor…</div>}>
      <OylumGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
