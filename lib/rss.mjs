// RSS / Atom ayrıştırma (bağımlılıksız) + kaynak listesi için istek yardımcıları.
import { createHash } from "node:crypto";

export const UA = "OnlyPositiveBot/1.0 (+https://github.com/oponlypositive/op-haber)";

const VARLIKLAR = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…" };
export function varlikCoz(t) {
  return String(t ?? "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, k) => {
    if (k[0] === "#") {
      const kod = k[1].toLowerCase() === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
      return Number.isFinite(kod) && kod > 0 && kod < 0x110000 ? String.fromCodePoint(kod) : m;
    }
    return VARLIKLAR[k.toLowerCase()] ?? m;
  });
}
export function duzMetin(t, n = 400) {
  const cdata = String(t ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  return varlikCoz(varlikCoz(cdata).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim().slice(0, n);
}
const etiket = (blok, ad) => {
  const m = blok.match(new RegExp(`<${ad}(?:\\s[^>]*)?>([\\s\\S]*?)</${ad}>`, "i"));
  return m ? m[1] : "";
};

/** Bağlantının kararlı özeti (tekrar önleme anahtarı): izleme parametreleri atılır. */
export function baglantiOzeti(link) {
  let u;
  try { u = new URL(link); } catch { return createHash("sha256").update(String(link)).digest("hex"); }
  u.hash = "";
  for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ref$)/i.test(k)) u.searchParams.delete(k);
  const norm = `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}${u.search}`.toLowerCase();
  return createHash("sha256").update(norm).digest("hex");
}

/** Bing News yönlendirme bağlantısından asıl adresi çıkarır. */
export function bingHedef(link) {
  try {
    const u = new URL(link);
    return u.searchParams.get("url") || link;
  } catch { return link; }
}

/**
 * Besleme tarihi -> ISO (UTC). Saat dilimi (2026-10-13 denetimi): dilimsiz yerel saat ("2026-10-13T10:00:00", "Tue, 13 Oct 2026 10:00:00") Actions koşucusunda UTC sayılırdı:
 * Türkçe kaynakta (dil "tr") UTC+3 varsayılır. yerel=true (CNN Türk gibi yerel saati "GMT" diye yazan kaynak): GMT/UTC/Z etiketi +03:00 sayılır.
 * Bilinen dilimler (+0300, +03:00, GMT, Z) olduğu gibi okunur.
 */
export const zamanCoz = (t, { dil = "", yerel = false } = {}) => {
  let s = String(t ?? "").trim();
  if (!s) return null;
  if (yerel) s = s.replace(/\s*(?:GMT|UTC|Z|[+-]0000|[+-]00:00)$/i, /^\d{4}-/.test(s) ? "+03:00" : " +0300");
  else if (dil === "tr") {
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?$/.test(s)) s = s.replace(" ", "T") + "+03:00";                                   // ISO, dilimsiz
    else if (/^[A-Za-z]{3},?\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}(?::\d{2})?$/.test(s)) s += " +0300";                                // RFC 822, dilimsiz
  }
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
};

