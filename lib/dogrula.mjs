// Model çıktısının kod doğrulamaları: biçim, cümle sayısı, rakam koruması, kopya, dil sezgisi, ikinci filtre.
import { denetle } from "./moderasyon.mjs";
import { haberOlmayan, konuYasak } from "./on_eleme.mjs";
import { turkceDenetle, turkceNeden, turkceOnar } from "./turkce_denetim.mjs";
import { altKonuDogrula, cinsiyetDogrula } from "./alt_konu.mjs";
import { adaylariAyikla } from "./gorsel_aday.mjs";
import { puanKartiDogrula, skorKartiDogrula, skorlarKartiDogrula } from "./skor_kart.mjs";

// Haber kategorileri (modelin seçebildikleri) + alıntı/gökbilim kategorileri (alıntıyı kod üretir; modelin kategori seçimine kapalı).
export const HABER_KATEGORILERI = ["bilim", "saglik", "doga", "hayvanlar", "iyilik", "sanat", "spor", "mahalle"];   // teknoloji 2026-10-16 sahip kararıyla çıkarıldı (model yine derse ciktiDogrula "kategori-kapali" ile eler)
export const ALINTI_KATEGORILERI = ["felsefe", "edebiyat", "siir", "mitoloji"];
export const KATEGORILER = [...HABER_KATEGORILERI, ...ALINTI_KATEGORILERI, "gokbilim"];
export const EMOJI = { bilim: "🔬", saglik: "💚", doga: "🌳", hayvanlar: "🐾", iyilik: "🤝", sanat: "🎨", spor: "🏅", teknoloji: "💡", mahalle: "🏡", felsefe: "🧠", psikoloji: "🧩", edebiyat: "📖", siir: "🪶", mitoloji: "🏛️", gokbilim: "🔭", resim: "🖼️", sohbet: "💬", mutfak: "🍲", oyun: "🎲", tarih: "🏺", astroloji: "🌙", muzik: "🎵" };

const INSAN_KELIME = new Set("people person man men woman women girl girls boy boys kid kids child children team teams athlete athletes group crowd players player winners winner champion champions students family portrait smiling faces face".split(" "));

export const OZNE_TURLERI = ["kisi", "kurum", "yer", "eser", "tur", "nesne"];
/**
 * Modelin `gorsel_ozne` alanı ({ad, tur}): haberin ADI GEÇEN öznesi (sporcu, sanatçı, bilim insanı, takım, kurum, yapı, yer, eser, hayvan türü, gök cismi).
 * Ad Commons aramasında kullanılacağı için yalnız Latin harfli, 2-60 karakterlik ve en çok 6 kelimelik olmalı; aksi halde özne yok sayılır. -> {ad, tur} | null
 */
