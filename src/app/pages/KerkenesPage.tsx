import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const KerkenesGame = lazy(() => import('../games/kerkenes/KerkenesGame'));

/** /oyun/kerkenes — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function KerkenesPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Kerkenes'e gidiliyor…</div>}>
      <KerkenesGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
