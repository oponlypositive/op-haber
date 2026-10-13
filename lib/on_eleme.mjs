// Deterministik ön eleme: C3/C3b konu kapısı (yerel hattın op_konu_yasak karşılığı) + çift filtre (moderasyon.mjs) + tazelik
// + görülen bağlantı mantığı + ikinci kaynak doğrulaması. Model çağrılmadan önce çalışır.
import { denetle } from "./moderasyon.mjs";
import { alanOnEleme } from "./alanlar.mjs";
import { turOnEleme } from "./kurum.mjs";

// Python desenleri Unicode'a uyarlanır: \w -> harf/rakam, \b -> kelime sınırı (Türkçe harflerle de çalışsın).
const W = "[\\p{L}\\p{N}_]", SON = "(?![\\p{L}\\p{N}_])", ON = "(?<![\\p{L}\\p{N}_])";
const uyarla = (k) => k.replace(/\\w/g, W).replace(/(^|\|)\\b/g, (_, a) => a + ON).replace(/\\b/g, SON);
const derle = (k) => new RegExp(ON + "(?:" + uyarla(k) + ")", "iu");

const YASAK = derle(
  "government\\w*|ministr\\w*|mayor\\w*|municipal\\w*|police|arrest\\w*|courthouse|supreme court|high court|court (?:ruled|rules|case|order)|judge\\w*|prison\\w*|jail\\w*|military|army|soldier\\w*|troops?|" +
  "war\\b|ceasefire|missile\\w*|bomb\\w*|attackers?|terror\\w*|crime\\w*|criminal\\w*|murder\\w*|kidnap\\w*|violen\\w*|election\\w*|parliament\\w*|" +
  "president\\b|senat\\w*|minister\\w*|lawmaker\\w*|protest\\w*|sanction\\w*|" +
  "hükümet\\w*|bakanlık\\w*|belediye başkan\\w*|polis\\w*|tutuklan\\w*|mahkeme\\w*|hapis\\w*|ordu\\b|asker\\w*|savaş\\w*|çatışma\\w*|saldırı\\w*|suç\\b|cinayet\\w*|" +
  "seçim\\w*|cumhurbaşkan\\w*|meclis\\w*|protesto\\w*");

const ANA_TEMA = {
  afet: "earthquake\\w*|quake\\w*|flood\\w*|wildfire\\w*|forest fire\\w*|bushfire\\w*|hurricane\\w*|tsunami\\w*|landslide\\w*|mudslide\\w*|avalanche\\w*|tornado\\w*|cyclone\\w*|typhoon\\w*|volcan\\w*|eruption\\w*|" +
    "drought\\w*|natural disaster\\w*|disaster\\w*|catastroph\\w*|deprem\\w*|sel\\b|seller\\w*|sel felaket\\w*|orman yangın\\w*|yangın\\w*|kasırga\\w*|heyelan\\w*|çığ\\b|hortum\\w*|afet\\w*|felaket\\w*|kuraklık\\w*|volkan\\w*",
  salgin: "pandemic\\w*|outbreak\\w*|epidemic\\w*|virus\\w*|coronavirus\\w*|covid\\w*|quarantine\\w*|lockdown\\w*|pandemi\\w*|salgın\\w*|virüs\\w*|karantina\\w*",
  siyaset: "elections?\\b|parliament\\w*|minister\\w*|president\\w*|(?:political|ruling|opposition|governing) part(?:y|ies)|party leader\\w*|politic\\w*|protest\\w*|sanction\\w*|\\bwars?\\b|military|senator\\w*|congress\\w*|" +
    "seçim\\w*|meclis\\w*|bakanlığ\\w*|bakanı\\b|bakanlar\\b|cumhurbaşkan\\w*|siyasi parti\\w*|siyaset\\w*|protesto\\w*|yaptırım\\w*|savaş\\w*|askeri\\w*|milletvekil\\w*",
  din: "church\\w*|mosque\\w*|temple\\w*|synagogue\\w*|cathedral\\w*|monaster\\w*|religio\\w*|prayer\\w*|\\bpray(?:s|ed|ing)?\\b|pope\\b|imam\\w*|priest\\w*|sermon\\w*|pilgrim\\w*|bible|quran|worship\\w*|" +
    "cami\\b|camii\\b|kilise\\w*|dini\\b|dinî\\b|ibadet\\w*|namaz\\w*|ezan\\w*|papaz\\w*",
};
const ANA_TEMA_RE = Object.entries(ANA_TEMA).map(([tema, k]) => [tema, derle(k)]);

