// Türkçe karakter tutarlılığı: model başlığı bazen ASCII'ye düşürür ("gunde", "yagmuru"). Gövde doğru yazılmışsa oradan onarılır;
// onarılamayan ama bilinen bozuk kalıplar modelden bir kez yeniden istenir. Yanlış pozitif düşük tutulur: yalnız sözlükteki köklere bakılır.
const TR_HARF = /[çğıöşüÇĞİÖŞÜ]/;
const kelimeler = (t) => String(t || "").match(/[\p{L}]+/gu) || [];

/** Türkçe harfleri ASCII'ye katlar (küçük harf). */
export const katla = (k) => String(k).toLocaleLowerCase("tr").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u");

// ASCII yazılmış hâliyle bilinen Türkçe kökler (ek alabilir: "gunde", "yagmuru"). Tam kelime ya da kök+ek olarak eşleşir.
const BILINEN_KOKLER = ["gun", "yagmur", "icin", "buyuk", "kucuk", "dunya", "cocuk", "sampiyon", "saglik", "ogrenci", "ogret", "gelistir", "uretim", "turk", "dort", "uc",
  "yuz", "gul", "guzel", "gorsel", "gore", "gorev", "bulus", "kus", "uye", "kosu", "yaris", "odul", "dogal", "dogada", "sicak", "soguk", "calis", "basari", "basar", "baslik"];
const TAM_ONLY = new Set(["uc", "yuz", "gul", "kus", "uye"]);   // kısa kökler yalnız tam kelime (ek alan çakışmalar için)
const bilinenBozuk = (w) => {
  const l = w.toLowerCase();
  if (TR_HARF.test(l)) return false;
  return BILINEN_KOKLER.some((k) => (TAM_ONLY.has(k) ? l === k : l === k || (l.startsWith(k) && l.length - k.length <= 5)));
};

/**
 * Başlığı gövdeden onarır: başlıktaki ASCII kelimenin katlanmış hâli gövdedeki bir kelimenin katlanmış hâline eşit ama yazımı farklıysa gövdedeki yazım alınır.
 * -> {baslik, degisti:boolean, supheli:boolean}. supheli: onarımdan sonra da başlıkta bilinen bozuk kalıp kaldı (gövdede TR harf varken başlıkta hiç yoksa).
 */
export function baslikOnar(baslik, govde) {
  const harita = new Map();
  for (const k of kelimeler(govde)) {
    if (!TR_HARF.test(k)) continue;
    const f = katla(k);
    if (!harita.has(f)) harita.set(f, new Map());
    const m = harita.get(f); m.set(k.toLocaleLowerCase("tr"), (m.get(k.toLocaleLowerCase("tr")) || 0) + 1);
  }
  let degisti = false;
  const yeni = String(baslik).replace(/[\p{L}]+/gu, (w) => {
    if (TR_HARF.test(w)) return w;
    const m = harita.get(katla(w));
    if (!m) return w;
    const en = [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
    degisti = true;
    // büyük/küçük harf kalıbını koru
    if (w === w.toUpperCase() && w.length > 1) return en.toLocaleUpperCase("tr");
    if (w[0] === w[0].toUpperCase()) return en[0].toLocaleUpperCase("tr") + en.slice(1);
    return en;
  });
  const govdeTr = TR_HARF.test(String(govde));
  const supheli = govdeTr && !TR_HARF.test(yeni) && kelimeler(yeni).some(bilinenBozuk);
  return { baslik: yeni, degisti, supheli };
}
