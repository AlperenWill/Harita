import { ExternalLink } from 'lucide-react';

const SOURCES = [
  { name: 'T.C. Kültür ve Turizm Bakanlığı', url: 'https://www.ktb.gov.tr', desc: 'Kültür varlıkları, müzeler ve ören yerleri hakkında resmî bilgiler.' },
  { name: 'Türkiye Kültür Portalı', url: 'https://www.kulturportali.gov.tr', desc: '81 il için tarihi yerler, gelenekler ve gezi rehberleri.' },
  { name: 'UNESCO Dünya Mirası Merkezi — Türkiye', url: 'https://whc.unesco.org/en/statesparties/tr', desc: 'Türkiye’deki Dünya Mirası alanlarının resmî listesi ve açıklamaları.' },
  { name: 'UNESCO Somut Olmayan Kültürel Miras', url: 'https://ich.unesco.org/en/state/turkiye-TR', desc: 'Türkiye’nin somut olmayan kültürel miras listesi.' },
  { name: 'Müzeler ve Ören Yerleri (muze.gov.tr)', url: 'https://muze.gov.tr', desc: 'Resmî müze ve ören yeri bilgileri, ziyaret saatleri.' },
  { name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/copyright', desc: 'Harita altlığı ve il sınırları verisi (ODbL lisansı).' },
];

export default function SourcesPage() {
  return (
    <div className="animate-fade-up">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Kaynakça</h1>
        <p className="mt-2 text-ink-muted">Uygulamadaki bilgiler aşağıdaki resmî ve açık kaynaklardaki genel kabul görmüş verilere dayanır.</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {SOURCES.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer" className="card group flex h-full flex-col p-5 transition hover:border-brand/40">
              <span className="flex items-start justify-between gap-2 font-semibold">{s.name}<ExternalLink size={16} className="mt-0.5 shrink-0 text-ink-muted group-hover:text-brand" /></span>
              <span className="mt-1 text-sm text-ink-muted">{s.desc}</span>
              <span className="mt-3 text-xs font-medium text-brand">{s.url.replace(/^https:\/\//, '')}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-ink-muted">
        Not: Tarihî bilgiler özet niteliğindedir. Ziyaret öncesinde güncel bilgi için ilgili müze ve bakanlık sayfalarını kontrol edin.
      </p>
    </div>
  );
}
