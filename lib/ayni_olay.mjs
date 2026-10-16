// "Aynı olay" denetimi: farklı sözcüklerle yazılmış ama aynı olayı anlatan iki haberi (iki yayıncı, aynı maç) yakalar.
// Ham başlık benzerliği (on_eleme.tekrarlariEle, eşik 0.7) bunu kaçırıyordu: "Fenerbahçe, EuroLeague'de Zalgiris karşısında kazandı" ile
// "Fenerbahçe Tarfin, evinde Zalgiris Kaunas'ı mağlup etti" (aynı maç, 99-80) iki kez yayınlandı (canlı 2026-10-14).
// Ölçüt (saf işlevler, ağ yok): özel adlar (büyük harfli, ek/kesme/aksan ayıklanmış, genel sözcükler hariç) + skorlar (99-80) + büyük sayılar.
//   Aynı olay = en az 2 ortak ayırt edici özel ad VE
//     (a) ortak skor + ortak ad oranı >= 0.4, ya da ortak büyük sayı + oran >= 0.6, YA DA
//     (b) ortak ad oranı >= 0.75 (ham aday için ayrıca en az 3 ortak ad).
//   (c) KİŞİ + OLGU (2026-10-16, canlı örnek: "Kelechi Iheanacho Türkiye'de gol rekorunu kırdı" ile "…Türk futbol tarihine geçti" iki kez yayınlandı): iki haberde ORTAK KİŞİ ADI (art arda iki özel ad)
//     VE (ortak olgu sayısı ≥ 10: "39 gol", "100. maç" ya da ortak ayırt edici içerik sözcüğü kökleri: en az 5 kök ve küçük kümenin %40'ı). Skorlar çelişiyorsa yine FARKLI olaydır (aynı oyuncunun farklı maçları).
//   Oran = ortak ad sayısı / küçük kümenin ad sayısı. İki haberde de skor varsa ve hiçbiri ortak değilse FARKLI olaydır (aynı takımın iki maçı).

const kat = (s) => String(s ?? "").replace(/İ/g, "i").replace(/ı/g, "i").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/ß/g, "ss").replace(/ł/g, "l").replace(/ø/g, "o").replace(/đ/g, "d");

// Ayırt edici OLMAYAN sözcükler (katlanmış): ay/gün adları, cümle başı sözcükleri (bağlaçlar, "Researchers", "Volunteers" gibi sıradan çoğul adlar), ülke/büyük şehir, genel yarışma ve kurum sözcükleri.
const GENEL = new Set((
  "ocak subat mart nisan mayis haziran temmuz agustos eylul ekim kasim aralik january february april may june july august september october november december " +
  "pazartesi sali carsamba persembe cuma cumartesi pazar monday tuesday wednesday thursday friday saturday sunday " +
  "the this that these those after before during with from while when where what who why how his her their its our they she we you but and for new one two three according officials " +
  "researchers scientists team teams players player coach statement said says report reports bugun dun yarin ancak ayrica fakat ise ama bunun bunlar sonra once gore buna " +
  "turkiye turkey turk turkish istanbul ankara izmir avrupa europe european dunya world amerika america usa abd london paris berlin madrid roma rome " +
  "league ligi lig super champions sampiyonlar sampiyonasi championship championships cup kupa kupasi euroleague nba uefa fifa olympic olympics olimpiyat olimpiyatlari grand prix open series tour " +
  "university universitesi institute enstitusu ministry bakanligi belediyesi municipality foundation vakfi association federation federasyonu company group club kulubu takimi national milli ulusal spor sports festival museum muzesi " +
  "fk fc sk sc bank news haber haberleri " +
  "however meanwhile overall today yesterday tomorrow finally instead additionally moreover furthermore currently recently later earlier now here there also still then " +
  "volunteers students residents neighbors neighbours people experts doctors teachers farmers children kids engineers authorities fans families workers women men local several many some most both each every another " +
  "gonulluler ogrenciler sakinler komsular uzmanlar doktorlar ogretmenler ciftciler cocuklar aileler isciler kadinlar erkekler bilim insanlari arastirmacilar yetkililer taraftarlar ayrica ancak bugun dun yarin simdi bazi birkac"
).split(" "));

// Sıradan sözcükler (katlanmış): içerik kökü karşılaştırmasında sayılmaz.
const DURAK = new Set((
  "olarak sonra kadar ancak icin daha icinde ile oldu etti edildi verdi yapti gibi bunun ayrica sonuc ilgili ifade etti belirtti soyledi acikladi dedi boyle bunu buna bunlar uzere kendi diger bazi cok fazla tum her hic ise veya ya da ama ve bir iki uc " +
  "with that this have been were their about after into over more than also said says will which would could being other some such only when what year years first last most while between during since against through under again before there where" ).split(" "));
