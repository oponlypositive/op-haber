// Model çıktısının kod doğrulamaları: biçim, cümle sayısı, rakam koruması, kopya, dil sezgisi, ikinci filtre.
import { denetle } from "./moderasyon.mjs";
import { konuYasak } from "./on_eleme.mjs";

export const KATEGORILER = ["bilim", "saglik", "doga", "hayvanlar", "iyilik", "sanat", "spor", "teknoloji", "mahalle"];
export const EMOJI = { bilim: "🔬", saglik: "💚", doga: "🌳", hayvanlar: "🐾", iyilik: "🤝", sanat: "🎨", spor: "🏅", teknoloji: "💡", mahalle: "🏡" };

export const cumleSay = (m) => String(m || "").trim().split(/(?<=[.!?])\s+/).filter((c) => c.trim().length > 3).length;
export const rakamlar = (m) => new Set((String(m || "").match(/\d[\d.,]*\d|\d/g) || []).map((x) => x.replace(/[.,]/g, "")));

const TR_SOZ = new Set("ve bir için ile bu da de olarak çok daha gibi kadar ancak ise olan oldu ayrıca sonra her çünkü ya veya ne en o şu onun".split(" "));
const EN_SOZ = new Set("the and of to in is was were with for that this on as by from are has have been their it its at which who also but not will can".split(" "));
const kelimeler = (t) => String(t || "").toLocaleLowerCase("tr").match(/[\p{L}']+/gu) || [];

/** Basit dil sezgisi. dil: "tr" | "en". */
export function dilUygun(metin, dil) {
  const k = kelimeler(metin);
  if (k.length < 12) return false;
  const harf = (String(metin).match(/\p{L}/gu) || []).length || 1;
  const trHarf = (String(metin).match(/[çğışöüÇĞİŞÖÜ]/g) || []).length / harf;
  const tr = k.filter((x) => TR_SOZ.has(x)).length / k.length;
  const en = k.filter((x) => EN_SOZ.has(x)).length / k.length;
  return dil === "tr" ? (trHarf >= 0.015 || tr >= 0.06) && en < 0.08 : en >= 0.12 && trHarf < 0.02 && tr < 0.05;
}

const sekizli = (t) => {
  const k = kelimeler(t), s = new Set();
  for (let i = 0; i + 8 <= k.length; i++) s.add(k.slice(i, i + 8).join(" "));
  return s;
};
/** Çıktıdaki 8 kelimelik dizilerden biri kaynakta aynen geçiyorsa kopyadır. */
export function kaynaktanKopya(cikti, kaynak) {
  const kay = sekizli(kaynak);
  for (const g of sekizli(cikti)) if (kay.has(g)) return true;
  return false;
}

/**
 * -> {ok, neden, haber?}. d: modelin ayrıştırılmış JSON'u; kaynak: başlık+özet+sayfa düz metni.
 * haber: yayına gidecek alanlar (tr, en, kategori, yer).
 */
export function ciktiDogrula(d, kaynak, kaynakBaslik = "") {
  if (!d || typeof d !== "object") return { ok: false, neden: "json değil" };
  if (d.uygun !== true) return { ok: false, neden: "model uygun bulmadı", kalici: true };
  if (!KATEGORILER.includes(d.kategori)) return { ok: false, neden: "kategori geçersiz" };
  const kay = rakamlar(kaynak);
  for (const dil of ["tr", "en"]) {
    const m = d[dil];
    if (!(m && typeof m.baslik === "string" && typeof m.ozet === "string" && m.baslik.trim())) return { ok: false, neden: `${dil} alanı eksik` };
    const c = cumleSay(m.ozet);
    if (c < 3 || c > 9) return { ok: false, neden: `${dil} cümle sayısı ${c}` };
    if (m.baslik.length > 90 || m.ozet.length > 2400) return { ok: false, neden: `${dil} çok uzun` };
    if (/https?:\/\/|www\.|[*_#`]{2,}|^\s*[-*•]\s|\[[^\]]*\]\(/m.test(m.baslik + "\n" + m.ozet)) return { ok: false, neden: `${dil} bağlantı/markdown` };
    if (/\p{Extended_Pictographic}/u.test(m.baslik + m.ozet)) return { ok: false, neden: `${dil} emoji` };
    if (/!/.test(m.baslik + m.ozet)) return { ok: false, neden: `${dil} ünlem` };
    const fazla = [...rakamlar(m.baslik + " " + m.ozet)].filter((x) => !kay.has(x));
    if (fazla.length) return { ok: false, neden: `${dil} kaynakta olmayan rakam` };
    if (!dilUygun(m.ozet, dil)) return { ok: false, neden: `${dil} dil sezgisi tutmadı` };
  }
  if (kaynaktanKopya(d.en.ozet, kaynak) || kaynaktanKopya(d.tr.ozet, kaynak)) return { ok: false, neden: "kaynaktan kopya" };
  const tum = [d.tr.baslik, d.tr.ozet, d.en.baslik, d.en.ozet, d.yer || ""].join(" ");
  const f = denetle(tum);
  if (!f.ok) return { ok: false, neden: `ikinci filtre:${f.tur}`, kalici: true };
  const k = konuYasak(tum, kaynakBaslik);
  if (k.length) return { ok: false, neden: `${k[0].kural} kapısı`, kalici: true };
  const yer = typeof d.yer === "string" && d.yer.trim() ? d.yer.trim().slice(0, 120) : "Dünya";
  return {
    ok: true, neden: "",
    haber: {
      tr: { baslik: d.tr.baslik.trim(), ozet: d.tr.ozet.trim() }, en: { baslik: d.en.baslik.trim(), ozet: d.en.ozet.trim() },
      kategori: d.kategori, yer,
    },
  };
}
