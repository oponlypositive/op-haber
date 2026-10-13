#!/usr/bin/env node
// OP haber hattı: kaynakları tara -> görülenleri ele -> ön eleme -> doğrulama -> model ile yaz -> görsel -> haber-yukle.
// Çalıştırma: `node hat.mjs` (gerçek; ortam değişkenleri gerekir)  |  `node hat.mjs --kuru` (model ve yayın yok, salt okuma).
// Günlüğe başlık ya da gizli değer yazılmaz (depo herkese açık; Actions günlükleri de görünür). --kuru yerelde örnek başlık gösterir.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ayarOku } from "./lib/ayar.mjs";
import { baglantiOzeti, kaynaklariTara } from "./lib/rss.mjs";
import { dogrulandiMi, gorulenSinifi, onEleme, tekrarlariEle } from "./lib/on_eleme.mjs";
import { kaynakMetni, sayfaEslesiyor } from "./lib/sayfa.mjs";
import { KotaDoldu, ModelHatasi, modelKur } from "./lib/model.mjs";
import { haberYaz } from "./lib/yaz.mjs";
import { gorselBul } from "./lib/gorsel.mjs";
import { EMOJI } from "./lib/dogrula.mjs";
import { bulutKur } from "./lib/bulut.mjs";

const burasi = dirname(fileURLToPath(import.meta.url));
const dur = (ms) => new Promise((r) => setTimeout(r, ms));

