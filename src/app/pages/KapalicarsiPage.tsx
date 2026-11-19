import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const BazaarGame = lazy(() => import('../games/kapalicarsi/BazaarGame'));

/** /oyun/kapalicarsi — bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir */
export default function KapalicarsiPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-[#140e08] text-white/70" role="status">Çarşı kapıları açılıyor…</div>}>
      <BazaarGame onExit={() => navigate('/harita')} />
    </Suspense>
  );
}
