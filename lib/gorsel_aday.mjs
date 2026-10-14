// GÖRSEL YÖNETMENİ (2026-10-14): haberin yazım çıktısındaki "görsel planı" (sıralı aday listesi) + Wikidata / Commons araması.
// Plan: yazım çağrısının JSON'unda `gorsel_adaylari` ([{tur, ad_en, ad_tr?, sehir?}], en çok 5). EK model çağrısı yoktur.
// Arama: Wikidata wbsearchentities (anahtarsız, ücretsiz) -> KESİN etiket eşleşmesi -> wbgetentities (P18 görsel, P154 logo) -> Commons dosya bilgisi.
// Bu dosya bağımsızdır (gorsel.mjs bunu çağırır, tersi yok); lisans/denetim kararları gorsel.mjs'tedir.
import { UA, duzMetin } from "./rss.mjs";

export const ADAY_TURLERI = ["kisi", "eser", "mekan", "nesne", "kurum", "konum"];
export const ADAY_UST = 5;
const TUR_TAKMA = { "kişi": "kisi", insan: "kisi", person: "kisi", "mekân": "mekan", yer: "mekan", place: "mekan", venue: "mekan", object: "nesne", material: "nesne", "malzeme": "nesne",
  organization: "kurum", organisation: "kurum", institution: "kurum", work: "eser", artwork: "eser", location: "konum", city: "konum", "şehir": "konum" };

/** Katlama: küçük harf, aksan/İ-ı farkı yok, harf-rakam dışı boşluk. */
export const katla = (t) => String(t ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
const DURAK = new Set(["the", "of", "de", "da", "di", "del", "der", "van", "von", "and", "for", "la", "le", "el", "al", "a", "an", "in", "on", "at"]);
const kelimeler = (t) => katla(t).split(" ").filter((k) => k.length >= 2 && !DURAK.has(k));

/** Ad (tüm anlamlı kelimeleri) havuz metninde TAM KELİME olarak geçiyor mu? */
export function adGeciyor(ad, havuz) {
  const kel = kelimeler(ad);
  if (!kel.length) return false;
  const h = " " + katla(havuz) + " ";
  return kel.every((k) => h.includes(" " + k + " "));
}

const LATIN_AD = /^[\p{Script=Latin}0-9 .'&\-]+$/u;
const temizAd = (v, ust = 60) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, ust) : "");

/**
 * Modelin `gorsel_adaylari` alanını doğrular. havuz: kaynak + EN/TR çıktı metni. Model uydurmasın: metinde geçmeyen ad ATILIR.
 * Kural: tur geçerli; ad_en Latin harfli, 3-60 karakter, en çok 6 kelime; ad_en ya da ad_tr havuzda geçmeli; kisi için tam ad (en az 2 kelime).
 * sehir yalnız havuzda geçiyorsa tutulur; kopyalar atılır; en çok ADAY_UST. -> [{tur, ad_en, ad_tr?, sehir?}]
 */
export function adaylariAyikla(ham, havuz) {
  if (!Array.isArray(ham)) return [];
  const sonuc = [], gorulen = new Set();
  for (const x of ham) {
    if (!x || typeof x !== "object") continue;
    const t0 = temizAd(x.tur, 20).toLowerCase();
    const tur = ADAY_TURLERI.includes(t0) ? t0 : TUR_TAKMA[t0];
    const ad_en = temizAd(x.ad_en), ad_tr = temizAd(x.ad_tr), sehir = temizAd(x.sehir, 40);
    if (!tur || ad_en.length < 3 || !LATIN_AD.test(ad_en) || ad_en.split(" ").length > 6 || !/\p{L}{3}/u.test(ad_en)) continue;
    const enVar = adGeciyor(ad_en, havuz), trVar = ad_tr.length >= 3 && adGeciyor(ad_tr, havuz);
    if (!enVar && !trVar) continue;                                   // metinde geçmiyor: uydurma sayılır
    if (tur === "kisi" && kelimeler(ad_en).length < 2) continue;      // kişide yalnız tam ad
    const anahtar = katla(ad_en);
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    sonuc.push({ tur, ad_en, ...(trVar ? { ad_tr } : {}), ...(sehir.length >= 2 && LATIN_AD.test(sehir) && adGeciyor(sehir, havuz) ? { sehir } : {}) });
    if (sonuc.length >= ADAY_UST) break;
  }
  return sonuc;
}

