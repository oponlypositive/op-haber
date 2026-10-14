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
import { gnewsBaslikSuzgeci, gnewsCoz, gnewsSayfaSuzgeci } from "./lib/gnews.mjs";
import { kotaEngeli, yerliMi, yerliOnce, yerliRezervi } from "./lib/tr.mjs";
import { kaynakMetni, sayfaEslesiyor } from "./lib/sayfa.mjs";
import { KotaDoldu, ModelHatasi, modelKur } from "./lib/model.mjs";
import { haberYaz, redKodu } from "./lib/yaz.mjs";
import { HABER_KATEGORILERI, dilUygun } from "./lib/dogrula.mjs";
import { gorselBul, openverseBelirtec } from "./lib/gorsel.mjs";
import { alanDengele, alanKalan, hayvanMi } from "./lib/alanlar.mjs";
import { adayImzasi, ayniOlayBul, haberImzasi } from "./lib/ayni_olay.mjs";
import { ozelIsleriCalistir, ozelOzetMetni } from "./lib/ozel.mjs";
import { etiketYuku, haberKur, hazirGorselHazirla } from "./lib/haber_yap.mjs";
import { botKur, bulutKur } from "./lib/bulut.mjs";
import { botOzetMetni, botYanitTuru } from "./lib/bot_yanit.mjs";
import { onSinifAsamasi, onSinifOzetMetni } from "./lib/on_sinif.mjs";
import { sonOkuma, sonOkumaOzetMetni } from "./lib/son_okuma.mjs";

const burasi = dirname(fileURLToPath(import.meta.url));
const dur = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Ön sıralama puanı (model çağrısı HARCAMADAN): çağrılar "uygun değil" çıkacak haberlerde tükenmesin diye.
 * Saklı yüklü bekleyen kayıt (modelsiz yayın) > güvenilir iyi-haber kaynağı > alan kaynağı > Bing; hazır görsel, tazelik ve yeterli özet artırır.
 */
export function onPuan(a, { simdi = Date.now(), tazelikSaat = 24, trAgirlik = 0 } = {}) {
  let p = 0;
  if (a.kayit?.yuk && a.kayit.durum === "bekliyor_gorsel") p += 100;
  if (a.kaynakGuvenilir && (!a.alan || a.hayvanSezgi)) p += 30;   // iyi haber siteleri: model "uygun" deme olasılığı yüksek (hayvan sezgisiyle etiketlenmiş olsalar da)
  else if (a.alan) p += 12;                        // alan kaynakları: nötr-olumlu ön elemeyi geçti
  else p -= 10;                                    // Bing: güvenilmez, ikinci kaynak/uygunluk belirsiz
  if (a.hazirGorsel?.url) p += 8;                  // kurumun lisanslı görseli hazır: görsel aramaya gerek yok
  const yas = simdi - Date.parse(a.zaman), pencere = (a.tazelikSaat || tazelikSaat) * 3600_000;
  if (Number.isFinite(yas)) p += Math.max(0, Math.round(20 * (1 - yas / pencere)));
  if (!a.gnews) p += (a.ozet || "").length >= 250 ? 10 : -15;   // kısa özet = "kaynak metni yetersiz" riski (Google News sonucunda özet yoktur; metin asıl yayıncının sayfasından okunur)
  if (trAgirlik > 0 && yerliMi(a)) p += 12;        // Türkiye ağırlığı: TR kaynaklı / Türkiye konulu adaylar öne geçer
  return p;
}

/**
 * Google News adayları özetsiz ve "alan"sız geldiği için ön puanda hep geride kalır; doğrulanmış (güvenilir site ya da ikinci kaynak) ve yerli
 * olanlardan en çok `adet` tanesi sıranın başına (saklı yüklü bekleyenlerin ardına) alınır. Diğerlerinin sırası korunur.
 */
