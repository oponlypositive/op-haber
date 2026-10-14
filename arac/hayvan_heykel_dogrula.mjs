// OP Hayvanlar + OP Sanat/Heykel aday doğrulayıcısı (Vikipedi + Commons, SALT OKUMA; istekler arası ~2,5 sn).
//   node arac/hayvan_heykel_dogrula.mjs            -> arac/dogrulandi_hayvan_heykel.json (aday başına durum + neden) ve konsol özeti
//   node arac/hayvan_heykel_dogrula.mjs --yaz      -> ek olarak lib/hayvan_veri.mjs ve lib/heykel_veri.mjs dosyalarını YENİDEN yazar (yalnız doğrulananlar)
//   Kapak görseli uygun değilse maddedeki öteki jpeg görseller denenir (aday.ipucu = dosya adı kalıbı verilirse yalnız onlar). ONLY=hayvan|heykel ile tek tür; ONCEKI=1 ile arac/dogrulandi_hayvan_heykel.json'daki önceki sonuçlar yeniden kullanılır (yalnız eksik adaylar sorgulanır).
// Doğrulama (aday başına): (1) İngilizce Vikipedi maddesi var, anlam ayrımı sayfası değil; (2) "kanit" kalıplarının HEPSİ maddenin TAM düz metninde geçiyor (metindeki olgu kaynakta yazıyor);
// (3) görsel Commons'ta: jpeg, genişlik >= 900, lisans CC0 / Public domain / CC BY / CC BY-SA (NC/ND yok), dosya adında harita/çizim/iskelet vb. yok;
// (4) heykel: telif = sanatçı ölüm yılı <= 1955 (Vikipedi sanatçı girişinde yıl geçmeli) ya da anonim ve yapılışı <= 1900.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const BURASI = fileURLToPath(new URL("./", import.meta.url));
const LIB = fileURLToPath(new URL("../lib/", import.meta.url));
const UA = "OPKonuHesaplari/1.0 (salt okuma dogrulama; OP haber hatti)";
const dur = (ms) => new Promise((r) => setTimeout(r, ms));
let istek = 0;
async function api(host, params) {
  for (let d = 0; d < 6; d++) {
    await dur(2500); istek++;
    const u = `https://${host}/w/api.php?` + new URLSearchParams({ format: "json", formatversion: "2", ...params });
    const r = await fetch(u, { headers: { "User-Agent": UA } });
    const t = await r.text();
    try { return JSON.parse(t); } catch { console.error("hız sınırı, bekleniyor", t.slice(0, 40)); await dur(20000 + d * 10000); }
  }
  throw new Error("api başarısız");
}
const SADECE = process.env.ONLY || "";
const SONUC_DOSYA = BURASI + "dogrulandi_hayvan_heykel.json";
const onceki = process.env.ONCEKI && fs.existsSync(SONUC_DOSYA) ? JSON.parse(fs.readFileSync(SONUC_DOSYA, "utf8")) : { hayvan: {}, heykel: {} };
const { ADAYLAR: HAYVAN } = await import("./aday/hayvan_aday.mjs");
const { ADAYLAR: HEYKEL } = await import("./aday/heykel_aday.mjs");
const { lisansOk, yasakliMi } = await import(new URL("../lib/gorsel.mjs", import.meta.url).href);
const RESIM_KOT = /map|diagram|logo|flag|coat[ _]of[ _]arms|icon|symbol|banner|poster|scheme|chart|drawing|illustration|sketch|skeleton|skull|taxobox|distribution|range|stamp|coin|painting|engraving|cartoon|\bsvg\b/i;
const PD_TARIH = 1955;

