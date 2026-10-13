// OP Sohbet hesabının elle hazırlanmış, kod tarafından doğrulanan içerik havuzları (test/sohbet.test.mjs her satırı denetler: soruyla biter, <= 280 karakter, birinci tekil kişi yok, moderasyon temiz).
// Dürüstlük kuralı (şef kararı 2026-10-13): hesap OP'nin kendisidir; uydurma kişisel deneyim YOKTUR ("bugün sahilde yürüdüm" gibi). Metinler topluluğa soru soran bir sunucunun dilindedir ("siz" kipi).
// Din, siyaset, etnik kimlik, dinî/milli gün (bayram, 23 Nisan vb.), marka/mekân reklamı, şarkı sözü alıntısı YOK.

// ---------- (i) hava + yer: şehir, koordinat (Open-Meteo) ve doğrulanmış semt/sahil/park adları
// Her yer adı Türkçe Vikipedi'de maddesi bulunan gerçek bir yerdir (2026-10-13 denetimi: Bostancı, Caddebostan, Moda, Emirgân Korusu, Yıldız Parkı, Belgrad Ormanı, Fenerbahçe Parkı, Validebağ Korusu, Bebek, Kuzguncuk, Büyükada, Kalamış, Çengelköy,
// Kuğulu Park, Göksu Parkı, Gençlik Parkı, Seğmenler Parkı, Eymir Gölü, Mogan Gölü, Altınpark, Kordon, Alsancak, Karşıyaka, Bostanlı, Kültürpark, Güzelbahçe, İnciraltı, Urla, Foça, Konyaaltı, Kaleiçi, Düden Şelalesi, Bursa Botanik Parkı, Uludağ, Cumalıkızık, Gölyazı).
// ad: metinde geçen biçim, de: "-de" hâli (sahilinde), ara: Commons fotoğraf aramasında kullanılan ad (yalnız Latin harfli, özne olarak aranır).
export const SEHIRLER = [
  { ad: "İstanbul", de: "İstanbul'da", en: "Istanbul", lat: 41.01, lon: 28.97, yerler: [
    { ad: "Bostancı sahili", de: "Bostancı sahilinde", ara: "Bostanci" }, { ad: "Caddebostan sahili", de: "Caddebostan sahilinde", ara: "Caddebostan" },
    { ad: "Moda sahili", de: "Moda sahilinde", ara: "Moda Kadikoy" }, { ad: "Emirgân Korusu", de: "Emirgân Korusu'nda", ara: "Emirgan Park" },
    { ad: "Yıldız Parkı", de: "Yıldız Parkı'nda", ara: "Yildiz Park" }, { ad: "Belgrad Ormanı", de: "Belgrad Ormanı'nda", ara: "Belgrad Forest" },
    { ad: "Fenerbahçe Parkı", de: "Fenerbahçe Parkı'nda", ara: "Fenerbahce Park" }, { ad: "Validebağ Korusu", de: "Validebağ Korusu'nda", ara: "Validebag" },
    { ad: "Bebek sahili", de: "Bebek sahilinde", ara: "Bebek Bosphorus" }, { ad: "Kuzguncuk", de: "Kuzguncuk'ta", ara: "Kuzguncuk" },
    { ad: "Büyükada", de: "Büyükada'da", ara: "Buyukada" }, { ad: "Kalamış", de: "Kalamış'ta", ara: "Kalamis" }, { ad: "Çengelköy", de: "Çengelköy'de", ara: "Cengelkoy" } ] },
  { ad: "Ankara", de: "Ankara'da", en: "Ankara", lat: 39.93, lon: 32.86, yerler: [
    { ad: "Kuğulu Park", de: "Kuğulu Park'ta", ara: "Kugulu Park" }, { ad: "Göksu Parkı", de: "Göksu Parkı'nda", ara: "Goksu Park Ankara" },
    { ad: "Gençlik Parkı", de: "Gençlik Parkı'nda", ara: "Genclik Park Ankara" }, { ad: "Seğmenler Parkı", de: "Seğmenler Parkı'nda", ara: "Segmenler Park" },
    { ad: "Eymir Gölü", de: "Eymir Gölü'nde", ara: "Eymir Lake" }, { ad: "Mogan Gölü", de: "Mogan Gölü'nde", ara: "Mogan Lake" }, { ad: "Altınpark", de: "Altınpark'ta", ara: "Altinpark" } ] },
  { ad: "İzmir", de: "İzmir'de", en: "Izmir", lat: 38.42, lon: 27.14, yerler: [
    { ad: "Kordon", de: "Kordon'da", ara: "Kordon Izmir" }, { ad: "Alsancak", de: "Alsancak'ta", ara: "Alsancak" }, { ad: "Karşıyaka sahili", de: "Karşıyaka sahilinde", ara: "Karsiyaka Izmir" },
    { ad: "Bostanlı", de: "Bostanlı'da", ara: "Bostanli" }, { ad: "Kültürpark", de: "Kültürpark'ta", ara: "Kulturpark Izmir" }, { ad: "Güzelbahçe", de: "Güzelbahçe'de", ara: "Guzelbahce" },
    { ad: "İnciraltı", de: "İnciraltı'nda", ara: "Inciralti" }, { ad: "Urla", de: "Urla'da", ara: "Urla" }, { ad: "Foça", de: "Foça'da", ara: "Foca" } ] },
  { ad: "Antalya", de: "Antalya'da", en: "Antalya", lat: 36.9, lon: 30.69, yerler: [
    { ad: "Konyaaltı sahili", de: "Konyaaltı sahilinde", ara: "Konyaalti" }, { ad: "Kaleiçi", de: "Kaleiçi'nde", ara: "Kaleici" }, { ad: "Düden Şelalesi", de: "Düden Şelalesi'nde", ara: "Duden Waterfall" } ] },
  { ad: "Bursa", de: "Bursa'da", en: "Bursa", lat: 40.18, lon: 29.06, yerler: [
    { ad: "Bursa Botanik Parkı", de: "Bursa Botanik Parkı'nda", ara: "Bursa Botanical Park" }, { ad: "Uludağ", de: "Uludağ'da", ara: "Uludag" },
    { ad: "Cumalıkızık", de: "Cumalıkızık'ta", ara: "Cumalikizik" }, { ad: "Gölyazı", de: "Gölyazı'da", ara: "Golyazi" } ] },
];

