// OP Sanat / Heykel (op_sanat, kategori "sanat", alt_konu "heykel"): ünlü heykeller ve hikâyeleri, fotoğraflı. Haberden bağımsız, düzenli içerik (konu hesapları düzeni, lib/konu.mjs).
//   Havuz: lib/heykel_veri.mjs (arac/hayvan_heykel_dogrula.mjs ile ağdan doğrulanmış; elle düzenlenmez). Metinleri MODEL yazmaz: editör yazdı, her olgu Vikipedi maddesinde "kanit" ile doğrulandı.
//   TELİF (iki katman): (1) ESER: sanatçı ölüm yılı <= 1955 (telifsizMi) ya da sanatçısı bilinmeyen ve yapılışı <= 1900; çağdaş/panorama özgürlüğü tartışmalı eser yok.
//                       (2) FOTOĞRAF: üç boyutlu eserin fotoğrafı da Commons'ta CC0 / Public domain / CC BY / CC BY-SA olmalı (yayın anında yine denetlenir), atıf gönderiye yazılır.
//   KONU: dinî ibadet nesnesi/dinî figür, siyasi anıt, savaş-ölüm anlatısı yok (TARIH_YASAK metinde geçmez); mitolojik ve dünyevi eserler. Çıplaklık: belirgin kadraj seçilmez (görsel modelle de sorulur).
// DÜRÜSTLÜK: rozetli OP hesabıdır; kişisel deneyim uydurmaz (birinci tekil kişi reddedilir), uydurma alıntı yok.
import { jsonAyikla } from "./model.mjs";
import { denetle } from "./moderasyon.mjs";
import { konuYasak } from "./on_eleme.mjs";
import { cumleSay, yazimHatasi } from "./dogrula.mjs";
import { turkceDenetle } from "./turkce_denetim.mjs";
import { telifsizMi } from "./alinti_yazarlar.mjs";
import { ABARTI, BIRINCI_TEKIL, KUMAR_PARA, SAGLIK, SIDDET, TARIH_YASAK, TIKLAMA_TUZAGI } from "./konu_yasak.mjs";
import { HEYKELLER } from "./heykel_veri.mjs";

export const HEYKEL_ALT_KONU = "heykel";
export const ANONIM_EN_GEC_YIL = 1900;              // sanatçısı bilinmeyen eser en geç bu yılda yapılmış olmalı
const CIPLAK = /çıplak|nude|naked|erotik|erotic|cinsel|sexual/iu;
const DOSYA_RE = /\.(jpe?g)$/i;

/** Eserin telif durumu (saf). -> "" | neden */
export function heykelTelifNedeni(h) {
  if (h.anonim) return Number.isFinite(h.yilSayi) && h.yilSayi <= ANONIM_EN_GEC_YIL ? "" : `telif: anonim eser ${h.yilSayi ?? "?"} (1900 sonrası ya da bilinmiyor)`;
  return telifsizMi(h.olum) ? "" : `telif: sanatçı ${h.sanatci} ölüm ${h.olum ?? "?"} (1955 sonrası ya da bilinmiyor)`;
}