/** Düz metin + kapak görseli (tek tek; tam metin istendiği için exlimit 1). */
async function madde(baslik) {
  const j = await api("en.wikipedia.org", { action: "query", redirects: "1", titles: baslik, prop: "extracts|pageimages|pageprops|info", explaintext: "1", exsectionformat: "plain", piprop: "name", ppprop: "disambiguation", inprop: "url" });
  const p = (j.query?.pages || [])[0];
  if (!p || p.missing) return { var: false };
  return { var: true, baslik: p.title, ayrim: !!p.pageprops && "disambiguation" in p.pageprops, metin: p.extract || "", resim: p.pageimage || "", url: p.fullurl || "" };
}
async function sanatciGirisleri(adlar) {
  const harita = new Map(); const tekil = [...new Set(adlar)];
  for (let i = 0; i < tekil.length; i += 20) {
    const grup = tekil.slice(i, i + 20);
    const j = await api("en.wikipedia.org", { action: "query", redirects: "1", titles: grup.join("|"), prop: "extracts", exintro: "1", explaintext: "1", exlimit: "20" });
    const yon = new Map((j.query?.redirects || []).map((x) => [x.from, x.to])), norm = new Map((j.query?.normalized || []).map((x) => [x.from, x.to]));
    const sayfa = new Map((j.query?.pages || []).map((p) => [p.title, p.extract || ""]));
    for (const b of grup) { let t = norm.get(b) || b; t = yon.get(t) || t; harita.set(b, sayfa.get(t) || ""); }
  }
  return harita;
}
async function commons(dosyalar) {
  const harita = new Map(); const tekil = [...new Set(dosyalar.filter(Boolean))];
  for (let i = 0; i < tekil.length; i += 40) {
    const grup = tekil.slice(i, i + 40);
    const j = await api("commons.wikimedia.org", { action: "query", titles: grup.map((d) => "File:" + d).join("|"), prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "320" });
    const norm = new Map((j.query?.normalized || []).map((x) => [x.to, x.from]));
    for (const p of j.query?.pages || []) {
      const ii = (p.imageinfo || [])[0]; if (!ii || p.missing) continue;
      const md = ii.extmetadata || {}, ad = (norm.get(p.title) || p.title).replace(/^File:/i, "").replace(/_/g, " ");
      harita.set(ad, { lisans: md.LicenseShortName?.value || "", mime: ii.mime, w: ii.width || 0, h: ii.height || 0, sahibi: String(md.Artist?.value || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 100), kucuk: ii.thumburl || "", kaynak_url: ii.descriptionurl || "" });
    }
  }
  return harita;
}
const kanitNedeni = (metin, kanit) => (kanit || []).filter((k) => !new RegExp(k, "i").test(metin)).map((k) => `kanıt yok: ${k}`);

async function isle(tur, liste, esikGenislik) {
  const sonuc = {};
  for (const a of liste) {
    const anahtar = a.ad;
    if (a.ele) { sonuc[anahtar] = { durum: "yok", nedenler: [`elendi (editör): ${a.ele}`], ad: a.ad, tohum: a }; console.error(tur, anahtar, "yok", a.ele); continue; }
    if (onceki[tur]?.[anahtar]?.durum === "ok" && JSON.stringify(onceki[tur][anahtar].tohum) === JSON.stringify(a)) { sonuc[anahtar] = onceki[tur][anahtar]; continue; }
    const m = await madde(a.madde).catch((e) => ({ var: false, hata: e.message }));
    const s = { durum: "ok", nedenler: [], ad: a.ad, tohum: a };
    if (!m.var) s.nedenler.push("madde yok");
    else {
      if (m.ayrim) s.nedenler.push("anlam ayrımı");
      s.nedenler.push(...kanitNedeni(m.metin, a.kanit));
      s.baslik = m.baslik; s.resim = m.resim; s.url = m.url; s.metinUz = m.metin.length;
    }
    if (tur === "heykel") {
      if (a.anonim) { if (!(a.yilSayi <= 1900)) s.nedenler.push("telif: anonim eser 1900'den yeni"); }
      else if (!(a.olum <= PD_TARIH)) s.nedenler.push(`telif: ölüm ${a.olum}`);
    }
    if (s.nedenler.length) s.durum = "yok";
    sonuc[anahtar] = s;
    console.error(tur, anahtar, s.durum, s.nedenler.join("; "));
  }
  return sonuc;
}

const sonuclar = { hayvan: {}, heykel: {} };
if (!SADECE || SADECE === "hayvan") sonuclar.hayvan = await isle("hayvan", HAYVAN, 900);
if (!SADECE || SADECE === "heykel") sonuclar.heykel = await isle("heykel", HEYKEL, 900);