export function gnewsOneAl(liste, adet, dogrulandi = () => true) {
  if (!(adet > 0)) return liste;
  const secilen = [];
  for (const a of liste) { if (secilen.length >= adet) break; if (a.gnews && !a.kayit?.yuk && yerliMi(a) && dogrulandi(a)) secilen.push(a); }
  if (!secilen.length) return liste;
  const s = new Set(secilen), kalan = liste.filter((a) => !s.has(a));
  let i = 0; while (i < kalan.length && kalan[i].kayit?.yuk && kalan[i].kayit.durum === "bekliyor_gorsel") i++;
  return [...kalan.slice(0, i), ...secilen, ...kalan.slice(i)];
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
export async function turCalistir({ ayar, kaynaklar, bulut, model: hamModel, fetchFn = fetch, bekleFn = dur, simdi = () => Date.now(), log = console.log, tarama, bot = null }) {
  const baslangic = simdi();
  const ozet = { aday: 0, yeniAday: 0, ayniOlay: 0, hayvanAday: 0, yerli: { aday: 0, onEleme: 0, yayin: 0 }, gnews: { aday: 0, cozulen: 0, cozHata: 0, atlanan: 0 }, onElemeGecen: 0, elenen: 0, bekleyenKaynak: 0, bekleyenGorsel: 0, yayinlanan: 0, haberYayin: 0, bekleyenYayin: 0, eskiSay: 0, gorselsiz: 0, skorKart: 0, skorKartTur: { tek: 0, liste: 0, puan: 0 }, ozneGorsel: 0, vlRet: {}, gorselKaynak: {}, gorselTur: {}, gorselSureMs: 0, gorselSureAsim: 0, vlCagri: 0, modelCagri: 0, kota: 0, sureSn: 0,
    red: { uygunDegil: 0, rakam: 0, dil: 0, filtre: 0, diger: 0 }, redKodlari: {}, durus: "tamam", ornekBaslik: [], ozel: null, bot: null, alanYayin: {},
    onSinif: { durum: "kapali", sorulan: 0, gecen: 0, red: {}, cagri: 0 }, sonOkuma: { durum: "kapali", sorulan: 0, duzeltilen: 0, red: {} } };
  const sayac = { vl: 0 };
  const gorselButce = { openverse: { kalan: ayar.openverseUst ?? 6, dur: false } };   // Openverse istekleri tur boyunca ortak bütçe (haber başına değil)
  let ovBelirtec = null;
  const model = modelSarmala(hamModel, { ayar, bekleFn, simdi, sayac });
  const isaretler = [];
  const isaretle = (a, durum, neden, deneme = 0, yuk = null) => isaretler.push({ ozet: a.hash, durum, neden: String(neden).slice(0, 120), deneme, ...(yuk ? { yuk } : {}) });

  // (a) tara
  const { adaylar: ham, hatalar } = tarama || await kaynaklariTara(kaynaklar, { bingAcik: ayar.bingAcik, fetchFn, gnewsAcik: ayar.gnewsAcik !== false, gnewsGrup: ayar.gnewsGrup || 1, simdi: simdi() });
  if (hatalar.length) log(`kaynak hataları (${hatalar.length}): ${hatalar.join("; ")}`);
  const benzersiz = new Map();
  for (const a of ham) { const o = baglantiOzeti(a.link); if (!benzersiz.has(o)) benzersiz.set(o, { ...a, hash: o }); }
  const hepsi = [...benzersiz.values()];
  ozet.aday = hepsi.length;
  ozet.yerli.aday = hepsi.filter(yerliMi).length;
  ozet.gnews.aday = hepsi.filter((a) => a.gnews).length;
  // HAYVANLAR: kaynak dosyasında alan olarak yok; başlık/özet sezgisiyle etiketlenir (alan kotası, ön sınıf rezervi, alan dengesi ve hayvan ön elemesi bunun üzerinden çalışır). Başka alan etiketli adaya dokunulmaz.
  for (const a of hepsi) if (!a.alan && hayvanMi(a)) { a.alan = "hayvanlar"; a.hayvanSezgi = true; }
  ozet.hayvanAday = hepsi.filter((a) => a.hayvanSezgi).length;

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
    const gb = a.gnews ? gnewsBaslikSuzgeci(a) : "";
    const e = gb ? { ok: false, neden: `gnews:${gb}` } : onEleme(a, { simdi: simdi(), tazelikSaat: ayar.tazelikSaat });
    if (e.ok) gecen.push(a);
    else {
      ozet.elenen++;
      if (/^eski/.test(e.neden)) ozet.eskiSay++;
      if (!/^(eski|tarih)/.test(e.neden)) isaretle(a, "elendi", `on-eleme:${e.neden}`);      // eskiler işaretlenmez: akıştan düşer
      else if (a.bekleyen) isaretle(a, "elendi", `on-eleme:${e.neden}`);
    }
  }
  // ön puana göre sırala (eşitlikte en yeni önce), tekrarları ele, alanlar arasında dengele (aynı alandan art arda en çok ayar.alanArdaArdaUst)
  const puanOpsiyon = { simdi: simdi(), tazelikSaat: ayar.tazelikSaat, trAgirlik: ayar.trAgirlik ?? 0 };
  for (const a of gecen) a.onPuan = onPuan(a, puanOpsiyon);
  // Türkiye ağırlığı: alanlar dengelendikten sonra yerli adaylar ilk n öğenin en az `trAgirlik` oranında olacak şekilde öne alınır (her grubun kendi sırası korunur)
  const sirali = yerliOnce(alanDengele(tekrarlariEle(gecen.sort((x, y) => (y.onPuan - x.onPuan) || (Date.parse(y.zaman) - Date.parse(x.zaman)))), ayar.alanArdaArdaUst || 2), ayar.trAgirlik ?? 0);
  ozet.onElemeGecen = sirali.length;
  ozet.yerli.onEleme = sirali.filter(yerliMi).length;
  if (ayar.kuru) ozet.ornekBaslik = sirali.slice(0, 3).map((a) => `[${a.kaynak}] ${a.baslik}`);

  const bitir = async () => { if (!ayar.kuru) await bulut.isaretle(isaretler.splice(0)).catch((e) => log(`işaretleme hatası: ${e.message}`)); };

  // BOT YANITLARI (lib/bot_yanit.mjs): OP hesabı etiketlenerek sorulan sorulara kısa yanıt. Turun başında, KENDİ bütçesiyle (botTurUst yanıt, botCagriUst çağrı, botSureSn süre); uç erişilemezse tur aksamaz; --kuru modda okuma/yazma yok.
  if (!ayar.kuru && bot && ayar.botYanit !== false) {
    try { ozet.bot = await botYanitTuru({ ayar, bot, model, simdi, log }); }
    catch (e) { ozet.bot = { durum: "hata", okunan: 0, yanit: 0, atla: 0, atlaNeden: {}, cagri: 0 }; log(`bot adımı atlandı (beklenmeyen hata): ${String(e.message || e).slice(0, 60)}`); }
  }

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
  const rezerv = yerliRezervi(ayar.alanKotalari || {}, ayar.trRezerv ?? 0);       // alan kotasının bir kısmı yerli adaylara ayrılır: yabancı kaynaklar kotayı doldurup yerli haberi boğmasın
  let islenecek = sirali.filter((a) => !ozelKullanilan.has(a.hash) && !(a.alan && kalanHak[a.alan] !== undefined && kalanHak[a.alan] <= 0) && !kotaEngeli(a, kalanHak, rezerv));
  islenecek = gnewsOneAl(islenecek, ayar.gnewsOneAl ?? 3, (a) => dogrulandiMi(a, hepsi, ayar.guvenilir).ok);
  const robots = new Map();

  // Zamansız adaylar (söyleşi/portre/kişisel gelişim; tazelik 7-14 gün) ön sınıf slotlarını doldurmasın: tur başına en çok `zamansizSinifUst` tanesi sorulur, kalanı sonraki tura kalır (işaretlenmez).
  { let z = 0; const ust = ayar.zamansizSinifUst ?? 5; islenecek = islenecek.filter((a) => !a.zamansiz || ++z <= ust); }

  // TOPLU ÖN SINIFLANDIRMA: yazım çağrısından önce ilk N aday TEK ucuz çağrıda uygunluk + puan alır; uygun olmayanlar yazıma hiç girmez (tekrar sorulmaz).
  // Saklı yüklü bekleyenler ve ikinci kaynağı henüz doğrulanmamış adaylar bu adımın dışında kalır. Çağrı başarısızsa sınıflandırmasız eski yol.
  if (ayar.onSinifAdet > 0) {
    try {
      const dokunma = (a) => (a.kayit?.yuk && a.kayit.durum === "bekliyor_gorsel") || !dogrulandiMi(a, hepsi, ayar.guvenilir).ok;
      const s = await onSinifAsamasi({ model, islenecek, adet: ayar.onSinifAdet, esik: ayar.onSinifEsik ?? 6, dokunma, alanArdaArdaUst: ayar.alanArdaArdaUst || 2, rezerv: ayar.hayvanRezerv > 0 ? { hayvanlar: ayar.hayvanRezerv } : {} });
      ozet.modelCagri += s.ozet.cagri;
      ozet.onSinif = s.ozet;
      for (const e of s.elenenler) { isaretle(e.aday, "elendi", `on-sinif:${e.neden}`); ozet.elenen++; }
      islenecek = s.sirali;
    } catch (e) {
      if (e?.cagri) { ozet.modelCagri += e.cagri; ozet.onSinif = { ...ozet.onSinif, durum: "yedek", cagri: e.cagri }; }
      if (e instanceof KotaDoldu) { ozet.durus = "kota"; ozet.kota++; log("model kotası/hız sınırı ön sınıflandırmada doldu: tur zarifçe bitiriliyor"); await bitir(); ozet.vlCagri = sayac.vl; ozet.sureSn = Math.round((simdi() - baslangic) / 1000); return ozet; }
      log(`ön sınıflandırma atlandı: ${String(e.message || e).slice(0, 60)}`);
    }
  }
  let modelHataArdArda = 0;
  // AYNI OLAY denetimi (lib/ayni_olay.mjs): farklı sözcüklerle yazılmış aynı olay (iki yayıncı, aynı maç) iki kez yayınlanmasın.
  // Karşılaştırma: bu turda hazırlanan haberler + (ayar.akisUrl varsa) son ayar.ayniOlaySaat saatte yayınlananlar. Geçmiş okunamazsa yalnız tur içi denetim sürer.
  const ayniOlayAcik = ayar.ayniOlay !== false;
  let gecmis = null;
  const gecmisAl = async () => {
    if (gecmis) return gecmis;
    gecmis = [];
    if (ayniOlayAcik && typeof bulut.sonYayinlar === "function") {
      try { gecmis = (await bulut.sonYayinlar({ saat: ayar.ayniOlaySaat ?? 48, simdi: simdi() })).filter((x) => HABER_KATEGORILERI.includes(x.kategori) || x.kategori === "gokbilim").map((x) => ({ imza: adayImzasi(x) })); }   // alıntı/şiir/konu gönderileri (felsefe, edebiyat...) haber değildir
      catch (e) { log(`yayın geçmişi okunamadı: ${String(e.message || e).slice(0, 40)}`); }
    }
    return gecmis;
  };
  const hazirlar = [];                                            // yazılmış + görseli belli haberler: tur sonunda son okumadan geçip yayınlanır
  let gorselsizKuyruk = 0, zamansizKuyruk = 0, hazirYerli = 0, hazirDiger = 0, gnewsCozSay = 0, gnewsDur = false;
  let yerliKalan = islenecek.filter(yerliMi).length;
  const sonOkumaRezerv = ayar.sonOkuma !== false ? 1 : 0;         // son okuma çağrısı MODEL_CAGRI_UST bütçesinden 1 sayılır: döngü bütçeyi buna göre ayırır
  const yazimUst = Math.max(1, ayar.modelCagriUst - sonOkumaRezerv);
  for (const a of islenecek) {
    if (ozet.haberYayin + hazirlar.length >= ayar.turBasinaEn) { ozet.durus = "tur-siniri"; break; }
    if (simdi() - baslangic > ayar.turSureSn * 1000) { ozet.durus = "sure-doldu"; break; }
    const yuk = a.kayit?.yuk && a.kayit.durum === "bekliyor_gorsel" && a.kayit.yuk.tr?.baslik && a.kayit.yuk.en?.baslik && a.kayit.yuk.id ? a.kayit.yuk : null;
    if (!yuk && ozet.modelCagri >= yazimUst) { ozet.durus = "cagri-siniri"; break; }
    const yerli = yerliMi(a);
    if (yerli) yerliKalan--;
    if (!yerli && ayar.trAgirlik > 0 && !a.kayit?.yuk && hazirDiger >= hazirYerli && yerliKalan > 0) continue;   // Türkiye ağırlığı: yerli adaylar sürerken yabancı haber, yerli sayısını geçemez (işaretlenmez; sonraki tura kalır)
    if (kotaEngeli(a, kalanHak, rezerv)) continue;                                        // yabancı aday, alanın yerli rezervine girmez
    if (a.zamansiz && zamansizKuyruk >= (ayar.zamansizTurUst ?? 1)) continue;            // tur başına en çok 1 zamansız haber
    if (a.alan && kalanHak[a.alan] !== undefined && kalanHak[a.alan] <= 0) continue;   // alanın son 24 saatlik kotası dolu: işaretlenmez, sonraki turda yeniden bakılır
    // Yazımdan ÖNCE (model çağrısı israf olmasın): ham başlık+özetle aynı ölçütün temkinli hâli (ham=true: oran yolu için en az 3 ortak ad). Kesin karar yazımdan sonra aşağıda.
    if (ayniOlayAcik && !yuk) {
      const im = adayImzasi(a);
      const es = ayniOlayBul(im, hazirlar.map((h) => ({ imza: h.ham })), { ham: true }) ? "tur" : ayniOlayBul(im, await gecmisAl(), { ham: true }) ? "gecmis" : "";
      if (es) { isaretle(a, "elendi", `ayni-olay:ham-${es}`); ozet.elenen++; ozet.ayniOlay++; continue; }
    }
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
        let hedef = a.link;
        if (a.gnews) {
          // Google News sonucu: asıl yayıncı adresine çöz (turda en çok gnewsCozUst); çözülemeyen aday atlanır, Google adresi hiçbir zaman kaynak olarak yayınlanmaz
          if (gnewsDur || gnewsCozSay >= (ayar.gnewsCozUst ?? 10)) continue;
          gnewsCozSay++;
          const r = await gnewsCoz(a.gnewsId, { fetchFn, beklenenSite: a.kaynakSite });
          await bekleFn(500);
          if (r.durum !== "ok") {
            ozet.gnews.cozHata++;
            if (/^429|^ağ|zaman|aborted|fetch|HTTP 5/i.test(r.neden)) { gnewsDur = /^429/.test(r.neden); continue; }   // geçici: işaretleme, bu turda yeniden deneme
            if (a.deneme + 1 >= 3) { isaretle(a, "elendi", `gnews-coz:${r.neden}`); ozet.elenen++; ozet.gnews.atlanan++; }
            else isaretle(a, "bekliyor_kaynak", `gnews-coz:${r.neden}`, a.deneme + 1);
            continue;
          }
          ozet.gnews.cozulen++;
          hedef = r.url;
          const oncekiler = await bulut.bilinenler([baglantiOzeti(hedef)]);
          if (gorulenSinifi(oncekiler.get(baglantiOzeti(hedef))) === "atla") { isaretle(a, "elendi", "gnews:zaten-islendi"); ozet.elenen++; ozet.gnews.atlanan++; continue; }   // aynı haber yayıncının kendi beslemesinden zaten alınmış
          a.link = hedef; a.cozumHash = baglantiOzeti(hedef);
        }
        const s = await kaynakMetni(hedef, { fetchFn, robotsOnbellek: robots });
        if (s.durum === "robots") { isaretle(a, "elendi", "robots"); ozet.elenen++; continue; }
        const sayfa = s.metin && sayfaEslesiyor(s.metin, a.baslik) ? s.metin : "";
        if (a.gnews) {                                       // Google sonucunda özet yok: gerçek sayfa metni ŞART ve sayfa içeriği de konu/hassasiyet denetiminden geçer
          const gn = sayfa ? gnewsSayfaSuzgeci(sayfa) : (s.durum.startsWith("hata") && a.deneme + 1 < 3 ? "hata-yeniden" : "sayfa-eslesmiyor");
          if (gn === "hata-yeniden") { isaretle(a, "bekliyor_kaynak", "gnews:sayfa-hata", a.deneme + 1); continue; }
          if (gn) { isaretle(a, "elendi", `gnews:${gn}`.slice(0, 60)); ozet.elenen++; ozet.gnews.atlanan++; continue; }
        }
        if (!sayfa && s.durum.startsWith("hata") && (a.ozet || "").length < 250) continue;   // geçici erişim sorunu: işaretlemeden sonraki tura bırak
        const y = await haberYaz(model, a, sayfa, { cagriUst: Math.max(1, yazimUst - ozet.modelCagri) });
        ozet.modelCagri += y.cagri || 0;
        if (y.durum !== "ok") {
          const kod = redKodu(y.neden);
          ozet.red[redSinifi(y.neden)]++; ozet.redKodlari[kod] = (ozet.redKodlari[kod] || 0) + 1;
          isaretle(a, "elendi", y.neden); ozet.elenen++; continue;
        }
        haber = haberKur(a, y, { altKonuGonder: ayar.altKonuGonder !== false });
      }
      // KESİN aynı olay denetimi: yazılmış TR+EN başlık/özetle (görsel aramasına geçmeden). Sonra gelen yayınlanmaz.
      const imza = ayniOlayAcik ? haberImzasi(haber) : null;
      if (imza) {
        const es = ayniOlayBul(imza, hazirlar) ? "tur" : ayniOlayBul(imza, await gecmisAl()) ? "gecmis" : "";
        if (es) { isaretle(a, "elendi", `ayni-olay:${es}`); ozet.elenen++; ozet.ayniOlay++; continue; }
      }
      // görsel: (i) kurumun kendi lisanslı görseli, (ii) haberin ADI GEÇEN öznesinin Commons görseli, (iii) insansız nötr konu görseli, (iv) görselsiz yayın
      const gb = { sonuc: null, notlar: [] };
      // TEK MAÇ skor kartı olan haberde (lib/skor_kart.mjs) görsel ARANMAZ: kart istemcide CSS ile çizilir; stok/kişi fotoğrafı yerine kart önceliklidir (süre de kazanılır)
      // skorlar (derleme) / puan (puan durumu) kartında görsel normal aranır: fotoğraf varsa ÜSTTE, kart ALTTA; fotoğraf yoksa kartın kendisi görsel sayılır (görselsiz kuyruğuna girmez)
      const kartli = haber.kart?.tur === "skor", listeKart = haber.kart?.tur === "skorlar" || haber.kart?.tur === "puan";
      let g = kartli ? null : await hazirGorselHazirla(a, { fetchFn, notlar: gb.notlar });
      if (g) ozet.gorselTur.kaynak = (ozet.gorselTur.kaynak || 0) + 1;
      const bekleyenGorselsiz = false;        // d) bekleyen kayıt: yeniden arama/model çağrısı yok, saklı yükle görselsiz yayın
      let gorselKota = false;
      const turKalanMs = (ayar.gorselTurSureSn ?? 300) * 1000 - ozet.gorselSureMs;
      if (kartli) gb.notlar.push("skor kartı: görsel aranmadı");
      else if (!g && !bekleyenGorselsiz && turKalanMs <= 0) { gb.notlar.push("tur görsel süresi doldu"); ozet.gorselSureAsim++; }
      else if (!g && !bekleyenGorselsiz) {
        const gBasla = simdi();
        try {
          if (ovBelirtec === null) ovBelirtec = ayar.openverseKimlik && ayar.openverseSir && ayar.openverseUst > 0 ? await openverseBelirtec(ayar.openverseKimlik, ayar.openverseSir, { fetchFn }) : "";
          const r = await gorselBul(haber, { model, pixabayAnahtar: ayar.pixabayAnahtar, pexelsAnahtar: ayar.pexelsAnahtar || "", fetchFn, bekleFn, vlUst: ayar.vlUst, butce: gorselButce, ovBelirtec,
            simdi, sureSn: Math.min(ayar.gorselSureSn ?? 50, turKalanMs / 1000), plan: ayar.gorselPlan !== false, logoIzin: ayar.gorselLogo === true });
          g = r.sonuc; gb.notlar.push(...r.notlar);
          if (r.sureAsildi) ozet.gorselSureAsim++;
          if (g?.adayTur) ozet.gorselTur[g.adayTur] = (ozet.gorselTur[g.adayTur] || 0) + 1;
          for (const [k, v] of Object.entries(r.retKodlari || {})) ozet.vlRet[k] = (ozet.vlRet[k] || 0) + v;
          if (g?.gorsel?.saglayici) ozet.gorselKaynak[g.gorsel.saglayici] = (ozet.gorselKaynak[g.gorsel.saglayici] || 0) + 1;
        }
        catch (e) { if (e instanceof KotaDoldu) gorselKota = true; else gb.notlar.push(`görsel hatası:${String(e.message).slice(0, 30)}`); }   // kota: yazılmış haber kaybolmasın, bu turda görselsiz çıkar, tur biter
        ozet.gorselSureMs += Math.max(0, simdi() - gBasla);
        if (g?.ozne) ozet.ozneGorsel++;
        log(`gorsel: [${haber.kategori}] ozne=${haber.gorselOzne ? haber.gorselOzne.tur + ":" + haber.gorselOzne.ad : "-"} sonuc=${g ? (g.saglayici || "var") : "yok"} ${gb.notlar.join(" | ").slice(0, 320)}`);
      }
      if (!g && !kartli && !listeKart && (!ayar.gorselsizYayin || gorselsizKuyruk >= ayar.gorselsizUst)) {
        const deneme = a.deneme + 1;
        if (deneme >= ayar.gorselDenemeUst) { isaretle(a, "elendi", "gorsel bulunamadi"); ozet.elenen++; }
        else { isaretle(a, "bekliyor_gorsel", gb.notlar.join("|").slice(0, 100), deneme, haber); ozet.bekleyenGorsel++; }
        continue;
      }
      modelHataArdArda = 0;
      // Yayın ertelenir: tur sonunda TEK "son okuma" çağrısından geçtikten sonra yayınlanır (aşağıda). Sınırlar kuyruk anında sayılır.
      if (ayar.altKonuGonder !== false && !haber.alt_konu && !haber.cinsiyet) Object.assign(haber, etiketYuku(a, haber.kategori, {}, haber));   // saklı (eski) yükte etiket eksikse kuraldan tamamlanır
      hazirlar.push({ a, haber, g, yuk: !!yuk, imza, ham: ayniOlayAcik ? adayImzasi(a) : null });
      if (yerli) hazirYerli++; else hazirDiger++;
      if (!g && !kartli && !listeKart) gorselsizKuyruk++;
      if (a.zamansiz) zamansizKuyruk++;
      if (kalanHak[a.alan] !== undefined) kalanHak[a.alan]--;
      if (gorselKota) { ozet.durus = "kota"; ozet.kota++; log("model kotası/hız sınırı görsel denetiminde doldu: tur zarifçe bitiriliyor"); break; }
    } catch (e) {
      if (e?.cagri) ozet.modelCagri += e.cagri;
      if (e instanceof KotaDoldu) { ozet.durus = "kota"; ozet.kota++; log("model kotası/hız sınırı doldu: tur zarifçe bitiriliyor"); break; }
      if (e instanceof ModelHatasi) {
        ozet.modelHata = (ozet.modelHata || 0) + 1; modelHataArdArda++;
        log(`model hatası (${modelHataArdArda}/3, aday atlandı): ${e.message}`);
        if (modelHataArdArda >= 3) { ozet.durus = "model-hatasi"; break; }
        continue;
      }
      log(`aday atlandı (beklenmeyen hata): ${String(e.message || e).slice(0, 80)}`);
    }
  }

  // SON OKUMA (ikinci geçiş): bu turda YENİ yazılan haberlerin TR metinleri TEK çağrıda noktalama/yazım/akıcılık için okunur; rakam ve özel ad değişirse özgün metin kalır.
  const yeniHaberler = hazirlar.filter((h) => !h.yuk);
  if (ayar.sonOkuma !== false && yeniHaberler.length) {
    ozet.sonOkuma = { durum: "basarisiz", sorulan: yeniHaberler.length, duzeltilen: 0, red: {} };
    try {
      const r = await sonOkuma(model, yeniHaberler.map((h) => ({ baslik: h.haber.tr.baslik, ozet: h.haber.tr.ozet })));
      ozet.modelCagri += r.cagri;
      ozet.sonOkuma = { durum: r.durum, sorulan: yeniHaberler.length, duzeltilen: r.duzeltilen.size, red: r.red };
      for (const [i, y] of r.duzeltilen) { const h = yeniHaberler[i - 1]; h.haber.tr.baslik = y.baslik; h.haber.tr.ozet = y.ozet; }
    } catch (e) {
      if (e instanceof KotaDoldu) { ozet.modelCagri += e.cagri || 1; ozet.kota++; ozet.durus = "kota"; log("model kotası son okumada doldu: haberler özgün metinle yayınlanıyor"); }
      else log(`son okuma atlandı: ${String(e.message || e).slice(0, 60)}`);
    }
  }

  // YAYIN
  for (const { a, haber, g, yuk } of hazirlar) {
    try {
      const sonuc = await bulut.yayinla(haber, a.hash, g);
      if (sonuc.durum === "eklendi" || sonuc.durum === "var") {
        if (sonuc.durum === "eklendi") {
          ozet.yayinlanan++; ozet.haberYayin++;
          if (yuk) ozet.bekleyenYayin++;
          if (haber.kart?.tur) { ozet.skorKart++; const kt = haber.kart.tur === "skor" ? "tek" : haber.kart.tur === "skorlar" ? "liste" : "puan"; ozet.skorKartTur[kt]++; }
          else if (!g) ozet.gorselsiz++;
          const al = a.alan || "genel"; ozet.alanYayin[al] = (ozet.alanYayin[al] || 0) + 1;
          if (yerliMi(a)) ozet.yerli.yayin++;
        } else if (kalanHak[a.alan] !== undefined) kalanHak[a.alan]++;       // zaten yayında: kuyruk anında düşülen hak geri verilir
        isaretle(a, "yayinlandi", sonuc.durum);
        if (a.cozumHash) isaretle({ hash: a.cozumHash }, "yayinlandi", "gnews-asil-adres");      // yayıncının kendi adresi de görüldü sayılır: aynı haber RSS'ten ikinci kez yazılmaz
      } else { isaretle(a, "elendi", `yayin-red:${sonuc.neden || "?"}`); ozet.elenen++; if (kalanHak[a.alan] !== undefined) kalanHak[a.alan]++; }
    } catch (e) { log(`yayın atlandı (beklenmeyen hata): ${String(e.message || e).slice(0, 80)}`); }
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
  const kirilim = (m) => Object.entries(m || {}).map(([k, v]) => `${k}:${v}`).join(",");
  const ek = (o.yerli ? ` yerli=${o.yerli.yayin}/${o.haberYayin ?? 0}(aday=${o.yerli.aday},onEleme=${o.yerli.onEleme})` : "") +
    (o.ayniOlay !== undefined ? ` ayniOlay=${o.ayniOlay}` : "") + (o.hayvanAday ? ` hayvanAday=${o.hayvanAday}` : "") +
    (o.gnews && (o.gnews.aday || o.gnews.cozulen || o.gnews.cozHata) ? ` gnews=aday:${o.gnews.aday},cozulen:${o.gnews.cozulen},cozHata:${o.gnews.cozHata},atlanan:${o.gnews.atlanan}` : "") +
    (o.skorKart ? ` skorKart=tek:${o.skorKartTur?.tek ?? o.skorKart},liste:${o.skorKartTur?.liste ?? 0},puan:${o.skorKartTur?.puan ?? 0}` : "") + (o.ozel ? ` ozel=${ozelOzetMetni(o.ozel)}` : "") + (o.ozel?.mufredatOzet ? ` mufredat=${o.ozel.mufredatOzet}` : "") + (o.ozel?.planOzet ? ` plan=${o.ozel.planOzet}` : "") + botOzetMetni(o.bot) +
    (Object.keys(o.alanYayin || {}).length ? ` alanYayin=${Object.entries(o.alanYayin).map(([k, v]) => `${k}:${v}`).join(",")}` : "") +
    (digerKirilim ? ` digerKirilim=${digerKirilim}` : "") + onSinifOzetMetni(o.onSinif) + sonOkumaOzetMetni(o.sonOkuma) +
    (o.haberYayin !== undefined ? ` cagriBasinaYayin=${o.modelCagri > 0 ? (o.haberYayin / o.modelCagri).toFixed(2) : "0.00"}` : "") +
    (kirilim(o.vlRet) ? ` vlRet=${kirilim(o.vlRet)}` : "") + (kirilim(o.gorselKaynak) ? ` gorselKaynak=${kirilim(o.gorselKaynak)}` : "") +
    (kirilim(o.gorselTur) ? ` gorselTur=${kirilim(o.gorselTur)}` : "") + (o.gorselSureMs ? ` gorselSure=${Math.round(o.gorselSureMs / 1000)}s` : "") + (o.gorselSureAsim ? ` gorselSureAsim=${o.gorselSureAsim}` : "") +
    (o.gorselsiz || o.ozneGorsel || o.bekleyenYayin || o.vlCagri ? ` gorselsiz=${o.gorselsiz || 0} ozneGorsel=${o.ozneGorsel || 0} bekleyenYayin=${o.bekleyenYayin || 0} vl=${o.vlCagri || 0}` : "");
  return `ozet: taranan=${o.aday} yeni=${o.yeniAday} taze=${Math.max(0, o.yeniAday - (o.eskiSay || 0))} onEleme=${o.onElemeGecen} modelCagri=${o.modelCagri} ` +
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
    : bulutKur({ fnUrl: ayar.fnUrl, anahtar: ayar.yukleAnahtari, akis: ayar.akisUrl && ayar.akisAnahtar ? { url: ayar.akisUrl, anahtar: ayar.akisAnahtar } : null, log: console.log });
  const bot = !ayar.kuru && ayar.botYanit !== false ? botKur({ fnUrl: ayar.fnUrl, anahtar: ayar.yukleAnahtari }) : null;      // aynı kökteki /bot-sorulari
  const model = ayar.kuru ? { yaz: async () => { throw new Error("kuru modda model çağrılmaz"); } } : modelKur(ayar);
  try {
    const taramaArg = process.argv.slice(2).find((x) => x.startsWith("--tarama="));            // yalnız --kuru ile: önceden kaydedilmiş tarama (çevrimdışı deneme; ağ isteği yok)
    const tarama = ayar.kuru && taramaArg ? JSON.parse(readFileSync(taramaArg.slice(9), "utf8")) : undefined;
    const o = await turCalistir({ ayar, kaynaklar, bulut, model, tarama, bot });
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
