// OP müfredat dosyaları (lib/mufredat/*.mjs) Vikipedi doğrulayıcısı (SALT OKUMA; istekler arası ~1 sn, başlıklar 50'şerli).
//   node arac/mufredat_dogrula.mjs                      -> tüm dosyalar, yalnız rapor
//   node arac/mufredat_dogrula.mjs op_felsefe op_mutfak -> yalnız bu hesaplar
//   node arac/mufredat_dogrula.mjs op_felsefe --yaz     -> doğrulanamayan maddeyi/dersi dosyadan ÇIKARIR (dosya JSON olarak yeniden yazılır)
//   node arac/mufredat_dogrula.mjs op_spor --kaynak     -> ek olarak motorun gerçek kaynak toplama yolunu (önce TR, TR kısaysa EN) taklit eder: kaynak metin < 600 karakter ("kaynak-yetersiz")
//                                                          ya da din/ritüel/ölüm/savaş ağırlıklı ("kaynak-hassas") ise o ders de çıkarılır (motor zaten yayında atlardı; boşa ders bırakmamak için)
// Kural: her ders için wiki_en / wiki_tr maddesi VAR, anlam ayrımı sayfası DEĞİL (yönlendirme izlenir). İki kaynaktan biri bozuksa o anahtar silinir;
// ikisi de bozuksa (ya da klasik/sabit-olmayan derste kaynak yoksa) ders çıkarılır. Boşalan seri de çıkarılır. Tür "klasik" dersler Vikipedi'ye bağlı değildir (atlanır).
import fs from "node:fs";
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
const MUF = fileURLToPath(new URL("../lib/mufredat/", import.meta.url));
const UA = "OPMufredat/1.0 (salt okuma dogrulama; OP haber hatti)";
const dur = (ms) => new Promise((r) => setTimeout(r, ms));
const argv = process.argv.slice(2), YAZ = argv.includes("--yaz"), KAYNAK = argv.includes("--kaynak");
const secili = argv.filter((a) => !a.startsWith("--"));

async function api(host, params) {
  for (let d = 0; d < 6; d++) {
    await dur(1000);
    const r = await fetch(`https://${host}/w/api.php?` + new URLSearchParams({ format: "json", formatversion: "2", ...params }), { headers: { "User-Agent": UA } });
    const t = await r.text();
    try { return JSON.parse(t); } catch { console.error("hız sınırı, bekleniyor", t.slice(0, 40)); await dur(15000 + d * 10000); }
  }
  throw new Error("api başarısız");
}

/** Başlık listesi -> Map("dil:başlık" -> {ok, neden}) */
export async function maddeleriDenetle(istenen) {
  const sonuc = new Map();
  for (const dil of ["en", "tr"]) {
    const liste = [...istenen[dil]];
    for (let i = 0; i < liste.length; i += 50) {
      const grup = liste.slice(i, i + 50);
      const j = await api(`${dil}.wikipedia.org`, { action: "query", titles: grup.join("|"), redirects: "1", prop: "info|pageprops", ppprop: "disambiguation" });
      const norm = new Map((j.query?.normalized || []).map((x) => [x.from, x.to]));
      const yon = new Map((j.query?.redirects || []).map((x) => [x.from, x.to]));
      const sayfa = new Map((j.query?.pages || []).map((p) => [p.title, p]));
      for (const b of grup) {
        let t = norm.get(b) || b; t = yon.get(t) || t;
        const p = sayfa.get(t);
        let s = { ok: true, neden: "" };
        if (!p || p.missing) s = { ok: false, neden: "madde yok" };
        else if (p.pageprops && "disambiguation" in p.pageprops) s = { ok: false, neden: "anlam ayrımı" };
        sonuc.set(`${dil}:${b}`, s);
      }
      console.error(dil, Math.min(i + 50, liste.length), "/", liste.length);
    }
  }
  return sonuc;
}

const dosyalar = readdirSync(MUF).filter((f) => /^op_[a-z0-9_]+\.mjs$/.test(f)).map((f) => f.replace(/\.mjs$/, "")).filter((h) => !secili.length || secili.includes(h));
const veri = new Map();
const istenen = { en: new Set(), tr: new Set() };
for (const h of dosyalar) {
  const m = (await import(pathToFileURL(MUF + h + ".mjs").href)).default;
  veri.set(h, m);
  for (const s of m.seriler) for (const d of s.dersler) for (const k of ["en", "tr"]) if (d.kaynak?.["wiki_" + k]) istenen[k].add(d.kaynak["wiki_" + k]);
}
const durum = await maddeleriDenetle(istenen);
const iyiAnahtarlar = (d) => ["en", "tr"].filter((dil) => d.kaynak?.["wiki_" + dil] && durum.get(`${dil}:${d.kaynak["wiki_" + dil]}`)?.ok);