// hava durumu sınıfı (Open-Meteo WMO kodu): iyi = dışarı soruları; kotu = "evde ne izlenir/okunur"; atla = uyarı düzeyi (fırtına, yoğun yağış, kar, aşırı sıcak/soğuk, sert rüzgâr): hava türü o tur ATLANIR
export const HAVA_KOD = {
  0: ["açık", "clear"], 1: ["çoğunlukla açık", "mostly clear"], 2: ["parçalı bulutlu", "partly cloudy"], 3: ["bulutlu", "cloudy"],
  45: ["sisli", "foggy"], 48: ["sisli", "foggy"], 51: ["çiseli", "drizzly"], 53: ["çiseli", "drizzly"], 55: ["çiseli", "drizzly"], 61: ["hafif yağmurlu", "lightly rainy"], 80: ["hafif sağanaklı", "showery"],
};
export const HAVA_ATLA_KOD = new Set([56, 57, 63, 65, 66, 67, 71, 73, 75, 77, 81, 82, 85, 86, 95, 96, 99]);
export const HAVA_SINIR = { iyiMin: 14, iyiMax: 30, atlaMin: -2, atlaMax: 34, ruzgarAtla: 45, ruzgarIyi: 30 };

// (i) iyi hava şablonları: {sehir_de} {hava} {derece} {yer} {yer_de}. en: İngilizce karşılık ({city} {hava} {derece} {yer})
export const HAVA_IYI = [
  { tr: "Bugün {sehir_de} hava {hava}, {derece} derece. {yer_de} yürüyüş için en sevdiğiniz nokta neresi?", en: "Today in {city} the weather is {hava} at {derece} degrees. Which spot is your favorite for a walk around {yer}?" },
  { tr: "Bugün {sehir_de} hava {hava} ve {derece} derece. Gün batımını izlemek için {yer} çevresinde hangi köşeyi önerirsiniz?", en: "It is {hava} and {derece} degrees in {city} today. Which corner around {yer} would you recommend for watching the sunset?" },
  { tr: "{sehir_de} hava bugün {hava}, termometre {derece} derece gösteriyor. {yer} civarında kısa bir mola için en güzel yer neresi?", en: "The weather in {city} is {hava} today and the thermometer shows {derece} degrees. Where is the best place for a short break around {yer}?" },
  { tr: "{derece} derece ve {hava} bir gün. {sehir_de} dışarıda vakit geçirmek için en güzel semt hangisi?", en: "A {hava} day at {derece} degrees. Which neighborhood in {city} is best for spending time outdoors?" },
  { tr: "Bugün {sehir_de} hava {hava}, {derece} derece. {yer} çevresinde arkadaşlarla ya da ailecek gidilecek keyifli bir yer önerir misiniz?", en: "Today in {city} it is {hava} at {derece} degrees. Can you recommend a nice place around {yer} to visit with friends or family?" },
  { tr: "Bugün {sehir_de} hava {hava} ({derece} derece). {yer_de} yürürken dinlemek için hangi şarkıyı önerirsiniz?", en: "Today in {city} it is {hava} ({derece} degrees). Which song would you recommend listening to while walking around {yer}?" },
];
// (i) hava ılımlı ama dışarıya uygun değil: "evde ne izlenir/okunur". {hava_kotu}
export const HAVA_KOTU = [
  { tr: "Bugün {sehir_de} hava {hava_kotu}, {derece} derece. Evde keyifli vakit geçirmek için hangi filmi önerirsiniz?", en: "Today in {city} it is {hava_kotu} at {derece} degrees. Which movie would you recommend for a cozy time at home?" },
  { tr: "{sehir_de} bugün {hava_kotu} bir gün ({derece} derece). Bu havaya yakışan bir kitap önerir misiniz?", en: "It is a {hava_kotu} day in {city} today ({derece} degrees). Can you recommend a book that suits this weather?" },
  { tr: "Bugün {sehir_de} hava {hava_kotu} ve {derece} derece. Böyle günlerde en çok hangi sıcak içecek ve hangi şarkı iyi gelir?", en: "Today in {city} it is {hava_kotu} at {derece} degrees. Which warm drink and which song do you find best on days like this?" },
  { tr: "{sehir_de} hava {hava_kotu}, {derece} derece. Evde denenecek kolay bir tarif öneren var mı?", en: "The weather in {city} is {hava_kotu} at {derece} degrees. Does anyone have an easy recipe to try at home?" },
];

