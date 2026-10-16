// OP Astronomi hesabı (op_gokbilim; görünen ad 2026-10-16: OP Astronomi): (1) NASA APOD (resmî API; yalnız kamu malı görüntüler), (2) gökyüzü olayları: ay evreleri
// (ABD Deniz Gözlemevi resmî API'si, kamu malı veri). ESO / ESA-Hubble / NASA haber ve "Haftanın Fotoğrafı" beslemeleri ise
// kaynaklar.json üzerinden olağan haber hattından geçer (alan: gokbilim, hazır görsel, CC BY 4.0 atıf).
// Astroloji YOK. Olay tarih/saatleri yalnız doğrulanabilir kaynaktan (USNO) alınır; model uydurma saat yazamaz (metin şablonla üretilir).
import { createHash } from "node:crypto";
import { UA, duzMetin } from "./rss.mjs";
import { gorselIndir, lisansOk, sec, wikimediaAra, gorselBul } from "./gorsel.mjs";
import { haberYaz } from "./yaz.mjs";
import { haberKur, hazirGorselHazirla } from "./haber_yap.mjs";
import { onEleme, gorulenSinifi } from "./on_eleme.mjs";
import { kaynakMetni, sayfaEslesiyor } from "./sayfa.mjs";
import { EMOJI } from "./dogrula.mjs";

export const APOD_API = "https://api.nasa.gov/planetary/apod";
export const USNO_FAZ_API = "https://aa.usno.navy.mil/api/moon/phases/date";
const dur = (ms) => new Promise((r) => setTimeout(r, ms));

