import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const AkdamarGame = lazy(() => import('../games/akdamar/AkdamarGame'));

/** /oyun/akdamar — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function AkdamarPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#dce8f0] text-slate-700" role="status">İskeleye iniliyor…</div>}>
      <AkdamarGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
