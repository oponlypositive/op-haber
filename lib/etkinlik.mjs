// Etkinlik çıkarımı (2026-10-15, "Yakınındaki Aktiviteler"): yazım çağrısının JSON'una EK model çağrısı olmadan eklenen isteğe bağlı `etkinlik` alanı KOD ile doğrulanır.
// Sözleşme (yayın yükü `haber.etkinlik`; sunucu bozuk alanı yok sayar, gönderiyi reddetmez):
//   { ad (2-120), sehir (≤40), mekan? (≤80), baslangic: "YYYY-MM-DD", bitis?: "YYYY-MM-DD" (>= baslangic, <= baslangic+120 gün), saat?: "HH:MM",
//     tur: sergi|konser|tiyatro|festival|soylesi|atolye|spor|diger, ucretsiz?: true }
// İLKE: yanlış tarih/şehir, etkinliksizlikten çok daha kötüdür. Tarih ya da şehir kaynak metinde KANITLANAMAZSA etkinlik alanı tümden atılır (haber yine yayınlanır).
// Mekân/saat/bitiş/ücretsiz kanıtlanamazsa yalnız o alan atılır. Saf işlevler (ağ yok). Not: bu dosya on_eleme.mjs'i içe aktarmaz (döngü olmasın); konu denetimi çağıranda (yasakFn).
import { denetle } from "./moderasyon.mjs";

export const ETKINLIK_TURLERI = ["sergi", "konser", "tiyatro", "festival", "soylesi", "atolye", "spor", "diger"];
export const ETKINLIK_ILERI_GUN = 60;       // başlangıç bugünden en çok bu kadar sonra
export const ETKINLIK_SURE_UST = 120;       // bitiş <= başlangıç + 120 gün (sunucu sözleşmesi)

export const SEHIRLER = ["Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa",
  "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu",
  "Kayseri", "Kilis", "Kırıkkale", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop", "Sivas", "Şırnak",
  "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"];

// ilçe -> il (yaygın kültür-sanat ilçeleri; "Fatih", "Konak", "Selçuk", "Tire" gibi sıradan sözcük/ad olanlar bilerek YOK)
const ILCELER = {
  "İstanbul": ["Adalar", "Arnavutköy", "Ataşehir", "Avcılar", "Bağcılar", "Bahçelievler", "Bakırköy", "Başakşehir", "Bayrampaşa", "Beşiktaş", "Beykoz", "Beylikdüzü", "Beyoğlu", "Büyükçekmece", "Çatalca", "Çekmeköy", "Esenler", "Esenyurt", "Eyüpsultan", "Gaziosmanpaşa", "Güngören",
    "Kadıköy", "Kağıthane", "Kartal", "Küçükçekmece", "Maltepe", "Pendik", "Sancaktepe", "Sarıyer", "Silivri", "Sultanbeyli", "Sultangazi", "Şile", "Şişli", "Tuzla", "Ümraniye", "Üsküdar", "Zeytinburnu"],
  "Ankara": ["Altındağ", "Ayaş", "Beypazarı", "Çamlıdere", "Çankaya", "Elmadağ", "Etimesgut", "Gölbaşı", "Güdül", "Haymana", "Kahramankazan", "Kalecik", "Keçiören", "Kızılcahamam", "Mamak", "Nallıhan", "Polatlı", "Pursaklar", "Sincan", "Şereflikoçhisar", "Yenimahalle"],
  "İzmir": ["Aliağa", "Balçova", "Bayındır", "Bayraklı", "Bergama", "Beydağ", "Bornova", "Buca", "Çeşme", "Çiğli", "Dikili", "Foça", "Gaziemir", "Güzelbahçe", "Karabağlar", "Karaburun", "Karşıyaka", "Kemalpaşa", "Kınık", "Menemen", "Narlıdere", "Ödemiş", "Seferihisar", "Torbalı", "Urla"],
  "Antalya": ["Muratpaşa", "Konyaaltı", "Kepez", "Alanya", "Manavgat", "Kemer", "Kaş"],
  "Muğla": ["Bodrum", "Marmaris", "Fethiye", "Datça", "Milas"],
  "Bursa": ["Nilüfer", "Osmangazi", "Yıldırım", "Mudanya", "İznik"],
  "Kocaeli": ["İzmit", "Gebze", "Gölcük"],
  "Eskişehir": ["Odunpazarı", "Tepebaşı"],
  "Gaziantep": ["Şahinbey", "Şehitkamil"],
  "Konya": ["Selçuklu", "Meram", "Karatay"],
  "Adana": ["Seyhan", "Çukurova", "Yüreğir"],
  "Trabzon": ["Ortahisar", "Akçaabat"],
  "Samsun": ["Atakum", "İlkadım", "Canik"],
};
// Sıradan sözcükle karışan adlar: yalnız büyük harfle başlıyorsa yer adı sayılır
const BELIRSIZ = new Set(["Ağrı", "Aydın", "Batman", "Muş", "Ordu", "Van", "Kaş", "Bolu", "Kars", "Adalar", "Bala", "Kepez"]);