/** Bir tur. Bağımlılıklar parametreyle gelir (testte taklit edilir). -> özet nesnesi */
export async function turCalistir({ ayar, kaynaklar, bulut, model, fetchFn = fetch, bekleFn = dur, simdi = () => Date.now(), log = console.log, tarama }) {
  const baslangic = simdi();
  const ozet = { aday: 0, yeniAday: 0, onElemeGecen: 0, elenen: 0, bekleyenKaynak: 0, bekleyenGorsel: 0, yayinlanan: 0, modelCagri: 0, kota: 0, sureSn: 0, red: { uygunDegil: 0, rakam: 0, dil: 0, filtre: 0, diger: 0 }, durus: "tamam", ornekBaslik: [] };
  const isaretler = [];
  const isaretle = (a, durum, neden, deneme = 0, yuk = null) => isaretler.push({ ozet: a.hash, durum, neden: String(neden).slice(0, 120), deneme, ...(yuk ? { yuk } : {}) });

  // (a) tara
  const { adaylar: ham, hatalar } = tarama || await kaynaklariTara(kaynaklar, { bingAcik: ayar.bingAcik, fetchFn });
  if (hatalar.length) log(`kaynak hataları (${hatalar.length}): ${hatalar.join("; ")}`);
  const benzersiz = new Map();
  for (const a of ham) { const o = baglantiOzeti(a.link); if (!benzersiz.has(o)) benzersiz.set(o, { ...a, hash: o }); }
  const hepsi = [...benzersiz.values()];
  ozet.aday = hepsi.length;

  // (b) görülenleri ele
  const kayitlar = await bulut.bilinenler(hepsi.map((a) => a.hash));
  const aktif = [];
  for (const a of hepsi) {
    const kayit = kayitlar.get(a.hash), sinif = gorulenSinifi(kayit);
    if (sinif === "atla") continue;
    aktif.push({ ...a, kayit, bekleyen: sinif === "bekleyen", deneme: kayit?.deneme || 0 });
  }
  ozet.yeniAday = aktif.filter((a) => !a.bekleyen).length;

  // (c) ön eleme (bekleyenler zaten geçmişti; tazelik yine de denetlenir)
  const gecen = [];
  for (const a of aktif) {
    const e = onEleme(a, { simdi: simdi(), tazelikSaat: ayar.tazelikSaat });
    if (e.ok) gecen.push(a);
    else {
      ozet.elenen++;
      if (!/^(eski|tarih)/.test(e.neden)) isaretle(a, "elendi", `on-eleme:${e.neden}`);      // eskiler işaretlenmez: akıştan düşer
      else if (a.bekleyen) isaretle(a, "elendi", `on-eleme:${e.neden}`);
    }
  }
  const sirali = tekrarlariEle(gecen.sort((x, y) => Date.parse(y.zaman) - Date.parse(x.zaman)));
  ozet.onElemeGecen = sirali.length;
  if (ayar.kuru) ozet.ornekBaslik = sirali.slice(0, 3).map((a) => `[${a.kaynak}] ${a.baslik}`);

  const bitir = async () => { if (!ayar.kuru) await bulut.isaretle(isaretler.splice(0)).catch((e) => log(`işaretleme hatası: ${e.message}`)); };
  if (ayar.kuru) {
    // Kuru: model çağrısı, kaynak sayfası indirme ve yayın YOK. Doğrulama kararı gösterilir.
    for (const a of sirali) if (!dogrulandiMi(a, hepsi, ayar.guvenilir).ok) ozet.bekleyenKaynak++;
    ozet.durus = "kuru";
    ozet.sureSn = Math.round((simdi() - baslangic) / 1000);
    return ozet;
  }

  // (d-h) işle
  const robots = new Map();
  let modelCagriSayisi = 0;
  for (const a of sirali) {
    if (ozet.yayinlanan >= ayar.turBasinaEn) { ozet.durus = "tur-siniri"; break; }
    if (simdi() - baslangic > ayar.turSureSn * 1000) { ozet.durus = "sure-doldu"; break; }
    if (modelCagriSayisi >= ayar.turBasinaEn * 2) { ozet.durus = "cagri-siniri"; break; }
    try {
      let haber = a.kayit?.yuk && a.kayit.durum === "bekliyor_gorsel" ? a.kayit.yuk : null;
      if (!haber) {
        const d = dogrulandiMi(a, hepsi, ayar.guvenilir);
        if (!d.ok) {
          if (a.deneme + 1 >= ayar.kaynakDenemeUst) { isaretle(a, "elendi", "ikinci kaynak bulunamadi"); ozet.elenen++; }
          else { isaretle(a, "bekliyor_kaynak", d.neden, a.deneme + 1); ozet.bekleyenKaynak++; }
          continue;
        }
        const s = await kaynakMetni(a.link, { fetchFn, robotsOnbellek: robots });
        if (s.durum === "robots") { isaretle(a, "elendi", "robots"); ozet.elenen++; continue; }
        const sayfa = s.metin && sayfaEslesiyor(s.metin, a.baslik) ? s.metin : "";
        if (!sayfa && s.durum.startsWith("hata") && (a.ozet || "").length < 250) continue;   // geçici erişim sorunu: işaretlemeden sonraki tura bırak
        modelCagriSayisi++; ozet.modelCagri++;
        const y = await haberYaz(model, a, sayfa);
        await bekleFn(ayar.geminiBeklemeMs);
        if (y.durum !== "ok") { ozet.red[redSinifi(y.neden)]++; isaretle(a, "elendi", y.neden); ozet.elenen++; continue; }
        haber = {
          id: "h" + a.hash.slice(0, 14), ...y.haber, emoji: EMOJI[y.haber.kategori], kaynak: a.kaynak, link: a.link,
          zaman: a.zaman, model: y.saglayici,
        };
      }
      // görsel
      let g = null;
      const gb = await gorselBul(haber, { model, pixabayAnahtar: ayar.pixabayAnahtar, fetchFn, bekleFn });
      g = gb.sonuc;
      if (!g && !ayar.gorselsizYayin) {
        const deneme = a.deneme + 1;
        if (deneme >= ayar.gorselDenemeUst) { isaretle(a, "elendi", "gorsel bulunamadi"); ozet.elenen++; }
        else { isaretle(a, "bekliyor_gorsel", gb.notlar.join("|").slice(0, 100), deneme, haber); ozet.bekleyenGorsel++; }
        continue;
      }
      const sonuc = await bulut.yayinla(haber, a.hash, g);
      if (sonuc.durum === "eklendi" || sonuc.durum === "var") {
        ozet.yayinlanan += sonuc.durum === "eklendi" ? 1 : 0;
        isaretle(a, "yayinlandi", sonuc.durum);
      } else { isaretle(a, "elendi", `yayin-red:${sonuc.neden || "?"}`); ozet.elenen++; }
    } catch (e) {
      if (e instanceof KotaDoldu) { ozet.durus = "kota"; ozet.kota++; log("model kotası/hız sınırı doldu: tur zarifçe bitiriliyor"); break; }
      if (e instanceof ModelHatasi) { ozet.durus = "model-hatasi"; log(`model hatası: ${e.message}`); break; }
      log(`aday atlandı (beklenmeyen hata): ${String(e.message || e).slice(0, 80)}`);
    }
  }
  await bitir();
  ozet.sureSn = Math.round((simdi() - baslangic) / 1000);
  return ozet;
}

