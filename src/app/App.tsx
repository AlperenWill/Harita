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
const DiyarbakirSurPage = lazy(() => import('./pages/DiyarbakirSurPage'));
const MardinPage = lazy(() => import('./pages/MardinPage'));
const HasankeyfPage = lazy(() => import('./pages/HasankeyfPage'));
const TilloPage = lazy(() => import('./pages/TilloPage'));
const CizrePage = lazy(() => import('./pages/CizrePage'));
const OylumPage = lazy(() => import('./pages/OylumPage'));
const ArslantepePage = lazy(() => import('./pages/ArslantepePage'));
const AhlatPage = lazy(() => import('./pages/AhlatPage'));
const CifteMinareliPage = lazy(() => import('./pages/CifteMinareliPage'));
const MamaHatunPage = lazy(() => import('./pages/MamaHatunPage'));
const HarputPage = lazy(() => import('./pages/HarputPage'));
const MalazgirtPage = lazy(() => import('./pages/MalazgirtPage'));
const TuzlucaPage = lazy(() => import('./pages/TuzlucaPage'));
const AmasyaPage = lazy(() => import('./pages/AmasyaPage'));
const SafranboluPage = lazy(() => import('./pages/SafranboluPage'));
const TokatPage = lazy(() => import('./pages/TokatPage'));
const AmasraPage = lazy(() => import('./pages/AmasraPage'));
const BandirmaPage = lazy(() => import('./pages/BandirmaPage'));
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
const ErtugrulPage = lazy(() => import('./pages/ErtugrulPage'));
const SelimiyePage = lazy(() => import('./pages/SelimiyePage'));
const VizeAyasofyaPage = lazy(() => import('./pages/VizeAyasofyaPage'));
const RakocziPage = lazy(() => import('./pages/RakocziPage'));
const YalovaKoskPage = lazy(() => import('./pages/YalovaKoskPage'));
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
          <Route path="oyun/diyarbakir-sur" element={<DiyarbakirSurPage />} />
          <Route path="oyun/mardin" element={<MardinPage />} />
          <Route path="oyun/hasankeyf" element={<HasankeyfPage />} />
          <Route path="oyun/tillo" element={<TilloPage />} />
          <Route path="oyun/cizre" element={<CizrePage />} />
          <Route path="oyun/oylum" element={<OylumPage />} />
          <Route path="oyun/arslantepe" element={<ArslantepePage />} />
          <Route path="oyun/ahlat" element={<AhlatPage />} />
          <Route path="oyun/cifte-minareli" element={<CifteMinareliPage />} />
          <Route path="oyun/mama-hatun" element={<MamaHatunPage />} />
          <Route path="oyun/harput" element={<HarputPage />} />
          <Route path="oyun/malazgirt" element={<MalazgirtPage />} />
          <Route path="oyun/tuzluca" element={<TuzlucaPage />} />
          <Route path="oyun/amasya" element={<AmasyaPage />} />
          <Route path="oyun/safranbolu" element={<SafranboluPage />} />
          <Route path="oyun/tokat" element={<TokatPage />} />
          <Route path="oyun/amasra" element={<AmasraPage />} />
          <Route path="oyun/bandirma" element={<BandirmaPage />} />
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
          <Route path="oyun/ertugrul" element={<ErtugrulPage />} />
          <Route path="oyun/selimiye" element={<SelimiyePage />} />
          <Route path="oyun/vize-ayasofya" element={<VizeAyasofyaPage />} />
          <Route path="oyun/rakoczi" element={<RakocziPage />} />
          <Route path="oyun/yalova-kosk" element={<YalovaKoskPage />} />
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
