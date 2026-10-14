// OP huzur/yaşam müfredatı Vikipedi + Commons doğrulayıcısı (SALT OKUMA; istekler arası ~2,5 sn, başlıklar 50'şerli).
//   node arac/mufredat_huzur_dogrula.mjs   -> arac/dogrulandi_mufredat_huzur.json ve konsol özeti (elenen başlıklar listelenir)
// Doğrulama: (1) her dersin kaynak.wiki_en / wiki_tr maddesi var; (2) yönlendirme (redirect) değil; (3) anlam ayrımı sayfası değil.
// Dersin gorsel.dosya'sı varsa Commons'ta: jpeg, genişlik >= 900, lisans CC0 / PD / CC BY / CC BY-SA (lib/gorsel.mjs lisansOk).
// Başlık doğrulanamayan ders müfredat dosyasından ÇIKARILMALIDIR (test/mufredat_huzur.test.mjs her kaynağın "ok" olmasını ister).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const BURASI = fileURLToPath(new URL("./", import.meta.url));
const MUF = new URL("../lib/mufredat/", import.meta.url);
const HESAPLAR = ["op_meditasyon", "op_yoga", "op_gelisim", "op_saglikli", "op_hareket"];
const UA = "OPMufredatHuzur/1.0 (salt okuma dogrulama; OP haber hatti)";
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

const dersler = [];
for (const h of HESAPLAR) {
  const m = (await import(new URL(h + ".mjs", MUF).href)).default;
  for (const s of m.seriler) for (const d of s.dersler) dersler.push({ hesap: h, ...d });
}
const istenen = { en: new Set(), tr: new Set() };
for (const d of dersler) for (const k of ["en", "tr"]) if (d.kaynak?.["wiki_" + k]) istenen[k].add(d.kaynak["wiki_" + k]);

const basliklar = {};
for (const k of ["en", "tr"]) {
  const liste = [...istenen[k]];
  for (let i = 0; i < liste.length; i += 50) {
    const grup = liste.slice(i, i + 50);
    const j = await api(`${k}.wikipedia.org`, { action: "query", titles: grup.join("|"), prop: "info|pageprops", ppprop: "disambiguation" });
    const norm = new Map((j.query?.normalized || []).map((x) => [x.from, x.to]));
    const sayfa = new Map((j.query?.pages || []).map((p) => [p.title, p]));
    for (const b of grup) {
      const p = sayfa.get(norm.get(b) || b);
      const s = { durum: "ok", neden: "" };
      if (!p || p.missing) { s.durum = "yok"; s.neden = "madde yok"; }
      else if (p.redirect) { s.durum = "yok"; s.neden = "yönlendirme"; }
      else if (p.pageprops && "disambiguation" in p.pageprops) { s.durum = "yok"; s.neden = "anlam ayrımı"; }
      else s.url = `https://${k}.wikipedia.org/wiki/${encodeURIComponent((p.title || b).replace(/ /g, "_"))}`;
      basliklar[`${k}:${b}`] = s;
    }
  }
}
// yönlendirmelerin hedefini öner (yalnız rapor için)
for (const k of ["en", "tr"]) {
  const yon = Object.entries(basliklar).filter(([a, s]) => a.startsWith(k + ":") && s.neden === "yönlendirme").map(([a]) => a.slice(3));
  for (let i = 0; i < yon.length; i += 50) {
    const grup = yon.slice(i, i + 50);
    const j = await api(`${k}.wikipedia.org`, { action: "query", titles: grup.join("|"), redirects: "1", prop: "info" });
    for (const r of j.query?.redirects || []) basliklar[`${k}:${r.from}`].hedef = r.to;
  }
}

// görsel (isteğe bağlı) denetimi
const { lisansOk, yasakliMi } = await import(new URL("../lib/gorsel.mjs", import.meta.url).href);
const gorseller = {};
const dosyalar = [...new Set(dersler.filter((d) => d.gorsel?.dosya).map((d) => d.gorsel.dosya))];
for (let i = 0; i < dosyalar.length; i += 40) {
  const grup = dosyalar.slice(i, i + 40);
  const j = await api("commons.wikimedia.org", { action: "query", titles: grup.map((x) => "File:" + x).join("|"), prop: "imageinfo", iiprop: "url|extmetadata|size|mime" });
  for (const p of j.query?.pages || []) {
    const ad = p.title.replace(/^File:/i, "").replace(/_/g, " "), ii = (p.imageinfo || [])[0];
    const ned = [];
    if (!ii || p.missing) ned.push("commons dosyası yok");
    else {
      const lis = ii.extmetadata?.LicenseShortName?.value || "";
      if (!lisansOk(lis)) ned.push(`lisans: ${lis || "yok"}`);
      if (ii.mime !== "image/jpeg") ned.push(`tür: ${ii.mime}`);
      if ((ii.width || 0) < 900) ned.push(`çözünürlük: ${ii.width}px`);
      if (yasakliMi(ad)) ned.push("dosya adı uygunsuz anahtar");
      gorseller[ad] = { durum: ned.length ? "yok" : "ok", neden: ned.join("; "), lisans: lis, w: ii.width, kaynak_url: ii.descriptionurl || "" };
      continue;
    }
    gorseller[ad] = { durum: "yok", neden: ned.join("; ") };
  }
}

fs.writeFileSync(BURASI + "dogrulandi_mufredat_huzur.json", JSON.stringify({ tarih: new Date().toISOString().slice(0, 10), basliklar, gorseller }, null, 1));
const ozet = {};
for (const h of HESAPLAR) {
  const l = dersler.filter((d) => d.hesap === h);
  const bad = l.filter((d) => ["en", "tr"].some((k) => d.kaynak?.["wiki_" + k] && basliklar[`${k}:${d.kaynak["wiki_" + k]}`].durum !== "ok"));
  ozet[h] = { ders: l.length, sorunlu: bad.map((d) => d.id + " [" + ["en", "tr"].filter((k) => d.kaynak?.["wiki_" + k] && basliklar[`${k}:${d.kaynak["wiki_" + k]}`].durum !== "ok").map((k) => `${k}:${d.kaynak["wiki_" + k]} -> ${basliklar[`${k}:${d.kaynak["wiki_" + k]}`].neden}${basliklar[`${k}:${d.kaynak["wiki_" + k]}`].hedef ? " => " + basliklar[`${k}:${d.kaynak["wiki_" + k]}`].hedef : ""}`).join(" | ") + "]") };
}
console.log(JSON.stringify(ozet, null, 1), "istek:", istek);
