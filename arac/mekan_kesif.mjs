// MEKÂN / KAYNAK KEŞFİ (elle): bir sitenin hangi yöntemle OLGUSAL etkinlik verdiğini bulur. Saygılı hız (istekler arası >= 2 sn, robots.txt, mekân başına en çok 12 sayfa);
// bilet platformları izlenmez. Canlıya hiçbir şey yazmaz.
//   node arac/mekan_kesif.mjs [--limit=N] [--konum]            ilk keşif: arac/aday/mekanlar_sahip_20261017.json -> arac/mekanlar.json
//   node arac/mekan_kesif.mjs --sadece=17,79                   yalnız bu mekân numaralarını yeniden keşfet
//   node arac/mekan_kesif.mjs --yeniden [--butce=9]            mekanlar.json'da "yok (olay-yok)" olanları detay/site haritası aşamasıyla yeniden dene (kalan sayfa bütçesi)
//   node arac/mekan_kesif.mjs --kaynaklar                      arac/etkinlik_kaynaklari.json içindeki aktif kaynakları keşfet (yerinde günceller)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { agKur, katlaAd, mekanKesfet, mekanTara } from "../lib/mekan_etkinlik.mjs";
import { sehirKanonik } from "../lib/etkinlik.mjs";
import { etkinlikKonumlari } from "../lib/etkinlik_konum.mjs";

const burasi = dirname(fileURLToPath(import.meta.url));
const GIRDI = join(burasi, "aday", "mekanlar_sahip_20261017.json"), CIKTI = join(burasi, "mekanlar.json"), KAYNAK = join(burasi, "etkinlik_kaynaklari.json");
const arg = (ad) => process.argv.slice(2).find((x) => x === `--${ad}` || x.startsWith(`--${ad}=`));
const deger = (ad) => arg(ad)?.split("=")[1];
const limit = Number(deger("limit")) || Infinity;
const sadece = (deger("sadece") || "").split(",").filter(Boolean).map(Number);
const butce = Number(deger("butce")) || 12;

const kayitYaz = (dosya, alan, liste) => writeFileSync(dosya, JSON.stringify({ surum: 1, olusturma: new Date().toISOString(), [alan]: liste }, null, 1) + "\n", "utf8");
function kimlikler(liste) {
  const g = new Set();
  return liste.map((m) => { let id = katlaAd(m.ad).replace(/ /g, "-").slice(0, 48) || `mekan-${m.no}`; if (g.has(id)) id = `${id}-${m.no}`; g.add(id); return { ...m, id }; });
}
const keşifAlanlari = (k, r) => ({ ...k, etkinlik_sayfasi: r.etkinlik_sayfasi, sayfalar: r.sayfalar, yontem: r.yontem, ham_olay: r.hamOlay, ...(r.detay ? { detay: true, site_haritalari: r.site_haritalari || [], detay_ornek: r.detay_ornek || [] } : {}), ...(r.yontem === "yok" ? { yok_nedeni: r.neden } : {}), kesif_zaman: new Date().toISOString() });
const kesifSayfa = new Map();
async function kesfet(k, ag) {
  try { const r = await mekanKesfet(k, ag, { butce }); kesifSayfa.set(k.id, r.sayfa || 0); return r; }
  catch (e) { return { yontem: "yok", etkinlik_sayfasi: "", sayfalar: [], hamOlay: 0, neden: `hata:${String(e.message || e).slice(0, 30)}` }; }
}
function rapor(sonuc, ag, kaynakMi) {
  const calisan = sonuc.filter((m) => m.yontem !== "yok" && m.aktif !== false);
  return (async () => {
    let toplam = 0; const ret = {}, sehirEtk = {}, sehirKaynak = {}, bos = new Set(); let sayfa = 0;
    for (const m of calisan) {
      const t = await mekanTara(m, ag, Date.now(), { butce: Math.max(1, 12 - (kesifSayfa.get(m.id) || 0)) });   // aynı gün keşif + tarama toplamı mekân başına <= 12 sayfa
      sayfa += t.sayfa; toplam += t.etkinlikler.length; m.ilk_tarama = { ham: t.ham, gecerli: t.etkinlikler.length, sayfa: t.sayfa };
      for (const [n, v] of Object.entries(t.ret)) ret[n] = (ret[n] || 0) + v;
      const sehirler = new Set(t.etkinlikler.map((e) => e.sehir));
      for (const e of t.etkinlikler) sehirEtk[e.sehir] = (sehirEtk[e.sehir] || 0) + 1;
      for (const s of sehirler) sehirKaynak[s] = (sehirKaynak[s] || 0) + 1;
      console.log(`tarama ${m.ad.slice(0, 34).padEnd(34)} sayfa=${t.sayfa} ham=${t.ham} gecerli=${t.etkinlikler.length} ${JSON.stringify(t.ret)}`);
    }
    const yd = {}; for (const m of sonuc) yd[m.yontem + (m.detay ? "(detay)" : "")] = (yd[m.yontem + (m.detay ? "(detay)" : "")] || 0) + 1;
    console.log("YONTEM", JSON.stringify(yd)); console.log("SEHIR_KAYNAK(etkinlik veren)", JSON.stringify(sehirKaynak));
    console.log("ILK_TARAMA_ETKINLIK", toplam, JSON.stringify(sehirEtk), "RET", JSON.stringify(ret), "SAYFA", sayfa);
    const nedenler = {}; for (const m of sonuc) if (m.yontem === "yok") nedenler[m.yok_nedeni] = (nedenler[m.yok_nedeni] || 0) + 1;
    console.log("YOK_NEDENLERI", JSON.stringify(nedenler));
  })();
}

