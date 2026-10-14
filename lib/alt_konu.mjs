// Alt konu etiketi (2026-10-13): kullanıcı ilgi alanı seçebilsin ("kadın spor haberi görmek istemeyebilir", "kişisel gelişimi sevmeyen de var").
// Kapalı liste, kategoriye bağlı. Üç kaynak, bu öncelikle: (1) yazım çağrısının çıktısı, (2) toplu ön sınıf çıktısı, (3) kural tabanlı tahmin (ücretsiz).
// Değerler ASCII slug'dır (kategori adları gibi). `diger` her listede vardır. cinsiyet yalnız spor kategorisinde anlamlıdır: kadin | erkek | karisik (karisik = karışık ya da bilinmiyor).

export const ALT_KONULAR = {
  spor: ["futbol", "basketbol", "voleybol", "tenis", "atletizm", "yuzme", "motor", "kis", "diger"],
  sanat: ["muzik", "sinema", "resim-sergi", "edebiyat", "tiyatro-sahne", "mimari-tasarim", "arkeoloji-miras", "soylesi", "heykel", "diger"],
  bilim: ["uzay", "fizik", "yasam-bilimleri", "tip-arastirma", "cevre-iklim", "arkeoloji", "diger"],
  teknoloji: ["yapay-zeka", "robotik", "enerji", "ulasim", "tuketici", "diger"],
  iyilik: ["gonullulluk", "bagis", "kurum-basarisi", "diger"],
  gokbilim: ["uzay", "gezegenler", "yildiz-gokada", "diger"],
  saglik: ["tip-arastirma", "iyi-olus", "halk-sagligi", "diger"],
  doga: ["cevre-iklim", "yaban-hayati", "koruma", "diger"],
  hayvanlar: ["evcil", "yaban-hayati", "diger"],
  mahalle: ["dayanisma", "topluluk-projesi", "diger"],
};
export const KISISEL_GELISIM = "kisisel-gelisim";       // yeni üst tür önerisi gelene dek `kisisel` kaynaklar (iyi oluş/düşünce) alt konu olarak bu etiketi taşır
export const CINSIYETLER = ["kadin", "erkek", "karisik"];
export const TUM_ALT_KONULAR = [...new Set([...Object.values(ALT_KONULAR).flat(), KISISEL_GELISIM])];

/** Kategori için geçerli alt konu mu? -> slug | "" */
export function altKonuDogrula(kategori, deger) {
  const d = String(deger ?? "").trim().toLowerCase();
  if (d === KISISEL_GELISIM) return d;
  return (ALT_KONULAR[kategori] || []).includes(d) ? d : "";
}
export function cinsiyetDogrula(deger) {
  const d = String(deger ?? "").trim().toLowerCase().replace(/ı/g, "i").replace(/ç/g, "c").replace(/ş/g, "s");
  return CINSIYETLER.includes(d) ? d : "";
}

/** Model istemlerine eklenecek sıkıştırılmış liste. */
export function altKonuListeMetni(kategoriler = Object.keys(ALT_KONULAR)) {
  return kategoriler.filter((k) => ALT_KONULAR[k]).map((k) => `${k}: ${ALT_KONULAR[k].join("|")}`).join("; ");
}

