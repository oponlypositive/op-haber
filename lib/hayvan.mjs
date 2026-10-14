// OP Hayvanlar (op_hayvanlar, kategori "hayvanlar"): sevimli/ilginç, DOĞRU hayvan özellikleri, fotoğraflı. Haberden bağımsız, düzenli içerik (konu hesapları düzeni, lib/konu.mjs).
//   Havuz: lib/hayvan_veri.mjs (arac/hayvan_heykel_dogrula.mjs ile ağdan doğrulanmış; elle düzenlenmez). Metinleri MODEL yazmaz: editör yazdı, her olgu Vikipedi maddesinde "kanit" ile doğrulandı.
//   Bu dosya SAF kurallar içerir (ağ yok): satır denetimi (yasak sözcük, dürüstlük, biçim), gönderi atfı, görsel soru/değerlendirme. Yayın akışı konu.mjs içindedir.
// DÜRÜSTLÜK: hesap OP'nin rozetli konu hesabıdır; kişisel deneyim uydurmaz ("bugün bir sincap gördüm" yok), birinci tekil kişi kalıpları reddedilir; alıntı uydurulmaz.
// YASAK: avcılık, acı, ölüm, yırtıcı-av sahnesi, hayvanat bahçesi/esaret tartışması, sağlık iddiası, abartı, tıklama tuzağı, bağlantı/markdown/emoji/ünlem.
import { jsonAyikla } from "./model.mjs";
import { denetle } from "./moderasyon.mjs";
import { konuYasak } from "./on_eleme.mjs";
import { cumleSay, yazimHatasi } from "./dogrula.mjs";
import { turkceDenetle } from "./turkce_denetim.mjs";
import { ABARTI, BIRINCI_TEKIL, SAGLIK, SIDDET, TIKLAMA_TUZAGI } from "./konu_yasak.mjs";
import { HAYVANLAR } from "./hayvan_veri.mjs";

export const HAYVAN_ALT_KONULAR = ["yaban-hayati", "evcil"];
// hayvan içeriğine özgü ek yasaklar: av/avlanma/yırtıcı, ölüm/öldürme, acı/yaralanma, esaret/hayvanat bahçesi, tür tehdidi/nesil tükenmesi (olumsuz çerçeve)
export const HAYVAN_YASAK_TR = /(?<![\p{L}])(?:av|avla\p{L}*|avcı\p{L}*|yırtıcı\p{L}*|kurban\p{L}*|ölü\p{L}*|ölüm\p{L}*|öldü\p{L}*|öldür\p{L}*|ölmek|ölen|ölür\p{L}*|acı\p{L}*|sakat\p{L}*|esaret\p{L}*|kafes\p{L}*|hayvanat\p{L}*|nesli\p{L}*|tükenme\p{L}*|zehir\p{L}*|ısır\p{L}*|saldır\p{L}*|parçala\p{L}*|yeme\p{L}* av|katlet\p{L}*|kaçak\p{L}*|tehdit\p{L}*)(?![\p{L}])/iu;
export const HAYVAN_YASAK_EN = /(?<![\p{L}])(?:hunt[a-z]*|prey|predat[a-z]*|kill[a-z]*|death|dead|die[sd]?|pain(?:s|ful)?|injur[a-z]*|captiv[a-z]*|cage[sd]?|zoo|zoos|endanger[a-z]*|extinct[a-z]*|poison[a-z]*|venom[a-z]*|attack[a-z]*|slaughter[a-z]*|poach[a-z]*|threat[a-z]*)(?![\p{L}])/iu;
const ASCII_SLUG = /^[a-z0-9-]{2,40}$/;
const DOSYA_RE = /\.(jpe?g)$/i;

