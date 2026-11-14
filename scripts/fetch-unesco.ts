// UNESCO Dünya Mirası Merkezi'nin herkese açık XML listesinden İstanbul Tarihi Alanları (356) kaydını çeker
// ve her yapı dosyasındaki "unesco" bloğunu günceller. İnternet yoksa mevcut dosyalara dokunmaz.
// Çalıştırma: npm run unesco
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';

const URL = 'https://whc.unesco.org/en/list/xml/';
const PROPERTY = '356';
const pick = (xml: string, tag: string) => xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim();

async function main() {
  let xml: string;
  try {
    const r = await fetch(URL, { headers: { 'User-Agent': 'miras-data-script' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    xml = await r.text();
  } catch (e) {
    console.error(`UNESCO listesine ulaşılamadı (${(e as Error).message}). Mevcut dosyalar korunuyor.`);
    process.exit(1);
  }
  const row = xml.split('<row>').find((r) => pick(r, 'id_number') === PROPERTY);
  if (!row) { console.error(`${PROPERTY} numaralı kayıt bulunamadı.`); process.exit(1); }
  const record = {
    id: PROPERTY, name: pick(row, 'site'), inscribed: Number(pick(row, 'date_inscribed')), criteria: pick(row, 'criteria_txt'),
    shortDescription: pick(row, 'short_description')?.replace(/<[^>]+>/g, ''), fetchedAt: new Date().toISOString(), source: URL,
  };
  mkdirSync('data/unesco', { recursive: true });
  writeFileSync(`data/unesco/${PROPERTY}.json`, JSON.stringify(record, null, 2));
  const dir = 'src/app/istanbul/sites';
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const site = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
    site.unesco = { ...site.unesco, inscribed: record.inscribed || site.unesco.inscribed };
    writeFileSync(`${dir}/${f}`, JSON.stringify(site, null, 2) + '\n');
  }
  console.log(`Güncellendi: ${record.name} (${record.inscribed})`);
}
main();