// sanatçı ölüm yılı (Vikipedi sanatçı girişinde yıl geçmeli)
const sanatciHarita = JSON.parse(fs.existsSync(BURASI + "aday/sanatci_madde.json") ? fs.readFileSync(BURASI + "aday/sanatci_madde.json", "utf8") : "{}");
const olumluHeykel = HEYKEL.filter((a) => !a.anonim && sonuclar.heykel[a.ad]);
if (olumluHeykel.length) {
  const gir = await sanatciGirisleri(olumluHeykel.map((a) => sanatciHarita[a.sanatci] || a.sanatci));
  for (const a of olumluHeykel) {
    const ad = sanatciHarita[a.sanatci] || a.sanatci, ex = gir.get(ad) || "";
    if (!new RegExp(`(?<![0-9])${a.olum}(?![0-9])`).test(ex)) { const s = sonuclar.heykel[a.ad]; s.nedenler.push(`telif: sanatçı girişinde (${ad}) ${a.olum} yılı geçmiyor`); s.durum = "yok"; console.error("heykel", a.ad, "yok", s.nedenler.join("; ")); }
  }
}

// görsel denetimi: önce maddenin kapak görseli; uygun değilse (lisans/boyut/tür/ad) ya da yoksa maddedeki öteki jpeg görseller sırayla denenir (aday "ipucu" verdiyse yalnız adı ipucuna uyanlar).
const ESIK = 900;                                 // asgari özgün genişlik (uygulama kartı 900 px'lik küçük sürüm kullanır; istemci tarafı >= 600 px ister)
const KOT_EK = /map|range|distribution|locator|diagram|icon|logo|symbol|flag|coat[ _]of[ _]arms|commons-logo|wikidata|question[ _]mark|stub|edit-|ambox|skeleton|skull|taxobox|drawing|illustration|sketch|painting|engraving|print|stamp|coin|lithograph|cartoon|\bsvg\b/i;
const gorselNedenleri = (dosya, g) => {
  const ned = [];
  if (!g) return ["commons dosyası yok"];
  if (!lisansOk(g.lisans)) ned.push(`lisans: ${g.lisans || "yok"}`);
  if (g.mime !== "image/jpeg") ned.push(`tür: ${g.mime}`);
  if (g.w < ESIK) ned.push(`çözünürlük: ${g.w}px`);
  if (yasakliMi(dosya) || RESIM_KOT.test(dosya)) ned.push("dosya adı uygunsuz anahtar");
  return ned;
};
async function maddeGorselleri(baslik) {
  const j = await api("en.wikipedia.org", { action: "query", redirects: "1", titles: baslik, prop: "images", imlimit: "80" });
  return ((j.query?.pages || [])[0]?.images || []).map((x) => String(x.title).replace(/^File:/i, "")).filter((d) => /\.jpe?g$/i.test(d) && !KOT_EK.test(d));
}
const tumOk = [...Object.entries(sonuclar.hayvan).map(([, s]) => ["hayvan", s]), ...Object.entries(sonuclar.heykel).map(([, s]) => ["heykel", s])].filter(([, s]) => s.durum === "ok" && !s.gorsel);
const kapak = await commons(tumOk.map(([t, s]) => (aday(t, s).ipucu ? "" : s.resim)));
function aday(tur, s) { return (tur === "hayvan" ? HAYVAN : HEYKEL).find((a) => a.ad === s.ad); }
for (const [tur, s] of tumOk) {
  const a = aday(tur, s), ipucu = a.ipucu ? new RegExp(a.ipucu, "i") : null;
  let secilen = null, ned = [];
  if (!ipucu && s.resim) {
    const g = kapak.get(String(s.resim).replace(/_/g, " "));
    ned = gorselNedenleri(s.resim, g);
    if (!ned.length) secilen = { dosya: String(s.resim).replace(/_/g, " "), g };
  }
  if (!secilen) {
    const FOLD = (x) => String(x).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    const DURAK = new Set(["statue", "fountain", "monument", "giant", "common", "white", "black", "brown", "greater", "lesser", "north", "american", "european", "asian", "african", "green", "great", "golden", "wikipedia", "memorial", "bust", "figure"]);
    const tokenler = ipucu ? [] : [...new Set(FOLD(`${a.enAd} ${a.madde}`).match(/[a-z]{4,}/g) || [])].filter((w) => !DURAK.has(w));
    const liste = (await maddeGorselleri(s.baslik).catch(() => [])).filter((d) => ipucu || !tokenler.length || tokenler.some((w) => FOLD(d).includes(w))).filter((d) => !ipucu || ipucu.test(d)).filter((d) => d.replace(/_/g, " ") !== String(s.resim).replace(/_/g, " ")).slice(0, 14);
    const cm = await commons(liste);
    for (const d of liste) { const g = cm.get(d.replace(/_/g, " ")); if (g && !gorselNedenleri(d, g).length) { secilen = { dosya: d.replace(/_/g, " "), g, yedek: true }; break; } }
    if (!secilen) ned = [...ned, `maddede uygun görsel yok (${liste.length} dosya denendi)`];
  }
  if (secilen) s.gorsel = { dosya: secilen.dosya, lisans: secilen.g.lisans, w: secilen.g.w, h: secilen.g.h, sahibi: secilen.g.sahibi, kaynak_url: secilen.g.kaynak_url, kucuk: secilen.g.kucuk, yedek: !!secilen.yedek };
  else { s.nedenler.push(...ned); s.durum = "yok"; console.error(tur, s.ad, "yok", ned.join("; ")); }
}
fs.writeFileSync(SONUC_DOSYA, JSON.stringify(sonuclar, null, 1));
const ozet = {};
for (const t of ["hayvan", "heykel"]) { const v = Object.values(sonuclar[t]); ozet[t] = { aday: v.length, ok: v.filter((s) => s.durum === "ok").length, elenen: v.filter((s) => s.durum !== "ok").map((s) => `${s.ad} (${s.nedenler.join("; ")})`) }; }
console.log(JSON.stringify(ozet, null, 1), "istek:", istek);

