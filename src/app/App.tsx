import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import GamesPage from './pages/GamesPage';
import SourcesPage from './pages/SourcesPage';
import SettingsPage from './pages/SettingsPage';
import NotFound from './pages/NotFound';

// Ağır sayfalar ayrı paketlere bölünür (Leaflet yalnızca harita açılınca iner)
const MapPage = lazy(() => import('./pages/MapPage'));
const SiteQuizPage = lazy(() => import('./pages/SiteQuizPage'));
const TestPage = lazy(() => import('./pages/TestPage'));

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
          <Route path="oyunlar" element={<GamesPage />} />
          <Route path="oyun/:siteId" element={<SiteQuizPage />} />
          <Route path="test" element={<TestPage />} />
          <Route path="kaynakca" element={<SourcesPage />} />
          <Route path="ayarlar" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
