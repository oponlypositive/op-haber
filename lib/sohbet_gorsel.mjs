// OP Sohbet gönderi görseli (2026-10-14, sahip: "güzel bir güneşli İstanbul manzarası olabilirdi"; metinli kart değil FOTOĞRAF).
// Yöntem: DOĞRULANMIŞ KÜRATÖRLÜ liste (lib/sohbet_gorsel_veri.mjs; arac/sohbet_gorsel_dogrula.mjs ağdan doğrular) -> gönderi başına dönüşümlü seçim.
//   - Şehir geçiyorsa o şehrin tanınmış, sakin ve güzel manzarası; şehir yoksa konuya uygun nötr doğa / gündelik yaşam fotoğrafı.
//   - Hava etiketi (acik | bulutlu | notr): yağmurlu/kapalı günde "güneşli" fotoğraf DAYATILMAZ (bulutlu/nötr seçilir); açık günde açık öne alınır.
//   - Aynı fotoğraf 14 gün içinde tekrar etmez: kullanım, haber_gorulen'de gün başına anahtarla (sha256) işaretlenir (bulut.isaretle) ve seçimde 14 günlük pencere bulut.bilinenler ile sorgulanır.
//   - Yayın anında Commons lisansı/boyutu/mime YİNE denetlenir (liste bayatlayabilir); atıf canlı meta veriden gelir. Hata = görselsiz değil, çağıran eski yola (yer fotoğrafı) düşer.
//   - Yük, haber görsel biçimiyle aynı: {gorsel: {sahibi, lisans, lisans_url, kaynak_url, saglayici}, b64, tur} (sunucu url'yi yükleyip yazar).
import { createHash } from "node:crypto";
import { gorselIndir, lisansOk } from "./gorsel.mjs";
import { UA, duzMetin, varlikCoz } from "./rss.mjs";
import { SOHBET_GORSELLERI } from "./sohbet_gorsel_veri.mjs";

export const GORSEL_TEKRAR_GUN = 14;
export const GORSEL_MIN_GENISLIK = 1200;
export const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const ADAY_UST = 6;                     // bir seçimde sorgulanan en çok fotoğraf (14 gün x 6 anahtar)

const katla = (t) => String(t ?? "").normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i").toLowerCase().replace(/[^a-z0-9]+/g, "");
/** "İstanbul" -> "istanbul" (liste anahtarı). */
export const sehirAnahtari = (ad) => katla(ad);

/** Open-Meteo WMO kodu -> "acik" | "bulutlu" | "yagmurlu" (sis, çise, yağmur, kapalı yağışlı) | "notr" (kod yok). */
export function havaEtiketi(kod) {
  if (kod === 0 || kod === 1) return "acik";
  if (kod === 2 || kod === 3) return "bulutlu";
  if (Number.isFinite(kod)) return "yagmurlu";
  return "notr";
}
// hava etiketine göre fotoğraf tercih sırası (listede olmayan etiket seçilemez)
const TERCIH = { acik: ["acik", "notr", "bulutlu"], bulutlu: ["notr", "bulutlu"], yagmurlu: ["bulutlu", "notr"], notr: ["notr", "acik", "bulutlu"] };
// konu sözcüğü -> tema (yalnız şehirsiz/genel havuzda küçük bir yönlendirme)
const TEMA = [["ev", /film|dizi|kitap|okuma|oku\b|müzik|evde/iu], ["deniz", /deniz|sahil|kıyı|plaj|vapur|boğaz/iu], ["park", /park|bahçe|yürüyüş|yürü|piknik|orman|doğa/iu], ["icecek", /çay|kahve|kahvaltı|içecek/iu]];
export const temaBul = (metin) => { for (const [t, rx] of TEMA) if (rx.test(String(metin || ""))) return t; return ""; };