/** Havuz öğesi bu hesapla yayınlanabilir mi (saf, ağsız)? -> "" | neden */
export function hayvanSatirNedeni(h) {
  if (!h || typeof h !== "object") return "satır yok";
  for (const k of ["ad", "enAd", "madde", "url", "alt", "bas", "basEn", "tr", "en", "gorsel", "lisans"]) if (typeof h[k] !== "string" || !h[k].trim()) return `alan eksik: ${k}`;
  if (!HAYVAN_ALT_KONULAR.includes(h.alt) || !ASCII_SLUG.test(h.alt)) return "alt konu geçersiz";
  if (!/^https:\/\/en\.wikipedia\.org\/wiki\//.test(h.url)) return "kaynak bağlantısı Vikipedi değil";
  if (!DOSYA_RE.test(h.gorsel)) return "görsel jpeg değil";
  for (const [dil, metin, baslik] of [["tr", h.tr, h.bas], ["en", h.en, h.basEn]]) {
    const c = cumleSay(metin);
    if (c < 1 || c > 4) return `${dil} cümle sayısı ${c}`;
    if (metin.length < 60 || metin.length > 520) return `${dil} uzunluk ${metin.length}`;
    if (baslik.length < 8 || baslik.length > 80) return `${dil} başlık uzunluğu`;
    for (const t of [metin, baslik]) {
      if (/https?:\/\/|www\.|[*_#`]{2,}|\[[^\]]*\]\(|<[^>]+>/.test(t)) return `${dil} bağlantı/markdown`;
      if (/\p{Extended_Pictographic}/u.test(t)) return `${dil} emoji`;
      if (/!/.test(t)) return `${dil} ünlem`;
      if (ABARTI.test(t)) return `${dil} abartılı sıfat`;
      if (TIKLAMA_TUZAGI.test(t)) return `${dil} tıklama tuzağı`;
      if (SAGLIK.test(t)) return `${dil} sağlık iddiası`;
      if (SIDDET.test(t)) return `${dil} şiddet kalıbı`;
      if (BIRINCI_TEKIL.test(t)) return `${dil} birinci tekil kişi (kişisel deneyim uydurulamaz)`;
      if ((dil === "tr" ? HAYVAN_YASAK_TR : HAYVAN_YASAK_EN).test(t)) return `${dil} hayvan konusu yasağı (av/ölüm/acı/esaret)`;
    }
  }
  const yh = yazimHatasi(h.tr); if (yh) return `tr yazım hatası: ${yh}`;
  const ts = [...turkceDenetle(h.tr), ...turkceDenetle(h.bas)]; if (ts.length) return `tr dil denetimi: ${ts[0]}`;
  const tum = `${h.bas} ${h.tr} ${h.basEn} ${h.en}`;
  const d = denetle(tum); if (!d.ok) return `moderasyon:${d.tur}`;
  const k = konuYasak(tum); if (k.length) return `konu kapısı: ${k[0].kural}`;
  return "";
}
/** Yayınlanabilir havuz (denetimden geçenler). */
export const hayvanHavuzu = (liste = HAYVANLAR) => liste.filter((h) => !hayvanSatirNedeni(h));

/** Fotoğraf atıf satırları (yayında gerçek Commons bilgisiyle kurulur). */
export function hayvanAtfi(h, g) {
  const sahibi = String(g?.sahibi || "Unknown").replace(/\s+/g, " ").trim().slice(0, 80), lisans = String(g?.lisans || "").trim();
  return { tr: `Kaynak: Vikipedi · ${h.madde} · Fotoğraf: ${sahibi}, ${lisans} · Wikimedia Commons`, en: `Source: Wikipedia · ${h.madde} · Photo: ${sahibi}, ${lisans} · Wikimedia Commons` };
}

// ---- görsel denetimi (model; bütçe varsa): doğru hayvan mı, insan yüzü baskın mı, zarar/av sahnesi var mı
export const VL_HAYVAN_BEKLENEN = { konuya_uygun: true, insan_yuzu_baskin: false, zarar_av_ya_da_kafes: false, uygunsuz: false, yazi_logo_baskin: false, dusuk_kalite: false };
export function vlHayvanSorusu(enAd) {
  return `Look at this image carefully. It should be a photograph of the animal "${enAd}". Answer ONLY with JSON containing these fields (all boolean except the last):
{"konuya_uygun": true ONLY if the image plausibly shows a real, living animal of that kind (not a toy, drawing, map, skeleton or a different species),
"insan_yuzu_baskin": a person's face is prominent or the main subject,
"zarar_av_ya_da_kafes": an injured, dead or distressed animal, hunting, an animal being eaten, blood, or an animal clearly in a cage or captivity is shown,
"uygunsuz": nudity or otherwise inappropriate content,
"yazi_logo_baskin": watermark, caption or text overlay dominates,
"dusuk_kalite": blurry, tiny subject, very dark or badly cropped,
"kisa_gerekce": one short sentence}`;
}
export function vlHayvanDegerlendir(metin) {
  const d = jsonAyikla(metin);
  if (!d) return { ok: false, neden: "vl yanıtı bozuk", kod: "bozuk" };
  for (const [k, beklenen] of Object.entries(VL_HAYVAN_BEKLENEN)) {
    if (typeof d[k] !== "boolean") return { ok: false, neden: `vl alanı eksik: ${k}`, kod: "eksik" };
    if (d[k] !== beklenen) return { ok: false, neden: k, kod: k.replace(/_.*/, "") };
  }
  return { ok: true };
}
