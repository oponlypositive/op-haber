// OP Sohbet fotoğraf listesi (lib/sohbet_gorsel_veri.mjs) Commons doğrulayıcısı (SALT OKUMA; istekler arası ~1,5 sn, 40'lı gruplar).
//   node arac/sohbet_gorsel_dogrula.mjs         -> yalnız rapor
//   node arac/sohbet_gorsel_dogrula.mjs --yaz   -> doğrulananların meta verisini (sahibi, lisans, lisans_url, kaynak_url, w, h) canlı veriden TAZELER; doğrulanamayanı listeden ÇIKARIR (dosya yeniden yazılır)
// Her fotoğraf için: (1) Commons'ta dosya VAR, (2) jpeg, (3) orijinal genişlik >= 1200 px, (4) lisans CC0 / Public domain / CC BY / CC BY-SA (NC/ND yok),
// (5) dosya adında harita/logo/bayrak/afiş/portre gibi yasak sözcük yok. Liste kuralları: sehir ya "genel" ya da şehir anahtarı; hava acik|bulutlu|notr; her şehirde en az 4, toplam en az 60 fotoğraf.
// Görsel içerik (insan yüzü yakın planı yok, yazı/logo baskın değil) editör denetimidir: liste elle bakılarak kuruldu; bu araç hukuki/teknik koşulları ağdan doğrular.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const VERI = fileURLToPath(new URL("../lib/sohbet_gorsel_veri.mjs", import.meta.url));
const UA = "OPSohbetGorsel/1.0 (salt okuma dogrulama; OP haber hatti)";
const dur = (ms) => new Promise((r) => setTimeout(r, ms));
const YAZ = process.argv.includes("--yaz");
const { SOHBET_GORSELLERI: LISTE } = await import(new URL("../lib/sohbet_gorsel_veri.mjs", import.meta.url).href);
const { lisansOk } = await import(new URL("../lib/gorsel.mjs", import.meta.url).href);
const YASAK_AD = /map|diagram|logo|flag|coat[ _]of[ _]arms|icon|banner|poster|portrait|stamp|svg|sign\b|statue|mosque|camii|church/i;
const HAVA = new Set(["acik", "bulutlu", "notr"]);
const SEHIRLER = ["istanbul", "ankara", "izmir", "antalya", "bursa"];

async function api(params) {
  for (let d = 0; d < 6; d++) {
    await dur(1500);
    const r = await fetch("https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({ format: "json", formatversion: "2", ...params }), { headers: { "User-Agent": UA } });
    const t = await r.text();
    try { return JSON.parse(t); } catch { console.error("hız sınırı, bekleniyor"); await dur(15000 + d * 10000); }
  }
  throw new Error("api başarısız");
}
const duz = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim().slice(0, 80);

const canli = new Map();
for (let i = 0; i < LISTE.length; i += 40) {
  const grup = LISTE.slice(i, i + 40);
  const j = await api({ action: "query", titles: grup.map((g) => "File:" + g.dosya).join("|"), prop: "imageinfo", iiprop: "url|extmetadata|size|mime" });
  const norm = new Map((j.query?.normalized || []).map((x) => [x.to, x.from]));
  for (const p of j.query?.pages || []) {
    const ii = (p.imageinfo || [])[0]; if (!ii || p.missing) continue;
    const md = ii.extmetadata || {};
    canli.set((norm.get(p.title) || p.title).replace(/^File:/i, "").replace(/_/g, " "), { mime: ii.mime, w: ii.width || 0, h: ii.height || 0, lisans: md.LicenseShortName?.value || "", lisans_url: md.LicenseUrl?.value || "", sahibi: duz(md.Artist?.value) || "Unknown", kaynak_url: ii.descriptionurl || "" });
  }
  console.error("doğrulandı", Math.min(i + 40, LISTE.length), "/", LISTE.length);
}
const rapor = [], iyi = [];
for (const g of LISTE) {
  const c = canli.get(g.dosya.replace(/_/g, " ")), n = [];
  if (!c) n.push("dosya yok");
  else {
    if (c.mime !== "image/jpeg") n.push(`mime ${c.mime}`);
    if (c.w < 1200) n.push(`genişlik ${c.w}`);
    if (!lisansOk(c.lisans)) n.push(`lisans ${c.lisans}`);
  }
  if (YASAK_AD.test(g.dosya)) n.push("dosya adı yasak sözcük");
  if (g.sehir !== "genel" && !SEHIRLER.includes(g.sehir)) n.push(`şehir ${g.sehir}`);
  if (!HAVA.has(g.hava)) n.push(`hava ${g.hava}`);
  if (n.length) rapor.push(`${g.dosya}: ${n.join(", ")}`); else iyi.push({ ...g, w: c.w, h: c.h, sahibi: c.sahibi, lisans: c.lisans, lisans_url: c.lisans_url, kaynak_url: c.kaynak_url });
}
const say = {}; for (const g of iyi) say[g.sehir] = (say[g.sehir] || 0) + 1;
console.log(`liste ${LISTE.length}, doğrulanan ${iyi.length}`, JSON.stringify(say));
for (const s of SEHIRLER) if ((say[s] || 0) < 4) rapor.push(`UYARI: ${s} için ${say[s] || 0} fotoğraf (en az 4 gerekli)`);
if (iyi.length < 60) rapor.push(`UYARI: toplam ${iyi.length} (en az 60 gerekli)`);
console.log(rapor.length ? rapor.join("\n") : "tümü doğrulandı");
if (YAZ) {
  fs.writeFileSync(VERI, `// OTOMATİK ÜRETİLDİ (arac/sohbet_gorsel_dogrula.mjs --yaz): OP Sohbet fotoğraf listesi (Wikimedia Commons; CC0 / Public domain / CC BY / CC BY-SA, jpeg, >= 1200 px).\n// sehir: istanbul|ankara|izmir|antalya|bursa|genel; hava: acik|bulutlu|notr (yağmurlu günde acik seçilmez); tema: deniz|park|sehir|ev. Görseller elle bakılarak seçildi: insan yüzü yakın planı yok, yazı/logo baskın değil.\n// Yeni fotoğraf eklemek için yalnız {dosya, sehir, yer, hava, tema} yazın ve aracı --yaz ile çalıştırın (meta veri canlı doldurulur, uygunsuz olan çıkarılır). Yayın anında lisans yine denetlenir.\nexport const SOHBET_GORSELLERI = [\n${iyi.map((g) => "  " + JSON.stringify(g)).join(",\n")},\n];\n`);
  console.log("yazıldı:", VERI);
}
