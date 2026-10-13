// Google News arama sonuçları (ücretsiz, anahtarsız RSS): yalnız KEŞİF kanalıdır. Sonuçta yalnız başlık + yayıncı adı + yayıncı alan adı vardır;
// haber metni asıl yayıncının sayfasından (robots.txt'e uyarak) okunur ve kaynak olarak ASIL YAYINCI gösterilir (Google değil).
// Google'ın yönlendirme adresleri (news.google.com/rss/articles/<kimlik>) asıl adrese şöyle çözülür:
//   (1) makale sayfasındaki data-n-a-sg / data-n-a-ts değerleri alınır, (2) Google'ın kendi batchexecute uç noktasına ("Fbv4je", "garturlreq") sorulur.
// Belgesiz bir uç noktadır: değişirse çözüm başarısız olur ve ADAY ATLANIR (hiçbir zaman yönlendirme adresi yayınlanmaz / Google adresi kaynak diye gösterilmez).
import { UA } from "./rss.mjs";
import { denetle } from "./moderasyon.mjs";
import { konuYasak } from "./on_eleme.mjs";

const SAYFA = (id) => `https://news.google.com/rss/articles/${encodeURIComponent(id)}?hl=tr&gl=TR&ceid=TR:tr`;
const BATCH = "https://news.google.com/_/DotsSplashUi/data/batchexecute";

/** batchexecute yanıtından asıl adres (saf). Beklenen: )]}'\n\n[["wrb.fr","Fbv4je","[\"garturlres\",\"https://...\",1]",...]] -> adres | "" */
export function batchYanitiAdres(metin) {
  const t = String(metin || "");
  const bas = t.indexOf('[["wrb.fr"');
  if (bas < 0) return "";
  // dış dizi tek satırdır; JSON.parse sondaki sayısal satırları görmesin diye satır sonunda kesilir
  const satir = t.slice(bas).split("\n")[0];
  let dis;
  try { dis = JSON.parse(satir); } catch { return ""; }
  const ham = (dis.find((x) => Array.isArray(x) && x[0] === "wrb.fr") || [])[2];
  if (typeof ham !== "string") return "";
  let ic;
  try { ic = JSON.parse(ham); } catch { return ""; }
  const adres = Array.isArray(ic) && ic[0] === "garturlres" ? ic[1] : "";
  return typeof adres === "string" && /^https?:\/\//i.test(adres) ? adres : "";
}

/** Makale sayfasından imza + zaman damgası (saf). -> {sg, ts} | null */
export function sayfaImzasi(html) {
  const sg = (String(html).match(/data-n-a-sg="([^"]+)"/) || [])[1], ts = (String(html).match(/data-n-a-ts="([^"]+)"/) || [])[1];
  return sg && /^\d+$/.test(ts || "") ? { sg, ts } : null;
}

/** Batch istek gövdesi (saf). */
export function batchGovdesi(id, { sg, ts }) {
  const ic = JSON.stringify(["garturlreq", [["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0], id, Number(ts), sg]);
  return "f.req=" + encodeURIComponent(JSON.stringify([[["Fbv4je", ic, null, "generic"]]]));
}

/**
 * Google News kimliğini asıl yayıncı adresine çözer. -> {durum:"ok", url} | {durum:"hata", neden}. Ağ hatası/429 atılmaz, nedenle döner.
 * Çözülen adres: https, news.google.com/google.* DEĞİL, beklenen yayıncı alan adıyla uyumlu (beklenenSite verilmişse; uyumsuz = yönlendirme/aggregator, atlanır).
 */
export async function gnewsCoz(id, { fetchFn = fetch, beklenenSite = "" } = {}) {
  try {
    const s = await fetchFn(SAYFA(id), { headers: { "User-Agent": UA, "Accept-Language": "tr" }, redirect: "follow", signal: AbortSignal.timeout(12000) });
    if (s.status === 429) return { durum: "hata", neden: "429" };
    if (!s.ok) return { durum: "hata", neden: `sayfa HTTP ${s.status}` };
    const imza = sayfaImzasi(await s.text());
    if (!imza) return { durum: "hata", neden: "imza yok" };
    const r = await fetchFn(BATCH, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "User-Agent": UA }, body: batchGovdesi(id, imza), signal: AbortSignal.timeout(12000) });
    if (r.status === 429) return { durum: "hata", neden: "429" };
    if (!r.ok) return { durum: "hata", neden: `batch HTTP ${r.status}` };
    const url = batchYanitiAdres(await r.text());
    if (!url) return { durum: "hata", neden: "adres yok" };
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (/(^|\.)(google\.[a-z.]+|gstatic\.com|googleusercontent\.com)$/.test(host)) return { durum: "hata", neden: "google adresi" };
    if (beklenenSite) {
      const b = beklenenSite.replace(/^www\./, "").toLowerCase();
      if (!(host === b || host.endsWith("." + b) || b.endsWith("." + host))) return { durum: "hata", neden: "yayıncı uyuşmuyor" };
    }
    return { durum: "ok", url };
  } catch (e) { return { durum: "hata", neden: String(e.message || e).slice(0, 40) }; }
}

/**
 * Başlıkta Google sonuçlarında sık görülen kalıp/çöp: "...", "Son dakika", yalnız yayıncı adı. Ön elemeden önce ucuz süzgeç. -> "" | neden
 */
export function gnewsBaslikSuzgeci(a) {
  const b = String(a.baslik || "").trim();
  if (b.length < 25) return "kısa başlık";
  if (/^(son dakika|canlı|canlı anlatım|live)\b/i.test(b)) return "canlı/son dakika";
  return "";
}

/**
 * Yalnız başlığa dayanan ön elemeyi, asıl sayfanın ilk bölümüne de uygular (Google sonucunda özet yok; sayfa okununca konu/hassasiyet denetimi tekrarlanır).
 * metin: kaynakMetni çıktısı. -> "" | ret nedeni
 */
export function gnewsSayfaSuzgeci(metin) {
  const t = String(metin || "").slice(0, 2500);
  if (!t) return "";
  const f = denetle(t);
  if (!f.ok) return `sayfa:hassas:${f.tur}`;
  const k = konuYasak(t);
  if (k.length) return `sayfa:${k[0].kural}`;
  return "";
}
