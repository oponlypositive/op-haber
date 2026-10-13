import { kotaAyristir } from "./alanlar.mjs";
import { planAyristir, saatAraligi } from "./alinti.mjs";
// Ayarlar: yalnız ortam değişkenlerinden okunur; hiçbir gizli değer dosyada tutulmaz.
const sayi = (v, varsayilan, alt, ust) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? Math.min(ust, Math.max(alt, n)) : varsayilan;
};

// Varsayılan güvenilir kaynaklar (tek kaynakla yayınlanır): kaynaklar.json içindeki iyi-haber siteleri.
export const VARSAYILAN_GUVENILIR = ["goodnewsnetwork.org", "positive.news", "optimistdaily.com", "reasonstobecheerful.world"];

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
    ozelPlan: planAyristir(env.OZEL_KOTALARI),                           // "felsefe:2,edebiyat:2,siir:2,mitoloji:3,gokbilim:3" (mitoloji haftalık, diğerleri günlük)
    ozelSaat: saatAraligi(env.OZEL_SAAT),                                // UTC "5-21" (Türkiye 08-24)
    ozelTurUst: sayi(env.OZEL_TUR_UST, 2, 0, 5),                         // tur başına en çok kaç alıntı/gökbilim işi YAYINLANIR
    ozelDenemeUst: sayi(env.OZEL_DENEME_UST, 5, 1, 10),                  // tur başına en çok kaç özel alan DENENİR (görseli/alıntısı çıkmayan alan sıradakileri tıkamasın)
    ozelCagriUst: sayi(env.OZEL_CAGRI_UST, 4, 0, 10),                    // tur başına özel işler için AYRI model çağrı bütçesi (haber bütçesinden bağımsız; çeviri gerektirmeyen iş 0 çağrı)
    modelCagriUst: sayi(env.MODEL_CAGRI_UST, 14, 1, 40),                 // tur başına haber yazımı için GERÇEK model çağrısı tavanı (görsel denetimi ayrı sayılır)
    onSinifAdet: sayi(env.ON_SINIF_ADET, 24, 0, 60),                     // tur başında TEK toplu çağrıyla ön sınıflandırılacak aday sayısı (0 = kapalı)
    onSinifEsik: sayi(env.ON_SINIF_ESIK, 6, 0, 10),                      // ön sınıfta yazıma girmek için asgari puan (0-10)
    vlUst: sayi(env.VL_UST, 3, 1, 8),                                    // bir haber için en çok görsel denetim çağrısı
    nasaAnahtar: env.NASA_API_KEY || "",                                 // yoksa DEMO_KEY (saatlik sınırlı)
    gorselsizYayin: env.GORSELSIZ_YAYIN !== "0",           // varsayılan AÇIK: uygun görsel yoksa haber görselsiz yayınlanır (istemci tasarım kartı gösterir); "0" ile eski bekleme yolu

    gorselsizUst: Number(env.GORSELSIZ_UST || 3),   // bir turda en çok kaç haber görselsiz (tasarım kartıyla) çıkar
    gorselDenemeUst: sayi(env.GORSEL_DENEME_UST, 3, 1, 10),   // görsel bulunamazsa en çok bu kadar tur beklenir (ilk deneme + 2 yeniden)
    kaynakDenemeUst: sayi(env.KAYNAK_DENEME_UST, 12, 1, 60),  // ikinci bağımsız kaynak için bekleme turu
    tazelikSaat: sayi(env.TAZELIK_SAAT, 24, 1, 168),
    turSureSn: sayi(env.TUR_SURE_SN, 420, 60, 540),           // yeni aday alma süresi; son işlem bunu aşabilir, toplam hedef ≤ 8 dk
    geminiBeklemeMs: sayi(env.GEMINI_BEKLEME_MS, 6000, 0, 60000),   // çağrılar arası (ücretsiz katman dakikalık sınır)
    guvenilir: (env.GUVENILIR_KAYNAKLAR ? env.GUVENILIR_KAYNAKLAR.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : VARSAYILAN_GUVENILIR),
    bingAcik: env.BING !== "0",
  };
}
