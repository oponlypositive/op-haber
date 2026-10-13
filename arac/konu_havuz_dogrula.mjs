// Havuz genişletme aracı (Vikipedi + Commons salt okuma; 50 başlık/istek, istekler arası 3,5 sn). Kullanım: aday/<havuz>.txt satırı ekle -> `node arac/konu_havuz_dogrula.mjs` (dogrulandi.json) -> `node arac/konu_havuz_uret.mjs` (lib/konu_havuz.mjs yeniden yazılır). Satır: `[alt_konu: ]Ad[>TR madde][ @EN madde]`.
// Aday havuzlarını Vikipedi (TR/EN) + Commons'ta toplu (50'şer) doğrular. Salt okuma.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const BURASI = fileURLToPath(new URL("./", import.meta.url));
const UA = "OPKonuHesaplari/1.0 (salt okuma dogrulama; OP haber hatti)";
const dur = (ms) => new Promise((r) => setTimeout(r, ms));
let istek = 0;
async function api(host, params) {
  for (let d = 0; d < 5; d++) {
    await dur(3500); istek++;
    const u = `https://${host}/w/api.php?` + new URLSearchParams({ format: "json", formatversion: "2", ...params });
    const r = await fetch(u, { headers: { "User-Agent": UA } });
    const t = await r.text();
    try { return JSON.parse(t); } catch { console.error("hız sınırı, bekleniyor"); await dur(25000); }
  }
  throw new Error("api başarısız");
}
const HAVUZLAR = (process.env.HAVUZ || "mutfak,icecek,oyun,ronesans,antik").split(",");
const SATIR = /^(?:([a-z-]+):\s*)?(.+?)(?:>([^@]+?))?(?:\s*@(.+))?$/;
const maddeler = [];
for (const h of HAVUZLAR) {
  const gorulen = new Set();
  for (const ham of fs.readFileSync(BURASI+`aday/${process.env.DOSYA || h}.txt`, "utf8").split(/\r?\n/)) {
    const s = ham.trim(); if (!s) continue;
    const m = s.match(SATIR); if (!m) { console.error("ayrıştırılamadı", s); continue; }
    const alt = m[1] || "", ad = m[2].trim(), tr = (m[3] || m[2]).trim(), en = (m[4] || "").trim();
    if (gorulen.has(ad)) continue; gorulen.add(ad);
    maddeler.push({ havuz: h, alt, ad, tr, en });
  }
}
console.error("aday:", maddeler.length);

async function toplu(host, basliklar, hedefDil) {
  const sonuc = new Map();
  const tekil = [...new Set(basliklar)];
  for (let i = 0; i < tekil.length; i += 50) {
    const grup = tekil.slice(i, i + 50);
    const j = await api(host, { action: "query", redirects: "1", titles: grup.join("|"), prop: "info|pageimages|pageprops", piprop: "name", ppprop: "disambiguation", pilimit: "50" });
    // ikinci istek: dil bağlantısı (ayrı, çünkü llimit çakışmasın)
    const lj = await api(host, { action: "query", redirects: "1", titles: grup.join("|"), prop: "langlinks", lllang: hedefDil, lllimit: "500" });
    const norm = new Map((j.query?.normalized || []).map((x) => [x.from, x.to]));
    const yon = new Map((j.query?.redirects || []).map((x) => [x.from, x.to]));
    const sayfa = new Map((j.query?.pages || []).map((p) => [p.title, p]));
    const ll = new Map((lj.query?.pages || []).map((p) => [p.title, (p.langlinks || [])[0]?.title || ""]));
    for (const b of grup) {
      let t = norm.get(b) || b; t = yon.get(t) || t;
      const p = sayfa.get(t);
      if (!p || p.missing) { sonuc.set(b, { var: false }); continue; }
      sonuc.set(b, { var: true, baslik: p.title, uzunluk: p.length || 0, ayrim: !!p.pageprops && "disambiguation" in p.pageprops, resim: p.pageimage || "", diger: ll.get(p.title) || "" });
    }
    console.error(host, i + grup.length, "/", tekil.length);
  }
  return sonuc;
}

