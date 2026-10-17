// MEKÂN ETKİNLİK TOPLAYICI (2026-10-17, sahip: "aktiviteler çok eksik; mekân listesini veriyorum").
// Mekânların KENDİ sitelerinden yalnız OLGUSAL etkinlik bilgisi: ad, tarih, saat, mekân, tür, sayfa adresi. Açıklama metni, görsel, fiyat ALINMAZ.
// Yöntem (güvenilirlik sırası): (1) schema.org Event JSON-LD, (2) sitenin iCal / RSS-Atom etkinlik akışı (olay tarihi AÇIKÇA alan olarak varsa), (3) yoksa mekân ATLANIR
// (serbest HTML kazıma ve model ile uydurma YOK). Bilet platformları (Biletix, Passo, Biletino, Bubilet...) ASLA kullanılmaz/izlenmez.
// Nezaket: robots.txt (Disallow ise okunmaz, Crawl-delay), özel User-Agent, istekler arası >= 2 sn, mekân başına günde en çok 1 tarama (en çok 3 sayfa), tur başına en çok 15 mekân, süre tavanı.
// Sunucu sözleşmesi: haber-yukle {islem:"etkinlik_toplu", etkinlikler:[...] (<=100)} -> {eklendi, guncellendi, atlandi}. Bu etkinlikler GÖNDERİ OLUŞTURMAZ.
import { createHash } from "node:crypto";
import { duzMetin, varlikCoz } from "./rss.mjs";
import { robotsIzin } from "./sayfa.mjs";
import { denetle } from "./moderasyon.mjs";
import { konuYasak } from "./on_eleme.mjs";
import { ETKINLIK_ILERI_GUN, ETKINLIK_SURE_UST, ETKINLIK_TURLERI, etkinlikYukuGecerli, konumGecerli, sehirKanonik, trGun, yerleriBul } from "./etkinlik.mjs";
import { durumOkuGuvenli, durumYazGuvenli } from "./mufredat.mjs";

export const MEKAN_UA = "OnlyPositiveEtkinlik/1.0 (+https://onlypositive.org/destek)";
export const MEKAN_ARALIK_MS = 2000;
export const MEKAN_TUR_UST = 15;
export const MEKAN_SAYFA_UST = 12;                   // mekân başına günde en çok sayfa (liste + site haritası + detay)
export const MEKAN_LISTE_UST = 3;                    // bunun içinde liste/akış sayfası en çok
export const MEKAN_ISTEK_UST = 100;                  // tur başına toplam istek tavanı (robots.txt dahil)
export const SERGI_SURE_UST = 365;                   // tür=sergi için bitiş <= başlangıç+365 (diğer türlerde 120)
export const MEKAN_SURE_SN = 240;
export const MEKAN_OLAY_UST = 40;                     // bir mekândan tur başına en çok
export const MEKAN_DURUM_ANAHTARI = "mekan:tarama";
const SAYFA_BAYT = 600_000;
const ROBOTS_AJANLAR = ["onlypositiveetkinlik", "onlypositivebot"];

/** Bilet platformları: otomatik toplanmaz, bağlantı izlenmez, etkinlik adresi olarak kullanılmaz. */
export const BILET_ALANLARI = /(?:^|\.)(?:biletix\.com|passo\.com\.tr|biletino\.com|bubilet\.com(?:\.tr)?|biletinial\.com|mobilet\.com|eventbrite\.[a-z.]+|tickettr\.com|biletbayi\.com|bilet\.com)$/i;
export const biletMi = (url) => { try { return BILET_ALANLARI.test(new URL(url).hostname); } catch { return false; } };

export const katlaAd = (t) => String(t ?? "").toLocaleLowerCase("tr").normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
const siteKok = (url) => { try { return new URL(url).hostname.replace(/^www\./i, "").toLowerCase(); } catch { return ""; } };
const aynıHost = (a, b) => { const x = siteKok(a), y = siteKok(b); return !!x && x === y; };
const aynıSite = (a, b) => { const x = siteKok(a), y = siteKok(b); return !!x && !!y && (x === y || x.endsWith("." + y) || y.endsWith("." + x)); };
const httpsYap = (url) => { try { const u = new URL(url); if (u.protocol === "http:") u.protocol = "https:"; return u.protocol === "https:" ? u.toString() : ""; } catch { return ""; } };

// ---------------------------------------------------------------- tarih çözümü
const pad = (n) => String(n).padStart(2, "0");
/**
 * ISO benzeri değer -> { gun: "YYYY-MM-DD", saat: "HH:MM"|"" } (Türkiye saatine göre). Ofset/Z varsa dönüştürülür, yoksa yazıldığı gibi alınır. Geçersiz: null.
 */
