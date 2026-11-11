import { useEffect, useState } from 'react';

export interface WikiInfo {
  thumb?: string;
  url?: string;
  extract?: string;
}

const cache = new Map<string, Promise<WikiInfo>>();

/**
 * Gerçek fotoğraf: Türkçe Vikipedi REST özet uç noktasından küçük resim (Wikimedia Commons).
 * Görseller yalnızca bilgi kartı açıldığında istenir (lazy); başarısız olursa kart
 * prosedürel motifle zarifçe devam eder.
 */
export function fetchWiki(title: string): Promise<WikiInfo> {
  let p = cache.get(title);
  if (!p) {
    p = fetch(`https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => ({ thumb: j.thumbnail?.source, url: j.content_urls?.desktop?.page, extract: j.extract }))
      .catch(() => ({}));
    cache.set(title, p);
  }
  return p;
}

export function useWikiImage(title?: string): WikiInfo | null {
  const [info, setInfo] = useState<WikiInfo | null>(null);
  useEffect(() => {
    setInfo(null);
    if (!title) return setInfo({});
    let alive = true;
    fetchWiki(title).then((i) => alive && setInfo(i));
    return () => {
      alive = false;
    };
  }, [title]);
  return info;
}
