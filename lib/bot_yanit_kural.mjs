// OP bot yanıtı: kurallar (saf işlevler; ağ ve model yok). Üç katman:
//   1) alan tablosu (hangi hesap hangi konunun sesi), 2) soru taraması (model çağrılmadan reddedilecek konular + istem enjeksiyonu), 3) yanıt doğrulaması (model çıktısı kodla denetlenir).
// DÜRÜSTLÜK: hesap yapay zekâ içerik hesabıdır; insan gibi davranmaz, kişisel anı/deneyim uydurmaz, uydurma alıntı/kaynak yazmaz.
// Günlüğe ya da neden alanlarına SORU/YANIT METNİ yazılmaz (depo ve Actions günlükleri herkese açık): nedenler sabit kod sözcükleridir.
import { denetle } from "./moderasyon.mjs";
import { konuYasak } from "./on_eleme.mjs";
import { ALKOL, SAGLIK, SIDDET, TARIH_YASAK } from "./konu_yasak.mjs";
import { dilUygun } from "./dogrula.mjs";
import { turkceDenetle, turkceOnar } from "./turkce_denetim.mjs";

export const YANIT_AZAMI = 270;          // sunucu sınırı 280; payı bırakılır
export const SORU_AZAMI = 600;

// ---------- 1) alan tablosu: editorler.mjs kullanıcı adlarıyla BİREBİR aynı kümedir (test, dosya varsa karşılaştırır)
// [ad TR, ad EN, alan TR, alan EN, not]
const T = (adTr, adEn, alanTr, alanEn, not = "") => ({ adTr, adEn, alanTr, alanEn, not });
export const BOT_ALANLARI = {
  op_bilim: T("OP Bilim", "OP Science", "bilim ve bilimsel merak", "science and scientific curiosity"),
  op_saglik: T("OP Sağlık", "OP Health", "sağlık alanındaki genel ve olumlu gelişmeler", "general, positive developments in health", "Tıbbi tavsiye, tedavi, ilaç, teşhis, diyet YOK; yalnız genel bilgi ve olumlu gelişmeler."),
  op_doga: T("OP Doğa", "OP Nature", "doğa ve çevre", "nature and the environment"),
  op_hayvanlar: T("OP Hayvanlar", "OP Animals", "hayvanlar ve hayvan davranışları", "animals and animal behaviour"),
  op_iyilik: T("OP İyilik", "OP Kindness", "iyilik, dayanışma ve küçük nazik davranışlar", "kindness, solidarity and small acts of care"),
  op_sanat: T("OP Sanat", "OP Arts", "sanat, resim ve heykel", "art, painting and sculpture"),
  op_spor: T("OP Spor", "OP Sports", "sporun güzel anları", "good moments in sports"),
  op_teknoloji: T("OP Teknoloji", "OP Tech", "hayatı kolaylaştıran teknolojiler", "technology that makes life easier"),
  op_mahalle: T("OP Mahalle", "OP Neighborhood", "mahalle yaşamı ve komşuluk", "neighbourhood life"),
  op_istanbul: T("OP İstanbul", "OP Istanbul", "İstanbul ve İstanbul yaşamı", "Istanbul and life in Istanbul"),
  op_sehirler: T("OP Şehirler", "OP Cities", "dünya şehirleri", "cities around the world"),
  op_ozet: T("OP Günün Özeti", "OP Daily Digest", "günün iyi haberleri", "the day's good news"),
  op_felsefe: T("OP Felsefe", "OP Philosophy", "felsefe ve düşünce tarihi", "philosophy and the history of ideas"),
  op_edebiyat: T("OP Edebiyat", "OP Literature", "edebiyat ve edebî klasikler", "literature and literary classics"),
  op_siir: T("OP Şiir", "OP Poetry", "şiir", "poetry"),
  op_mitoloji: T("OP Mitoloji", "OP Mythology", "mitolojilerin edebî ve kültürel yönü", "the literary and cultural side of mythologies", "Mitolojiyi inanç olarak değil, edebiyat ve kültür olarak ele al."),
  op_gokbilim: T("OP Gökbilim", "OP Astronomy", "gökyüzü ve gökbilim", "the sky and astronomy"),
  op_resim: T("OP Resim", "OP Paintings", "ünlü tablolar ve ressamlar", "famous paintings and painters"),
  op_sohbet: T("OP Sohbet", "OP Chat", "gündelik sohbet", "everyday conversation"),
  op_mutfak: T("OP Mutfak", "OP Kitchen", "yemek ve mutfak kültürü", "food and cooking culture"),
  op_meditasyon: T("OP Meditasyon", "OP Meditation", "meditasyon, dikkat ve sakinleşme (laik, nefes ve farkındalık odaklı)", "meditation, attention and calm (secular, breath and awareness)"),
  op_yoga: T("OP Yoga", "OP Yoga", "yoga duruşları, esneme ve nefes (laik; tıbbi tavsiye değil)", "yoga poses, stretching and breath (secular; not medical advice)"),
  op_gelisim: T("OP Kişisel Gelişim", "OP Personal Growth", "alışkanlık, odak, öz şefkat ve olumlu psikoloji", "habits, focus, self-compassion and positive psychology"),
  op_saglikli: T("OP Sağlıklı Yaşam", "OP Healthy Living", "gündelik sağlıklı alışkanlıklar (tıbbi tavsiye değil)", "everyday healthy habits (not medical advice)"),
  op_hareket: T("OP Hareket", "OP Movement", "yürüyüş, esneme ve başlangıç düzeyi hareket (tıbbi tavsiye değil)", "walking, stretching and beginner movement (not medical advice)"),
  op_icecek: T("OP İçecek", "OP Drinks", "ferahlatan, alkolsüz içecekler", "refreshing, alcohol-free drinks"),
  op_oyun: T("OP Oyun", "OP Games", "nostaljik ve geleneksel oyunlar", "nostalgic and traditional games"),
  op_klasikler: T("OP Klasikler", "OP Classics", "Türk edebiyatının klasikleri", "classics of Turkish literature"),
  op_ronesans: T("OP Rönesans", "OP Renaissance", "Rönesans dönemi (tarih, sanat, buluşlar)", "the Renaissance (history, art, inventions)"),
  op_antik: T("OP Antik", "OP Ancient", "antik çağda gündelik yaşam ve buluşlar", "everyday life and inventions in the ancient world"),
};
const TARIH_HESAPLARI = new Set(["op_antik", "op_ronesans"]);