async function jsonIste(url, { fetchFn = fetch } = {}) {
  const r = await fetchFn(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
  if (r.status === 429) throw new Error("429");
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
const ozetKimligi = (anahtar) => createHash("sha256").update(`gokbilim|${anahtar}`).digest("hex");

// ---------- NASA APOD ----------
/** APOD yanıtı doğrulaması (saf). copyright doluysa, görüntü değilse, adres APOD görüntü dizininde değilse, yer tutucu yanıtsa ATLANIR. -> {ok, neden, kayit?} */
export function apodDogrula(j) {
  if (!j || typeof j !== "object") return { ok: false, neden: "yanıt yok" };
  if (j.media_type !== "image") return { ok: false, neden: "görüntü değil" };
  if (typeof j.copyright === "string" && j.copyright.trim()) return { ok: false, neden: "copyright alanı dolu (telifli olabilir)" };
  const url = String(j.url || "");
  // 2026-10 ölçümü: API yer tutucu yanıt verebiliyor (başlık "NASA Science", görsel NASA logosu). Gerçek APOD görselleri bu dizindedir.
  if (!/^https:\/\/apod\.nasa\.gov\/apod\/image\/[^\s]+\.(jpe?g|png)$/i.test(url)) return { ok: false, neden: "görsel adresi APOD görüntü dizininde değil (yer tutucu olabilir)" };
  if (/nasa-logo|^NASA Science$/i.test(`${url} ${j.title}`)) return { ok: false, neden: "yer tutucu" };
  const aciklama = String(j.explanation || "").replace(/Tomorrow's picture:.*$/is, "").replace(/\s+/g, " ").trim();
  if (aciklama.length < 200) return { ok: false, neden: "açıklama kısa" };
  if (/\b(ESO|ESA|JAXA|CSA|Roscosmos|CNSA|ISRO)\b/.test(`${j.title} ${aciklama}`)) return { ok: false, neden: "başka kurum görseli olabilir (lisans belirsiz)" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(j.date || ""))) return { ok: false, neden: "tarih yok" };
  return { ok: true, neden: "", kayit: { tarih: j.date, baslik: duzMetin(j.title, 150), aciklama: aciklama.slice(0, 1800), url } };
}
export const apodSayfa = (tarih) => `https://apod.nasa.gov/apod/ap${tarih.slice(2, 4)}${tarih.slice(5, 7)}${tarih.slice(8, 10)}.html`;

export async function apodGetir({ anahtar = "DEMO_KEY", fetchFn = fetch } = {}) {
  const p = new URLSearchParams({ api_key: anahtar });
  return jsonIste(`${APOD_API}?${p}`, { fetchFn });   // anahtar adreste gider (NASA API böyle ister); günlüğe adres yazılmaz
}

// ---------- ay evreleri (USNO) ----------
const FAZ = {
  "New Moon": { tr: "Yeni ay", en: "New Moon", emoji: "🌑", aratma: "new moon crescent night sky", aciklamaTr: "Yeni ayda Ay, Güneş ile Dünya arasında kalır ve aydınlık yüzü bize bakmadığı için gökyüzünde neredeyse görünmez.", aciklamaEn: "At new moon the Moon lies between the Sun and Earth, and because its lit side faces away from us it is almost invisible in the sky." },
  "First Quarter": { tr: "İlk dördün", en: "First Quarter", emoji: "🌓", aratma: "first quarter moon", aciklamaTr: "İlk dördünde Ay'ın yarısı aydınlık görünür ve Ay akşam saatlerinde gökyüzünde yüksekte durur.", aciklamaEn: "At first quarter half of the Moon appears lit and it stands high in the sky in the evening." },
  "Full Moon": { tr: "Dolunay", en: "Full Moon", emoji: "🌕", aratma: "full moon night sky", aciklamaTr: "Dolunayda Ay'ın bize bakan yüzü tamamen aydınlık görünür ve Ay gün batımı sıralarında doğar.", aciklamaEn: "At full moon the face of the Moon turned toward us appears fully lit, and the Moon rises around sunset." },
  "Last Quarter": { tr: "Son dördün", en: "Last Quarter", emoji: "🌗", aratma: "last quarter moon", aciklamaTr: "Son dördünde Ay'ın yarısı aydınlık görünür ve Ay sabaha doğru gökyüzünde yüksekte durur.", aciklamaEn: "At last quarter half of the Moon appears lit and it stands high in the sky toward morning." },
};
const AYLAR_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const AYLAR_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** USNO yanıtı -> [{faz, ms (UTC), yil, ay, gun, saat, dakika}] (bozuk kayıtlar atılır). */
export function fazlariAyristir(j) {
  const sonuc = [];
  for (const x of j?.phasedata || []) {
    const m = String(x.time || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!FAZ[x.phase] || !m || !Number.isInteger(x.year) || !Number.isInteger(x.month) || !Number.isInteger(x.day)) continue;
    const ms = Date.UTC(x.year, x.month - 1, x.day, +m[1], +m[2]);
    if (Number.isFinite(ms)) sonuc.push({ faz: x.phase, ms, yil: x.year, ay: x.month, gun: x.day, saat: +m[1], dakika: +m[2] });
  }
  return sonuc.sort((a, b) => a.ms - b.ms);
}
const iki = (n) => String(n).padStart(2, "0");
/** Paylaşım penceresi: evreye en çok 1 gün kala ya da evre gününde (UTC gün farkı 0 ya da 1). -> evre | null */
export function yaklasanFaz(fazlar, simdiMs) {
  const bugun = Math.floor(simdiMs / 86400000);
  return fazlar.find((f) => { const fark = Math.floor(f.ms / 86400000) - bugun; return fark === 0 || fark === 1; }) || null;
}
/** Evre gönderisi: metin ŞABLONLA üretilir (model yok), tarih/saat USNO verisinden; Türkiye saati = UTC+3. */
export function fazHaberi(f, sonrakiler, simdi) {
  const a = FAZ[f.faz], trMs = f.ms + 3 * 3600_000, tr = new Date(trMs);
  const trTarih = `${tr.getUTCDate()} ${AYLAR_TR[tr.getUTCMonth()]} ${tr.getUTCFullYear()}`, trSaat = `${iki(tr.getUTCHours())}:${iki(tr.getUTCMinutes())}`;
  const enTarih = `${AYLAR_EN[f.ay - 1]} ${f.gun}, ${f.yil}`, enSaat = `${iki(f.saat)}:${iki(f.dakika)}`;
  const ileri = sonrakiler.slice(0, 3);
  const sonrakiTr = ileri.map((s) => { const d = new Date(s.ms + 3 * 3600_000); return `${FAZ[s.faz].tr}: ${d.getUTCDate()} ${AYLAR_TR[d.getUTCMonth()]}`; }).join(", ");
  const sonrakiEn = ileri.map((s) => `${FAZ[s.faz].en}: ${AYLAR_EN[s.ay - 1]} ${s.gun}`).join(", ");
  const baslik = (n) => `${a[n]} · ${n === "tr" ? trTarih : enTarih}`;
  const kimlik = `g-ay-${f.yil}${iki(f.ay)}${iki(f.gun)}-${f.faz.toLowerCase().replace(/ /g, "-")}`;
  return {
    id: kimlik, kategori: "gokbilim", yer: "Dünya", kaynak: "U.S. Naval Observatory", link: "https://aa.usno.navy.mil/data/MoonPhases", zaman: new Date(simdi).toISOString(),
    model: "sablon", emoji: a.emoji, editor: "op_gokbilim", gorselAra: a.aratma,
    tr: { baslik: baslik("tr"), ozet: `${a.tr} ${trTarih} günü saat ${trSaat}'de (Türkiye saati) gerçekleşecek. ${a.aciklamaTr}${sonrakiTr ? ` Sonraki evreler: ${sonrakiTr}.` : ""} Evre zamanları ABD Deniz Gözlemevi verisinden alınmıştır.` },
    en: { baslik: baslik("en"), ozet: `${a.en} occurs on ${enTarih} at ${enSaat} UTC. ${a.aciklamaEn}${sonrakiEn ? ` Next phases: ${sonrakiEn}.` : ""} Phase times are from the U.S. Naval Observatory.` },
  };
}
export async function fazlariGetir({ simdi, fetchFn = fetch } = {}) {
  const t = new Date(simdi), tarih = `${t.getUTCFullYear()}-${iki(t.getUTCMonth() + 1)}-${iki(t.getUTCDate())}`;
  const p = new URLSearchParams({ date: tarih, nump: "6" });
  return fazlariAyristir(await jsonIste(`${USNO_FAZ_API}?${p}`, { fetchFn }));
}

/** Ay görseli: üretimde modelli görsel denetimi (gorselBul); kuru çalıştırmada yalnız lisans/konu süzgeci. */
async function ayGorseli(haber, { model, fetchFn, kuru }) {
  if (!kuru) { const g = await gorselBul({ ...haber, gorselAra: haber.gorselAra }, { model, fetchFn }); return g.sonuc; }
  const adaylar = sec(await wikimediaAra(haber.gorselAra, { fetchFn }), ["moon"], 1);
  const a = adaylar[0];
  return a ? { gorsel: { sahibi: a.yaratici, lisans: a.lisans, lisans_url: a.lisans_url, kaynak_url: a.kaynak_url, saglayici: a.saglayici }, b64: "(kuru)", tur: "image/jpeg" } : null;
}

const potwMi = (a) => /haftan|potw|picture of the week/i.test(`${a.kaynak} ${a.link}`);
/**
 * APOD çalışmadığında yedek: ESO "Haftanın Fotoğrafı" / ESA-Hubble / ESO haber beslemesindeki hazır lisanslı (CC BY 4.0, atıf) görsel + açıklama ile astronomi gönderisi.
 * adaylar: hattın ön elemeden geçirdiği güncel adaylar (hash alanlı). Aynı haber olağan haber döngüsünde ikinci kez yazılmasın diye kullanılan hash döner.
 * -> {durum:"yayinlandi"|"kuru"|"yok", neden, kayit?, kullanilan?:[hash], cagri, notlar}
 */
export async function gokbilimYedek({ adaylar = [], bulut, model, fetchFn = fetch, simdi = Date.now(), kuru = false, cagriHakki = 1, notlar = [], deneme = 3 }) {
  const hazir = adaylar.filter((a) => a.alan === "gokbilim" && a.hazirGorsel?.url && a.hash)
    .sort((x, y) => (potwMi(y) - potwMi(x)) || (Date.parse(y.zaman) - Date.parse(x.zaman)));
  if (!hazir.length) { notlar.push("yedek: hazır görselli güncel aday yok"); return { durum: "yok", neden: "yedek-yok", cagri: 0, notlar }; }
  let cagri = 0, neden = "yedek-yok", denenen = 0;
  for (const a of hazir) {
    if (denenen >= deneme) break;
    const e = onEleme(a, { simdi, tazelikSaat: 24 });
    if (!e.ok) continue;
    if (!kuru) { const k = (await bulut.bilinenler([a.hash])).get(a.hash); if (gorulenSinifi(k) === "atla") continue; }
    denenen++;
    if (kuru) {
      return { durum: "kuru", neden: "kuru", cagri, notlar, kayit: { tur: "gokbilim-yedek", kaynak: a.kaynak, link: a.link, baslik: a.baslik, gorsel: { sahibi: a.hazirGorsel.sahibi, lisans: a.hazirGorsel.lisans, kaynak_url: a.link, saglayici: "kaynak" } } };
    }
    if (cagri >= cagriHakki) { neden = "cagri-yok"; break; }
    let sayfa = "";
    try { const s = await kaynakMetni(a.link, { fetchFn, robotsOnbellek: new Map() }); sayfa = s.metin && sayfaEslesiyor(s.metin, a.baslik) ? s.metin : ""; } catch { /* özetle devam */ }
    const y = await haberYaz(model, a, sayfa, { cagriUst: cagriHakki - cagri });
    cagri += y.cagri || 0;
    if (y.durum !== "ok") { neden = "yedek-yazim-ret"; notlar.push(`yedek: yazım reddi (${y.neden})`); await bulut.isaretle([{ ozet: a.hash, durum: "elendi", neden: String(y.neden).slice(0, 100) }]).catch(() => {}); continue; }
    const g = await hazirGorselHazirla(a, { fetchFn, notlar });
    if (!g) { neden = "yedek-gorsel-yok"; continue; }
    const s = await bulut.yayinla(haberKur(a, y), a.hash, g);
    if (s.durum === "eklendi" || s.durum === "var") {
      await bulut.isaretle([{ ozet: a.hash, durum: "yayinlandi", neden: "gokbilim-yedek" }]).catch(() => {});
      return { durum: "yayinlandi", neden: "yayin", cagri, notlar, kullanilan: [a.hash], kayit: { tur: "gokbilim-yedek", kaynak: a.kaynak, link: a.link, gorsel: g.gorsel } };
    }
    neden = "yayin-red"; notlar.push(`yedek: yayın reddi (${s.neden || "?"})`);
    await bulut.isaretle([{ ozet: a.hash, durum: "elendi", neden: `yayin-red:${s.neden || "?"}` }]).catch(() => {});
  }
  return { durum: "yok", neden, cagri, notlar };
}

/**
 * Bir astronomi gönderisi: önce APOD, çalışmazsa kurumun hazır lisanslı görseli (ESO/ESA-Hubble yedeği), sonra yaklaşan ay evresi.
 * -> {durum:"yayinlandi"|"kuru"|"yok", neden, kayit?, kullanilan?, cagri, notlar}; neden = aşama kodları ("apod-hata/yedek-yok/ay-evre-yok" gibi, yalnız başarısız aşamalar).
 * kuru: model çağrısı ve yayın yok, seçilen kayıt döner. gorselsiz: ay evresi gönderisi lisanslı görsel bulunamazsa görselsiz yayınlanır (tasarım kartı).
 */
export async function gokbilimUret({ bulut, model, fetchFn = fetch, simdi = Date.now(), kuru = false, nasaAnahtar = "", cagriHakki = 3, bekleFn = dur, log = () => {}, adaylar = [], gorselsiz = false }) {
  const notlar = [], asamalar = [];
  let cagri = 0;
  const bitir = (o) => ({ ...o, neden: o.neden || asamalar.join("/") || "yok", cagri, notlar });
  // 1) APOD
  try {
    const j = await apodGetir({ anahtar: nasaAnahtar || "DEMO_KEY", fetchFn });
    const v = apodDogrula(j);
    if (!v.ok) { notlar.push(`apod: ${v.neden}`); asamalar.push(/yer tutucu|dizininde değil/.test(v.neden) ? "apod-yer-tutucu" : "apod-uygunsuz"); }
    else {
      const k = v.kayit, ozet = ozetKimligi(`apod-${k.tarih}`);
      const gorulen = kuru ? new Map() : await bulut.bilinenler([ozet]);
      if (gorulen.has(ozet)) { notlar.push("apod: bugünküsü zaten paylaşıldı"); asamalar.push("apod-paylasildi"); }
      else {
        let haber = { id: `g-apod-${k.tarih.replace(/-/g, "")}`, kategori: "gokbilim", yer: "Dünya", kaynak: "NASA APOD", link: apodSayfa(k.tarih), zaman: new Date(simdi).toISOString(), model: "gemini", emoji: EMOJI.gokbilim, editor: "op_gokbilim",
          tr: { baslik: k.baslik, ozet: "(kuru çalıştırma: özet taklit)" }, en: { baslik: k.baslik, ozet: k.aciklama.slice(0, 300) } };
        if (!kuru) {
          if (cagri >= cagriHakki) { notlar.push("apod: çağrı hakkı bitti"); asamalar.push("cagri-yok"); haber = null; }
          else {
            const y = await haberYaz(model, { baslik: k.baslik, ozet: k.aciklama.slice(0, 600), dil: "en", alan: "gokbilim" }, k.aciklama, { cagriUst: cagriHakki - cagri });
            cagri += y.cagri || 0;
            await bekleFn(1500);
            if (y.durum !== "ok") { notlar.push(`apod: yazım reddi (${y.neden})`); asamalar.push("apod-yazim-ret"); haber = null; }
            else haber = { ...haber, tr: y.haber.tr, en: y.haber.en, yer: y.haber.yer || "Dünya" };
          }
        }
        if (haber) {
          let gorsel;
          if (kuru) gorsel = { gorsel: { sahibi: "NASA / APOD", lisans: "Public Domain", lisans_url: "https://apod.nasa.gov/apod/lib/about_apod.html", kaynak_url: haber.link, saglayici: "nasa-apod" }, b64: "(kuru)", tur: "image/jpeg" };
          else {
            try {
              const d = await gorselIndir({ url: k.url, w: 0 }, { fetchFn });
              gorsel = { gorsel: { sahibi: "NASA / APOD", lisans: "Public Domain", lisans_url: "https://apod.nasa.gov/apod/lib/about_apod.html", kaynak_url: haber.link, saglayici: "nasa-apod" }, b64: d.b64, tur: d.tur };
            } catch (e) { notlar.push(`apod: görsel indirilemedi (${String(e.message).slice(0, 30)})`); asamalar.push("apod-gorsel-yok"); }
          }
          if (gorsel) {
            const kayit = { tur: "apod", baslik: haber.tr.baslik, link: haber.link, gorsel: gorsel.gorsel, ozetTr: haber.tr.ozet.slice(0, 200) };
            if (kuru) return bitir({ durum: "kuru", neden: "kuru", kayit });
            const s = await bulut.yayinla(haber, ozet, gorsel);
            if (s.durum === "eklendi" || s.durum === "var") return bitir({ durum: "yayinlandi", neden: "yayin", kayit });
            notlar.push(`apod: yayın reddi (${s.neden || "?"})`); asamalar.push("yayin-red");
          }
        }
      }
    }
  } catch (e) { notlar.push(`apod: ${String(e.message).slice(0, 40)}`); asamalar.push("apod-hata"); }
  // 2) yedek: kurumun kendi lisanslı görseli (ESO Haftanın Fotoğrafı / ESA-Hubble / ESO haberi)
  try {
    const yd = await gokbilimYedek({ adaylar, bulut, model, fetchFn, simdi, kuru, cagriHakki: cagriHakki - cagri, notlar });
    cagri += yd.cagri || 0;
    if (yd.durum === "kuru" || yd.durum === "yayinlandi") return bitir({ durum: yd.durum, neden: yd.neden, kayit: yd.kayit, kullanilan: yd.kullanilan });
    asamalar.push(yd.neden || "yedek-yok");
  } catch (e) { if (e?.constructor?.name === "KotaDoldu") throw e; notlar.push(`yedek: ${String(e.message).slice(0, 40)}`); asamalar.push("yedek-hata"); }
  // 3) ay evresi
  try {
    const fazlar = await fazlariGetir({ simdi, fetchFn });
    const f = yaklasanFaz(fazlar, simdi);
    if (!f) { notlar.push("ay: bugün/yarın evre yok"); asamalar.push("ay-evre-yok"); }
    else {
      const haber = fazHaberi(f, fazlar.filter((x) => x.ms > f.ms), simdi), ozet = ozetKimligi(haber.id);
      const gorulen = kuru ? new Map() : await bulut.bilinenler([ozet]);
      if (gorulen.has(ozet)) { notlar.push("ay: bu evre zaten paylaşıldı"); asamalar.push("ay-paylasildi"); }
      else {
        const gorsel = await ayGorseli(haber, { model, fetchFn, kuru }).catch((e) => { if (e?.constructor?.name === "KotaDoldu") throw e; notlar.push(`ay: görsel hatası (${String(e.message).slice(0, 30)})`); return null; });
        if (!gorsel && !gorselsiz) { notlar.push("ay: lisanslı görsel bulunamadı -> paylaşılmaz"); asamalar.push("ay-gorsel-yok"); }
        else {
          const kayit = { tur: "ay-evresi", baslik: haber.tr.baslik, ozetTr: haber.tr.ozet, kaynak: haber.link, gorsel: gorsel?.gorsel || null };
          if (kuru) return bitir({ durum: "kuru", neden: "kuru", kayit });
          const s = await bulut.yayinla(haber, ozet, gorsel);
          if (s.durum === "eklendi" || s.durum === "var") return bitir({ durum: "yayinlandi", neden: gorsel ? "yayin" : "yayin-gorselsiz", kayit });
          notlar.push(`ay: yayın reddi (${s.neden || "?"})`); asamalar.push("yayin-red");
        }
      }
    }
  } catch (e) { if (e?.constructor?.name === "KotaDoldu") throw e; notlar.push(`ay: ${String(e.message).slice(0, 40)}`); asamalar.push("ay-hata"); }
  return bitir({ durum: "yok" });
}
export { lisansOk };