// ---------- (ii) kültür bilmecesi: [soru, gizli cevap]. YALNIZ ad/yıl/sanatçı düzeyi; şarkı sözü alıntısı YOK; cevap gönderide verilmez.
export const BILMECELER = [
  // Türk edebiyatı
  ["'Çalıkuşu' romanının yazarı kimdir?", "Reşat Nuri Güntekin"], ["'Kürk Mantolu Madonna' hangi yazarımızın romanıdır?", "Sabahattin Ali"],
  ["'Saatleri Ayarlama Enstitüsü' romanının yazarı kimdir?", "Ahmet Hamdi Tanpınar"], ["'Tutunamayanlar' romanını kim yazdı?", "Oğuz Atay"],
  ["'Huzur' romanı hangi yazarımıza aittir?", "Ahmet Hamdi Tanpınar"], ["'Sinekli Bakkal' romanının yazarı kimdir?", "Halide Edib Adıvar"],
  ["'Yaprak Dökümü' hangi yazarımızın romanıdır?", "Reşat Nuri Güntekin"], ["'Aylak Adam' romanını kim yazdı?", "Yusuf Atılgan"],
  ["'Mai ve Siyah' romanının yazarı kimdir?", "Halit Ziya Uşaklıgil"], ["'Araba Sevdası' romanının yazarı kimdir?", "Recaizade Mahmut Ekrem"],
  ["'Fatih-Harbiye' romanının yazarı kimdir?", "Peyami Safa"], ["'Kuyucaklı Yusuf' romanının yazarı kimdir?", "Sabahattin Ali"],
  ["'Şıpsevdi' romanının yazarı kimdir?", "Hüseyin Rahmi Gürpınar"], ["‘İstanbul'u Dinliyorum’ şiiriyle bilinen şairimiz kimdir?", "Orhan Veli Kanık"],
  ["'Seyahatname' adlı geniş gezi yazısı eserinin sahibi kimdir?", "Evliya Çelebi"], ["'Leyla ile Mecnun' mesnevisi hangi divan şairimize aittir?", "Fuzûlî"],
  // dünya edebiyatı
  ["'Küçük Prens' kitabının yazarı olan Fransız pilot-yazar kimdir?", "Antoine de Saint-Exupéry"], ["'Alice Harikalar Diyarında' kitabının yazarı kimdir?", "Lewis Carroll"],
  ["'Robinson Crusoe' romanını kim yazdı?", "Daniel Defoe"], ["'Sefiller' romanının yazarı kimdir?", "Victor Hugo"],
  ["'Bir Yaz Gecesi Rüyası' oyununun yazarı kimdir?", "William Shakespeare"], ["'Don Kişot' romanının yazarı kimdir?", "Miguel de Cervantes"],
  ["'Gurur ve Önyargı' romanının yazarı kimdir?", "Jane Austen"], ["'Pollyanna' kitabının yazarı kimdir?", "Eleanor H. Porter"],
  ["'Heidi' kitabını kim yazdı?", "Johanna Spyri"], ["'Çocuk Kalbi' (Cuore) kitabının yazarı kimdir?", "Edmondo De Amicis"],
  ["‘Tom Sawyer'in Maceraları’ kitabının yazarı kimdir?", "Mark Twain"], ["'Define Adası' romanının yazarı kimdir?", "Robert Louis Stevenson"],
  ["'Küçük Kadınlar' romanının yazarı kimdir?", "Louisa May Alcott"], ["'Yüzyıllık Yalnızlık' romanının yazarı kimdir?", "Gabriel García Márquez"],
  ["'Simyacı' kitabının yazarı kimdir?", "Paulo Coelho"], ["'Harry Potter' serisinin yazarı kimdir?", "J. K. Rowling"],
  ["‘Sophie'nin Dünyası’ romanının yazarı kimdir?", "Jostein Gaarder"], ["'Momo' kitabının yazarı kimdir?", "Michael Ende"],
  ["'Pippi Uzunçorap' kitaplarının yazarı kimdir?", "Astrid Lindgren"], ["'Pinokyo' masalının yazarı kimdir?", "Carlo Collodi"],
  ["'Seksen Günde Devrialem' romanının yazarı kimdir?", "Jules Verne"], ["'Hobbit' kitabının yazarı kimdir?", "J. R. R. Tolkien"],
  ["'Charlie'nin Çikolata Fabrikası' kitabının yazarı kimdir?", "Roald Dahl"], ["'Matilda' kitabının yazarı kimdir?", "Roald Dahl"],
  ["'Yeşilin Kızı Anne' kitap serisinin yazarı kimdir?", "Lucy Maud Montgomery"], ["'Oliver Twist' romanının yazarı kimdir?", "Charles Dickens"],
  ["'Yaşlı Adam ve Deniz' kitabının yazarı kimdir?", "Ernest Hemingway"], ["'Martı' (Jonathan Livingston Seagull) kitabının yazarı kimdir?", "Richard Bach"],
  ["'Peter Pan' hikâyesinin yazarı kimdir?", "J. M. Barrie"],
  // müzik: Türkiye
  ["'Şımarık' şarkısıyla Avrupa'da da tanınan pop sanatçısı kimdir?", "Tarkan"], ["'Gül Pembe' ve 'Dönence' şarkılarıyla hatırladığımız sanatçı kimdir?", "Barış Manço"],
  ["Eurovision'ı 2003'te kazanan Türk sanatçı kimdir?", "Sertab Erener"], ["'Sanat Güneşi' unvanıyla anılan sanatçımız kimdir?", "Zeki Müren"],
  ["'Süperstar' lakabıyla bilinen pop sanatçımız kimdir?", "Ajda Pekkan"], ["'İstanbul'da Sonbahar' şarkısıyla bilinen sanatçı kimdir?", "Teoman"],
  ["'Gülümse' şarkısıyla özdeşleşen, 'Minik Serçe' lakaplı sanatçı kimdir?", "Sezen Aksu"], ["maNga grubu 2010 Eurovision'da kaçıncı oldu?", "ikinci"],
  ["Kenan Doğulu 2007 Eurovision'da Türkiye'yi hangi şarkıyla temsil etti?", "Shake It Up Şekerim"], ["'Sil Baştan' şarkısıyla tanınan rock sanatçısı kimdir?", "Şebnem Ferah"],
  ["'Her Şeyi Yak' şarkısı hangi grubundur?", "Duman"], ["'Kuzu Kuzu' şarkısı hangi sanatçıya aittir?", "Tarkan"],
  ["'Kaybolan Yıllar' şarkısı hangi sanatçımıza aittir?", "Sezen Aksu"], ["'Bir Derdim Var' şarkısı hangi gruba aittir?", "Mor ve Ötesi"],
  // müzik: dünya
  ["'Dört Mevsim' keman konçertolarının bestecisi kimdir?", "Antonio Vivaldi"], ["'Neşeye Övgü' hangi Beethoven senfonisinin finalinde yer alır?", "9. Senfoni"],
  ["'Kuğu Gölü' balesinin bestecisi kimdir?", "Çaykovski"], ["'Fındıkkıran' balesinin bestecisi kimdir?", "Çaykovski"],
  ["Liverpool'da kurulan efsanevi dörtlü hangi gruptur?", "The Beatles"], ["'Bohemian Rhapsody' hangi grubun şarkısıdır?", "Queen"],
  ["'Dancing Queen' hangi İsveç grubunun şarkısıdır?", "ABBA"], ["'Hotel California' hangi grubun şarkısıdır?", "Eagles"],
  ["'Wonderwall' hangi grubun şarkısıdır?", "Oasis"], ["'Fix You' hangi grubun şarkısıdır?", "Coldplay"],
  ["'Someone Like You' şarkısı hangi sanatçıya aittir?", "Adele"], ["2010 Dünya Kupası'nın 'Waka Waka' şarkısını hangi sanatçı seslendirdi?", "Shakira"],
  ["'Happy' şarkısıyla tanınan sanatçı kimdir?", "Pharrell Williams"], ["'La Vie en Rose' şarkısıyla özdeşleşen Fransız şarkıcı kimdir?", "Édith Piaf"],
  ["'Für Elise' parçasının bestecisi kimdir?", "Ludwig van Beethoven"], ["'Boléro' adlı eserin bestecisi kimdir?", "Maurice Ravel"],
  ["'Gymnopédies' parçalarının bestecisi kimdir?", "Erik Satie"], ["'Clair de Lune' parçasının bestecisi kimdir?", "Claude Debussy"],
  ["'Küçük Gece Müziği' (Eine kleine Nachtmusik) hangi bestecinin eseridir?", "Mozart"], ["'Gangnam Style' şarkısıyla dünya çapında ünlenen sanatçı kimdir?", "PSY"],
  ["'Shape of You' şarkısı hangi sanatçıya aittir?", "Ed Sheeran"], ["'Hey Jude' şarkısı hangi gruba aittir?", "The Beatles"],
  // sinema: Türkiye
  ["'Selvi Boylum Al Yazmalım' filminin yönetmeni kimdir?", "Atıf Yılmaz"], ["'Hababam Sınıfı' (1975) filminin yönetmeni kimdir?", "Ertem Eğilmez"],
  ["2014'te Cannes'da Altın Palmiye kazanan 'Kış Uykusu' filminin yönetmeni kimdir?", "Nuri Bilge Ceylan"], ["'Eşkıya' filminde Baran karakterini hangi oyuncu canlandırdı?", "Şener Şen"],
  ["'G.O.R.A.' filminin yazarı ve başrol oyuncusu kimdir?", "Cem Yılmaz"], ["'Vizontele' filminin yönetmeni kimdir?", "Yılmaz Erdoğan"],
  ["'Babam ve Oğlum' filminin yönetmeni kimdir?", "Çağan Irmak"], ["'Gelin' (1973) filminin yönetmeni kimdir?", "Lütfi Ö. Akad"],
  ["'Tosun Paşa' filminin başrol oyuncusu kimdir?", "Kemal Sunal"], ["'Çöpçüler Kralı' filminin başrol oyuncusu kimdir?", "Kemal Sunal"],
  ["'Organize İşler' filminin yönetmeni kimdir?", "Yılmaz Erdoğan"], ["'Sevmek Zamanı' (1965) filminin yönetmeni kimdir?", "Metin Erksan"],
  ["1964'te Berlin Film Festivali'nde Altın Ayı kazanan 'Susuz Yaz' filminin yönetmeni kimdir?", "Metin Erksan"], ["‘Bir Zamanlar Anadolu'da’ filminin yönetmeni kimdir?", "Nuri Bilge Ceylan"],
  // sinema: dünya ve animasyon
  ["'Inception' filminin yönetmeni kimdir?", "Christopher Nolan"], ["'Avatar' filminin yönetmeni kimdir?", "James Cameron"],
  ["'Indiana Jones' serisinin ilk filminin (1981) yönetmeni kimdir?", "Steven Spielberg"], ["'E.T.' filminin yönetmeni kimdir?", "Steven Spielberg"],
  ["'Geleceğe Dönüş' filminin yönetmeni kimdir?", "Robert Zemeckis"], ["1995 yapımı 'Toy Story' hangi stüdyonun ilk uzun metrajlı bilgisayar animasyonudur?", "Pixar"],
  ["'Aslan Kral' (1994) hangi stüdyonun animasyonudur?", "Disney"], ["'Ruhların Kaçışı' ve 'Komşum Totoro' filmlerinin yönetmeni kimdir?", "Hayao Miyazaki"],
  ["'Modern Zamanlar' (1936) filminin yönetmeni ve başrol oyuncusu kimdir?", "Charlie Chaplin"], ["'Cinema Paradiso' filminin yönetmeni kimdir?", "Giuseppe Tornatore"],
  ["'Amélie' filminin yönetmeni kimdir?", "Jean-Pierre Jeunet"], ["Paris'te yemek yapmak isteyen bir farenin öyküsünü anlatan 'Ratatouille' hangi stüdyonun filmidir?", "Pixar"],
  ["'Kayıp Balık Nemo' hangi stüdyonun animasyonudur?", "Pixar"], ["'Shrek' hangi stüdyonun animasyonudur?", "DreamWorks"],
  ["'WALL·E' filminin yönetmeni kimdir?", "Andrew Stanton"], ["'Yukarı Bak' (Up) hangi stüdyonun animasyonudur?", "Pixar"],
  ["'Pamuk Prenses ve Yedi Cüceler' (1937) hangi stüdyonun ilk uzun metrajlı çizgi filmidir?", "Disney"],
  // sanat, mimari, miras
  ["'Mona Lisa' tablosu hangi müzede sergileniyor?", "Louvre"], ["'Yıldızlı Gece' tablosunun ressamı kimdir?", "Vincent van Gogh"],
  ["'Kaplumbağa Terbiyecisi' tablosunun ressamı kimdir?", "Osman Hamdi Bey"], ["'İnci Küpeli Kız' tablosunun ressamı kimdir?", "Johannes Vermeer"],
  ["'Büyük Dalga' (Kanagawa Açıklarında) adlı ünlü baskının sanatçısı kimdir?", "Hokusai"], ["'İzlenim: Gün Doğumu' tablosunun ressamı kimdir?", "Claude Monet"],
  ["Picasso ve Braque hangi sanat akımının öncüleridir?", "Kübizm"], ["'Belleğin Azmi' (erimiş saatler) tablosunun ressamı kimdir?", "Salvador Dalí"],
  ["Eyfel Kulesi 1889 Dünya Fuarı için hangi şehirde yapıldı?", "Paris"], ["Pamukkale travertenleri hangi ilimizdedir?", "Denizli"],
  ["Efes Antik Kenti hangi ilimizin sınırları içindedir?", "İzmir"], ["Nemrut Dağı'ndaki dev heykellerin bulunduğu ilimiz hangisidir?", "Adıyaman"],
  ["Safranbolu evleriyle ünlü ilimiz hangisidir?", "Karabük"], ["Çatalhöyük hangi ilimizdedir?", "Konya"],
  ["Bergama Antik Kenti hangi ilimizdedir?", "İzmir"], ["Aspendos Antik Tiyatrosu hangi ilimizdedir?", "Antalya"],
  ["Truva (Troya) Antik Kenti hangi ilimizdedir?", "Çanakkale"], ["Rembrandt hangi ülkenin ressamıdır?", "Hollanda"],
];
export const BILMECE_ONEKLERI = ["Kültür bilmecesi:", "Küçük bir kültür sorusu:", "Bilgi köşesinden bir soru:", "Cevabı bilenler yazsın:", "Hadi biraz kültür:"];

