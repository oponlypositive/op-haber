// Maç sonucu haberi için ARMASIZ SKOR KARTI (sahip 2026-10-14): iki takım adı + skor (+ organizasyon, aşama). Görsel dosyası yok; istemci CSS ile çizer.
// Kulüp arması / lig logosu kullanılmaz. Kart ek model çağrısıyla DEĞİL, yazım çağrısının JSON'undaki isteğe bağlı `skor` alanından gelir ve KOD ile doğrulanır.
//
// Sözleşme (yük `kart`): { tur: "skor", taraf1, taraf2, skor1, skor2, organizasyon?, asama? }
//   taraf1 <-> skor1 AYNI takımındır. "ev/deplasman" KAVRAMI YOK: kaynaktan ev sahibi kesin doğrulanamaz; sıra, kaynaktaki yazılış/kanıt sırasıdır.
// İLKE: yanlış skor kartı, kartsızlıktan çok daha kötüdür. Skorun HANGİ TAKIMA ait olduğu kaynak cümlesinde KANITLANAMAZSA kart üretilmez (haber yine yayınlanır).
//
// Kanıt biçimleri (kaynak metninde, aynı cümlede iki takım adı + skor çifti):
//   A  "Fenerbahçe 99-80 Real Madrid"        adlar skorun iki yanında, aralarında yalnız ayraç
//   B  "Fenerbahçe - Real Madrid 99-80"      "X - Y" / "X vs Y" + skor (tablo/başlık sırası: ilk ad ilk sayı)
//   D  "Lakers 112, Celtics 108"             her adın hemen yanında kendi sayısı
//   C  fiil: "X beat Y 99-80", "Y lost to X 80-99", "X, Y'yi 3-1 yendi", "Y, X'e 3-1 yenildi"
//      kazananın kimliği fiilden bellidir; kazanan DAHA BÜYÜK sayıyı alır (maçı kazanan her zaman daha çok sayı/gol/set yapmıştır)
// Reddedilenler: beraberlik dışında yön kanıtı yok / kanıt çelişkili / aynı cümlede başka skor çifti (parantez içi hariç) / seri penaltı, agrega, toplam skor /
//   derleme (sonuç listesi) belirtisi / adlar kaynakta ya da yazılan metinde geçmiyor / skor 0-250 dışı / adlar 2-40 karakter ve farklı değil.
import { denetle } from "./moderasyon.mjs";

const SKOR_AZAMI = 250;

