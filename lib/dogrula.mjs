// Model çıktısının kod doğrulamaları: biçim, cümle sayısı, rakam koruması, kopya, dil sezgisi, ikinci filtre.
import { denetle } from "./moderasyon.mjs";
import { konuYasak } from "./on_eleme.mjs";

// Haber kategorileri (modelin seçebildikleri) + alıntı/gökbilim kategorileri (alıntıyı kod üretir; modelin kategori seçimine kapalı).
export const HABER_KATEGORILERI = ["bilim", "saglik", "doga", "hayvanlar", "iyilik", "sanat", "spor", "teknoloji", "mahalle"];
export const ALINTI_KATEGORILERI = ["felsefe", "edebiyat", "siir", "mitoloji"];
export const KATEGORILER = [...HABER_KATEGORILERI, ...ALINTI_KATEGORILERI, "gokbilim"];
export const EMOJI = { bilim: "🔬", saglik: "💚", doga: "🌳", hayvanlar: "🐾", iyilik: "🤝", sanat: "🎨", spor: "🏅", teknoloji: "💡", mahalle: "🏡", felsefe: "🧠", edebiyat: "📖", siir: "🪶", mitoloji: "🏛️", gokbilim: "🔭" };

const INSAN_KELIME = new Set("people person man men woman women girl girls boy boys kid kids child children team teams athlete athletes group crowd players player winners winner champion champions students family portrait smiling faces face".split(" "));

export const OZNE_TURLERI = ["kisi", "kurum", "yer", "eser", "tur", "nesne"];
/**
 * Modelin `gorsel_ozne` alanı ({ad, tur}): haberin ADI GEÇEN öznesi (sporcu, sanatçı, bilim insanı, takım, kurum, yapı, yer, eser, hayvan türü, gök cismi).
 * Ad Commons aramasında kullanılacağı için yalnız Latin harfli, 2-60 karakterlik ve en çok 6 kelimelik olmalı; aksi halde özne yok sayılır. -> {ad, tur} | null
 */
export function ozneAyikla(o) {
  if (!o || typeof o !== "object") return null;
  const ad = typeof o.ad === "string" ? o.ad.replace(/[^\p{Script=Latin}0-9 .'&-]+/gu, " ").replace(/\s+/g, " ").trim() : "";
  const tur = typeof o.tur === "string" ? o.tur.trim().toLowerCase() : "";
  if (ad.length < 3 || ad.length > 60 || ad.split(" ").length > 6 || !OZNE_TURLERI.includes(tur) || !/\p{L}{3}/u.test(ad)) return null;
  return { ad, tur };
}

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
export function ciktiDogrula(d, kaynak, kaynakBaslik = "", { izinliKategoriler = HABER_KATEGORILERI } = {}) {
  if (!d || typeof d !== "object") return { ok: false, neden: "json değil" };
  if (d.uygun !== true) return { ok: false, neden: "model uygun bulmadı", kalici: true };
  if (!izinliKategoriler.includes(d.kategori)) return { ok: false, neden: "kategori geçersiz" };
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
  // görsel arama terimi (isteğe bağlı): kısa, yalnız İngilizce harf, insan odaklı kelime yok
  let gorselAra = "";
  if (typeof d.gorsel_arama === "string") {
    const t = d.gorsel_arama.toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
    const k = t.split(" ").filter((w) => w.length >= 3 && !INSAN_KELIME.has(w));
    if (k.length >= 1 && k.length <= 5) gorselAra = k.join(" ");
  }
  const gorselOzne = ozneAyikla(d.gorsel_ozne);
  const yerKurum = typeof d.yer_kurum_adi === "string" ? d.yer_kurum_adi.replace(/[^A-Za-z0-9 .'&-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) : "";   // görsel aramasında önce aranır
  const yer = typeof d.yer === "string" && d.yer.trim() ? d.yer.trim().slice(0, 120) : "Dünya";
  return {
    ok: true, neden: "",
    haber: {
      tr: { baslik: d.tr.baslik.trim(), ozet: d.tr.ozet.trim() }, en: { baslik: d.en.baslik.trim(), ozet: d.en.ozet.trim() },
      kategori: d.kategori, yer, ...(gorselAra ? { gorselAra } : {}), ...(gorselOzne ? { gorselOzne } : {}), ...(yerKurum.length >= 3 ? { yerKurum } : {}),
    },
  };
}

// ---- Çevrilmiş özel ad şüphesi (sahip şikâyeti 2026-10-13: "Çizgide Uzlaş" gibi ders planı adı kelime kelime çevrilmişti)
const katlaOA = (t) => String(t || "").toLocaleLowerCase("tr").normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i");
const OA_HARIC = new Set(["ocak", "subat", "mart", "nisan", "mayis", "haziran", "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik", "pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar",
  "turkiye", "amerika", "avrupa", "asya", "afrika", "ingiltere", "almanya", "fransa", "italya", "ispanya", "japonya", "cin", "hindistan", "rusya", "kanada", "avustralya", "brezilya", "istanbul", "ankara", "izmir", "londra", "paris", "berlin", "roma", "tokyo", "new", "york", "los", "angeles", "san", "francisco",
  "birlesmis", "milletler", "dunya", "saglik", "orgutu", "avrupa", "birligi", "kizilay", "uzay", "ajansi", "bilim", "teknoloji", "universitesi", "enstitusu", "merkezi", "muzesi", "okulu", "hastanesi", "belediyesi", "gokyuzu", "okyanusu", "denizi", "dagi", "nehri", "golu"]);
const buyuk = (w) => /^\p{Lu}/u.test(w) && !/^\p{Lu}+$/u.test(w.replace(/['’].*$/, "")) ;
/**
 * TR metinde, kaynakta bulunmayan "Baş Harfleri Büyük" 2+ kelimelik öbekler (çevrilmiş özel ad şüphesi). Yanlış pozitif düşük:
 * ay/gün/ülke/şehir/kurum sözcükleri hariç; öbeğin KELİMELERİNDEN biri bile (ilk 5 harfle) kaynakta geçiyorsa şüphe sayılmaz.
 * -> ["Çizgide Uzlaş", ...]
 */
export function ozelAdSuphesi(trMetin, kaynak) {
  const kay = katlaOA(kaynak), bulunan = [];
  for (const cumle of String(trMetin || "").split(/(?<=[.?])\s+/)) {
    const k = cumle.trim().split(/\s+/).map((w) => w.replace(/^[“"‘'(]+|[”",;:)]+$/g, ""));
    for (let i = 0; i < k.length; i++) {
      if (!buyuk(k[i])) continue;
      let j = i;
      while (j + 1 < k.length && buyuk(k[j + 1])) j++;
      if (j > i) {
        const kelimeler = k.slice(i, j + 1), govde = kelimeler.map((w) => katlaOA(w.replace(/['’].*$/, "")));
        const haric = govde.some((w) => OA_HARIC.has(w));
        const kaynaktaGecer = kay.includes(govde.join(" ")) || govde.some((w) => w.length >= 4 && kay.includes(w.slice(0, 5)));
        if (!haric && !kaynaktaGecer) bulunan.push(kelimeler.join(" "));
      }
      i = j;
    }
  }
  return [...new Set(bulunan)];
}
/** Şüpheli öbek geçen cümleleri çıkarır. -> yeni özet */
export function suphelicumleleriCikar(ozet, oneriler) {
  return String(ozet).split(/(?<=[.?])\s+/).filter((c) => !oneriler.some((o) => c.includes(o))).join(" ");
}
