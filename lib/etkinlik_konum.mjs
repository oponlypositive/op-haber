// ETKİNLİK MEKÂN KOORDİNATI (2026-10-15): haber.etkinlik.konum = { enlem, boylam (5 ondalık), kesin } — sunucu sözleşmesi, isteğe bağlı.
// Sıra: (a) Wikidata wbsearchentities + wbgetentities (P625), (b) Photon (photon.komoot.io; anahtarsız, ücretsiz). Nominatim KULLANILMAZ:
//   OSMF politikası "düzenli aralıkla çalışan betik = toplu geokodlama, dakikada 4 istek, kesinlikle önbellek" der; saatlik tur bununla çelişir.
//   Photon koşulu: "adil kullanım, aşırı kullanım kısıtlanır" (açık sayısal sınır ve otomatik kullanım yasağı yok); biz tur başına ≤6 istek + kalıcı önbellek + ≥1,1 sn aralık uygularız.
// KESİN koordinat yalnız: mekân adı sonuçla (katlanmış, kelime kümesi olarak) birebir eşleşir VE koordinat etkinliğin ilinin merkezine <=60 km (İstanbul 80) olur VE Türkiye kutusundadır.
// Aksi halde konum GÖNDERİLMEZ (sunucu şehir merkezini kullanır, kesin=false). Önbellek: hat_durum `etkinlik:konum:<mekan>-<hash>` (bulunan = kalıcı, bulunamayan = 7 gün).
import { createHash } from "node:crypto";
import { katla } from "./gorsel_aday.mjs";
import { SEHIRLER, TR_KUTU, konumGecerli } from "./etkinlik.mjs";
import { durumOkuGuvenli, durumYazGuvenli } from "./mufredat.mjs";

export const KONUM_UA = "OnlyPositiveHaberHatti/1.0 (+https://onlypositive.org/destek)";
export const KONUM_ARALIK_MS = 1100;
export const KONUM_ISTEK_UST = 6;
export const KONUM_YOK_GUN = 7;
export const KONUM_YARICAP_KM = 60;
const YARICAP_OZEL = { "İstanbul": 80 };            // metropol: ilçeler merkezden daha uzak
const KOMSU_AYNI_KM = 1.5;                           // aynı adlı birden çok sonuç bu kadar yakınsa aynı yer sayılır

// İl merkezleri (yaklaşık, enlem/boylam): SEHIRLER ile bire bir (test denetler).
const IL_MERKEZ_HAM = { Adana: [37.00, 35.32], "Adıyaman": [37.76, 38.28], Afyonkarahisar: [38.76, 30.54], "Ağrı": [39.72, 43.05], Aksaray: [38.37, 34.03], Amasya: [40.65, 35.83], Ankara: [39.93, 32.86], Antalya: [36.90, 30.70], Ardahan: [41.11, 42.70], Artvin: [41.18, 41.82],
  "Aydın": [37.85, 27.84], "Balıkesir": [39.65, 27.89], "Bartın": [41.64, 32.34], Batman: [37.88, 41.13], Bayburt: [40.26, 40.23], Bilecik: [40.14, 29.98], "Bingöl": [38.88, 40.50], Bitlis: [38.40, 42.11], Bolu: [40.73, 31.61], Burdur: [37.72, 30.29], Bursa: [40.19, 29.06],
  "Çanakkale": [40.15, 26.41], "Çankırı": [40.60, 33.62], "Çorum": [40.55, 34.95], Denizli: [37.78, 29.09], "Diyarbakır": [37.91, 40.24], "Düzce": [40.84, 31.16], Edirne: [41.68, 26.56], "Elazığ": [38.68, 39.22], Erzincan: [39.75, 39.49], Erzurum: [39.90, 41.27], "Eskişehir": [39.78, 30.52],
  Gaziantep: [37.07, 37.38], Giresun: [40.91, 38.39], "Gümüşhane": [40.46, 39.48], Hakkari: [37.58, 43.74], Hatay: [36.40, 36.35], "Iğdır": [39.92, 44.04], Isparta: [37.76, 30.55], "İstanbul": [41.01, 28.98], "İzmir": [38.42, 27.14], "Kahramanmaraş": [37.58, 36.94],
  "Karabük": [41.20, 32.63], Karaman: [37.18, 33.22], Kars: [40.60, 43.10], Kastamonu: [41.38, 33.78], Kayseri: [38.72, 35.49], Kilis: [36.72, 37.12], "Kırıkkale": [39.85, 33.52], "Kırklareli": [41.74, 27.22], "Kırşehir": [39.15, 34.17], Kocaeli: [40.77, 29.92], Konya: [37.87, 32.48],
  "Kütahya": [39.42, 29.98], Malatya: [38.35, 38.31], Manisa: [38.61, 27.43], Mardin: [37.31, 40.74], Mersin: [36.80, 34.64], "Muğla": [37.22, 28.36], "Muş": [38.74, 41.49], "Nevşehir": [38.62, 34.71], "Niğde": [37.97, 34.68], Ordu: [40.98, 37.88], Osmaniye: [37.07, 36.25],
  Rize: [41.02, 40.52], Sakarya: [40.69, 30.40], Samsun: [41.29, 36.33], "Şanlıurfa": [37.16, 38.79], Siirt: [37.93, 41.94], Sinop: [42.03, 35.15], Sivas: [39.75, 37.02], "Şırnak": [37.52, 42.46], "Tekirdağ": [40.98, 27.51], Tokat: [40.31, 36.55], Trabzon: [41.00, 39.72],
  Tunceli: [39.11, 39.55], "Uşak": [38.68, 29.41], Van: [38.49, 43.38], Yalova: [40.65, 29.27], Yozgat: [39.82, 34.81], Zonguldak: [41.45, 31.80] };
