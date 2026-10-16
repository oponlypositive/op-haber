// Haber alanları (spor, sanat, bilim, hayvanlar, astronomi (gokbilim); teknoloji 2026-10-16 sahip kararıyla KAPALI): "özellikle iyi haber" şartı aranmaz, NÖTR-OLUMLU güncel haber yeter.
// Yasaklar aynen: hassas konu (on_eleme.mjs + moderasyon.mjs), olumsuz/üzücü olay, bahis/kumar, reklam/ürün tanıtımı, siyasetçi/devlet icraatı.
// Saf işlevler (ağ yok): ön eleme, alan dengesi, günlük alan kotası.

const KUCUK = (s) => String(s || "").replace(/İ/g, "i").toLowerCase();
const KELIME = "(?<![\\p{L}\\p{N}_])", BITIS = "(?![\\p{L}\\p{N}_])";
/** ["kelime", "kok*", "iki kelime"] -> tam kelime / kök / ifade eşleşen düzenli ifade (küçük harfe çevrilmiş metin için). */
export function kelimeRe(liste) {
  const parca = liste.map((k) => {
    const kacis = k.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    return kacis.endsWith("*") ? kacis.slice(0, -1) + "[\\p{L}\\p{N}_]*" : kacis + BITIS;
  });
  return new RegExp(KELIME + "(?:" + parca.join("|") + ")", "iu");
}

// Olumsuz / üzücü olay (tüm alanlar). Ölüm, sakatlık, kaza, skandal, dava, doping, şiddet, ırkçılık, savaş, afet.
const OLUMSUZ = kelimeRe([
  "die", "dies", "died", "dying", "death*", "dead", "deceased", "killed", "killing", "fatal*", "injur*", "wounded", "accident*", "crash", "crashes", "crashed", "collision*", "tragedy", "tragic*", "mourn*", "victim*", "funeral*", "obituar*",
  "scandal*", "lawsuit*", "sued", "sues", "convict*", "guilty", "arrest*", "fraud*", "bribe*", "corrupt*", "doping", "dope", "banned", "suspended", "suspension", "disqualif*", "racis*", "racial*", "abus*", "harass*", "assault*", "violen*", "riot*", "brawl*", "stabb*", "shooting",
  "war", "wars", "bomb*", "missile*", "attack", "attacks", "attacked", "terror*", "earthquake*", "flood*", "wildfire*", "hurricane*", "tsunami*", "disaster*", "famine", "layoff*", "layoffs", "bankrupt*", "cancel*", "postpone*", "protest*", "controvers*", "backlash", "outrage*", "furious", "row", "feud*", "criticis*", "criticiz*", "boycott*", "hate", "suicid*", "overdose*", "cancer*", "dementia", "tumor*", "tumour*",
  "öldü", "ölüm*", "öldür*", "hayatını kaybet*", "yaşamını yitir*", "vefat*", "cenaze*", "sakatlan*", "sakatlık*", "yaralan*", "kaza", "kazası", "kazada", "kazadan", "kazaya", "kazalar", "kazaları", "skandal*", "dava", "davası", "mahkeme*", "tutuklan*", "gözaltı*", "doping*", "ceza", "cezası", "cezalandır*", "cezaya", "kavga*", "tartışma*", "polemik*", "tepki*", "tepkili", "ırkçı*", "taciz*", "saldırı*", "şiddet*", "savaş*", "deprem*", "sel", "yangın*", "felaket*", "intihar*", "iptal*", "ertelen*", "protesto*", "rezalet", "kriz*", "istifa*", "kovuldu", "skandalı", "boykot*",
]);
// Bahis / kumar
const BAHIS = kelimeRe(["bet", "bets", "betting", "bettor*", "odds", "wager*", "casino*", "gambl*", "lottery", "jackpot", "sportsbook*", "bookmaker*", "iddaa*", "bahis*", "kumar*", "kupon*", "şans oyunu*", "piyango*", "canlı bahis"]);
// Reklam / ürün tanıtımı / satın alma yönlendirmesi
const REKLAM = kelimeRe(["sponsored", "advertorial", "advertis*", "promo", "promotion*", "promotional", "discount*", "coupon*", "giveaway*", "deal", "deals", "sale", "buy", "buying guide", "pre-order*", "preorder*", "price drop*", "best deals", "hands-on", "review", "reviews", "unboxing", "affiliate*", "indirim*", "kampanya*", "satın al*", "ön sipariş*", "inceleme*", "kupon", "hediye çekilişi", "çekiliş*", "sponsorlu"]);
// Astroloji (astronomiyle karıştırılmaz: OP Astroloji ayrı hesaptır, astronomi haberi astroloji içermez)
const ASTROLOJI = kelimeRe(["astrolog*", "astrology", "horoscope*", "zodiac*", "burç*", "burçlar", "fal", "falı"]);
// Siyasetçi / devlet icraatı (on_eleme.konuYasak ile birlikte çalışır; burada alanlara özgü ek)
const DEVLET = kelimeRe(["senator*", "congress*", "legislat*", "tax", "taxes", "tariff*", "subsid*", "budget", "vergi*", "bütçe*", "teşvik*", "yasa tasarı*", "kanun teklif*"]);

