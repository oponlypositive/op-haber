// Hat ve özel işler için ortak yardımcılar: model çıktısından yayın nesnesi, kurumun hazır lisanslı görseli.
import { EMOJI } from "./dogrula.mjs";
import { gorselIndir } from "./gorsel.mjs";
import { etiketSec } from "./alt_konu.mjs";

/**
 * Aday + haberYaz çıktısı -> haber-yukle'ye gidecek haber nesnesi (kimlik: bağlantı özetinin ilk 14 hanesi).
 * altKonuGonder açıksa yüke `alt_konu` (+ spor için `cinsiyet`) eklenir; kaynak: yazım çıktısı > ön sınıf > kural tahmini.
 */
export function haberKur(a, y, { altKonuGonder = true } = {}) {
  const { altKonu, cinsiyet, ...haber } = y.haber;
  const yuk = { id: "h" + a.hash.slice(0, 14), ...haber, emoji: EMOJI[haber.kategori], kaynak: a.kaynak, link: a.link, zaman: a.zaman, model: y.saglayici };
  if (altKonuGonder) Object.assign(yuk, etiketYuku(a, haber.kategori, { altKonu, cinsiyet }, haber));
  return yuk;
}

/** {alt_konu, cinsiyet} (boş olanlar yok). Saklı (eski) yüklerde de eksikse yayından önce tamamlanır. */
export function etiketYuku(a, kategori, yaz, haber) {
  const metin = `${a.baslik} ${a.ozet || ""} ${haber?.en?.baslik || ""} ${haber?.en?.ozet || ""}`;
  const e = etiketSec({ kategori, yaz, onSinif: a.onSinif || {}, tur: a.tur || "", metin });
  return { ...(e.altKonu ? { alt_konu: e.altKonu } : {}), ...(e.cinsiyet ? { cinsiyet: e.cinsiyet } : {}) };
}

/**
 * Kurumun kendi lisanslı görseli (ESO/ESA-Hubble: CC BY 4.0, atıf zorunlu): beslemeden gelen hazirGorsel -> {gorsel, b64, tur} | null.
 * Hata olursa null döner ve nedeni `notlar` dizisine kısa yazılır.
 */
export async function hazirGorselHazirla(a, { fetchFn = fetch, notlar = [] } = {}) {
  if (!a.hazirGorsel?.url) return null;
  try {
    const d = await gorselIndir({ url: a.hazirGorsel.url, w: 0 }, { fetchFn });
    return { gorsel: { sahibi: a.hazirGorsel.sahibi || a.kaynak, lisans: a.hazirGorsel.lisans, lisans_url: a.hazirGorsel.lisans_url || "", kaynak_url: a.link, saglayici: "kaynak" }, b64: d.b64, tur: d.tur };
  } catch (e) { notlar.push(`hazır görsel:${String(e.message).slice(0, 30)}`); return null; }
}
