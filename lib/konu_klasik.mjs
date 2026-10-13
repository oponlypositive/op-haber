// OP Klasikler (op_klasikler, kategori "edebiyat", alt_konu "turk-klasik"): telifi dolmuş Türk edebiyatı klasiklerinden ALINTI.
//   Kaynak YALNIZ Türkçe Vikikaynak (tr.wikisource.org). Alıntı metni elle derlenmiş listeden (konu_klasik_veri.mjs) gelir ve her yayında GERÇEK sayfadan
//   AYNEN doğrulanır (boşluk/satır sonu/yumuşak tire farkı yok sayılır; tek harf farkı = ret). Model alıntıya DOKUNMAZ, çeviri YOK (özgün Türkçe gösterilir).
//   Bağlam metni (eser, yazar, kaynak, ölüm yılı) listedeki doğrulanmış künyeden KODLA kurulur; roman olay örgüsü ya da yıl UYDURULMAZ (yıl yalnız kaynağında yazılıysa).
//   Yazar ölüm yılı <= 1955 (telifsizMi) şart. Sayfada {{Telif bilgisiz}} / {{Kaynaksız}} şablonu varsa o sayfadan alıntı alınmaz.
import { UA, varlikCoz } from "./rss.mjs";
import { denetle } from "./moderasyon.mjs";
import { konuYasak } from "./on_eleme.mjs";
import { telifsizMi } from "./alinti_yazarlar.mjs";

export const WS_API = "https://tr.wikisource.org/w/api.php";
export const wikisourceUrl = (sayfa) => "https://tr.wikisource.org/wiki/" + encodeURIComponent(String(sayfa).replace(/ /g, "_")).replace(/%2C/g, ",").replace(/%3A/g, ":").replace(/%2F/g, "/");

/** Vikikaynak wikitext'ini düz okunur metne indirir (şablon, dipnot, yorum, etiket, bağlantı biçimi atılır; dipnot İÇERİĞİ de atılır). */
export function vikikaynakDuzMetin(wt) {
  let t = String(wt ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref\b[^>]*\/>/gi, "").replace(/<ref\b[\s\S]*?<\/ref>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n");
  for (let i = 0; i < 4; i++) t = t.replace(/\{\{[^{}]*\}\}/g, "");
  t = t.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/<[^>]+>/g, "").replace(/'{2,}/g, "");
  return varlikCoz(t).replace(/\u00AD/g, "");
}

/** Karşılaştırma için katlama: NFC, yumuşak tire/sıfır genişlik atılır, tırnak/kesme tek biçime, boşluklar (satır sonu dahil) tek boşluğa. */
export function alintiKatla(t) {
  return String(t ?? "").normalize("NFC").replace(/[\u00AD\u200B-\u200F\u2060\uFEFF]/g, "")
    .replace(/[’‘`´ʼ]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, "-")
    .replace(/\s+/g, " ").trim();
}

/** Alıntı gerçek sayfada AYNEN geçiyor mu? -> {ok, neden} */
export function alintiSayfadaMi(alinti, wikitext) {
  const a = alintiKatla(alinti);
  if (a.length < 25) return { ok: false, neden: "alıntı çok kısa" };
  if (/\{\{\s*(?:telif bilgisiz|kaynaksız|telif sorunlu|silinecek)/i.test(String(wikitext))) return { ok: false, neden: "sayfada telif/kaynak uyarısı var" };
  const sayfa = alintiKatla(vikikaynakDuzMetin(wikitext));
  return sayfa.includes(a) ? { ok: true, neden: "" } : { ok: false, neden: "alıntı sayfada aynen geçmiyor" };
}

/** Sayfadaki "İlk yayım" notundan yıl (varsa). Yoksa null: yıl uydurulmaz. */
export function sayfaYili(wikitext) {
  const m = String(wikitext ?? "").match(/notlar\s*=\s*([^\n}]*)/i);
  const y = m && /yay[ıi]m|yayın/i.test(m[1]) ? m[1].match(/(?<!\d)(1[89]\d\d)(?!\d)/) : null;
  return y ? Number(y[1]) : null;
}

/** Listedeki bir alıntı satırı yayına uygun mu (saf, ağsız)? -> "" | neden */
export function klasikSatirNedeni(s) {
  if (!s?.yazar || !s.eser || !s.sayfa || !s.metin) return "künye eksik";
  if (!telifsizMi(s.olum)) return `telif: ${s.yazar} ölüm yılı ${s.olum ?? "?"} (1955 sonrası ya da bilinmiyor)`;
  if (/https?:|www\./i.test(s.metin)) return "bağlantı";
  const d = denetle(s.metin);
  if (!d.ok) return `moderasyon:${d.tur}`;
  const k = konuYasak(s.metin);
  if (k.length) return `${k[0].kural}`;
  return "";
}

const ESER_TUR = { hikaye: ["hikâyesinden", "story"], siir: ["şiirinden", "poem"] };
const kisalt = (t, n) => (t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");

/** Gönderi içeriği (model çağrısı YOK). yil: kaynağın kendisinde yazan ilk yayım yılı (yoksa null). */
export function klasikHaberiIcerik(s, { yil = null, davetTr = "", davetEn = "" } = {}) {
  const [tTr, tEn] = ESER_TUR[s.tur] || ESER_TUR.hikaye;
  const baslik = kisalt(`${s.yazar} · ${s.eser}`, 70);
  const yilTr = yil ? ` İlk yayım yılı kaynağında ${yil} olarak yazılıdır.` : "", yilEn = yil ? ` The source gives the first publication year as ${yil}.` : "";
  const trOzet = `“${s.metin}”\n\n${s.yazar}, "${s.eser}" ${tTr}. Metin, Türkçe Vikikaynak'taki telifsiz sürümden aynen alınmıştır; yazarın ölüm yılı ${s.olum}.${yilTr}${davetTr ? `\n\n${davetTr}` : ""}\n\nKaynak: Vikikaynak`;
  const enOzet = `“${s.metin}”\n\nOriginal Turkish text from the ${tEn} "${s.eser}" by ${s.yazar} (died ${s.olum}); copied verbatim from the public-domain edition on Turkish Wikisource.${yilEn}${davetEn ? `\n\n${davetEn}` : ""}\n\nSource: Wikisource`;
  return { tr: { baslik, ozet: kisalt(trOzet, 2300) }, en: { baslik, ozet: kisalt(enOzet, 2300) } };
}

async function jsonIste(url, { fetchFn = fetch } = {}) {
  const r = await fetchFn(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
  if (r.status === 429) throw new Error("429");
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
/** Vikikaynak sayfasının wikitext'i. Sayfa yoksa hata atar. */
export async function vikikaynakGetir(sayfa, { fetchFn = fetch } = {}) {
  const p = new URLSearchParams({ action: "parse", page: sayfa, prop: "wikitext", format: "json", formatversion: "2", redirects: "1" });
  const j = await jsonIste(`${WS_API}?${p}`, { fetchFn });
  if (j?.error) throw new Error(`vikikaynak: ${j.error.code || "hata"}`);
  const wt = j?.parse?.wikitext;
  if (typeof wt !== "string") throw new Error("vikikaynak: wikitext yok");
  return { wikitext: wt, baslik: j.parse.title || sayfa };
}