// ---------------------------------------------------------------- Wikidata
const WD = "https://www.wikidata.org/w/api.php";
async function jsonGetir(url, fetchFn, ms = 12000) {
  const r = await fetchFn(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
const BELIRSIZ_SINIF = new Set(["Q4167410", "Q13406463", "Q4167836", "Q11266439", "Q15407973"]);   // anlam ayrımı, liste, kategori, şablon, kategori listesi sayfaları
const SPOR_SINIF = new Set(["Q847017", "Q476028", "Q12973014", "Q13027888", "Q1539532", "Q15944511", "Q3665646", "Q2736"]);   // spor kulübü, futbol kulübü, spor takımı, basketbol takımı...
const SPOR_AD = /(?:^|[^a-z])(club|team|football|soccer|basketball|volleyball|handball|rugby|baseball|hockey|f\.?c\.?|sports? club|athletic)(?:[^a-z]|$)/i;
const STEM_DURAK = new Set(["british", "american", "french", "german", "turkish", "italian", "japanese", "chinese", "russian", "english", "canadian", "australian", "spanish", "indian", "korean", "dutch", "swedish", "former", "professional", "current", "which", "their", "whose", "based", "known", "which", "located", "city", "town", "village", "country", "world", "state", "united", "organization", "organisation"]);
const kok = (t) => katla(t).split(" ").filter((k) => k.length >= 5 && !STEM_DURAK.has(k)).map((k) => k.slice(0, 5));
/** Varlık açıklamasının (Wikidata) haber bağlamıyla örtüşen kök sayısı. */
export function baglamOrtusme(aciklama, baglam) {
  const b = new Set(kok(baglam));
  return [...new Set(kok(aciklama))].filter((k) => b.has(k)).length;
}

const esAd = (a, b) => { const x = katla(a), y = katla(b); return !!x && (x === y || x.replace(/s$/, "") === y.replace(/s$/, "")); };
const talepDeger = (c) => (Array.isArray(c) ? c.filter((s) => s?.rank !== "deprecated" && s?.mainsnak?.snaktype === "value") : []);
const dosyaAdi = (c) => { const l = talepDeger(c); const t = l.find((s) => s.rank === "preferred") || l[0]; const v = t?.mainsnak?.datavalue?.value; return typeof v === "string" ? v : ""; };
const sinifIdleri = (c) => talepDeger(c).map((s) => s.mainsnak.datavalue?.value?.id).filter(Boolean);

/**
 * Aday için Wikidata'da KESİN eşleşme. -> { durum: "ok", varlik } | { durum: "yok"|"belirsiz"|"tur"|"baglam"|"hata", neden }
 * varlik: { id, etiket, aciklama, gorselAdi, logoAdi, spor }.
 * Kesinlik: etiket (kişide yalnız ETİKET; diğerlerinde takma ad da) aranan adla birebir aynı; tür uyumlu (kisi = insan, diğerleri insan DEĞİL, anlam ayrımı sayfası değil);
 * birden çok eşleşme ya da kişi için Wikidata açıklaması haber bağlamıyla örtüşmeli (yanlış kişi/yer fotoğrafı görselsizden kötüdür).
 * baglam: haberin metni (EN+TR başlık/özet, yer, şehir).
 */
export async function wikidataBul(aday, baglam, { fetchFn = fetch } = {}) {
  try {
    const diller = [["en", aday.ad_en]];
    if (aday.ad_tr && katla(aday.ad_tr) !== katla(aday.ad_en)) diller.push(["tr", aday.ad_tr]);
    let tam = [];
    for (const [dil, ad] of diller) {
      const p = new URLSearchParams({ action: "wbsearchentities", search: ad, language: dil, uselang: dil, type: "item", limit: "8", format: "json" });
      const j = await jsonGetir(`${WD}?${p}`, fetchFn);
      for (const s of j?.search || []) {
        const eslesen = s.match?.text ?? s.label ?? "";
        if (!esAd(eslesen, ad)) continue;
        if (aday.tur === "kisi" && s.match?.type && s.match.type !== "label") continue;
        if (!tam.some((t) => t.id === s.id)) tam.push({ id: s.id, etiket: s.label || eslesen, aciklama: s.description || "" });
      }
      if (tam.length) break;
    }
    if (!tam.length) return { durum: "yok", neden: "wikidata eşleşmesi yok" };
    tam = tam.slice(0, 5);
    const p2 = new URLSearchParams({ action: "wbgetentities", ids: tam.map((t) => t.id).join("|"), props: "claims", format: "json" });
    const e = (await jsonGetir(`${WD}?${p2}`, fetchFn))?.entities || {};
    const uygun = [];
    for (const t of tam) {
      const c = e[t.id]?.claims || {};
      const sinif = sinifIdleri(c.P31);
      if (sinif.some((s) => BELIRSIZ_SINIF.has(s))) continue;
      const insan = sinif.includes("Q5");
      if ((aday.tur === "kisi") !== insan) continue;
      uygun.push({ ...t, gorselAdi: dosyaAdi(c.P18), logoAdi: dosyaAdi(c.P154), spor: sinif.some((s) => SPOR_SINIF.has(s)) || !!(c.P641 || []).length || SPOR_AD.test(`${t.etiket} ${t.aciklama}`) });
    }
    if (!uygun.length) return { durum: "tur", neden: "tür uyumsuz (kişi/kurum karışıklığı ya da anlam ayrımı)" };
    const ctx = `${baglam} ${aday.sehir || ""}`;
    const puanli = uygun.map((u) => ({ ...u, ortusme: baglamOrtusme(u.aciklama, ctx) + (aday.sehir && katla(u.aciklama).includes(katla(aday.sehir)) ? 2 : 0) }));
    puanli.sort((a, b) => b.ortusme - a.ortusme);
    if (puanli.length > 1 && !(puanli[0].ortusme >= 1 && puanli[0].ortusme > puanli[1].ortusme)) return { durum: "belirsiz", neden: `${puanli.length} aynı adlı varlık, bağlamla ayırt edilemedi` };
    if (aday.tur === "kisi" && puanli[0].ortusme < 1) return { durum: "baglam", neden: "kişi açıklaması haber bağlamıyla örtüşmüyor" };
    const { ortusme, ...varlik } = puanli[0];
    return { durum: "ok", varlik };
  } catch (e) { return { durum: "hata", neden: String(e.message || e).slice(0, 40) }; }
}

// ---------------------------------------------------------------- Commons
/** Commons sayfa nesnesi -> aday (gorsel.mjs wikimediaAra ile AYNI şekil). ek: lisans ayrıntısı (logo denetimi için). svgIzin: svg ise Commons'un PNG küçük sürümü alınır. */
export function commonsAday(sayfa, { ek = false, svgIzin = false, ust = false } = {}) {
  const ii = (sayfa.imageinfo || [{}])[0], md = ii.extmetadata || {};
  const svg = ii.mime === "image/svg+xml";
  if (!(["image/jpeg", "image/png"].includes(ii.mime) || (svgIzin && svg)) || !(ii.thumburl || ii.url)) return null;
  const sade = (k) => duzMetin(md[k]?.value || "", 300);
  const yilBul = (k) => { const m = String(md[k]?.value || "").match(/(?<!\d)(1[0-9]\d\d|20\d\d)(?!\d)/); return m ? Number(m[1]) : null; };
  const yil = yilBul("DateTimeOriginal"), yilDosya = yilBul("DateTime");
  return {
    baslik: String(sayfa.title || "").replace(/^File:/i, ""), yil, yilDosya, url: ii.thumburl || ii.url, w: ii.thumbwidth || ii.width || 0, h: ii.thumbheight || ii.height || 0,
    metin: [sayfa.title, sade("ObjectName"), sade("ImageDescription"), sade("Categories").replace(/\|/g, " ")].join(" "),
    yaratici: sade("Artist") || "Unknown", lisans: md.LicenseShortName?.value || "", lisans_url: md.LicenseUrl?.value || "",
    kaynak_url: ii.descriptionurl || "", saglayici: "wikimedia",
    ...(ust ? { ustMetin: [sayfa.title, sade("ObjectName"), sade("ImageDescription")].join(" ") } : {}),   // kategorisiz metin (yer çelişkisi için: "Britain and Ireland" gibi genel kategori etiketleri sayılmaz)
    ...(ek ? { lisansAyrinti: { nonFree: String(md.NonFree?.value || "").toLowerCase() === "true", telifli: String(md.Copyrighted?.value || "").toLowerCase() === "true", kullanim: sade("UsageTerms"), kisit: sade("Restrictions") } } : {}),
  };
}

/** Commons dosya adlarının (Wikidata P18/P154) bilgisi. -> [aday] */
export async function commonsDosyalari(adlar, { fetchFn = fetch, ek = false, svgIzin = false } = {}) {
  const liste = [...new Set(adlar.filter(Boolean))].slice(0, 5);
  if (!liste.length) return [];
  const p = new URLSearchParams({ action: "query", format: "json", titles: liste.map((a) => "File:" + String(a).replace(/^File:/i, "")).join("|"), prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "1280" });
  const j = await jsonGetir(`https://commons.wikimedia.org/w/api.php?${p}`, fetchFn, 15000);
  return Object.values(j?.query?.pages || {}).map((s) => commonsAday(s, { ek, svgIzin, ust: true })).filter(Boolean);
}

/** Varlığın kesin adıyla Commons dosya araması (P18 yokken yedek). wikimediaAra ile aynı sorgu; adaylar kategorisiz `ustMetin` taşır (ad başlıkta/açıklamada geçmeli). */
export async function commonsAra(q, { fetchFn = fetch } = {}) {
  const p = new URLSearchParams({ action: "query", format: "json", generator: "search", gsrsearch: `${q} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "15", prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "1280" });
  const j = await jsonGetir(`https://commons.wikimedia.org/w/api.php?${p}`, fetchFn, 15000);
  return Object.values(j?.query?.pages || {}).map((s) => commonsAday(s, { ust: true })).filter(Boolean);
}

/** Logo yalnız kamu malı / CC0 ve "non-free" değilse. Spor kulübü armaları, siyasi/dinî/askerî kurumlar HİÇ. */
export function logoLisansOk(aday) {
  const l = String(aday.lisans || "").toLowerCase().trim(), a = aday.lisansAyrinti || {};
  if (!/^(public domain|pd\b|cc0|pdm)/.test(l)) return false;
  if (/non-?free|fair use|copyrighted|all rights/.test(`${l} ${String(a.kullanim || "").toLowerCase()}`)) return false;
  if (a.nonFree || a.telifli) return false;
  return true;
}
export const LOGO_KURUM_YASAK = /(party|parti\b|partisi|religio|church|mosque|temple|synagogue|ministry|government|army|military|police|court|parliament|football|club|team)/i;