export function tarihCoz(ham) {
  const s = String(ham ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/);
  if (!m) return null;
  const [y, a, g] = [+m[1], +m[2], +m[3]];
  const d = new Date(Date.UTC(y, a - 1, g));
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== a - 1 || d.getUTCDate() !== g) return null;
  if (m[4] === undefined) return { gun: `${m[1]}-${m[2]}-${m[3]}`, saat: "" };
  let hh = +m[4], mm = +m[5];
  if (hh > 23 || mm > 59) return null;
  let gun = `${m[1]}-${m[2]}-${m[3]}`;
  if (m[7]) {
    const t = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || "00"}${m[7] === "Z" ? "Z" : m[7].length === 5 ? m[7].slice(0, 3) + ":" + m[7].slice(3) : m[7]}`);
    if (!Number.isFinite(t)) return null;
    const tr = new Date(t + 3 * 3600_000);
    gun = tr.toISOString().slice(0, 10); hh = tr.getUTCHours(); mm = tr.getUTCMinutes();
  }
  return { gun, saat: hh === 0 && mm === 0 ? "" : `${pad(hh)}:${pad(mm)}` };
}
const gunNo = (s) => Math.floor(Date.parse(s + "T00:00:00Z") / 86400000);
const gunEkle = (s, n) => new Date(Date.parse(s + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

// ---------------------------------------------------------------- (1) JSON-LD
const OLAY_TIP = /(?:Event|^Festival|^CourseInstance)$/;
const tipler = (n) => [].concat(n?.["@type"] ?? []).map(String);
const tur_de_olay = (n) => tipler(n).some((t) => OLAY_TIP.test(t.replace(/^.*[/#]/, "")));
const metinDeger = (v) => (typeof v === "string" ? v : v && typeof v === "object" ? (typeof v["@value"] === "string" ? v["@value"] : typeof v.name === "string" ? v.name : "") : "");

function jsonlddenOlaylar(dugum, cikti, derin = 0) {
  if (!dugum || typeof dugum !== "object" || derin > 8 || cikti.length > 400) return;
  if (Array.isArray(dugum)) { for (const x of dugum) jsonlddenOlaylar(x, cikti, derin + 1); return; }
  if (tur_de_olay(dugum)) {
    const loc = [].concat(dugum.location ?? [])[0];
    const adr = loc && typeof loc === "object" ? loc.address : null;
    const adrMetni = typeof adr === "string" ? adr : adr && typeof adr === "object" ? [adr.addressLocality, adr.addressRegion, adr.streetAddress].filter((x) => typeof x === "string").join(" ") : "";
    const ulke = adr && typeof adr === "object" ? metinDeger(adr.addressCountry) : "";
    const mod = metinDeger(dugum.eventAttendanceMode), durum = metinDeger(dugum.eventStatus);
    cikti.push({
      ad: metinDeger(dugum.name), baslangic: metinDeger(dugum.startDate), bitis: metinDeger(dugum.endDate), url: metinDeger(dugum.url),
      konumAd: loc && typeof loc === "object" ? metinDeger(loc.name) : (typeof loc === "string" ? loc : ""), konumAdres: adrMetni, ulke,
      tip: tipler(dugum).join(","), iptal: /Cancel|Postpone/i.test(durum), cevrimici: /Online/i.test(mod) && !/Mixed/i.test(mod), tekrar: false,
    });
  }
  for (const k of ["@graph", "itemListElement", "item", "subEvent", "event", "events", "mainEntity", "mainEntityOfPage", "hasPart"]) if (dugum[k] && typeof dugum[k] === "object") jsonlddenOlaylar(dugum[k], cikti, derin + 1);
}
/** HTML'deki application/ld+json bloklarından Event düğümleri (ham). */
export function jsonldEtkinlikler(html) {
  const cikti = [];
  for (const m of String(html ?? "").matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    const ham = m[1].replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, "").replace(/[\u0000-\u001f]+/g, " ").trim();
    try { jsonlddenOlaylar(JSON.parse(ham), cikti); } catch { /* bozuk blok: atla */ }
  }
  return cikti;
}

// ---------------------------------------------------------------- (2a) iCal
function icalIcDegerler(metin) {
  const satirlar = String(metin ?? "").replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const olaylar = []; let o = null;
  for (const s of satirlar) {
    if (/^BEGIN:VEVENT/i.test(s)) { o = {}; continue; }
    if (/^END:VEVENT/i.test(s)) { if (o) olaylar.push(o); o = null; continue; }
    if (!o) continue;
    const m = s.match(/^([A-Za-z-]+)((?:;[^:]*)*):(.*)$/);
    if (m) o[m[1].toUpperCase()] = { deger: m[3], param: m[2] };
  }
  return olaylar;
}
const icalCoz = (v) => String(v ?? "").replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
function icalTarih(d) {
  if (!d) return null;
  const m = String(d.deger).trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  return m[4] === undefined ? `${m[1]}-${m[2]}-${m[3]}` : `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || "00"}${m[7] ? "Z" : ""}`;
}
/** iCal metni -> ham olaylar. RRULE'lü (tekrarlayan) olaylar GENİŞLETİLMEZ: atlanır. Gün-bütünü DTEND'i özeldir (dahil değil). */
export function icalEtkinlikler(metin) {
  const r = [];
  for (const o of icalIcDegerler(metin)) {
    if (o.RRULE) continue;
    const bas = icalTarih(o.DTSTART), tamGun = !!bas && !bas.includes("T");
    let bit = icalTarih(o.DTEND);
    if (bit && tamGun && !bit.includes("T")) bit = gunEkle(bit, -1);
    r.push({ ad: icalCoz(o.SUMMARY?.deger), baslangic: bas || "", bitis: bit || "", url: icalCoz(o.URL?.deger), konumAd: icalCoz(o.LOCATION?.deger), konumAdres: icalCoz(o.LOCATION?.deger), ulke: "", tip: "ical",
      iptal: /CANCEL/i.test(o.STATUS?.deger || ""), cevrimici: false, tekrar: false });
  }
  return r;
}

// ---------------------------------------------------------------- (2b) RSS / Atom: yalnız AÇIK olay-tarihi alanı olan öğeler (yayın tarihi olay tarihi DEĞİLDİR)
const BAS_ALAN = /^(?:[a-z0-9]+:)?(?:startdate|start_date|dtstart|eventstart|eventstartdate|event_start|begindate)$/i;
const BIT_ALAN = /^(?:[a-z0-9]+:)?(?:enddate|end_date|dtend|eventend|eventenddate|event_end)$/i;
const BAGLANTI_ZORUNLU = /^(?:[a-z0-9]+:)?(?:link|guid)$/i;
export function feedEtkinlikler(xml) {
  const r = [];
  for (const m of String(xml ?? "").matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const blok = m[2], alanlar = {};
    for (const e of blok.matchAll(/<([a-z0-9]+(?::[a-z0-9_-]+)?)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/gi)) (alanlar[e[1]] ??= []).push({ param: e[2], icerik: e[3] ?? "" });
    const al = (re) => { for (const [k, v] of Object.entries(alanlar)) if (re.test(k)) return duzMetin(v[0].icerik, 80); return ""; };
    const bas = al(BAS_ALAN), bit = al(BIT_ALAN);
    if (!bas) continue;
    let link = "";
    for (const [k, v] of Object.entries(alanlar)) if (/^link$/i.test(k)) { const h = v[0].param.match(/href\s*=\s*["']([^"']+)["']/i); link = h ? h[1] : duzMetin(v[0].icerik, 300); break; }
    if (!link) for (const [k, v] of Object.entries(alanlar)) if (BAGLANTI_ZORUNLU.test(k) && /^https?:/i.test(duzMetin(v[0].icerik, 300))) { link = duzMetin(v[0].icerik, 300); break; }
    const normal = (d) => { const z = d.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3"); return z; };
    r.push({ ad: duzMetin(alanlar.title?.[0]?.icerik ?? "", 200), baslangic: normal(bas), bitis: normal(bit), url: link, konumAd: "", konumAdres: "", ulke: "", tip: "rss", iptal: false, cevrimici: false, tekrar: false });
  }
  return r;
}

// ---------------------------------------------------------------- tür sınıflama (ad, şema tipi, mekân kategorisi)
const TUR_AD = {
  festival: /festival|şenlik|fest\b/i,
  sergi: /sergi|exhibition|retrospektif/i,
  tiyatro: /tiyatro|oyunu|oyun\b|bale\b|opera\b|müzikal|musical|sahne|dans\b|gösteri|stand-?up|komedi/i,
  konser: /konser|concert|recital|resital|orkestra|senfoni|caz\b|jazz|canlı müzik|live\b|şef\b|koro\b|akustik/i,
  soylesi: /söyleşi|soylesi|panel|konferans|imza günü|buluşma|sohbet|kitap|talk\b|lecture|film gösterimi|gösterim/i,
  atolye: /atölye|atolye|workshop|eğitim|masterclass|çocuk atölye/i,
  spor: /koşu|maraton|turnuva|yarış|bisiklet|yüzme|futbol|basketbol|voleybol|spor\b|triatlon/i,
};
const TUR_SIRA = ["festival", "sergi", "atolye", "soylesi", "tiyatro", "konser", "spor"];
const TUR_TIP = [[/ExhibitionEvent|VisualArtsEvent/, "sergi"], [/TheaterEvent|DanceEvent|ComedyEvent/, "tiyatro"], [/MusicEvent/, "konser"], [/Festival/, "festival"], [/EducationEvent|CourseInstance/, "atolye"], [/SportsEvent/, "spor"], [/LiteraryEvent/, "soylesi"]];
const TUR_KATEGORI = [[/festival/i, "festival"], [/sergi|galeri|müze|çağdaş sanat/i, "sergi"], [/tiyatro|opera|bale|gösteri|sahne/i, "tiyatro"], [/konser|müzik|caz|rock|elektronik/i, "konser"]];
/** Önce AD, sonra şema tipi, en son mekân kategorisi. */
export function turSinifla(ad, tip, kategori) {
  for (const t of TUR_SIRA) if (TUR_AD[t].test(ad)) return t;
  for (const [re, t] of TUR_TIP) if (re.test(tip || "")) return t;
  for (const [re, t] of TUR_KATEGORI) if (re.test(kategori || "")) return t;
  return "diger";
}

// ---------------------------------------------------------------- doğrulama
const CEVRIMICI = /çevrimiçi|çevrim içi|\bonline\b|webinar|canlı yayın|livestream|zoom\b|sanal\b|virtual/i;
export const kaynakKimligi = (mekanId, url, baslangic) => createHash("sha1").update(`${mekanId}|${url}|${baslangic}`).digest("hex").slice(0, 16);

/**
 * Ham olay -> { etkinlik|null, neden }. mekan: mekanlar.json kaydı. sayfaUrl: olayın bulunduğu sayfa (yedek adres). simdi: ms.
 * Kurallar: tarih bugünden itibaren <= 60 gün, bitiş >= bugün, ad 2-120, din/siyaset/şiddet konu kapıları, Türkiye dışı ret, çevrimiçi/iptal ret.
 */
export function mekanOlayiDogrula(ham, mekan, sayfaUrl, simdi = Date.now()) {
  const ret = (neden) => ({ etkinlik: null, neden });
  if (!ham || typeof ham !== "object") return ret("bicim");
  if (ham.iptal) return ret("iptal");
  if (ham.cevrimici) return ret("cevrimici");
  const ad = duzMetin(ham.ad, 300).replace(/^["“”'‘’]+|["“”'‘’]+$/g, "").trim();
  if (ad.length < 2 || ad.length > 120 || /https?:\/\/|www\.|\p{Extended_Pictographic}/u.test(ad)) return ret("ad");
  if (CEVRIMICI.test(ad)) return ret("cevrimici");
  if (!denetle(ad).ok || konuYasak(ad).length) return ret("konu");
  const b = tarihCoz(ham.baslangic), e = ham.bitis ? tarihCoz(ham.bitis) : null;
  if (!b) return ret("tarih");
  const bugun = trGun(simdi);
  let bitis = e && e.gun > b.gun ? e.gun : "";
  if (e && e.gun < b.gun) return ret("tarih");
  const etkinBitis = bitis || b.gun;
  if (etkinBitis < bugun) return ret("gecmis");
  if (gunNo(b.gun) - gunNo(bugun) > ETKINLIK_ILERI_GUN) return ret("cok-ileri");
  // Türkiye dışı + şehir
  if (ham.ulke && !/^(?:tr|tur|türkiye|turkiye|turkey)$/i.test(String(ham.ulke).trim())) return ret("ulke");
  const adresIl = ham.konumAdres || ham.konumAd ? [...new Set(yerleriBul(`${ham.konumAdres} ${ham.konumAd}`).map((y) => y.il))] : [];
  let sehir = mekan.il && !/Türkiye/.test(mekan.il) ? sehirKanonik(mekan.il) : "";
  const baskaHost = !aynıHost(sayfaUrl, mekan.web);       // yönlendirme/alt alan = başka şube olabilir: şehir kanıtı ŞART
  if (sehir) { if ((adresIl.length || baskaHost) && !adresIl.includes(sehir)) return ret("sehir"); }
  else { if (adresIl.length !== 1) return ret("sehir"); sehir = adresIl[0]; }
  if (!sehir) return ret("sehir");
  const mekanAdi = String(mekan.ad || "").slice(0, 80), mekanUrl = httpsYap(mekan.web);
  let url = httpsYap(ham.url ? safeUrl(ham.url, sayfaUrl) : "");
  if (!url || biletMi(url) || !aynıSite(url, mekan.web)) url = httpsYap(sayfaUrl);
  if (!url || biletMi(url)) return ret("url");
  const saat = b.saat && /^([01]\d|2[0-3]):[0-5]\d$/.test(b.saat) ? b.saat : "";
  const tur = turSinifla(ad, ham.tip, mekan.kategori);
  if (bitis && gunNo(bitis) - gunNo(b.gun) > (tur === "sergi" ? SERGI_SURE_UST : ETKINLIK_SURE_UST)) return ret("uzun");
  const etkinlik = {
    kaynak_id: kaynakKimligi(mekan.id, url, b.gun), ad, sehir, mekan: mekanAdi, ...(mekanUrl ? { mekan_url: mekanUrl } : {}), url, baslangic: b.gun,
    ...(bitis ? { bitis } : {}), ...(saat ? { saat } : {}), tur: ETKINLIK_TURLERI.includes(tur) ? tur : "diger",
  };
  const k = mekan.koordinat;
  if (k && konumGecerli({ enlem: k.enlem, boylam: k.boylam, kesin: true })) etkinlik.konum = { enlem: k.enlem, boylam: k.boylam, kesin: true };
  // sunucu sözleşmesi: sergide bitiş 365 güne kadar (ortak yük denetimi 120 günde keser: uzun sergi için bitişsiz kopyayla biçim denetlenir)
  const uzunSergi = etkinlik.bitis && gunNo(etkinlik.bitis) - gunNo(etkinlik.baslangic) > ETKINLIK_SURE_UST;
  if (!etkinlikYukuGecerli(uzunSergi ? { ...etkinlik, bitis: undefined } : etkinlik)) return ret("yuk");
  return { etkinlik, neden: "" };
}
function safeUrl(u, taban) { try { return new URL(u, taban).toString(); } catch { return ""; } }

/** Etkinlik listesi -> yük parçaları (<=100). Aynı kaynak_id tek kez. */
export function topluYukler(liste, parca = 100) {
  const g = new Set(), t = [];
  for (const e of liste) if (!g.has(e.kaynak_id)) { g.add(e.kaynak_id); t.push(e); }
  const r = [];
  for (let i = 0; i < t.length; i += parca) r.push({ islem: "etkinlik_toplu", etkinlikler: t.slice(i, i + parca) });
  return r;
}

// ---------------------------------------------------------------- nazik ağ: robots.txt, UA, >=2 sn aralık, boyut sınırı
function crawlDelay(robots) {
  const satirlar = String(robots || "").split(/\r?\n/).map((s) => s.replace(/#.*/, "").trim());
  let ben = false, d = null;
  for (const s of satirlar) {
    const m = s.match(/^([a-z-]+)\s*:\s*(.*)$/i); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim().toLowerCase();
    if (k === "user-agent") ben = v === "*" || ROBOTS_AJANLAR.includes(v);
    else if (k === "crawl-delay" && ben && Number.isFinite(parseFloat(v))) d = Math.max(d ?? 0, parseFloat(v));
  }
  return d;
}
export function agKur({ fetchFn = fetch, bekleFn = (ms) => new Promise((r) => setTimeout(r, ms)), simdi = () => Date.now(), aralikMs = MEKAN_ARALIK_MS, log = () => {} } = {}) {
  const aralik = Math.max(MEKAN_ARALIK_MS, aralikMs);
  const robots = new Map();               // origin -> { metin, gecikmeMs }
  let son = -Infinity, istek = 0;
  async function bekle(ekMs = 0) {
    const gerek = Math.max(aralik, ekMs) - (simdi() - son);
    if (gerek > 0 && son !== -Infinity) await bekleFn(gerek);
    son = simdi();
  }
  async function ham(url, kabul) {
    await bekle(); istek++;
    const r = await fetchFn(url, { headers: { "User-Agent": MEKAN_UA, Accept: kabul }, redirect: "follow", signal: AbortSignal.timeout(12000) });
    if (r.url && !aynıSite(r.url, url)) throw new Error("baska-site");          // yönlendirme başka siteye: robots.txt'si denetlenmedi, kullanılmaz
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const tur = r.headers?.get?.("content-type") || "";
    const b = new Uint8Array(await r.arrayBuffer());
    return { metin: new TextDecoder("utf-8").decode(b.subarray(0, SAYFA_BAYT)), tur, url: r.url || url };
  }
  /** -> { metin, tur, url } | { yok: "robots"|"bilet"|"hata:..." } . Hata atmaz. Robots önbellekli (tur başına origin başına 1). */
  async function getir(url, kabul = "text/html,application/xhtml+xml,text/calendar,application/rss+xml,application/atom+xml,application/xml;q=0.9,*/*;q=0.5") {
    let u; try { u = new URL(url); } catch { return { yok: "hata:url" }; }
    if (!/^https?:$/.test(u.protocol)) return { yok: "hata:url" };
    if (biletMi(url)) return { yok: "bilet" };
    try {
      if (!robots.has(u.origin)) {
        let metin = "";
        try { metin = (await ham(u.origin + "/robots.txt", "text/plain")).metin; } catch { metin = ""; }   // robots.txt yoksa/okunamazsa kısıt yok sayılır (standart)
        robots.set(u.origin, { metin, gecikmeMs: (crawlDelay(metin) ?? 0) * 1000 });
      }
      const rb = robots.get(u.origin);
      if (!robotsIzin(rb.metin, u.pathname + u.search, ROBOTS_AJANLAR)) return { yok: "robots" };
      if (rb.gecikmeMs > 10_000) return { yok: "robots-gecikme" };
      if (rb.gecikmeMs > aralik) await bekle(rb.gecikmeMs);
      const s = await ham(url, kabul);
      return s;
    } catch (e) { return { yok: `hata:${String(e.cause?.code || e.message || e).slice(0, 30)}` }; }
  }
  /** Sitenin site haritası adresleri: robots.txt'teki Sitemap satırları (aynı host), yoksa /sitemap.xml. */
  async function siteHaritalari(origin) {
    if (!robots.has(origin)) await getir(origin + "/robots.txt").catch(() => null);
    const metin = robots.get(origin)?.metin || "";
    const l = [...metin.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((x) => x[1]).filter((u) => aynıHost(u, origin) && !/\.gz(?:$|\?)/i.test(u));
    return l.length ? l : [origin + "/sitemap.xml"];
  }
  return { getir, siteHaritalari, istekSayisi: () => istek };
}

// ---------------------------------------------------------------- sayfadan ham olay (sayfa türüne göre)
function sayfaOlaylari(s) {
  const govde = s.metin || "";
  if (/^\s*BEGIN:VCALENDAR/im.test(govde.slice(0, 2000))) return { yontem: "ical", olaylar: icalEtkinlikler(govde) };
  if (/<(?:rss|feed)\b/i.test(govde.slice(0, 2000)) || /xml/i.test(s.tur || "") && /<(?:item|entry)\b/i.test(govde)) return { yontem: "rss", olaylar: feedEtkinlikler(govde) };
  return { yontem: "jsonld", olaylar: jsonldEtkinlikler(govde) };
}
const GECERSIZ_ADRES = /\.(?:jpe?g|png|gif|webp|svg|pdf|zip|docx?|xlsx?|mp[34]|css|js)(?:$|\?)/i;
const ADAY_DESEN = /etkinlik|takvim|program|events?\b|calendar|whats-?on|sergi|konser|oyun|repertuvar|faaliyet|exhibition|schedule|agenda|sahne|seans|yaklasan|yaklaşan|upcoming|bu-?ay|ajanda/i;
/** Ana sayfadan: ayni siteye giden, etkinlik izi taşıyan bağlantılar (en iyi önce) + alternatif takvim/akış bağlantıları. */
export function adayBaglantilar(html, tabanUrl) {
  const akislar = [], sayfalar = new Map();
  for (const m of String(html ?? "").matchAll(/<link\b[^>]*>/gi)) {
    const t = m[0];
    if (/rel\s*=\s*["']?alternate/i.test(t) && /type\s*=\s*["']?(?:text\/calendar|application\/rss\+xml|application\/atom\+xml)/i.test(t)) {
      const h = t.match(/href\s*=\s*["']([^"']+)["']/i); const u = h && safeUrl(h[1], tabanUrl);
      if (u && aynıHost(u, tabanUrl) && !biletMi(u)) akislar.push(u);
    }
  }
  for (const m of String(html ?? "").matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
    const u = safeUrl(m[1].replace(/&amp;/g, "&"), tabanUrl);
    if (!u || !/^https?:/.test(u) || biletMi(u) || !aynıHost(u, tabanUrl) || GECERSIZ_ADRES.test(u)) continue;
    if (/\.ics(?:$|\?)/i.test(u)) { akislar.push(u); continue; }
    const yol = new URL(u).pathname + new URL(u).search, etiket = duzMetin(m[2], 80);
    if (yol === "/" || yol === new URL(tabanUrl).pathname) continue;
    const puan = (ADAY_DESEN.test(yol) ? 2 : 0) + (ADAY_DESEN.test(etiket) ? 1 : 0);
    if (puan > 0) sayfalar.set(u, Math.max(sayfalar.get(u) || 0, puan - Math.min(1, yol.split("/").length / 10)));
  }
  const sirali = [...sayfalar.entries()].sort((a, b) => b[1] - a[1]).map(([u]) => u);
  return { akislar: [...new Set(akislar)], sayfalar: sirali };
}

/** Site haritası XML'i -> { altlar: [{loc,lastmod}], url: [{loc,lastmod}] } (sitemapindex ve urlset). */
export function siteHaritasiAyristir(xml) {
  const oku = (blok) => { const loc = blok.match(/<loc>\s*([^<]+?)\s*<\/loc>/i), lm = blok.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/i); return loc ? { loc: varlikCoz(loc[1]).trim(), lastmod: lm ? lm[1].trim() : "" } : null; };
  const r = { altlar: [], url: [] };
  for (const m of String(xml ?? "").matchAll(/<sitemap\b[^>]*>([\s\S]*?)<\/sitemap>/gi)) { const e = oku(m[1]); if (e) r.altlar.push(e); }
  for (const m of String(xml ?? "").matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/gi)) { const e = oku(m[1]); if (e) r.url.push(e); }
  return r;
}
// Etkinlik DETAY sayfası adresi: yol içinde etkinlik sözcüğü + ardından bir ad/kimlik parçası (kategori, sayfalama, arşiv listeleri hariç)
const DETAY_DESEN = /\/(?:etkinlik(?:ler)?|events?|sergi(?:ler)?|oyun(?:lar)?|konser(?:ler)?|performans(?:lar)?|gosteri(?:ler)?|gösteri(?:ler)?|seans(?:lar)?|festival(?:ler)?|atolye(?:ler)?|atölye(?:ler)?|soylesi|söyleşi|exhibitions?|whats-?on|program|repertuvar)\/[^/?#]+/i;
const DETAY_HARIC = /\/(?:kategori|category|tag|etiket|page|sayfa|arsiv|archive|gecmis|geçmiş|feed|amp)(?:\/|$)|[?&](?:page|paged|sayfa)=/i;
const SITEMAP_ETKINLIK = /etkinlik|event|sergi|program|oyun|konser|sanat|performans|post|page/i;
const detayMi = (u) => { try { const x = new URL(u); return DETAY_DESEN.test(x.pathname) && !DETAY_HARIC.test(x.pathname + x.search) && !GECERSIZ_ADRES.test(x.pathname); } catch { return false; } };
/** Liste sayfasındaki etkinlik DETAY bağlantıları (görünme sırası korunur; aynı host; bilet platformu yok). */
export function detayBaglantilar(html, tabanUrl) {
  const s = new Set();
  for (const m of String(html ?? "").matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["']/gi)) {
    const u = safeUrl(m[1].replace(/&amp;/g, "&"), tabanUrl);
    if (u && /^https?:/.test(u) && !biletMi(u) && aynıHost(u, tabanUrl) && detayMi(u) && u !== tabanUrl) s.add(u);
  }
  return [...s];
}
/** Site haritası kayıtlarını sırala: adreste tarih varsa ve geçmişse ele; gelecek/bugün tarihliler önce (artan), sonra yakın lastmod. */
export function detaySirala(kayitlar, bugun) {
  const gel = [], diger = [];
  for (const k of kayitlar) {
    const t = k.loc.match(/(20\d\d)[-/](\d{2})[-/](\d{2})/);
    if (t) { const g = `${t[1]}-${t[2]}-${t[3]}`; if (g >= bugun) gel.push([g, k.loc]); continue; }
    diger.push(k);
  }
  gel.sort((a, b) => a[0].localeCompare(b[0]));
  diger.sort((a, b) => (b.lastmod || "").localeCompare(a.lastmod || ""));
  return [...gel.map((x) => x[1]), ...diger.map((x) => x.loc)];
}

/**
 * Detay sayfası adayları: önce liste sayfalarındaki bağlantılar; azsa (<6) sitenin site haritası (robots.txt Sitemap satırı ya da /sitemap.xml; dizinse bir alt harita).
 * say: { n } sayfa sayacı (paylaşılır), butce: mekân başına sayfa tavanı. -> { urller, haritalar }
 */
async function detayAdaylari(ag, { listeler, haritalar, bugun, say, butce }) {
  const urller = new Set(), kullanilan = [];
  for (const l of listeler) for (const u of detayBaglantilar(l.metin, l.url)) urller.add(u);
  if (urller.size < 6 && listeler.length && say.n < butce) {
    const taban = listeler[0].url;
    const adaylar = haritalar?.length ? haritalar : await ag.siteHaritalari(new URL(taban).origin);
    let girenler = [];
    for (const h of adaylar.slice(0, 2)) {
      if (say.n >= butce) break;
      say.n++; const s = await ag.getir(h, "application/xml,text/xml,*/*;q=0.5");
      if (s.yok) continue;
      kullanilan.push(h);
      let r = siteHaritasiAyristir(s.metin);
      if (r.altlar.length && !r.url.length && say.n < butce) {
        const secilen = r.altlar.filter((a) => aynıHost(a.loc, taban) && !/\.gz(?:$|\?)/i.test(a.loc)).find((a) => SITEMAP_ETKINLIK.test(a.loc)) || r.altlar.find((a) => aynıHost(a.loc, taban) && !/\.gz(?:$|\?)/i.test(a.loc));
        if (secilen) { say.n++; const c = await ag.getir(secilen.loc, "application/xml,text/xml,*/*;q=0.5"); if (!c.yok) { kullanilan.push(secilen.loc); r = siteHaritasiAyristir(c.metin); } }
      }
      girenler = r.url.filter((e) => aynıHost(e.loc, taban) && !biletMi(e.loc) && detayMi(e.loc));
      if (girenler.length) break;
    }
    for (const u of detaySirala(girenler, bugun)) urller.add(u);
  }
  return { urller: [...urller], haritalar: kullanilan };
}

/**
 * KEŞİF: bir mekânın hangi yöntemle etkinlik verdiğini bulur. Mekân başına en çok `butce` sayfa (varsayılan 12: liste + site haritası + detay).
 * Sıra: ana sayfa JSON-LD; alternatif akışlar (iCal/RSS); etkinlik bağlantılı liste sayfaları (en çok 3 liste/akış sayfası); hâlâ yoksa DETAY sayfaları
 * (liste bağlantıları, sonra site haritası) ve onlardaki JSON-LD Event. -> { yontem, etkinlik_sayfasi, sayfalar, detay, site_haritalari, detay_ornek, hamOlay, neden }
 */
export async function mekanKesfet(mekan, ag, { butce = MEKAN_SAYFA_UST, simdi = Date.now() } = {}) {
  const say = { n: 0 };
  const bos = (neden) => ({ yontem: "yok", etkinlik_sayfasi: "", sayfalar: [], hamOlay: 0, neden, sayfa: say.n });
  const al = async (u, k) => { say.n++; return ag.getir(u, k); };
  const web = httpsYap(mekan.web) || mekan.web;
  const ana = await al(web);
  if (ana.yok) return bos(ana.yok);
  const bulunan = [], listeler = [];                   // bulunan: { url, yontem, say }; listeler: gezilen HTML sayfaları
  const dene = (s, url) => { const r = sayfaOlaylari(s); const n = r.olaylar.filter((o) => o.ad && o.baslangic && tarihCoz(o.baslangic)).length; if (n) bulunan.push({ url, yontem: r.yontem, say: n }); return n; };
  if (/html/i.test(ana.tur || "") || !ana.tur) listeler.push({ url: ana.url, metin: ana.metin });
  dene(ana, ana.url);
  const { akislar, sayfalar } = adayBaglantilar(ana.metin, ana.url);
  let kalan = MEKAN_LISTE_UST - 1;
  const kuyruk = bulunan.length ? [] : [...akislar.slice(0, 2), ...sayfalar];
  for (const u of kuyruk) {
    if (kalan <= 0 || bulunan.length || say.n >= butce) break;
    const s = await al(u); kalan--;
    if (s.yok) continue;
    if (/html/i.test(s.tur || "")) listeler.push({ url: s.url || u, metin: s.metin });
    dene(s, s.url || u);
    if (!bulunan.length && /html/i.test(s.tur || "")) {                    // sayfada alternatif akış bağlantısı varsa ve bütçe kaldıysa onu da dene
      const ic = adayBaglantilar(s.metin, s.url || u);
      for (const a of ic.akislar.slice(0, 1)) { if (kalan <= 0 || bulunan.length || say.n >= butce) break; const f = await al(a); kalan--; if (!f.yok) dene(f, f.url || a); }
    }
  }
  if (bulunan.length) {
    const yontem = bulunan[0].yontem;
    return { yontem, etkinlik_sayfasi: bulunan[0].url, sayfalar: bulunan.filter((b) => b.yontem === yontem).map((b) => b.url).slice(0, MEKAN_LISTE_UST), detay: false, hamOlay: bulunan.reduce((t, b) => t + b.say, 0), neden: "", sayfa: say.n };
  }
  // DETAY aşaması
  if (!listeler.length || say.n >= butce) return bos("olay-yok");
  const { urller, haritalar } = await detayAdaylari(ag, { listeler, haritalar: null, bugun: trGun(simdi), say, butce });
  const ornek = []; let ham = 0;
  for (const u of urller) {
    if (say.n >= butce || ornek.length >= 2) break;
    const s = await al(u);
    if (s.yok || !/html/i.test(s.tur || "text/html")) continue;
    const r = sayfaOlaylari(s), n = r.olaylar.filter((o) => o.ad && o.baslangic && tarihCoz(o.baslangic)).length;
    if (n && r.yontem === "jsonld") { ornek.push(s.url || u); ham += n; }
  }
  if (!ornek.length) return bos(urller.length ? "detay-olay-yok" : "olay-yok");
  return { yontem: "jsonld", etkinlik_sayfasi: listeler[0].url, sayfalar: listeler.map((l) => l.url).slice(0, MEKAN_LISTE_UST), detay: true, site_haritalari: haritalar, detay_ornek: ornek, hamOlay: ham, neden: "", sayfa: say.n };
}

/**
 * Bilinen yöntemle bir mekânı tara. Mekân başına günde en çok `butce` sayfa; detay kipli mekânda: liste sayfaları -> (azsa) site haritası -> detay sayfaları.
 * dur(): true ise (tur istek tavanı) kalan sayfalara gidilmez. -> { etkinlikler: [doğrulanmış], ham, ret: {neden: n}, durum, sayfa }
 */
export async function mekanTara(mekan, ag, simdi = Date.now(), { butce = MEKAN_SAYFA_UST, dur = () => false } = {}) {
  const sonuc = { etkinlikler: [], ham: 0, ret: {}, durum: "ok", sayfa: 0 };
  const gorulen = new Set(), say = { n: 0 }, listeler = [];
  const isle = (s, url) => {
    const { olaylar } = sayfaOlaylari(s);
    for (const o of olaylar) {
      sonuc.ham++;
      const { etkinlik, neden } = mekanOlayiDogrula(o, mekan, s.url || url, simdi);
      if (!etkinlik) { sonuc.ret[neden] = (sonuc.ret[neden] || 0) + 1; continue; }
      if (gorulen.has(etkinlik.kaynak_id)) continue;
      gorulen.add(etkinlik.kaynak_id);
      if (sonuc.etkinlikler.length < MEKAN_OLAY_UST) sonuc.etkinlikler.push(etkinlik);
    }
  };
  for (const url of (mekan.sayfalar?.length ? mekan.sayfalar : [mekan.etkinlik_sayfasi]).filter(Boolean).slice(0, MEKAN_LISTE_UST)) {
    if (say.n >= butce || dur()) break;
    say.n++; const s = await ag.getir(url);
    if (s.yok) { sonuc.durum = s.yok; continue; }
    if (/html/i.test(s.tur || "text/html")) listeler.push({ url: s.url || url, metin: s.metin });
    isle(s, url);
  }
  if (mekan.detay && listeler.length && say.n < butce && !dur()) {
    const { urller } = await detayAdaylari(ag, { listeler, haritalar: mekan.site_haritalari, bugun: trGun(simdi), say, butce });
    for (const u of urller) {
      if (say.n >= butce || dur() || sonuc.etkinlikler.length >= MEKAN_OLAY_UST) break;
      say.n++; const s = await ag.getir(u);
      if (s.yok) { sonuc.durum = s.yok; continue; }
      if (/html/i.test(s.tur || "text/html")) isle(s, u);
    }
  }
  sonuc.sayfa = say.n;
  return sonuc;
}

// ---------------------------------------------------------------- TUR: dönüşümlü tarama + gönderim
const yontemSay = (o) => Object.entries(o).map(([k, v]) => `${k}:${v}`).join("/");
export const mekanOzetMetni = (o) => (o ? `taranan:${o.taranan},bulunan:${o.bulunan},gonderilen:${o.gonderilen},yontem:${yontemSay(o.yontem) || "-"}` : "");

/**
 * Hat turuna bağlanır. mekanlar: mekanlar.json içeriği. bulut: durumOku/durumYaz + etkinlikToplu(yukluListe). Hata atmaz.
 * Günlük sınır kalıcı durumda ("mekan:tarama" -> {t:{id:"YYYY-MM-DD"}}); durum okunamıyorsa HİÇ tarama yapılmaz (günde 1 sınırı kanıtlanamaz).
 */
export async function mekanEtkinlikTuru({ mekanlar, bulut, fetchFn = fetch, bekleFn, simdi = () => Date.now(), tavan = MEKAN_TUR_UST, sureSn = MEKAN_SURE_SN, istekUst = MEKAN_ISTEK_UST, aralikMs = MEKAN_ARALIK_MS, log = () => {} }) {
  const ozet = { taranan: 0, bulunan: 0, gonderilen: 0, yontem: {}, eklendi: 0, guncellendi: 0, atlandi: 0, hata: 0, durum: "ok" };
  const liste = (Array.isArray(mekanlar) ? mekanlar : []).filter((m) => m && m.aktif !== false && ["jsonld", "ical", "rss"].includes(m.yontem) && m.etkinlik_sayfasi && !biletMi(m.etkinlik_sayfasi));
  if (!liste.length) { ozet.durum = "mekan-yok"; return ozet; }
  const bugun = trGun(simdi());
  const okunan = await durumOkuGuvenli(bulut, [MEKAN_DURUM_ANAHTARI]);
  if (!okunan) { ozet.durum = "durum-yok"; return ozet; }
  const t = { ...(okunan.get(MEKAN_DURUM_ANAHTARI)?.t || {}) };
  const sirali = liste.filter((m) => t[m.id] !== bugun).sort((a, b) => (t[a.id] || "").localeCompare(t[b.id] || "") || (a.no ?? 0) - (b.no ?? 0)).slice(0, Math.max(0, tavan));
  if (!sirali.length) { ozet.durum = "hepsi-tarandi"; return ozet; }
  const ag = agKur({ fetchFn, ...(bekleFn ? { bekleFn } : {}), simdi, aralikMs, log });
  const bas = simdi(), toplam = [];
  for (const m of sirali) {
    if (simdi() - bas > sureSn * 1000) { ozet.durum = "sure"; break; }
    if (ag.istekSayisi() >= istekUst) { ozet.durum = "istek"; break; }
    let r;
    try { r = await mekanTara(m, ag, simdi(), { dur: () => ag.istekSayisi() >= istekUst || simdi() - bas > sureSn * 1000 }); } catch (e) { ozet.hata++; log(`mekan taraması atlandı (${m.id}): ${String(e.message || e).slice(0, 40)}`); continue; }
    t[m.id] = bugun; ozet.taranan++; ozet.sayfa = (ozet.sayfa || 0) + r.sayfa;
    if (r.etkinlikler.length) { ozet.bulunan += r.etkinlikler.length; ozet.yontem[m.yontem] = (ozet.yontem[m.yontem] || 0) + 1; toplam.push(...r.etkinlikler); }
  }
  // gün sınırı: yalnız taranan mekânlar işaretlenir; eski günler ayıklanır (yalnız mekânda olan kimlikler tutulur)
  const kimlikler = new Set(mekanlar.map((m) => m.id));
  const gorulenAdres = new Set();                         // aynı siteyi paylaşan mekânlar (örn. grup siteleri): aynı etkinlik iki kez gönderilmez
  for (let i = toplam.length - 1; i >= 0; i--) { const k = `${toplam[i].url}|${toplam[i].baslangic}`; if (gorulenAdres.has(k)) toplam.splice(i, 1); else gorulenAdres.add(k); }
  for (const k of Object.keys(t)) if (!kimlikler.has(k)) delete t[k];
  await durumYazGuvenli(bulut, MEKAN_DURUM_ANAHTARI, { t, z: new Date(simdi()).toISOString() });
  if (toplam.length && typeof bulut?.etkinlikToplu === "function") {
    for (const yuk of topluYukler(toplam)) {
      try {
        const j = await bulut.etkinlikToplu(yuk.etkinlikler);
        ozet.gonderilen += yuk.etkinlikler.length;
        ozet.eklendi += j?.eklendi | 0; ozet.guncellendi += j?.guncellendi | 0; ozet.atlandi += j?.atlandi | 0;
      } catch (e) { ozet.hata++; ozet.durum = "uc-yok"; log(`etkinlik_toplu atlandı: ${String(e.message || e).slice(0, 50)}`); break; }   // eski sunucu (400) vb.: tur aksamaz
    }
  }
  return ozet;
}
