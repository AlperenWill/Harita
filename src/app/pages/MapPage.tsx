/**
 * Ana harita: mevcut 3D Anadolu Mirası haritası (/3d/) sayfaya gömülür.
 * 3D harita ayrı bir giriş noktasıdır (kendi CSS'i ve WebGL sahnesi), bu yüzden iframe ile
 * yalıtılır; sidebar ve AI asistan çevresinde çalışmaya devam eder.
 */
export default function MapPage() {
  return (
    <div className="h-[calc(100dvh-3.5rem)] w-full bg-[#191512] lg:h-[100dvh]">
      <iframe
        src={`${import.meta.env.BASE_URL}3d/`}
        title="Miras. Haritası"
        className="block h-full w-full border-0"
        allow="fullscreen; autoplay"
        allowFullScreen
      />
    </div>
  );
}
