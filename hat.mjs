#!/usr/bin/env node
// OP haber hattı: kaynakları tara -> görülenleri ele -> ön eleme -> ÖZEL İŞLER (alıntı/gökbilim, ayrı bütçe) -> doğrulama -> model ile yaz -> görsel -> haber-yukle.
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
import { haberYaz, redKodu } from "./lib/yaz.mjs";
import { dilUygun } from "./lib/dogrula.mjs";
import { gorselBul } from "./lib/gorsel.mjs";
import { alanDengele, alanKalan } from "./lib/alanlar.mjs";
import { ozelIsleriCalistir, ozelOzetMetni } from "./lib/ozel.mjs";
import { haberKur, hazirGorselHazirla } from "./lib/haber_yap.mjs";
import { bulutKur } from "./lib/bulut.mjs";

const burasi = dirname(fileURLToPath(import.meta.url));
const dur = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Ön sıralama puanı (model çağrısı HARCAMADAN): çağrılar "uygun değil" çıkacak haberlerde tükenmesin diye.
 * Saklı yüklü bekleyen kayıt (modelsiz yayın) > güvenilir iyi-haber kaynağı > alan kaynağı > Bing; hazır görsel, tazelik ve yeterli özet artırır.
 */
export function onPuan(a, { simdi = Date.now(), tazelikSaat = 24 } = {}) {
  let p = 0;
  if (a.kayit?.yuk && a.kayit.durum === "bekliyor_gorsel") p += 100;
  if (a.kaynakGuvenilir && !a.alan) p += 30;       // iyi haber siteleri: model "uygun" deme olasılığı yüksek
  else if (a.alan) p += 12;                        // alan kaynakları: nötr-olumlu ön elemeyi geçti
  else p -= 10;                                    // Bing: güvenilmez, ikinci kaynak/uygunluk belirsiz
  if (a.hazirGorsel?.url) p += 8;                  // kurumun lisanslı görseli hazır: görsel aramaya gerek yok
  const yas = simdi - Date.parse(a.zaman), pencere = (a.tazelikSaat || tazelikSaat) * 3600_000;
  if (Number.isFinite(yas)) p += Math.max(0, Math.round(20 * (1 - yas / pencere)));
  p += (a.ozet || "").length >= 250 ? 10 : -15;   // kısa özet = "kaynak metni yetersiz" riski
  return p;
}

/** Model sarmalayıcı: çağrılar arası en az `ayar.geminiBeklemeMs` (geçen süre sayılır) + görsel denetim çağrılarını sayar. */
function modelSarmala(model, { ayar, bekleFn, simdi, sayac }) {
  let son = null;
  return {
    ...model,
    async yaz(sistem, girdi, secenek = {}) {
      if (son !== null && ayar.geminiBeklemeMs > 0) { const gecen = simdi() - son; if (gecen < ayar.geminiBeklemeMs) await bekleFn(ayar.geminiBeklemeMs - gecen); }
      if (secenek.resim) sayac.vl++;
      try { return await model.yaz(sistem, girdi, secenek); } finally { son = simdi(); }
    },
  };
}

