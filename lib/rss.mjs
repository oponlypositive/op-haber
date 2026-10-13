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

const zamanCoz = (t) => {
  const ms = Date.parse(String(t ?? "").trim());
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

/** XML -> [{baslik, ozet, link, kaynak, zaman(ISO|null), dil, gorselUrl}] */
export function rssAyristir(xml, { kaynak = "", dil = "en", bing = false, en = 12 } = {}) {
  const sonuc = [];
  const x = String(xml ?? "");
  const bloklar = [...x.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m) => ["rss", m[0]])
    .concat([...x.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((m) => ["atom", m[0]]));
  for (const [tur, b] of bloklar.slice(0, en)) {
    let link = tur === "atom"
      ? (b.match(/<link\b[^>]*\bhref="([^"]+)"/i) || [])[1] || ""
      : varlikCoz(duzMetin(etiket(b, "link"), 800));
    if (bing) link = bingHedef(link);
    const baslik = duzMetin(etiket(b, "title"), 200);
    if (!baslik || !/^https?:\/\//i.test(link)) continue;
    let k = kaynak;
    if (bing) {
      const m = b.match(/<(?:\w+:)?Source(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?Source>/i);
      k = (m && duzMetin(m[1], 80)) || new URL(link).hostname.replace(/^www\./, "");
    }
    sonuc.push({
      baslik, link, kaynak: k, dil,
      ozet: duzMetin(etiket(b, "description") || etiket(b, "summary") || etiket(b, "content:encoded"), 600),
      zaman: zamanCoz(etiket(b, "pubDate") || etiket(b, "updated") || etiket(b, "published") || etiket(b, "dc:date")),
      gorselUrl: gorselAdresi(b),
    });
  }
  return sonuc;
}

/** Nazik tek istek: zaman aşımı + boyut sınırı. Hata atar, sessizce yutmaz. */
export async function metinIndir(url, { fetchFn = fetch, zamanAsimiMs = 12000, sinirBayt = 600_000, ek = {} } = {}) {
  const r = await fetchFn(url, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5", ...ek }, redirect: "follow", signal: AbortSignal.timeout(zamanAsimiMs) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const tur = r.headers.get("content-type") || "";
  const ham = new Uint8Array(await r.arrayBuffer());
  return { metin: new TextDecoder("utf-8").decode(ham.subarray(0, sinirBayt)), tur };
}

/** kaynaklar.json -> tüm adaylar (kaynak başına tek istek). Hatalar özet olarak döner. */
export async function kaynaklariTara(kaynaklar, { bingAcik = true, fetchFn = fetch, bekleMs = 400 } = {}) {
  const adaylar = [], hatalar = [];
  const dur = (ms) => new Promise((r) => setTimeout(r, ms));
  const liste = [
    ...kaynaklar.rss.map((k) => ({ url: k.url, ad: k.ad, dil: k.dil, bing: false, en: k.en || 12, guvenilir: !!k.guvenilir, alan: k.alan || "", tazelikSaat: k.tazelik_saat || null,
      hazirGorsel: k.hazir_gorsel ? (k.gorsel_lisans || null) : null })),
    ...(bingAcik ? kaynaklar.bing.map((k) => ({
      url: "https://www.bing.com/news/search?" + new URLSearchParams({ q: k.sorgu, format: "rss", setlang: "tr", cc: "TR" }),
      ad: `bing:${k.sorgu}`, dil: k.dil, bing: true, en: 4, guvenilir: false })) : []),
  ];
  for (const k of liste) {
    try {
      const { metin } = await metinIndir(k.url, { fetchFn });
      for (const a of rssAyristir(metin, { kaynak: k.ad, dil: k.dil, bing: k.bing, en: k.en })) adaylar.push({ ...a, kaynakGuvenilir: k.guvenilir, ...(k.alan ? { alan: k.alan } : {}), ...(k.tazelikSaat ? { tazelikSaat: k.tazelikSaat } : {}),
        ...(k.hazirGorsel && a.gorselUrl ? { hazirGorsel: { url: a.gorselUrl, ...k.hazirGorsel } } : {}) });
    } catch (e) {
      hatalar.push(`${k.ad}: ${String(e.message || e).slice(0, 60)}`);
    }
    await dur(bekleMs);
  }
  return { adaylar, hatalar };
}
