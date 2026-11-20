# Haritaya yeni oyun eklemek

Harita yalnızca **oynanabilir yerleri** gösterir. Liste tek bir dosyadadır: `src/data/playables.ts`.
Oyunu olmayan bölge ve iller gri kalır, tıklanmaz ("yakında"). Bir ile ilk oyun eklenince o il ve bölgesi kendiliğinden açılır.

## Kapsam ilkesi
- Popüler, değerli yerler **detaylı** yapılır (`depth: 'detayli'`): uzun ve zengin bir oyun.
- Az bilinen yerler **kısa** yapılır (`depth: 'kisa'`): hızlı, hafif bir oyun.
- Bir ildeki bütün noktalar yapılmaz; en popüler 1–2 yer seçilir. Örneğin Rize'de 5 yer yerine Zil Kale ve bir tane daha.

## A) Uygulama içinde yazılan oyun (React / R3F)
1. Oyun kodu: `src/app/games/<id>/` (ana bileşen `onExit` alır).
2. Sayfa: `src/app/pages/<Ad>Page.tsx` (öteki sayfaları örnek al). Oyun tembel yüklenir, `onExit={() => navigate('/harita')}`.
3. Rota: `src/app/App.tsx` içine `lazy(() => import('./pages/<Ad>Page'))` ve `<Route path="oyun/<id>" … />`.
4. Kayıt: `src/data/playables.ts` listesine bir satır ekle (`kind: 'route'`, `path: 'oyun/<id>'`).

## B) Zip ile gelen bağımsız oyun (tek klasör, `index.html`)
1. Zip'i `public/<klasor>/` altına aç. Oyunun kendi `index.html`'i olmalı ve göreli yollar kullanmalı.
2. Kayıt: `src/data/playables.ts` listesine `kind: 'static'`, `path: '<klasor>/index.html'` ile bir satır ekle.

### Bir zip'te birden çok yer varsa
Zip'teki her yer haritada **ayrı bir nokta** olur. Her biri oyunun o bölümünü doğrudan açar:
- Oyuna bir adres parametresi eklenir, ör. `index.html?mekan=karatay`. Parametre oyunun açılışında okunur, o bölüm açılır ve kilitliyse kilidi kaldırılır.
- Örnek: `public/konya-kayip-miras/game.js` → `boot()` içindeki `mekan` bloğu.
- Listede her yer için bir satır yazılır, `path` alanı aynı dosyayı farklı parametreyle açar.
- Yer miras verisinde yoksa önce oraya eklenir: `src/data/heritage/<bölge>.ts`, `src/app/data/turkiye.json`, `src/data/districts.ts`.

### Haritaya dönüş düğmesi
Zip'li oyunlara mutlaka "haritaya dön" düğmesi eklenir: `href="../harita"`, oyunun kendi arayüz diline uygun biçimde.

## Kayıt satırı
```ts
{ id: 'zilkale', name: 'Zil Kale', province: 'Rize', coord: [41.0667, 40.9581],
  title: 'Sis İçindeki İzler', emoji: '🌫️', blurb: 'Sisli Fırtına Vadisi’nden kaleye yürü.',
  kind: 'route', path: 'oyun/zilkale', depth: 'detayli', wiki: 'Zilkale' },
```
- `id` miras verisindeki (`src/data/heritage/<bölge>.ts`) noktanın kimliğidir. Nokta orada yoksa önce oraya eklenir: ad, il, koordinat, kısa bilgi.
- `province`, GeoJSON il adıdır (ör. `Afyon`, `İstanbul`).
- `coord` iki yerde aynı olmalıdır.
- `wiki`, kart fotoğrafı için tr.wikipedia başlığıdır.

## Kontrol
`npm test` içindeki `tests/playables.test.ts` şunları denetler:
- her kaydın miras verisinde karşılığı var mı, il ve konum tutuyor mu;
- uygulama rotası ya da `public/` dosyası gerçekten var mı.