// ---- kural tabanlı tahmin (model çıktısı yoksa ya da geçersizse)
const K = "(?<![\\p{L}\\p{N}_])", B = "(?![\\p{L}\\p{N}_])";
const re = (liste) => new RegExp(K + "(?:" + liste.map((x) => (x.endsWith("*") ? x.slice(0, -1) + "[\\p{L}\\p{N}_]*" : x + B)).join("|") + ")", "iu");
const KURALLAR = {
  spor: [["futbol", re(["football", "soccer", "premier league", "champions league", "la liga", "uefa", "fifa", "striker*", "goalkeeper*", "futbol*", "süper lig", "gol*", "wsl", "nwsl"])],
    ["basketbol", re(["basketball", "nba", "wnba", "euroleague", "fiba", "basketbol*", "eurohoops", "dunk*"])],
    ["voleybol", re(["volleyball", "voleybol*", "fivb", "sultanlar ligi", "filenin sultanları", "vnl"])],
    ["tenis", re(["tennis", "tenis*", "wimbledon", "roland garros", "us open", "australian open", "atp", "wta", "grand slam"])],
    ["atletizm", re(["athletics", "atletizm*", "marathon*", "maraton*", "sprinter*", "sprint", "high jump", "long jump", "pole vault", "javelin", "steeplechase", "track and field", "world athletics", "diamond league"])],
    ["yuzme", re(["swimming", "swimmer*", "yüzme*", "yüzücü*", "freestyle", "backstroke", "world aquatics", "diving", "water polo", "sutopu"])],
    ["motor", re(["formula 1", "formula one", "f1", "motogp", "indycar", "nascar", "rally", "wec", "grand prix", "motorsport*", "motor sporları"])],
    ["kis", re(["skiing", "ski", "snowboard*", "biathlon", "ice hockey", "figure skating", "speed skating", "bobsled", "luge", "alpine", "buz pateni", "winter olympics", "kış olimpiyat*"])]],
  sanat: [["soylesi", re(["interview*", "in conversation", "q&a", "portrait of", "söyleşi*", "röportaj*", "profile of"])],
    ["muzik", re(["music*", "album*", "concert*", "composer*", "orchestra*", "singer*", "song*", "band", "jazz", "opera", "müzik*", "albüm*", "konser*", "besteci*", "orkestra*", "şarkı*"])],
    ["sinema", re(["film*", "cinema*", "movie*", "director*", "sinema*", "yönetmen*", "oscar*", "documentary", "belgesel*"])],
    ["tiyatro-sahne", re(["theatre", "theater", "stage", "ballet", "dance", "dancer*", "tiyatro*", "bale*", "dans*", "sahne*"])],
    ["edebiyat", re(["novel*", "novelist*", "poet*", "poem*", "poetry", "author*", "writer*", "book*", "literary", "literature", "edebiyat*", "roman*", "şair*", "yazar*", "kitap*", "şiir*"])],
    ["mimari-tasarim", re(["architect*", "building*", "design*", "interior*", "mimar*", "tasarım*", "bina*", "pavilion"])],
    ["arkeoloji-miras", re(["archaeolog*", "excavation*", "ancient", "heritage", "unesco", "artifact*", "ruins", "arkeolo*", "kazı*", "antik", "miras*", "höyük*"])],
    ["resim-sergi", re(["exhibition*", "painting*", "painter*", "sculpt*", "gallery", "galleries", "museum", "artwork*", "sergi*", "resim*", "ressam*", "heykel*", "müze*", "photograph*"])]],
  bilim: [["uzay", re(["space", "planet*", "galax*", "telescope*", "asteroid*", "mars", "moon", "comet*", "uzay*", "gezegen*"])],
    ["tip-arastirma", re(["cancer", "vaccine*", "clinical trial*", "patients", "therapy", "disease*", "medicine", "drug", "tıp*", "kanser*", "aşı*", "hasta*", "tedavi*"])],
    ["cevre-iklim", re(["climate", "emission*", "carbon", "ocean*", "glacier*", "biodiversity", "forest*", "ecosystem*", "iklim*", "karbon", "orman*"])],
    ["fizik", re(["physics", "quantum", "particle*", "laser*", "superconduct*", "fizik*", "kuantum", "parçacık*"])],
    ["arkeoloji", re(["archaeolog*", "fossil*", "dinosaur*", "excavat*", "ancient dna", "arkeolo*", "fosil*"])],
    ["yasam-bilimleri", re(["species", "genome*", "dna", "cell*", "bacteria*", "evolution*", "neuron*", "brain", "protein*", "tür", "türü", "hücre*", "genetik", "beyin"])]],
  teknoloji: [["yapay-zeka", re(["ai", "artificial intelligence", "machine learning", "neural network*", "chatbot*", "llm*", "yapay zek*"])],
    ["robotik", re(["robot*", "drone*", "autonomous", "exoskeleton*", "robotik"])],
    ["enerji", re(["battery", "batteries", "solar", "wind turbine*", "hydrogen", "grid", "fusion", "energy", "enerji*", "batarya*", "güneş enerjisi", "pil"])],
    ["ulasim", re(["electric vehicle*", "train", "rail*", "aircraft", "aviation", "hyperloop", "transport*", "ulaşım*", "tren*", "uçak*", "elektrikli araç*"])],
    ["tuketici", re(["smartphone*", "laptop*", "wearable*", "headphones", "camera", "gadget*", "iphone", "android", "akıllı telefon*", "kulaklık*"])]],
  iyilik: [["gonullulluk", re(["volunteer*", "volunteering", "gönüllü*"])], ["bagis", re(["donat*", "donor*", "fundrais*", "charity", "bağış*", "hayır"])], ["kurum-basarisi", re(["united nations", "world health", "unesco", "unicef", "red cross", "red crescent", "ifrc", "nobel", "foundation", "ngo", "kızılay", "birleşmiş milletler"])]],
  gokbilim: [["gezegenler", re(["planet*", "mars", "jupiter", "saturn", "venus", "mercury", "moon", "lunar", "exoplanet*", "gezegen*"])], ["yildiz-gokada", re(["star", "stars", "galax*", "nebula*", "black hole*", "supernova*", "pulsar*", "yıldız*", "gökada*", "kara delik*"])]],
  saglik: [["tip-arastirma", re(["trial*", "study", "researchers", "patients", "cancer", "araştırma*", "hasta*"])], ["iyi-olus", re(["wellbeing", "well-being", "sleep", "mindful*", "happiness", "exercise", "iyi oluş", "uyku", "mutluluk"])]],
  doga: [["yaban-hayati", re(["wildlife", "species", "bird*", "whale*", "elephant*", "tiger*", "reef*", "yaban*", "kuş*"])], ["cevre-iklim", re(["climate", "emission*", "carbon", "iklim*"])]],
  hayvanlar: [["evcil", re(["dog", "dogs", "cat", "cats", "puppy", "kitten", "adopt*", "shelter*", "köpek*", "kedi*", "sahiplen*"])], ["yaban-hayati", re(["wild*", "species", "bird*", "whale*", "elephant*", "yaban*"])]],
  mahalle: [["dayanisma", re(["neighbo*", "mutual aid", "community fridge", "dayanışma*", "komşu*"])], ["topluluk-projesi", re(["community", "garden*", "project", "mahalle", "bahçe*", "proje*"])]],
};

