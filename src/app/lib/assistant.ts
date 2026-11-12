import { CITIES, SITES, norm } from '../data';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  links?: { label: string; to: string }[];
}

/**
 * ENTEGRASYON NOKTASI
 * .env içinde VITE_ASSISTANT_API_URL tanımlanırsa sorular bu uca gönderilir:
 *   POST { messages: ChatMessage[] }  →  { reply: string }
 * (Örn. kendi sunucunuzda bir LLM API'sine köprü.) Tanımlı değilse ya da istek başarısız olursa
 * yerel bilgi tabanı (81 il + tarihi noktalar) ile yanıt verilir.
 */
export async function askAssistant(history: ChatMessage[]): Promise<ChatMessage> {
  const url = import.meta.env.VITE_ASSISTANT_API_URL as string | undefined;
  if (url) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history }) });
      if (r.ok) { const j = await r.json(); if (typeof j.reply === 'string') return { role: 'assistant', text: j.reply }; }
    } catch { /* yerel yanıta düş */ }
  }
  return localAnswer(history[history.length - 1]?.text ?? '');
}

// Arama anahtarları: tam ad, parantez öncesi ad ve ayırt edici ilk kelime
const siteKeys = SITES.map((s) => {
  const base = norm(s.name.replace(/\(.*?\)/g, '').trim());
  const first = base.split(/\s+/)[0];
  const generic = ['antik', 'tarihi', 'buyuk', 'sultan', 'kral', 'kucuk', 'eski', 'yeni', 'kayip'];
  // İl adıyla başlayan yerler (ör. "Ankara Kalesi") yalnızca tam adla eşleşir; yoksa "Ankara" sorusu kaleye giderdi
  const ok = first.length >= 4 && !generic.includes(first) && !CITIES.some((c) => norm(c.name) === first);
  return { s, keys: [base, ...(ok ? [first] : [])] };
});

export function localAnswer(input: string): ChatMessage {
  const t = norm(input);
  // Kelime başında eşleşme: "Kars'ta", "Vanda" yakalanır; "vanilya" gibi kelime içi eşleşmeler yakalanmaz
  const has = (k: string) => new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z]{4})`).test(t);

  const site = siteKeys.find(({ keys }) => keys.some((k) => k.length >= 4 && t.includes(k)))?.s;
  const city = CITIES.find((c) => has(norm(c.name)));

  if (site && (!city || site.city.id === city.id || t.includes(norm(site.name)))) {
    return {
      role: 'assistant',
      text: `${site.name} — ${site.city.name}${site.district ? ` / ${site.district}` : ''}\n` +
        `${site.categoryLabel} · ${site.periodLabel}\n\n${site.summary}\n\nBiliyor muydunuz? ${site.didYouKnow}`,
      links: [{ label: 'Bu yerin oyununu oyna', to: `/oyun/${site.id}` }, { label: `${site.city.name} sayfası`, to: `/oyunlar?il=${site.city.id}` }],
    };
  }
  if (city) {
    return {
      role: 'assistant',
      text: `${city.name} (${String(city.plate).padStart(2, '0')})\n${city.summary}\n\nTarihi noktalar: ${city.sites.map((s) => s.name).join(', ')}.`,
      links: [{ label: `${city.name} oyunlarını aç`, to: `/oyunlar?il=${city.id}` }, { label: 'Haritada gör', to: `/harita?il=${city.id}` }],
    };
  }
  if (t.includes('unesco')) {
    const list = SITES.filter((s) => s.category === 'unesco');
    return { role: 'assistant', text: `Veri setimizde ${list.length} UNESCO Dünya Mirası alanı var:\n${list.map((s) => `• ${s.name} (${s.city.name})`).join('\n')}` };
  }
  if (/(merhaba|selam|iyi gun|naber)/.test(t)) {
    return { role: 'assistant', text: 'Merhaba! Bir şehir ya da tarihi yer adı yaz; sana bilgi vereyim. Örnek: “Efes”, “Kars’ta ne var?”, “UNESCO alanları”.' };
  }
  if (/(oyun|puan|nasil oyna|test)/.test(t)) {
    return { role: 'assistant', text: 'Oyunlar sayfasında 81 ili açıp bir tarihi yer seç ve “Oyuna Başla”ya bas. Her oyunda 5 soru var; her doğru cevap 20 puan. Genel Türkiye bilgini ölçmek için Test sayfasında 20 soruluk sınav seni bekliyor.',
      links: [{ label: 'Oyunlar', to: '/oyunlar' }, { label: 'Test', to: '/test' }] };
  }
  return {
    role: 'assistant',
    text: 'Bunu veri setimde bulamadım. Bir il adı (ör. “Mardin”) ya da tarihi yer adı (ör. “Ayasofya”, “Göbeklitepe”) yazmayı dener misin?',
  };
}