/** Havuz öğesi yayınlanabilir mi (saf, ağsız)? -> "" | neden */
export function heykelSatirNedeni(h) {
  if (!h || typeof h !== "object") return "satır yok";
  for (const k of ["ad", "enAd", "sanatci", "yil", "yer", "yerEn", "madde", "url", "tr", "en", "gorsel", "lisans"]) if (typeof h[k] !== "string" || !h[k].trim()) return `alan eksik: ${k}`;
  if (!/^https:\/\/en\.wikipedia\.org\/wiki\//.test(h.url)) return "kaynak bağlantısı Vikipedi değil";
  if (!DOSYA_RE.test(h.gorsel)) return "görsel jpeg değil";
  const tn = heykelTelifNedeni(h); if (tn) return tn;
  for (const [dil, metin] of [["tr", h.tr], ["en", h.en]]) {
    const c = cumleSay(metin);
    if (c < 2 || c > 5) return `${dil} cümle sayısı ${c}`;
    if (metin.length < 120 || metin.length > 700) return `${dil} uzunluk ${metin.length}`;
    if (/https?:\/\/|www\.|[*_#`]{2,}|\[[^\]]*\]\(|<[^>]+>/.test(metin)) return `${dil} bağlantı/markdown`;
    if (/\p{Extended_Pictographic}/u.test(metin)) return `${dil} emoji`;
    if (/!/.test(metin)) return `${dil} ünlem`;
    if (ABARTI.test(metin)) return `${dil} abartılı sıfat`;
    if (TIKLAMA_TUZAGI.test(metin)) return `${dil} tıklama tuzağı`;
    if (SAGLIK.test(metin)) return `${dil} sağlık iddiası`;
    if (SIDDET.test(metin)) return `${dil} şiddet kalıbı`;
    if (KUMAR_PARA.test(metin)) return `${dil} para/kumar kalıbı`;
    if (BIRINCI_TEKIL.test(metin)) return `${dil} birinci tekil kişi (kişisel deneyim uydurulamaz)`;
    if (TARIH_YASAK.test(metin)) return `${dil} din/ritüel/ölüm/savaş kalıbı`;
    if (CIPLAK.test(metin)) return `${dil} çıplaklık kalıbı`;
  }
  const yh = yazimHatasi(h.tr); if (yh) return `tr yazım hatası: ${yh}`;
  const ts = turkceDenetle(h.tr); if (ts.length) return `tr dil denetimi: ${ts[0]}`;
  const tum = `${h.ad} ${h.tr} ${h.enAd} ${h.en}`;
  const d = denetle(tum); if (!d.ok) return `moderasyon:${d.tur}`;
  const k = konuYasak(tum); if (k.length) return `konu kapısı: ${k[0].kural}`;
  return "";
}
export const heykelHavuzu = (liste = HEYKELLER) => liste.filter((h) => !heykelSatirNedeni(h));

const kisalt = (t, n) => (t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");
/** Gönderi içeriği (model yok): başlık = eser + sanatçı; künye cümlesi sanatçı/yıl/yer; fotoğraf atfı. */
export function heykelIcerik(h, g) {
  const anonim = h.anonim || /^Bilinmeyen/.test(h.sanatci);
  const sanatciTr = anonim ? "" : ` · ${h.sanatci}`, sanatciEn = anonim ? "" : ` · ${h.sanatci}`;
  const sahibi = String(g?.sahibi || "Unknown").replace(/\s+/g, " ").trim().slice(0, 80), lisans = String(g?.lisans || "").trim();
  return {
    trBas: kisalt(`${h.ad}${sanatciTr}`, 88), enBas: kisalt(`${h.enAd}${sanatciEn}`, 88),
    trOzet: `${h.tr}\n\nSanatçı: ${anonim ? "bilinmiyor" : h.sanatci} · Yapım: ${h.yil} · Bulunduğu yer: ${h.yer}`,
    enOzet: `${h.en}\n\nArtist: ${anonim ? "unknown" : h.sanatci} · Date: ${h.yil} · Location: ${h.yerEn}`,
    kaynakTr: `Kaynak: Vikipedi · ${h.madde} · Fotoğraf: ${sahibi}, ${lisans} · Wikimedia Commons`, kaynakEn: `Source: Wikipedia · ${h.madde} · Photo: ${sahibi}, ${lisans} · Wikimedia Commons`,
  };
}

// ---- görsel denetimi (model; bütçe varsa): doğru eser mi, belirgin çıplaklık, dinî nesne, kalabalık yüzler
export const VL_HEYKEL_BEKLENEN = { konuya_uygun: true, belirgin_ciplaklik: false, dini_ibadet_nesnesi: false, insan_yuzleri_baskin: false, yazi_logo_baskin: false, dusuk_kalite: false };
export function vlHeykelSorusu(h) {
  return `Look at this image carefully. It should be a photograph of the sculpture "${h.enAd}"${h.anonim ? "" : ` by ${h.sanatci}`}. Answer ONLY with JSON containing these fields (all boolean except the last):
{"konuya_uygun": true ONLY if the image plausibly shows that sculpture (or fountain/monument) itself, not a different artwork, a painting, a map or a document,
"belirgin_ciplaklik": explicitly visible genitals or sexually explicit content (an artistic nude torso or a draped figure is NOT a problem: answer false for those),
"dini_ibadet_nesnesi": the image shows an object of worship, a religious altar or a religious figure as the main subject,
"insan_yuzleri_baskin": photographed real people's faces (visitors, a crowd, a portrait) are prominent compared with the sculpture,
"yazi_logo_baskin": watermark, caption or text overlay dominates,
"dusuk_kalite": blurry, tiny subject, very dark or badly cropped,
"kisa_gerekce": one short sentence}`;
}
export function vlHeykelDegerlendir(metin) {
  const d = jsonAyikla(metin);
  if (!d) return { ok: false, neden: "vl yanıtı bozuk", kod: "bozuk" };
  for (const [k, beklenen] of Object.entries(VL_HEYKEL_BEKLENEN)) {
    if (typeof d[k] !== "boolean") return { ok: false, neden: `vl alanı eksik: ${k}`, kod: "eksik" };
    if (d[k] !== beklenen) return { ok: false, neden: k, kod: k.replace(/_.*/, "") };
  }
  return { ok: true };
}