export function ozneAyikla(o) {
  if (!o || typeof o !== "object") return null;
  const ad = typeof o.ad === "string" ? o.ad.replace(/[^\p{Script=Latin}0-9 .'&-]+/gu, " ").replace(/\s+/g, " ").trim() : "";
  const tur = typeof o.tur === "string" ? o.tur.trim().toLowerCase() : "";
  if (ad.length < 3 || ad.length > 60 || ad.split(" ").length > 6 || !OZNE_TURLERI.includes(tur) || !/\p{L}{3}/u.test(ad)) return null;
  return { ad, tur };
}

/** Modelin görsel arama terimi: yalnız İngilizce harf, 1-5 kelime, insan odaklı kelime ve çok kısa kelime yok. -> "" | "coral reef" */
export function aramaTerimi(ham) {
  if (typeof ham !== "string") return "";
  const k = ham.toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim().split(" ").filter((w) => w.length >= 3 && !INSAN_KELIME.has(w));
  return k.length >= 1 && k.length <= 5 ? k.join(" ") : "";
}

const kelimeSay = (t) => (String(t ?? "").match(/[\p{L}\p{N}]+/gu) || []).length;
export const cumleSay =(m) => String(m || "").trim().split(/(?<=[.!?])\s+/).filter((c) => c.trim().length > 3).length;
export const rakamlar = (m) => new Set((String(m || "").match(/\d[\d.,]*\d|\d/g) || []).map((x) => x.replace(/[.,]/g, "")));

const TR_SOZ = new Set("ve bir için ile bu da de olarak çok daha gibi kadar ancak ise olan oldu ayrıca sonra her çünkü ya veya ne en o şu onun".split(" "));
const EN_SOZ = new Set("the and of to in is was were with for that this on as by from are has have been their it its at which who also but not will can".split(" "));
const kelimeler = (t) => String(t || "").toLocaleLowerCase("tr").match(/[\p{L}']+/gu) || [];

/** Basit dil sezgisi. dil: "tr" | "en". */
export function dilUygun(metin, dil) {
  const k = kelimeler(metin);
  if (k.length < 12) return false;
  const harf = (String(metin).match(/\p{L}/gu) || []).length || 1;
  const trHarf = (String(metin).match(/[çğışöüÇĞİŞÖÜ]/g) || []).length / harf;
  const tr = k.filter((x) => TR_SOZ.has(x)).length / k.length;
  const en = k.filter((x) => EN_SOZ.has(x)).length / k.length;
  const iSiz = harf >= 80 && (String(metin).match(/[ıI]/g) || []).length / harf < 0.012;
  return dil === "tr" ? trHarf >= 0.04 && en < 0.08 && !iSiz : en >= 0.12 && trHarf < 0.02 && tr < 0.05;
}

// ---- Yazıyla sayı/yıl (kaynaktaki rakam denetimini aşmak için model "Bin dokuz yüz seksen yedi" yazabiliyor) ve bozuk kelime denetimi
const TR_ONLU = "on|yirmi|otuz|kırk|elli|altmış|yetmiş|seksen|doksan";
const YAZIYLA_YIL_TR = new RegExp("(?<![\\p{L}])(?:bin\\s+(?:dokuz|sekiz|yedi)\\s+yüz|iki\\s+bin\\s+(?:" + TR_ONLU + ")(?![\\p{L}]))", "iu");
const EN_ONLU = "ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety";
const YAZIYLA_YIL_EN = new RegExp("(?<![\\p{L}])(?:(?:eighteen|nineteen)\\s+(?:hundred|oh|" + EN_ONLU + ")|two\\s+thousand(?:\\s+and)?\\s+(?:" + EN_ONLU + ")|(?:twenty)\\s+(?:" + EN_ONLU + "|oh))(?![\\p{L}])", "iu");
/** Metinde yazıyla yazılmış yıl kalıbı varsa o parçayı döner, yoksa "". dil: "tr" | "en" */
export function yaziylaYil(metin, dil = "tr") {
  const m = (dil === "tr" ? YAZIYLA_YIL_TR : YAZIYLA_YIL_EN).exec(String(metin || ""));
  return m ? m[0] : "";
}

// Küçük yazım sözlüğü: modelin uydurduğu/kestiği bilinen bozuk kalıplar + kelime sonu kesik ek sezgisi (-ğind, -ğund, -ğünd, -ğınd ile biten kelime Türkçede yoktur).
const BOZUK_TR = /(?<![\p{L}])(?:yürütülüğ\p{L}*|alıkanlık\p{L}*|alışkanlıg\p{L}*|\p{L}+ğ(?:ind|und|ünd|ınd)|yapılmaktadırlar|kullanılmaktadırlar|\p{L}*dırdır)(?![\p{L}])/iu;
// Harfi düşmüş kelimeler (altın set b: "dünyann", "insanlarn", "arasnda"): -lar/-ler + n, ünlü + nn sonu, ünlü + sn(da|de|dan|den), ünlüsüz küçük harfli 4+ harfli kelime. Türkçede bu kalıplarda kelime yoktur.
const BOZUK_DUSMUS = /(?<![\p{L}])(?:\p{L}*(?:lar|ler)n|\p{Ll}{3,}(?:ann|enn|ınn|inn|unn|ünn)|\p{L}*[aeıioöuü]sn(?:da|de|dan|den)|[b-df-hj-nprstvzçğş]{4,})(?![\p{L}])/u;
/** TR metinde bozuk/kesik kelime varsa ilkini döner, yoksa "". */
export function yazimHatasi(metin) {
  const m = BOZUK_TR.exec(String(metin || "")) || BOZUK_DUSMUS.exec(String(metin || "").replace(/(?<![\p{L}])\p{Lu}{2,}(?![\p{L}])/gu, " "));
  return m ? m[0] : "";
}

const sekizli = (t) => {
  const k = kelimeler(t), s = new Set();
  for (let i = 0; i + 8 <= k.length; i++) s.add(k.slice(i, i + 8).join(" "));
  return s;
};
/** Çıktıdaki 8 kelimelik dizilerden biri kaynakta aynen geçiyorsa kopyadır. */
export function kaynaktanKopya(cikti, kaynak) {
  const kay = sekizli(kaynak);
  for (const g of sekizli(cikti)) if (kay.has(g)) return true;
  return false;
}

// ---- Söyleşi/portre alıntısı: en çok BİR kısa doğrudan alıntı (çift tırnak içinde, 20 kelimeyi aşmaz, kaynak dilindeki metinde kaynakta AYNEN geçer)
const ALINTI_RE = /“([^”]{6,}?)”|"([^"]{6,}?)"/g;
/** Metindeki tırnaklı parçalar. -> ["...", ...] */
export const alintilariAyikla = (metin) => [...String(metin ?? "").matchAll(ALINTI_RE)].map((x) => (x[1] ?? x[2]).trim());
const alintiKatla = (t) => String(t ?? "").toLocaleLowerCase("tr").replace(/[’‘`´]/g, "'").replace(/[“”"]/g, "").replace(/[^\p{L}\p{N}' ]+/gu, " ").replace(/\s+/g, " ").trim();
/** Alıntı kaynak metinde (noktalama/tırnak biçimi farkı hariç) aynen geçiyor mu? */
export const alintiKaynaktaMi = (alinti, kaynak) => { const a = alintiKatla(alinti); return a.length >= 6 && alintiKatla(kaynak).includes(a); };
const alintiSil = (metin) => String(metin ?? "").replace(ALINTI_RE, " ");

/**
 * -> {ok, neden, haber?}. d: modelin ayrıştırılmış JSON'u; kaynak: başlık+özet+sayfa düz metni.
 * haber: yayına gidecek alanlar (tr, en, kategori, yer, altKonu, cinsiyet).
 * soylesi: kaynak türü söyleşi/portre (en çok bir kısa alıntıya izin verilir, kopya denetiminden çıkarılır); kaynakDil: "tr" | "en" (alıntı kaynak dilindeki metinde kaynakta aynen aranır).
 */
export function ciktiDogrula(d, kaynak, kaynakBaslik = "", { izinliKategoriler = HABER_KATEGORILERI, soylesi = false, kaynakDil = "" } = {}) {
  if (!d || typeof d !== "object") return { ok: false, neden: "json değil" };
  if (d.uygun !== true) return { ok: false, neden: "model uygun bulmadı", kalici: true };
  if (d.kategori === "teknoloji") return { ok: false, neden: "kategori-kapali", kalici: true };      // sahip 2026-10-16: teknoloji kapalı; bilimsel görünse de bilim'e KAYDIRILMAZ, yalnız elenir
  if (!izinliKategoriler.includes(d.kategori)) return { ok: false, neden: "kategori geçersiz" };
  const kay = rakamlar(kaynak);
  for (const dil of ["tr", "en"]) {
    const m = d[dil];
    if (!(m && typeof m.baslik === "string" && typeof m.ozet === "string" && m.baslik.trim())) return { ok: false, neden: `${dil} alanı eksik` };
    const c = cumleSay(m.ozet);
    if (c < 3 || c > 9) return { ok: false, neden: `${dil} cümle sayısı ${c}` };
    if (m.baslik.length > 90 || m.ozet.length > 2400) return { ok: false, neden: `${dil} çok uzun` };
    if (/https?:\/\/|www\.|[*_#`]{2,}|^\s*[-*•]\s|\[[^\]]*\]\(/m.test(m.baslik + "\n" + m.ozet)) return { ok: false, neden: `${dil} bağlantı/markdown` };
    if (/\p{Extended_Pictographic}/u.test(m.baslik + m.ozet)) return { ok: false, neden: `${dil} emoji` };
    if (/!/.test(m.baslik + m.ozet)) return { ok: false, neden: `${dil} ünlem` };
    const yy = yaziylaYil(m.baslik + " " + m.ozet, dil);
    if (yy) return { ok: false, neden: `${dil} sayı/yıl yazıyla (rakamla yazılmalı) rakam kuralı` };
    if (dil === "tr") {
      m.baslik = turkceOnar(m.baslik); m.ozet = turkceOnar(m.ozet);              // virgülden önce boşluk, çift boşluk: sessizce onarılır
      const yh = yazimHatasi(m.baslik + " " + m.ozet); if (yh) return { ok: false, neden: `tr yazım hatası: ${yh}` };
    }
    if (soylesi) {
      const q = alintilariAyikla(m.ozet);
      if (q.length > 1) return { ok: false, neden: `${dil} alıntı: en çok bir alıntı olabilir` };
      if (q.length === 1) {
        if (kelimeSay(q[0]) > 20) return { ok: false, neden: `${dil} alıntı: 20 kelimeden uzun` };
        if (dil === kaynakDil && !alintiKaynaktaMi(q[0], kaynak)) return { ok: false, neden: `${dil} alıntı: kaynakta aynen geçmiyor` };
      }
    }
    const fazla = [...rakamlar(m.baslik + " " + m.ozet)].filter((x) => !kay.has(x));
    if (fazla.length) return { ok: false, neden: `${dil} kaynakta olmayan rakam` };
    if (!dilUygun(m.ozet, dil)) return { ok: false, neden: `${dil} dil sezgisi tutmadı` };
    if (dil === "tr") {   // dil sezgisinden sonra: TR alanına İngilizce konmuşsa önce "dil" nedeni dönsün
      const ts = [...turkceDenetle(m.ozet), ...turkceDenetle(m.baslik).filter((x) => !x.startsWith("kucuk-harf"))];
      if (ts.length) return { ok: false, neden: turkceNeden(ts) };               // cümle başı küçük harf, "ve,", açık tırnak/parantez, tekrar, 45+ kelimelik cümle, İngilizce kalıntı: yeniden yazım
    }
  }
  const kopyaMetni = (t) => (soylesi ? alintiSil(t) : t);        // söyleşide izinli tek alıntı kopya sayılmaz
  if (kaynaktanKopya(kopyaMetni(d.en.ozet), kaynak) || kaynaktanKopya(kopyaMetni(d.tr.ozet), kaynak)) return { ok: false, neden: "kaynaktan kopya" };
  const tum = [d.tr.baslik, d.tr.ozet, d.en.baslik, d.en.ozet, d.yer || ""].join(" ");
  const f = denetle(tum);
  if (!f.ok) return { ok: false, neden: `ikinci filtre:${f.tur}`, kalici: true };
  const ho = haberOlmayan(d.tr.baslik) || haberOlmayan(d.en.baslik);
  if (ho) return { ok: false, neden: "haber değil kapısı", kalici: true };         // tavsiye/liste/ipucu yazısı (yazım çağrısı sonrası ikinci emniyet)
  const k = konuYasak(tum, kaynakBaslik);
  if (k.length) return { ok: false, neden: `${k[0].kural} kapısı`, kalici: true };
  // görsel arama terimi (isteğe bağlı): kısa, yalnız İngilizce harf, insan odaklı kelime yok
  const gorselAra = aramaTerimi(d.gorsel_arama), gorselAra2 = aramaTerimi(d.gorsel_arama2);   // asıl somut terim + daha genel yedek terim
  const gorselOzne = ozneAyikla(d.gorsel_ozne);
  const gorselAdaylari = adaylariAyikla(d.gorsel_adaylari, [kaynak, kaynakBaslik, d.en.baslik, d.en.ozet, d.tr.baslik, d.tr.ozet].join(" "));   // görsel planı: metinde geçmeyen ad atılır, en çok 5
  const yerKurum = typeof d.yer_kurum_adi === "string" ? d.yer_kurum_adi.replace(/[^A-Za-z0-9 .'&-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) : "";   // görsel aramasında önce aranır
  const yer = typeof d.yer === "string" && d.yer.trim() ? d.yer.trim().slice(0, 120) : "Dünya";
  // armasız kart (lib/skor_kart.mjs): kanıtlanamazsa alan sessizce atılır, haber reddedilmez. TEK kart: önce PUAN DURUMU (sahip: "puan durumunu alta koy"), sonra DERLEME skor listesi, sonra tek maç.
  let kart = null;
  if (d.kategori === "spor") {
    const yazilan = [d.tr.baslik, d.tr.ozet, d.en.baslik, d.en.ozet].join(" "), ek = { kaynakBaslik, enBaslik: d.en.baslik };
    kart = (d.puan && puanKartiDogrula(d.puan, kaynak, yazilan, ek)) || (d.skorlar && skorlarKartiDogrula(d.skorlar, kaynak, yazilan, ek)) || (d.skor && skorKartiDogrula(d.skor, kaynak, yazilan, ek)) || null;
  }
  return {
    ok: true, neden: "",
    haber: {
      tr: { baslik: d.tr.baslik.trim(), ozet: d.tr.ozet.trim() }, en: { baslik: d.en.baslik.trim(), ozet: d.en.ozet.trim() },
      kategori: d.kategori, yer, altKonu: altKonuDogrula(d.kategori, d.alt_konu), cinsiyet: d.kategori === "spor" ? cinsiyetDogrula(d.cinsiyet) : "", ...(gorselAra ? { gorselAra } : {}), ...(gorselAra2 && gorselAra2 !== gorselAra ? { gorselAra2 } : {}), ...(gorselOzne ? { gorselOzne } : {}), ...(gorselAdaylari.length ? { gorselAdaylari } : {}), ...(yerKurum.length >= 3 ? { yerKurum } : {}), ...(kart ? { kart } : {}),
    },
  };
}

// ---- Çevrilmiş özel ad şüphesi (sahip şikâyeti 2026-10-13: "Çizgide Uzlaş" gibi ders planı adı kelime kelime çevrilmişti)
const katlaOA = (t) => String(t || "").toLocaleLowerCase("tr").normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i");
const OA_HARIC = new Set(["ocak", "subat", "mart", "nisan", "mayis", "haziran", "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik", "pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar",
  "turkiye", "amerika", "avrupa", "asya", "afrika", "ingiltere", "almanya", "fransa", "italya", "ispanya", "japonya", "cin", "hindistan", "rusya", "kanada", "avustralya", "brezilya", "istanbul", "ankara", "izmir", "londra", "paris", "berlin", "roma", "tokyo", "new", "york", "los", "angeles", "san", "francisco",
  "birlesmis", "milletler", "dunya", "saglik", "orgutu", "avrupa", "birligi", "kizilay", "uzay", "ajansi", "bilim", "teknoloji", "universitesi", "enstitusu", "merkezi", "muzesi", "okulu", "hastanesi", "belediyesi", "gokyuzu", "okyanusu", "denizi", "dagi", "nehri", "golu"]);
const buyuk = (w) => /^\p{Lu}/u.test(w) && !/^\p{Lu}+$/u.test(w.replace(/['’].*$/, "")) ;
/**
 * TR metinde, kaynakta bulunmayan "Baş Harfleri Büyük" 2+ kelimelik öbekler (çevrilmiş özel ad şüphesi). Yanlış pozitif düşük:
 * ay/gün/ülke/şehir/kurum sözcükleri hariç; öbeğin KELİMELERİNDEN biri bile (ilk 5 harfle) kaynakta geçiyorsa şüphe sayılmaz.
 * -> ["Çizgide Uzlaş", ...]
 */
export function ozelAdSuphesi(trMetin, kaynak) {
  const kay = katlaOA(kaynak), bulunan = [];
  for (const cumle of String(trMetin || "").split(/(?<=[.?])\s+/)) {
    const k = cumle.trim().split(/\s+/).map((w) => w.replace(/^[“"‘'(]+|[”",;:)]+$/g, ""));
    for (let i = 0; i < k.length; i++) {
      if (!buyuk(k[i])) continue;
      let j = i;
      while (j + 1 < k.length && buyuk(k[j + 1])) j++;
      if (j > i) {
        const kelimeler = k.slice(i, j + 1), govde = kelimeler.map((w) => katlaOA(w.replace(/['’].*$/, "")));
        const haric = govde.some((w) => OA_HARIC.has(w));
        const kaynaktaGecer = kay.includes(govde.join(" ")) || govde.some((w) => w.length >= 4 && kay.includes(w.slice(0, 5)));
        if (!haric && !kaynaktaGecer) bulunan.push(kelimeler.join(" "));
      }
      i = j;
    }
  }
  return [...new Set(bulunan)];
}
/** Şüpheli öbek geçen cümleleri çıkarır. -> yeni özet */
export function suphelicumleleriCikar(ozet, oneriler) {
  return String(ozet).split(/(?<=[.?])\s+/).filter((c) => !oneriler.some((o) => c.includes(o))).join(" ");
}
