import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const HattusaGame = lazy(() => import('../games/hattusa/HattusaGame'));

/** /oyun/hattusa — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function HattusaPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#d9c9a8] text-slate-700" role="status">Hitit başkentine yol alınıyor…</div>}>
      <HattusaGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