/** Model ret nedenini özet kırılımı için sınıflar (başlık/gizli değer yok). */
export function redSinifi(neden) {
  const n = String(neden || "");
  if (/uygun (değil|bulmadı)/.test(n)) return "uygunDegil";
  if (/rakam/.test(n)) return "rakam";
  if (/dil sezgisi/.test(n)) return "dil";
  if (/ikinci filtre|kapısı|engelledi/.test(n)) return "filtre";
  return "diger";
}

export function ozetSatiri(o) {
  const r = o.red || {};
  return `ozet: taranan=${o.aday} yeni=${o.yeniAday} onEleme=${o.onElemeGecen} modelCagri=${o.modelCagri} ` +
    `modelRed=${(r.uygunDegil || 0) + (r.rakam || 0) + (r.dil || 0) + (r.filtre || 0) + (r.diger || 0)}(uygunDegil=${r.uygunDegil || 0},rakam=${r.rakam || 0},dil=${r.dil || 0},filtre=${r.filtre || 0},diger=${r.diger || 0}) ` +
    `elenen=${o.elenen} bekleyenGorsel=${o.bekleyenGorsel} bekleyenKaynak=${o.bekleyenKaynak} yayinlanan=${o.yayinlanan} kota429=${o.kota || 0} sure=${o.sureSn || 0}s durus=${o.durus}`;
}

async function main() {
  const ayar = ayarOku();
  const kaynaklar = JSON.parse(readFileSync(join(burasi, "kaynaklar.json"), "utf8"));
  if (!ayar.kuru) {
    const eksik = [["GEMINI_API_KEY", ayar.geminiAnahtar], ["SUPABASE_FN_URL", ayar.fnUrl], ["HABER_YUKLE_ANAHTARI", ayar.yukleAnahtari]].filter(([, v]) => !v).map(([k]) => k);
    if (eksik.length) { console.error(`Eksik ortam değişkenleri: ${eksik.join(", ")}`); process.exit(2); }
    if (!/^https:\/\//.test(ayar.fnUrl)) { console.error("SUPABASE_FN_URL https:// ile başlamalı"); process.exit(2); }
  }
  const bulut = ayar.kuru ? { bilinenler: async () => new Map(), isaretle: async () => ({ yazildi: 0 }), yayinla: async () => ({ durum: "taklit" }) }
    : bulutKur({ fnUrl: ayar.fnUrl, anahtar: ayar.yukleAnahtari });
  const model = ayar.kuru ? { yaz: async () => { throw new Error("kuru modda model çağrılmaz"); } } : modelKur(ayar);
  try {
    const o = await turCalistir({ ayar, kaynaklar, bulut, model });
    console.log(ozetSatiri(o));
    if (ayar.kuru) { console.log("[kuru] model ve yayın TAKLİT: hiçbir çağrı yapılmadı. Örnek başlıklar:"); o.ornekBaslik.forEach((b) => console.log("  - " + b)); }
  } catch (e) {
    console.error(`tur başarısız: ${String(e.message || e).slice(0, 120)}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