// Din / etnik kimlik / siyasi gün ek kelimeleri (moderasyon.mjs listesini tamamlar; canlı beslemelerde görülen kaçaklar: "İmam Hatip", "Indigenous Peoples' Day")
const HASSAS_EK = kelimeRe(["imam*", "hatip", "medrese*", "vaaz*", "hac", "umre", "ramazan", "bayram*", "noel", "christmas", "easter", "ramadan", "diwali", "indigenous", "native american*", "tribe*", "tribal", "aborigin*", "yerli halk*", "azınlık*", "minorit*", "pride", "lgbt*", "abortion", "kürtaj"]);

// HAYVANLAR (sezgi alanı): kaynak dosyasında "alan" olarak tanımlı kaynak YOKTUR; başlık/özet sezgisiyle (hayvanMi) etiketlenir.
// Amaç: hayvan haberleri genel akışta ön puan sıralamasında boğulmasın (canlı simülasyon 2026-10-14: 1623 aday, 13 hayvan başlığı, ilk 24'te 0).
// Hayvan adı (başlıkta tek başına yeter) ve olumlu hayvan işareti (adla birlikte aranır). Ekler kök* ile; belirsiz takım adları (lion, tiger, eagles, wolves, fox) bilerek YOK.
const HAYVAN_AD = kelimeRe(["dog", "dogs", "puppy", "puppies", "cat", "cats", "kitten*", "foal*", "elephant*", "whale*", "dolphin*", "turtle*", "tortoise*", "panda*", "penguin*", "otter*", "koala*", "gorilla*", "orangutan*", "chimpanzee*", "giraffe*", "rhino*", "hippo*", "hedgehog*", "owl*", "parrot*", "monkey*", "lemur*", "sloth*", "bee", "bees", "butterfl*",
  "bird", "birds", "wildlife", "sanctuary", "hatchling*", "cub", "cubs", "fawn*", "animal", "animals", "zoo", "aquarium", "pet", "pets",
  "köpek*", "kedi*", "yavru*", "hayvan*", "yaban hayat*", "kuş", "kuşu", "kuşlar*", "kaplumbağa*", "balina*", "penguen*", "panda*", "koala*", "goril*", "orangutan*", "zürafa*", "gergedan*", "kirpi*", "baykuş*", "papağan*", "arı", "arılar*", "kelebek*", "barınak*", "veteriner*", "fil", "fili", "filin"]);
