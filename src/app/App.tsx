import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import SourcesPage from './pages/SourcesPage';
import SettingsPage from './pages/SettingsPage';
import NotFound from './pages/NotFound';

const MapPage = lazy(() => import('./pages/MapPage'));
const MonumentPage = lazy(() => import('./pages/MonumentPage'));
const GalataPage = lazy(() => import('./pages/GalataPage'));
const KizKulesiPage = lazy(() => import('./pages/KizKulesiPage'));
const YerebatanPage = lazy(() => import('./pages/YerebatanPage'));
const AyasofyaPage = lazy(() => import('./pages/AyasofyaPage'));
const TopkapiPage = lazy(() => import('./pages/TopkapiPage'));
const NemrutPage = lazy(() => import('./pages/NemrutPage'));
const KapalicarsiPage = lazy(() => import('./pages/KapalicarsiPage'));
const DolmabahcePage = lazy(() => import('./pages/DolmabahcePage'));
const ZilKalePage = lazy(() => import('./pages/ZilKalePage'));
const EfesPage = lazy(() => import('./pages/EfesPage'));
const KapadokyaPage = lazy(() => import('./pages/KapadokyaPage'));
const PamukkalePage = lazy(() => import('./pages/PamukkalePage'));

const Loading = () => (
  <div className="grid min-h-[50vh] place-items-center text-ink-muted" role="status">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="harita" element={<MapPage />} />
          <Route path="anit/:id" element={<MonumentPage />} />
          <Route path="oyun/galata-kulesi" element={<GalataPage />} />
          <Route path="oyun/kiz-kulesi" element={<KizKulesiPage />} />
          <Route path="oyun/yerebatan" element={<YerebatanPage />} />
          <Route path="oyun/ayasofya" element={<AyasofyaPage />} />
          <Route path="oyun/topkapi" element={<TopkapiPage />} />
          <Route path="oyun/nemrut" element={<NemrutPage />} />
          <Route path="oyun/kapalicarsi" element={<KapalicarsiPage />} />
          <Route path="oyun/dolmabahce" element={<DolmabahcePage />} />
          <Route path="oyun/zilkale" element={<ZilKalePage />} />
          <Route path="oyun/efes" element={<EfesPage />} />
          <Route path="oyun/kapadokya" element={<KapadokyaPage />} />
          <Route path="oyun/pamukkale" element={<PamukkalePage />} />
          <Route path="kaynakca" element={<SourcesPage />} />
          <Route path="ayarlar" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
