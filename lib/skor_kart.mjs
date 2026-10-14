// Maç sonucu haberi için ARMASIZ SKOR KARTI (sahip 2026-10-14): iki takım adı + skor (+ organizasyon, aşama). Görsel dosyası yok; istemci CSS ile çizer.
// Kulüp arması / lig logosu kullanılmaz. Kart ek model çağrısıyla DEĞİL, yazım çağrısının JSON'undaki isteğe bağlı `skor` alanından gelir ve KOD ile doğrulanır.
// gecis-020: bu dosya üç kart türünü doğrular — skorKartiDogrula (tek maç, aşağıda) · skorlarKartiDogrula (derleme listesi) · puanKartiDogrula (puan durumu tablosu); son ikisi dosyanın sonundadır.
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

/** Kaynak cümleleri (katlanmış). satir/bölüm sonu cümle sınırıdır; ince: ; • | gibi liste ayraçları da sınırdır (derleme satırları için). */
export const cumleBol = (kaynak, ince = false) => String(kaynak ?? "").split(ince ? /(?<=[.!?])\s+|\s*[\n;•|]+\s*/ : /(?<=[.!?])\s+|\s*\n+\s*/).map(katla).filter(Boolean);

/**
 * (n1,s1)-(n2,s2) çiftini kaynak cümlelerinde sayar (n1/n2 katlanmış adlar). -> {dogru, ters, celiski, digerlerinde:Set}
 * dogru: yön kanıtı eşleşen cümle; ters: yön kanıtı TERS; celiski: aynı cümlede başka skor/penaltı/agrega ya da iki ad + başka sayı; digerlerinde: iki adı içermeyen cümlelerdeki (parantez dışı) skorlar.
 */
function macKanitla(n1, n2, s1, s2, cumleler) {
  let dogru = 0, ters = 0, celiski = 0;
  const digerlerinde = new Set();
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
  return { dogru, ters, celiski, digerlerinde };
}

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

  const cumleler = cumleBol(kaynak);
  const { dogru, ters, celiski, digerlerinde } = macKanitla(n1, n2, s1, s2, cumleler);
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

// ================================================================ DERLEME: `skorlar` (sahip 2026-10-14: "Skor paylaşıyorsan mutlaka liste halinde paylaş")
// Sözleşme (yük `kart`): { tur: "skorlar", organizasyon?, asama?, maclar: [{ taraf1, taraf2, skor1, skor2 }] }  (2-12 maç; her maçta taraf1 <-> skor1 aynı takım)
// HER maç kaynakta TEK TEK kanıtlanır (tek maçlık kanıt kuralları aynen: macKanitla); kanıtlanamayan/ters/çelişkili maç LİSTEDEN ATILIR; 2'den az kalırsa kart yok.
// Derleme satırları ayrı satır ya da ; • | ile ayrılmış cümleler olarak aranır (bir cümlede iki maç varsa ikisi de "aynı cümlede başka skor" çelişkisine takılır ve atılır: yanlış listeden kötüsü yoktur).
export const MAC_ALT = 2, MAC_UST = 12, MAC_ADAY_UST = 24;

