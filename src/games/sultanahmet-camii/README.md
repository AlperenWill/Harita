# Sultanahmet Camii — Işık huzmelerini takip et: güneşin hareketiyle kayan ışık havuzunun içinde dur, ışığın düştüğü duvardaki gizli çini desenini aç

`game.json` bu klasörün tek veri kaynağıdır (şema: `src/games/schema/game-definition.schema.json`).

**Durum:** Oynanabilir. Mekanik birim testleriyle doğrulanır: kusursuz oynayan bir yapay oyuncu altı deseni de geri sarma olmadan açar, hiç hareket etmeyen oyuncu ise kaybetmez, yalnızca geri sarılır.

## Neden bu mekanik
Araştırmada yapının en özgün yanı, 200'ü aşkın pencereden süzülen ışığın İznik çinilerini gün boyunca farklı yerlerde göstermesi. Bu yüzden oyuncu bir şey toplamaz ya da yarışmaz: güneşin hareketini izler. Işık havuzu kendiliğinden kayar, oyuncunun işi onunla birlikte yürümek ve sabır göstermek. Kaybetme yok; ışık kaçarsa güneş nazikçe geri sarılır.

**Çıkış noktası (araştırma):** Çini pencerelerden süzülen ışığın gün boyu yer değiştirmesi

## Oyun döngüsü
Güneş ilerler (1 oyun saati ≈ 22 sn; kısa pencerelerde yavaşlar, her aşama ≥ 45 sn) → zeminde altın halkalı bir havuz belirir ve kayar → oyuncu halkanın içinde 2,5 sn kesintisiz durur → ışığın düştüğü duvardaki panoda çini deseni açılır. Altı desen (lale, karanfil, sümbül, servi, hatayi, rumi) sabahtan akşama sırayla.

**Kazanma koşulu:** Altı çini motifinin (lale, karanfil, sümbül, servi, hatayi, rumi) hepsini aç

## Kamera
Önce 7 sn'lik sinematik rota (avlu → kapı, dokunarak atlanır), sonra üçüncü şahıs takip: kamera karakterin gerisinde, harimin ortasına çekilmiş ve havuzu da kadrajda tutacak açıda durur. Oyuncu kamerayı hiç döndüremez; joystick/WASD kameranın yönüne göre yorumlanır.

## Hareketler
Joystick (dokunmatik) ya da WASD/oklar; zemine dokunmak/tıklamak karakteri oraya yürütür (engelin yanından dolaşan otomatik yön bulma).

## Mobil performans kontrol listesi
| Madde | Durum |
|---|---|
| Varlık bütçesi ≤ 8 MB | ✓ 0 MB dosya: geometri ve çini dokuları kodla üretilir; oyun parçası ~41 KB (gzip ~16 KB) |
| Çizim çağrısı | ✓ Işık huzmeleri ve havuzlar 2 InstancedMesh (en fazla 32 örnek), kandiller/ağaçlar/revak kubbeleri instancing |
| Saat güncellemesi | ✓ Huzme matrisleri her karede değil, oyun saati ~1 dk ilerlediğinde yeniden hesaplanır |
| Düşük kademe | ✓ Gölge, sis, toz parçacıkları kapalı; DPR 1; kenar yumuşatma kapalı; segment sayıları yarıya iner |
| Pil < %20 (şarjda değil) | ✓ Düşük kademe profiline geçer: gölge ve son işlem kapanır |
| WebGL yok | ✓ Vikipedi fotoğrafı + tr-TR sesli anlatım (çekirdek Fallback) |
| Dikey tutulan telefon | ✓ Yatay çevirme uyarısı (LandscapeGate) |
| Dokunma alanları | ✓ Tüm düğmeler ≥ 44×44 px; joystick 112 px |
| Hareket azaltma | ✓ prefers-reduced-motion açıksa sinematik giriş atlanır |
| 45+ FPS | ✗ Gerçek orta segment telefonda ölçülmedi — yalnızca masaüstü/swiftshader ekran görüntüsü alındı |

Hedef: ≤ 8 MB, orta segment telefonda ≥ 45 FPS.

## Kaynaklar
- [UNESCO World Heritage Centre — Historic Areas of Istanbul](https://whc.unesco.org/en/list/356)
- [Ozge Yildiz, doktora tezi (Harvard University, 2024) — Sultan Ahmed Camii iç mekân bezemesi](https://dash.harvard.edu/entities/publication/5b0988ad-8804-4571-b3eb-f4cbc2bc7330)
- [Hürriyet Daily News — Iconic Blue Mosque goes through extensive restoration](https://hurriyetdailynews.com/iconic-blue-mosque-goes-through-extensive-restoration-143563)
- [TRT Haber — Sultanahmet Camii yüzyıllardır ihtişamını koruyor](https://www.trthaber.com/haber/turkiye/sultanahmet-camii-yuzyillardir-ihtisamini-koruyor-909897.html)
- [Türkiye Gazetesi — 2018’den beri restorasyondaydı: Sultanahmet Camii ibadete açılacak](https://www.turkiyegazetesi.com.tr/yasam/2018den-beri-restorasyondaydi-sultanahmet-camii-ramazan-bayraminin-ilk-gunu-ibadete-acilacak-960151)
