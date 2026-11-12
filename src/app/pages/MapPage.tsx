import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { feature } from 'topojson-client';
import type { FeatureCollection } from 'geojson';
import { LogOut, Search } from 'lucide-react';
import { CITIES, norm, gameCount, type City } from '../data';

const pin = (c: City, active: boolean) =>
  L.divIcon({
    className: 'city-pin',
    iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -12],
    html: `<div style="width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font:700 11px Inter,sans-serif;color:#fff;background:${active ? '#B9252A' : '#F04448'};border:2px solid #fff;box-shadow:0 2px 8px rgba(15,23,42,.3)">${String(c.plate).padStart(2, '0')}</div>`,
  });

// GeoJSON'daki adlar → uygulamadaki görünen adlar
const GEO_NAME: Record<string, string> = { Afyon: 'Afyonkarahisar', Hakkari: 'Hakkâri' };

function FlyTo({ city }: { city?: City }) {
  const map = useMap();
  useEffect(() => { if (city) map.flyTo([city.center[1], city.center[0]], 8, { duration: 0.8 }); }, [city, map]);
  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState<City | undefined>(() => CITIES.find((c) => c.id === params.get('il')));
  const markers = useRef<Record<string, L.Marker>>({});

  // İl sınırları: projedeki gerçek TopoJSON verisi (OSM tabanlı)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/tr-low.topo.json`).then((r) => r.json())
      .then((t) => setGeo(feature(t, t.objects.provinces) as unknown as FeatureCollection)).catch(() => {});
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => { if (focus) setTimeout(() => markers.current[focus.id]?.openPopup(), 900); }, [focus]);

  const matches = useMemo(() => (q.trim() ? CITIES.filter((c) => norm(c.name).startsWith(norm(q.trim()))).slice(0, 6) : []), [q]);
  const byGeoName = useMemo(() => new Map(CITIES.map((c) => [c.name, c])), []);

  return (
    <div className="fixed inset-0 z-[1000] bg-white">
      <MapContainer center={[39.1, 35.3]} zoom={6} minZoom={5} maxZoom={14} zoomControl={false}
        maxBounds={[[33.5, 22], [44.5, 48]]} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıcıları'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geo && (
          <GeoJSON
            data={geo}
            style={() => ({ color: '#F04448', weight: 1, opacity: 0.55, fillColor: '#F04448', fillOpacity: 0.04 })}
            onEachFeature={(f, layer) => {
              const city = byGeoName.get(GEO_NAME[f.properties?.name] ?? f.properties?.name);
              layer.on({
                mouseover: (e) => e.target.setStyle({ fillOpacity: 0.16, weight: 2 }),
                mouseout: (e) => e.target.setStyle({ fillOpacity: 0.04, weight: 1 }),
                click: () => city && markers.current[city.id]?.openPopup(),
              });
            }}
          />
        )}
        {CITIES.map((c) => (
          <Marker key={c.id} position={[c.center[1], c.center[0]]} icon={pin(c, focus?.id === c.id)} title={c.name}
            ref={(m) => { if (m) markers.current[c.id] = m; }}>
            <Popup maxWidth={280} minWidth={240}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  {c.regionName} · {String(c.plate).padStart(2, '0')}
                </p>
                <p style={{ margin: '2px 0 6px', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{c.name}</p>
                <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5, color: '#475569' }}>{c.summary}</p>
                <button
                  onClick={() => navigate(`/oyunlar?il=${c.id}`)}
                  style={{ width: '100%', height: 40, border: 0, borderRadius: 10, background: '#F04448', color: '#fff', font: '600 14px Inter,sans-serif', cursor: 'pointer' }}
                >
                  🎮 Oyna ({gameCount(c)} oyun)
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
        <FlyTo city={focus} />
      </MapContainer>

      {/* Üst çubuk: çıkış + şehir arama */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-wrap items-start gap-2 p-3 sm:p-4">
        <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} className="btn-ghost pointer-events-auto h-11 px-4 shadow-card">
          <LogOut size={18} className="rotate-180" /> Haritadan çık
        </button>
        <div className="pointer-events-auto relative w-full max-w-xs sm:w-72">
          <Search size={18} className="absolute left-3 top-3 text-ink-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Şehir ara…" aria-label="Şehir ara"
            className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm shadow-card outline-none focus:border-brand" />
          {matches.length > 0 && (
            <ul className="absolute mt-1 w-full overflow-hidden rounded-xl border border-line bg-white shadow-card">
              {matches.map((c) => (
                <li key={c.id}>
                  <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50"
                    onClick={() => { setFocus(c); setQ(''); }}>
                    {c.name} <span className="text-xs text-ink-muted">{String(c.plate).padStart(2, '0')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <a href={`${import.meta.env.BASE_URL}3d/`} className="btn-ghost pointer-events-auto ml-auto hidden h-11 px-4 shadow-card sm:inline-flex">3D Harita</a>
      </div>
    </div>
  );
}
