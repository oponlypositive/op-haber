// Lisanslı görsel: Wikimedia Commons + Openverse (CC0, CC BY, CC BY-SA, PD), yedek Pixabay / Pexels (anahtar varsa).
// Sıra: özne (Commons -> Openverse; özne yoksa haberdeki yer/kurum yedek özne) -> konu (Commons -> Openverse) -> Pixabay/Pexels -> görselsiz.
// Aday seçimi kural tabanlı; en iyi 1-2 aday için model görsel kontrolü. Boyutlandırma için kaynağın küçük sürüm adresi kullanılır.
import { UA, duzMetin, varlikCoz } from "./rss.mjs";
import { jsonAyikla, KotaDoldu } from "./model.mjs";

const SINIR_BAYT = 900_000;     // haber-yukle: ≤ 1 MB
const MIN_GENISLIK = 600;
const dur = (ms) => new Promise((r) => setTimeout(r, ms));

const YASAK_KOK = ["politic", "election", "campaign", "parliament", "president", "minister", "government", "army", "military", "soldier", "war", "weapon", "gun", "bomb",
  "violence", "murder", "blood", "dead", "death", "funeral", "protest", "church", "mosque", "temple", "synagogue", "cross", "crucifix", "religio", "prayer", "flag", "ethnic",
  "race", "poster", "logo", "banner", "billboard", "advert", "brand", "screenshot", "meme", "nude", "naked", "sexy", "hospital bed", "patient", "surgery", "injur", "accident", "fire", "flood",
  "hurricane", "tornado", "earthquake", "tsunami", "cyclone", "typhoon", "wildfire", "storm", "disaster", "drought", "refugee", "explosion", "victim"];
const KISA = new Set(["war", "gun", "fire", "race", "cross", "dead"]);
const DURDURMA = new Set(`a an the and or of in on at to for from with by as is are was were be been it its this that these those into over under after before about than then their
his her they them who whom what which when where how why not no new has have had will can may could would should more most one two three four first year years old man woman women
people against protect solved found finds help helps makes made gets gives says said launch launches opens open named among top big large small story type types develop develops
scientists scientist researchers choose know wants price explore latest live`.split(/\s+/));

export function yasakliMi(metin) {
  const t = String(metin || "").toLowerCase(), kel = t.match(/[a-z]+/g) || [];
  return YASAK_KOK.some((k) => (k.includes(" ") ? t.includes(k) : KISA.has(k) ? kel.some((w) => w === k || w === k + "s") : t.includes(k)));
}

// Arşiv / siyah-beyaz / eski fotoğraf elemesi (kod). yil: kaynağın bildirdiği çekim yılı (varsa).
export const ARSIV_ESIK_YIL = 2005;
const ARSIV_KELIME = /(?<![a-z])(archive[sd]?|archival|historic(?:al)?|vintage|black[ -]?and[ -]?white|blackwhite|b&w|bnw|monochrome|sepia|retro|old photo|daguerreotype)(?![a-z])/i;
const ESKI_YIL = /(?<!\d)(1[5-9]\d\d)s?(?!\d)/;
export function arsivMi(aday) {
  const metin = String(aday.metin || "");
  if (ARSIV_KELIME.test(metin)) return true;
  if (Number.isFinite(aday.yil)) return aday.yil < ARSIV_ESIK_YIL;                // çekim yılı biliniyor: eşik
  if (Number.isFinite(aday.yilDosya) && aday.yilDosya < ARSIV_ESIK_YIL) return true;   // yalnız dosya tarihi var ve eski
  return ESKI_YIL.test(metin);   // çekim yılı bilinmiyorsa başlıkta/açıklamada 19xx geçmesi yeter
}

/** Lisans beyaz listesi: CC0, CC BY, CC BY-SA, Public Domain (+ Pixabay Content License ve Pexels License yedeği). NC/ND hep ret. */
export function lisansOk(lisans) {
  const l = String(lisans || "").toLowerCase().trim();
  if (!l || /\b(nc|nd)\b|-nc|-nd/.test(l)) return false;
  return /^(cc0|pdm|public domain|pd\b|cc[- ]by([- ]sa)?\b|pixabay content license$|pexels license$)/.test(l);
}

export function anahtarKelimeler(enBaslik, enOzet = "") {
  const al = (m) => [...new Set((String(m || "").match(/[A-Za-z]{4,}/g) || []).map((w) => w.toLowerCase()).filter((w) => !DURDURMA.has(w)))];
  const b = al(enBaslik);
  return b.concat(al(enOzet).filter((w) => !b.includes(w)).slice(0, 6));
}
export function sorgular(enBaslik, enOzet = "") {
  const k = anahtarKelimeler(enBaslik, enOzet), q = [];
  if (k.length >= 2) q.push(k.slice(0, 2).join(" "));
  return [...new Set(q.concat(k.slice(0, 4)))].slice(0, 5);
}

/** Konu uyumu puanı; <=0 = ele. gevsek: stok yedeği (tam kelime eşleşmesi). */
export function puan(aday, anahtarlar, gevsek = false) {
  const metin = aday.metin.toLowerCase(), kel = new Set(metin.match(/[a-z]+/g) || []);
  const ortusme = anahtarlar.filter((k) => (gevsek ? kel.has(k) : metin.includes(k))).length;
  const gerekli = gevsek ? (anahtarlar.length >= 4 ? 2 : 1) : (anahtarlar.length >= 2 ? 2 : 1);   // iki kelimelik somut terimde ikisi de geçmeli ("coral" tek başına çiçek çeşidi olabilir)
  if (ortusme === 0 || ortusme < gerekli) return 0;
  let p = ortusme * 10;
  // Başlıkta geçen terim açıklama/etiketten güçlü işarettir (konu görselin kendisi)
  const baslik = String(aday.baslik || "").toLowerCase();
  if (baslik) p += anahtarlar.filter((k) => (gevsek ? new Set(baslik.match(/[a-z]+/g) || []).has(k) : baslik.includes(k))).length * 4;
  const { h } = aday, w = aday.ozgunW || aday.w;   // Openverse'te indirilen küçük sürüm 600px; puan özgün genişlikle
  if (w && h) {
    if (w < MIN_GENISLIK) return 0;
    const oran = w / h;
    if (oran >= 1.3) p += 4; else if (oran >= 0.95) p += 2; else if (oran < 0.7) p -= 4;   // yatay kare haber kartına en uygun
    if (w >= 1600) p += 3; else if (w >= 1200) p += 2; else if (w >= 1000) p += 1;
  }
  if (Number.isFinite(aday.yil)) p += aday.yil >= 2015 ? 3 : aday.yil >= 2005 ? 1 : 0;   // yeni tarihli çekim
  if (/\.png(\?|$)/i.test(String(aday.url || ""))) p -= 4;                                // PNG çoğunlukla şema/harita/ekran görüntüsü; fotoğraf JPEG'dir
  return p;
}