/** Karşılaştırma için katlama: küçük harf (tr), aksansız, ı->i, tek tırnak, tek boşluk. */
export const katla = (t) => String(t ?? "").toLocaleLowerCase("tr").normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i").replace(/[’‘`´]/g, "'").replace(/\s+/g, " ").trim();
const kacis = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const AD_RE = /^[\p{L}\p{N}][\p{L}\p{N} .'&\-/]{0,38}[\p{L}\p{N}.]$/u;
const ETKINLIK_RE = /^[\p{L}\p{N}][\p{L}\p{N} .,'&\-–/:]*$/u;
const temizAd = (x, en, ust) => {
  const s = typeof x === "string" ? x.replace(/\s+/g, " ").trim() : "";
  return s.length >= en && s.length <= ust ? s : "";
};

// ---- skor çifti: "99-80", "2 - 0", "3:1" (saat gibi görünen "20:30" skor sayılmaz)
const SKOR_RE = /(?<![0-9])(\d{1,3})\s*[-–—:]\s*(\d{1,3})(?![0-9])/g;
function ciftler(k) {
  const l = [];
  for (const m of k.matchAll(SKOR_RE)) {
    const ham = m[0], a = +m[1], b = +m[2];
    if (/:/.test(ham) && /^\d{1,2}\s*:\s*\d{2}$/.test(ham) && a <= 23 && b <= 59) continue;     // saat
    const once = k.slice(0, m.index), parantezde = (once.match(/\(/g) || []).length > (once.match(/\)/g) || []).length;
    l.push({ a, b, bas: m.index, son: m.index + ham.length, parantezde });
  }
  return l;
}

const PEN_RE = /penalt|shoot-?out|aggregate|\bagg\b|agregat|toplam(?:da)? skor|toplam sonuc|away goal|deplasman golu|averaj/;
const TARAF_FIIL = {
  // kaybeden öznedir
  enKay: /(?:\blost(?: \d{1,3}\s*[-–:]\s*\d{1,3})? (?:to|against|at home to)\b|\bfell to\b|\b(?:was|were|been|got) (?:beaten|defeated) by\b|\bbeaten by\b|\bdefeated by\b|\bbowed to\b|\bsuccumbed to\b|\blost out to\b)/g,
  // kazanan öznedir
  enKaz: /(?:\bbeat\b|\bbeats\b|\bbeating\b|\bdefeated\b|\bdefeats\b|\bdowned\b|\bedged\b|\btopped\b|\bovercame\b|\boutlasted\b|\boutscored\b|\brouted\b|\bthrashed\b|\bcrushed\b|\bdispatched\b|\bwon(?: \d{1,3}\s*[-–:]\s*\d{1,3})? (?:against|over)\b|\bwin over\b|\bvictory over\b|\btriumphed over\b)/g,
  // Türkçe: özne, nesne ... fiil (fiil cümle sonunda)
  trKay: /(?:\byenildi\b|\bmaglup oldu\b|\bboyun egdi\b|\bkaybetti\b|\byenilgi aldi\b)/g,
  trKaz: /(?:\byendi\b|\bmaglup etti\b|\bgalip geldi\b|\bdevirdi\b|\balt etti\b|\bezdi\b)/g,
};

/** Cümle içinde tek bir "kazanan/kaybeden" fiil varsa -> {tur:"en"|"tr", kazananOzne:boolean, bas, son}; yoksa/çoksa null. */
function fiilBul(k) {
  const bulunan = [];
  let kalan = k;
  for (const [ad, re] of [["enKay", TARAF_FIIL.enKay], ["trKay", TARAF_FIIL.trKay], ["enKaz", TARAF_FIIL.enKaz], ["trKaz", TARAF_FIIL.trKaz]]) {
    const yedek = kalan;
    for (const m of yedek.matchAll(re)) {
      bulunan.push({ ad, bas: m.index, son: m.index + m[0].length });
      kalan = kalan.slice(0, m.index) + " ".repeat(m[0].length) + kalan.slice(m.index + m[0].length);   // "defeated by" kaybeden sayılınca "defeated" kazanan sayılmasın
    }
  }
  if (bulunan.length !== 1) return null;
  const f = bulunan[0];
  return { tur: f.ad.startsWith("en") ? "en" : "tr", kazananOzne: f.ad.endsWith("Kaz"), bas: f.bas, son: f.son };
}

const adRe = (n) => `(?<![a-z0-9])${kacis(n)}(?![a-z0-9])`;
const adEki = "(?:'[a-z]{0,6})?";      // Fenerbahçe'nin, Madrid'i

/** D biçimi: "X 112, Y 108" (her ad kendi sayısıyla; tire/iki nokta yok). -> {[n1]:x,[n2]:y} | null */
function yonD(k, n1, n2) {
  for (const [X, Y] of [[n1, n2], [n2, n1]]) {
    const m = new RegExp(`${adRe(X)}${adEki}\\s*(\\d{1,3})(?![0-9])\\s*[,;]?\\s*${adRe(Y)}${adEki}\\s*(\\d{1,3})(?![0-9\\-–:])`).exec(k);
    if (m) return { [X]: +m[1], [Y]: +m[2] };
  }
  return null;
}

/** n1 -> x, n2 -> y kanıtı. -> {x, y} | null. (Bir cümle, katlanmış.) */
function yonKaniti(k, n1, n2, cf) {
  const [A, B] = [n1, n2];
  for (const p of cf) {
    const sol = k.slice(0, p.bas), sag = k.slice(p.son);
    for (const [X, Y, x, y] of [[A, B, p.a, p.b], [B, A, p.a, p.b]]) {
      // A: "X 99-80 Y"
      if (new RegExp(`${adRe(X)}${adEki}[\\s,:()]*$`).test(sol) && new RegExp(`^[\\s,:()]*${adRe(Y)}`).test(sag)) return { [X]: x, [Y]: y, ad: "A" };
      // B: "X - Y 99-80" / "X vs Y: 99-80"
      if (new RegExp(`${adRe(X)}${adEki}\\s*(?:-|–|—|vs\\.?|v|x)\\s*${adRe(Y)}${adEki}[\\s,:()]*$`).test(sol)) return { [X]: x, [Y]: y, ad: "B" };
    }
  }
  // C: fiil
  const f = fiilBul(k);
  if (f && cf.length) {
    const sol = k.slice(0, f.bas), sag = k.slice(f.son);
    for (const [S, O] of [[A, B], [B, A]]) {                              // S = fiilin öznesi, O = nesne
      let uygun = false;
      if (f.tur === "en") uygun = new RegExp(`${adRe(S)}${adEki}(?: [a-z']+){0,3}[\\s,]*$`).test(sol) && new RegExp(`^(?:[^a-z0-9]|\\d|\\s|[a-z']{1,12} ){0,40}?${adRe(O)}`).test(sag.slice(0, 80));
      else uygun = new RegExp(`${adRe(S)}${adEki}[\\s,]+${adRe(O)}${adEki}((?:[\\s,]+[^\\s,]+){0,4})\\s*$`).test(sol);
      if (!uygun) continue;
      const p = cf[0], yuksek = Math.max(p.a, p.b), dusuk = Math.min(p.a, p.b);
      if (yuksek === dusuk) return null;
      const kazanan = f.kazananOzne ? S : O, kaybeden = f.kazananOzne ? O : S;
      return { [kazanan]: yuksek, [kaybeden]: dusuk, ad: "C" };
    }
  }
  return null;
}

const DERLEME_BASLIK = /\b(results|roundup|round-up|matchday|gameweek|sonuclar|mac sonuclari|haftanin|gunun)\b/;

/**
 * Modelin `skor` alanını kaynakla doğrular. -> kart nesnesi | null (null = kart yok; haber yine yayınlanır).
 * ham: modelin {taraf1, taraf2, skor1, skor2, organizasyon?, asama?}; kaynak: başlık+özet+sayfa düz metni; yazilan: yazılmış TR/EN başlık+özet (tek metin).
 * notlar: dizi verilirse retin kısa nedeni eklenir (test/günlük).
 */
export function skorKartiDogrula(ham, kaynak, yazilan = "", { kaynakBaslik = "", enBaslik = "", notlar = [] } = {}) {
  const red = (n) => { notlar.push(n); return null; };
  if (!ham || typeof ham !== "object") return null;
  const t1 = temizAd(ham.taraf1, 2, 40), t2 = temizAd(ham.taraf2, 2, 40);
  if (!t1 || !t2 || !AD_RE.test(t1) || !AD_RE.test(t2)) return red("ad geçersiz");
  const s1 = ham.skor1, s2 = ham.skor2;
  if (!Number.isInteger(s1) || !Number.isInteger(s2) || s1 < 0 || s2 < 0 || s1 > SKOR_AZAMI || s2 > SKOR_AZAMI) return red("skor aralık/tür");
  const n1 = katla(t1), n2 = katla(t2);
  if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return red("adlar aynı/içiçe");
  if (/\d{3,}/.test(t1 + t2)) return red("ad rakamlı");
  const kay = katla(kaynak), yaz = katla(yazilan);
  if (!new RegExp(adRe(n1)).test(kay) || !new RegExp(adRe(n2)).test(kay)) return red("ad kaynakta yok");
  if (!new RegExp(adRe(n1)).test(yaz) || !new RegExp(adRe(n2)).test(yaz)) return red("ad yazılan metinde yok");
  if (DERLEME_BASLIK.test(katla(kaynakBaslik)) || DERLEME_BASLIK.test(katla(enBaslik))) return red("derleme belirtisi");

  const cumleler = String(kaynak ?? "").split(/(?<=[.!?])\s+|\s*\n+\s*/).map(katla).filter(Boolean);      // satır sonu (başlık/özet/sayfa ayrımı) da cümle sınırıdır
  let dogru = 0, ters = 0, celiski = 0, digerlerinde = new Set();
  for (const k of cumleler) {
    const cf = ciftler(k), varMi = (a, b) => cf.filter((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a));
    const iki = new RegExp(adRe(n1)).test(k) && new RegExp(adRe(n2)).test(k);
    if (!iki) { for (const p of cf) if (!p.parantezde) digerlerinde.add(`${p.a}-${p.b}`); continue; }
    const hedef = varMi(s1, s2);
    const baska = cf.filter((p) => !p.parantezde && !((p.a === s1 && p.b === s2) || (p.a === s2 && p.b === s1)));
    const d = hedef.length ? null : yonD(k, n1, n2);
    if (d) {                                                              // "Lakers 112, Celtics 108": sayılar adların yanında
      if (baska.length || PEN_RE.test(k)) celiski++;
      else if (d[n1] === s1 && d[n2] === s2) dogru++;
      else if (d[n1] === s2 && d[n2] === s1) ters++; else celiski++;
      continue;
    }
    if (!hedef.length) { if (baska.length) celiski++; continue; }          // iki ad var ama sayı başka: çelişki
    if (baska.length || PEN_RE.test(k)) { celiski++; continue; }          // aynı cümlede başka skor / seri penaltı / agrega
    if (s1 === s2) { if (fiilBul(k)) { celiski++; continue; } dogru++; continue; }         // beraberlik: yön gerekmez, ama kazanma fiili çelişkidir
    const y = yonKaniti(k, n1, n2, hedef);
    if (!y) continue;
    if (y[n1] === s1 && y[n2] === s2) dogru++; else ters++;
  }
  if (digerlerinde.size >= 4) return red("derleme belirtisi (çok skor)");
  if (ters || celiski) return red(ters ? "ters skor" : "çelişkili kanıt");
  if (!dogru) return red("yön kanıtı yok");

  const etkinlik = (x, ust) => {
    const s = temizAd(x, 2, ust);
    return s && ETKINLIK_RE.test(s) && !/https?:|www\.|[!*_#`]/.test(s) && kay.includes(katla(s)) ? s : "";      // kaynakta geçmiyorsa alan atılır (kart kalır)
  };
  const organizasyon = etkinlik(ham.organizasyon, 60), asama = etkinlik(ham.asama, 40);
  const kart = { tur: "skor", taraf1: t1, taraf2: t2, skor1: s1, skor2: s2, ...(organizasyon ? { organizasyon } : {}), ...(asama ? { asama } : {}) };
  const f = denetle([t1, t2, organizasyon, asama].join(" "));
  if (!f.ok) return red(`ikinci filtre:${f.tur}`);
  return kart;
}
