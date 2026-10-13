# op-haber

Only Positive (OP) uygulaması için otomatik iyi haber hattı. GitHub Actions her 10 dakikada bir çalışır; yalnız mutlu ve umut veren haberleri seçer, kendi cümleleriyle Türkçe ve İngilizce yazar, lisanslı bir görsel bulur ve OP'nin Supabase arka ucuna editör gönderisi olarak iletir. Ücretsiz katmanlarla çalışacak şekilde tasarlanmıştır.

## Nasıl çalışır

1. **Tara:** `kaynaklar.json` içindeki RSS akışları (kaynak başına tek istek) ve Bing News RSS sorguları.
2. **Görülenleri ele:** bağlantının sha256 özeti Supabase'deki `haber_gorulen` tablosuna sorulur (Actions koşusu durumsuzdur).
3. **Ön eleme (modelsiz):** son 24 saat (`TAZELIK_SAAT`) dışındakiler, hassas konular (siyaset, din, etnik kimlik, savaş/suç, afet/salgın, kamu kurumu icraatı) ve kaba dil elenir.
4. **Doğrulama:** `GUVENILIR_KAYNAKLAR` listesindeki siteler tek kaynakla geçer; diğerleri başka bir sitede aynı olayı anlatan ikinci bir haber bulunana kadar bekler (en çok `KAYNAK_DENEME_UST` tur).
5. **Kaynak sayfası:** `robots.txt` saygılı, zaman aşımlı ve boyut sınırlı düz metin. Engel varsa sayfa kullanılmaz.
6. **Yazım:** tek Gemini çağrısı hem uygunluğu hem TR/EN metni (5-8 cümle) üretir. Kod ayrıca doğrular: kaynakta olmayan rakam yok, cümle sayısı, bağlantı/markdown/emoji/ünlem yok, kaynaktan kopya yok, dil sezgisi, ikinci içerik filtresi.
7. **Görsel:** Wikimedia Commons ve Openverse (yalnız CC0, CC BY, CC BY-SA, kamu malı); olmazsa Pixabay (anahtar varsa). Aday modelle ayrıca denetlenir (konu uygun mu, yazı/logo baskın mı, tanınabilir yüz, din/siyaset simgesi, kalite). Sıra: kurumun kendi lisanslı görseli, haberin ADI GEÇEN öznesinin Commons görseli (aşağıya bak), insansız nötr konu görseli; hiçbiri uygun değilse haber **görselsiz yayınlanır** (istemci OP tasarım kartı gösterir; yanlış görsel asla). `GORSELSIZ_YAYIN=0` eski bekleme yolunu açar (`GORSEL_DENEME_UST`).
8. **Yayın:** `haber-yukle` Edge Function'ına gönderilir; o da ikinci filtreyi çalıştırır, görseli depolamaya yükler ve haberi uygun editör hesabı adına yazar.

Tur başına en çok `TUR_BASINA_EN` (varsayılan 4) yeni haber yayınlanır (alıntı/gökbilim işleri ayrıdır). Model kotası (429) dolarsa tur zarifçe biter. Günlüğe haber başlığı ya da gizli değer yazılmaz; her tur tek bir özet satırı basar.

## Gerekli gizli değerler

GitHub'da: **Settings → Secrets and variables → Actions → New repository secret**.

| Ad | Zorunlu | Açıklama |
|---|---|---|
| `GEMINI_API_KEY` | evet | Google AI Studio ücretsiz anahtarı |
| `HABER_YUKLE_ANAHTARI` | evet | `haber-yukle` fonksiyonundaki aynı değer (en az 32 karakter) |
| `SUPABASE_FN_URL` | evet | `haber-yukle` fonksiyonunun tam adresi (`https://<proje>.supabase.co/functions/v1/haber-yukle`) |
| `PIXABAY_API_KEY` | hayır | yedek görsel kaynağı |
| `CF_ACCOUNT_ID`, `CF_API_TOKEN` | hayır | yedek metin modeli (Cloudflare Workers AI) |