if (process.argv.includes("--yaz")) {
  const { hayvanSatirNedeni } = await import(new URL("../lib/hayvan.mjs", import.meta.url).href);
  const { heykelSatirNedeni } = await import(new URL("../lib/heykel.mjs", import.meta.url).href);
  const sat = (o) => "  " + JSON.stringify(o);
  const hayvanSatirlari = HAYVAN.filter((a) => sonuclar.hayvan[a.ad]?.durum === "ok").map((a) => { const s = sonuclar.hayvan[a.ad];
    return { ad: a.ad, enAd: a.enAd, madde: s.baslik, url: s.url, alt: a.alt, bas: a.bas, basEn: a.basEn, tr: a.tr, en: a.en, gorsel: s.gorsel.dosya, lisans: s.gorsel.lisans, sahibi: s.gorsel.sahibi, w: s.gorsel.w }; });
  const heykelSatirlari = HEYKEL.filter((a) => sonuclar.heykel[a.ad]?.durum === "ok").map((a) => { const s = sonuclar.heykel[a.ad];
    return { ad: a.ad, enAd: a.enAd, sanatci: a.sanatci, olum: a.olum ?? null, anonim: !!a.anonim, yil: a.yil, yilSayi: a.yilSayi, yer: a.yer, yerEn: a.yerEn, madde: s.baslik, url: s.url, tr: a.tr, en: a.en, gorsel: s.gorsel.dosya, lisans: s.gorsel.lisans, sahibi: s.gorsel.sahibi, w: s.gorsel.w }; });
  const temiz = (satirlar, dene, tur) => satirlar.filter((x) => { const n = dene(x); if (n) console.error(`${tur} ${x.ad}: yazılmadı (satır denetimi: ${n})`); return !n; });
  const baslik = (ad, aciklama) => `// OTOMATİK ÜRETİLDİ (arac/hayvan_heykel_dogrula.mjs --yaz, ${new Date().toISOString().slice(0, 10)}): ${aciklama}\n// Her öğe aday listesinden (arac/aday/) ağdan doğrulanarak buraya alındı: Vikipedi maddesi var, "kanit" kalıpları maddenin tam metninde geçiyor, kapak görseli Commons'ta ve lisansı uygun.\n// Elle düzenlemeyin: aday listesini değiştirip aracı yeniden çalıştırın (doğrulanmamış öğe testte kırmızı verir). Yayın anında madde ve görsel lisansı YİNE denetlenir.\n`;
  fs.writeFileSync(LIB + "hayvan_veri.mjs", baslik("hayvan", "OP Hayvanlar havuzu.") + `export const HAYVANLAR = [\n${temiz(hayvanSatirlari, hayvanSatirNedeni, "hayvan").map(sat).join(",\n")}\n];\n`);
  fs.writeFileSync(LIB + "heykel_veri.mjs", baslik("heykel", "OP Sanat / Heykel havuzu.") + `export const HEYKELLER = [\n${temiz(heykelSatirlari, heykelSatirNedeni, "heykel").map(sat).join(",\n")}\n];\n`);
  console.log("yazıldı:", temiz(hayvanSatirlari, hayvanSatirNedeni, "hayvan").length, "hayvan,", temiz(heykelSatirlari, heykelSatirNedeni, "heykel").length, "heykel");
}