// ---------- (iii) günün sorusu: genel + gün + mevsim
export const GUNUN_GENEL = [
  "Bu hafta sizi gülümseten küçük şey neydi?", "Bugün içinizi ısıtan bir an oldu mu? Varsa kısaca paylaşır mısınız?", "En sevdiğiniz sabah alışkanlığı nedir?",
  "Bir şehre ilk kez gitseniz ilk hangi sokağı gezmek isterdiniz?", "Çocukluktan hatırladığınız ve hâlâ yüzünüzü güldüren bir oyun hangisi?", "Sizce iyi bir günün en küçük ama en önemli parçası nedir?",
  "Telefonunuzdaki en sevdiğiniz fotoğraf neyi gösteriyor?", "Yakın zamanda öğrendiğiniz ve paylaşmak istediğiniz küçük bir bilgi var mı?", "Bir arkadaşınıza en son hangi güzel sözü söylediniz?",
  "Tek bir yemeği tekrar tekrar yiyebilseniz hangisini seçerdiniz?", "Yürürken en çok hangi şarkıyı dinlemekten keyif alırsınız?", "Evinizde sizi en çok mutlu eden köşe neresi?",
  "Bir günlüğüne bir hobiyi hemen öğrenebilseniz hangisini seçerdiniz?", "Herkesin bir kez okumasını istediğiniz kitap hangisi?", "Sizce en güzel koku hangisi?",
  "Bugün birine teşekkür etmeniz gerekse kime ve neden teşekkür ederdiniz?", "Yeni bir dil öğrenecek olsanız hangisini seçerdiniz?", "En sevdiğiniz mevsim hangisi ve neden?",
  "Bir iyilik zincirini başlatmak için ilk adım ne olurdu?", "Sevdiklerinizle yapabileceğiniz en keyifli ücretsiz etkinlik sizce nedir?", "Bir sanat eserinin içine girebilseniz hangisini seçerdiniz?",
  "Sizi en çok motive eden küçük ritüel nedir?", "Yarın için sizi heyecanlandıran bir şey var mı?", "Uzun bir yolculukta yanınıza alacağınız tek eşya ne olurdu?",
  "Hangi doğa manzarası size huzur verir: deniz, orman, dağ ya da göl?", "Bir günlüğüne her şeyi yavaşlatabilseniz günü nasıl geçirirdiniz?", "Çevrenizde fark ettiğiniz küçük bir iyilik hikâyesi var mı?",
  "Hangi çocukluk yemeği hâlâ aklınıza geldikçe sizi gülümsetir?", "Sizce en iyi dinlenme yöntemi nedir: kitap, yürüyüş, müzik ya da uyku?", "Hafta içi kendinize küçük bir ödül verecek olsanız ne verirdiniz?",
  "Dünyanın herhangi bir yerinde bir gün geçirebilseniz nereyi seçerdiniz?", "Hangi sesi duymak size iyi gelir: yağmur, dalga ya da kuş sesi?", "Bir mahalle kütüphanesi kursanız rafa koyacağınız ilk kitap hangisi olurdu?",
  "Bugün sizi en çok rahatlatan şey ne oldu?", "Bahçenizde ya da balkonunuzda hangi bitkiyi yetiştirmek isterdiniz?", "Küçük bir mutluluk listesi yapsanız ilk üç maddesi ne olurdu?",
  "Sizce komşuluğu güzelleştiren en küçük davranış nedir?", "Gününüzün en verimli saati hangisi: sabah, öğle, akşam ya da gece?", "Bir şehri tanımak için en iyi yol sizce nedir: yürümek, yemek yemek ya da insanlarla konuşmak?",
  "Fotoğraf çekmeyi sever misiniz? En sevdiğiniz kare türü nedir?", "Sizi en çok güldüren hayvan fotoğrafı ya da videosu neydi?", "Bir sokak hayvanıyla en güzel karşılaşmanız neydi?",
  "Evde yetiştirdiğiniz en güzel bitki hangisi?", "Tanımadığınız birinden gördüğünüz en güzel nezaket neydi?", "En son hangi müzeyi gezdiniz ya da hangisini gezmek istiyorsunuz?",
  "Sizce şehrinizde herkesin görmesi gereken en güzel manzara noktası neresi?", "Bir akşam yemeğine tarihten ya da bugünden bir bilim insanı veya sanatçı davet etseniz kimi seçerdiniz?",
  "Yeni bir mahalleye taşınsanız ilk keşfedeceğiniz yer neresi olurdu?", "Sizi yarına umutla baktıran ses hangisi?", "Küçükken en sevdiğiniz çizgi film hangisiydi?",
  "Sizce hayatı kolaylaştıran en küçük buluş hangisi?", "Hangi mutfak kokusu sizi çocukluğunuza götürür?", "Bir akşam piyano, gitar ya da keman çalabilseniz hangi parçayı seçerdiniz?",
  "Gökyüzüne bakmayı sever misiniz? Bulut, yıldız ya da gün batımı, hangisi?", "Bir gün ücretsiz bir ders verecek olsanız hangi konuyu anlatırdınız?", "Hangi kuş türünü görmeyi çok isterdiniz?",
  "Sizi en çok heyecanlandıran bilimsel keşif hangisi?", "Bir gün boyunca ekransız kalsanız o günü nasıl geçirirdiniz?", "Mahalleniz için küçük bir proje başlatsanız bu ne olurdu?",
  "Hangi küçük jest bir insanın gününü değiştirebilir sizce?",
  "Hafta sonunu daha güzel yapan küçük bir ayrıntı sizce nedir?", "Bir komşunuzun size en son yaptığı güzel jest neydi?", "Yeni bir yere giderken yanınıza hangi müziği alırsınız?",
  "Evde sevdiklerinizle oynanacak en eğlenceli oyun sizce hangisi?", "Sizce bir günü güzelleştiren en küçük sürpriz nedir?", "Kuş sesiyle uyanmak mı, çalar saatle mi? Sizce hangisi daha iyi?",
  "Bir kitabın ilk cümlesi sizi hiç yakaladı mı? Hangisiydi?", "Yürüyüş yaparken en çok neye bakarsınız: gökyüzüne, ağaçlara, insanlara ya da vitrinlere?", "Mahallenizdeki en eski ağaç ya da en güzel bina hangisi?",
  "Bir gün için her şeyi ücretsiz yapabilseniz şehrinizde hangi etkinliği düzenlerdiniz?", "Sevdiğiniz bir yazar ya da şaire bir soru sorabilseniz ne sorardınız?", "Bu hafta öğrendiğiniz yeni bir kelime ya da bilgi var mı?",
];
export const GUNUN_GUN = {
  1: ["Pazartesi sabahını daha güzel yapan küçük bir alışkanlığınız var mı?", "Yeni haftaya başlarken kendinize hangi küçük hedefi koyuyorsunuz?", "Pazartesi enerjisi için en iyi şarkı sizce hangisi?",
    "Haftanın ilk gününde sizi en çok motive eden şey nedir?", "Yeni hafta için listenizin en başında hangi güzel plan var?", "Pazartesi kahvaltısında olmazsa olmazınız nedir?"],
  3: ["Haftanın ortasında kendinize ayırdığınız bir mola var mı?", "Hafta ortasında sizi toparlayan küçük şey nedir?", "Çarşamba günü size güç veren bir şarkı ya da söz var mı?"],
  4: ["Perşembe akşamı için küçük bir plan önerisi olan var mı?", "Haftanın yarısından fazlası geride kaldı: şimdiye kadarki en güzel anı hangisiydi?"],
  5: ["Cuma akşamını en iyi nasıl geçirirsiniz: film, yürüyüş, sofra ya da arkadaş buluşması?", "Hafta sonu planınızın ilk sırasında ne var?", "Cuma günü sizi en çok gülümseten şey nedir?",
    "Bu hafta kendinize hangi küçük ödülü verdiniz?", "Hafta sonu için bir kitap, film ya da yürüyüş rotası önerisi olan var mı?", "Cuma akşamı için en sevdiğiniz müzik türü hangisi?"],
  6: ["Cumartesi sabahını nasıl başlatırsınız?", "Hafta sonu kahvaltısında vazgeçilmeziniz nedir?", "Cumartesi günü şehirde ücretsiz yapılabilecek en güzel etkinlik sizce nedir?",
    "Hafta sonu bir günlüğüne tatil yapsanız nereyi seçerdiniz?", "Cumartesi gezmesi için en sevdiğiniz semt ya da sokak neresi?"],
  0: ["Pazar gününü yavaş yavaş geçirmenin olmazsa olmazı nedir?", "Pazar akşamı haftaya hazırlanırken size iyi gelen küçük bir ritüel var mı?", "Pazar sofranızın vazgeçilmez lezzeti nedir?",
    "Pazar günü uzun bir yürüyüşe çıksanız nereyi seçerdiniz?", "Pazar günü okumak, izlemek ya da dinlemek için ayırdığınız şey nedir?"],
};
export const GUNUN_MEVSIM = {
  ilkbahar: ["İlkbaharın ilk işareti sizce nedir: çiçekler, kuş sesleri ya da uzayan günler?", "Bahar geldiğinde yapmayı en çok istediğiniz şey nedir?", "Baharda en sevdiğiniz çiçek hangisi?",
    "Bahar temizliği yapmayı sever misiniz? En keyifli yanı sizce ne?", "Baharda ilk pikniği nerede yapmak isterdiniz?", "İlkbaharda hangi meyveyi ya da sebzeyi sabırsızlıkla beklersiniz?",
    "Hava ısınınca ilk yürüyüşünüzü hangi rotada yaparsınız?", "Baharın en güzel kokusu sizce hangisi?", "Baharda fidan ya da çiçek dikecek olsanız ne dikerdiniz?",
    "Yağmurlu bir bahar gününü nasıl güzelleştirirsiniz?", "Bahar aylarında doğada hangi manzarayı seyretmeyi seversiniz?", "Baharda fotoğraf çekecek olsanız hangi kareyi yakalamak isterdiniz?",
    "Uzayan günlerle birlikte akşamları ne yapmayı seversiniz?", "Bahar şarkısı denince aklınıza ilk gelen eser hangisi?"],
  yaz: ["Yazın en güzel yanı sizce nedir?", "Sıcak bir günde ferahlamak için ilk tercihiniz nedir?", "Yaz akşamlarında balkonda ya da bahçede ne yapmayı seversiniz?",
    "Deniz mi, göl mü, akarsu mu? Yaz tatili için hangisini seçerdiniz?", "Yazın en sevdiğiniz meyve hangisi?", "Yaz tatilinde okunacak kitap listenize hangi kitabı eklerdiniz?",
    "Yaz gecelerinde yıldız izlemeyi sever misiniz? Nereden izlemek isterdiniz?", "Yaz mevsiminin sesi sizce nedir: ağustos böceği, dalga ya da çocuk kahkahası?", "Yaz tatilinde yapılabilecek en keyifli ücretsiz aktivite sizce nedir?",
    "Yazın serinlemek için en sevdiğiniz içecek nedir?", "Güneş doğarken uyanıp yapacağınız ilk şey ne olurdu?", "Yaz akşamı yürüyüşünün en güzel durağı sizce neresi?",
    "Yaz için bir şarkı seçecek olsanız hangisi olurdu?", "Bu yaz denemek istediğiniz yeni bir hobi var mı?"],
  sonbahar: ["Sonbaharın en güzel renkleri sizce hangileri?", "Sonbahar yürüyüşü için en sevdiğiniz park ya da orman neresi?", "Yağmurlu bir sonbahar gününde sıcak bir içecekle ne yapmayı seversiniz?",
    "Sonbaharda hangi yemek ya da çorba aklınıza ilk gelir?", "Yaprak toplamak ya da yaprak fotoğrafı çekmek hoşunuza gider mi?", "Sonbahar için bir kitap ya da film seçecek olsanız hangisi olurdu?",
    "Sonbaharın kokusunu nasıl anlatırdınız?", "Sonbahar akşamlarında sizi en çok hangi müzik ısıtır?", "Okulların açıldığı günlerden hatırladığınız en güzel şey nedir?",
    "Bu sonbahar kendinize verdiğiniz küçük bir söz var mı?", "Sonbaharda hangi meyveyi sabırsızlıkla beklersiniz: nar, ayva, elma ya da kestane?", "Sonbahar gününde şehirde yapılacak en güzel şey sizce nedir?",
    "Gün kısalırken akşamları nasıl keyifli hale getirirsiniz?", "Sonbahar ışığında fotoğraf çekilecek en güzel yer sizce neresi?"],
  kis: ["Kışın sizi en çok ısıtan şey nedir?", "İlk kar yağdığında yapacağınız ilk şey ne olurdu?", "Kış akşamlarının vazgeçilmez içeceği sizce hangisi?",
    "Soğuk bir günde evde izlenecek en güzel film hangisi?", "Kışın en çok hangi çorbayı tercih edersiniz?", "Karlı bir manzarada yürümeyi sever misiniz? Nerede olmak isterdiniz?",
    "Kış mevsiminde okumak için hangi kitabı önerirsiniz?", "Kış günlerinde pencere kenarında ne yapmaktan keyif alırsınız?", "Kışın doğada kuşlara yem bırakmak güzel bir iyilik olur mu? Başka hangi küçük iyilikler yapılabilir?",
    "Kar yağınca çocukluğunuzdan aklınıza gelen ilk şey nedir?", "Soğuk havalarda ev yapımı bir tarif paylaşmak isterseniz hangisi olurdu?", "Kış gecesi için bir şarkı seçecek olsanız hangisi olurdu?",
    "Kışın battaniye, sıcak çorba ya da kitap, sizi en çok hangisi rahatlatır?", "Soğuk bir sabah güne nasıl başlamayı seversiniz?"],
};