const HAYVAN_ISARET = kelimeRe(["rescued", "adopted", "born", "hatched", "newborn", "species", "kurtarıldı", "kurtarıldığı", "sahiplenildi", "sahiplendirildi", "doğdu", "yavrusu"]);
/** Olumlu sonuçlu kurtarma/iyileşme işareti: ölüm/yaralanma içeren hayvan haberinin yalnız "yumuşak" olumsuz sözcükleri bunun varlığında yok sayılır. */
const HAYVAN_OLUMLU_SONUC = kelimeRe(["rescued", "saved", "recovered", "recovering", "recovers", "healed", "reunited", "adopted", "kurtarıl*", "kurtardı*", "iyileş*", "sahiplen*", "kavuştu"]);
// "Yumuşak" olumsuz sözcükler: kurtarma haberinin doğal çerçevesi (yaralı bulundu, selden kurtarıldı). Ölüm/katliman (die, dead, killed, fatal, death), şiddet, saldırı, istismar, kâr amaçlı avlanma BURADA YOK ve her zaman elenir.
const YUMUSAK_OLUMSUZ = new RegExp(kelimeRe(["injur*", "wounded", "victim*", "accident*", "crash", "crashes", "crashed", "collision*", "flood*", "wildfire*", "hurricane*", "earthquake*", "disaster*", "yaralan*", "yaralı*", "sakatlan*", "kaza", "kazası", "kazada", "kazadan", "sel", "selden", "yangın*", "deprem*", "felaket*"]).source, "giu");

/** Aday hayvan haberi mi? Başlıkta hayvan adı | metinde en az 2 farklı hayvan adı | özette hayvan adı + başlıkta olumlu hayvan işareti. */
export function hayvanMi(aday) {
  const b = KUCUK(aday?.baslik), o = KUCUK(aday?.ozet);
  if (HAYVAN_AD.test(b)) return true;
  const ad = new Set();
  for (const e of `${b} ${o}`.matchAll(new RegExp(HAYVAN_AD.source, "giu"))) ad.add(e[0]);
  if (ad.size >= 2) return true;
  return ad.size >= 1 && HAYVAN_ISARET.test(b);
}