/** Bir tur. Bağımlılıklar parametreyle gelir (testte taklit edilir). -> özet nesnesi */
export async function turCalistir({ ayar, kaynaklar, bulut, model: hamModel, fetchFn = fetch, bekleFn = dur, simdi = () => Date.now(), log = console.log, tarama }) {
  const baslangic = simdi();
  const ozet = { aday: 0, yeniAday: 0, onElemeGecen: 0, elenen: 0, bekleyenKaynak: 0, bekleyenGorsel: 0, yayinlanan: 0, haberYayin: 0, bekleyenYayin: 0, gorselsiz: 0, ozneGorsel: 0, vlCagri: 0, modelCagri: 0, kota: 0, sureSn: 0,
    red: { uygunDegil: 0, rakam: 0, dil: 0, filtre: 0, diger: 0 }, redKodlari: {}, durus: "tamam", ornekBaslik: [], ozel: null, alanYayin: {} };
  const sayac = { vl: 0 };
  const model = modelSarmala(hamModel, { ayar, bekleFn, simdi, sayac });
  const isaretler = [];
  const isaretle = (a, durum, neden, deneme = 0, yuk = null) => isaretler.push({ ozet: a.hash, durum, neden: String(neden).slice(0, 120), deneme, ...(yuk ? { yuk } : {}) });

  // (a) tara
  const { adaylar: ham, hatalar } = tarama || await kaynaklariTara(kaynaklar, { bingAcik: ayar.bingAcik, fetchFn });
  if (hatalar.length) log(`kaynak hataları (${hatalar.length}): ${hatalar.join("; ")}`);
  const benzersiz = new Map();
  for (const a of ham) { const o = baglantiOzeti(a.link); if (!benzersiz.has(o)) benzersiz.set(o, { ...a, hash: o }); }
  const hepsi = [...benzersiz.values()];
  ozet.aday = hepsi.length;

  // bulut kota kaydı (alan günlük kotası + alıntı/gökbilim sırası); bulut kota bilmiyorsa (eski sözleşme/test) kota uygulanmaz
  let kotaDurum = new Map();
  if (!ayar.kuru && typeof bulut.kota === "function") kotaDurum = await bulut.kota().catch((e) => { log(`kota alınamadı: ${e.message}`); return new Map(); });
  const kalanHak = kotaDurum.size || typeof bulut.kota === "function" ? alanKalan(ayar.alanKotalari || {}, kotaDurum) : {};

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
  // ön puana göre sırala (eşitlikte en yeni önce), tekrarları ele, alanlar arasında dengele (aynı alandan art arda en çok ayar.alanArdaArdaUst)
  const puanOpsiyon = { simdi: simdi(), tazelikSaat: ayar.tazelikSaat };
  for (const a of gecen) a.onPuan = onPuan(a, puanOpsiyon);
  const sirali = alanDengele(tekrarlariEle(gecen.sort((x, y) => (y.onPuan - x.onPuan) || (Date.parse(y.zaman) - Date.parse(x.zaman)))), ayar.alanArdaArdaUst || 2);
  ozet.onElemeGecen = sirali.length;
  if (ayar.kuru) ozet.ornekBaslik = sirali.slice(0, 3).map((a) => `[${a.kaynak}] ${a.baslik}`);

  const bitir = async () => { if (!ayar.kuru) await bulut.isaretle(isaretler.splice(0)).catch((e) => log(`işaretleme hatası: ${e.message}`)); };

  // ÖZEL İŞLER (alıntı, şiir, mitoloji, gökbilim): turun BAŞINDA ve KENDİ model bütçesiyle (ayar.ozelCagriUst); haber bütçesi ayrı.
  const ozelCalistir = async () => {
    const o = await ozelIsleriCalistir({ ayar, bulut, model, fetchFn, simdi: simdi(), kotaDurum, log, bekleFn, adaylar: sirali, sureAsildi: () => simdi() - baslangic > ayar.turSureSn * 1000 * 0.5 });
    ozet.ozel = o;
    return o;
  };
  const ozelAcik = ayar.ozelAcik !== false && (ayar.kuru || typeof bulut.kota === "function");
  let ozelKullanilan = new Set();
  if (ozelAcik) {
    try {
      const o = await ozelCalistir();
      ozet.yayinlanan += o.yayin;
      ozelKullanilan = new Set(o.kullanilan);
      for (const c of o.calisan) if (c.alan === "gokbilim" && c.durum === "yayinlandi" && kalanHak.gokbilim !== undefined) kalanHak.gokbilim = Math.max(0, kalanHak.gokbilim - 1);
      if (o.kota) { ozet.kota++; ozet.durus = "kota"; }
    } catch (e) { log(`özel işler hatası: ${String(e.message || e).slice(0, 80)}`); }
  }

  if (ayar.kuru) {
    // Kuru: model çağrısı, kaynak sayfası indirme ve yayın YOK. Doğrulama kararı gösterilir.
    for (const a of sirali) if (!dogrulandiMi(a, hepsi, ayar.guvenilir).ok) ozet.bekleyenKaynak++;
    ozet.durus = "kuru";
    ozet.sureSn = Math.round((simdi() - baslangic) / 1000);
    return ozet;
  }
  if (ozet.durus === "kota") { await bitir(); ozet.vlCagri = sayac.vl; ozet.sureSn = Math.round((simdi() - baslangic) / 1000); return ozet; }

  // (d-h) işle: alan kotası dolu olanlar baştan çıkarılır (çağrı/sıra harcamasın), özel işte kullanılan haber atlanır
  const islenecek = sirali.filter((a) => !ozelKullanilan.has(a.hash) && !(a.alan && kalanHak[a.alan] !== undefined && kalanHak[a.alan] <= 0));
  const robots = new Map();
  for (const a of islenecek) {
    if (ozet.haberYayin >= ayar.turBasinaEn) { ozet.durus = "tur-siniri"; break; }
    if (simdi() - baslangic > ayar.turSureSn * 1000) { ozet.durus = "sure-doldu"; break; }
    const yuk = a.kayit?.yuk && a.kayit.durum === "bekliyor_gorsel" && a.kayit.yuk.tr?.baslik && a.kayit.yuk.en?.baslik && a.kayit.yuk.id ? a.kayit.yuk : null;
    if (!yuk && ozet.modelCagri >= ayar.modelCagriUst) { ozet.durus = "cagri-siniri"; break; }
    if (a.alan && kalanHak[a.alan] !== undefined && kalanHak[a.alan] <= 0) continue;   // alanın son 24 saatlik kotası dolu: işaretlenmez, sonraki turda yeniden bakılır
    try {
      let haber = yuk;
      if (yuk && !(dilUygun(yuk.tr.ozet, "tr") && dilUygun(yuk.tr.baslik + " " + yuk.tr.ozet.slice(0, 200), "tr") && dilUygun(yuk.en.ozet, "en"))) { isaretle(a, "elendi", "sakli yuk dil denetimi"); ozet.elenen++; continue; }   // eski kurallarla yazılmış saklı yük bugünkü denetimden geçmeli
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
        const y = await haberYaz(model, a, sayfa, { cagriUst: Math.max(1, ayar.modelCagriUst - ozet.modelCagri) });
        ozet.modelCagri += y.cagri || 0;
        if (y.durum !== "ok") {
          const kod = redKodu(y.neden);
          ozet.red[redSinifi(y.neden)]++; ozet.redKodlari[kod] = (ozet.redKodlari[kod] || 0) + 1;
          isaretle(a, "elendi", y.neden); ozet.elenen++; continue;
        }
        haber = haberKur(a, y);
      }
      // görsel: (i) kurumun kendi lisanslı görseli, (ii) haberin ADI GEÇEN öznesinin Commons görseli, (iii) insansız nötr konu görseli, (iv) görselsiz yayın
      const gb = { sonuc: null, notlar: [] };
      let g = await hazirGorselHazirla(a, { fetchFn, notlar: gb.notlar });
      const bekleyenGorselsiz = false;        // d) bekleyen kayıt: yeniden arama/model çağrısı yok, saklı yükle görselsiz yayın
      let gorselKota = false;
      if (!g && !bekleyenGorselsiz) {
        try { const r = await gorselBul(haber, { model, pixabayAnahtar: ayar.pixabayAnahtar, fetchFn, bekleFn, vlUst: ayar.vlUst }); g = r.sonuc; gb.notlar.push(...r.notlar); }
        catch (e) { if (e instanceof KotaDoldu) gorselKota = true; else gb.notlar.push(`görsel hatası:${String(e.message).slice(0, 30)}`); }   // kota: yazılmış haber kaybolmasın, bu turda görselsiz çıkar, tur biter
        if (g?.ozne) ozet.ozneGorsel++;
      }
      if (!g && (!ayar.gorselsizYayin || ozet.gorselsiz >= ayar.gorselsizUst)) {
        const deneme = a.deneme + 1;
        if (deneme >= ayar.gorselDenemeUst) { isaretle(a, "elendi", "gorsel bulunamadi"); ozet.elenen++; }
        else { isaretle(a, "bekliyor_gorsel", gb.notlar.join("|").slice(0, 100), deneme, haber); ozet.bekleyenGorsel++; }
        continue;
      }
      const sonuc = await bulut.yayinla(haber, a.hash, g);
      if (sonuc.durum === "eklendi" || sonuc.durum === "var") {
        if (sonuc.durum === "eklendi") {
          ozet.yayinlanan++; ozet.haberYayin++;
          if (yuk) ozet.bekleyenYayin++;
          if (!g) ozet.gorselsiz++;
          const al = a.alan || "genel"; ozet.alanYayin[al] = (ozet.alanYayin[al] || 0) + 1; if (kalanHak[a.alan] !== undefined) kalanHak[a.alan]--;
        }
        isaretle(a, "yayinlandi", sonuc.durum);
      } else { isaretle(a, "elendi", `yayin-red:${sonuc.neden || "?"}`); ozet.elenen++; }
      if (gorselKota) { ozet.durus = "kota"; ozet.kota++; log("model kotası/hız sınırı görsel denetiminde doldu: tur zarifçe bitiriliyor"); break; }
    } catch (e) {
      if (e?.cagri) ozet.modelCagri += e.cagri;
      if (e instanceof KotaDoldu) { ozet.durus = "kota"; ozet.kota++; log("model kotası/hız sınırı doldu: tur zarifçe bitiriliyor"); break; }
      if (e instanceof ModelHatasi) { ozet.durus = "model-hatasi"; log(`model hatası: ${e.message}`); break; }
      log(`aday atlandı (beklenmeyen hata): ${String(e.message || e).slice(0, 80)}`);
    }
  }
  await bitir();
  ozet.vlCagri = sayac.vl;
  ozet.sureSn = Math.round((simdi() - baslangic) / 1000);
  return ozet;
}

