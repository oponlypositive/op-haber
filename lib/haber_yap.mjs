// Hat ve özel işler için ortak yardımcılar: model çıktısından yayın nesnesi, kurumun hazır lisanslı görseli.
import { EMOJI } from "./dogrula.mjs";
import { gorselIndir } from "./gorsel.mjs";

/** Aday + haberYaz çıktısı -> haber-yukle'ye gidecek haber nesnesi (kimlik: bağlantı özetinin ilk 14 hanesi). */
export function haberKur(a, y) {
  return { id: "h" + a.hash.slice(0, 14), ...y.haber, emoji: EMOJI[y.haber.kategori], kaynak: a.kaynak, link: a.link, zaman: a.zaman, model: y.saglayici };
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