/** C3/C3b: boş dizi = temiz. Başlıkta ya da özette tek geçiş de şüpheli sayılır (temkin: elenir). */
export function konuYasak(...metinler) {
  const t = metinler.filter(Boolean).join(" ");
  const sonuc = [];
  const m = YASAK.exec(t);
  if (m) sonuc.push({ kural: "C3", neden: `kurum/suç/savaş/siyaset: ${m[0]}` });
  for (const [tema, rx] of ANA_TEMA_RE) {
    const e = rx.exec(t);
    if (e) sonuc.push({ kural: "C3b", neden: `ana tema ${tema}: ${e[0]}` });
  }
  return sonuc;
}

// Haber OLMAYAN içerik (altın set g: "Cilt bakımında yapılan yaygın hatalar"): tavsiye/ipucu/liste yazısı, "nasıl yapılır", "tarihte bugün", burç. Yalnız BAŞLIĞA bakılır.
// Başlıkta olay yoksa (kim, ne yaptı) haber değildir; "Students find new ways to recycle" gibi olay anlatan başlıklar geçer (yalnız sayıyla başlayan liste ya da komut kipi kalıpları elenir).
const LISTE_SAYI = "(?:ways|things|reasons|tips|signs|habits|secrets|mistakes|foods|facts|myths|questions|steps|hacks|ideas|tricks|rules|lessons|yol|şey|neden|öneri|ipucu|ipuçları|madde|hata|hatalar|yöntem|besin|alışkanlık|adım|sır|püf)";
const LISTE_SAYI_KALIP = new RegExp("^\\s*(?:top\\s+|en iyi\\s+|best\\s+)?\\d+\\s+(?:\\p{L}+\\s+){0,2}" + LISTE_SAYI + SON, "iu");
const LISTE_KALIP = new RegExp(
  ON + "(?:tips|hacks?|mistakes|dos and don'ts|do's and don'ts|cheat sheet|checklist|quiz|trivia|horoscope|zodiac|astrology|this day in history|on this day|today in history|" +
  "how to|what to (?:know|do|eat|expect)|why you should|should you|everything you need to know|you need to know|you should (?:know|stop|start|never|always)|" +
  "ways to (?:save|stay|get|make|boost|improve|keep|stop|avoid|lose|reduce|prevent)|" +
  "yaygın hata\\p{L}*|sık yapılan\\p{L}*|yapılan (?:yaygın )?hata\\p{L}*|ipuçları|ipucu|püf nokta\\p{L}*|nasıl yapılır|bilmeniz gerek\\p{L}*|yapmanız gerek\\p{L}*|kaçının|dikkat edilmesi gereken\\p{L}*|tavsiye\\p{L}*|" +
  "mutlaka (?:deneyin|yapın|bilin)|tarihte bugün|bugün tarihte|günlük burç\\p{L}*|burçlar|burcu\\p{L}*|astroloji|nasıl\\s+\\p{L}+\\s+(?:yapılır|edilir|olunur))" + SON, "iu");
// Derleme/bülten/özet sayfaları haber değildir ("Lit Hub Daily: October 13", "Weekly Roundup", "Newsletter", "podcast bölümü").
const DERLEME_KALIP = new RegExp(ON + "(?:lit hub (?:daily|weekly)|daily digest|weekly digest|weekly roundup|roundup|round-up|newsletter|this week in|week in review|best of the week|links of the week|podcast episode|haftanın özeti|günün özeti|bülten|news in brief|daily brief|noon briefing)" + SON, "iu");
/**
 * Başlık tavsiye/liste/ipucu/burç/derleme türü bir yazıya benziyorsa eşleşen parçayı döner, yoksa "".
 * yumusak: düşünce/söyleşi yazıları için "how to / you should" gibi kalıplar sayılmaz (yalnız sayılı liste, burç, derleme ve "tarihte bugün").
 */
export function haberOlmayan(baslik, { yumusak = false } = {}) {
  const t = String(baslik || "").trim();
  const m = LISTE_SAYI_KALIP.exec(t) || DERLEME_KALIP.exec(t) || (yumusak ? /(?:horoscope|zodiac|astrology|this day in history|on this day|tarihte bugün|burçlar)/i.exec(t) : LISTE_KALIP.exec(t));
  return m ? m[0].trim().slice(0, 30) : "";
}