// ---------------------------------------------------------------- yer adı eşleştirme (Türkçe harf/büyük-küçük harf toleranslı, ek tolere: İstanbul'da, Kadıköy'de)
const SINIF = { i: "[iİıI]", ı: "[iİıI]", ş: "[şsŞS]", ğ: "[ğgĞG]", ü: "[üuÜU]", ö: "[öoÖO]", ç: "[çcÇC]", â: "[âaÂA]", î: "[îiÎI]", û: "[ûuÛU]" };
function adRe(ad, buyukZorunlu) {
  const harfler = [...ad.toLocaleLowerCase("tr")];
  const parca = harfler.map((c, i) => {
    if (i === 0 && buyukZorunlu) { const b = c === "i" || c === "ı" ? "[İI]" : c.toLocaleUpperCase("tr"); return b; }
    return SINIF[c] || `[${c}${c.toLocaleUpperCase("tr")}]`;
  });
  return new RegExp("(?<![\\p{L}])" + parca.join("") + "(?![\\p{L}])", "gu");
}
const YER_RE = [
  ...SEHIRLER.map((il) => ({ il, ad: il, re: adRe(il, BELIRSIZ.has(il)) })),
  ...Object.entries(ILCELER).flatMap(([il, l]) => l.map((ad) => ({ il, ad, re: adRe(ad, BELIRSIZ.has(ad)) }))),
];
const katla = (t) => String(t ?? "").toLocaleLowerCase("tr").normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();

/** Metindeki il/ilçe geçişleri -> [{il, ad, konum}] */
export function yerleriBul(metin) {
  const m = String(metin ?? ""), r = [];
  for (const y of YER_RE) { y.re.lastIndex = 0; for (const e of m.matchAll(y.re)) r.push({ il: y.il, ad: y.ad, konum: e.index }); }
  return r;
}
const YER_ADLARI = new Set([...SEHIRLER, ...Object.values(ILCELER).flat()].map(katla));
const yerAdiMi = (k) => YER_ADLARI.has(k);
/** Model sehir değeri -> kanonik il ("Kadıköy" -> "İstanbul", "istanbul" -> "İstanbul") | "" */
export function sehirKanonik(deger) {
  const d = String(deger ?? "").trim();
  if (!d || d.length > 60) return "";
  const k = katla(d);
  const il = SEHIRLER.find((s) => katla(s) === k);
  if (il) return il;
  for (const [i, l] of Object.entries(ILCELER)) if (l.some((x) => katla(x) === k)) return i;
  const ilk = yerleriBul(d)[0];                       // "İstanbul, Kadıköy" ya da "Kadıköy / İstanbul"
  return ilk ? ilk.il : "";
}

// ---------------------------------------------------------------- tarih yardımcıları (UTC, ISO)
const pad = (n) => String(n).padStart(2, "0");
const iso = (y, a, g) => `${y}-${pad(a)}-${pad(g)}`;
const gecerli = (y, a, g) => { const d = new Date(Date.UTC(y, a - 1, g)); return d.getUTCFullYear() === y && d.getUTCMonth() === a - 1 && d.getUTCDate() === g; };
const gunNo = (s) => Math.floor(Date.parse(s + "T00:00:00Z") / 86400000);
const isoMu = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && gecerli(+s.slice(0, 4), +s.slice(5, 7), +s.slice(8, 10));
/** Türkiye saatine göre gün (UTC+3). */
export const trGun = (ms) => new Date(ms + 3 * 3600_000).toISOString().slice(0, 10);

const trAyAd = "ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik";
const AY_TR = ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"];
const AY_EN = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const harfIsle = (s) => s.replace(/i/g, "[iİ]");                       // "EKİM", "NİSAN" büyük harf biçimleri
const TR_ALT = trAyAd.split("|").sort((a, b) => b.length - a.length).map(harfIsle).join("|");
const EN_ALT = "january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec";
const ayNoTr = (s) => { const k = katla(s); const i = AY_TR.findIndex((a) => katla(a) === k); return i + 1; };
const ayNoEn = (s) => { const k = s.toLowerCase().replace(/\.$/, ""); const i = AY_EN.findIndex((a) => a === k || a.slice(0, 3) === k.slice(0, 3)); return i + 1; };