Gizli olmayan ayarlar **Variables** sekmesinden verilir: `GEMINI_MODEL` (varsayılan `gemini-3.5-flash-lite`), `YEDEK_MODEL` (örn. `@cf/meta/llama-3.1-8b-instruct`; tanımlı değilse yedek atlanır), `GORSELSIZ_YAYIN`, `GUVENILIR_KAYNAKLAR` (virgülle site adları), `TUR_BASINA_EN`.

## Yerel çalıştırma

Gerekli: Node 20 veya üstü. Kurulum gerekmez.

```
node hat.mjs --kuru     # kaynakları okur; model ve yayın yapılmaz
node --test             # ağsız testler
```

`--kuru` yalnız salt okuma yapar (kaynak başına tek istek) ve örnek başlıkları gösterir.

## Doğrulanmayanlar

- Model kimliği `gemini-3.5-flash-lite` Google'ın model listesinde ve ücretsiz katman tablosunda görüldü; ücretsiz dakikalık/günlük sınırlar sayfalardan okunamadı. Bu yüzden çağrılar arası bekleme (`GEMINI_BEKLEME_MS`) ayarlanabilir.
- `generateContent` istek biçimi ve `x-goog-api-key` başlığı yaygın kullanımdan alındı; belge sayfaları örnekleri yalnız `?key=` ve yeni Interactions API ile gösterdi. İlk gerçek çalıştırmada kontrol edilmeli.
- Cloudflare Workers AI yolu (`/accounts/{id}/ai/run/{model}`) doğrulandı; `messages` gövdesi ve `result.response` yanıtı belgedeki örneğe göre `prompt` biçiminin eşdeğeri olarak kullanıldı, doğrulanmadı.
- Türkçe metin kalitesi otomatik doğrulanamaz (yalnız basit dil sezgisi var); ilk haftada örnekler elle okunmalıdır.

## Zamanlanmış işlerin kapanması