async function main() {
  const ag = agKur({ log: console.log });
  if (arg("kaynaklar")) {
    const j = JSON.parse(readFileSync(KAYNAK, "utf8"));
    const sonuc = j.kaynaklar;
    for (const k of sonuc) {
      if (k.aktif === false || !k.web) continue;
      const r = await kesfet(k, ag);
      Object.assign(k, keşifAlanlari(k, r));
      if (r.yontem === "yok") { k.aktif = false; k.neden = `keşif: yapılandırılmış etkinlik verisi bulunamadı (${r.neden})`; }
      kayitYaz(KAYNAK, "kaynaklar", sonuc);
      console.log(`${k.id.padEnd(28)} ${r.yontem.padEnd(6)} ${r.yontem === "yok" ? r.neden : `ham=${r.hamOlay} ${r.etkinlik_sayfasi}`}${r.detay ? " [detay]" : ""}`);
    }
    await rapor(sonuc.filter((k) => k.aktif !== false && k.web), ag, true); kayitYaz(KAYNAK, "kaynaklar", sonuc);
    return;
  }
  if (arg("yeniden")) {
    const j = JSON.parse(readFileSync(CIKTI, "utf8"));
    const sonuc = j.mekanlar;
    for (const k of sonuc) {
      if (k.aktif === false || k.yontem !== "yok" || !/^(olay-yok|detay-olay-yok)$/.test(k.yok_nedeni || "")) continue;
      const r = await kesfet(k, ag);
      Object.assign(k, keşifAlanlari({ ...k, yok_nedeni: undefined }, r)); kayitYaz(CIKTI, "mekanlar", sonuc);
      console.log(`${String(k.no).padStart(3)} ${k.ad.slice(0, 34).padEnd(34)} ${r.yontem.padEnd(6)} ${r.yontem === "yok" ? r.neden : `ham=${r.hamOlay} ${r.etkinlik_sayfasi}`}${r.detay ? " [detay]" : ""}`);
    }
    await rapor(sonuc, ag); kayitYaz(CIKTI, "mekanlar", sonuc);
    return;
  }
  let girdi = kimlikler(JSON.parse(readFileSync(GIRDI, "utf8"))).slice(0, limit);
  if (sadece.length) girdi = girdi.filter((m) => sadece.includes(m.no));
  const eski = existsSync(CIKTI) ? new Map(JSON.parse(readFileSync(CIKTI, "utf8")).mekanlar.map((m) => [m.id, m])) : new Map();
  const sonuc = sadece.length && existsSync(CIKTI) ? JSON.parse(readFileSync(CIKTI, "utf8")).mekanlar.filter((m) => !sadece.includes(m.no)) : [];
  for (const m of girdi) {
    const il = /Türkiye/.test(m.sehir) ? "" : sehirKanonik(m.sehir) || m.sehir;
    const k = { id: m.id, no: m.no, ad: m.ad, il, sehir_notu: /Türkiye/.test(m.sehir) ? m.sehir : undefined, web: m.web, kategori: m.kategori };
    const r = await kesfet({ ...k }, ag);
    const kayit = keşifAlanlari(k, r);
    if (eski.get(m.id)?.koordinat) kayit.koordinat = eski.get(m.id).koordinat;
    sonuc.push(kayit); sonuc.sort((a, b) => a.no - b.no); kayitYaz(CIKTI, "mekanlar", sonuc);
    console.log(`${String(m.no).padStart(3)} ${m.ad.slice(0, 34).padEnd(34)} ${r.yontem.padEnd(6)} ${r.yontem === "yok" ? r.neden : `ham=${r.hamOlay} ${r.etkinlik_sayfasi}`}`);
  }
  if (arg("konum")) {
    const sahte = sonuc.filter((m) => m.il && !m.koordinat).map((m) => ({ ad: m.ad, sehir: m.il, mekan: m.ad, _m: m }));
    const k = await etkinlikKonumlari({ etkinlikler: sahte, ust: 2 * sahte.length + 2, aralikMs: 1100, log: console.log });
    for (const e of sahte) if (e.konum) e._m.koordinat = { enlem: e.konum.enlem, boylam: e.konum.boylam };
    for (const e of sahte) delete e._m; kayitYaz(CIKTI, "mekanlar", sonuc);
    console.log(`konum: ${JSON.stringify(k)} koordinatli=${sonuc.filter((m) => m.koordinat).length}`);
  }
  await rapor(sadece.length ? sonuc.filter((m) => sadece.includes(m.no)) : sonuc, ag); kayitYaz(CIKTI, "mekanlar", sonuc);
}
main().catch((e) => { console.error("keşif başarısız:", String(e.message || e).slice(0, 120)); process.exit(1); });
