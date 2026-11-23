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
const CumalikizikPage = lazy(() => import('./pages/CumalikizikPage'));
const BayburtPage = lazy(() => import('./pages/BayburtPage'));
const SeytanPage = lazy(() => import('./pages/SeytanPage'));
const MunzurPage = lazy(() => import('./pages/MunzurPage'));
const YuzenAdaPage = lazy(() => import('./pages/YuzenAdaPage'));
const SumelaPage = lazy(() => import('./pages/SumelaPage'));
const TrabzonAyasofyaPage = lazy(() => import('./pages/TrabzonAyasofyaPage'));
const SagalassosPage = lazy(() => import('./pages/SagalassosPage'));
const CacabeyPage = lazy(() => import('./pages/CacabeyPage'));
const MahmutbeyPage = lazy(() => import('./pages/MahmutbeyPage'));
const SinopCezaeviPage = lazy(() => import('./pages/SinopCezaeviPage'));
const ZeugmaPage = lazy(() => import('./pages/ZeugmaPage'));
const KerkenesPage = lazy(() => import('./pages/KerkenesPage'));
const OdunpazariPage = lazy(() => import('./pages/OdunpazariPage'));
const GiresunPage = lazy(() => import('./pages/GiresunPage'));
const MeydanMedresePage = lazy(() => import('./pages/MeydanMedresePage'));
const AdadaPage = lazy(() => import('./pages/AdadaPage'));
const GaziantepKalePage = lazy(() => import('./pages/GaziantepKalePage'));
const KyzikosPage = lazy(() => import('./pages/KyzikosPage'));
const SekaPage = lazy(() => import('./pages/SekaPage'));
const JustinianusPage = lazy(() => import('./pages/JustinianusPage'));
const TroyaPage = lazy(() => import('./pages/TroyaPage'));
const AniPage = lazy(() => import('./pages/AniPage'));
const IshakPasaPage = lazy(() => import('./pages/IshakPasaPage'));
const AkdamarPage = lazy(() => import('./pages/AkdamarPage'));
const HattusaPage = lazy(() => import('./pages/HattusaPage'));

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
          <Route path="oyun/cumalikizik" element={<CumalikizikPage />} />
          <Route path="oyun/bayburt" element={<BayburtPage />} />
          <Route path="oyun/seytan-kalesi" element={<SeytanPage />} />
          <Route path="oyun/munzur" element={<MunzurPage />} />
          <Route path="oyun/yuzen-adalar" element={<YuzenAdaPage />} />
          <Route path="oyun/sumela" element={<SumelaPage />} />
          <Route path="oyun/trabzon-ayasofya" element={<TrabzonAyasofyaPage />} />
          <Route path="oyun/sagalassos" element={<SagalassosPage />} />
          <Route path="oyun/cacabey" element={<CacabeyPage />} />
          <Route path="oyun/mahmutbey" element={<MahmutbeyPage />} />
          <Route path="oyun/sinop-cezaevi" element={<SinopCezaeviPage />} />
          <Route path="oyun/zeugma" element={<ZeugmaPage />} />
          <Route path="oyun/kerkenes" element={<KerkenesPage />} />
          <Route path="oyun/odunpazari" element={<OdunpazariPage />} />
          <Route path="oyun/giresun" element={<GiresunPage />} />
          <Route path="oyun/meydan-medrese" element={<MeydanMedresePage />} />
          <Route path="oyun/adada" element={<AdadaPage />} />
          <Route path="oyun/gaziantep-kalesi" element={<GaziantepKalePage />} />
          <Route path="oyun/kyzikos" element={<KyzikosPage />} />
          <Route path="oyun/seka" element={<SekaPage />} />
          <Route path="oyun/justinianus" element={<JustinianusPage />} />
          <Route path="oyun/troya" element={<TroyaPage />} />
          <Route path="oyun/ani" element={<AniPage />} />
          <Route path="oyun/ishakpasa" element={<IshakPasaPage />} />
          <Route path="oyun/akdamar" element={<AkdamarPage />} />
          <Route path="oyun/hattusa" element={<HattusaPage />} />
          <Route path="kaynakca" element={<SourcesPage />} />
          <Route path="ayarlar" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