const trSonuc = await toplu("tr.wikipedia.org", maddeler.map((m) => m.tr), "en");
const enAdaylari = [];
for (const m of maddeler) {
  const t = trSonuc.get(m.tr);
  const trIyi = t?.var && !t.ayrim && t.uzunluk >= 2500;
  m.trIyi = !!trIyi;
  if (!trIyi) { const e = m.en || t?.diger || ""; if (e) { m.enAd = e; enAdaylari.push(e); } }
  else if (m.en) { m.enAd = m.en; }          // TR iyi ise de EN adı not edilir (doğrulanmaz)
}
const enSonuc = await toplu("en.wikipedia.org", enAdaylari, "tr");

const sonMaddeler = [];
for (const m of maddeler) {
  const t = trSonuc.get(m.tr), e = m.enAd ? enSonuc.get(m.enAd) : null;
  const trIyi = m.trIyi, enIyi = !!(e?.var && !e.ayrim && e.uzunluk >= 4000);
  if (!trIyi && !enIyi) { sonMaddeler.push({ ...m, durum: "yok", neden: t?.var ? (t.ayrim ? "tr-anlam-ayrimi" : `tr-kisa:${t.uzunluk}`) : "tr-yok", enNeden: e ? (e.var ? (e.ayrim ? "en-ayrim" : `en-kisa:${e.uzunluk}`) : "en-yok") : "en-aday-yok" }); continue; }
  const resim = (trIyi && t.resim) || (enIyi && e.resim) || "";
  const resimWiki = (trIyi && t.resim) ? "tr" : (enIyi && e.resim ? "en" : "");
  sonMaddeler.push({ ...m, durum: "ok", trAd: trIyi ? t.baslik : "", enAd: enIyi ? e.baslik : "", trUz: trIyi ? t.uzunluk : 0, enUz: enIyi ? e.uzunluk : 0, resim, resimWiki });
}

// Commons görsel denetimi
const dosyalar = [...new Set(sonMaddeler.filter((m) => m.resim).map((m) => m.resim))];
const gHarita = new Map();
for (let i = 0; i < dosyalar.length; i += 50) {
  const grup = dosyalar.slice(i, i + 50);
  const j = await api("commons.wikimedia.org", { action: "query", titles: grup.map((d) => "File:" + d).join("|"), prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "900" });
  const norm = new Map((j.query?.normalized || []).map((x) => [x.to, x.from]));
  for (const p of j.query?.pages || []) {
    const ad = (p.title || "").replace(/^File:/i, "");
    const ii = (p.imageinfo || [])[0];
    if (!ii || p.missing) continue;
    const md = ii.extmetadata || {};
    gHarita.set(ad.replace(/_/g, " "), { lisans: md.LicenseShortName?.value || "", mime: ii.mime, w: ii.width || 0, sahibi: (md.Artist?.value || "").replace(/<[^>]+>/g, "").slice(0, 80) });
  }
  console.error("commons", i + grup.length, "/", dosyalar.length);
}
for (const m of sonMaddeler) {
  if (!m.resim) continue;
  const g = gHarita.get(m.resim.replace(/_/g, " "));
  m.gorsel = g ? { ...g } : null;
}
fs.writeFileSync(BURASI+(process.env.CIKTI || "dogrulandi.json"), JSON.stringify(sonMaddeler, null, 1));
const ozet = {};
for (const m of sonMaddeler) { const k = m.havuz; ozet[k] ||= { aday: 0, ok: 0, resimli: 0 }; ozet[k].aday++; if (m.durum === "ok") ozet[k].ok++; if (m.gorsel) ozet[k].resimli++; }
console.log(JSON.stringify(ozet), "istek:", istek);