export const ALANLAR = {
  spor: {
    kategori: "spor", ad: "spor",
    kriter: "Maç sonuçları, galibiyetler, şampiyonluklar, madalyalar, rekorlar, kaliteli oyun ve sporcu başarıları uygundur. UYGUN DEĞİL: transfer ve bonservis dedikodusu, hakem tartışması, kavga, ceza, sakatlık, kırmızı kart tartışması, teknik direktör görevden alma, bahis ve kumar, iddialar ve söylentiler.",
    // Spor adayında sonuç/başarı işareti aranır: ham haber akışı çoğunlukla dedikodudur.
    pozitif: kelimeRe(["won", "win", "wins", "winning", "winner*", "victory", "victories", "victorious", "champion*", "title", "titles", "trophy", "trophies", "medal*", "gold", "silver", "bronze", "record*", "qualif*", "final", "finals", "semi-final*", "semifinal*", "beat", "beats", "defeat*", "thrash*", "triumph*", "unbeaten", "clinch*", "advance*", "promoted", "promotion", "personal best", "debut",
      "kazandı", "kazanan*", "kazanıyor", "kazandık", "galibiyet*", "şampiyon*", "madalya*", "rekor*", "kupa*", "kupası", "zafer*", "final", "finale", "finali", "finalde", "yarı final*", "yendi", "mağlup*", "farklı", "turladı", "tur atladı", "yükseldi", "hafta sonuçları", "puan durumu", "maç sonucu", "sonuçları",
      "galip*", "liderliğ*", "lider", "zirve*", "başarı*", "podyum*", "birincilik*", "altın", "gümüş", "bronz", "olimpiyat*", "gruptan çık*", "tur atla*", "kupayı", "gururlandırdı", "dünya birinci*", "avrupa birinci*", "unbeaten", "thrilling", "comeback", "gold medal", "world record"]),
    ret: kelimeRe(["transfer*", "bonservis*", "kiralık", "loan", "loaned", "rumour*", "rumor*", "sözleşme feshi", "referee*", "hakem*", "penalty controversy", "red card", "sent off", "kırmızı kart*", "sacked", "fired", "sack", "resign*", "kovul*", "gaffe", "pundit*", "sakat*", "injury", "injuries", "söylenti*", "iddia*",
      "yenildi", "mağlup oldu", "kaybetti", "kaybettik", "elendi", "puan kaybı", "lost to", "loses", "knocked out", "eliminated", "relegat*", "düştü", "borç*", "iddialıyız", "kayıp"]),
  },
  sanat: {
    kategori: "sanat", ad: "sanat ve kültür",
    kriter: "Sergi, festival, müze, müzik, sinema, tiyatro, mimari ve tasarım haberleri uygundur (sanat eserinin ya da etkinliğin kendisi). UYGUN DEĞİL: magazin, sanatçı skandalı ve özel hayatı, müzayede fiyatı ve hırsızlık, sahtecilik, gişe ya da eleştiri savaşları, reklam.",
    ret: kelimeRe(["auction*", "müzayede*", "sold for", "stolen", "theft", "heist", "forger*", "fake*", "vandal*", "looted", "hırsız*", "çalın*", "magazin", "gossip", "box office", "flop", "gişe", "dating", "divorce", "boşan*", "ayrıl*", "affair"]),
  },
  bilim: {
    kategori: "bilim", ad: "bilim",
    kriter: "Yeni araştırma bulguları, keşifler, doğa bilimleri, tıp araştırmalarının olumlu sonuçları, bilim insanlarının başarıları uygundur. UYGUN DEĞİL: bilimsel sahtecilik, geri çekilen makale, tartışmalı sağlık iddiası, korkutucu ya da felaket odaklı çalışma, ürün tanıtımı.",
    ret: kelimeRe(["retract*", "hoax", "misconduct", "fraud*", "geri çek*", "sahte*", "doomsday", "apocalyp*", "extinction*", "yok oluş*", "alarm*", "warns", "warning", "uyarı*"]),
  },
  hayvanlar: {
    kategori: "hayvanlar", ad: "hayvanlar", sezgi: true,      // sezgi: kaynak dosyasında alan olarak yoktur (hayvanMi ile etiketlenir)
    kriter: "Hayvan kurtarma ve iyileşme hikâyeleri, sahiplendirme, yavru doğumları, yaban hayatı ve tür korumada olumlu gelişmeler, hayvan davranışı araştırmaları uygundur. UYGUN DEĞİL: ölüm, öldürme, saldırı, istismar, av ve kâr amaçlı avlanma, hastalık salgını, hayvan kullanan reklam ya da ürün tanıtımı.",
    ret: kelimeRe(["poach*", "cull", "culled", "culling", "euthan*", "slaughter*", "hunt", "hunting", "hunter*", "cruelty", "neglect*", "extinct*", "rabies", "bird flu", "avian flu", "kaçak avcı*", "avlan*", "itlaf*", "işkence*", "kuduz"]),
  },
  gokbilim: {
    kategori: "gokbilim", ad: "astronomi ve uzay",
    kriter: "Astronomi, uzay bilimi, uzay görevleri, gezegenler, yıldızlar, gökadalar ve teleskop haberleri uygundur. UYGUN DEĞİL: astroloji ve burç yorumu, uzay çöpü ve çarpışma korkusu, felaket senaryosu, ürün tanıtımı, savaş ya da askerî uzay.",
    ret: kelimeRe(["impact threat", "doomsday", "apocalyp*", "end of the world", "military", "weapon*", "space force", "askeri", "silah*", "çarpışma korku*"]),
  },
};

export const ALAN_ADLARI = Object.keys(ALANLAR);

// KAPALI KATEGORİLER (sahip 2026-10-16: "teknoloji sistemden çıkarıldı"): bu kategoride hiçbir şey üretilmez/yayınlanmaz; sunucu da reddeder.
export const KAPALI_KATEGORILER = ["teknoloji"];
export const kategoriKapaliMi = (k) => KAPALI_KATEGORILER.includes(String(k || ""));