export const botAdi = (b) => String(b ?? "").trim().replace(/^@/, "").toLowerCase();
/** Hesabın alan çerçevesi. Tabloda olmayan op_* hesabı adından türetilen genel çerçeveyle konuşur. */
export function botAlani(bot) {
  const ad = botAdi(bot);
  return BOT_ALANLARI[ad] || T(ad || "OP", ad || "OP", "kendi içerik kategorisi", "its own content category", "Kendi kategorisi dışına çıkma.");
}

// ---------- 2) soru taraması
const katla = (s) => String(s ?? "").replace(/İ/g, "i").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i").replace(/ß/g, "ss");
const R = (kaynak) => new RegExp("(?<![a-z0-9])(?:" + kaynak + ")", "u");     // katlanmış (ASCII) metinde kelime başı eşleşmesi

const ZARAR = R("intihar|kendimi (?:oldur|asa|bitir|kes|yok)|kendime zarar|kendimi kesi|olmek istiyorum|olesim geliyor|yasamak istemiyorum|yasamaktan (?:bikti|nefret)|canima kiy|hayatima son|nasil olurum|suicid|kill myself|end my life|end it all|want to die|wanna die|don'?t want to live|do not want to live|hurt myself|self[- ]?harm|cut myself|take my own life|better off dead");
const ENJEKSIYON = [
  R("(?:onceki|yukaridaki|simdiye kadarki|ilk) (?:talimat|komut|kural|yonerge|istem)\\w*"),
  R("talimat\\w* (?:yok say|unut|gormezden|iptal|degistir|sifirla)"),
  R("(?:sistem|gizli|ilk) (?:istem|prompt|mesaj|talimat)\\w*"),
  R("prompt\\w* (?:goster|yaz|paylas|ver|acikla)"),
  R("yeni (?:talimat|rol|kural)\\w*"),
  R("(?:artik sen|bundan sonra sen|rol yap|rolune gir|karakter(?:e)? gir)"),
  R("ignore (?:all |any |the |your |my |previous |prior |above |earlier |these )+(?:instruction|prompt|rule|direction)\\w*"),
  R("disregard (?:all |any |the |your |previous |prior |above )*(?:instruction|prompt|rule)\\w*"),
  R("forget (?:everything|all|your|the|previous)"),
  R("(?:system|developer) (?:prompt|message|instruction)\\w*"),
  R("jailbreak|dan mode|do anything now|pretend (?:to be|you are|that you)|act as (?:if|a |an |the )|you are now|from now on,? you|reveal your (?:prompt|instruction|rule)|repeat (?:your|the) (?:prompt|instruction)"),
  /(?:^|\n)\s*(?:system|assistant|sistem|developer)\s*:/i,
  /"karar"\s*:|<\|[a-z_]+\|>|\[\/?inst\]|<\/?(?:soru_verisi|ust_gonderi|system)\b/i,
];
const KONU_KALIPLARI = [
  // [neden, regex]  (sıra: din, siyaset, etnik, hukuk, sağlık, para, cinsellik, şiddet, kişisel veri)
  ["din", R("ibadet|dua\\b|cennet|cehennem|ahiret|mezhep|tarikat|ruhban|rahip|haham|hristiyan|musluman|islam|budist|hindu|yahudi|inanc|imam|papaz|pray|prayer|heaven|hell\\b|afterlife|bible|quran|koran|torah|buddh|christian|muslim|hindu|jewish|atheis|spiritual|religio|tanri(?:nin|ya|yi|dan|da)?(?![a-z])")],
  ["siyaset", R("secim|oy ver|ideoloji|komunist|komunizm|faşist|fasist|sosyalist|solcu|sagci|diktator|erdogan|trump|putin|election|vote\\b|ideolog|communis|fascis|socialis|left-wing|right-wing|democrat|republican")],
  ["etnik", R("irk(?:lar|i|in|ci)?(?![a-z])|etnik|milliyetci|racis|ethnic|nationalis")],
  ["hukuk", R("hukuk|avukat|dava(?:si|yi|ci)?(?![a-z])|mahkeme|tazminat|bosanma|miras|kira sozlesme|noter|gozalti|savcilik|yasal (?:mi|olarak|sorun)|lawyer|attorney|lawsuit|\\bsue\\b|sued|legal advice|is it legal|court\\b|divorce|custody|illegal")],
  ["saglik", R("ilac|tedavi|hastalik|doktor|hekim|semptom|belirti|teshis|tansiyon|diyabet|seker hastasi|kanser|antibiyotik|agri(?:m|si|yor|lar)?(?![a-z])|hamile|depresyon|anksiyete|kolesterol|doz(?:\\b|aj)|kilo ver|zayifla|diyet|ameliyat|vitamin|takviye|covid|asi(?![a-z])|enfeksiyon|ates(?:im|i)?(?![a-z])|oksur|grip|migren|psikolog|terapi|saglik sorun|medication|medicine|\\bdose\\b|dosage|symptom|diagnos|treatment|therapy|pregnan|cancer|depress|anxiety|disease|illness|infection|vaccin|antibiotic|painkiller|weight loss|supplement|surgery|\\bdiet\\b|blood pressure|cholesterol|migraine|\\bcure\\b|prescri")],
  ["para", R("yatirim|borsa|hisse senedi|hisse al|kripto|bitcoin|coin\\b|altin al|doviz|faiz|kredi|borc|emlak|gayrimenkul|forex|zengin ol|para kazan|invest|stock market|\\bstocks?\\b|crypto|trading|mortgage|\\bloan|get rich|make money|earn money|financial advice|portfolio")],
  ["cinsellik", R("cinsel|seks(?![a-z])|erotik|porno|mastur|escort|sevisme|ciplak|sex(?:ual|y|ting)?(?![a-z])|porn|erotic|naked|nude|fetish|orgasm|nsfw|libido")],
  ["siddet", R("oldur|dover|dovmek|dovul|dovdu|tecavuz|taciz|iskence|hitler|nazi(?![a-z])|stalin|mussolini|holokost|soykirim|rape|torture|assault|stab|genocide|holocaust|terror|how to (?:hurt|harm)|make a bomb|bomba yap")],
  ["kisisel-veri", R("telefon numara|tc kimlik|kimlik no|ev adres|adresini ver|adresi ne|iban|kredi karti|sifre[a-z]*|parola|e-?posta adres|mail adres|ip adres|home address|phone number|social security|passport|credit card|password|\\bssn\\b|email address|dox|where (?:does|do) .{1,40} live|nerede oturuyor")],
];