/** Metne bakarak alt konu tahmini (ücretsiz). -> slug | "" (bulamazsa boş: istemci etiketsiz gösterir) */
export function altKonuTahmin(kategori, metin) {
  const m = String(metin || "");
  for (const [ad, rx] of KURALLAR[kategori] || []) if (rx.test(m)) return ad;
  return "";
}

const KADIN = re(["women", "women's", "womens", "woman", "female", "ladies", "girls", "wsl", "wnba", "nwsl", "pwhl", "kadın*", "bayan*", "kızlar", "sultanlar", "filenin sultanları"]);
const ERKEK = re(["men", "men's", "mens", "male", "boys", "erkek*", "efeler"]);
/** Spor haberinin cinsiyet etiketi: yalnız açıkça anılıyorsa kadin/erkek; ikisi ya da hiçbiri anılırsa karisik. */
export function cinsiyetTahmin(metin) {
  const m = String(metin || "");
  const k = KADIN.test(m), e = ERKEK.test(m);
  if (k && !e) return "kadin";
  if (e && !k) return "erkek";
  return "karisik";
}

/**
 * Nihai etiket: yazım çıktısı > ön sınıf > kural tabanlı tahmin. tur: kaynağın türü (kisisel -> kisisel-gelisim zorlanır).
 * -> { altKonu:"" | slug, cinsiyet:"" | kadin|erkek|karisik }  (cinsiyet yalnız spor kategorisinde)
 */
export function etiketSec({ kategori, yaz = {}, onSinif = {}, tur = "", metin = "" }) {
  let alt = tur === "kisisel" ? KISISEL_GELISIM : (tur === "soylesi" && kategori === "sanat" ? "soylesi" : "");     // kaynağın türü bilinen şeydir: söyleşi kaynağı sanat altında "soylesi" etiketi taşır
  if (!alt) alt = altKonuDogrula(kategori, yaz.altKonu) || altKonuDogrula(kategori, onSinif.altKonu) || altKonuTahmin(kategori, metin);
  if (!alt && tur === "kurum" && kategori === "iyilik") alt = "kurum-basarisi";
  let cins = "";
  if (kategori === "spor") cins = cinsiyetDogrula(yaz.cinsiyet) || cinsiyetDogrula(onSinif.cinsiyet) || cinsiyetTahmin(metin);
  return { altKonu: alt, cinsiyet: cins };
}