/** Aday için alan bazlı ön eleme. alan yoksa (iyi haber siteleri) -> {ok:true}. -> {ok, neden} */
export function alanOnEleme(aday) {
  if (kategoriKapaliMi(aday.alan)) return { ok: false, neden: "alan:kategori-kapali" };      // kaynak alanı kapalı kategori (pasif kaynak dışında sızan aday)
  const a = ALANLAR[aday.alan];
  if (!a) return { ok: true, neden: "" };
  const m = KUCUK(`${aday.baslik} ${aday.ozet || ""}`);
  const sinav = [["hassas-ek", HASSAS_EK], ["olumsuz", OLUMSUZ], ["bahis", BAHIS], ["reklam", REKLAM], ["astroloji", ASTROLOJI], ["devlet", DEVLET]];
  // Hayvan haberinde olumlu sonuçlu kurtarma/iyileşme varsa "yaralı bulundu", "selden kurtarıldı" gibi YUMUŞAK sözcükler yok sayılır; ölüm/saldırı/istismar sözcükleri aynen eler.
  const hayvanKurtarma = aday.alan === "hayvanlar" && HAYVAN_OLUMLU_SONUC.test(m);
  for (const [ad, re] of sinav) {
    const e = re.exec(ad === "olumsuz" && hayvanKurtarma ? m.replace(YUMUSAK_OLUMSUZ, " ") : m);
    if (e) return { ok: false, neden: `alan:${ad}:${e[0].slice(0, 20)}` };
  }
  if (a.ret) { const e = a.ret.exec(m); if (e) return { ok: false, neden: `alan:${aday.alan}-ret:${e[0].slice(0, 20)}` }; }
  if (aday.alan === "hayvanlar" && !hayvanMi(aday)) return { ok: false, neden: "alan:hayvanlar-olumlu-isaret-yok" };
  if (a.pozitif && !a.pozitif.test(m)) return { ok: false, neden: `alan:${aday.alan}-olumlu-isaret-yok` };
  return { ok: true, neden: "" };
}

const alanOf = (x) => x.alan || "genel";
/**
 * Aynı alandan art arda en çok `ust` aday: zamana göre sıralı listeyi, sıra bozulmadan alanlar arasında dengeler.
 * Başka alan kalmamışsa aynı alan devam eder (tur boş kalmasın).
 */
export function alanDengele(adaylar, ust = 2) {
  const kalan = [...adaylar], sonuc = [];
  while (kalan.length) {
    const son = sonuc.slice(-ust);
    let i = 0;
    if (ust > 0 && son.length === ust && son.every((x) => alanOf(x) === alanOf(son[0]))) {
      const j = kalan.findIndex((x) => alanOf(x) !== alanOf(son[0]));
      if (j >= 0) i = j;
    }
    sonuc.push(kalan.splice(i, 1)[0]);
  }
  return sonuc;
}

export const VARSAYILAN_ALAN_KOTALARI = { spor: 28, sanat: 20, bilim: 22, gokbilim: 5, hayvanlar: 3 };   // 2026-10-13: yerli haber hacmi için artırıldı (spor 22, sanat 16, bilim 18 idi; teknoloji 2026-10-16'da kapandı); %35'i yerli adaylara ayrılır (lib/tr.mjs)
/** "spor:6,sanat:4" -> {spor:6, sanat:4, ...varsayılan}. Geçersiz girdiler yok sayılır. */
export function kotaAyristir(metin) {
  const k = { ...VARSAYILAN_ALAN_KOTALARI };
  for (const p of String(metin || "").split(",")) {
    const [ad, n] = p.split(":").map((x) => x.trim());
    const sayi = Number.parseInt(n, 10);
    if (ALANLAR[ad] && Number.isFinite(sayi) && sayi >= 0 && sayi <= 50) k[ad] = sayi;
  }
  return k;
}
/** Alan başına bugün (son 24 saat) kalan hak. durum: Map(kategori -> {son24, son7g, sonZaman}). */
export function alanKalan(kotalar, durum) {
  const kalan = {};
  for (const [alan, kota] of Object.entries(kotalar)) kalan[alan] = Math.max(0, kota - (durum?.get?.(ALANLAR[alan]?.kategori)?.son24 || 0));
  return kalan;
}
