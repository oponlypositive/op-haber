// Paragraf son işlemi (sahip 2026-10-15: "bot paylaşımlarda paragraflar 3 cümleyi geçmesin, okuması zorlaşıyor").
// Yayın yükü kurulmadan hemen önce (lib/bulut.mjs yayinYuku) özet metninde 3 cümleden uzun paragraf, dengeli 2-3 cümlelik paragraflara bölünür ("\n\n").
// Saf işlev (ağ yok). Dokunulmayanlar: başlık (yalnız özet işlenir), liste/adım/tarif blokları ("Malzemeler:", "1.", "- "), tek satırlık etiketler,
// tırnak içi (“...” ya da "...") bölünmez, kısaltma ("Dr.", "Prof.", "vb."), baş harf ("A. Şahin", "A.Ş."), sıra sayısı ("15. yüzyıl"), ondalık sayı.

export const PARAGRAF_UST = 3;

const KISALTMA = new Set(("dr prof doç doc op av sn sy sayın vb vs vd yy yd bkz örn ör no st mr mrs ms jr sr mt cad sok bul müh uzm yrd öğr gör üyesi alb gen müd hz inc ltd co corp etc approx fig vol ed eds pp ca cf dept univ ave blvd rd mah apt").split(" "));
const YAPILI_ANAHTAR = /(?:malzemeler|yapılışı|hazırlanışı|yapılış|nasıl oynanır|gerekenler|adımlar|ipucu|kişi|ingredients|method|instructions|directions|steps|you need|how to play|players|tip)\s*:/i;
const BUYUK = /^[\p{Lu}\d"“‘'(\[]/u;

/** Paragrafı cümlelere böler (tırnak içi ve kısaltmalarda bölmez). -> ["...", ...] */
export function cumlelereBol(par) {
  const m = String(par ?? "");
  const out = [];
  let bas = 0, tirnak = false;
  for (let i = 0; i < m.length; i++) {
    const c = m[i];
    if (c === "“") tirnak = true;
    else if (c === "”") tirnak = false;
    else if (c === '"') tirnak = !tirnak;
    const kapanis = !tirnak && (c === "”" || c === '"') && i > 0 && /[.!?…]/.test(m[i - 1]);      // “...cümle.” kapanış tırnağından sonra cümle biter
    if (tirnak || !(kapanis || /[.!?…]/.test(c))) continue;
    let j = i;
    while (j + 1 < m.length && /[.!?…]/.test(m[j + 1])) j++;                       // "..." / "?!"
    while (j + 1 < m.length && /["”’)\]]/.test(m[j + 1])) { j++; if (m[j] === '"') tirnak = !tirnak; }   // kapanış tırnağı/parantez cümleye ait
    if (!(j + 1 < m.length && /\s/.test(m[j + 1]))) { i = j; continue; }          // boşluk yok: ondalık, "A.Ş.", URL
    let k = j + 1;
    while (k < m.length && /\s/.test(m[k])) k++;
    if (k >= m.length) break;
    if (!BUYUK.test(m.slice(k))) { i = j; continue; }                                // sonraki küçük harf: "15. yüzyıl", "vb. ile"
    if (c === ".") {
      const onceki = m.slice(bas, i).match(/[\p{L}\p{N}.'’]+$/u)?.[0] ?? "";
      const kel = onceki.replace(/^['’]+/, "");
      if (kel.length === 1 && /\p{L}/u.test(kel)) { i = j; continue; }               // baş harf: "A. Şahin"
      if (/^\d{1,2}$/.test(kel)) { i = j; continue; }                                // sıra sayısı: "15. Yüzyıl"
      if (KISALTMA.has(kel.toLocaleLowerCase("tr").replace(/\.$/, ""))) { i = j; continue; }
      if (/^(?:\p{L}\.)+\p{L}$/u.test(kel)) { i = j; continue; }                     // "A.Ş", "U.S"
    }
    out.push(m.slice(bas, j + 1).trim());
    bas = k;
    i = j;
  }
  const son = m.slice(bas).trim();
  if (son) out.push(son);
  return out;
}

const yapili = (p) => /\n/.test(p) || /^\s*(?:\d+[.)]\s|[-*•–]\s)/m.test(p) || YAPILI_ANAHTAR.test(p) || /^[\p{L} ]{2,30}:\s*$/mu.test(p);

/** n cümleyi 2-3'lük dengeli gruplara dağıtır: 4 -> 2+2, 5 -> 3+2, 7 -> 3+2+2. */
export function dengeliBoyutlar(n, ust = PARAGRAF_UST) {
  const g = Math.ceil(n / ust), taban = Math.floor(n / g), artan = n % g;
  return Array.from({ length: g }, (_, i) => taban + (i < artan ? 1 : 0));
}

/** Tek paragraf: en çok `ust` cümle ise aynen; uzunsa dengeli bölünür. Yapılandırılmış blok aynen kalır. -> metin ("\n\n" ile) */
export function paragrafBol(par, ust = PARAGRAF_UST) {
  const p = String(par ?? "");
  if (!p.trim() || yapili(p)) return p;
  const c = cumlelereBol(p);
  if (c.length <= ust) return p;
  const boyut = dengeliBoyutlar(c.length, ust), parcalar = [];
  let i = 0;
  for (const b of boyut) { parcalar.push(c.slice(i, i + b).join(" ")); i += b; }
  return parcalar.join("\n\n");
}

/** Tüm metin: paragraflar (boş satırla ayrılı) tek tek işlenir; paragraf arası biçim korunur. Metin değişmediyse aynı dize döner. */
export function paragraflaraBol(metin, ust = PARAGRAF_UST) {
  if (typeof metin !== "string" || !metin) return metin;
  return metin.split(/(\n\s*\n)/).map((x, i) => (i % 2 ? x : paragrafBol(x, ust))).join("");
}

/** Yayın yükü için: {baslik, ozet} -> aynı biçimde (başlık dokunulmaz; ozet değişmediyse aynı nesne). */
export function metinParagrafla(m, ust = PARAGRAF_UST) {
  if (!m || typeof m.ozet !== "string") return m;
  const o = paragraflaraBol(m.ozet, ust);
  return o === m.ozet ? m : { ...m, ozet: o };
}