const gunNo = (simdi) => Math.floor((simdi + 3 * 3600_000) / 86400_000);
export const kullanimAnahtari = (dosya, gun) => createHash("sha256").update(`sohbetgorsel|${dosya}|${gun}`).digest("hex");
const karistir = (liste, rastgele) => { const a = [...liste]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rastgele() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/**
 * Hava ve şehre uygun adaylar, tercih sırasıyla (saf). sehir: "istanbul" gibi anahtar ya da "" (şehirsiz). Şehirli arama önce şehre özel fotoğraflara, sonra genel havuza bakar.
 */
export function gorselAdaylari({ sehir = "", hava = "notr", tema = "", liste = SOHBET_GORSELLERI, rastgele = Math.random } = {}) {
  const sira = TERCIH[hava] || TERCIH.notr;
  const uygunHava = (g) => sira.includes(g.hava);
  const sirala = (grup) => {
    const k = karistir(grup, rastgele);
    return k.sort((a, b) => sira.indexOf(a.hava) - sira.indexOf(b.hava) || ((tema && b.tema === tema ? 1 : 0) - (tema && a.tema === tema ? 1 : 0)));
  };
  const sehirGrubu = sehir ? sirala(liste.filter((g) => g.sehir === sehir && uygunHava(g))) : [];
  const genel = sirala(liste.filter((g) => g.sehir === "genel" && uygunHava(g)));
  return [...sehirGrubu, ...genel];
}

/**
 * Son 14 günde kullanılmamış ilk fotoğraf (bulut.bilinenler ile). bulut hata verirse kayıt yok sayılır (seçim yine yapılır; bilinenler çalışmıyorsa tekrar riski kabul).
 * -> kayıt | null
 */
export async function gorselSec({ bulut, sehir = "", hava = "notr", metin = "", simdi = Date.now(), rastgele = Math.random, liste = SOHBET_GORSELLERI } = {}) {
  const adaylar = gorselAdaylari({ sehir, hava, tema: temaBul(metin), liste, rastgele });
  if (!adaylar.length) return null;
  const gun = gunNo(simdi);
  // şehre özel ilk ADAY_UST fotoğrafın hepsi kullanılmışsa genel havuza da bakılabilsin: sorgu tek partide, 14 günlük pencere x aday
  const anahtarlar = []; const sahibi = new Map();
  for (const g of adaylar.slice(0, ADAY_UST * 2)) for (let i = 0; i < GORSEL_TEKRAR_GUN; i++) { const a = kullanimAnahtari(g.dosya, gun - i); anahtarlar.push(a); sahibi.set(a, g.dosya); }
  let kullanilan = new Set();
  try {
    const m = await bulut.bilinenler(anahtarlar);
    if (m && typeof m.keys === "function") for (const a of m.keys()) if (sahibi.has(a)) kullanilan.add(sahibi.get(a));
  } catch { kullanilan = new Set(); }
  return adaylar.slice(0, ADAY_UST * 2).find((g) => !kullanilan.has(g.dosya)) || null;
}
/** Fotoğraf kullanımını haber_gorulen'e işaretleyecek kayıt (bulut.isaretle girdisi). */
export const kullanimKaydi = (kayit, simdi) => ({ ozet: kullanimAnahtari(kayit.dosya, gunNo(simdi)), durum: "yayinlandi", neden: "sohbet-gorsel" });

/** Commons'tan canlı doğrulama: jpeg, lisans beyaz listesi, orijinal >= 1200 px. -> {url, yedekUrl, w, h, sahibi, lisans, lisans_url, kaynak_url} | null */
export async function commonsBilgi(dosya, { fetchFn = fetch } = {}) {
  const p = new URLSearchParams({ action: "query", format: "json", formatversion: "2", titles: "File:" + dosya, prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "1280" });
  const r = await fetchFn(`${COMMONS_API}?${p}`, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
  if (r.status === 429) throw new Error("429");
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  const ii = ((j?.query?.pages || [])[0]?.imageinfo || [])[0];
  if (!ii) return null;
  const md = ii.extmetadata || {}, lisans = md.LicenseShortName?.value || "";
  if (ii.mime !== "image/jpeg" || !lisansOk(lisans) || (ii.width || 0) < GORSEL_MIN_GENISLIK || !(ii.thumburl || ii.url)) return null;
  const url = ii.thumburl || ii.url;
  return { url, yedekUrl: url.replace(/\/1280px-/, "/960px-") !== url ? url.replace(/\/1280px-/, "/960px-") : "", w: ii.thumbwidth || ii.width, h: ii.thumbheight || ii.height,
    sahibi: varlikCoz(duzMetin(md.Artist?.value || "", 200) || "Unknown").replace(/\s+/g, " ").trim().slice(0, 80), lisans, lisans_url: md.LicenseUrl?.value || "", kaynak_url: ii.descriptionurl || "" };
}
/** Seçilen kaydı canlı doğrulayıp indirir. -> {gorsel:{sahibi,lisans,lisans_url,kaynak_url,saglayici}, b64, tur} | null (doğrulanamadı: çağıran yedek yola düşer) */
export async function gorselHazirla(kayit, { fetchFn = fetch } = {}) {
  const b = await commonsBilgi(kayit.dosya, { fetchFn });
  if (!b) return null;
  const d = await gorselIndir({ url: b.url, yedekUrl: b.yedekUrl, w: b.w, h: b.h }, { fetchFn });
  return { gorsel: { sahibi: b.sahibi, lisans: b.lisans, lisans_url: b.lisans_url, kaynak_url: b.kaynak_url, saglayici: "wikimedia" }, b64: d.b64, tur: d.tur };
}
export { SOHBET_GORSELLERI };
