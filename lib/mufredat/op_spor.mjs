// op_spor: OP müfredat verisi (motor Vikipedi kaynağından yazar; doğrulama: arac/mufredat_dogrula.mjs op_spor --kaynak --yaz). Yalnız EĞİTİCİ ders serileri: spor dallarının tarihi, kuralları, malzemesi, temel kavramları.
// Güncel spor haberleri bu müfredata GİRMEZ (haber gönderisinde `seri` alanı yoktur). Fitness/kalistenik/pilates derslerinde egzersiz programı, set/tekrar, kilo ya da kas vaadi YOKTUR. Her derste `alt_konu` (lib/alt_konu.mjs spor dalı) vardır.
export default {
 "hesap": "op_spor",
 "kategori": "spor",
 "gunlukUst": 2,
 "seriler": [
  {
   "yol": [
    "Spor Dalları",
    "Sporun Temelleri"
   ],
   "aciklama_tr": "Spor dallarına girişten önce sporun ne olduğunu, olimpiyatları ve ortak kavramları tanıtır.",
   "aciklama_en": "Introduces what sport is, the Olympic Games and shared basic ideas before the individual disciplines.",
   "dersler": [
    {
     "id": "spor-nedir",
     "baslik_tr": "Spor Nedir?",
     "baslik_en": "What Is Sport?",
     "kaynak": {
      "wiki_en": "Sport",
      "wiki_tr": "Spor"
     },
     "odak_tr": "Sporu, kurallı ve genellikle bedensel beceriye dayanan etkinlik olarak tanımla; bireysel ve takım sporlarını ayır.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "olimpiyat-komitesi",
     "baslik_tr": "Uluslararası Olimpiyat Komitesi",
     "baslik_en": "The International Olympic Committee",
     "kaynak": {
      "wiki_en": "International Olympic Committee",
      "wiki_tr": "Uluslararası Olimpiyat Komitesi"
     },
     "odak_tr": "Komitenin olimpiyat oyunlarını düzenleyen kuruluş olduğunu sade anlat; yalnız kurum bilgisi ver.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "paralimpik-oyunlar",
     "baslik_tr": "Paralimpik Oyunlar",
     "baslik_en": "The Paralympic Games",
     "kaynak": {
      "wiki_en": "Paralympic Games",
      "wiki_tr": "Paralimpik Oyunlar"
     },
     "odak_tr": "Paralimpik Oyunları engelli sporcuların katıldığı uluslararası spor buluşması olarak, saygılı ve olgusal bir dille anlat.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "takim-sporu",
     "baslik_tr": "Takım Sporu",
     "baslik_en": "Team Sports",
     "kaynak": {
      "wiki_en": "Team sport",
      "wiki_tr": "Takım sporu"
     },
     "odak_tr": "Takım sporlarında oyuncuların ortak hedef için birlikte oynadığını ve görev paylaştığını örneklerle anlat.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "sportmenlik",
     "baslik_tr": "Sportmenlik",
     "baslik_en": "Sportsmanship",
     "kaynak": {
      "wiki_en": "Sportsmanship",
      "wiki_tr": "Sportmenlik"
     },
     "odak_tr": "Sportmenliği kurallara uymak, rakibe saygı göstermek ve adil oynamak olarak anlat.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Futbol"
   ],
   "aciklama_tr": "Futbolun tarihi, kuralları, sahası ve dünya çapındaki yeri.",
   "aciklama_en": "The history, rules, pitch and worldwide place of football.",
   "dersler": [
    {
     "id": "futbol-nedir",
     "baslik_tr": "Futbol Nedir?",
     "baslik_en": "What Is Football?",
     "kaynak": {
      "wiki_en": "Association football",
      "wiki_tr": "Futbol"
     },
     "odak_tr": "Futbolu iki takımın topu ayakla oynayarak rakip kaleye sokmaya çalıştığı bir oyun olarak tanımla. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "futbol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "futbol-tarihi",
     "baslik_tr": "Futbolun Tarihi",
     "baslik_en": "A Short History of Football",
     "kaynak": {
      "wiki_en": "History of association football",
      "wiki_tr": "Futbol tarihi"
     },
     "odak_tr": "Futbolun benzer oyunlardan kurallı bir spora dönüşme sürecini kaynaktaki olgularla anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "futbol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "futbol-kurallari",
     "baslik_tr": "Futbol Kuralları",
     "baslik_en": "The Laws of the Game",
     "kaynak": {
      "wiki_en": "Laws of the Game (association football)",
      "wiki_tr": "Futbol kuralları"
     },
     "odak_tr": "Oyunun temel kurallarını (süre, oyuncu sayısı, hakem) tanım düzeyinde anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "futbol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "futbol-sahasi",
     "baslik_tr": "Futbol Sahası",
     "baslik_en": "The Football Pitch",
     "kaynak": {
      "wiki_en": "Football pitch",
      "wiki_tr": "Futbol sahası"
     },
     "odak_tr": "Sahanın bölümlerini (orta saha çizgisi, ceza sahası, kale) ve malzemeyi sade anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "futbol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "futbol-mevkileri",
     "baslik_tr": "Oyuncu Mevkileri",
     "baslik_en": "Player Positions",
     "kaynak": {
      "wiki_en": "Association football positions"
     },
     "odak_tr": "Kaleci, defans, orta saha ve forvet görevlerini tanım düzeyinde anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "futbol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "futbol-pas",
     "baslik_tr": "Pas Vermek",
     "baslik_en": "Passing the Ball",
     "kaynak": {
      "wiki_tr": "Pas (futbol)"
     },
     "odak_tr": "Pasın takım oyununun temeli olduğunu ve topu arkadaşa ulaştırma amacını tanım düzeyinde anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "futbol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "dunya-kupasi",
     "baslik_tr": "FIFA Dünya Kupası",
     "baslik_en": "The FIFA World Cup",
     "kaynak": {
      "wiki_en": "FIFA World Cup",
      "wiki_tr": "FIFA Dünya Kupası"
     },
     "odak_tr": "Dünya Kupasının dört yılda bir yapılan uluslararası turnuva olduğunu ve tarihçesini kaynaktaki olgularla anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "futbol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "turkiye-futbol",
     "baslik_tr": "Türkiye'de Futbol",
     "baslik_en": "Football in Turkey",
     "kaynak": {
      "wiki_en": "Football in Turkey",
      "wiki_tr": "Türkiye'de futbol"
     },
     "odak_tr": "Futbolun Türkiye'ye gelişini ve yaygınlığını olgusal, dünyevi bir dille anlat; hiçbir kulübü öne çıkarma. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "futbol",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Basketbol"
   ],
   "aciklama_tr": "Basketbolun doğuşu, kuralları, sahası ve olimpiyatlardaki yeri.",
   "aciklama_en": "The invention, rules, court and Olympic history of basketball.",
   "dersler": [
    {
     "id": "basketbol-nedir",
     "baslik_tr": "Basketbol Nedir?",
     "baslik_en": "What Is Basketball?",
     "kaynak": {
      "wiki_en": "Basketball",
      "wiki_tr": "Basketbol"
     },
     "odak_tr": "Basketbolu topu elle taşıyıp potaya atarak sayı yapılan takım oyunu olarak tanımla. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "basketbol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "basketbol-tarihi",
     "baslik_tr": "Basketbolun Doğuşu",
     "baslik_en": "How Basketball Began",
     "kaynak": {
      "wiki_en": "History of basketball"
     },
     "odak_tr": "Oyunun nasıl icat edildiğini ve ilk kuralları kaynaktaki olgularla anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "basketbol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "james-naismith",
     "baslik_tr": "James Naismith",
     "baslik_en": "James Naismith",
     "kaynak": {
      "wiki_en": "James Naismith",
      "wiki_tr": "James Naismith"
     },
     "odak_tr": "Basketbolun mucidinin kim olduğunu ve oyunu neden tasarladığını kısaca anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "basketbol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "basketbol-sahasi",
     "baslik_tr": "Basketbol Sahası",
     "baslik_en": "The Basketball Court",
     "kaynak": {
      "wiki_en": "Basketball court"
     },
     "odak_tr": "Saha çizgilerini, potayı ve topu tanım düzeyinde anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "basketbol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "basketbol-mevkileri",
     "baslik_tr": "Oyuncu Mevkileri",
     "baslik_en": "Player Positions",
     "kaynak": {
      "wiki_en": "Basketball positions"
     },
     "odak_tr": "Oyun kurucu, kanat ve pivot görevlerini tanım düzeyinde anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "basketbol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "basketbol-olimpiyat",
     "baslik_tr": "Olimpiyatlarda Basketbol",
     "baslik_en": "Basketball at the Olympics",
     "kaynak": {
      "wiki_en": "Basketball at the Summer Olympics"
     },
     "odak_tr": "Basketbolun olimpiyat programına girişini kaynaktaki olgularla anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "basketbol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "tekerlekli-sandalye-basketbolu",
     "baslik_tr": "Tekerlekli Sandalye Basketbolu",
     "baslik_en": "Wheelchair Basketball",
     "kaynak": {
      "wiki_en": "Wheelchair basketball",
      "wiki_tr": "Tekerlekli sandalye basketbolu"
     },
     "odak_tr": "Tekerlekli sandalye basketbolunun kurallarını ve paralimpik yerini saygılı bir dille anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "basketbol",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Voleybol"
   ],
   "aciklama_tr": "Voleybolun icadı, kuralları, çeşitleri ve olimpiyat yolculuğu.",
   "aciklama_en": "The invention, rules, variants and Olympic journey of volleyball.",
   "dersler": [
    {
     "id": "voleybol-nedir",
     "baslik_tr": "Voleybol Nedir?",
     "baslik_en": "What Is Volleyball?",
     "kaynak": {
      "wiki_en": "Volleyball",
      "wiki_tr": "Voleybol"
     },
     "odak_tr": "Voleybolu topun fileden aşırılarak rakip sahaya düşürülmeye çalışıldığı takım oyunu olarak tanımla. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "voleybol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "william-morgan",
     "baslik_tr": "Voleybolun İcadı",
     "baslik_en": "The Invention of Volleyball",
     "kaynak": {
      "wiki_en": "William G. Morgan",
      "wiki_tr": "William G. Morgan"
     },
     "odak_tr": "Oyunun kim tarafından, hangi amaçla ortaya konduğunu kaynaktaki olgularla anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "voleybol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "plaj-voleybolu",
     "baslik_tr": "Plaj Voleybolu",
     "baslik_en": "Beach Volleyball",
     "kaynak": {
      "wiki_en": "Beach volleyball",
      "wiki_tr": "Plaj voleybolu"
     },
     "odak_tr": "Plaj voleybolunun salon voleybolundan farklarını (kum, oyuncu sayısı) sade anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "voleybol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "libero",
     "baslik_tr": "Libero",
     "baslik_en": "The Libero",
     "kaynak": {
      "wiki_en": "Libero (volleyball)"
     },
     "odak_tr": "Liberonun özel bir savunma oyuncusu olduğunu ve forma farkını tanım düzeyinde anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "voleybol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "voleybol-olimpiyat",
     "baslik_tr": "Olimpiyatlarda Voleybol",
     "baslik_en": "Volleyball at the Olympics",
     "kaynak": {
      "wiki_en": "Volleyball at the Summer Olympics"
     },
     "odak_tr": "Voleybolun olimpiyat programına girişini kaynaktaki olgularla anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "voleybol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "oturarak-voleybol",
     "baslik_tr": "Oturarak Voleybol",
     "baslik_en": "Sitting Volleyball",
     "kaynak": {
      "wiki_en": "Sitting volleyball",
      "wiki_tr": "Oturarak voleybol"
     },
     "odak_tr": "Oturarak voleybolun kurallarını ve paralimpik yerini saygılı bir dille anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "voleybol",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "turkiye-voleybol",
     "baslik_tr": "Türkiye'de Voleybol",
     "baslik_en": "Volleyball in Turkey",
     "kaynak": {
      "wiki_en": "Turkey women's national volleyball team",
      "wiki_tr": "Türkiye Kadın Milli Voleybol Takımı"
     },
     "odak_tr": "Türkiye'de voleybolun gelişimini olgusal anlat; hiçbir kulübü öne çıkarma. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "voleybol",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Atletizm"
   ],
   "aciklama_tr": "Koşu, atlama ve atma branşlarıyla atletizmin temel dalları.",
   "aciklama_en": "The running, jumping and throwing events that make up athletics.",
   "dersler": [
    {
     "id": "atletizm-nedir",
     "baslik_tr": "Atletizm Nedir?",
     "baslik_en": "What Is Athletics?",
     "kaynak": {
      "wiki_en": "Track and field",
      "wiki_tr": "Atletizm"
     },
     "odak_tr": "Atletizmi koşu, atlama ve atma yarışlarının çatı adı olarak tanımla; pist ve saha yarışlarını ayır.",
     "alt_konu": "atletizm",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "yuz-metre",
     "baslik_tr": "100 Metre Koşusu",
     "baslik_en": "The 100 Metres",
     "kaynak": {
      "wiki_en": "100 metres",
      "wiki_tr": "100 metre"
     },
     "odak_tr": "100 metrenin en kısa pist yarışlarından biri olduğunu ve çıkış bloklarını tanım düzeyinde anlat.",
     "alt_konu": "atletizm",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "maraton",
     "baslik_tr": "Maraton",
     "baslik_en": "The Marathon",
     "kaynak": {
      "wiki_en": "Marathon",
      "wiki_tr": "Maraton"
     },
     "odak_tr": "Maratonun 42 kilometre 195 metrelik uzun mesafe koşusu olduğunu ve adının kökenini kaynaktaki olgularla anlat.",
     "alt_konu": "atletizm",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "uzun-atlama",
     "baslik_tr": "Uzun Atlama",
     "baslik_en": "The Long Jump",
     "kaynak": {
      "wiki_en": "Long jump",
      "wiki_tr": "Uzun atlama"
     },
     "odak_tr": "Uzun atlamada hızlı koşu, çıkış tahtası ve kum çukuruna iniş aşamalarını tanım düzeyinde anlat.",
     "alt_konu": "atletizm",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "yuksek-atlama",
     "baslik_tr": "Yüksek Atlama",
     "baslik_en": "The High Jump",
     "kaynak": {
      "wiki_en": "High jump",
      "wiki_tr": "Yüksek atlama"
     },
     "odak_tr": "Yüksek atlamada çıta, atlama bölgesi ve iniş minderini tanım düzeyinde anlat.",
     "alt_konu": "atletizm",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "bayrak-yarisi",
     "baslik_tr": "Bayrak Yarışı",
     "baslik_en": "Relay Races",
     "kaynak": {
      "wiki_en": "Relay race",
      "wiki_tr": "Bayrak yarışı"
     },
     "odak_tr": "Bayrak yarışında takım arkadaşlarının sırayla koşup bir baton devrettiğini anlat.",
     "alt_konu": "atletizm",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "gulle-atma",
     "baslik_tr": "Gülle Atma",
     "baslik_en": "The Shot Put",
     "kaynak": {
      "wiki_en": "Shot put",
      "wiki_tr": "Gülle atma"
     },
     "odak_tr": "Gülle atmanın atma branşı olduğunu, atış dairesini ve kuralları tanım düzeyinde anlat.",
     "alt_konu": "atletizm",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "engelli-kosu",
     "baslik_tr": "Engelli Koşu",
     "baslik_en": "Hurdling",
     "kaynak": {
      "wiki_en": "Hurdling",
      "wiki_tr": "Engelli koşu"
     },
     "odak_tr": "Engelli koşuda engellerin yüksekliğinin ve aralığının sabit olduğunu tanım düzeyinde anlat.",
     "alt_konu": "atletizm",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Yüzme"
   ],
   "aciklama_tr": "Yüzme stilleri, havuz ve olimpiyat geçmişi.",
   "aciklama_en": "Swimming strokes, the pool and Olympic history.",
   "dersler": [
    {
     "id": "yuzme-nedir",
     "baslik_tr": "Yüzme Nedir?",
     "baslik_en": "What Is Swimming?",
     "kaynak": {
      "wiki_en": "Swimming (sport)",
      "wiki_tr": "Yüzme"
     },
     "odak_tr": "Yüzmeyi suda kol ve bacak hareketleriyle ilerleme sporu olarak tanımla. Yüzme öğrenmenin yetkin bir eğitmen gözetiminde yapılması gerektiğini güvenlik notu olarak ekle.",
     "alt_konu": "yuzme",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "serbest-stil",
     "baslik_tr": "Serbest Stil",
     "baslik_en": "Freestyle",
     "kaynak": {
      "wiki_en": "Freestyle swimming",
      "wiki_tr": "Serbest stil yüzme"
     },
     "odak_tr": "Serbest stilin kulaç ve bacak çırpışına dayalı, en hızlı stil olduğunu kaynaktaki olgularla anlat.",
     "alt_konu": "yuzme",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "sirtustu",
     "baslik_tr": "Sırtüstü Yüzme",
     "baslik_en": "Backstroke",
     "kaynak": {
      "wiki_en": "Backstroke",
      "wiki_tr": "Sırtüstü yüzme"
     },
     "odak_tr": "Sırtüstü yüzmenin sırt üstü yatarak yapılan tek stil olduğunu ve çıkış farkını anlat.",
     "alt_konu": "yuzme",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "kurbagalama",
     "baslik_tr": "Kurbağalama",
     "baslik_en": "Breaststroke",
     "kaynak": {
      "wiki_en": "Breaststroke",
      "wiki_tr": "Kurbağalama yüzme"
     },
     "odak_tr": "Kurbağalamanın eş zamanlı kol ve bacak hareketlerine dayandığını tanım düzeyinde anlat.",
     "alt_konu": "yuzme",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "kelebek",
     "baslik_tr": "Kelebek",
     "baslik_en": "Butterfly",
     "kaynak": {
      "wiki_en": "Butterfly stroke"
     },
     "odak_tr": "Kelebek stilinin kolların aynı anda öne taşındığı, dalgalı gövde hareketli bir stil olduğunu anlat.",
     "alt_konu": "yuzme",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "yuzme-havuzu",
     "baslik_tr": "Yüzme Havuzu",
     "baslik_en": "The Swimming Pool",
     "kaynak": {
      "wiki_en": "Swimming pool",
      "wiki_tr": "Yüzme havuzu"
     },
     "odak_tr": "Yarış havuzunun boyutlarını, kulvarları ve olimpik havuz ölçüsünü kaynaktaki olgularla anlat.",
     "alt_konu": "yuzme",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "yuzme-olimpiyat",
     "baslik_tr": "Olimpiyatlarda Yüzme",
     "baslik_en": "Swimming at the Olympics",
     "kaynak": {
      "wiki_en": "Swimming at the Summer Olympics"
     },
     "odak_tr": "Yüzmenin olimpiyat programındaki yerini kaynaktaki olgularla anlat.",
     "alt_konu": "yuzme",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Tenis"
   ],
   "aciklama_tr": "Tenisin tarihi, kortu, puan sistemi ve büyük turnuvaları.",
   "aciklama_en": "The history, court, scoring and major tournaments of tennis.",
   "dersler": [
    {
     "id": "tenis-nedir",
     "baslik_tr": "Tenis Nedir?",
     "baslik_en": "What Is Tennis?",
     "kaynak": {
      "wiki_en": "Tennis",
      "wiki_tr": "Tenis"
     },
     "odak_tr": "Tenisi raketle topu fileden aşırarak oynanan tekler ve çiftler sporu olarak tanımla.",
     "alt_konu": "tenis",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "tenis-kortu",
     "baslik_tr": "Tenis Kortu",
     "baslik_en": "The Tennis Court",
     "kaynak": {
      "wiki_en": "Tennis court",
      "wiki_tr": "Tenis kortu"
     },
     "odak_tr": "Kortun çizgilerini, filesini ve zemin türlerini (kil, çim, sert) tanım düzeyinde anlat.",
     "alt_konu": "tenis",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "tenis-puanlama",
     "baslik_tr": "Tenis Puanlama Sistemi",
     "baslik_en": "How Tennis Scoring Works",
     "kaynak": {
      "wiki_en": "Tennis scoring system"
     },
     "odak_tr": "Sayı, oyun ve set mantığını sade anlat.",
     "alt_konu": "tenis",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "grand-slam",
     "baslik_tr": "Grand Slam Turnuvaları",
     "baslik_en": "The Grand Slam Tournaments",
     "kaynak": {
      "wiki_en": "Grand Slam (tennis)",
      "wiki_tr": "Grand Slam (tenis)"
     },
     "odak_tr": "Dört büyük turnuvayı ve yıl içindeki yerlerini kaynaktaki olgularla anlat.",
     "alt_konu": "tenis",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "wimbledon",
     "baslik_tr": "Wimbledon",
     "baslik_en": "Wimbledon",
     "kaynak": {
      "wiki_en": "Wimbledon Championships",
      "wiki_tr": "Wimbledon Tenis Turnuvası"
     },
     "odak_tr": "Wimbledon'un en eski tenis turnuvası olduğunu ve çim kort geleneğini olgusal anlat.",
     "alt_konu": "tenis",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "tenis-raketi",
     "baslik_tr": "Tenis Raketi",
     "baslik_en": "The Tennis Racket",
     "kaynak": {
      "wiki_en": "Racket (sports equipment)",
      "wiki_tr": "Raket"
     },
     "odak_tr": "Raketin yapısını ve zaman içinde nasıl değiştiğini kaynaktaki olgularla anlat.",
     "alt_konu": "tenis",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "tekerlekli-sandalye-tenisi",
     "baslik_tr": "Tekerlekli Sandalye Tenisi",
     "baslik_en": "Wheelchair Tennis",
     "kaynak": {
      "wiki_en": "Wheelchair tennis",
      "wiki_tr": "Tekerlekli sandalye tenisi"
     },
     "odak_tr": "Tekerlekli sandalye tenisinin kurallarını saygılı bir dille anlat.",
     "alt_konu": "tenis",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Masa Tenisi"
   ],
   "aciklama_tr": "Masa tenisinin doğuşu, kuralları ve uluslararası yarışları.",
   "aciklama_en": "The origins, rules and international competitions of table tennis.",
   "dersler": [
    {
     "id": "masa-tenisi-nedir",
     "baslik_tr": "Masa Tenisi Nedir?",
     "baslik_en": "What Is Table Tennis?",
     "kaynak": {
      "wiki_en": "Table tennis",
      "wiki_tr": "Masa tenisi"
     },
     "odak_tr": "Masa tenisini küçük raketlerle masa üzerinde oynanan hızlı bir raket sporu olarak tanımla.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "masa-tenisi-federasyonu",
     "baslik_tr": "Uluslararası Masa Tenisi Federasyonu",
     "baslik_en": "The International Table Tennis Federation",
     "kaynak": {
      "wiki_en": "International Table Tennis Federation",
      "wiki_tr": "Uluslararası Masa Tenisi Federasyonu"
     },
     "odak_tr": "Federasyonun oyunun kurallarını belirleyen çatı kuruluş olduğunu sade anlat.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "masa-tenisi-olimpiyat",
     "baslik_tr": "Olimpiyatlarda Masa Tenisi",
     "baslik_en": "Table Tennis at the Olympics",
     "kaynak": {
      "wiki_en": "Table tennis at the Summer Olympics"
     },
     "odak_tr": "Masa tenisinin olimpiyat programına girişini kaynaktaki olgularla anlat.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "masa-tenisi-terimler",
     "baslik_tr": "Masa Tenisi Terimleri",
     "baslik_en": "Table Tennis Terms",
     "kaynak": {
      "wiki_en": "Glossary of table tennis"
     },
     "odak_tr": "Servis, forhend ve bekhend gibi temel terimleri tanım düzeyinde açıkla.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "para-masa-tenisi",
     "baslik_tr": "Para Masa Tenisi",
     "baslik_en": "Para Table Tennis",
     "kaynak": {
      "wiki_en": "Para table tennis",
      "wiki_tr": "Para masa tenisi"
     },
     "odak_tr": "Para masa tenisinin paralimpik yerini saygılı bir dille anlat.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Hentbol"
   ],
   "aciklama_tr": "Hentbolun kuralları, sahası ve olimpiyat geçmişi.",
   "aciklama_en": "The rules, court and Olympic history of handball.",
   "dersler": [
    {
     "id": "hentbol-nedir",
     "baslik_tr": "Hentbol Nedir?",
     "baslik_en": "What Is Handball?",
     "kaynak": {
      "wiki_en": "Handball",
      "wiki_tr": "Hentbol"
     },
     "odak_tr": "Hentbolu topun elle taşınıp rakip kaleye atıldığı takım oyunu olarak tanımla. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "hentbol-federasyonu",
     "baslik_tr": "Uluslararası Hentbol Federasyonu",
     "baslik_en": "The International Handball Federation",
     "kaynak": {
      "wiki_en": "International Handball Federation",
      "wiki_tr": "Uluslararası Hentbol Federasyonu"
     },
     "odak_tr": "Federasyonun çatı kuruluş olarak rolünü sade anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "hentbol-olimpiyat",
     "baslik_tr": "Olimpiyatlarda Hentbol",
     "baslik_en": "Handball at the Olympics",
     "kaynak": {
      "wiki_en": "Handball at the Summer Olympics"
     },
     "odak_tr": "Hentbolun olimpiyat programındaki yerini kaynaktaki olgularla anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "plaj-hentbolu",
     "baslik_tr": "Plaj Hentbolu",
     "baslik_en": "Beach Handball",
     "kaynak": {
      "wiki_en": "Beach handball",
      "wiki_tr": "Plaj hentbolu"
     },
     "odak_tr": "Plaj hentbolunun kum zeminde oynanan çeşit olduğunu tanım düzeyinde anlat. Kulüp rekabeti, taraftar çatışması, sonuç tartışması ve haber niteliğinde güncel olay yok; yalnız eğitici, kalıcı bilgi.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Bisiklet"
   ],
   "aciklama_tr": "Bisikletin tarihi ve bisiklet sporunun başlıca türleri.",
   "aciklama_en": "The history of the bicycle and the main kinds of cycling sport.",
   "dersler": [
    {
     "id": "bisiklet-nedir",
     "baslik_tr": "Bisiklet Nedir?",
     "baslik_en": "What Is a Bicycle?",
     "kaynak": {
      "wiki_en": "Bicycle",
      "wiki_tr": "Bisiklet"
     },
     "odak_tr": "Bisikleti pedalla çalışan iki tekerlekli taşıt olarak tanımla; parçalarını sade say.",
     "alt_konu": "bisiklet",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "bisiklet-tarihi",
     "baslik_tr": "Bisikletin Tarihi",
     "baslik_en": "A Short History of the Bicycle",
     "kaynak": {
      "wiki_en": "History of the bicycle"
     },
     "odak_tr": "Bisikletin ilk biçimlerinden günümüze gelişimini kaynaktaki olgularla anlat.",
     "alt_konu": "bisiklet",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "bisiklet-sporu",
     "baslik_tr": "Bisiklet Sporu",
     "baslik_en": "Cycling as a Sport",
     "kaynak": {
      "wiki_en": "Cycling",
      "wiki_tr": "Bisiklet sporu"
     },
     "odak_tr": "Bisiklet sporunun başlıca türlerini sade tanıt.",
     "alt_konu": "bisiklet",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "yol-bisikleti",
     "baslik_tr": "Yol Bisikleti",
     "baslik_en": "Road Cycling",
     "kaynak": {
      "wiki_en": "Road cycling",
      "wiki_tr": "Yol bisikleti"
     },
     "odak_tr": "Yol bisikleti yarışlarının asfalt yollarda yapıldığını ve türlerini tanım düzeyinde anlat.",
     "alt_konu": "bisiklet",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "dag-bisikleti",
     "baslik_tr": "Dağ Bisikleti",
     "baslik_en": "Mountain Biking",
     "kaynak": {
      "wiki_en": "Mountain biking",
      "wiki_tr": "Dağ bisikleti"
     },
     "odak_tr": "Dağ bisikletinin patikalarda ve engebeli arazide kullanıldığını tanım düzeyinde anlat.",
     "alt_konu": "bisiklet",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "pist-bisikleti",
     "baslik_tr": "Pist Bisikleti",
     "baslik_en": "Track Cycling",
     "kaynak": {
      "wiki_en": "Track cycling",
      "wiki_tr": "Pist bisikleti"
     },
     "odak_tr": "Pist bisikletinin eğimli kapalı pistte yapıldığını ve dişlinin sabit olduğunu tanım düzeyinde anlat.",
     "alt_konu": "bisiklet",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "bmx",
     "baslik_tr": "BMX",
     "baslik_en": "BMX",
     "kaynak": {
      "wiki_en": "BMX",
      "wiki_tr": "BMX"
     },
     "odak_tr": "BMX'in küçük tekerlekli bisikletlerle yapılan bir bisiklet sporu olduğunu kaynaktaki olgularla anlat.",
     "alt_konu": "bisiklet",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "bisiklet-kaski",
     "baslik_tr": "Bisiklet Kaskı",
     "baslik_en": "The Bicycle Helmet",
     "kaynak": {
      "wiki_en": "Bicycle helmet"
     },
     "odak_tr": "Kaskın bir güvenlik ekipmanı olduğunu ve neden kullanıldığını sade anlat.",
     "alt_konu": "bisiklet",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Jimnastik"
   ],
   "aciklama_tr": "Jimnastiğin dalları, aletleri ve olimpiyat geçmişi.",
   "aciklama_en": "The disciplines, apparatus and Olympic history of gymnastics.",
   "dersler": [
    {
     "id": "jimnastik-nedir",
     "baslik_tr": "Jimnastik Nedir?",
     "baslik_en": "What Is Gymnastics?",
     "kaynak": {
      "wiki_en": "Gymnastics",
      "wiki_tr": "Jimnastik"
     },
     "odak_tr": "Jimnastiği denge, esneklik ve kuvvet becerilerini içeren spor dallarının ortak adı olarak tanımla.",
     "alt_konu": "jimnastik",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "artistik-jimnastik",
     "baslik_tr": "Artistik Jimnastik",
     "baslik_en": "Artistic Gymnastics",
     "kaynak": {
      "wiki_en": "Artistic gymnastics",
      "wiki_tr": "Artistik jimnastik"
     },
     "odak_tr": "Artistik jimnastikte yer, kulplu beygir, halka gibi aletleri tanım düzeyinde anlat.",
     "alt_konu": "jimnastik",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "ritmik-jimnastik",
     "baslik_tr": "Ritmik Jimnastik",
     "baslik_en": "Rhythmic Gymnastics",
     "kaynak": {
      "wiki_en": "Rhythmic gymnastics",
      "wiki_tr": "Ritmik jimnastik"
     },
     "odak_tr": "Ritmik jimnastikte kurdele, top ve çember gibi araçlarla müzikli gösterileri anlat.",
     "alt_konu": "jimnastik",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "trambolin",
     "baslik_tr": "Trambolin Jimnastiği",
     "baslik_en": "Trampolining",
     "kaynak": {
      "wiki_en": "Trampolining",
      "wiki_tr": "Trambolin"
     },
     "odak_tr": "Trambolin jimnastiğini yaylı yüzeyde yapılan atlama sporu olarak tanıt.",
     "alt_konu": "jimnastik",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "denge-aleti",
     "baslik_tr": "Denge Aleti",
     "baslik_en": "The Balance Beam",
     "kaynak": {
      "wiki_en": "Balance beam",
      "wiki_tr": "Denge aleti"
     },
     "odak_tr": "Denge aletinin ölçülerini ve üzerinde yapılan hareket türlerini tanım düzeyinde anlat.",
     "alt_konu": "jimnastik",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "jimnastik-olimpiyat",
     "baslik_tr": "Olimpiyatlarda Jimnastik",
     "baslik_en": "Gymnastics at the Olympics",
     "kaynak": {
      "wiki_en": "Gymnastics at the Summer Olympics"
     },
     "odak_tr": "Jimnastiğin olimpiyat programındaki yerini kaynaktaki olgularla anlat.",
     "alt_konu": "jimnastik",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Güreş"
   ],
   "aciklama_tr": "Güreşin kuralları ve tarihi; Türkiye'deki yağlı güreş geleneği.",
   "aciklama_en": "The rules and history of wrestling, including Turkey's oil wrestling tradition.",
   "dersler": [
    {
     "id": "gures-nedir",
     "baslik_tr": "Güreş Nedir?",
     "baslik_en": "What Is Wrestling?",
     "kaynak": {
      "wiki_en": "Wrestling",
      "wiki_tr": "Güreş"
     },
     "odak_tr": "Güreşi kurallara bağlı, tutuş ve denge becerisine dayanan eski bir spor olarak tanımla; yalnız kurallar ve tarih. Şiddeti öne çıkaran anlatım yok.",
     "alt_konu": "gures",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "serbest-gures",
     "baslik_tr": "Serbest Güreş",
     "baslik_en": "Freestyle Wrestling",
     "kaynak": {
      "wiki_en": "Freestyle wrestling",
      "wiki_tr": "Serbest güreş"
     },
     "odak_tr": "Serbest güreşin kurallarını ve puanlama mantığını tanım düzeyinde anlat. Şiddeti öne çıkaran anlatım yok.",
     "alt_konu": "gures",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "greko-romen",
     "baslik_tr": "Grekoromen Güreş",
     "baslik_en": "Greco-Roman Wrestling",
     "kaynak": {
      "wiki_en": "Greco-Roman wrestling",
      "wiki_tr": "Grekoromen güreş"
     },
     "odak_tr": "Grekoromen güreşin bel üstünde tutuşlara dayanan kurallarını tanım düzeyinde anlat. Şiddeti öne çıkaran anlatım yok.",
     "alt_konu": "gures",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "yagli-gures",
     "baslik_tr": "Yağlı Güreş",
     "baslik_en": "Oil Wrestling",
     "kaynak": {
      "wiki_en": "Oil wrestling",
      "wiki_tr": "Yağlı güreş"
     },
     "odak_tr": "Yağlı güreşin Türkiye'de uzun bir geleneği olan spor biçimi olduğunu olgusal anlat. Şiddeti öne çıkaran anlatım yok.",
     "alt_konu": "gures",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "gures-olimpiyat",
     "baslik_tr": "Olimpiyatlarda Güreş",
     "baslik_en": "Wrestling at the Olympics",
     "kaynak": {
      "wiki_en": "Wrestling at the Summer Olympics"
     },
     "odak_tr": "Güreşin olimpiyat programındaki yerini kaynaktaki olgularla anlat. Şiddeti öne çıkaran anlatım yok.",
     "alt_konu": "gures",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Okçuluk"
   ],
   "aciklama_tr": "Okçuluğun tarihi, yay türleri, Türk okçuluğu ve olimpiyat yarışları.",
   "aciklama_en": "The history of archery, bow types, Turkish archery and Olympic competition.",
   "dersler": [
    {
     "id": "okculuk-nedir",
     "baslik_tr": "Okçuluk Nedir?",
     "baslik_en": "What Is Archery?",
     "kaynak": {
      "wiki_en": "Archery",
      "wiki_tr": "Okçuluk"
     },
     "odak_tr": "Okçuluğu yay ile hedefe ok atma sporu olarak tanımla; hedef, ok ve yay malzemesini sade anlat. Spor dışı kullanımlara girme.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "makarali-yay",
     "baslik_tr": "Makaralı Yay",
     "baslik_en": "The Compound Bow",
     "kaynak": {
      "wiki_en": "Compound bow",
      "wiki_tr": "Makaralı yay"
     },
     "odak_tr": "Makaralı yayı çıkrıklarla çalışan bir spor yayı olarak tanım düzeyinde anlat.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "turk-okculugu",
     "baslik_tr": "Türk Okçuluğu",
     "baslik_en": "Turkish Archery",
     "kaynak": {
      "wiki_en": "Turkish archery",
      "wiki_tr": "Türk okçuluğu"
     },
     "odak_tr": "Türk okçuluk geleneğini ve menzil atışı yarışlarını olgusal ve dünyevi bir dille anlat.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "okculuk-olimpiyat",
     "baslik_tr": "Olimpiyatlarda Okçuluk",
     "baslik_en": "Archery at the Olympics",
     "kaynak": {
      "wiki_en": "Archery at the Summer Olympics"
     },
     "odak_tr": "Okçuluğun olimpiyat programındaki yerini kaynaktaki olgularla anlat.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Satranç"
   ],
   "aciklama_tr": "Zihin sporu satrancın tarihi, taşları ve kuralları.",
   "aciklama_en": "The history, pieces and rules of chess, the sport of the mind.",
   "dersler": [
    {
     "id": "satranc-nedir",
     "baslik_tr": "Satranç Nedir?",
     "baslik_en": "What Is Chess?",
     "kaynak": {
      "wiki_en": "Chess",
      "wiki_tr": "Satranç"
     },
     "odak_tr": "Satrancı iki kişinin oynadığı, strateji ve planlamaya dayanan bir zihin sporu olarak tanımla.",
     "alt_konu": "satranc",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "satranc-tarihi",
     "baslik_tr": "Satrancın Tarihi",
     "baslik_en": "A Short History of Chess",
     "kaynak": {
      "wiki_en": "History of chess",
      "wiki_tr": "Satranç tarihi"
     },
     "odak_tr": "Satrancın eski bir oyundan günümüzdeki biçimine gelişini kaynaktaki olgularla anlat.",
     "alt_konu": "satranc",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "satranc-taslari",
     "baslik_tr": "Satranç Taşları",
     "baslik_en": "The Chess Pieces",
     "kaynak": {
      "wiki_en": "Chess piece",
      "wiki_tr": "Satranç taşları"
     },
     "odak_tr": "Taşların adlarını ve hareket biçimlerini tanım düzeyinde anlat.",
     "alt_konu": "satranc",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "satranc-acilis",
     "baslik_tr": "Satranç Açılışları",
     "baslik_en": "Chess Openings",
     "kaynak": {
      "wiki_en": "Chess opening",
      "wiki_tr": "Satranç açılışı"
     },
     "odak_tr": "Açılışın oyunun ilk hamleleri olduğunu ve neden önemsendiğini sade anlat.",
     "alt_konu": "satranc",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "satranc-oyun-sonu",
     "baslik_tr": "Oyun Sonu",
     "baslik_en": "The Endgame",
     "kaynak": {
      "wiki_en": "Chess endgame",
      "wiki_tr": "Satranç oyun sonu"
     },
     "odak_tr": "Oyun sonunun tahtada az taş kaldığı evre olduğunu tanım düzeyinde anlat.",
     "alt_konu": "satranc",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "buyukusta",
     "baslik_tr": "Büyükusta Unvanı",
     "baslik_en": "The Grandmaster Title",
     "kaynak": {
      "wiki_en": "Grandmaster (chess)"
     },
     "odak_tr": "Büyükusta unvanının satrançtaki en yüksek unvanlardan biri olduğunu olgusal anlat.",
     "alt_konu": "satranc",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "satranc-olimpiyati",
     "baslik_tr": "Satranç Olimpiyatı",
     "baslik_en": "The Chess Olympiad",
     "kaynak": {
      "wiki_en": "Chess Olympiad",
      "wiki_tr": "Satranç Olimpiyatı"
     },
     "odak_tr": "Satranç Olimpiyatının ülke takımları arasında yapılan turnuva olduğunu olgusal anlat.",
     "alt_konu": "satranc",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Fitness"
   ],
   "aciklama_tr": "Fitness kavramının ne olduğu, tarihçesi ve temel ilkeleri; egzersiz programı vermez.",
   "aciklama_en": "What fitness is, its history and basic principles; it does not prescribe exercise programmes.",
   "dersler": [
    {
     "id": "fitness-nedir",
     "baslik_tr": "Fitness Nedir?",
     "baslik_en": "What Is Fitness?",
     "kaynak": {
      "wiki_en": "Physical fitness"
     },
     "odak_tr": "Fiziksel uygunluğun kuvvet, dayanıklılık ve esneklik gibi bileşenlerini tanım düzeyinde anlat. Kilo, kas ya da sonuç vaadi, set ve tekrar önerisi yok.",
     "alt_konu": "fitness",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "egzersiz",
     "baslik_tr": "Egzersiz",
     "baslik_en": "Physical Exercise",
     "kaynak": {
      "wiki_en": "Exercise",
      "wiki_tr": "Egzersiz"
     },
     "odak_tr": "Egzersizi planlı bedensel etkinlik olarak tanımla. Program, set ya da tekrar önerisi ve sonuç vaadi yok.",
     "alt_konu": "fitness",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "spor-salonu",
     "baslik_tr": "Spor Salonlarının Tarihi",
     "baslik_en": "A Short History of the Gym",
     "kaynak": {
      "wiki_en": "Fitness centre",
      "wiki_tr": "Spor salonu"
     },
     "odak_tr": "Spor salonlarının nasıl ortaya çıktığını ve donanımlarını kaynaktaki olgularla anlat. Program ya da sonuç vaadi yok.",
     "alt_konu": "fitness",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "aerobik",
     "baslik_tr": "Aerobik",
     "baslik_en": "Aerobics",
     "kaynak": {
      "wiki_en": "Aerobics"
     },
     "odak_tr": "Aerobiğin müzik eşliğinde yapılan ritimli hareket dizisi olarak ortaya çıkışını anlat. Program ve sonuç vaadi yok.",
     "alt_konu": "fitness",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "kuvvet-antrenmani",
     "baslik_tr": "Kuvvet Antrenmanı Nedir?",
     "baslik_en": "What Is Strength Training?",
     "kaynak": {
      "wiki_en": "Strength training"
     },
     "odak_tr": "Kuvvet antrenmanının direnç kullanan egzersiz türü olduğunu tanım düzeyinde anlat. Set, tekrar, ağırlık önerisi ve kas ya da sonuç vaadi yok.",
     "alt_konu": "fitness",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "dambil",
     "baslik_tr": "Dambıl",
     "baslik_en": "The Dumbbell",
     "kaynak": {
      "wiki_en": "Dumbbell",
      "wiki_tr": "Dambıl"
     },
     "odak_tr": "Dambılın tarihçesini ve bir egzersiz aleti olarak yapısını kaynaktaki olgularla anlat. Program ya da sonuç vaadi yok.",
     "alt_konu": "fitness",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "kettlebell",
     "baslik_tr": "Kettlebell",
     "baslik_en": "The Kettlebell",
     "kaynak": {
      "wiki_en": "Kettlebell",
      "wiki_tr": "Kettlebell"
     },
     "odak_tr": "Kettlebell aletinin ne olduğunu ve tarihçesini kaynaktaki olgularla anlat. Program ya da sonuç vaadi yok. Güvenlik notu: yeni başlayan biri bir eğitmene danışmalı.",
     "alt_konu": "fitness",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Kalistenik"
   ],
   "aciklama_tr": "Vücut ağırlığıyla yapılan hareketlerin tarihçesi ve ilkeleri; egzersiz programı vermez.",
   "aciklama_en": "The history and principles of bodyweight movement; it does not prescribe exercise programmes.",
   "dersler": [
    {
     "id": "kalistenik-nedir",
     "baslik_tr": "Kalistenik Nedir?",
     "baslik_en": "What Is Calisthenics?",
     "kaynak": {
      "wiki_en": "Calisthenics",
      "wiki_tr": "Kalistenik"
     },
     "odak_tr": "Kalisteniği araç gerek olmadan kendi vücut ağırlığıyla yapılan hareketler olarak tanımla; sözcüğün kökenini kaynaktan anlat. Program ve sonuç vaadi yok.",
     "alt_konu": "kalistenik",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "vucut-agirligi",
     "baslik_tr": "Vücut Ağırlığı Hareketleri",
     "baslik_en": "Bodyweight Exercises",
     "kaynak": {
      "wiki_en": "Bodyweight exercise"
     },
     "odak_tr": "Vücut ağırlığı hareketlerinin ne olduğunu tanım düzeyinde anlat. Set, tekrar önerisi ve sonuç vaadi yok.",
     "alt_konu": "kalistenik",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "sinav",
     "baslik_tr": "Şınav",
     "baslik_en": "The Push-Up",
     "kaynak": {
      "wiki_en": "Push-up",
      "wiki_tr": "Şınav"
     },
     "odak_tr": "Şınavın bilinen bir vücut ağırlığı hareketi olduğunu tanım düzeyinde anlat. Sayı hedefi, program ve sonuç vaadi yok.",
     "alt_konu": "kalistenik",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "barfiks",
     "baslik_tr": "Barfiks",
     "baslik_en": "The Pull-Up",
     "kaynak": {
      "wiki_en": "Pull-up (exercise)"
     },
     "odak_tr": "Barfiksin bir bara asılıp çekilme hareketi olduğunu tanım düzeyinde anlat. Sayı hedefi, program ve sonuç vaadi yok.",
     "alt_konu": "kalistenik",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "squat",
     "baslik_tr": "Çömelme (Squat)",
     "baslik_en": "The Squat",
     "kaynak": {
      "wiki_en": "Squat (exercise)",
      "wiki_tr": "Squat"
     },
     "odak_tr": "Çömelme hareketinin ne olduğunu ve adını tanım düzeyinde anlat. Sayı hedefi, program ve sonuç vaadi yok.",
     "alt_konu": "kalistenik",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "plank",
     "baslik_tr": "Plank",
     "baslik_en": "The Plank",
     "kaynak": {
      "wiki_en": "Plank (exercise)"
     },
     "odak_tr": "Plank duruşunun ne olduğunu tanım düzeyinde anlat. Süre hedefi, program ve sonuç vaadi yok. Güvenlik notu: rahatsızlık hissedilirse bırakılmalı.",
     "alt_konu": "kalistenik",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "mekik",
     "baslik_tr": "Mekik",
     "baslik_en": "The Sit-Up",
     "kaynak": {
      "wiki_en": "Sit-up",
      "wiki_tr": "Mekik (egzersiz)"
     },
     "odak_tr": "Mekik hareketinin ne olduğunu tanım düzeyinde anlat. Sayı hedefi, program ve sonuç vaadi yok.",
     "alt_konu": "kalistenik",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Pilates"
   ],
   "aciklama_tr": "Pilatesin kökeni, ilkeleri ve ekipmanı; egzersiz programı vermez.",
   "aciklama_en": "The origins, principles and equipment of Pilates; it does not prescribe exercise programmes.",
   "dersler": [
    {
     "id": "pilates-nedir",
     "baslik_tr": "Pilates Nedir?",
     "baslik_en": "What Is Pilates?",
     "kaynak": {
      "wiki_en": "Pilates",
      "wiki_tr": "Pilates"
     },
     "odak_tr": "Pilatesi kontrollü hareket, nefes ve gövde odağına dayanan egzersiz sistemi olarak tanımla. Program ve sonuç vaadi yok.",
     "alt_konu": "pilates",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "joseph-pilates",
     "baslik_tr": "Joseph Pilates",
     "baslik_en": "Joseph Pilates",
     "kaynak": {
      "wiki_en": "Joseph Pilates",
      "wiki_tr": "Joseph Pilates"
     },
     "odak_tr": "Sistemin kurucusunu ve yöntemini nasıl geliştirdiğini kaynaktaki olgularla, yalnız spor tarihi açısından anlat. Sonuç vaadi yok.",
     "alt_konu": "pilates",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "govde-merkezi",
     "baslik_tr": "Gövde Merkezi",
     "baslik_en": "The Core",
     "kaynak": {
      "wiki_en": "Core (anatomy)"
     },
     "odak_tr": "Pilatesin gövde merkezine verdiği önemi tanım düzeyinde anlat. Program ve sonuç vaadi yok.",
     "alt_konu": "pilates",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "nefes-alma",
     "baslik_tr": "Nefes ve Hareket",
     "baslik_en": "Breath and Movement",
     "kaynak": {
      "wiki_en": "Breathing",
      "wiki_tr": "Nefes alma"
     },
     "odak_tr": "Nefes alışın hareketle eşleştirilmesi fikrini sade anlat. Sonuç vaadi yok.",
     "alt_konu": "pilates",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "denge",
     "baslik_tr": "Denge",
     "baslik_en": "Balance",
     "kaynak": {
      "wiki_en": "Balance (ability)"
     },
     "odak_tr": "Dengenin bir beceri olduğunu ve pilatesin dengeyi neden öne çıkardığını tanım düzeyinde anlat. Program ve sonuç vaadi yok.",
     "alt_konu": "pilates",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "pilates-reformer",
     "baslik_tr": "Reformer Aleti",
     "baslik_en": "The Reformer",
     "kaynak": {
      "wiki_en": "Pilates reformer"
     },
     "odak_tr": "Reformerin yaylı ve kayar platformlu bir pilates aleti olduğunu kaynaktaki olgularla anlat. Program yok. Güvenlik notu: aleti eğitmen eşliğinde kullanmak gerekir.",
     "alt_konu": "pilates",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Yürüyüş ve Doğa Sporları"
   ],
   "aciklama_tr": "Yürüyüşten kaya tırmanışına; doğada yapılan sporların kavramları ve güvenlik fikirleri.",
   "aciklama_en": "From walking to rock climbing: the ideas and safety basics of outdoor sports.",
   "dersler": [
    {
     "id": "yuruyus",
     "baslik_tr": "Yürüyüş",
     "baslik_en": "Walking",
     "kaynak": {
      "wiki_en": "Walking",
      "wiki_tr": "Yürüyüş"
     },
     "odak_tr": "Yürümeyi insanın en doğal hareket biçimi olarak tanımla; yürüyüşün spor olarak yapılan türlerini sade say.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "doga-yuruyusu",
     "baslik_tr": "Doğa Yürüyüşü",
     "baslik_en": "Hiking",
     "kaynak": {
      "wiki_en": "Hiking",
      "wiki_tr": "Doğa yürüyüşü"
     },
     "odak_tr": "Doğa yürüyüşünün doğal patikalarda yapılan yürüyüş olduğunu ve temel hazırlık fikirlerini (su, yol bilgisi) sade anlat.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "oryantiring",
     "baslik_tr": "Oryantiring",
     "baslik_en": "Orienteering",
     "kaynak": {
      "wiki_en": "Orienteering",
      "wiki_tr": "Oryantiring"
     },
     "odak_tr": "Oryantiringin harita ve pusula ile kontrol noktalarını bulma sporu olduğunu anlat.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "pusula",
     "baslik_tr": "Pusula",
     "baslik_en": "The Compass",
     "kaynak": {
      "wiki_en": "Compass",
      "wiki_tr": "Pusula"
     },
     "odak_tr": "Pusulanın yön bulmaya yarayan alet olduğunu ve nasıl çalıştığını kaynaktaki olgularla anlat.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "topografik-harita",
     "baslik_tr": "Topografik Harita",
     "baslik_en": "Topographic Maps",
     "kaynak": {
      "wiki_en": "Topographic map",
      "wiki_tr": "Topografik harita"
     },
     "odak_tr": "Haritada yükseltiyi gösteren eş yükselti eğrilerini sade anlat.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "nordik-yuruyus",
     "baslik_tr": "Nordik Yürüyüş",
     "baslik_en": "Nordic Walking",
     "kaynak": {
      "wiki_en": "Nordic walking"
     },
     "odak_tr": "Nordik yürüyüşün özel değneklerle yapılan yürüyüş türü olduğunu kaynaktaki olgularla anlat.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "kaya-tirmanisi",
     "baslik_tr": "Kaya Tırmanışı",
     "baslik_en": "Rock Climbing",
     "kaynak": {
      "wiki_en": "Rock climbing",
      "wiki_tr": "Kaya tırmanışı"
     },
     "odak_tr": "Kaya tırmanışını doğal kayalıklarda ya da yapay duvarlarda yapılan spor olarak tanımla. Güvenlik notu: tırmanışta eğitim ve ekipman şarttır.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "likya-yolu",
     "baslik_tr": "Likya Yolu",
     "baslik_en": "The Lycian Way",
     "kaynak": {
      "wiki_en": "Lycian Way",
      "wiki_tr": "Likya Yolu"
     },
     "odak_tr": "Likya Yolunun Türkiye'de uzun mesafe yürüyüş rotası olduğunu coğrafi ve dünyevi bir dille anlat.",
     "alt_konu": "diger",
     "gorsel": null,
     "sabit": null
    }
   ]
  },
  {
   "yol": [
    "Spor Dalları",
    "Kış Sporları"
   ],
   "aciklama_tr": "Kayaktan buz patenine, karda ve buzda yapılan sporlar.",
   "aciklama_en": "From skiing to ice skating: sports played on snow and ice.",
   "dersler": [
    {
     "id": "kis-olimpiyatlari",
     "baslik_tr": "Kış Olimpiyatları",
     "baslik_en": "The Winter Olympics",
     "kaynak": {
      "wiki_en": "Winter Olympic Games",
      "wiki_tr": "Kış Olimpiyat Oyunları"
     },
     "odak_tr": "Kış Olimpiyatlarının karda ve buzda yapılan sporları bir araya getirdiğini olgusal anlat.",
     "alt_konu": "kis",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "kayak",
     "baslik_tr": "Kayak",
     "baslik_en": "Skiing",
     "kaynak": {
      "wiki_en": "Skiing",
      "wiki_tr": "Kayak"
     },
     "odak_tr": "Kayağın karda kaymak için ayağa bağlanan donanımla yapılan spor olduğunu anlat.",
     "alt_konu": "kis",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "snowboard",
     "baslik_tr": "Snowboard",
     "baslik_en": "Snowboarding",
     "kaynak": {
      "wiki_en": "Snowboarding",
      "wiki_tr": "Snowboard"
     },
     "odak_tr": "Snowboard sporunu tek tahta üzerinde kar yamacında kayma sporu olarak tanıt.",
     "alt_konu": "kis",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "buz-pateni",
     "baslik_tr": "Buz Pateni",
     "baslik_en": "Ice Skating",
     "kaynak": {
      "wiki_en": "Ice skating",
      "wiki_tr": "Buz pateni"
     },
     "odak_tr": "Buz patenini buz üzerinde patenle kayma sporu olarak tanıt.",
     "alt_konu": "kis",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "artistik-buz-pateni",
     "baslik_tr": "Artistik Buz Pateni",
     "baslik_en": "Figure Skating",
     "kaynak": {
      "wiki_en": "Figure skating",
      "wiki_tr": "Artistik buz pateni"
     },
     "odak_tr": "Artistik buz patenini dönüş ve atlayışlardan oluşan gösteri sporu olarak tanıt.",
     "alt_konu": "kis",
     "gorsel": null,
     "sabit": null
    },
    {
     "id": "curling",
     "baslik_tr": "Curling",
     "baslik_en": "Curling",
     "kaynak": {
      "wiki_en": "Curling",
      "wiki_tr": "Curling"
     },
     "odak_tr": "Curlingin buz üzerinde taşın hedefe kaydırıldığı bir takım sporu olduğunu anlat.",
     "alt_konu": "kis",
     "gorsel": null,
     "sabit": null
    }
   ]
  }
 ]
};