/** Öğenin hazır görseli: enclosure (image/*) ya da açıklamadaki ilk <img>. Yalnız https adresleri kabul edilir. */
export function gorselAdresi(blok) {
  const enc = String(blok).match(/<enclosure\b[^>]*>/i);
  if (enc) {
    const u = (enc[0].match(/\burl="([^"]+)"/i) || [])[1], tur = (enc[0].match(/\btype="([^"]+)"/i) || [])[1] || "";
    if (u && /^image\//i.test(tur) && /^https:\/\//i.test(u)) return varlikCoz(u);
  }
  const ham = varlikCoz(varlikCoz(String(blok).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")));
  const img = ham.match(/<img\b[^>]*\bsrc="(https:\/\/[^"]+)"/i);
  return img ? img[1] : "";
}

/** Özet: description/summary ile content:encoded'ten UZUN olanı (RSS özeti kısa kalıyorsa tam metin "kaynak-yetersiz" retlerini azaltır). Üst sınır 1500 karakter. */
export function ozetSec(blok) {
  const adaylar = ["description", "summary", "content:encoded", "content"].map((ad) => duzMetin(etiket(blok, ad), 1500));
  return adaylar.reduce((en, t) => (t.length > en.length ? t : en), "").replace(/\s*(?:The post|The article|Post)\b.{0,200}\bappeared first on\b.*$/i, "").trim();
}

/** XML -> [{baslik, ozet, link, kaynak, zaman(ISO|null), dil, gorselUrl}] */
export function rssAyristir(xml, { kaynak = "", dil = "en", bing = false, en = 12, gnews = false, yerel = false } = {}) {
  const sonuc = [];
  const x = String(xml ?? "");
  const bloklar = [...x.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m) => ["rss", m[0]])
    .concat([...x.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((m) => ["atom", m[0]]));
  // Bazı beslemeler (TRT, hurriyet) en eskiyi başa koyar: en yeni `en` öğeyi al (tarihsizler sırayla sonda kalır).
  const tarihOf = ([tur, b]) => Date.parse(String(etiket(b, "pubDate") || etiket(b, "updated") || etiket(b, "published") || etiket(b, "dc:date")).trim());
  const sirali = bloklar.map((x, i) => ({ x, i, t: tarihOf(x) })).sort((p, q) => (Number.isFinite(q.t) ? q.t : -Infinity) - (Number.isFinite(p.t) ? p.t : -Infinity) || p.i - q.i).map((p) => p.x);
  for (const [tur, b] of sirali.slice(0, en)) {
    let link = tur === "atom"
      ? (b.match(/<link\b[^>]*\bhref="([^"]+)"/i) || [])[1] || ""
      : varlikCoz(duzMetin(etiket(b, "link"), 800));
    if (bing) link = bingHedef(link);
    let baslik = duzMetin(etiket(b, "title"), 200);
    if (!baslik || !/^https?:\/\//i.test(link)) continue;
    let k = kaynak;
    if (bing) {
      const m = b.match(/<(?:\w+:)?Source(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?Source>/i);
      k = (m && duzMetin(m[1], 80)) || new URL(link).hostname.replace(/^www\./, "");
    }
    const ek = {};
    if (gnews) {
      // Google News arama RSS'i: başlık "Haber başlığı - Yayıncı", açıklama yalnız başlık+yayıncı tekrarı (gerçek özet YOK), asıl yayıncı <source url="..."> içinde.
      const m = b.match(/<source\b([^>]*)>([\s\S]*?)<\/source>/i);
      const yayinci = m ? duzMetin(m[2], 80) : "";
      const site = ((m && /\burl="([^"]+)"/i.exec(m[1])) || [])[1] || "";
      let host = "";
      try { host = new URL(site).hostname.replace(/^www\./, "").toLowerCase(); } catch { /* yayıncı adresi yok */ }
      if (!host) continue;                                              // asıl yayıncı bilinmeyen sonuç alınmaz
      if (yayinci && baslik.toLowerCase().endsWith(" - " + yayinci.toLowerCase())) baslik = baslik.slice(0, -(yayinci.length + 3)).trim();
      const id = (link.match(/\/rss\/articles\/([A-Za-z0-9_-]+)/) || [])[1] || "";
      k = yayinci || host;
      Object.assign(ek, { kaynakSite: host, gnews: true, ...(id ? { gnewsId: id } : {}) });
    }
    sonuc.push({
      baslik, link, kaynak: k, dil,
      ozet: gnews ? "" : ozetSec(b),
      zaman: zamanCoz(etiket(b, "pubDate") || etiket(b, "updated") || etiket(b, "published") || etiket(b, "dc:date"), { dil, yerel }),
      gorselUrl: gnews ? "" : gorselAdresi(b),
      ...ek,
    });
  }
  return sonuc;
}

/** Abonelikli haber AJANSLARI (AA, DHA, İHA, ANKA...) ve yalnız ajans akışı çoğaltan toplayıcılar: doğrudan kaynak OLAMAZ. Site adı ya da yayıncı adı eşleşirse aday atılır. */
export const AJANS_KALIBI = /(?:^|\.)(?:aa\.com\.tr|dha\.com\.tr|iha\.com\.tr|anka\.com\.tr|ajansspor\.com|haberler\.com|ajanshaber\.com|ajanspress\.com\.tr|abcnews\.go\.com)$|anadolu ajans|demirören haber ajans|ihlas haber ajans|^(?:aa|dha|iha|anka)$|haber ajans/i;
export const ajansMi = (siteVeyaAd) => AJANS_KALIBI.test(String(siteVeyaAd || "").trim());
/** Alan adı listede mi (tam eşleşme ya da alt alan adı)? */
export function siteListedeMi(site, liste) {
  const h = String(site || "").toLowerCase().replace(/^www\./, "");
  return !!h && (liste || []).some((g) => h === g || h.endsWith("." + g));
}

/** Google News arama RSS adresi (ücretsiz, anahtarsız). pencere: "1d" | "2d" | "12h" ... (Google'ın when: işleci; yalnız o aralıktaki haberler). */
export function gnewsAdres(sorgu, { pencere = "1d" } = {}) {
  const q = pencere ? `${sorgu} when:${pencere}` : sorgu;
  return "https://news.google.com/rss/search?" + new URLSearchParams({ q, hl: "tr", gl: "TR", ceid: "TR:tr" });
}

/** Nazik tek istek: zaman aşımı + boyut sınırı. Hata atar, sessizce yutmaz. */
export async function metinIndir(url, { fetchFn = fetch, zamanAsimiMs = 12000, sinirBayt = 600_000, ek = {} } = {}) {
  const r = await fetchFn(url, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5", ...ek }, redirect: "follow", signal: AbortSignal.timeout(zamanAsimiMs) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const tur = r.headers.get("content-type") || "";
  const ham = new Uint8Array(await r.arrayBuffer());
  return { metin: new TextDecoder("utf-8").decode(ham.subarray(0, sinirBayt)), tur };
}

/** Saat dilimi hatalı beslemeler (örn. yerel saati GMT diye yazan CNN Türk) birkaç saat "gelecekte" görünür: 4 saate kadar olanı şimdiye çek, ötesi gelecekte kalır. */
export function zamanDuzelt(a, simdi = Date.now()) {
  const t = Date.parse(a.zaman || "");
  return Number.isFinite(t) && t > simdi && t - simdi <= 4 * 3600_000 ? { ...a, zaman: new Date(simdi).toISOString() } : a;
}

/** kaynaklar.json -> tüm adaylar (kaynak başına tek istek). Hatalar özet olarak döner. */
export async function kaynaklariTara(kaynaklar, { bingAcik = true, fetchFn = fetch, bekleMs = 400, gnewsAcik = true, gnewsGrup = 1, simdi = Date.now() } = {}) {
  const adaylar = [], hatalar = [];
  const dur = (ms) => new Promise((r) => setTimeout(r, ms));
  const liste = [
    ...kaynaklar.rss.filter((k) => !k.pasif).map((k) => ({ tur: k.tur || "", zamansiz: !!k.zamansiz, url: k.url, ad: k.ad, dil: k.dil, bing: false, en: k.en || 15, guvenilir: !!k.guvenilir, yerel: !!k.tz_yerel, alan: k.alan || "", tazelikSaat: k.tazelik_saat || null,
      hazirGorsel: k.hazir_gorsel ? (k.gorsel_lisans || null) : null })),
    ...(gnewsAcik ? gnewsSecimi(kaynaklar.gnews || [], { grup: gnewsGrup, simdi }).map((k) => ({
      url: gnewsAdres(k.sorgu, { pencere: k.pencere || "1d" }), ad: `gnews:${k.sorgu}`, dil: "tr", gnews: true, en: k.en || 8, guvenilir: false,
      alan: k.alan || "", tazelikSaat: k.tazelik_saat || 24, yerel: false })) : []),
    ...(bingAcik ? kaynaklar.bing.map((k) => ({
      url: "https://www.bing.com/news/search?" + new URLSearchParams({ q: k.sorgu, format: "rss", setlang: "tr", cc: "TR" }),
      ad: `bing:${k.sorgu}`, dil: k.dil, bing: true, en: 4, guvenilir: false, yerel: false })) : []),
  ];
  for (const k of liste) {
    try {
      const { metin } = await metinIndir(k.url, { fetchFn });
      for (const a0 of rssAyristir(metin, { kaynak: k.ad, dil: k.dil, bing: k.bing, en: k.en, gnews: !!k.gnews, yerel: k.yerel })) {
        if (a0.gnews && (ajansMi(a0.kaynakSite) || ajansMi(a0.kaynak))) continue;      // abonelikli ajans içeriği doğrudan kaynak olamaz (sahip kuralı)
        const a = zamanDuzelt(a0);
        adaylar.push({ ...a, kaynakGuvenilir: a.gnews ? siteListedeMi(a.kaynakSite, kaynaklar.gnews_guvenilir) : k.guvenilir, ...(k.tur ? { tur: k.tur } : {}), ...(k.zamansiz ? { zamansiz: true } : {}), ...(k.alan ? { alan: k.alan } : {}), ...(k.tazelikSaat ? { tazelikSaat: k.tazelikSaat } : {}),
        ...(k.hazirGorsel && a.gorselUrl ? { hazirGorsel: { url: a.gorselUrl, ...k.hazirGorsel } } : {}) }); }
    } catch (e) {
      hatalar.push(`${k.ad}: ${String(e.message || e).slice(0, 60)}`);
    }
    await dur(bekleMs);
  }
  return { adaylar, hatalar };
}

/**
 * Google News sorgularının bu turdaki dilimi: sorgular `grup` parçaya bölünür, 20 dakikalık tur numarasına göre sırayla biri çekilir
 * (her sorgu saatte ~1 kez; Google'a günde ~3000 yerine ~1000 istek, 429 riski düşük). grup=1: hepsi.
 */
export function gnewsSecimi(sorgular, { grup = 1, simdi = Date.now() } = {}) {
  const g = Math.max(1, Math.floor(grup));
  if (g === 1) return sorgular;
  const dilim = Math.floor(simdi / (20 * 60_000)) % g;
  return sorgular.filter((_, i) => i % g === dilim);
}