// Fotoğraf olmayan görseller (çizim, vektör, harita, şema, pul...) haber fotoğrafı olarak kullanılmaz. Çekim yılı/renk metadatada yoktur: renkli/arşiv ayrımı görsel denetimde yapılır.
const FOTO_DEGIL = /(?<![a-z])(illustrations?|drawings?|sketch(?:es)?|clip ?art|vectors?|diagrams?|infographics?|maps?|charts?|paintings?|cartoons?|comics?|icons?|stamps?|coins?|renders?|rendering|3d|artwork|posters?|flyers?|logos?|svg|collages?|screenshots?)(?![a-z])/i;
export const fotoDegilMi = (metin) => FOTO_DEGIL.test(String(metin || ""));

export function sec(adaylar, anahtarlar, n = 2, gevsek = false) {
  const iyi = [];
  for (const a of adaylar) {
    if (!lisansOk(a.lisans) || arsivMi(a) || yasakliMi(`${a.metin} ${a.yaratici || ""}`) || fotoDegilMi(`${a.baslik || ""} ${a.metin}`)) continue;
    const p = puan(a, anahtarlar, gevsek);
    if (p > 0) iyi.push([p, a]);
  }
  return iyi.sort((x, y) => y[0] - x[0]).slice(0, n).map((x) => x[1]);
}

const lisansAdi = (kod, ver = "") => ({ cc0: "CC0 1.0", pdm: "Public Domain" }[String(kod).toLowerCase()] || `CC ${String(kod).toUpperCase()} ${ver}`.trim());

