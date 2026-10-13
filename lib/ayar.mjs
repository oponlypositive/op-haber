import { kotaAyristir } from "./alanlar.mjs";
import { planAyristir, saatAraligi } from "./alinti.mjs";
// Ayarlar: yalnız ortam değişkenlerinden okunur; hiçbir gizli değer dosyada tutulmaz.
const sayi = (v, varsayilan, alt, ust) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? Math.min(ust, Math.max(alt, n)) : varsayilan;
};

// Varsayılan güvenilir kaynaklar (tek kaynakla yayınlanır): kaynaklar.json içindeki iyi-haber siteleri.
export const VARSAYILAN_GUVENILIR = ["goodnewsnetwork.org", "positive.news", "optimistdaily.com", "reasonstobecheerful.world"];

const oran = (v, varsayilan, ust = 1) => { const n = Number.parseFloat(v ?? ""); return Number.isFinite(n) ? Math.min(ust, Math.max(0, n)) : varsayilan; };

export function ayarOku(env = process.env, argv = process.argv.slice(2)) {
  return {
    kuru: argv.includes("--kuru"),
    // Gemini (birincil). Model kimliği ortam değişkeniyle değiştirilebilir; güncel liste: ai.google.dev/gemini-api/docs/models
    geminiAnahtar: env.GEMINI_API_KEY || "",
    geminiModel: env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    // Yedek (isteğe bağlı): Cloudflare Workers AI. YEDEK_MODEL tanımlı değilse atlanır. Örn: @cf/meta/llama-3.1-8b-instruct
    yedekModel: env.YEDEK_MODEL || "",
    cfHesap: env.CF_ACCOUNT_ID || "",
    cfBelirtec: env.CF_API_TOKEN || "",
    pixabayAnahtar: env.PIXABAY_API_KEY || "",
    geminiYedekModel: env.GEMINI_YEDEK_MODEL || "",        // isteğe bağlı ikinci Gemini modeli (birincil ağ/5xx hatası verirse)
    pexelsAnahtar: env.PEXELS_API_KEY || "",                              // yedek görsel kaynağı (yoksa sessizce atlanır); Edge Function lisans listesinde "Pexels License" şart
    openverseUst: sayi(env.OPENVERSE_TUR_UST, 6, 0, 20),                 // tur başına en çok Openverse isteği (anonim sınır: dakikada 20, günde 200); 0 = kapalı
    openverseKimlik: env.OPENVERSE_CLIENT_ID || "", openverseSir: env.OPENVERSE_CLIENT_SECRET || "",   // isteğe bağlı ücretsiz kayıt: günlük sınırı yükseltir
    fnUrl: (env.SUPABASE_FN_URL || "").replace(/\/+$/, ""),
    yukleAnahtari: env.HABER_YUKLE_ANAHTARI || "",
    turBasinaEn: sayi(env.TUR_BASINA_EN, 4, 1, 20),                     // tur başına en çok yeni haber (alıntı/gökbilim işleri ayrıdır)
    alanArdaArdaUst: sayi(env.ALAN_ARDA_ARDA_UST, 2, 1, 10),            // aynı alandan art arda en çok
    alanKotalari: kotaAyristir(env.ALAN_KOTALARI),                       // "spor:6,sanat:5,bilim:6,teknoloji:5,gokbilim:3" (son 24 saatte alan başına yayın tavanı)
    ozelAcik: env.OZEL_ISLER !== "0",                                    // alıntı + gökbilim işleri
    ozelPlan: planAyristir(env.OZEL_KOTALARI),                           // "felsefe:2,edebiyat:2,siir:2,mitoloji:3,gokbilim:3,resim:4,sohbet:6" (mitoloji haftalık, diğerleri günlük)
    ozelSaat: saatAraligi(env.OZEL_SAAT),                                // UTC "5-21" (Türkiye 08-24)
    ozelTurUst: sayi(env.OZEL_TUR_UST, 2, 0, 5),                         // tur başına en çok kaç alıntı/gökbilim işi YAYINLANIR
    ozelDenemeUst: sayi(env.OZEL_DENEME_UST, 7, 1, 10),                  // tur başına en çok kaç özel alan DENENİR (görseli/alıntısı çıkmayan alan sıradakileri tıkamasın)
    ozelCagriUst: sayi(env.OZEL_CAGRI_UST, 6, 0, 10),                    // tur başına özel işler için AYRI model çağrı bütçesi (haber bütçesinden bağımsız; çeviri gerektirmeyen iş 0 çağrı)
    modelCagriUst: sayi(env.MODEL_CAGRI_UST, 20, 1, 40),                 // tur başına haber yazımı için GERÇEK model çağrısı tavanı (görsel denetimi ayrı sayılır)
    onSinifAdet: sayi(env.ON_SINIF_ADET, 24, 0, 60),                     // tur başında TEK toplu çağrıyla ön sınıflandırılacak aday sayısı (0 = kapalı)
    onSinifEsik: sayi(env.ON_SINIF_ESIK, 6, 0, 10),                      // ön sınıfta yazıma girmek için asgari puan (0-10)
    sonOkuma: env.SON_OKUMA !== "0",                                     // turda yazılan TR metinler TEK çağrıda "son okuma editörü"nden geçer (noktalama/yazım/akıcılık; rakam ve özel ad değişmez); 1 çağrı bütçeden sayılır
    altKonuGonder: env.ALT_KONU_GONDER !== "0",                          // yayın yüküne alt_konu + cinsiyet eklenir (haber-yukle bilinmeyen alanı yok sayar, reddetmez); "0" kapatır
    zamansizTurUst: sayi(env.ZAMANSIZ_TUR_UST, 1, 0, 3),                 // tur başına en çok kaç ZAMANSIZ (söyleşi/portre/kişisel gelişim) haber yayınlanır
    zamansizSinifUst: sayi(env.ZAMANSIZ_SINIF_UST, 5, 0, 20),            // toplu ön sınıfa en çok kaç zamansız aday girer (24 slotu doldurmasınlar)
    vlUst: sayi(env.VL_UST, 3, 1, 8),                                    // bir haber için en çok görsel denetim çağrısı
    nasaAnahtar: env.NASA_API_KEY || "",                                 // yoksa DEMO_KEY (saatlik sınırlı)
    gorselsizYayin: env.GORSELSIZ_YAYIN !== "0",           // varsayılan AÇIK: uygun görsel yoksa haber görselsiz yayınlanır (istemci tasarım kartı gösterir); "0" ile eski bekleme yolu

    gorselsizUst: Number(env.GORSELSIZ_UST || 3),   // bir turda en çok kaç haber görselsiz (tasarım kartıyla) çıkar
    gorselDenemeUst: sayi(env.GORSEL_DENEME_UST, 3, 1, 10),   // görsel bulunamazsa en çok bu kadar tur beklenir (ilk deneme + 2 yeniden)
    kaynakDenemeUst: sayi(env.KAYNAK_DENEME_UST, 12, 1, 60),  // ikinci bağımsız kaynak için bekleme turu
    tazelikSaat: sayi(env.TAZELIK_SAAT, 24, 1, 168),         // varsayılan tazelik; kaynak kendi `tazelik_saat`ini taşıyabilir (haber türleri 24-48 sa, zamansız söyleşi/kişisel gelişim 240-336 sa)
    turSureSn: sayi(env.TUR_SURE_SN, 780, 60, 900),           // yeni aday alma süresi (13 dk; model yavaşken tur boşa gitmesin). Son işlem bunu aşabilir; iş akışı zaman aşımı 18 dk
    geminiBeklemeMs: sayi(env.GEMINI_BEKLEME_MS, 6000, 0, 60000),   // çağrılar arası (ücretsiz katman dakikalık sınır)
    guvenilir: (env.GUVENILIR_KAYNAKLAR ? env.GUVENILIR_KAYNAKLAR.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : VARSAYILAN_GUVENILIR),
    bingAcik: env.BING !== "0",
    // ---- Türkiye ağırlığı + Google News keşfi (2026-10-13 sahip isteği: çok daha fazla yerli güncel haber)
    trAgirlik: oran(env.TR_AGIRLIK, 0.5),                               // tur içinde işlenen/yayınlanan haberlerin en az bu kadarı TR kaynaklı ya da Türkiye konulu (0 = kapalı)
    trRezerv: oran(env.TR_REZERV, 0.35, 0.9),                           // alan kotasının bu payı yabancı adaylara KAPALI kalır (yerli haber kotayı dolu bulmasın)
    gnewsAcik: env.GNEWS !== "0",                                       // Google News arama RSS'leri (keşif kanalı; asıl yayıncı sayfası okunur)
    gnewsGrup: sayi(env.GNEWS_GRUP, 3, 1, 12),                          // sorgular bu kadar dilime bölünür, her tur (20 dk) sırayla biri çekilir
    gnewsCozUst: sayi(env.GNEWS_COZ_UST, 10, 0, 40),                    // tur başına en çok kaç Google yönlendirme adresi asıl adrese çözülür
    resimTekrarGun: sayi(env.RESIM_TEKRAR_GUN, 50, 7, 720),             // OP Resim: aynı tablo bu kadar gün içinde tekrar etmez
    sohbetModelDokunus: env.SOHBET_MODEL !== "0",                       // OP Sohbet: şablon metne küçük model dokunuşu (geçersizse şablon aynen yayınlanır)
  };
}
