# Nemrut Dağı — "Tanrıların Tahtı"

Rota: `/oyun/nemrut`. Giriş noktası `NemrutGame.tsx` (varsayılan dışa aktarım, `{ onExit }`). Rehber yok: rehberin yerini keşif defteri alır.

## Oynanış
- **Serbest yürüyüş:** Joystick / WASD ile yürünür, Shift ile koşulur (3,5 m/sn). Kamera üçüncü şahıstan izler, sürükleyerek çevrilir; yukarı sürüklenince heykellerin tepesine bakılır. Tümülüsün, arazinin, kaidenin ve stellerin içine girmez. Tümülüse çıkılmaz; gerçekte de yasaktır.
- **Zaman akar:** 1 gerçek saniye 1 oyun dakikasıdır. T tuşu ya da ⏩ düğmesi zamanı 20 kat hızlandırır. Oyun şafaktan önce başlar.
- **Keşif defteri (J):** yedi görev var.
  1. Doğu Terası'nda gün doğumunu izle (altın saatte terasta 4 sn bekle).
  2. Doğu terasındaki beş tahtın yazıtını oku.
  3. Kırılıp düşmüş üç yazıt parçasını bul: kuzeyde, güneybatıda ve batı terasında, uzaktan görünen ışık sütunlarıyla.
  4. Pers adlarını doğru tanrıların tahtına yerleştir: OROMASDES → Zeus, MITHRAS → Apollon, ARTAGNES → Herakles. Yanlış eşleşmede ipucu gösterilir. Üçü de yerleşince doğu terasının başları sanal olarak gövdelerine kalkar.
  5. Aslan Horoskobu'nda üç gezegeni bul. Kabartmaya dokunulan bir bulmaca: 19 yıldız, hilal ve 3 gezegen.
  6. Batı terasındaki dört el sıkışma (dexiosis) stelini incele.
  7. Batı Terası'nda gün batımını izle.
- **İnceleme (E):** Tahtlar, başlar, koruyucular, sunak, ata stelleri, tümülüs ve bilgi tabelası incelenebilir. Her kartta kaynak bağlantısı var; sesli okuma açılıp kapanabilir.

## Dosyalar
| Dosya | İçerik |
|---|---|
| `site.ts` | Yürünebilir halka, kaide/sunak/stel/baş engelleri, bölümler, yazıt parçaları, incelenebilir nesneler, horoskop bulmacası, görevler (saf, test edilir) |
| `terrain.ts` | Arazi yükseklik fonksiyonu, kaya/çalı saçılımı, heykel ve devrik baş yerleri |
| `Monuments.tsx` | Basamaklı kaideler, blok blok örülmüş başsız oturan heykeller, ayrıntılı başlar, aslan ve kartal, sunak, ata stelleri, el sıkışma stelleri ve Aslan Horoskobu kabartmaları, parlayan yazıt parçaları, tabela, sanal restorasyon |
| `ProceduralTerrain.tsx` | Arazi ağı (çakıl dokusu, ziyaretçi izi, statik eğim gölgesi), kaya ve çalılar |
| `DynamicLightingSystem.ts` | Güneş konumu (38°K), evreler, atmosfer (sis, yıldız, tanrı ışınları, rüzgâr) |
| `AudioManager.ts` | Konumlu rüzgâr, çakılda ayak sesi, çan, taş sürtünmesi |
| `time.ts` | Saat biçimi ve sarma |

## Grafik
- Heykeller gerçekte üst üste konmuş büyük kireçtaşı bloklarından oluşur. Gövdeler yuvarlatılmış blok kütlelerdir, yüzeylerinde derz çizgileri görünür. Gövdeler başsızdır.
- **Başlar:** Yüz hatları, öne kıvrık Pers başlığı (tiara) ve yanak kapakları var. Kommagene'de meyve ve başak tacı, Zeus ile Herakles'te lüleli sakal bulunur. Antiochos ve Herakles'te burun kırıktır. Yüzeyde aşınma çukurları ve liken benekleri var.
- **Boya yok:** Bugünkü aşınmış taş gösterilir. Önceki sürümdeki varsayımsal boyalı canlandırma kaldırıldı.
- **Işık:** Gölgeli güneş oyuncuyu izler. Sky, yıldızlar, sürüklenen sis bulutları ve tanrı ışınları (orta/yüksek kademe) var.

## Kaynaklar
- [UNESCO — Nemrut Dağ](https://whc.unesco.org/en/list/448/)
- [World History Encyclopedia — Exploring Mount Nemrut](https://www.worldhistory.org/article/1589/)
- [Britannica — Nemrut Dağ](https://www.britannica.com/place/Nemrut-Dag)
- [Encyclopædia Iranica — Nemrud Dagi](https://iranicaonline.org/articles/nemrud-dagi)
- [Lonely Planet — Nemrut Dağı Summit](https://www.lonelyplanet.com/pois/1285960) (heykel sırası)

## Dürüstlük notları
- **Yazıt bulmacası oyun kurgusudur.** Tahtlardaki Pers adlarının kırılıp dağıldığı gerçek bir buluntu değildir. Tanrıların çifte adları (Zeus-Oromasdes, Apollon-Mithras-Helios-Hermes, Herakles-Artagnes-Ares) ise kaynaklardadır.
- **Aslan Horoskobu:** 19 yıldız, hilal ve 3 gezegen (Mars, Jüpiter, Merkür) kaynaklardadır. Yıldızların yeri stilizedir. Gezegenlerin yazıttaki Yunanca adları (Pyroeis, Stilbon, Phaethon) ve tanrılarla eşleşmeleri bu çalışmada birincil kaynaktan doğrulanmadı. Tarih tartışmalıdır: geleneksel olarak MÖ 62, önerilen başka bir tarih MÖ 109.
- **Yerleşim:** El sıkışma stelleri ve ata stelleri stilize konumlardadır. Yerleşim, ölçüler ve arazi yaklaşıktır; sayısal yükseklik modeli kullanılmadı.
- **Sanal restorasyon** bir canlandırmadır; gerçek başlar yerde duruyor.
- Kare hızı gerçek telefonlarda ölçülmedi.
