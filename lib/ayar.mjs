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
    fnUrl: (env.SUPABASE_FN_URL || "").replace(/\/+$/, ""),
    yukleAnahtari: env.HABER_YUKLE_ANAHTARI || "",
    turBasinaEn: sayi(env.TUR_BASINA_EN, 4, 1, 20),                     // tur başına en çok yeni haber (alıntı/gökbilim işleri ayrıdır)
    alanArdaArdaUst: sayi(env.ALAN_ARDA_ARDA_UST, 2, 1, 10),            // aynı alandan art arda en çok
    alanKotalari: kotaAyristir(env.ALAN_KOTALARI),                       // "spor:6,sanat:5,bilim:6,teknoloji:5,gokbilim:3" (son 24 saatte alan başına yayın tavanı)
    ozelAcik: env.OZEL_ISLER !== "0",                                    // alıntı + gökbilim işleri
    ozelPlan: planAyristir(env.OZEL_KOTALARI),                           // "felsefe:2,edebiyat:2,siir:2,mitoloji:3,gokbilim:3" (mitoloji haftalık, diğerleri günlük)
    ozelSaat: saatAraligi(env.OZEL_SAAT),                                // UTC "5-21" (Türkiye 08-24)
    ozelTurUst: sayi(env.OZEL_TUR_UST, 2, 0, 5),                         // tur başına en çok kaç alıntı/gökbilim işi
    ozelCagriUst: sayi(env.OZEL_CAGRI_UST, 4, 0, 10),                    // tur başına bu işler için en çok model çağrısı
    nasaAnahtar: env.NASA_API_KEY || "",                                 // yoksa DEMO_KEY (saatlik sınırlı)
    gorselsizYayin: env.GORSELSIZ_YAYIN === "1",
    gorselDenemeUst: sayi(env.GORSEL_DENEME_UST, 3, 1, 10),   // görsel bulunamazsa en çok bu kadar tur beklenir (ilk deneme + 2 yeniden)
    kaynakDenemeUst: sayi(env.KAYNAK_DENEME_UST, 12, 1, 60),  // ikinci bağımsız kaynak için bekleme turu
    tazelikSaat: sayi(env.TAZELIK_SAAT, 24, 1, 168),
    turSureSn: sayi(env.TUR_SURE_SN, 480, 60, 540),
    geminiBeklemeMs: sayi(env.GEMINI_BEKLEME_MS, 6000, 0, 60000),   // çağrılar arası (ücretsiz katman dakikalık sınır)
    guvenilir: (env.GUVENILIR_KAYNAKLAR ? env.GUVENILIR_KAYNAKLAR.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : VARSAYILAN_GUVENILIR),
    bingAcik: env.BING !== "0",
  };
}
