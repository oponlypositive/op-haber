// Kaynak haber sayfasından düz metin: robots.txt saygısı, zaman aşımı, boyut sınırı. Engel/ret = sayfa kullanılmaz.
import { UA, duzMetin, metinIndir } from "./rss.mjs";

export const SAYFA_SINIR_BAYT = 400_000;
export const SAYFA_SINIR_KARAKTER = 5000;

/** robots.txt: bu botun (ya da *) Disallow kuralları yoluna uyuyor mu? true = erişim serbest. */
export function robotsIzin(robotsMetni, yol, ajanlar = ["onlypositivebot"]) {
  const satirlar = String(robotsMetni || "").split(/\r?\n/).map((s) => s.replace(/#.*/, "").trim()).filter(Boolean);
  let grup = [], kendi = null, genel = null;
  const kapat = () => {
    if (grup.agents.length) {
      if (grup.agents.some((a) => ajanlar.includes(a))) kendi = (kendi || []).concat(grup.kurallar);
      else if (grup.agents.includes("*")) genel = (genel || []).concat(grup.kurallar);
    }
  };
  grup = { agents: [], kurallar: [], kural: false };
  for (const s of satirlar) {
    const m = s.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const ad = m[1].toLowerCase(), deger = m[2].trim();
    if (ad === "user-agent") {
      if (grup.kural) { kapat(); grup = { agents: [], kurallar: [], kural: false }; }
      grup.agents.push(deger.toLowerCase());
    } else if (ad === "disallow" || ad === "allow") {
      grup.kural = true;
      grup.kurallar.push([ad, deger]);
    }
  }
  kapat();
  const kurallar = kendi || genel || [];
  let en = null;   // en uzun eşleşen kural kazanır; eşitlikte allow
  for (const [tur, desen] of kurallar) {
    if (!desen) continue;
    const rx = new RegExp("^" + desen.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
    if (rx.test(yol) && (!en || desen.length > en[1].length || (desen.length === en[1].length && tur === "allow"))) en = [tur, desen];
  }
  return !en || en[0] === "allow";
}

/** HTML -> yalnız <p> paragrafları (menü/çerez/abonelik satırları atılır). */
export function sayfaMetni(html) {
  const s = String(html || "").replace(/<(script|style|nav|footer|header|aside|form|noscript)\b[\s\S]*?<\/\1>/gi, " ");
  const parcalar = [];
  for (const m of s.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = duzMetin(m[1], 800);
    if (t.length >= 50 && !/cookie|subscribe|newsletter|çerez|abone ol|all rights reserved|sign up/i.test(t)) parcalar.push(t);
  }
  let metin = parcalar.join(" ");
  if (metin.length < 400) {                                  // <p> az ise (JS ile dolan sayfalar): yayıncının kendi meta açıklaması + JSON-LD articleBody
    const ek = [];
    const ld = String(html || "").match(/"articleBody"\s*:\s*"((?:[^"\\]|\\.){80,})"/);
    if (ld) { try { ek.push(duzMetin(JSON.parse('"' + ld[1] + '"'), 3000)); } catch { /* bozuk kaçış: atla */ } }
    const og = String(html || "").match(/<meta\b[^>]*\b(?:property|name)="(?:og:description|description)"[^>]*\bcontent="([^"]{60,})"/i)
      || String(html || "").match(/<meta\b[^>]*\bcontent="([^"]{60,})"[^>]*\b(?:property|name)="(?:og:description|description)"/i);
    if (og) ek.push(duzMetin(og[1], 600));
    metin = [metin, ...ek].filter(Boolean).join(" ");
  }
  return metin.slice(0, SAYFA_SINIR_KARAKTER);
}

const DURAK = new Set("about after again their there these those which while where would could should other between during before against being doing having because into over under from with what when this that have will your more most than then them they been were also just only very".split(" "));
/** Kaynak sayfası gerçekten bu haberi anlatıyor mu? (yanlış bağlantı / liste sayfası koruması) */
export function sayfaEslesiyor(sayfa, baslik) {
  const kel = [...new Set((String(baslik || "").toLowerCase().match(/[\p{L}\p{N}_]{5,}/gu) || []))].filter((k) => !DURAK.has(k));
  if (!kel.length) return false;
  const s = String(sayfa || "").toLowerCase();
  const bulunan = kel.filter((k) => s.includes(k)).length;
  return bulunan >= Math.min(2, kel.length) && bulunan * 2 >= kel.length;
}

/** -> {metin, durum}. durum: "ok" | "robots" | "hata:<kısa>" . Hata atmaz. */
export async function kaynakMetni(link, { fetchFn = fetch, robotsOnbellek = new Map() } = {}) {
  let u;
  try { u = new URL(link); } catch { return { metin: "", durum: "hata:url" }; }
  if (!/^https?:$/.test(u.protocol)) return { metin: "", durum: "hata:url" };
  try {
    if (!robotsOnbellek.has(u.origin)) {
      let r = "";
      try { r = (await metinIndir(u.origin + "/robots.txt", { fetchFn, zamanAsimiMs: 6000, sinirBayt: 100_000 })).metin; } catch { r = ""; }
      robotsOnbellek.set(u.origin, r);
    }
    if (!robotsIzin(robotsOnbellek.get(u.origin), u.pathname + u.search)) return { metin: "", durum: "robots" };
    const { metin, tur } = await metinIndir(link, { fetchFn, zamanAsimiMs: 10000, sinirBayt: SAYFA_SINIR_BAYT });
    if (!/html/i.test(tur)) return { metin: "", durum: "hata:tur" };
    return { metin: sayfaMetni(metin), durum: "ok" };
  } catch (e) {
    return { metin: "", durum: `hata:${String(e.message || e).slice(0, 30)}` };
  }
}
export { UA };