/**
 * Soru metni VERİDİR. Model çağrılmadan reddedilecek sorular. -> {ok:true} | {ok:false, neden}
 * neden: "hassas" (kendine zarar/kriz; ayrı güvenlik akışı sonra tasarlanacak) | "enjeksiyon" | "konu-<tür>" | "hakaret" | "bos"
 * opts.bot: mitoloji/antik hesaplarında "tanrı" sözcüğü tek başına din sayılmaz.
 */
export function soruTara(soru, { bot = "" } = {}) {
  const ham = String(soru ?? "").replace(/\s+/g, " ").trim();
  if (!ham) return { ok: false, neden: "bos" };
  const k = katla(ham);
  if (ZARAR.test(k)) return { ok: false, neden: "hassas" };
  if (ENJEKSIYON.some((r) => r.test(k) || r.test(ham))) return { ok: false, neden: "enjeksiyon" };
  for (const [neden, rx] of KONU_KALIPLARI) if (rx.test(k)) return { ok: false, neden: `konu-${neden}` };
  const d = denetle(ham);
  if (!d.ok) return { ok: false, neden: d.tur === "kaba" ? "hakaret" : d.tur === "savas" ? "konu-siddet" : `konu-${d.tur}` };
  return { ok: true };
}

// ---------- 3) yanıt doğrulaması
const TR_SOZ = new Set("ve bir için ile bu da de olarak çok daha gibi kadar ancak ise olan oldu ayrıca sonra her çünkü ya veya ne en o şu onun".split(" "));
const EN_SOZ = new Set("the and of to in is was were with for that this on as by from are has have been their it its at which who also but not will can".split(" "));
const kelimeler = (t) => String(t || "").toLocaleLowerCase("tr").match(/[\p{L}']+/gu) || [];
const TR_HARF = /[çğışöüÇĞİŞÖÜ]/g;

/**
 * Dil denetimi. EN: 12+ kelimede dogrula.mjs dilUygun, kısa yanıtta işlev sözcüğü sezgisi. TR: dilUygun "ı" oranına dayalı bir elemeyi 80+ harfte yanlış tetikleyebildiğinden
 * (ı geçmeyen doğru Türkçe cümleler) Türkçe harf oranı + Türkçe/İngilizce işlev sözcüğü oranıyla ölçülür; dilUygun geçerse de kabul.
 */
export function botDilUygun(metin, dil) {
  const k = kelimeler(metin);
  if (k.length < 3) return false;
  const harf = (String(metin).match(/\p{L}/gu) || []).length || 1;
  const trHarf = (String(metin).match(TR_HARF) || []).length;
  const en = k.filter((x) => EN_SOZ.has(x)).length, tr = k.filter((x) => TR_SOZ.has(x)).length;
  if (dil === "tr") {
    if (k.length >= 12 && dilUygun(metin, "tr")) return true;
    if (en / k.length >= 0.08 || (en >= 2 && k.length < 12)) return false;
    return trHarf / harf >= 0.02 || tr / k.length >= 0.05 || (k.length < 12 && en === 0);
  }
  if (k.length >= 12) return dilUygun(metin, "en");
  return trHarf === 0 && tr === 0 && en >= 1;
}

const PARA_CIKTI = /(?<![\p{L}])(?:para\p{L}*|lira|yatırım\p{L}*|borsa\p{L}*|hisse\p{L}*|kripto\p{L}*|bitcoin|fiyat\p{L}*|ücret\p{L}*|money|invest\p{L}*|stock\p{L}*|crypto\p{L}*|price\p{L}*|cash|dollars?|euros?)(?![\p{L}])/iu;
const HUKUK_CIKTI = /(?<![\p{L}])(?:avukat\p{L}*|hukuk\p{L}*|dava\p{L}*|mahkeme\p{L}*|tazminat\p{L}*|lawyer\p{L}*|attorney\p{L}*|lawsuit\p{L}*|legal\p{L}*|court\p{L}*)(?![\p{L}])/iu;
// gerçek kişiyi küçülten/damgalayan etiketler (bilinen biyografik olgu "kötümser olarak bilinir" gibi nötr ifadeler serbest)
const DAMGA = /(?<![\p{L}])(?:zavallı\p{L}*|başarısız\p{L}*|rezil\p{L}*|berbat\p{L}*|korkak\p{L}*|tembel\p{L}*|psikopat\p{L}*|deli(?:ydi|dir|ymiş)?|çılgın\p{L}*|sapık\p{L}*|kaybeden\p{L}*|değersiz\p{L}*|nefret\p{L}*|iğrenç\p{L}*|pathetic|failure|miserable|coward\p{L}*|lazy|worthless|disgusting|crazy|insane|madman|evil|terrible person|hateful)(?![\p{L}])/iu;
const INSAN_IDDIASI = /(?<![\p{L}])(?:insanım|gerçek bir insan|gerçek biriyim|insan olarak)(?![\p{L}])|\bI(?:'m| am) (?:a |an )?(?:real |actual )?(?:human|person|man|woman)\b|\bas a (?:human|person)\b/iu;
const KAYNAK_UYDURMA = /araştırmalar (?:gösteriyor|kanıtlıyor)|bir çalışmaya göre|bilim insanları kanıtladı|kaynak\s*:|kaynağı\s*:|\(kaynak|studies (?:show|prove|have shown)|research (?:shows|proves)|according to (?:a|one|some) (?:study|studies|research|survey)|source\s*:/iu;
const ALINTI_KALIBI = /şöyle (?:der|demiş|demiştir|söylemiş|yazmış)|demişti ki|meşhur sözü|ünlü sözü|bir keresinde (?:şöyle )?(?:dedi|demiş)|once (?:said|wrote)|famously (?:said|wrote|declared)|\bsaid:|\bwrote:/iu;
const TIRNAK_ICI = /“([^”]*)”|"([^"]*)"|‘([^’]*)’/g;
const BIRINCI_TEKIL_ZAMIR = /(?<![\p{L}\p{N}])(?:ben|bana|beni|benim|bende|benden|kendim\p{L}*)(?![\p{L}\p{N}])/iu;
const BIRINCI_TEKIL_FIIL = /(?<![\p{L}\p{N}])\p{L}{2,}(?:dım|dim|dum|düm|tım|tim|tum|tüm|yorum)(?![\p{L}\p{N}])/iu;
const FIIL_ISTISNA = new Set(["yardım", "adım", "kadim", "mahdum", "kardım", "rüştüm", "serdim", "terdim", "düşünüyorum", "sanıyorum", "biliyorum", "bilmiyorum", "öneriyorum", "katılıyorum", "anlıyorum", "görüyorum", "eğitim", "üretim", "tüketim", "kalıtım", "yönetim", "yetim", "bitim", "medium", "kuantum", "momentum", "datum", "ultimatum"]);
const AKRABA = /(?<![\p{L}])(?:annem|babam|eşim|ailem|kardeşim|çocuğum|evim|mahallem|çocukluğum|arkadaşım|arkadaşlarım|dedem|ninem|büyükannem|karım|kocam)\p{L}*/iu;
// "bence", "bana göre", "benim alanım değil" ve "bu konuda ... ediyorum" gibi görüş/yönlendirme kalıpları serbest; geri kalan birinci tekil kişi kalıbı reddedilir
const TR_IZINLI = /\bbana göre\b|\bbenim (?:alan|uzmanlık)\p{L}*|\btahmin ediyorum\b|\bmerak ediyorum\b|\bemin değilim\b/giu;
const EN_IZINLI = /\bI(?:'d| would)? (?:think|believe|say|guess|suspect|suggest|wonder|imagine|feel)\b|\bI(?:'m| am) not (?:sure|certain)\b|\bI (?:do not|don't) know\b|\bIn my (?:view|opinion)\b|\bto me\b|\bnot my (?:area|field|specialty|expertise)\b|\boutside my (?:area|field|expertise)\b|\bmy (?:area|field|expertise|specialty)\b/giu;
const EN_BIRINCI = /(?<![\p{L}'])(?:i|me|my|mine|myself|i'm|i've|i'd|i'll)(?![\p{L}])/iu;
const EMOJI = /\p{Extended_Pictographic}/gu;

/**
 * Model yanıtını kodla denetler. -> {ok:true, metin} (boşluklar ve noktalama onarılmış metin) | {ok:false, neden}
 * q: {dil:"tr"|"en", soran:string, bot:string}. Nedenler sabit kodlardır (metin içermez).
 */
export function botYanitDogrula(ham, q) {
  let t = String(ham ?? "").replace(/\s+/g, " ").trim();
  if (q.dil === "tr") t = turkceOnar(t);
  if (!t) return { ok: false, neden: "bos" };
  const uzun = [...t].length;
  if (uzun > YANIT_AZAMI) return { ok: false, neden: "uzun" };
  if (uzun < 12) return { ok: false, neden: "kisa" };
  if (/https?:|www\.|(?<![\p{L}\p{N}])[\p{L}\p{N}-]+\.(?:com|org|net|io|tr|co|app)(?![\p{L}])/iu.test(t)) return { ok: false, neden: "url" };
  if (/[*_`#~<>|{}]|^[-•–]\s|\[[^\]]*\]\([^)]*\)|^\d+[.)]\s/.test(t)) return { ok: false, neden: "markdown" };
  if ((t.match(EMOJI) || []).length > 1) return { ok: false, neden: "emoji" };
  for (const m of t.matchAll(/@([\p{L}\p{N}_.]+)/gu)) if (m[1].replace(/\.+$/, "").toLowerCase() !== String(q.soran ?? "").replace(/^@/, "").toLowerCase()) return { ok: false, neden: "etiket" };
  if ((t.match(/\?/g) || []).length > 1) return { ok: false, neden: "cok-soru" };
  const cumleler = t.split(/(?<=[.!?…])\s+(?=[\p{Lu}"“‘'(])/u).filter(Boolean);
  if (cumleler.length > 3) return { ok: false, neden: "cok-cumle" };
  if (!botDilUygun(t, q.dil)) return { ok: false, neden: "dil" };
  if (q.dil === "tr") { const s = turkceDenetle(t); if (s.length) return { ok: false, neden: "yazim" }; }
  // dürüstlük: insan iddiası, kişisel deneyim, uydurma alıntı/kaynak
  if (INSAN_IDDIASI.test(t)) return { ok: false, neden: "insan-iddiasi" };
  const disarida = t.replace(TIRNAK_ICI, " ").replace(/İ/g, "i");
  if (q.dil === "tr") {
    const g = disarida.replace(TR_IZINLI, " ");
    if (BIRINCI_TEKIL_ZAMIR.test(g)) return { ok: false, neden: "birinci-tekil" };
    const f = BIRINCI_TEKIL_FIIL.exec(g);
    if (f && !FIIL_ISTISNA.has(f[0].toLocaleLowerCase("tr"))) return { ok: false, neden: "birinci-tekil-fiil" };
    if (AKRABA.test(g)) return { ok: false, neden: "kisisel-ani" };
  } else if (EN_BIRINCI.test(disarida.replace(EN_IZINLI, " "))) return { ok: false, neden: "birinci-tekil" };
  for (const m of t.matchAll(TIRNAK_ICI)) if (kelimeler(m[1] ?? m[2] ?? m[3] ?? "").length >= 4) return { ok: false, neden: "alinti" };
  if (ALINTI_KALIBI.test(t)) return { ok: false, neden: "alinti" };
  if (KAYNAK_UYDURMA.test(t)) return { ok: false, neden: "kaynak" };
  if (DAMGA.test(t)) return { ok: false, neden: "damga" };
  // yasak konular (mevcut moderasyon + konu_yasak kalıpları)
  const d = denetle(t); if (!d.ok) return { ok: false, neden: `moderasyon-${d.tur}` };
  const ky = konuYasak(t); if (ky.length) return { ok: false, neden: `konu-${ky[0].kural}` };
  if (SAGLIK.test(t)) return { ok: false, neden: "konu-saglik" };
  if (ALKOL.test(t)) return { ok: false, neden: "konu-alkol" };
  if (SIDDET.test(t)) return { ok: false, neden: "konu-siddet" };
  if (PARA_CIKTI.test(t)) return { ok: false, neden: "konu-para" };
  if (HUKUK_CIKTI.test(t)) return { ok: false, neden: "konu-hukuk" };
  if (TARIH_HESAPLARI.has(botAdi(q.bot)) && TARIH_YASAK.test(t)) return { ok: false, neden: "konu-tarih" };
  return { ok: true, metin: t };
}