GitHub, herkese açık depolarda 60 gün boyunca depo etkinliği olmazsa zamanlanmış iş akışlarını kapatır. Hangi eylemlerin "etkinlik" sayıldığı ve iş akışı koşularının sayılıp sayılmadığı resmi belgede tanımlı değildir; API ile yeniden etkinleştirmenin sayacı sıfırladığı doğrulanmadı. Bu yüzden otomatik bir "canlı tut" adımı eklenmedi. Önerilen yol: ayda bir depoya küçük bir commit atmak (örneğin README'ye tarih notu) ya da kapanma e-postası geldiğinde **Actions → haber → Enable workflow** demek.

## Kaynaklar ve koşullar

- Kaynaklar: iyi haber siteleri (goodnewsnetwork.org, positive.news, optimistdaily.com, reasonstobecheerful.world) ve Bing News RSS sorguları. Türkçe iyi haber kaynakları için `kaynaklar.json` içinde boş bir `tr_adaylar` listesi var; yeni kaynak **sahip onayıyla eklenecek**. Google News RSS kullanılmaz. Bing News RSS koşulları ayrıca gözden geçirilmelidir; kapatmak için `BING=0`.
- Yalnız kendi cümlelerimiz yayınlanır; kaynaktan alıntı ya da kopya yoktur. Her habere kaynak bağlantısı eklenir.
- Görseller: yalnız CC0, CC BY, CC BY-SA, kamu malı (yedekte Pixabay lisansı). Yaratıcı, lisans ve kaynak adresi her görselle birlikte saklanır ve uygulamada gösterilir. NC/ND lisanslar ve haber sitesi fotoğrafları kullanılmaz.
- Kullanılan belgeler: <https://ai.google.dev/gemini-api/docs/models>, <https://ai.google.dev/gemini-api/docs/pricing>, <https://ai.google.dev/api/generate-content>, <https://developers.cloudflare.com/workers-ai/get-started/rest-api/>, <https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/disabling-and-enabling-a-workflow>.

## Alan haberleri, alıntı hesapları, gökbilim (2026-10-13)

- **Alan haberleri** (spor, sanat, bilim, teknoloji, gökbilim): `kaynaklar.json` içinde `alan` işaretli kaynaklar. "İyi haber" şartı aranmaz, nötr-olumlu güncel haber yeter; olumsuz olay, bahis, reklam, astroloji, devlet icraatı, din/kimlik ön elemede elenir (`lib/alanlar.mjs`). Tur başına yayın tavanı `TUR_BASINA_EN` (4), aynı alandan art arda `ALAN_ARDA_ARDA_UST` (2), son 24 saatte alan başına tavan `ALAN_KOTALARI` ("spor:6,sanat:5,bilim:6,teknoloji:5,gokbilim:3"). Sayılar bulutta `haber-yukle` `kota` işleminden gelir.
- **Alıntı hesapları** `op_felsefe, op_edebiyat, op_siir, op_mitoloji`: alıntıyı MODEL ÜRETMEZ; Wikiquote'tan (MediaWiki API `action=parse`) yalnız eser başlıklı bölümlerden makineyle çekilir (Disputed/Misattributed/Attributed/Unsourced/"Quotes about" atlanır), yazar ölüm yılı <= 1955 olmalı (`lib/alinti_yazarlar.mjs`), çevirili alıntıda telifsiz çevirmen adı şart. Model yalnız Türkçe çeviri yapar; gönderide özgün metin + "Türkçe çeviri: OP" notu + kaynak bağlantısı vardır. Görsel: yazarın Wikiquote sayfasındaki, adında yazar adı geçen, lisansı uygun Commons görseli; yoksa paylaşılmaz.
- **Gökbilim** `op_gokbilim`: ESO / ESA-Hubble / NASA / ESA haber beslemeleri olağan hattan (hazır kurum görseli, CC BY 4.0 atıf) + NASA APOD (`copyright` boşsa ve görsel APOD dizinindeyse) + ay evreleri (ABD Deniz Gözlemevi API'si, metin şablonla). `NASA_API_KEY` (ücretsiz, api.nasa.gov) tanımlı değilse `DEMO_KEY` kullanılır.
- **Sıra:** haber.yml aynı koşuda "sırası gelmişse" çalıştırır: `OZEL_KOTALARI` (felsefe 2/gün, edebiyat 2/gün, şiir 2/gün, mitoloji 3/hafta, gökbilim 3/gün), son paylaşımdan en az 8-36 saat, UTC `OZEL_SAAT` (5-21). `OZEL_ISLER=0` hepsini kapatır. Tur başına `OZEL_TUR_UST` (2) iş, `OZEL_CAGRI_UST` (4) model çağrısı.
- **Kalite kapıları:** çevrilmiş özel ad şüphesi (`ozelAdKapisi`, program/proje/ders planı adları özgün kalır); görsel kontrolünde `yer_ya_da_kurum_uyumsuz` ve `insan_ayirt_edilebilir` ikisi de false olmalı, aramada önce haberdeki yer/kurum adı denenir.
- Yeni SQL: `../gecis-004-icerik-hesaplari.sql` (kategori kısıtı + 5 hesap). Fonksiyonun yeniden dağıtılması gerekir (`kota` işlemi, `editor` alanı, yeni kategoriler).

## Canlı deneme sonrası düzeltmeler (2026-10-13)

- **Görsel stratejisi:** model yazım çağrısında `gorsel_ozne` ({ad, tur: kisi|kurum|yer|eser|tur|nesne}) üretir. Önce Commons'ta tam ad aranır; dosya başlığı/açıklaması/kategorisi özne adının tüm kelimelerini içermeli, lisans uygun (CC0, CC BY, CC BY-SA, kamu malı) olmalı, ardından model `ozne_eslesiyor` true ve `siyah_beyaz_ya_da_arsiv`, `ciplak_ya_da_uygunsuz`, `yazi_logo_baskin`, `hassas_simge`, `dusuk_kalite` false demelidir (bu yolda insan ve yer engel değildir; kişi için yalnız haberin öznesi olan kamuya mal olmuş kişi). Özne yoksa ya da uygun görsel çıkmazsa eski katı nötr yol (insansız, yersiz) çalışır; o da başarısızsa haber görselsiz yayınlanır. Bir haber için en çok `VL_UST` (4) görsel denetim çağrısı yapılır.
- **Bekleyenler:** `bekliyor_gorsel` kayıtları ilk fırsatta saklı yükle, model ve görsel araması yapılmadan görselsiz yayınlanır (tazelik penceresi uygunsa).
- **Özel işler** (alıntı, şiir, mitoloji, gökbilim) turun BAŞINDA, haberden AYRI bütçeyle çalışır (`OZEL_CAGRI_UST`, varsayılan 2; çeviri gerektirmeyen iş 0 çağrı). Sırası gelen alanlar denenir; görseli çıkmayan alan sıradakileri tıkamaz (`OZEL_DENEME_UST` 5, yayın tavanı `OZEL_TUR_UST` 2). Özet satırı `ozel=felsefe:yayin,siir:gorsel-yok,gokbilim:apod-hata/yedek-yok/ay-evre-yok,edebiyat+mitoloji:saat-disi` biçiminde her alanın ne yaptığını/neden yapmadığını yazar (`saat-disi` = UTC `OZEL_SAAT` penceresi dışı, `kota-dolu`, `aralik` = son paylaşımdan beri yeterli süre geçmedi, `kapali`). Deneme için `OZEL_SAAT=0-24` pencereyi açar.
- **Gökbilim yedeği:** APOD (DEMO_KEY) hata/yer tutucu verirse ESO "Haftanın Fotoğrafı" / ESA-Hubble / ESO beslemesindeki hazır lisanslı görsel (CC BY 4.0, atıf) + açıklama ile gönderi çıkar; haber döngüsünde aynı haber ikinci kez yazılmaz.
- **Tur verimi:** haber yazımı için gerçek model çağrısı tavanı `MODEL_CAGRI_UST` (14; çağrısız retler harcamaz), önce modelsiz ön puan (saklı yük > iyi-haber sitesi > alan kaynağı > Bing; hazır görsel, tazelik, yeterli özet), çağrılar arası bekleme geçen süre sayılarak (`GEMINI_BEKLEME_MS`), yeni aday alma süresi `TUR_SURE_SN` 420.
- **Ret kodları:** özet satırında `digerKirilim=cumle-sayisi:2,ozel-ad:1,...` (cumle-sayisi, uzun, ozel-ad, baslik, json-bozuk, bos-yanit, kopya, kategori, bicim, kaynak-yetersiz). Boş/kesik model yanıtı artık kalıcı ret sayılmaz (bir kez yeniden denenir); JSON'daki dize içi çıplak satır sonu onarılır; özel ad şüphesinde bir kez baştan yazdırılır.

## Hacim turu (2026-10-13)

- **Kaynaklar:** 40 besleme (spor TR 5, sanat 9, bilim/teknoloji/gökbilim 17, iyi haber 7). Donmuş besleme çıkarıldı (eso haber 55 gün, esahubble 8 gün, TRT spor ve kültür-sanat fiilen durmuş, openculture 503). Ölçüm ve çıkarma nedenleri `kaynaklar.json` `eklenmeyenler`. Tüm yeni kaynaklarda `kosul: dogrulanamadi` (koşul sayfaları okunmadı; yalnız RSS başlık+özet kullanılır, metin yeniden yazılır, bağlantı verilir) — sahip onayı bekliyor.
- **RSS:** öğeler tarihe göre EN YENİ ÖNCE alınır (TRT/Hürriyet en eskiyi başa koyuyordu: ilk 12 öğe hep eski çıkıyordu); özet = description ile `content:encoded`'in uzunu (1500 karakter); "The post ... appeared first on" kuyruğu atılır; saat dilimi hatalı (4 saate kadar gelecek) tarih şimdiye çekilir. Sayfa metni az ise meta açıklama + JSON-LD `articleBody` yedek metin olur. `kaynak-yetersiz` eşiği: sayfa+özet toplamı 250 karakter.
- **Tazelik:** spor 24 saat; iyi haber / sanat / bilim / teknoloji 48-96 saat (kaynak başına `tazelik_saat`). Özet satırında `taze=` (yeni - eski) eklendi. Spor ön elemesi: galibiyet/şampiyonluk/madalya/rekor işaretleri genişledi; yenilgi, elenme, transfer, sakatlık, hakem ret.
- **Model:** istem rakam (yıl dahil) ve yazım denetimi kuralları taşır; doğrulama yazıyla yıl ("bin dokuz yüz...", "two thousand twenty") ve bilinen bozuk kelimeleri (yürütülüğünde, alıkanlık, -ğind sonu) reddeder; kopya, dil, rakam, yazım retlerinde nedene özel istemle BİR kez yeniden yazdırılır (çağrı bütçesine sayılır).
- **Görsel:** özne adı kademeli sadeleşir (tam ad, sponsorsuz ad, ayırt edici ilk ad; etkinlik adları kısaltılmaz), en çok 6 Commons araması; takım için logo/arma/forma elenir, stadyum/takım/maç fotoğrafı tercih. Nötr yolda Commons metni haberde geçmeyen kurum/şehir/ülke adı taşıyorsa görsel elenir; zirve/kongre/festival/tören haberlerinde konu görseli aranmaz (özne ya da haberin kendi yeri yoksa görselsiz tasarım kartı).
- **Alıntı:** çeviri TR çıktısı yasak kelime listesinden (tecavüz, ırz, öldür, ölüm, kan, savaş, nefret, lanet ...) ve ikinci filtreden geçer, kalıcı ret = başka alıntıya geçilir (tur başına 3 alıntı denenir, `OZEL_CAGRI_UST` varsayılan 4); seçimde cinsiyet/sınıf genellemesi, "lords of creation" gibi deyimler, alaycı ton, arkaik dil (thou/hath), bağlamsız başlayan (He/But/This...) ve 260 karakterden uzun alıntılar elenir, umut/merak/emek/doğa/dostluk temalılar öne alınır. Çeviri istemi: doğal bugünkü Türkçe, kelime kelime çevirme, anlam bozuluyorsa uygun=false.
- **Alan kotaları (24 saat):** spor 22, sanat 16, bilim 18, teknoloji 14, gökbilim 5 (GitHub `vars.ALAN_KOTALARI` tanımlıysa o geçerlidir, silinmeli ya da güncellenmeli).
- **Tur ayarı:** `TUR_BASINA_EN` 4 ve `MODEL_CAGRI_UST` 14 korundu. Cron 20 dakikada bir = 72 tur/gün; 60-100 haber için tur başına ortalama 1-1,4 haber yeter; çağrı = yazım ~1,3 x yayın adayı + görsel denetim ~1,5 x yayın, yaklaşık 350-450 çağrı/gün. Gemini ücretsiz katman sınırları doğrulanmadı (yukarıya bak); günlük sınır 250'nin altındaysa `MODEL_CAGRI_UST` 8'e inmeli.

## Fotoğraflı haber oranı (2026-10-13)

- **Görsel sırası:** kurumun kendi görseli -> ÖZNE (Commons, sonra Openverse; model `gorsel_ozne` vermediyse haberdeki `yer_kurum_adi` tür "yer" olarak YEDEK özne) -> KONU (modelin `gorsel_arama` somut nesne terimi, ardından daha genel `gorsel_arama2`; Commons, sonra Openverse) -> Pixabay / Pexels (anahtar varsa) -> görselsiz. Her adım yalnız öncekinden aday çıkmazsa/denetimden geçmezse çalışır; bir haber için en çok `VL_UST` (4) görsel denetimi (özne yoluna en çok 2 + 1, konu yoluna en az 1 hak kalır).
- **Openverse:** `api.openverse.org/v1/images`, anahtarsız anonim (dakikada 20, günde 200 istek); `license=cc0,pdm,by,by-sa` (ND/NC yok), `mature=false`, `category=photograph`, jpg/png, özgün genişlik >= 1000 px, hassas işaretli sonuçlar atılır. Tur başına en çok `OPENVERSE_TUR_UST` (6) istek; 429 ya da günlük hak < 15 olunca tur boyunca durur. İsteğe bağlı ücretsiz kayıt (`OPENVERSE_CLIENT_ID` + `OPENVERSE_CLIENT_SECRET`) günlük sınırı yükseltir (doğrulanmadı). Anonim günlük 200 istek, 20 dakikalık turlarda her tura ~2-3 istek eder: Openverse yalnız Commons sonuç vermezse devreye girer.
- **Pexels:** `PEXELS_API_KEY` varsa yedek kaynak ("Pexels License", atıf saklanır). Anahtar yoksa sessizce atlanır. NOT: `haber-yukle` Edge Function'ının `LISANS_OK` ifadesi (functions/haber-yukle/index.ts:26) "Pexels License"ı da kabul edecek biçimde güncellenip yeniden dağıtılmadıkça Pexels görselli haber reddedilir; o zamana dek `PEXELS_API_KEY` tanımlamayın.
- **Kural tabanlı sıralama:** başlıkta terim örtüşmesi, yatay oran, çözünürlük, yeni tarih; çizim/vektör/harita/şema/logo ve siyah-beyaz etiketli adaylar elenir, PNG cezalıdır. İki kelimelik terimde ikisi de geçmeli.
- **Görsel denetimi:** `konuya_uygun` artık "konuyu temsil eden, yanıltıcı olmayan görsel" kabul eder; güvenlik alanları ve yer/kurum çelişkisi AYNEN durur. Özet satırında `vlRet=n.konu:3,n.insan:1,o.ozne-yok:2` (n = konu yolu, o = özne yolu) ve `gorselKaynak=wikimedia:2,openverse:1` görünür.

## Toplu ön sınıflandırma ve karar bütçesi (2026-10-13)

Sorun: tur başına model çağrı tavanı 14; canlı ölçümde tipik turda `modelCagri=14 modelRed=7(uygunDegil=3,rakam=2,dil=1,filtre=1)` ve yalnız 1-2 haber yayınlanıyordu. "Uygun değil" çıkacak bir haber de tam bir yazım çağrısı harcıyordu. Çözüm: ön puana göre sıralı ilk `ON_SINIF_ADET` (24) aday, yazımdan ÖNCE TEK ucuz çağrıda sınıflandırılır (`lib/on_sinif.mjs`).

- **Girdi (küçük):** aday başına sıra no, dil, alan, kaynak, başlık, özet (en çok 300 karakter). Sayfa metni yok. 24 aday yaklaşık 3-4 bin girdi jetonu; yazım çağrısı başına gönderilen kaynak metninden çok azdır.
- **Çıktı:** katı JSON dizi `[{"i":1,"uygun":true,"puan":7,"alan":"doga","neden":"ok"}]`. `uygun` OP kuralları (yalnız pozitif/umut veren/nötr-olumlu; siyaset, din, etnik kimlik, şiddet, kaza, felaket, ölüm, suç, skandal, reklam, liste/tavsiye, burç, bahis YOK); `puan` 0-10 (haber değeri + pozitiflik + güncellik + somutluk); `neden` kısa kod (`siyaset, din, etnik, siddet, kaza, felaket, olum, suc, skandal, reklam, liste, burc, bahis, negatif, haber-degil, diger`; eşik altı = `dusuk-puan`). Alan kaynaklı adaylarda (spor, sanat, bilim, teknoloji, gökbilim) mutlu haber şartı aranmaz.
- **Kod kararı:** yalnız `uygun && puan >= ON_SINIF_ESIK` (6) olanlar yazıma girer; puana göre sıralanır, alan dengesi (`ALAN_ARDA_ARDA_UST`) korunur. Reddedilenler `elendi: on-sinif:<neden>` işaretlenir ve bir daha sorulmaz. Yanıtta eksik kalan aday elenmez (sınıfsız sayılır).
- **Dışında kalanlar:** saklı yüklü bekleyen kayıtlar (modelsiz yayın), ikinci kaynağı henüz doğrulanmamış adaylar ve özel işler (alıntı/gökbilim) bu adıma girmez. 3'ten az aday varsa toplu çağrı atlanır.
- **Yedek yol:** çağrı hatası ya da bozuk JSON'da bir kez yeniden denenir; yine olmazsa sınıflandırmasız eski sıra sürer (tur kırılmaz, özet satırında `onSinif=yedek`). 429 gelirse tur zarifçe biter (`durus=kota`).
- **Bütçe:** bu çağrı (yeniden deneme dahil) `MODEL_CAGRI_UST` bütçesinden sayılır.
- **Yazım istemi:** `uygun` kararı yazım çağrısında AYNEN durur (ikinci emniyet); ön sınıftan geçmiş adayda yalnız "ön sınıf uygun buldu, açık ihlal yoksa uygun=true ver" ipucu eklenir.

Ortam değişkenleri: `ON_SINIF_ADET` (varsayılan 24, 0 = kapalı, en çok 60), `ON_SINIF_ESIK` (varsayılan 6, 0-10).

Özet satırı: `onSinif=gecen/sorulan` (ya da `onSinif=yedek`), `onSinifRed=liste:3,siyaset:2,dusuk-puan:1` (ret kodu kırılımı), `cagriBasinaYayin=` (bu turda yayınlanan haber / model çağrısı; özel işler ve görsel denetimi hariç). Başarı ölçütü bu sayının artmasıdır.

### Karar bütçesi: hangi karar nerede verilir

| Karar | Nerede | Maliyet |
|---|---|---|
| Tarih/tazelik, görülmüş bağlantı, tekrar haber | kod (`on_eleme.mjs`, `rss.mjs`) | ücretsiz |
| Hassas konu (siyaset, din, etnik, savaş/suç, afet, salgın), kaba dil, bahis, reklam, burç | kod (`on_eleme.mjs`, `moderasyon.mjs`, `alanlar.mjs`) | ücretsiz |
| Haber olmayan içerik: tavsiye/ipucu/liste/"nasıl yapılır"/"tarihte bugün" (başlık kalıbı) | kod (`on_eleme.haberOlmayan`, ön elemede `liste`; model çıktısında `haber değil kapısı`) | ücretsiz |
| İkinci bağımsız kaynak (doğrulama) | kod (`dogrulandiMi`) | ücretsiz |
| Ön puan sıralaması (kaynak güveni, tazelik, özet uzunluğu, hazır görsel) | kod (`onPuan`) | ücretsiz |
| Rakam, kopya, dil, yazıyla yıl, bozuk/harfi düşmüş kelime, çevrilmiş özel ad şüphesi, cümle sayısı | kod (`dogrula.mjs`) | ücretsiz (ret olursa yazım çağrısı zaten harcanmıştır) |
| Uygunluk + haber değeri puanı (24 adayda tek seferde) | TOPLU UCUZ ÇAĞRI (`on_sinif.mjs`) | tur başına 1 çağrı (hata olursa 2) |
| Haber yazımı (TR + EN), kategori, görsel arama terimi, ikinci emniyet olarak uygunluk | TAM YAZIM ÇAĞRISI (`yaz.mjs`) | aday başına 1-2 çağrı (+ özel ad/başlık düzeltme gerekirse 1) |
| Görsel uygunluğu | görsel denetim çağrısı (`gorsel.mjs`, `VL_UST`) | görsel adayı başına 1 (ayrı sayılır) |
| Alıntı çevirisi | özel iş çağrısı (`OZEL_CAGRI_UST`) | ayrı bütçe |

Beklenen tasarruf (varsayım: canlı ölçüm, tur başına 14 çağrının 3'ü "uygunDegil", yalnız kalanlar yayınlanıyor): ön sınıf 1 çağrıya mal olur, "uygun değil" ve düşük puanlı adayların çoğunu yazımdan önce eler (varsayım: 3 çağrıdan ~2,5'i kurtulur) ve kalan bütçeyi daha somut, yüksek puanlı adaylara bırakır. Net kazanç tur başına ~1,5-2,5 yazım çağrısı (yaklaşık %10-18), yayın/çağrı oranında kabaca %15-30 artış beklenir; kesin sayı canlı turlarda `cagriBasinaYayin` ve `onSinifRed` ile ölçülür (bu hesap canlıda doğrulanmadı).

## Altın örnek seti (regresyon)

`test/altin/ornekler.json` (etiketli örnekler, gruplar a-h) + `test/altin/ortak.json` (ortak senaryo) + `test/altin.test.mjs`: sahibin ve şefin canlıda yakaladığı hatalar KALICI testtir. a: kelime kelime çevrilmiş özel ad ("Çizgide Uzlaş"), b: harfi düşmüş Türkçe, c: yazıyla yıl, d: bozuk kelime, e: yanlış yer görseli, f: alıntı çevirisi/seçimi ("tecavüz", "lords of creation", cinsiyet genellemesi), g: haber olmayan içerik (tavsiye/liste). Her grupta DOĞRU geçmesi gereken karşı örnekler de vardır. Yeni canlı hata bulununca ÖNCE bu dosyaya örnek eklenir (test kırmızı), sonra kural yazılır.