const R_TR = new RegExp(`(?<![\\d.,/:\\-–—])(\\d{1,2})\\.?(?:\\s*(?:[-–—]|ile|ila|ve)\\s*(\\d{1,2})\\.?)?\\s+(${TR_ALT})(?![\\p{L}])(?:[\\s,]+(20\\d\\d)(?!\\d))?`, "giu");
const R_EN1 = new RegExp(`(?<![\\p{L}])(${EN_ALT})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?!\\d)(?:\\s*(?:[-–—]|to|through|thru|and|until|till)\\s*(\\d{1,2})(?:st|nd|rd|th)?(?![\\d:]))?(?:,?\\s+(20\\d\\d)(?!\\d))?`, "giu");
const R_EN2 = new RegExp(`(?<![\\d.,/:\\-–—])(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*(?:[-–—]|to|through|thru|and)\\s*(\\d{1,2})(?:st|nd|rd|th)?)?\\s+(?:of\\s+)?(${EN_ALT})(?![\\p{L}])(?:,?\\s+(20\\d\\d)(?!\\d))?`, "giu");
const R_SAYI = /(?<![\d.,/])(\d{1,2})[./](\d{1,2})[./](20\d\d)(?!\d)/g;
const R_ISO = /(?<![\d-])(20\d\d)-(\d{2})-(\d{2})(?!\d)/g;
const BAGLAC = /^(?:\s*['’]\s*(?:den|dan|ten|tan)\b)?\s*(?:[-–—]|ile|ila|ve|to|and|through|thru|until|till)?\s*$/i;
const KADAR_SONRA = /^\s*(?:['’]\s*(?:e|a|ye|ya|ne|na)\s+)?(?:tarihine\s+|tarihi\s+|günü\s+)?(?:kadar|dek|değin)(?![\p{L}])/iu;
const KADAR_ONCE = /(?:until|till|through|thru|ends? on|closes? on|runs until|on view until|open until|kadar)\s*$/i;

/**
 * Metindeki tarih anları. -> [{g, a, y|null, bas, son, kadar, es?}]  (es: aralığın öbür ucunun dizin numarası; aralıkta ilk uç "bas", ikinci uç "son")
 * Biçimler: "14 Ekim", "14-29 Ekim", "14 Ekim ile 29 Ekim arasında", "29 Ekim'e kadar", "October 14", "Oct 14–29", "14 October", "14.10.2026", "2026-10-14".
 */
export function tarihAnlari(metin, { dil = "tr" } = {}) {
  const m = String(metin ?? "").slice(0, 12000), l = [];
  const ekle = (g, a, y, bas, son, ek = {}) => { g = +g; a = +a; y = y ? +y : null; if (a >= 1 && a <= 12 && g >= 1 && g <= 31 && (y === null || gecerli(y, a, g) || (a === 2 && g === 29))) l.push({ g, a, y, bas, son, kadar: false, ...ek }); };
  const aralik = (g1, g2, a, y, bas, son) => {            // "14-29 Ekim": iki uç, ikincisi ayı/yılı taşır
    if (g2 && +g2 > +g1) { const i = l.length; ekle(g1, a, y, bas, son, { es: i + 1, uc: "bas" }); ekle(g2, a, y, bas, son, { es: i, uc: "son" }); }
    else ekle(g1, a, y, bas, son);
  };
  for (const e of m.matchAll(R_TR)) aralik(e[1], e[2], ayNoTr(e[3]), e[4], e.index, e.index + e[0].length);
  for (const e of m.matchAll(R_EN1)) aralik(e[2], e[3], ayNoEn(e[1]), e[4], e.index, e.index + e[0].length);
  for (const e of m.matchAll(R_EN2)) aralik(e[1], e[2], ayNoEn(e[3]), e[4], e.index, e.index + e[0].length);
  for (const e of m.matchAll(R_SAYI)) { if (dil === "en" && e[0].includes("/") && +e[1] <= 12 && +e[2] <= 12) continue; ekle(e[1], e[2], e[3], e.index, e.index + e[0].length); }
  for (const e of m.matchAll(R_ISO)) ekle(e[3], e[2], e[1], e.index, e.index + e[0].length);
  // konuma göre sırala (es dizinleri yeniden eşlenir)
  const sira = l.map((x, i) => ({ x, i })).sort((p, q) => p.x.bas - q.x.bas || p.x.son - q.x.son || p.i - q.i);
  const yeni = new Map(sira.map((p, k) => [p.i, k]));
  const s = sira.map((p) => ({ ...p.x, ...(p.x.es !== undefined ? { es: yeni.get(p.x.es) } : {}) }));
  // bağlaçla ayrı ardışık iki tekil: "14 Ekim ile 29 Ekim", "14 Ekim'den 29 Ekim'e kadar", "October 14 to November 2"
  for (let i = 0; i + 1 < s.length; i++) {
    const x = s[i], y = s[i + 1];
    if (x.es !== undefined || y.es !== undefined || x.uc || y.uc) continue;
    const ara = m.slice(x.son, y.bas);
    if (ara.length <= 24 && ara.trim() && BAGLAC.test(ara)) { x.es = i + 1; y.es = i; x.uc = "bas"; y.uc = "son"; }
  }
  for (const x of s) {
    if (x.uc === "bas") continue;
    if (KADAR_SONRA.test(m.slice(x.son, x.son + 40)) || KADAR_ONCE.test(m.slice(Math.max(0, x.bas - 28), x.bas))) x.kadar = true;
  }
  return s;
}

const yilBul = (g, a, ref) => {                 // yıl yoksa yayın tarihine göre en yakın gelecek yıl
  let y = +ref.slice(0, 4);
  for (let k = 0; k < 6; k++, y++) if (gecerli(y, a, g) && iso(y, a, g) >= ref) return y;
  return +ref.slice(0, 4);
};
/** Her an için çözümlenmiş tarih (t) ve, aralıkta, öbür ucun tarihi (esT). */
function cozumle(anlar, ref) {
  const r = anlar.map((x) => ({ ...x, t: x.y && gecerli(x.y, x.a, x.g) ? iso(x.y, x.a, x.g) : null }));
  for (let i = 0; i < r.length; i++) {
    const x = r[i];
    if (x.uc !== "son" || x.es === undefined) continue;
    const b = r[x.es];
    if (!x.t) {                                    // bitiş: yıl yoksa (başlangıç yılı varsa ona göre) en yakın gelecek yıl
      if (b.y) { const y = gecerli(b.y, x.a, x.g) && iso(b.y, x.a, x.g) >= iso(b.y, b.a, b.g) ? b.y : b.y + 1; x.t = gecerli(y, x.a, x.g) ? iso(y, x.a, x.g) : null; }
      else { const y = yilBul(x.g, x.a, ref); x.t = gecerli(y, x.a, x.g) ? iso(y, x.a, x.g) : null; }
    }
    if (!b.t && x.t) {                             // başlangıç: bitişten önceki en yakın yıl ("20 Aralık - 5 Ocak" -> bitişten bir önceki yıl)
      const ey = +x.t.slice(0, 4);
      const y = gecerli(ey, b.a, b.g) && iso(ey, b.a, b.g) <= x.t ? ey : ey - 1;
      b.t = gecerli(y, b.a, b.g) ? iso(y, b.a, b.g) : null;
    }
  }
  for (const x of r) if (!x.t && !x.uc) { const y = yilBul(x.g, x.a, ref); x.t = gecerli(y, x.a, x.g) ? iso(y, x.a, x.g) : null; }
  const tumu = r.map((x) => x.t).filter(Boolean);
  for (const x of r) {                              // yalnız (aralıksız) başlangıç anı: aynı kaynakta SONRA gelen kanıtlı bir tarihin (<=120 gün) öncesi de olabilir ("14 Ekim'de açılan sergi 29 Ekim'e kadar")
    x.alt = [];
    if (x.uc || x.y) continue;
    for (const d of tumu) {
      const y = +d.slice(0, 4);
      for (const yy of [y, y - 1]) if (gecerli(yy, x.a, x.g)) { const c = iso(yy, x.a, x.g); if (c <= d && gunNo(d) - gunNo(c) <= ETKINLIK_SURE_UST && c !== x.t) x.alt.push(c); }
    }
  }
  return r;
}

/** Ön eleme (model çağrısı yok): başlık/özette etkinlik sözcüğü + bugünden itibaren 60 gün içinde bir tarih var mı? Eski duyuru etkinlik gelecekteyse aday kalır. */
const ETKINLIK_SOZ = /(?:sergi|konser|tiyatro|festival|söyleşi|soylesi|imza günü|atölye|atolye|fuar|koşu|maraton|gösteri|bale\b|opera\b|resital|oyunu|exhibition|concert|theatre|theater|workshop|marathon|book fair|talk\b|recital|performance)/i;
export function etkinlikAdayi(aday, simdi = Date.now()) {
  const metin = `${aday?.baslik || ""} ${aday?.ozet || ""}`;
  if (!ETKINLIK_SOZ.test(metin)) return false;
  const bugun = trGun(simdi), ref = trGun(Date.parse(aday?.zaman || "") || simdi), son = trGun(simdi + ETKINLIK_ILERI_GUN * 86400_000);
  const r = cozumle(tarihAnlari(metin, { dil: aday?.dil || "tr" }), ref);
  return r.some((x) => [x.t, ...x.alt].some((d) => d && d >= bugun && d <= son));
}

// ---------------------------------------------------------------- doğrulama
const GENEL_AD = new Set("sergi sergisi konser konseri tiyatro tiyatrosu festival festivali söyleşi söyleşisi atölye atölyesi fuar fuarı koşu koşusu maraton maratonu gösteri gösterisi bale opera resital ve ile the and of for in at on a an exhibition concert theatre theater workshop marathon fair talk show festivals".split(" ").map(katla));
const ONCEKI_TUR = {
  sergi: /sergi|exhibition|galeri|gallery|müze|museum/i,
  konser: /konser|concert|recital|resital|orkestra|orchestra|müzik|music|şarkı|live\b/i,
  tiyatro: /tiyatro|theat|oyun\b|oyunu|bale|ballet|opera|gösteri|sahne|stage|dans\b|dance|performance|musical|müzikal/i,
  festival: /festival|şenlik|fest\b/i,
  soylesi: /söyleşi|soylesi|imza günü|panel|konferans|talk\b|lecture|book signing|conversation|sohbet|buluşma|kitap fuarı|book fair|fuar/i,
  atolye: /atölye|atolye|workshop|eğitim|class\b|masterclass/i,
  spor: /koşu|maraton|run\b|marathon|yarış|turnuva|tournament|bisiklet|cycling|yüzme|swim|spor|triatlon|triathlon|futbol|basketbol|voleybol|tenis|yürüyüş|walk\b/i,
};
const TUR_SIRA = ["festival", "sergi", "tiyatro", "konser", "soylesi", "atolye", "spor"];
function turTahmin(metin) { for (const t of TUR_SIRA) if (ONCEKI_TUR[t].test(metin)) return t; return "diger"; }

const CEVRIMICI = /çevrimiçi|çevrim içi|online (?:etkinlik|söyleşi|atölye|konser|sergi|event|workshop|talk|concert|exhibition|festival|panel|class)|webinar|sanal (?:sergi|etkinlik|tur|konser)|virtual (?:event|exhibition|tour|concert|workshop|festival)|livestream|live-stream|canlı yayınlanacak|yayınlanacak|zoom\b|streamed|internet üzerinden|dijital ortamda/i;
const DERLEME_BASLIK = /(?:etkinlik(?:ler)?\s*(?:takvimi|rehberi|listesi)|takvimi\b|ajandası|ajanda\b|neler var|nerede\b|yapılacak(?:lar)?\s+(?:şeyler|etkinlik)|things to do|what'?s on|events? guide|event calendar|roundup|round-up|this weekend|hafta sonu|haftanın|\b\d{1,2}\s+(?:etkinlik|sergi|konser|festival|tiyatro|oyun)\b|best (?:events|concerts|exhibitions)|top \d+|agenda)/i;
const GECMIS_FIIL = /(?:yapıldı|gerçekleştirildi|gerçekleşti|sona erdi|tamamlandı|kapandı|took place|was held|were held|concluded|wrapped up|has ended|\bended\b|\bwon\b|kazandı)/i;
const GELECEK_ISARET = /(?:yapılacak|düzenlenecek|gerçekleşecek|başlıyor|başlayacak|açılıyor|açılacak|devam ediyor|sürecek|\bkadar\b|\bdek\b|buluşuyor|buluşacak|ağırlayacak|sahne alacak|sahnelenecek|\bwill\b|to be held|opens|begins|starts|until|through|continues|\bruns\b|on view|kapılarını açıyor|izlenebilecek|görülebilecek|gezilebilir)/i;
const UCRETSIZ = /ücretsiz|bedava|giriş serbest|girişler? serbest|ücret alınmayacak|free admission|free entry|free entrance|free of charge|admission is free|entry is free|free to attend|free event|free and open to the public|free (?:concert|exhibition|festival|workshop|screening|tour|performance|show|talk)|no charge|no admission fee/i;
const UCRETLI = /ücretli|biletli|bilet (?:fiyat|ücret)|ücretsiz değil|not free|tickets? (?:cost|costs|are|from|start|priced)|admission fee|entry fee|giriş ücreti|₺|\bTL\b|\d\s*lira|\$\s?\d|€\s?\d|£\s?\d|\d\s?(?:USD|EUR|GBP)/i;

function saatler(m) {
  const k = new Set(), ekle = (h, dk) => { if (+h <= 23 && +dk <= 59) k.add(`${pad(h)}:${pad(dk)}`); };
  for (const e of m.matchAll(/(?<![\d.:,/])([01]?\d|2[0-3]):([0-5]\d)(?![\d]|[.:]\d)/g)) { if (/^\d{4}$/.test(e[0].replace(":", "")) && /[.\-/]\s?$/.test(m.slice(Math.max(0, e.index - 2), e.index))) continue; ekle(e[1], e[2]); }
  for (const e of m.matchAll(/saat\s+([01]?\d|2[0-3])[.:]([0-5]\d)(?![\d]|\.\d)/gi)) ekle(e[1], e[2]);
  for (const e of m.matchAll(/saat\s+([01]?\d|2[0-3])(?![\d:.])/gi)) ekle(e[1], 0);
  for (const e of m.matchAll(/(?<![\d:.])(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*([ap])\.?m\.?(?![\p{L}])/giu)) { let h = +e[1] % 12; if (e[3].toLowerCase() === "p") h += 12; ekle(h, e[2] || 0); }
  return k;
}

const cumleAraligi = (m, bas, son) => {
  let b = bas, s = son;
  while (b > 0 && !/[.!?\n]/.test(m[b - 1])) b--;
  while (s < m.length && !/[.!?\n]/.test(m[s])) s++;
  return m.slice(b, s);
};

/**
 * ham: modelin `etkinlik` nesnesi. baglam: { kaynak (başlık+özet+sayfa), kaynakBaslik, yazilan (yazılan TR+EN metin), yayinZamani (ISO), simdi (ms), dil ("tr"|"en"), yasakFn?: (...metin) => [] (konu denetimi) }
 * -> { etkinlik: {...} | null, neden: "" }   neden: ham verilmiş ama atıldıysa kısa kod (bicim|tarih|gecmis|cok-ileri|uzun|celiski|sehir|derleme|cevrimici|konu|ad); ham yoksa neden "".
 */
export function etkinlikDogrula(ham, baglam = {}) {
  if (!ham || typeof ham !== "object" || Array.isArray(ham) || !Object.keys(ham).length) return { etkinlik: null, neden: "" };
  const ret = (neden) => ({ etkinlik: null, neden });
  const kaynak = String(baglam.kaynak ?? "").slice(0, 12000), baslikK = String(baglam.kaynakBaslik ?? "");
  const simdi = baglam.simdi ?? Date.now(), bugun = trGun(simdi);
  const ref = baglam.yayinZamani && Number.isFinite(Date.parse(baglam.yayinZamani)) ? trGun(Date.parse(baglam.yayinZamani)) : bugun;

  // ---- biçim: ad
  const ad = typeof ham.ad === "string" ? ham.ad.replace(/\s+/g, " ").replace(/^["“”'‘’]+|["“”'‘’]+$/g, "").trim() : "";
  if (ad.length < 2 || ad.length > 120 || /https?:\/\/|www\.|[*_#`!]|\p{Extended_Pictographic}/u.test(ad)) return ret("bicim");
  if (!denetle(ad).ok) return ret("konu");
  // ---- derleme / çevrimiçi
  if (DERLEME_BASLIK.test(baslikK)) return ret("derleme");
  if (CEVRIMICI.test(baslikK + " " + kaynak)) return ret("cevrimici");

  // ---- tarih kanıtı
  const B0 = typeof ham.baslangic === "string" ? ham.baslangic.trim() : "", E0 = typeof ham.bitis === "string" ? ham.bitis.trim() : "";
  if (!isoMu(B0) && !isoMu(E0)) return ret("tarih");
  const anlar = cozumle(tarihAnlari(kaynak, { dil: baglam.dil || "tr" }), ref);
  if (!anlar.length) return ret("tarih");
  const esle = (d) => anlar.filter((x) => d && [x.t, ...x.alt].includes(d));
  const mB = isoMu(B0) ? esle(B0) : [], mE = isoMu(E0) ? esle(E0) : [];
  let B = null, E = null, bAn = null;
  if (mB.length) {
    B = B0; bAn = mB.find((x) => x.uc === "bas") || mB[0];
    // kaynaktaki aralık bitişi gerçektir: model bitişi çelişiyorsa tümden vazgeç, yoksa kaynaktan tamamla
    const es = bAn.uc === "bas" && bAn.es !== undefined ? anlar[bAn.es] : null;
    if (es?.t) { if (isoMu(E0) && E0 !== es.t && E0 !== B0) return ret("celiski"); E = es.t; }
    else if (mE.length && E0 !== B0) E = E0;
  } else if (mE.length && mE.some((x) => x.kadar)) {          // yalnız "29 Ekim'e kadar": sergi şu an açık; başlangıç = bugün
    B = bugun; E = E0;
  } else return ret("tarih");
  if (E === B) E = null;
  const bitisEf = E || B;
  if (bitisEf < bugun) return ret("gecmis");
  if (gunNo(B) - gunNo(bugun) > ETKINLIK_ILERI_GUN) return ret("cok-ileri");
  if (E && E < B) return ret("celiski");
  if (E && gunNo(E) - gunNo(B) > ETKINLIK_SURE_UST) return ret("uzun");
  // geçmiş anlatım: tarihin geçtiği cümle geçmiş zamanlı ve gelecek/süren işareti yoksa
  const cumle = cumleAraligi(kaynak, bAn?.bas ?? 0, bAn?.son ?? 0);
  if (bAn && GECMIS_FIIL.test(cumle) && !GELECEK_ISARET.test(cumle)) return ret("gecmis");
  // derleme: etkinlik aralığı dışında, yakın gelecekte 2'den fazla başka tarih
  const aralikDisi = new Set();
  for (const x of anlar) if (x.t && x.t >= bugun && gunNo(x.t) - gunNo(bugun) <= ETKINLIK_ILERI_GUN && !(x.t >= B && x.t <= bitisEf)) aralikDisi.add(x.t);
  if (aralikDisi.size > 2) return ret("derleme");

  // ---- şehir kanıtı
  const sehir = sehirKanonik(ham.sehir);
  if (!sehir) return ret("sehir");
  const yerler = yerleriBul(kaynak), iller = new Set(yerler.map((y) => y.il));
  if (!iller.has(sehir)) return ret("sehir");
  if (iller.size >= 4) return ret("derleme");
  const bConum = bAn?.bas ?? 0, eAn = E ? anlar.find((x) => x.t === E) : null;
  const yakin = yerler.some((y) => y.il === sehir && (y.konum < baslikK.length || Math.abs(y.konum - bConum) <= 300 || (eAn && Math.abs(y.konum - eAn.bas) <= 300)));
  if (!yakin && iller.size > 1) return ret("sehir");

  // ---- ad: büyük harfli özel ad sözcüklerinin tümü kaynakta, en az biri yazılan metinde geçmeli
  const kayK = " " + katla(kaynak) + " ", yazK = " " + katla(baglam.yazilan ?? "") + " ";
  const ozelSoz = ad.split(/[\s\-–—/:,]+/).map((w) => w.replace(/^["“‘'(]+|["”’'),.;:]+$/g, "")).filter((w) => w.length >= 3 && /^\p{Lu}/u.test(w));
  const anahtarSoz = ozelSoz.map(katla).filter((w) => w && !GENEL_AD.has(w) && !/^\d+$/.test(w));
  if (!anahtarSoz.length) return ret("ad");
  const oneki = (w) => " " + w.slice(0, Math.min(5, w.length));
  if (!anahtarSoz.every((w) => kayK.includes(oneki(w)))) return ret("ad");
  if (!anahtarSoz.some((w) => yazK.includes(oneki(w)))) return ret("ad");
  if (typeof baglam.yasakFn === "function" && baglam.yasakFn(ad, baslikK).length) return ret("konu");

  // ---- isteğe bağlı alanlar (kanıtlanamazsa yalnız o alan atılır)
  let mekan = typeof ham.mekan === "string" ? ham.mekan.replace(/\s+/g, " ").trim() : "";
  if (mekan) {
    const mk = katla(mekan);
    if (mekan.length > 80 || mekan.length < 3 || mk.length < 3 || yerAdiMi(mk) || /https?:|[*_#`!]/.test(mekan) || !kayK.includes(" " + mk)) mekan = "";
  }
  let saat = "";
  if (typeof ham.saat === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(ham.saat.trim())) {
    const s = saatler(kaynak);
    if (s.size === 1 && s.has(ham.saat.trim())) saat = ham.saat.trim();
  }
  const ucretsiz = ham.ucretsiz === true && UCRETSIZ.test(kaynak) && !UCRETLI.test(kaynak);
  let tur = typeof ham.tur === "string" ? ham.tur.trim().toLowerCase().replace(/ö/g, "o").replace(/ş/g, "s").replace(/ı/g, "i").replace(/ç/g, "c") : "";
  const turMetni = `${ad} ${baslikK} ${baglam.yazilan ?? ""}`;
  if (!ETKINLIK_TURLERI.includes(tur) || (tur !== "diger" && !ONCEKI_TUR[tur].test(turMetni))) tur = turTahmin(turMetni);

  return { etkinlik: { ad, sehir, ...(mekan ? { mekan } : {}), baslangic: B, ...(E ? { bitis: E } : {}), ...(saat ? { saat } : {}), tur, ...(ucretsiz ? { ucretsiz: true } : {}) }, neden: "" };
}

/** Türkiye sınır kutusu (yaklaşık): sunucu sözleşmesi; dışındaki koordinat GÖNDERİLMEZ. */
export const TR_KUTU = { enlemMin: 35.8, enlemMax: 42.2, boylamMin: 25.6, boylamMax: 44.9 };
const onda5 = (x) => Number.isFinite(x) && Math.abs(Math.round(x * 1e5) / 1e5 - x) < 1e-9;
/** konum {enlem, boylam (5 ondalık), kesin:boolean} sözleşmeye uygun mu ve Türkiye kutusunda mı? */
export function konumGecerli(k) {
  return !!k && typeof k === "object" && !Array.isArray(k) && typeof k.kesin === "boolean" && typeof k.enlem === "number" && typeof k.boylam === "number" && onda5(k.enlem) && onda5(k.boylam)
    && k.enlem >= TR_KUTU.enlemMin && k.enlem <= TR_KUTU.enlemMax && k.boylam >= TR_KUTU.boylamMin && k.boylam <= TR_KUTU.boylamMax;
}

/** Yayın yükü kapısı (bulut.mjs): sözleşmeye uygun mu? (kod doğrulaması zaten yapıldı; biçim emniyeti) */
export function etkinlikYukuGecerli(e) {
  return !!e && typeof e === "object" && (e.konum === undefined || konumGecerli(e.konum)) && typeof e.ad === "string" && e.ad.length >= 2 && e.ad.length <= 120 && typeof e.sehir === "string" && e.sehir.length > 0 && e.sehir.length <= 40
    && isoMu(e.baslangic) && (e.bitis === undefined || (isoMu(e.bitis) && e.bitis >= e.baslangic && gunNo(e.bitis) - gunNo(e.baslangic) <= ETKINLIK_SURE_UST))
    && ETKINLIK_TURLERI.includes(e.tur) && (e.mekan === undefined || (typeof e.mekan === "string" && e.mekan.length <= 80)) && (e.saat === undefined || /^([01]\d|2[0-3]):[0-5]\d$/.test(e.saat));
}

/** Saklı (bekleyen) yükteki etkinlik hâlâ geçerli mi (bitiş >= bugün)? */
export const etkinlikSuresiDoldu = (e, simdi = Date.now()) => !!e && (e.bitis || e.baslangic) < trGun(simdi);

// ---------------------------------------------------------------- tekrar denetimi: aynı etkinlik (ad + şehir + başlangıç) ikinci kez yayınlanmasın
const adKelimeleri = (ad) => new Set(katla(ad).split(" ").filter((w) => w.length >= 3 && !GENEL_AD.has(w)));
export function etkinlikAyniMi(x, y) {
  if (!x || !y || katla(x.sehir ?? x.s) !== katla(y.sehir ?? y.s)) return false;
  if ((x.baslangic ?? x.b) !== (y.baslangic ?? y.b)) return false;
  const a = katla(x.ad ?? x.a), b = katla(y.ad ?? y.a);
  if (a === b) return true;
  const p = adKelimeleri(a), q = adKelimeleri(b);
  if (!p.size || !q.size) return false;
  let ort = 0; for (const w of p) if (q.has(w) || [...q].some((v) => v.length >= 5 && w.length >= 5 && v.slice(0, 5) === w.slice(0, 5))) ort++;
  return ort / Math.min(p.size, q.size) >= 0.5;
}
/** Kalıcı defter kaydı (hat_durum "etkinlik:defter"): küçük biçim. */
export const etkinlikDefterKaydi = (e) => ({ a: katla(e.ad).slice(0, 60), s: e.sehir, b: e.baslangic, e: e.bitis || e.baslangic });
/** Defteri temizle: bitmiş etkinlikler çıkar, en çok 300 kayıt. */
export function etkinlikDefteriTemizle(liste, simdi = Date.now()) {
  const sinir = trGun(simdi - 86400_000);
  return (Array.isArray(liste) ? liste : []).filter((k) => k && typeof k.a === "string" && typeof k.s === "string" && isoMu(k.b) && isoMu(k.e) && k.e >= sinir).slice(-300);
}
export const ETKINLIK_DEFTER_ANAHTARI = "etkinlik:defter";