async function jsonGetir(url, { fetchFn, ek = {} } = {}) {
  const r = await fetchFn(url, { headers: { "User-Agent": UA, Accept: "application/json", ...ek }, signal: AbortSignal.timeout(15000) });
  if (r.status === 429) throw new Error("429");
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function wikimediaAra(q, { fetchFn = fetch } = {}) {
  const p = new URLSearchParams({ action: "query", format: "json", generator: "search", gsrsearch: `${q} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "15",
    prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "1280" });
  const j = await jsonGetir(`https://commons.wikimedia.org/w/api.php?${p}`, { fetchFn });
  const cikti = [];
  for (const sayfa of Object.values(j?.query?.pages || {})) {
    const ii = (sayfa.imageinfo || [{}])[0], md = ii.extmetadata || {};
    if (!["image/jpeg", "image/png"].includes(ii.mime) || !(ii.thumburl || ii.url)) continue;
    const sade = (k) => duzMetin(md[k]?.value || "", 300);
    const yilBul = (k) => { const m = String(md[k]?.value || "").match(/(?<!\d)(1[0-9]\d\d|20\d\d)(?!\d)/); return m ? Number(m[1]) : null; };
    const yil = yilBul("DateTimeOriginal"), yilDosya = yilBul("DateTime");
    cikti.push({
      baslik: String(sayfa.title || "").replace(/^File:/i, ""), yil, yilDosya, url: ii.thumburl || ii.url, w: ii.thumbwidth || ii.width || 0, h: ii.thumbheight || ii.height || 0,
      metin: [sayfa.title, sade("ObjectName"), sade("ImageDescription"), sade("Categories").replace(/\|/g, " ")].join(" "),
      yaratici: sade("Artist") || "Unknown", lisans: md.LicenseShortName?.value || "", lisans_url: md.LicenseUrl?.value || "",
      kaynak_url: ii.descriptionurl || "", saglayici: "wikimedia",
    });
  }
  return cikti;
}

/**
 * Openverse (anahtarsız anonim: dakikada 20, günde 200 istek; kayıtlı istemci kimliğiyle çok daha fazla). Lisans beyaz listesi CC0/PDM/BY/BY-SA (ND ve NC yok),
 * mature=false, yalnız fotoğraf (jpg/png), özgün genişlik >= OV_MIN_GENISLIK. butce = { kalan, dur, kalanGunluk } tur boyunca paylaşılır:
 * kalan bitince ya da 429 gelince ağa gidilmez ([] döner). belirtec: isteğe bağlı OAuth erişim belirteci (OPENVERSE_CLIENT_ID/SECRET'ten).
 */
export const OV_MIN_GENISLIK = 1000;
export async function openverseAra(q, { fetchFn = fetch, butce = null, belirtec = "" } = {}) {
  if (butce) { if (butce.dur || butce.kalan <= 0) return []; butce.kalan--; }
  const p = new URLSearchParams({ q, license: "cc0,pdm,by,by-sa", mature: "false", category: "photograph", extension: "jpg,png", page_size: "20" });
  const r = await fetchFn(`https://api.openverse.org/v1/images/?${p}`, { headers: { "User-Agent": UA, Accept: "application/json", ...(belirtec ? { Authorization: `Bearer ${belirtec}` } : {}) }, signal: AbortSignal.timeout(15000) });
  if (r.status === 429) { if (butce) butce.dur = true; throw new Error("429"); }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const gunluk = Number(r.headers?.get?.("x-ratelimit-available-anon_sustained") ?? r.headers?.get?.("x-ratelimit-available-oauth2_client_credentials_sustained"));
  if (butce && Number.isFinite(gunluk)) { butce.kalanGunluk = gunluk; if (gunluk < 15) butce.dur = true; }   // günlük hakkın sonuna yaklaşınca bu tur dur
  const j = await r.json();
  const kabul = new Set(["by", "by-sa", "cc0", "pdm"]);
  return (j.results || []).filter((x) => kabul.has(String(x.license || "").toLowerCase()) && !x.mature && !(x.unstable__sensitivity || []).length
    && /^(jpe?g|png)$/i.test(String(x.filetype || "jpg")) && (x.width || 0) >= OV_MIN_GENISLIK && (x.thumbnail || x.url)).map((x) => {
    // Flickr _b (1024px) dosyası küçük ve hızlıdır: doğrudan; diğerlerinde Openverse'ün 600px küçük sürümü (900 KB sınırına güvenli), olmazsa özgün.
    const dogrudan = /staticflickr\.com/.test(x.url || "");
    return {
      baslik: String(x.title || ""), url: dogrudan ? x.url : (x.thumbnail || x.url), yedekUrl: dogrudan ? (x.thumbnail || "") : (x.url || ""), w: dogrudan ? (x.width > 1024 ? 1024 : x.width) : Math.min(x.width || 0, 600), h: x.height || 0, ozgunW: x.width || 0,
      metin: `${x.title || ""} ${(x.tags || []).map((t) => t.name).join(" ")}`, yaratici: x.creator || x.source || "Unknown",
      lisans: lisansAdi(x.license, x.license_version || ""), lisans_url: x.license_url || "", kaynak_url: x.foreign_landing_url || x.url, saglayici: "openverse",
    };
  });
}
/** Openverse OAuth2 belirteci (isteğe bağlı; OPENVERSE_CLIENT_ID + OPENVERSE_CLIENT_SECRET). Hata olursa "" (anonim devam). Belge: api.openverse.org/v1/#tag/auth */
export async function openverseBelirtec(kimlik, sir, { fetchFn = fetch } = {}) {
  if (!kimlik || !sir) return "";
  try {
    const r = await fetchFn("https://api.openverse.org/v1/auth_tokens/token/", { method: "POST", headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: kimlik, client_secret: sir }).toString(), signal: AbortSignal.timeout(15000) });
    if (!r.ok) return "";
    return String((await r.json())?.access_token || "");
  } catch { return ""; }
}

/** Pexels (PEXELS_API_KEY; ücretsiz, Pexels License: ticari kullanım serbest, atıf zorunlu değil ama saklanır). Anahtar yoksa [] (sessiz atlanır). */
export async function pexelsAra(q, anahtar, { fetchFn = fetch } = {}) {
  if (!anahtar) return [];
  const p = new URLSearchParams({ query: q, per_page: "15", orientation: "landscape", size: "large" });
  const j = await jsonGetir(`https://api.pexels.com/v1/search?${p}`, { fetchFn, ek: { Authorization: anahtar } });
  return (j.photos || []).filter((f) => f.src?.large && (f.width || 0) >= 1000).map((f) => ({
    baslik: String(f.alt || ""), url: f.src.large, w: Math.min(f.width || 0, 940), h: f.height || 0, metin: String(f.alt || ""), yaratici: f.photographer || "Pexels",
    lisans: "Pexels License", lisans_url: "https://www.pexels.com/license/", kaynak_url: f.url || "", saglayici: "pexels",
  }));
}

export async function pixabayAra(q, anahtar, { fetchFn = fetch } = {}) {
  if (!anahtar) return [];
  // Anahtar adreste gider (Pixabay API böyle ister); günlüklere adres yazdırılmaz.
  const p = new URLSearchParams({ key: anahtar, q, image_type: "photo", per_page: "15", safesearch: "true", orientation: "horizontal", min_width: "900" });
  const j = await jsonGetir(`https://pixabay.com/api/?${p}`, { fetchFn });
  return (j.hits || []).filter((h) => !h.isAiGenerated && !h.isLowQuality && (h.largeImageURL || h.webformatURL)).map((h) => ({
    url: h.largeImageURL || h.webformatURL, w: h.largeImageURL ? Math.min(h.imageWidth || 0, 1280) : (h.webformatWidth || 640), h: h.imageHeight || 0,
    metin: String(h.tags || "").replace(/,/g, " "), yaratici: h.user || "Pixabay", lisans: "Pixabay Content License",
    lisans_url: "https://pixabay.com/service/license-summary/", kaynak_url: h.pageURL || "", saglayici: "pixabay",
  }));
}

// ---- görüntü başlığından tür + boyut (bağımlılıksız)
export function gorselBilgi(u8) {
  if (u8.length > 24 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) {
    const dv = new DataView(u8.buffer, u8.byteOffset);
    return { tur: "image/png", w: dv.getUint32(16), h: dv.getUint32(20) };
  }
  if (u8.length > 4 && u8[0] === 0xff && u8[1] === 0xd8) {
    let i = 2;
    while (i + 9 < u8.length) {
      if (u8[i] !== 0xff) { i++; continue; }
      const m = u8[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { tur: "image/jpeg", h: (u8[i + 5] << 8) | u8[i + 6], w: (u8[i + 7] << 8) | u8[i + 8] };
      i += 2 + ((u8[i + 2] << 8) | u8[i + 3]);
    }
    return { tur: "image/jpeg", w: 0, h: 0 };
  }
  if (u8.length > 30 && String.fromCharCode(...u8.subarray(0, 4)) === "RIFF" && String.fromCharCode(...u8.subarray(8, 12)) === "WEBP") {
    const k = String.fromCharCode(...u8.subarray(12, 16));
    if (k === "VP8X") return { tur: "image/webp", w: 1 + (u8[24] | (u8[25] << 8) | (u8[26] << 16)), h: 1 + (u8[27] | (u8[28] << 8) | (u8[29] << 16)) };
    return { tur: "image/webp", w: 0, h: 0 };
  }
  return null;
}

/** Adayı indirir: tür/boyut/çözünürlük denetimi. Birincil adres olmazsa (HTTP hata / büyük dosya) varsa yedekUrl denenir. -> {b64, tur, w, h} ; uygun değilse hata atar. */
export async function gorselIndir(aday, { fetchFn = fetch } = {}) {
  let sonHata = null;
  for (const url of [aday.url, aday.yedekUrl].filter(Boolean)) {
    try {
      const r = await fetchFn(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error(`indirme HTTP ${r.status}`);
      const u8 = new Uint8Array(await r.arrayBuffer());
      if (u8.length > SINIR_BAYT) throw new Error("dosya büyük");
      const b = gorselBilgi(u8);
      if (!b) throw new Error("görsel türü tanınmadı");
      const w = b.w || aday.w;
      if (w && w < MIN_GENISLIK) throw new Error(`çözünürlük düşük (${w}px)`);
      return { b64: Buffer.from(u8).toString("base64"), tur: b.tur, w, h: b.h || aday.h };
    } catch (e) { sonHata = e; }
  }
  throw sonHata || new Error("adres yok");
}

// ---- model görsel kontrolü (yapılandırılmış evet/hayır): kabul = konuya_uygun true VE diğer hepsi false; eksik/bozuk yanıt = RET
export const VL_BEKLENEN = {
  konuya_uygun: true, siyah_beyaz_ya_da_arsiv: false, ciplak_ya_da_uygunsuz: false, taninabilir_yuz_baskin: false, kisi_grubu_poz: false,
  yazi_logo_baskin: false, hassas_simge: false, dusuk_kalite: false, cinsiyet_ya_da_yas_uyumsuz: false, yer_ya_da_kurum_uyumsuz: false, insan_ayirt_edilebilir: false,
};
const VL_RED = {
  ozne_eslesiyor: "özne görselde yok",
  konuya_uygun: "konuya uygun değil", siyah_beyaz_ya_da_arsiv: "siyah-beyaz/arşiv", ciplak_ya_da_uygunsuz: "çıplak/uygunsuz", taninabilir_yuz_baskin: "tanınabilir yüz baskın",
  kisi_grubu_poz: "kişi grubu poz", yazi_logo_baskin: "yazı/afiş/logo baskın", hassas_simge: "hassas simge", dusuk_kalite: "kalite düşük", cinsiyet_ya_da_yas_uyumsuz: "cinsiyet/yaş uyumsuz", yer_ya_da_kurum_uyumsuz: "yer/kurum uyumsuz (başka ülke/kurum)", insan_ayirt_edilebilir: "ayırt edilebilir insan",
};
/** Ret nedeni için kısa kod (özet satırı kırılımı): hangi denetim alanı reddetti. */
export const VL_KOD = {
  ozne_eslesiyor: "ozne-yok", konuya_uygun: "konu", siyah_beyaz_ya_da_arsiv: "arsiv", ciplak_ya_da_uygunsuz: "uygunsuz", taninabilir_yuz_baskin: "yuz", kisi_grubu_poz: "grup",
  yazi_logo_baskin: "yazi-logo", hassas_simge: "simge", dusuk_kalite: "kalite", cinsiyet_ya_da_yas_uyumsuz: "cinsiyet-yas", yer_ya_da_kurum_uyumsuz: "yer-kurum", insan_ayirt_edilebilir: "insan",
};
export function vlDegerlendir(metin, { ozne = false } = {}) {
  const d = jsonAyikla(metin);
  if (!d) return { ok: false, neden: "vl yanıtı bozuk", kod: "bozuk" };
  // ozne=true: özne aramasından gelen aday; kabul = ozne_eslesiyor true + arşiv/çıplak/yazı-logo/hassas simge/düşük kalite false. İnsan ve yer alanları bu yolda engel DEĞİL.
  for (const [k, beklenen] of Object.entries(ozne ? VL_OZNE_BEKLENEN : VL_BEKLENEN)) {
    if (typeof d[k] !== "boolean") return { ok: false, neden: `vl alanı eksik: ${k}`, kod: "eksik-alan" };
    if (d[k] !== beklenen) return { ok: false, neden: VL_RED[k], kod: VL_KOD[k] || k };
  }
  return { ok: true, neden: "", gerekce: typeof d.kisa_gerekce === "string" ? d.kisa_gerekce.slice(0, 120) : "" };
}
export function vlSorusu(enBaslik, enOzet, genel, yerKurum = "") {
  const konu = `${genel ? "a generic stock image whose MAIN SUBJECT matches the subject area of" : "a photo that fits"} this good-news story: ${enBaslik} - ${String(enOzet).slice(0, 400)}`;
  return `Look at this image carefully. The goal: ${konu}
Be strict. Answer ONLY with JSON containing these fields (all boolean except the last):
{"konuya_uygun": true if the image plausibly illustrates the story: it shows the main subject OR a typical, representative scene of the story's topic (e.g. solar panels for a solar-energy story, a coral reef for a coral story, a telescope for an astronomy story, trees for a tree-planting story) and would not mislead a reader; false ONLY if it is unrelated to the topic, shows something that contradicts the story, or would mislead,
"siyah_beyaz_ya_da_arsiv": the photo is black-and-white, sepia, faded, or looks like an old archive/historic photograph,
"ciplak_ya_da_uygunsuz": shirtless people, people in underwear or swimwear, nudity or any inappropriate/suggestive content,
"taninabilir_yuz_baskin": a close-up, recognizable human face dominates the image,
"kisi_grubu_poz": a group of people posing for the camera,
"yazi_logo_baskin": readable text, poster, banner, watermark, screenshot or brand logo dominates,
"hassas_simge": any religious, political or ethnic symbol or flag is visible,
"dusuk_kalite": blurry, dark, tiny-subject or otherwise low quality,
"cinsiyet_ya_da_yas_uyumsuz": the story speaks of a specific group (e.g. women athletes, children, elderly) but the image clearly shows a different group,
"yer_ya_da_kurum_uyumsuz": the story concerns ${yerKurum ? `a specific place or institution (${yerKurum})` : "no specific place"}; true if the image clearly shows ANOTHER country, culture, school, institution or recognisable place instead (false when it is that place itself, or a neutral subject without any identifiable place such as an object, equipment, close-up, abstract, nature or animal; ALSO true when the image shows an identifiable university, school, lecture hall, stadium or other institution/city landmark that the story is not about),"insan_ayirt_edilebilir": distinguishable people (faces or clearly visible individuals, e.g. students in a classroom) or a distinctive identifiable location are visible,"kisa_gerekce": one short sentence}`;
}

// ---- ÖZNE görseli: haberin ADI GEÇEN öznesinin (kişi, takım, kurum, yapı, yer, eser, tür, gök cismi) Commons görseli.
// Kabul: dosya başlığı/kategorisi/açıklaması özne adını İÇERİR + lisans uygun + model "özne gerçekten bu" der. İnsan/yer burada engel değildir.
const katlaAd = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i");
const ADI_DURAK = new Set(["the", "of", "de", "da", "di", "del", "der", "van", "von", "and", "for", "la", "le", "el", "al", "fc", "cf", "sc", "ac", "an"]);
/** Metin (dosya başlığı + açıklama + kategoriler) özne adının kelimelerini taşıyor mu? 4+ kelimelik adlarda bir eksik tolere edilir. */
export function ozneAdiGeciyor(metin, ad) {
  const m = " " + katlaAd(metin).replace(/[^a-z0-9]+/g, " ") + " ";
  const kel = katlaAd(ad).split(/[^a-z0-9]+/).filter((k) => k.length >= 2 && !ADI_DURAK.has(k));
  if (!kel.length) return false;
  const bulunan = kel.filter((k) => m.includes(" " + k + " ")).length;
  return kel.length >= 4 ? bulunan >= kel.length - 1 : bulunan === kel.length;
}
// ---- Özne adı sadeleştirme: Commons'ta sponsorlu/uzun ad 0 aday verince kademeli arama ("Galatasaray Madeş Mobilya" -> "Galatasaray")
const SPONSOR_KELIME = new Set(["madeş", "madesh", "mobilya", "medicana", "tarfin", "sigorta", "sigortası", "bank", "bankası", "holding", "enerji", "otomotiv", "gıda", "yatırım", "telekom", "turkcell", "nef", "ülker", "ulker",
  "sofa", "petrol", "insurance", "energy", "motors", "furniture", "airlines", "havayolları", "a.ş.", "as", "inc", "ltd", "sponsor", "presented", "powered", "by"]);
const ETKINLIK_KELIME = /(?<![\p{L}])(summit|congress|conference|forum|symposium|workshop|ceremony|festival|awards?|meeting|expo|fair|convention|zirve\p{L}*|kongre\p{L}*|konferans\p{L}*|sempozyum\p{L}*|çalıştay\p{L}*|toplantı\p{L}*|tören\p{L}*|panel\p{L}*|etkinlik\p{L}*|fuar\p{L}*|buluşma\p{L}*|şenlik\p{L}*|günleri)(?![\p{L}])/iu;
const TAKIM_KELIME = /(?<![\p{L}])(fc|sc|sk|bk|fk|cf|team|club|women'?s|men'?s|basketball|volleyball|football|handball|spor|kulüb\p{L}*|takım\p{L}*|basketbol|voleybol|futbol|united|city|athletic)(?![\p{L}])/iu;
/** Etkinlik/toplantı/duyuru adı mı (zirve, kongre, festival, tören...). Bu adlar için kısaltılmış arama YAPILMAZ (ilk kelime "Türkiye" gibi yanlış görsel getirir). */
export const etkinlikAdiMi = (ad) => ETKINLIK_KELIME.test(String(ad || ""));
/** Takım/kulüp adı mı (logo değil stadyum/takım fotoğrafı tercih edilir). */
export const takimAdiMi = (ozne) => ozne?.tur === "kurum" && TAKIM_KELIME.test(String(ozne.ad || ""));
/** -> aranacak ad sırası (en çok 3): tam ad, sponsor/ek kelimeleri atılmış ad, (etkinlik değilse) ilk 1-2 özel ad kelimesi. */
export function ozneAdlari(ozne) {
  const ad = String(ozne?.ad || "").replace(/\s+/g, " ").trim();
  const sonuc = [ad];
  const kel = ad.split(" ");
  const temiz = kel.filter((k, i) => i === 0 || !SPONSOR_KELIME.has(k.toLocaleLowerCase("tr")));
  if (temiz.length && temiz.join(" ") !== ad) sonuc.push(temiz.join(" "));
  if (!etkinlikAdiMi(ad) && (ozne.tur === "kurum" || ozne.tur === "kisi") && kel.length >= 3) {
    const bas = ozne.tur === "kisi" ? kel.slice(-2).join(" ") : kel[0];   // kişide soyadıyla birlikte son iki kelime; kurumda ilk (ayırt edici) kelime
    if (bas.length >= 5 && !/^(türkiye|turkey|turkish|ankara|istanbul|national|international|world|dünya|ulusal|uluslararası)$/i.test(bas)) sonuc.push(bas);
  }
  return [...new Set(sonuc.map((x) => x.trim()).filter((x) => x.length >= 3))].slice(0, 3);
}

// ---- Nötr yoldan gelen görselin yeri haberle çelişmesin: Commons başlığı/açıklaması/kategorisi başka bir kurum/şehir/ülke adı taşıyorsa ve haberde geçmiyorsa RET.
const KURUM_KELIME = ["university", "college", "campus", "lecture hall", "auditorium", "school", "institute", "academy", "museum", "hospital", "stadium", "arena", "cathedral", "library", "observatory", "laboratory of", "ministry", "parliament", "embassy", "airport",
  "üniversite", "kampüs", "okul", "enstitü", "müze", "hastane", "stadyum"];
const YER_KELIME = ["turkey", "türkiye", "ankara", "istanbul", "izmir", "bursa", "antalya", "konya", "trabzon", "usa", "united states", "america", "california", "texas", "new york", "indiana", "indianapolis", "boston", "chicago", "washington", "seattle", "los angeles", "san francisco", "canada", "toronto", "vancouver", "montreal", "mexico", "brazil", "argentina", "chile", "peru", "colombia",
  "england", "london", "scotland", "wales", "ireland", "dublin", "france", "paris", "germany", "berlin", "munich", "italy", "rome", "milan", "spain", "madrid", "barcelona", "portugal", "lisbon", "netherlands", "amsterdam", "belgium", "brussels", "switzerland", "zurich", "geneva", "austria", "vienna", "sweden", "stockholm", "norway", "oslo", "denmark", "copenhagen", "finland", "helsinki", "poland", "warsaw", "czech", "prague", "hungary", "budapest", "greece", "athens", "romania", "bulgaria", "ukraine", "russia", "moscow",
  "china", "beijing", "shanghai", "hong kong", "japan", "tokyo", "osaka", "korea", "seoul", "india", "delhi", "mumbai", "pakistan", "bangladesh", "thailand", "bangkok", "vietnam", "indonesia", "singapore", "malaysia", "philippines", "australia", "sydney", "melbourne", "new zealand", "egypt", "cairo", "morocco", "nigeria", "kenya", "ethiopia", "south africa", "cape town", "israel", "iran", "iraq", "saudi", "dubai", "qatar", "azerbaijan", "baku", "georgia", "tbilisi"];
const listeRe = (l) => new RegExp("(?<![a-zçğıöşü])(?:" + l.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")(?![a-zçğıöşü])", "giu");
const KURUM_RE = listeRe(KURUM_KELIME), YER_RE = listeRe(YER_KELIME);
/**
 * Aday görselin Commons metni, haberde GEÇMEYEN bir kurum/şehir/ülke adı taşıyorsa o adı döner (çelişki), yoksa "".
 * haberMetni: EN başlık + özet + yer + yerKurum (+ TR başlık/özet). Yer adı taşımayan nötr görseller (doğa, nesne, gökyüzü, ekipman) geçer.
 */
export function yerCelisiyor(aday, haberMetni) {
  const h = String(haberMetni || "").toLowerCase();
  const m = String(aday.metin || "").toLowerCase();
  for (const re of [KURUM_RE, YER_RE]) {
    re.lastIndex = 0;
    for (const e of m.matchAll(re)) { if (!new RegExp("(?<![a-zçğıöşü])" + e[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![a-zçğıöşü])", "iu").test(h)) return e[0]; }
  }
  return "";
}
/** Etkinlik/toplantı/duyuru türü haber mi (başlıkta zirve, kongre, festival, tören...). */
export const etkinlikHaberiMi = (haber) => ETKINLIK_KELIME.test(`${haber.en?.baslik || ""} ${haber.tr?.baslik || ""}`);

const OZNE_ARSIV_KOD = new Set(["kisi", "tur"]);
const LOGO_RE = /(?<![a-z])(logo|crest|emblem|badge|coat of arms|wordmark|icon|kit|jersey|svg)(?![a-z])/i;
const TAKIM_FOTO_RE = /(stadium|arena|stadyum|team|squad|match|game|players|training|celebrat|crowd|fans)/i;   // eser/yer/kurum/nesne için eski çekim yılı doğal olabilir; siyah-beyazlığı model denetler
/** Özne aramasından gelen adaylardan kural tabanlı seçim (lisans + ad eşleşmesi + boyut + yasak kelime). -> en iyi n aday */
export function ozneSec(adaylar, ozne, n = 2) {
  const iyi = [];
  for (const a of adaylar) {
    if (!lisansOk(a.lisans) || !ozneAdiGeciyor(a.metin, ozne.ad)) continue;
    if (a.w && a.w < MIN_GENISLIK) continue;
    if (yasakliMi(`${a.metin} ${a.yaratici || ""}`)) continue;
    if (OZNE_ARSIV_KOD.has(ozne.tur) && arsivMi(a)) continue;
    if (ozne.tur === "kurum" && LOGO_RE.test(`${a.baslik || ""} ${a.metin}`)) continue;     // takım/kulüp/kurum için logo/arma/forma şablonu değil fotoğraf
    let p = 10;
    if (ozne.tur === "kurum" && TAKIM_FOTO_RE.test(`${a.baslik || ""} ${a.metin}`)) p += 6;  // stadyum/takım/maç fotoğrafı tercih
    if (ozneAdiGeciyor(a.baslik || "", ozne.ad)) p += 20;                          // ad dosya başlığında geçiyor: en güçlü işaret
    if (Number.isFinite(a.yil)) p += a.yil >= 2015 ? 5 : a.yil >= 2005 ? 2 : 0;    // yakın tarihli fotoğraf
    if (a.w >= 1200) p += 1;
    iyi.push([p, a]);
  }
  return iyi.sort((x, y) => y[0] - x[0]).slice(0, n).map((x) => x[1]);
}
const TUR_TARIF = { kisi: "a specific person", kurum: "a specific team or organisation (for a team or club: its players, a team or match photo, or its home stadium counts; a logo does not)", yer: "a specific place or building", eser: "a specific artwork or work", tur: "an animal or plant species", nesne: "a specific object such as a celestial body or spacecraft" };
export const VL_OZNE_BEKLENEN = { ozne_eslesiyor: true, siyah_beyaz_ya_da_arsiv: false, ciplak_ya_da_uygunsuz: false, yazi_logo_baskin: false, hassas_simge: false, dusuk_kalite: false };
export function vlOzneSorusu(ozne, aday, enBaslik, enOzet = "") {
  const tarif = TUR_TARIF[ozne.tur] || "the subject";
  return `Look at this image carefully. A news story is about ${ozne.ad} (${tarif}). Story: ${enBaslik} - ${String(enOzet).slice(0, 300)}
The image file is titled: ${String(aday.baslik || "").slice(0, 120)}
Answer ONLY with JSON containing these fields (all boolean except the last):
{"ozne_eslesiyor": true ONLY if the image really shows ${ozne.ad} itself (for a person: that very person, by the file title and visual plausibility such as the sport, stage or lab context; for a place, team, work or species: that very one); false if it shows someone or something else, only a crowd, a map or a document, or you cannot tell,
"siyah_beyaz_ya_da_arsiv": black-and-white, sepia, faded, or looks like an old archive photograph,
"ciplak_ya_da_uygunsuz": shirtless people, underwear or swimwear, nudity or any inappropriate/suggestive content,
"yazi_logo_baskin": readable text, poster, banner, watermark, screenshot or brand logo dominates,
"hassas_simge": any religious, political or ethnic symbol or flag is clearly visible,
"dusuk_kalite": blurry, dark, tiny-subject or otherwise low quality,
"kisa_gerekce": one short sentence}`;
}

/**
 * Haber için görsel bul. model: modelKur() nesnesi. Sıra (ilk uygun görselde durur):
 *  (1) ÖZNE: haberin ADI GEÇEN öznesi (haber.gorselOzne {ad, tur}); model vermediyse haberdeki yer/kurum adı (yerKurum) tur "yer" olarak yedek özne.
 *      Wikimedia Commons, bulunmazsa Openverse: dosya başlığı/etiketi özne adını içermeli, lisans uygun, model "ozne_eslesiyor" demeli (insan ve yer engel değil);
 *  (2) KONU (insansız, yersiz, nötr): modelin somut nesne terimi (gorselAra), yedek daha genel terim (gorselAra2): Commons -> Openverse; görsel denetimi;
 *  (3) Pixabay / Pexels (anahtar varsa) -> görsel denetimi;
 *  (4) hiçbiri olmazsa null: çağıran görselsiz yayınlar (istemci tasarım kartı gösterir). YANLIŞ GÖRSEL ASLA.
 * vlUst: bir haber için en çok kaç görsel denetim (model) çağrısı. butce: { openverse: {kalan, dur} } tur boyunca paylaşılır (hat.mjs).
 * araFn(q, tur): tur = "ozne" | "ozne_ov" | "gercek" | "gercek_ov" | "yedek" (testte taklit).
 * -> {sonuc:{gorsel:{sahibi, lisans, lisans_url, kaynak_url, saglayici}, b64, tur, ozne?:true}, notlar, retKodlari} ; retKodlari: { "n.konu": 2, "o.ozne-yok": 1 } (n = nötr yol, o = özne yolu)
 */
export async function gorselBul(haber, { model, pixabayAnahtar = "", pexelsAnahtar = "", fetchFn = fetch, bekleFn = dur, ustSinir = 2, araFn, vlUst = 4, butce = null, ovBelirtec = "" } = {}) {
  const notlar = [], retKodlari = {};
  const sonucla = (sonuc) => ({ sonuc, notlar, retKodlari });
  const en = haber.en;
  if (/[^\x00-\x7f]/.test(en.baslik.replace(/[‘’“”–—…]/g, ""))) return { sonuc: null, notlar: ["EN başlık Latin dışı"], retKodlari };
  const ovButce = butce?.openverse || { kalan: 6, dur: false };
  let vlSay = 0;
  const paketle = (a, dosya, ozne = false) => ({ gorsel: { sahibi: varlikCoz(a.yaratici).replace(/\s+/g, " ").trim().slice(0, 80), lisans: a.lisans, lisans_url: a.lisans_url, kaynak_url: a.kaynak_url, saglayici: a.saglayici }, b64: dosya.b64, tur: dosya.tur, ...(ozne ? { ozne: true } : {}) });
  const vlSor = async (dosya, soru, secenek) => {
    vlSay++;
    try {
      const y = await model.yaz(null, soru, { resim: { b64: dosya.b64, tur: dosya.tur }, azamiToken: 300, sicaklik: 0 });
      return vlDegerlendir(y.metin, secenek);
    } catch (e) { if (e instanceof KotaDoldu) throw e; return { ok: false, neden: "vl hatası", kod: "hata" }; }
  };
  const retSay = (yol, v) => { const k = `${yol}.${v.kod || "?"}`; retKodlari[k] = (retKodlari[k] || 0) + 1; };
  const ara = araFn || (async (q, tur) => {
    if (tur === "ozne" || tur === "gercek") return wikimediaAra(q, { fetchFn }).catch(() => []);
    if (tur === "ozne_ov" || tur === "gercek_ov") return openverseAra(q, { fetchFn, butce: ovButce, belirtec: ovBelirtec }).catch(() => []);
    return [...(await pixabayAra(q, pixabayAnahtar, { fetchFn }).catch(() => [])), ...(await pexelsAra(q, pexelsAnahtar, { fetchFn }).catch(() => []))];   // anahtarsız olan sessizce [] verir
  });

  // (1) özne görseli (model özne vermediyse yer/kurum adı yedek özne)
  const yerKurum = haber.yerKurum || "";
  const yedekOzne = !haber.gorselOzne?.ad && yerKurum.length >= 3 ? { ad: yerKurum, tur: "yer" } : null;
  const ozne = haber.gorselOzne?.ad ? haber.gorselOzne : yedekOzne;
  if (ozne?.ad && vlUst > 0) {
    const adlar = ozneAdlari(ozne);                          // tam ad -> sponsor/ek kelimesiz ad -> (etkinlik değilse) ayırt edici ilk ad
    for (const kaynak of ["ozne", "ozne_ov"]) {
      // vl hakkı: Commons en çok 2; Openverse yalnız 1 ve konu yoluna en az 1 hak kalacak şekilde
      if (kaynak === "ozne" ? vlSay >= Math.min(2, vlUst) : vlSay > vlUst - 2) break;
      let adaylar = [], toplam = 0, aranan = ozne, aramaSay = 0;
      const sorgulari = [];
      if (kaynak === "ozne") for (const ad of adlar) { sorgulari.push([ad, `"${ad}"`], [ad, ad]); if (takimAdiMi(ozne)) sorgulari.push([ad, `${ad} stadium`]); }
      else for (const ad of adlar.slice(0, 2)) sorgulari.push([ad, ad]);
      for (const [ad, q] of sorgulari) {                     // Commons en çok 6 arama, Openverse en çok 2; ilk uygun aday bulununca durur
        if (aramaSay >= (kaynak === "ozne" ? 6 : 2)) break;
        aramaSay++;
        const tum = await ara(q, kaynak);
        toplam += tum.length;
        aranan = { ...ozne, ad };
        adaylar = ozneSec(tum, aranan, 2);
        await bekleFn(kaynak === "ozne" ? 500 : 3200);       // Openverse anonim dakikada 20 istek
        if (adaylar.length) break;
      }
      notlar.push(`${kaynak}(${ozne.tur}${yedekOzne ? ",yer-yedek" : ""}): ${toplam} aday, ${adaylar.length} uygun${adlar.length > 1 && kaynak === "ozne" ? ` (${adlar.length} ad denendi)` : ""}`);
      const tavan = kaynak === "ozne" ? Math.min(2, vlUst) : vlSay + 1;
      for (const a of adaylar) {
        if (vlSay >= tavan) break;
        let dosya;
        try { dosya = await gorselIndir(a, { fetchFn }); } catch (e) { notlar.push(`indirilemedi:${String(e.message).slice(0, 30)}`); continue; }
        const v = await vlSor(dosya, vlOzneSorusu(aranan, a, en.baslik, en.ozet), { ozne: true });
        if (v.ok) return sonucla(paketle(a, dosya, true));
        retSay("o", v);
        notlar.push(`ozne vl ret:${v.neden}`);
      }
    }
  }

  // (2) nötr konu görseli: modelin verdiği somut nesne/mekân terimleri (kişi adı yok). Yoksa başlıktan türetilir.
  const terimler = (m) => String(m || "").split(" ").filter(Boolean);
  const nesne = terimler(haber.gorselAra), nesne2 = terimler(haber.gorselAra2);
  const baslikK0 = anahtarKelimeler(en.baslik), anahtarTum = anahtarKelimeler(en.baslik, en.ozet);
  const gruplar = [];   // her grup: kendi sorguları + kendi anahtar kelimeleri (adaylar kendi terimleriyle puanlanır)
  if (nesne.length) gruplar.push({ qler: [...new Set([nesne.join(" "), nesne.slice(0, 2).join(" "), nesne.slice(-2).join(" ")])].filter(Boolean), anahtar: nesne });
  if (nesne2.length && nesne2.join(" ") !== nesne.join(" ")) gruplar.push({ qler: [...new Set([nesne2.join(" "), nesne2.slice(0, 2).join(" ")])].filter(Boolean), anahtar: nesne2 });
  if (!gruplar.length && anahtarTum.length) gruplar.push({ qler: sorgular(en.baslik, en.ozet), anahtar: baslikK0.length ? baslikK0 : anahtarTum });
  if (!gruplar.length) return { sonuc: null, notlar: [...notlar, "arama terimi yok"], retKodlari };
  // (haberdeki yer/kurum model özne vermişse burada ayrıca "bina" olarak aranır; yedek özne olarak zaten arandıysa tekrarlanmaz)
  const yerAnahtar = yerKurum && !yedekOzne ? anahtarKelimeler(yerKurum) : [];   const yerQ = yerAnahtar.length ? [`${yerKurum} building`, yerKurum] : [];

  const etkinlik = etkinlikHaberiMi(haber);
  const yedekVar = !!(pixabayAnahtar || pexelsAnahtar || araFn);
  // stok anahtarı varsa genel konularda stok fotoğraf ÖNCE denenir (canlı ölçüm 2026-10-13: denetim hakkı Commons'ta tükeniyor, stok sıraya hiç giremiyordu)
  const sira = pixabayAnahtar ? ["yedek", "gercek", "gercek_ov"] : ["gercek", "gercek_ov", "yedek"];
  for (const tur of sira) {
    if (tur === "yedek" && (!yedekVar || etkinlik)) continue;
    if (tur === "gercek_ov" && etkinlik && !yerKurum) continue;
    if (vlSay >= vlUst) break;
    const qSayi = { gercek: 5, gercek_ov: 2, yedek: 3 }[tur];
    const goruldu = new Set(), yerTum = [], grupTum = gruplar.map(() => []);
    if (tur === "gercek") for (const q of (etkinlik && !yerKurum ? [] : yerQ)) { for (const a of await ara(q, tur)) if (!goruldu.has(a.url)) { goruldu.add(a.url); yerTum.push(a); } await bekleFn(500); }
    if (!etkinlik) for (let gi = 0; gi < gruplar.length; gi++) {
      for (const q of gruplar[gi].qler.slice(0, qSayi)) {
        for (const a of await ara(q, tur)) if (!goruldu.has(a.url)) { goruldu.add(a.url); grupTum[gi].push(a); }
        await bekleFn(tur === "gercek_ov" ? 3200 : 500);
        if (tur === "gercek_ov" && ovButce.dur) break;
      }
    }
    // Nötr nesne görseli haberin yeriyle çelişmesin: metin haberde geçmeyen kurum/şehir/ülke adı taşıyorsa elenir (yerTum zaten haberin kendi yeridir).
    const haberMetni = `${en.baslik} ${en.ozet} ${haber.tr?.baslik || ""} ${haber.tr?.ozet || ""} ${haber.yer || ""} ${yerKurum}`;
    let yerRet = 0, toplam = yerTum.length;
    const adaylar = [];
    if (yerAnahtar.length) adaylar.push(...sec(yerTum, yerAnahtar, ustSinir));
    // Etkinlik/toplantı/duyuru haberlerinde konu nesnesi görseli uydurulmaz: yalnız haberin kendi yeri/kurumu ya da özne görseli; yoksa görselsiz tasarım kartı.
    if (!etkinlik) for (let gi = 0; gi < gruplar.length; gi++) {
      toplam += grupTum[gi].length;
      const temiz = grupTum[gi].filter((a) => { const c = yerCelisiyor(a, haberMetni); if (c) yerRet++; return !c; });
      for (const a of sec(temiz, gruplar[gi].anahtar, ustSinir, tur === "yedek")) if (!adaylar.some((x) => x.url === a.url)) adaylar.push(a);
    }
    notlar.push(`${tur}: ${toplam} aday, ${adaylar.length} uygun${yerRet ? `, ${yerRet} yer çelişkisi` : ""}${etkinlik ? ", etkinlik haberi" : ""}`);
    for (const a of adaylar.slice(0, 3)) {
      if (vlSay >= vlUst) break;
      let dosya;
      try { dosya = await gorselIndir(a, { fetchFn }); } catch (e) { notlar.push(`indirilemedi:${String(e.message).slice(0, 30)}`); continue; }
      const v = await vlSor(dosya, vlSorusu(en.baslik, en.ozet, tur === "yedek", yerKurum));
      if (v.ok) return sonucla(paketle(a, dosya));
      retSay("n", v);
      notlar.push(`vl ret:${v.neden}`);
    }
  }
  return sonucla(null);
}