/** Model ret nedenini özet kırılımı için sınıflar (başlık/gizli değer yok). Ayrıntılı kod için yaz.mjs `redKodu`. */
export function redSinifi(neden) {
  return { "uygun-degil": "uygunDegil", rakam: "rakam", dil: "dil", filtre: "filtre" }[redKodu(neden)] || "diger";
}

export function ozetSatiri(o) {
  const r = o.red || {};
  const digerKirilim = Object.entries(o.redKodlari || {}).filter(([k]) => !["uygun-degil", "rakam", "dil", "filtre"].includes(k)).map(([k, v]) => `${k}:${v}`).join(",");
  const ek = (o.ozel ? ` ozel=${ozelOzetMetni(o.ozel)}` : "") +
    (Object.keys(o.alanYayin || {}).length ? ` alanYayin=${Object.entries(o.alanYayin).map(([k, v]) => `${k}:${v}`).join(",")}` : "") +
    (digerKirilim ? ` digerKirilim=${digerKirilim}` : "") +
    (o.gorselsiz || o.ozneGorsel || o.bekleyenYayin || o.vlCagri ? ` gorselsiz=${o.gorselsiz || 0} ozneGorsel=${o.ozneGorsel || 0} bekleyenYayin=${o.bekleyenYayin || 0} vl=${o.vlCagri || 0}` : "");
  return `ozet: taranan=${o.aday} yeni=${o.yeniAday} onEleme=${o.onElemeGecen} modelCagri=${o.modelCagri} ` +
    `modelRed=${(r.uygunDegil || 0) + (r.rakam || 0) + (r.dil || 0) + (r.filtre || 0) + (r.diger || 0)}(uygunDegil=${r.uygunDegil || 0},rakam=${r.rakam || 0},dil=${r.dil || 0},filtre=${r.filtre || 0},diger=${r.diger || 0}) ` +
    `elenen=${o.elenen} bekleyenGorsel=${o.bekleyenGorsel} bekleyenKaynak=${o.bekleyenKaynak} yayinlanan=${o.yayinlanan} kota429=${o.kota || 0} sure=${o.sureSn || 0}s durus=${o.durus}${ek}`;
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
    if (ayar.kuru) { console.log("[kuru] model ve yayın TAKLİT: hiçbir çağrı yapılmadı. Örnek başlıklar:"); o.ornekBaslik.forEach((b) => console.log("  - " + b));
      const oz = o.ozel;
      if (oz) { console.log("[kuru] alıntı/gökbilim örnek kayıtları (model ve yayın taklit):"); oz.ornekler.forEach((k) => console.log("  * " + JSON.stringify(k))); oz.notlar.forEach((n) => console.log("  . " + n)); }
    }
  } catch (e) {
    console.error(`tur başarısız: ${String(e.message || e).slice(0, 120)}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