function etkinlikAdi(x, ust, kay) {
  const s = temizAd(x, 2, ust);
  return s && ETKINLIK_RE.test(s) && !/https?:|www\.|[!*_#`]/.test(s) && kay.includes(katla(s)) ? s : "";
}

/**
 * -> kart nesnesi | null. ham: {organizasyon?, asama?, maclar:[{taraf1, taraf2, skor1, skor2}]}; kaynak: başlık+özet+sayfa düz metni.
 * notlar: ret nedeni; atilanlar: kanıtlanamayıp listeden atılan maçların kısa nedenleri (test/günlük).
 */
export function skorlarKartiDogrula(ham, kaynak, _yazilan = "", { notlar = [], atilanlar = [] } = {}) {
  const red = (n) => { notlar.push(n); return null; };
  if (!ham || typeof ham !== "object" || !Array.isArray(ham.maclar)) return null;
  const kay = katla(kaynak), cumleler = cumleBol(kaynak, true);
  const kabul = [];
  for (const m of ham.maclar.slice(0, MAC_ADAY_UST)) {
    const at = (n) => atilanlar.push(n);
    if (!m || typeof m !== "object") { at("maç nesnesi değil"); continue; }
    const t1 = temizAd(m.taraf1, 2, 40), t2 = temizAd(m.taraf2, 2, 40);
    if (!t1 || !t2 || !AD_RE.test(t1) || !AD_RE.test(t2)) { at("ad geçersiz"); continue; }
    const s1 = m.skor1, s2 = m.skor2;
    if (!Number.isInteger(s1) || !Number.isInteger(s2) || s1 < 0 || s2 < 0 || s1 > SKOR_AZAMI || s2 > SKOR_AZAMI) { at(`${t1}: skor aralık/tür`); continue; }
    const n1 = katla(t1), n2 = katla(t2);
    if (n1 === n2 || n1.includes(n2) || n2.includes(n1) || /\d{3,}/.test(t1 + t2)) { at(`${t1}: adlar aynı/içiçe/rakamlı`); continue; }
    if (!new RegExp(adRe(n1)).test(kay) || !new RegExp(adRe(n2)).test(kay)) { at(`${t1}-${t2}: ad kaynakta yok`); continue; }
    const k = macKanitla(n1, n2, s1, s2, cumleler);
    if (k.ters || k.celiski) { at(`${t1}-${t2}: ${k.ters ? "ters skor" : "çelişkili kanıt"}`); continue; }
    if (!k.dogru) { at(`${t1}-${t2}: yön kanıtı yok`); continue; }
    kabul.push({ t1, t2, s1, s2, n1, n2 });
  }
  // aynı eşleşme iki kez: aynıysa tekilleştir, farklıysa ikisi de atılır (çelişki olabilir)
  const harita = new Map();
  for (const m of kabul) {
    const a = [m.n1, m.n2].sort().join("|");
    const var_ = harita.get(a);
    const ayni = (x) => (x.n1 === m.n1 ? x.s1 === m.s1 && x.s2 === m.s2 : x.s1 === m.s2 && x.s2 === m.s1);
    if (!var_) harita.set(a, { m, celiski: false });
    else if (!ayni(var_.m)) var_.celiski = true;
  }
  const liste = [...harita.values()].filter((x) => { if (x.celiski) atilanlar.push(`${x.m.t1}-${x.m.t2}: aynı eşleşme çelişkili skorlarla iki kez`); return !x.celiski; }).map((x) => x.m);
  if (liste.length < MAC_ALT) return red(`kanıtlanan maç ${liste.length} < ${MAC_ALT}`);
  const secilen = liste.slice(0, MAC_UST);
  const organizasyon = etkinlikAdi(ham.organizasyon, 60, kay), asama = etkinlikAdi(ham.asama, 40, kay);
  const f = denetle([...secilen.flatMap((m) => [m.t1, m.t2]), organizasyon, asama].join(" "));
  if (!f.ok) return red(`ikinci filtre:${f.tur}`);
  return { tur: "skorlar", ...(organizasyon ? { organizasyon } : {}), ...(asama ? { asama } : {}), maclar: secilen.map((m) => ({ taraf1: m.t1, taraf2: m.t2, skor1: m.s1, skor2: m.s2 })) };
}

// ================================================================ PUAN DURUMU: `puan` (sahip 2026-10-14: "puan durumundan söz ediyorsan mutlaka puan durumunu alta koy görsel olarak")
// Sözleşme (yük `kart`): { tur: "puan", organizasyon, tarih_notu?, kismi?: true, satirlar: [{ sira, takim, oynanan?, puan, averaj? }] }  (3-20 satır)
// İLKE: yanlış puan tablosu, kartsızlıktan çok daha kötüdür. Emin değilsek kart yok.
// Kanıt: her satırın SIRA + TAKIM + PUAN üçlüsü kaynakta AYNI satırda (ya da bir sonraki satıra kadar kesintisiz sayı dizisinde) geçmelidir:
//   "<sıra>[.)] <takım>" hemen ardından yalnız sayı/ayraç/puan işareti sözcükleri (puan, pts, p, o, av ...) gelir; PUAN, o satırdaki son düz sayıdır ya da hemen ardından "puan/pts/p" işareti olan sayıdır.
//   Satır için kaynakta FARKLI puanlar okunuyorsa (çelişki) satır kanıtsızdır. oynanan = satırın İLK sayısı, averaj = PUANDAN hemen önceki sayı olmalı (negatif averaj işaretli); kanıtlanamayan sütun TÜM tablodan düşer (puan yine kalır).
// Tablo SIRA 1'den başlayıp ARDIŞIK gider; ilk kanıtsız satırda kesilir ("kismi: true" → istemci "İlk N" notu düşer). En az 3 satır kanıtlanmazsa kart yok.
// Model satırları kendi içinde tutarsızsa (sıra atlıyor, puan sıraya göre ARTIYOR, takım tekrarı) kart yok.
export const PUAN_SATIR_ALT = 3, PUAN_SATIR_UST = 20, PUAN_AZAMI = 999;

// satır sonlarını koruyarak katla (katla() satır sonunu da tek boşluğa çevirir)
const katlaSatir = (t) => String(t ?? "").replace(/\r/g, "").toLocaleLowerCase("tr").normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i").replace(/[’‘`´]/g, "'").replace(/[ \t ]+/g, " ").replace(/ ?\n[ \n]*/g, "\n").trim();
const PUAN_ISARETI = /^(?:puan\w{0,5}|pts?|points?|p)$/;
const DIGER_ISARET = /^(?:o|av|averaj|g|b|m|a|y|ap)$/;           // sütun harfleri: sayıdan sonra gelirse sessizce geçilir (puan işareti sayılmaz)
const SAYI_RE = /^[+\-−–]?\d{1,3}$/, BILESIK_RE = /^\d{1,3}\s*[-–:/]\s*\d{1,3}$/;
const sayiDeger = (t) => Number(t.replace(/^[+]/, "").replace(/^[−–]/, "-"));

/** metin[bas, sinir) aralığındaki kesintisiz "satır sonu" sayı dizisi. -> {sayilar:[{deger, imli, puanIsareti, kompozit}], son:"sinir"|"sozcuk"} */
function satirKosusu(metin, bas, sinir) {
  const sayilar = [];
  let son = "sinir";
  for (const ham of metin.slice(bas, sinir).split(/[\s|]+/)) {
    const t = ham.replace(/^[(\[]+|[)\],.;:]+$/g, "");
    if (!t || /^[-–—]+$/.test(t)) continue;
    if (SAYI_RE.test(t)) { sayilar.push({ deger: sayiDeger(t), imli: /^[+\-−–]/.test(t), puanIsareti: false, kompozit: false }); continue; }
    if (BILESIK_RE.test(t)) { sayilar.push({ deger: null, imli: false, puanIsareti: false, kompozit: true }); continue; }
    if (PUAN_ISARETI.test(t)) { if (sayilar.length) sayilar[sayilar.length - 1].puanIsareti = true; continue; }
    if (DIGER_ISARET.test(t)) continue;
    son = "sozcuk"; break;
  }
  return { sayilar, son };
}

/** Koşudan satırın PUANI. -> {deger, i (koşudaki indeks)} | null. sonrakiSira: bir sonraki satırın sıra numarası (sınır bulunamadıysa koşuya sızmış olabilir). */
function puanOku(kosu, sonrakiSira) {
  const isaretliIdx = kosu.sayilar.map((x, i) => (x.puanIsareti && x.deger !== null && !x.imli ? i : -1)).filter((i) => i >= 0);
  if (isaretliIdx.length === 1) return { deger: kosu.sayilar[isaretliIdx[0]].deger, i: isaretliIdx[0] };
  if (isaretliIdx.length > 1) return null;
  const l = kosu.sayilar.slice();
  let sinirda = kosu.son === "sinir";
  if (!sinirda && l.length >= 2) {                                   // koşu bir SÖZCÜKLE bitti: sondaki sayı sonraki satırın sıra numarası olabilir
    const son = l[l.length - 1];
    if (son.deger === sonrakiSira && !son.imli) { l.pop(); sinirda = true; }
  }
  if (!sinirda && l.length < 2) return null;                           // "17 maçta 30 puan" gibi düz yazı: tek sayı + sözcük = belirsiz
  const son = l[l.length - 1];
  return son && son.deger !== null && !son.imli ? { deger: son.deger, i: l.length - 1 } : null;
}

/**
 * -> kart nesnesi | null. ham: {organizasyon, tarih_notu?, satirlar:[{sira, takim, oynanan?, puan, averaj?}]}; kaynak: başlık+özet+sayfa düz metni (satır sonları korunmuş olabilir).
 * notlar: ret nedeni; atilanlar: kanıtsız satırın nedeni (test/günlük).
 */
export function puanKartiDogrula(ham, kaynak, _yazilan = "", { kaynakBaslik = "", notlar = [], atilanlar = [] } = {}) {
  const red = (n) => { notlar.push(n); return null; };
  if (!ham || typeof ham !== "object" || !Array.isArray(ham.satirlar)) return null;
  const kay = katlaSatir(kaynak), kayDuz = katla(kaynak + " " + kaynakBaslik);
  const org = temizAd(ham.organizasyon, 2, 60);
  if (!org || !ETKINLIK_RE.test(org) || /https?:|www\.|[!*_#`]/.test(org) || !kayDuz.includes(katla(org))) return red("organizasyon yok/kaynakta yok");
  // ---- model satırlarının kendi içinde tutarlılığı
  const ham20 = ham.satirlar.slice(0, PUAN_SATIR_UST);
  if (ham20.length < PUAN_SATIR_ALT) return red("satır sayısı < 3");
  const satirlar = [], gorulen = new Set();
  let onceki = Infinity, oHepsi = true, aHepsi = true;
  for (let i = 0; i < ham20.length; i++) {
    const r = ham20[i];
    if (!r || typeof r !== "object") return red("satır nesnesi değil");
    const takim = temizAd(r.takim, 2, 40);
    if (!takim || !AD_RE.test(takim) || /\d{3,}/.test(takim)) return red("takım adı geçersiz");
    const n = katla(takim);
    if (gorulen.has(n)) return red("takım tekrarı");
    gorulen.add(n);
    if (r.sira !== i + 1) return red("sıra 1'den ardışık değil");
    if (!Number.isInteger(r.puan) || r.puan < 0 || r.puan > PUAN_AZAMI) return red("puan aralık/tür");
    if (r.puan > onceki) return red("puan sıraya göre artıyor");
    onceki = r.puan;
    const o = Number.isInteger(r.oynanan) && r.oynanan >= 0 && r.oynanan <= 99 ? r.oynanan : null, a = Number.isInteger(r.averaj) && r.averaj >= -999 && r.averaj <= 999 ? r.averaj : null;
    if (o === null) oHepsi = false;
    if (a === null) aHepsi = false;
    satirlar.push({ sira: r.sira, takim, n, puan: r.puan, o, a });
  }
  // ---- kaynak kanıtı: ilk kanıtsız satırda kes
  const kanit = [];
  for (let i = 0; i < satirlar.length; i++) {
    const r = satirlar[i], sonraki = satirlar[i + 1];
    if (!new RegExp(adRe(r.n)).test(kay)) { atilanlar.push(`${r.sira}. ${r.takim}: ad kaynakta yok`); break; }
    const baslangic = new RegExp(`(?<![0-9])${r.sira}\\s*[.)]?\\s*${adRe(r.n)}${adEki}`, "g");
    const puanlar = new Set(), uyanlar = [];
    for (const m of kay.matchAll(baslangic)) {
      const e = m.index + m[0].length;
      let sinir = Math.min(e + 100, kay.length);
      const nl = kay.indexOf("\n", e);
      if (nl >= 0) sinir = Math.min(sinir, nl);
      if (sonraki) {
        const rx = new RegExp(`(?<![0-9])${sonraki.sira}\\s*[.)]?\\s*${adRe(sonraki.n)}`, "g");
        rx.lastIndex = e;
        const mm = rx.exec(kay);
        if (mm && mm.index < sinir) sinir = mm.index;
      }
      const kosu = satirKosusu(kay, e, sinir), p = puanOku(kosu, r.sira + 1);
      if (p !== null) { puanlar.add(p.deger); uyanlar.push({ kosu, i: p.i }); }
    }
    if (puanlar.size === 0) { atilanlar.push(`${r.sira}. ${r.takim}: satır/puan kaynakta bulunamadı`); break; }
    if (puanlar.size > 1) { atilanlar.push(`${r.sira}. ${r.takim}: kaynakta çelişkili puanlar`); break; }
    if (!puanlar.has(r.puan)) { atilanlar.push(`${r.sira}. ${r.takim}: puan kaynakta farklı`); break; }
    // oynanan = satırın İLK sayısı; averaj = PUANDAN hemen önceki sayı (negatifse işaretli yazılmış olmalı). Rastgele bir sütundaki aynı sayı kanıt sayılmaz.
    const oOk = r.o !== null && uyanlar.some((u) => u.kosu.sayilar[0]?.deger === r.o && !u.kosu.sayilar[0].imli);
    const aOk = r.a !== null && uyanlar.some((u) => { const x = u.kosu.sayilar[u.i - 1]; return !!x && x.deger === r.a && (r.a < 0 ? x.imli : true); });
    kanit.push({ ...r, oOk, aOk });
  }
  if (kanit.length < PUAN_SATIR_ALT) return red(`kanıtlanan satır ${kanit.length} < ${PUAN_SATIR_ALT}`);
  const oSutun = oHepsi && kanit.every((r) => r.oOk), aSutun = aHepsi && kanit.every((r) => r.aOk);
  // ---- tablo tam mı? kanıtlanan son satırdan sonra kaynakta bir sonraki satır başlıyorsa ya da model daha fazla satır verdiyse "ilk N"
  const n = kanit.length;
  const devam = new RegExp(`(?<![0-9])${n + 1}\\s*[.)]?\\s*[\\p{L}][\\p{L}\\p{N} .'&-]{1,38}?\\s+\\d{1,3}(?![0-9])`, "u").test(kay);
  const kismi = n < satirlar.length || devam;
  const tarihNotu = etkinlikAdi(ham.tarih_notu, 40, kayDuz);
  const f = denetle([...kanit.map((r) => r.takim), org, tarihNotu].join(" "));
  if (!f.ok) return red(`ikinci filtre:${f.tur}`);
  return {
    tur: "puan", organizasyon: org, ...(tarihNotu ? { tarih_notu: tarihNotu } : {}), ...(kismi ? { kismi: true } : {}),
    satirlar: kanit.map((r) => ({ sira: r.sira, takim: r.takim, ...(oSutun ? { oynanan: r.o } : {}), puan: r.puan, ...(aSutun ? { averaj: r.a } : {}) })),
  };
}