/** Aday için ön eleme. -> {ok, neden} */
export function onEleme(aday, { simdi = Date.now(), tazelikSaat = 24 } = {}) {
  const t = Date.parse(aday.zaman || "");
  if (!Number.isFinite(t)) return { ok: false, neden: "tarih yok" };
  if (t > simdi + 3600_000) return { ok: false, neden: "tarih gelecekte" };
  if (simdi - t > (aday.tazelikSaat || tazelikSaat) * 3600_000) return { ok: false, neden: "eski" };   // kaynak özel tazelik süresi (seyrek yayın yapan kurumlar)
  const metin = `${aday.baslik} ${aday.ozet || ""}`;
  const f = denetle(metin);
  if (!f.ok) return { ok: false, neden: `hassas:${f.tur}` };
  const k = konuYasak(aday.baslik, aday.ozet);
  if (k.length) return { ok: false, neden: `${k[0].kural}` };
  if (haberOlmayan(aday.baslik, { yumusak: aday.tur === "soylesi" })) return { ok: false, neden: "liste" };                 // tavsiye/ipucu/liste yazısı haber değildir
  const tur = turOnEleme(aday);                          // kaynak türü: kurum (yalnız somut olumlu sonuç), kişisel gelişim (iddia/liste yok)
  if (!tur.ok) return { ok: false, neden: tur.neden };
  const al = alanOnEleme(aday);                          // spor/sanat/bilim/teknoloji/gökbilim: nötr-olumlu ölçüt + alan yasakları
  if (!al.ok) return { ok: false, neden: al.neden };
  return { ok: true, neden: "" };
}

// ---- benzerlik / ikinci kaynak
const DURAK = new Set("the and for with from that this have has had will your more than then they them been were also just only very into over after about their what when where who how new says said say its are was not can may you our out".split(" "));
export const anahtarKelimeler = (t) => new Set((String(t || "").toLocaleLowerCase("tr").match(/[\p{L}\p{N}]{4,}/gu) || []).filter((k) => !DURAK.has(k)));
export function benzerlik(a, b) {
  const x = anahtarKelimeler(a), y = anahtarKelimeler(b);
  if (!x.size || !y.size) return 0;
  let ort = 0;
  for (const k of x) if (y.has(k)) ort++;
  return ort / Math.min(x.size, y.size);
}
export const siteAdi = (link) => { try { return new URL(link).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
/** Adayın yayıncı sitesi: Google News sonuçlarında bağlantı news.google.com'dur, asıl yayıncı `kaynakSite` alanındadır. */
export const adaySite = (a) => a.kaynakSite || siteAdi(a.link);

export function guvenilirMi(aday, guvenilir) {
  if (aday.kaynakGuvenilir === true) return true;       // kaynaklar.json'da "guvenilir": true işaretli kurum/yayın
  const s = adaySite(aday);
  return guvenilir.some((g) => s === g || s.endsWith("." + g));
}

/**
 * Doğrulama (OP4): güvenilir kaynak tek başına yeter; diğerleri için başka bir sitede aynı olayı anlatan
 * (başlık benzerliği >= eşik) en az bir aday gerekir. -> {ok, neden}
 */
export function dogrulandiMi(aday, hepsi, guvenilir, esik = 0.5) {
  if (guvenilirMi(aday, guvenilir)) return { ok: true, neden: "guvenilir" };
  const site = adaySite(aday);
  const diger = hepsi.find((x) => x !== aday && adaySite(x) !== site && benzerlik(aday.baslik, x.baslik) >= esik);
  return diger ? { ok: true, neden: "ikinci-kaynak" } : { ok: false, neden: "ikinci kaynak yok" };
}

/** Aynı olayın tekrarlarını (başlık benzerliği) ele; ilk gelen kalır. */
export function tekrarlariEle(adaylar, esik = 0.7) {
  const tek = [];
  for (const a of adaylar) if (!tek.some((x) => benzerlik(x.baslik, a.baslik) >= esik)) tek.push(a);
  return tek;
}

/**
 * Görülen mantığı: bulutta tutulan kayıtlara göre adayı sınıflandırır.
 * kayit yok -> "yeni"; durum yayinlandi/elendi -> "atla"; bekliyor_* -> "bekleyen" (deneme sayısıyla).
 */
export function gorulenSinifi(kayit) {
  if (!kayit) return "yeni";
  if (kayit.durum === "yayinlandi" || kayit.durum === "elendi") return "atla";
  if (kayit.durum === "bekliyor_gorsel" || kayit.durum === "bekliyor_kaynak") return "bekleyen";
  return "atla";
}