// ---------- (iv) öneri isteği
export const ONERILER = [
  "Bu hafta sonu için bir kitap önerisi: sizi bir çırpıda okutan kitap hangisiydi?", "Kısa sürede bitirilebilecek, içinizi açan bir roman önerir misiniz?",
  "Hiç sıkılmadan okuduğunuz bir bilim kitabı var mı? Önerir misiniz?", "Çocuklarla birlikte okunabilecek güzel bir kitap önerisi olan var mı?",
  "Şiir sevenler için başucu şiir kitabı önerisi var mı?", "Okumaya yeni başlayanlara hangi kitabı önerirsiniz?", "Bir günde okunabilecek kısa bir hikâye kitabı önerir misiniz?",
  "Bu akşam izlemek için iç ısıtan bir film önerisi olan var mı?", "Tüm aileyle izlenebilecek bir film önerir misiniz?", "Sizi güldüren eski bir Yeşilçam filmi hangisi?",
  "Belgesel sevenler için doğa ya da bilim belgeseli önerisi var mı?", "Hafta sonu maratonu için bir dizi önerir misiniz?", "Yetişkinlerin de keyifle izleyeceği bir animasyon film önerir misiniz?",
  "Müzikal ya da dans filmleri arasında favoriniz hangisi?", "Hafta sonu için doğada kolay bir yürüyüş rotası önerisi olan var mı?", "Şehrin içinde kısa bir yürüyüş için en güzel sokak ya da sahil hangisi?",
  "Bisikletle gezilecek güzel bir rota önerir misiniz?", "Gün batımını izlemek için en güzel nokta sizce neresi?", "Çocuklarla gezilecek ücretsiz ya da düşük maliyetli bir park önerir misiniz?",
  "Fotoğraf çekmek için en güzel semt sizce neresi?", "İlk kez gelen bir misafire şehrinizde göstereceğiniz ilk yer neresi olurdu?", "Pazar kahvaltısı için kolay ve lezzetli bir tarif önerisi var mı?",
  "Hafta içi akşam yemeğine yetişen pratik bir tarifiniz var mı? Paylaşır mısınız?", "Kış günlerine yakışan sıcak bir çorba tarifi önerir misiniz?", "Yaz sıcağında serinleten kolay bir tatlı tarifi var mı?",
  "Evde yapılabilecek sağlıklı bir atıştırmalık tarifi önerir misiniz?", "Kahvaltı sofrasını şenlendiren basit bir tarif hangisi?", "Yürüyüşe çıkarken dinlenecek bir albüm ya da çalma listesi önerir misiniz?",
  "Çalışırken dinlenecek sözsüz bir müzik önerisi olan var mı?", "Dinlemekten keyif aldığınız bir podcast önerir misiniz?", "Yeni bir enstrüman öğrenmek isteyenlere hangisini önerirsiniz?",
  "Evde yapılabilecek sakinleştirici bir hobi önerir misiniz?", "Ücretsiz ya da uygun bir sergi ya da müze önerisi olan var mı?", "Yeni başlayanlar için kolay bir el işi ya da çizim önerisi var mı?",
  "Mahallede gönüllü olmak isteyenlere nereden başlamalarını önerirsiniz?", "Bahçe ya da balkon için bakımı kolay bir bitki önerir misiniz?", "Evde yapılacak küçük bir deney ya da bilim etkinliği öneriniz var mı?",
  "Çocuklarla evde yapılabilecek yaratıcı bir oyun önerir misiniz?", "Gününüzü rahatlatan bir nefes ya da esneme alışkanlığı varsa paylaşır mısınız?", "Hafta sonu için küçük bir kaçamak önerisi olan var mı: deniz, orman ya da göl?",
  "Yeni bir dil öğrenmek isteyenlere hangi yöntemi önerirsiniz?", "Kelime oyunlarını sevenler için bir oyun önerir misiniz?",
];

export const SOHBET_BASLIK = {
  hava: { tr: (c) => `${c} için bir soru`, en: (c) => `A question about ${c}` },
  gunun: { tr: () => "Günün sorusu", en: () => "Question of the day" },
  bilmece: { tr: () => "Kültür bilmecesi", en: () => "Culture quiz" },
  oneri: { tr: () => "Öneri zamanı", en: () => "Recommendation time" },
};