const OLGU = /(\d{1,3})\.?\s*(?:['’]?\s*(?:inci|nci|uncu|th|st|nd|rd))?\s+(?:gol|goal|mac|match|sayi|asist|assist|rebound|madalya|medal)\w*|(?:gol|goal)\w*\s+(?:sayi\w*\s+)?(\d{1,3})(?!\d)/g;
/** Olgu sayıları: "39 gol", "100. maç", "gol sayısı 34" -> {"39","100","34"} (yalnız ≥ 10). Küçük sayılar (1-9) ayırt edici değildir. */
function olguSayilari(metin) {
  const s = new Set();
  for (const m of kat(metin).matchAll(OLGU)) { const d = Number(m[1] ?? m[2]); if (Number.isFinite(d) && d >= 10) s.add(String(d)); }
  return s;
}
/** İçerik sözcük kökleri (ilk 5 harf; durak/genel/kısa sözcükler hariç). */
function icerikKokleri(metinler) {
  const k = new Set();
  for (const x of metinler) for (const m of kat(x.metin).matchAll(/[a-z]{4,}/g)) { if (!DURAK.has(m[0]) && !GENEL.has(m[0])) k.add(m[0].slice(0, 5)); }
  return k;
}
/** Art arda iki özel ad (tek boşlukla ayrık, ikisi de ayırt edici ad kümesinde): kişi adı adayı ("kelechi iheanacho"). */
function kisiAdlari(metinler, adlar) {
  const k = new Set();
  for (const x of metinler) {
    const t = [...x.metin.matchAll(TOKEN)];
    for (let i = 0; i + 1 < t.length; i++) {
      const a = t[i], b = t[i + 1];
      if (!buyukMu(a[0]) || !buyukMu(b[0]) || x.metin.slice(a.index + a[0].length, b.index) !== " ") continue;
      const ka = kat(a[0].split(/['’ʼ]/)[0]), kb = kat(b[0].split(/['’ʼ]/)[0]);
      if (adlar.has(ka) && adlar.has(kb) && ka !== kb) k.add(ka + " " + kb);
    }
  }
  return k;
}

const TOKEN = /\p{L}[\p{L}\p{M}]*(?:['’ʼ]\p{L}[\p{L}\p{M}]*)?/gu;
const buyukMu = (s) => /^\p{Lu}/u.test(s);

/** Bir metin parçasındaki büyük harfli sözcükleri döner: [{ad (katlanmış, kesme sonrası atılmış), kesin (cümle başı/başlık biçimi şüphesi yok), ipucu (cümle başında ama yanında virgül ya da büyük harfli sözcük var: "Fenerbahçe," "Sabah FK")}] */
function adAdaylari(metin, baslikMi) {
  const tokenler = [...metin.matchAll(TOKEN)];
  const buyukOran = tokenler.length ? tokenler.filter((m) => buyukMu(m[0])).length / tokenler.length : 0;
  const baslikBicimi = baslikMi && tokenler.length >= 4 && buyukOran >= 0.7;     // İngilizce "Title Case" başlık: her sözcük büyük harfli, hiçbiri kesin sayılmaz
  const sonuc = [];
  for (const m of tokenler) {
    if (!buyukMu(m[0])) continue;
    const kesmeli = /['’ʼ]/.test(m[0]);
    const govde = m[0].split(/['’ʼ]/)[0];
    const ad = kat(govde);
    if (ad.length < 3 || GENEL.has(ad)) continue;
    const once = metin.slice(0, m.index).replace(/[\s"“”'‘’(\[«]+$/u, "");
    const cumleBasi = once === "" || /[.!?:;…\n]$/.test(once);
    const sonra = metin.slice(m.index + m[0].length);
    const ipucu = !baslikBicimi && (/^\s*,/.test(sonra) || /^\s+\p{Lu}/u.test(sonra));
    sonuc.push({ ad, kesin: kesmeli || (!cumleBasi && !baslikBicimi), ipucu });
  }
  return sonuc;
}

const SKOR = /(?<![\d-])(\d{1,3})\s*[-–—]\s*(\d{1,3})(?![\d-])/g;
/** Skorlar ("99-80", sırasız) ve büyük miktarlar (en az 3 basamaklı, yıl olmayan; "22.950" -> 22950). */
function sayilariCikar(metin) {
  const skorlar = new Set(), sayilar = new Set();
  const kalan = metin.replace(SKOR, (tam, a, b) => {
    if (Number(a) >= 1900 || Number(b) >= 1900) return " ";            // yıl aralığı ("2025-26" değil ama "1999-2003")
    skorlar.add([Number(a), Number(b)].sort((x, y) => x - y).join("-"));
    return " ";
  });
  for (const m of kalan.matchAll(/\d[\d.,]*\d|\d/g)) {
    let d = m[0];
    if (/^\d{1,3}([.,]\d{3})+$/.test(d)) d = d.replace(/[.,]/g, "");
    if (!/^\d+$/.test(d)) continue;                                     // ondalık: ayırt edici sayılmaz
    if (d.length < 3) continue;
    if (d.length === 4 && Number(d) >= 1900 && Number(d) <= 2100) continue;   // yıl
    sayilar.add(String(Number(d)));
  }
  return { skorlar, sayilar };
}

/**
 * Haber imzası. parcalar: [{baslik, ozet}, ...] (yazılmış haberde TR ve EN ayrı parça; ham adayda tek parça).
 * Cümle başındaki büyük harfli sözcük (kesmesiz) ancak yanında ipucu varsa (virgül ya da büyük harfli sözcük: "Fenerbahçe," "Sabah FK") YA DA aynı haberin en az 2 ayrı metin parçasında geçiyorsa ("Fenerbahçe beat…")
 * özel ad sayılır; sıradan cümle başı sözcükleri ("Researchers in Lisbon...") GENEL listesiyle elenir.
 * -> { adlar:Set, skorlar:Set, sayilar:Set }
 */
export function ayniOlayImza(parcalar) {
  const metinler = [];
  for (const p of parcalar || []) for (const [t, m] of [["baslik", p?.baslik], ["ozet", p?.ozet]]) if (m) metinler.push({ baslikMi: t === "baslik", metin: String(m) });
  const bilgi = new Map();   // ad -> {kesin, parca:Set}
  metinler.forEach((x, i) => {
    for (const { ad, kesin, ipucu } of adAdaylari(x.metin, x.baslikMi)) {
      const b = bilgi.get(ad) || { kesin: false, ipucu: false, parca: new Set() };
      b.kesin = b.kesin || kesin; b.ipucu = b.ipucu || ipucu; b.parca.add(i); bilgi.set(ad, b);
    }
  });
  const adlar = new Set([...bilgi].filter(([, b]) => b.kesin || b.ipucu || b.parca.size >= 2).map(([ad]) => ad));
  const skorlar = new Set(), sayilar = new Set();
  for (const x of metinler) { const s = sayilariCikar(x.metin); s.skorlar.forEach((k) => skorlar.add(k)); s.sayilar.forEach((k) => sayilar.add(k)); }
  return { adlar, skorlar, sayilar, kisiler: kisiAdlari(metinler, adlar), olgular: new Set(metinler.flatMap((x) => [...olguSayilari(x.metin)])), kokler: icerikKokleri(metinler) };
}

/** Yayına hazır haber ({tr:{baslik,ozet}, en:{baslik,ozet}}) -> imza */
export const haberImzasi = (h) => ayniOlayImza([{ baslik: h?.tr?.baslik, ozet: h?.tr?.ozet }, { baslik: h?.en?.baslik, ozet: h?.en?.ozet }]);
/** Ham aday ({baslik, ozet}) -> imza */
export const adayImzasi = (a) => ayniOlayImza([{ baslik: a?.baslik, ozet: a?.ozet }]);

/** İki imza aynı olayı mı anlatıyor? ham=true: ham aday metni daha gürültülü olduğundan oran yolu için en az 3 ortak ad ister. -> {ayni, neden} */
export function ayniOlayMi(x, y, { ham = false } = {}) {
  const ortak = [...x.adlar].filter((k) => y.adlar.has(k));
  if (ortak.length < 2) return { ayni: false, neden: "ortak-ad-az" };
  const skorOrtak = [...x.skorlar].filter((k) => y.skorlar.has(k));
  if (x.skorlar.size && y.skorlar.size && !skorOrtak.length) return { ayni: false, neden: "skor-celisir" };
  const oran = ortak.length / Math.min(x.adlar.size, y.adlar.size);
  const miktarOrtak = [...x.sayilar].filter((k) => y.sayilar.has(k)).length;
  if (skorOrtak.length && oran >= 0.4) return { ayni: true, neden: "ad+skor" };     // aynı skor tesadüfen çakışmaz: daha gevşek oran yeter (yan adlar: antrenör, hakem...)
  if (miktarOrtak && oran >= 0.6) return { ayni: true, neden: "ad+sayi" };
  if (oran >= 0.75 && ortak.length >= (ham ? 3 : 2)) return { ayni: true, neden: "ad-oran" };
  // (c) ortak kişi adı + ortak olgu: farklı sözcüklerle yazılmış aynı kişisel haber (tek özel kişi, aynı rekor/olgu)
  if ([...(x.kisiler || [])].some((k) => y.kisiler?.has(k))) {
    const olguOrtak = [...(x.olgular || [])].filter((k) => y.olgular?.has(k)).length;
    const kokOrtak = [...(x.kokler || [])].filter((k) => y.kokler?.has(k)).length, kokOran = kokOrtak / Math.max(1, Math.min(x.kokler?.size || 0, y.kokler?.size || 0));
    if (olguOrtak) return { ayni: true, neden: "kisi+olgu" };
    if (kokOrtak >= 5 && kokOran >= 0.4) return { ayni: true, neden: "kisi+icerik" };
  }
  return { ayni: false, neden: "yetersiz" };
}

/** imza listesinde aynı olayı anlatan ilk kaydı bulur. liste: [{imza, ...}] -> kayıt | null */
export function ayniOlayBul(imza, liste, secenek) {
  for (const k of liste || []) if (k?.imza && ayniOlayMi(imza, k.imza, secenek).ayni) return k;
  return null;
}