export const IL_MERKEZ = IL_MERKEZ_HAM;

const yuvarla5 = (x) => Math.round(x * 1e5) / 1e5;
export function mesafeKm(a, b) {
  const r = (d) => (d * Math.PI) / 180, [e1, b1] = a, [e2, b2] = b;
  const h = Math.sin(r(e2 - e1) / 2) ** 2 + Math.cos(r(e1)) * Math.cos(r(e2)) * Math.sin(r(b2 - b1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
/** Koordinat Türkiye kutusunda ve ilin merkezine <= yarıçap km mi? */
export function ilIcinde(enlem, boylam, il) {
  const m = IL_MERKEZ[il];
  if (!m || !Number.isFinite(enlem) || !Number.isFinite(boylam)) return false;
  if (enlem < TR_KUTU.enlemMin || enlem > TR_KUTU.enlemMax || boylam < TR_KUTU.boylamMin || boylam > TR_KUTU.boylamMax) return false;
  return mesafeKm([enlem, boylam], m) <= (YARICAP_OZEL[il] ?? KONUM_YARICAP_KM);
}

const DURAK = new Set(["the", "of", "de", "da", "ve", "and"]);
const kume = (t) => new Set(katla(t).split(" ").filter((k) => k && !DURAK.has(k)));
/** Mekân adı ile sonuç adı: katlanmış kelime KÜMELERİ eşit mi (sıra/aksan/büyük harf farkı yok, ek kelime yok)? */
export function mekanAdiEsit(a, b) {
  const x = kume(a), y = kume(b);
  return x.size > 0 && x.size === y.size && [...x].every((k) => y.has(k));
}

/** hat_durum anahtarı: etkinlik:konum:<mekan-slug>-<hash8> (^[a-z0-9_:-]{3,80}$). */
export function konumAnahtari(mekan, il) {
  const k = katla(mekan), h = createHash("sha1").update(`${k}|${katla(il)}`).digest("hex").slice(0, 8);
  return `etkinlik:konum:${(k.replace(/ /g, "-").slice(0, 40) || "mekan")}-${h}`;
}

class ButceBitti extends Error {}
class Durdur extends Error {}                          // 429/403: bu turda sağlayıcıya bir daha gidilmez

/** Aynı adlı sonuçlardan il içindekileri tek konuma indirir; çelişkili (>1,5 km) ise null. */
function tekKonum(adaylar, il) {
  const ic = adaylar.filter((p) => ilIcinde(p[0], p[1], il));
  if (!ic.length) return null;
  if (ic.some((p) => mesafeKm(p, ic[0]) > KOMSU_AYNI_KM)) return null;
  return { enlem: yuvarla5(ic[0][0]), boylam: yuvarla5(ic[0][1]), kesin: true };
}

/** Oturum: tur başına istek sayacı + aralık. */
function oturumKur({ fetchFn, bekleFn, ust, aralikMs }) {
  const o = { sayi: 0, durdu: false };
  o.istek = async (url) => {
    if (o.durdu) throw new Durdur("durdu");
    if (o.sayi >= ust) throw new ButceBitti("butce");
    if (o.sayi > 0 && aralikMs > 0) await bekleFn(aralikMs);
    o.sayi++;
    const r = await fetchFn(url, { headers: { "User-Agent": KONUM_UA, Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
    if (r.status === 429 || r.status === 403) { o.durdu = true; throw new Durdur(`HTTP ${r.status}`); }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };
  return o;
}

const WD = "https://www.wikidata.org/w/api.php";
/** Wikidata: tam etiket eşleşmesi + P625 + il içi. -> { durum: "ok", konum } | { durum: "yok" } (kesin cevap: aday yok) */
async function wikidataKonum(mekan, il, oturum) {
  const p = new URLSearchParams({ action: "wbsearchentities", search: mekan, language: "tr", uselang: "tr", type: "item", limit: "8", format: "json" });
  const j = await oturum.istek(`${WD}?${p}`);
  const idler = [];
  for (const s of j?.search || []) if (mekanAdiEsit(s.match?.text ?? s.label ?? "", mekan) && !idler.includes(s.id)) idler.push(s.id);
  if (!idler.length) return { durum: "yok" };
  const p2 = new URLSearchParams({ action: "wbgetentities", ids: idler.slice(0, 5).join("|"), props: "claims", format: "json" });
  const e = (await oturum.istek(`${WD}?${p2}`))?.entities || {};
  const noktalar = [];
  for (const id of idler.slice(0, 5)) {
    for (const s of e[id]?.claims?.P625 || []) {
      const v = s?.mainsnak?.datavalue?.value;
      if (s?.rank !== "deprecated" && s?.mainsnak?.snaktype === "value" && Number.isFinite(v?.latitude) && Number.isFinite(v?.longitude)) noktalar.push([v.latitude, v.longitude]);
    }
  }
  const konum = tekKonum(noktalar, il);
  return konum ? { durum: "ok", konum } : { durum: "yok" };
}

/** Photon: ad eşleşmesi + il içi (+ ülke TR). -> { durum: "ok", konum } | { durum: "yok" } */
async function photonKonum(mekan, il, oturum) {
  const bbox = `${TR_KUTU.boylamMin},${TR_KUTU.enlemMin},${TR_KUTU.boylamMax},${TR_KUTU.enlemMax}`;
  const j = await oturum.istek(`https://photon.komoot.io/api/?q=${encodeURIComponent(`${mekan} ${il}`)}&limit=3&bbox=${bbox}`);
  const noktalar = [];
  for (const f of j?.features || []) {
    const pr = f?.properties || {}, c = f?.geometry?.coordinates;
    if (pr.countrycode && String(pr.countrycode).toUpperCase() !== "TR") continue;
    if (!mekanAdiEsit(pr.name ?? "", mekan) || !Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    noktalar.push([c[1], c[0]]);
  }
  const konum = tekKonum(noktalar, il);
  return konum ? { durum: "ok", konum } : { durum: "yok" };
}

/** Tek mekân: Wikidata, yoksa Photon. -> { konum|null, kaynak, kesinYok } (kesinYok: iki sağlayıcı da cevap verdi ve eşleşme yok -> olumsuz önbellek yazılabilir) */
async function mekanCoz(mekan, il, oturum, log) {
  let wdYok = false, fYok = false;
  try { const r = await wikidataKonum(mekan, il, oturum); if (r.durum === "ok") return { konum: r.konum, kaynak: "wikidata", kesinYok: false }; wdYok = true; }
  catch (e) { if (e instanceof ButceBitti || e instanceof Durdur) throw e; log?.(`konum: wikidata hata ${String(e.message || e).slice(0, 40)}`); }
  try { const r = await photonKonum(mekan, il, oturum); if (r.durum === "ok") return { konum: r.konum, kaynak: "photon", kesinYok: false }; fYok = true; }
  catch (e) { if (e instanceof ButceBitti || e instanceof Durdur) throw e; log?.(`konum: photon hata ${String(e.message || e).slice(0, 40)}`); }
  return { konum: null, kaynak: "", kesinYok: wdYok && fYok };
}

/**
 * Etkinliklere (yerinde) `konum` ekler. etkinlikler: haber.etkinlik nesneleri. bulut: durumOku/durumYaz (yoksa yalnız tur içi önbellek).
 * -> { kesin, yok, onbellek, istek }   kesin: konum eklenen etkinlik; yok: eklenmeyen; onbellek: kalıcı önbellekten gelen cevap (bulunan ya da bulunamayan); istek: yapılan ağ isteği.
 */
export async function etkinlikKonumlari({ etkinlikler, bulut = null, fetchFn = fetch, bekleFn = (ms) => new Promise((r) => setTimeout(r, ms)), simdi = Date.now(), ust = KONUM_ISTEK_UST, aralikMs = KONUM_ARALIK_MS, log = () => {} }) {
  const sonuc = { kesin: 0, yok: 0, onbellek: 0, istek: 0 };
  const isler = new Map();                              // anahtar -> { mekan, il, liste: [etkinlik] }
  for (const e of etkinlikler || []) {
    if (!e || typeof e !== "object") continue;
    if (e.konum !== undefined && konumGecerli(e.konum)) { sonuc.kesin++; continue; }
    delete e.konum;
    const il = SEHIRLER.includes(e.sehir) ? e.sehir : "", mekan = typeof e.mekan === "string" ? e.mekan.trim() : "";
    if (!il || mekan.length < 3 || !kume(mekan).size) { sonuc.yok++; continue; }
    const k = konumAnahtari(mekan, il);
    if (!isler.has(k)) isler.set(k, { mekan, il, liste: [] });
    isler.get(k).liste.push(e);
  }
  if (!isler.size) return sonuc;
  const anahtarlar = [...isler.keys()], kayitli = new Map();
  for (let i = 0; i < anahtarlar.length; i += 50) {
    const h = bulut ? await durumOkuGuvenli(bulut, anahtarlar.slice(i, i + 50)) : null;
    if (h) for (const [k, v] of h) kayitli.set(k, v);
  }
  const oturum = oturumKur({ fetchFn, bekleFn, ust, aralikMs });
  const uygula = (is, konum) => { for (const e of is.liste) { if (konum) { e.konum = { ...konum }; sonuc.kesin++; } else sonuc.yok++; } };
  for (const [k, is] of isler) {
    const kay = kayitli.get(k);
    if (kay && kay.yok && Number.isFinite(Date.parse(kay.z)) && simdi - Date.parse(kay.z) < KONUM_YOK_GUN * 86400_000) { sonuc.onbellek++; uygula(is, null); continue; }
    if (kay && !kay.yok && ilIcinde(kay.enlem, kay.boylam, is.il) && konumGecerli({ enlem: kay.enlem, boylam: kay.boylam, kesin: true })) { sonuc.onbellek++; uygula(is, { enlem: kay.enlem, boylam: kay.boylam, kesin: true }); continue; }
    let r = null;
    try { r = await mekanCoz(is.mekan, is.il, oturum, log); }
    catch (e) {
      if (e instanceof ButceBitti || e instanceof Durdur) { uygula(is, null); if (e instanceof Durdur) log(`konum: sağlayıcı sınırı (${e.message}), tur için durduruldu`); continue; }   // bütçe/sınır: sonraki turda yeniden denenir (önbelleğe yazılmaz)
      throw e;
    }
    if (r.konum) { await durumYazGuvenli(bulut, k, { enlem: r.konum.enlem, boylam: r.konum.boylam, kaynak: r.kaynak, z: new Date(simdi).toISOString() }); kayitli.set(k, { ...r.konum }); }
    else if (r.kesinYok) await durumYazGuvenli(bulut, k, { yok: 1, z: new Date(simdi).toISOString() });
    uygula(is, r.konum);
  }
  sonuc.istek = oturum.sayi;
  return sonuc;
}

export const konumOzetMetni = (s) => (s ? `kesin:${s.kesin},yok:${s.yok},onbellek:${s.onbellek}` : "");