/** --kaynak: motorun kaynakTopla sırası (TR önce; TR < 1200 karakterse EN de) ve eşikleri (>= 600 karakter, hassas değil). -> Map("hesap/id" -> neden) */
async function kaynakDenetle() {
  const { maddeGetir, kaynakHassasMi } = await import(new URL("../lib/konu.mjs", import.meta.url).href).then(async (k) => ({ maddeGetir: k.maddeGetir, kaynakHassasMi: k.kaynakHassasMi }));
  const onbellek = new Map();
  const getir = async (dil, b) => {
    const a = `${dil}:${b}`;
    if (!onbellek.has(a)) { await dur(1000); onbellek.set(a, await maddeGetir(dil, b).then((x) => x.extract, () => "")); }
    return onbellek.get(a);
  };
  const red = new Map();
  for (const [h, m] of veri) for (const s of m.seriler) for (const d of s.dersler) {
    if (d.tur === "klasik" || d.tur === "hayvan" || d.tur === "heykel" || d.sabit) continue;
    const iyi = iyiAnahtarlar(d), parcalar = [];
    if (iyi.includes("tr")) parcalar.push(await getir("tr", d.kaynak.wiki_tr));
    if (iyi.includes("en") && (!parcalar.length || parcalar[0].length < 1200)) parcalar.push(await getir("en", d.kaynak.wiki_en));
    const metin = parcalar.filter(Boolean).join("\n\n");
    if (metin.length < 600) red.set(`${h}/${d.id}`, `kaynak-yetersiz:${metin.length}`);
    else if (kaynakHassasMi(metin)) red.set(`${h}/${d.id}`, "kaynak-hassas");
  }
  return red;
}
const kaynakRed = KAYNAK ? await kaynakDenetle() : new Map();
let cikarilanDers = 0, cikarilanAnahtar = 0;
const rapor = [];
for (const [h, m] of veri) {
  let say = 0;
  for (const s of m.seriler) {
    s.dersler = s.dersler.filter((d) => {
      say++;
      if (d.tur === "klasik") return true;
      const k = d.kaynak || {};
      const kotu = [];
      for (const dil of ["en", "tr"]) { const b = k["wiki_" + dil]; if (b && !durum.get(`${dil}:${b}`)?.ok) kotu.push({ dil, b, neden: durum.get(`${dil}:${b}`)?.neden || "?" }); }
      const kalan = ["en", "tr"].filter((dil) => k["wiki_" + dil] && !kotu.some((x) => x.dil === dil));
      for (const x of kotu) { rapor.push(`${h}/${d.id}: ${x.dil}:${x.b} -> ${x.neden}`); if (YAZ) { delete k["wiki_" + x.dil]; cikarilanAnahtar++; } }
      if (!kalan.length) { rapor.push(`${h}/${d.id}: DERS ÇIKARILIR (doğrulanmış kaynak kalmadı)`); if (YAZ) cikarilanDers++; return !YAZ; }
      if (kaynakRed.has(`${h}/${d.id}`)) { rapor.push(`${h}/${d.id}: DERS ÇIKARILIR (${kaynakRed.get(`${h}/${d.id}`)})`); if (YAZ) cikarilanDers++; return !YAZ; }
      return true;
    });
  }
  if (YAZ) {
    m.seriler = m.seriler.filter((s) => s.dersler.length);
    fs.writeFileSync(MUF + h + ".mjs", `// ${h}: OP müfredat verisi (motor: lib/mufredat.mjs; doğrulama: arac/mufredat_dogrula.mjs). Elle düzenlenebilir; yeni ders eklemeden önce aracı çalıştırın (Vikipedi maddesi VAR olmalı).\nexport default ${JSON.stringify(m, null, 1)};\n`);
  }
  console.log(`${h}: ${say} ders denetlendi`);
}
console.log(rapor.length ? rapor.join("\n") : "tümü doğrulandı");
if (YAZ) console.log(`çıkarılan ders: ${cikarilanDers}, silinen kaynak anahtarı: ${cikarilanAnahtar}`);
