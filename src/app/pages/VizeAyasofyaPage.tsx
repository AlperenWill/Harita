import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const VizeAyasofyaGame = lazy(() => import('../games/vizeayasofya/VizeAyasofyaGame'));

/** /oyun/meydanmedrese — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function VizeAyasofyaPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#e3e6e4] text-slate-700" role="status">Vize'ye gidiliyor…</div>}>
      <VizeAyasofyaGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
