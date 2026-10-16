// op_muzik müfredat DOĞRULAYICISI + ÜRETİCİSİ (SALT OKUMA: yalnız Vikipedi / Wikidata / Commons / YouTube oEmbed OKUNUR; hiçbir şey yayınlanmaz, API anahtarı kullanılmaz).
//   node arac/muzik_dogrula.mjs            -> rapor (arac/dogrulandi_muzik.json); lib/mufredat/op_muzik.mjs'ye DOKUNMAZ
//   node arac/muzik_dogrula.mjs --yaz      -> raporu yazar ve doğrulanan şarkılarla lib/mufredat/op_muzik.mjs'yi ÜRETİR (aday listesi: arac/aday/muzik_aday.mjs)
//   MUZIK_ONBELLEK=<dosya.json>            -> ağ yanıtlarını diske önbellekler (yineleme hızlanır)
// Her aday için denetim (sırayla):
//   1) Vikipedi şarkı/eser maddesi VAR, anlam ayrımı değil (EN ve/veya TR; yönlendirme izlenir). Madde albüm/film çıkarsa "(song)" biçimleri denenir.
//   2) Wikidata öğesi: P31 şarkı/single/beste (eserlerde albüm/insan/anlam ayrımı olmamalı); sitelinks enwiki/trwiki; P175 flytti sanatçı ya da arama ile sanatçı QID (kişi/grup), P1651 resmî video adayları.
//   3) Kaynak metin (motorun kaynakTopla sırası: önce TR, kısaysa EN): >= 600 karakter, kaynakHassasMi değil, + tema taraması (uyuşturucu/şiddet/intihar/din/siyaset ağırlıklı ise ELENİR). Başlık yasak sözcük taraması.
//   4) Sanatçı fotoğrafı: P18 Commons dosyası; lisans beyaz listesi (CC0/BY/BY-SA/PD), albüm kapağı/non-free değil, boyut, arşiv (kişide < 2005) -> "foto" durumu (yedek: seri enstrümanı).
//   5) Resmî video: P1651 kimlikleri YouTube oEmbed ile denetlenir; author_name sanatçı/VEVO/plak şirketi kanalı olmalı (lib/muzik.mjs resmiVideoMu). Bulunamazsa video YOK (Vikipedi bağlantısı kalır).
//   Video kimliğini MODEL ÜRETMEZ: tek kaynak Wikidata P1651.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { SERILER, ENSTRUMANLAR } from "./aday/muzik_aday.mjs";
import { katla, commonsAday } from "../lib/gorsel_aday.mjs";
import { arsivMi, fotoDegilMi, lisansOk, yasakliMi } from "../lib/gorsel.mjs";
import { maddeGetir, kaynakHassasMi } from "../lib/konu.mjs";
import { ALKOL, KUMAR_PARA, SIDDET, TARIH_YASAK } from "../lib/konu_yasak.mjs";
import { SAGLIK } from "../lib/konu_yasak.mjs";
import { denetle } from "../lib/moderasyon.mjs";
import { konuYasak } from "../lib/on_eleme.mjs";
import { SOZ_NOTU, muzikGorselRet, oembedUrl, resmiVideoMu } from "../lib/muzik.mjs";

const BURASI = fileURLToPath(new URL("./", import.meta.url));
const MUF = fileURLToPath(new URL("../lib/mufredat/", import.meta.url));
const UA = "OPMufredat/1.0 (salt okuma dogrulama; OP haber hatti; muzik)";
const dur = (ms) => new Promise((r) => setTimeout(r, ms));
const YAZ = process.argv.includes("--yaz");
const ONB_DOSYA = process.env.MUZIK_ONBELLEK || "";
const onbellek = (() => { try { return ONB_DOSYA ? JSON.parse(fs.readFileSync(ONB_DOSYA, "utf8")) : {}; } catch { return {}; } })();
const onbellekYaz = () => { if (ONB_DOSYA) fs.writeFileSync(ONB_DOSYA, JSON.stringify(onbellek)); };
let istek = 0;

async function getir(url, { ms = 450 } = {}) {
  if (onbellek[url] !== undefined) return onbellek[url];
  for (let d = 0; d < 6; d++) {
    await dur(ms); istek++;
    let r;
    try { r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(20000) }); } catch { await dur(3000); continue; }
    if (r.status === 429) { console.error("429, bekleniyor"); await dur(20000 + d * 10000); continue; }
    const t = await r.text();
    let j; try { j = JSON.parse(t); } catch { j = { __hata: r.status }; }
    if (r.status >= 500) { await dur(5000); continue; }
    j.__durum = r.status;
    onbellek[url] = j;
    return j;
  }
  return { __hata: "ag" };
}
const api = (host, params) => getir(`https://${host}/w/api.php?` + new URLSearchParams({ format: "json", formatversion: "2", ...params }));
const parcala = (l, n) => { const s = []; for (let i = 0; i < l.length; i += n) s.push(l.slice(i, i + n)); return s; };
const slug = (t, n = 44) => katla(t).replace(/ /g, "-").slice(0, n).replace(/-+$/, "");

// ---------------------------------------------------------------- 0) adaylar
const SARKI_SINIF = new Set(["Q7366", "Q134556", "Q105543609", "Q207628", "Q2188189", "Q1344", "Q15416", "Q58483083", "Q4175034", "Q4113841", "Q217467", "Q18672855", "Q1054574", "Q2031291", "Q185579"]);   // song, single, musical work/composition, ... (bilinmeyen sınıf "tür?" uyarısı verir, reddetmez; albüm/film/insan/anlam ayrımı reddedilir)
const RED_SINIF = new Set(["Q482994", "Q208569", "Q169930", "Q24634210", "Q4167410", "Q13406463", "Q5", "Q11424", "Q202444", "Q134556_dummy"]);   // albüm, stüdyo albümü, EP, podcast, anlam ayrımı, liste, insan, film, ad
const adaylar = [];
const gorulen = new Set();
for (const [si, seri] of SERILER.entries()) {
  for (const satir of seri.adaylar) {
    const [en0, sanatci, tr0, gor0] = satir.split("|").map((x) => (x ?? "").trim());
    const en = en0 === "-" ? "" : en0;
    const anahtar = katla(en || tr0);
    if (!anahtar || gorulen.has(anahtar) || /skip/i.test(gor0 || "")) continue;
    gorulen.add(anahtar);
    const gorunen = gor0 || (en || tr0).replace(/\s*\([^)]*\)\s*$/, "");
    adaylar.push({ si, yol: seri.yol, tur: seri.tur, en, tr: tr0 || "", sanatci, gorunen, durum: [], red: "" });
  }
}
console.error(`aday: ${adaylar.length}`);
const ret = (a, neden) => { if (!a.red) a.red = neden; };

// ---------------------------------------------------------------- 1) Vikipedi maddesi (çözümlenmiş başlık + QID)
async function maddeCozumle(dil, basliklar) {
  const harita = new Map();
  for (const grup of parcala([...new Set(basliklar.filter(Boolean))], 50)) {
    const j = await api(`${dil}.wikipedia.org`, { action: "query", titles: grup.join("|"), redirects: "1", prop: "pageprops", ppprop: "disambiguation|wikibase_item" });
    const norm = new Map((j.query?.normalized || []).map((x) => [x.from, x.to]));
    const yon = new Map((j.query?.redirects || []).map((x) => [x.from, x.to]));
    const sayfa = new Map((j.query?.pages || []).map((p) => [p.title, p]));
    for (const b of grup) {
      let t = norm.get(b) || b; t = yon.get(t) || t;
      const p = sayfa.get(t);
      if (!p || p.missing) harita.set(b, { ok: false, neden: "madde yok" });
      else if (p.pageprops && "disambiguation" in p.pageprops) harita.set(b, { ok: false, neden: "anlam ayrımı" });
      else harita.set(b, { ok: true, baslik: p.title, qid: p.pageprops?.wikibase_item || "" });
    }
    console.error(dil, "madde", grup.length);
  }
  return harita;
}
const talepler = async (qidler) => {
  const sonuc = new Map();
  for (const grup of parcala([...new Set(qidler.filter(Boolean))], 40)) {
    const j = await getir(`https://www.wikidata.org/w/api.php?` + new URLSearchParams({ action: "wbgetentities", ids: grup.join("|"), props: "claims|labels|descriptions|sitelinks", languages: "en|tr", sitefilter: "enwiki|trwiki", format: "json" }));
    for (const [id, e] of Object.entries(j.entities || {})) sonuc.set(id, e);
    console.error("wikidata", grup.length);
  }
  return sonuc;
};
const degerler = (c) => (Array.isArray(c) ? c.filter((s) => s?.rank !== "deprecated" && s?.mainsnak?.snaktype === "value") : []);
const idler = (c) => degerler(c).map((s) => s.mainsnak.datavalue?.value?.id).filter(Boolean);
const metinler = (c) => degerler(c).map((s) => s.mainsnak.datavalue?.value).filter((x) => typeof x === "string");
const etiketEn = (e) => e?.labels?.en?.value || e?.labels?.tr?.value || "";

const enH = await maddeCozumle("en", adaylar.map((a) => a.en));
const trH = await maddeCozumle("tr", adaylar.map((a) => a.tr));
for (const a of adaylar) {
  const e = a.en ? enH.get(a.en) : null, t = a.tr ? trH.get(a.tr) : null;
  a.enSonuc = e; a.trSonuc = t;
  a.qid = (e?.ok && e.qid) || (t?.ok && t.qid) || "";
}
// madde yok / anlam ayrımı olanlar için ikinci tur: "(song)" / "(<sanatçı> song)" biçimleri
const yedekler = [];
for (const a of adaylar) if (a.en && !a.enSonuc?.ok && !(a.trSonuc?.ok)) for (const alt of [`${a.en} (song)`, `${a.en} (${a.sanatci} song)`]) yedekler.push([a, alt]);
if (yedekler.length) {
  const h2 = await maddeCozumle("en", yedekler.map(([, alt]) => alt));
  for (const [a, alt] of yedekler) { const x = h2.get(alt); if (x?.ok && !a.enSonuc?.ok) { a.enSonuc = x; a.en = alt; a.qid = x.qid; a.durum.push(`yedek başlık: ${alt}`); } }
}
let ent = await talepler(adaylar.map((a) => a.qid));
// tür denetimi: albüm vb. çıktıysa "(song)" biçimi dene
const tekrar = [];
for (const a of adaylar) {
  if (!a.qid) { ret(a, a.enSonuc?.neden || a.trSonuc?.neden || "madde yok"); continue; }
  const e = ent.get(a.qid);
  const sinif = idler(e?.claims?.P31);
  a.sinif = sinif;
  if (sinif.some((s) => RED_SINIF.has(s)) && a.tur === "sarki") {
    for (const alt of [`${a.en.replace(/\s*\([^)]*\)$/, "")} (song)`, `${a.en.replace(/\s*\([^)]*\)$/, "")} (${a.sanatci} song)`]) if (alt !== a.en) tekrar.push([a, alt]);
  } else if (a.tur === "sarki" && !sinif.some((s) => SARKI_SINIF.has(s))) a.durum.push(`tür?:${sinif.join(",")}`);
  else if (a.tur === "eser" && sinif.some((s) => RED_SINIF.has(s))) ret(a, `tür uygun değil:${sinif.join(",")}`);
}
if (tekrar.length) {
  const h3 = await maddeCozumle("en", tekrar.map(([, alt]) => alt));
  const yeni = new Set();
  for (const [a, alt] of tekrar) { const x = h3.get(alt); if (x?.ok && !a.__yeni) { a.__yeni = { alt, x }; yeni.add(x.qid); } }
  const ent3 = await talepler([...yeni]);
  for (const [a, alt] of tekrar) {
    if (!a.__yeni || a.__yeni.alt !== alt) continue;
    const e = ent3.get(a.__yeni.x.qid), sinif = idler(e?.claims?.P31);
    if (sinif.some((s) => SARKI_SINIF.has(s)) && !sinif.some((s) => RED_SINIF.has(s))) { ent.set(a.__yeni.x.qid, e); a.en = alt; a.enSonuc = a.__yeni.x; a.qid = a.__yeni.x.qid; a.sinif = sinif; a.durum.push(`tür düzeltildi: ${alt}`); }
  }
  for (const a of adaylar) if (a.qid && a.tur === "sarki" && !a.red && (a.sinif || []).some((s) => RED_SINIF.has(s))) ret(a, `tür uygun değil (albüm vb.):${a.sinif.join(",")}`);
}
// aynı QID iki kez gelirse ikincisi elenir
{ const g = new Set(); for (const a of adaylar) if (a.qid) { if (g.has(a.qid)) ret(a, "yinelenen öğe"); g.add(a.qid); } }

// ---------------------------------------------------------------- 2) başlık yasak taraması
const TEMA_RE = new RegExp([
  String.raw`(?<![\p{L}])(?:heroin|cocaine|drugs?|overdos\p{L}*|suicid\p{L}*|murder\p{L}*|kill(?:ed|ing|s)?|shoot(?:ing|s)?|shot|rape\p{L}*|addict\p{L}*|marijuana|cannabis|junkie|alcoholi\p{L}*|abus\p{L}*|prostitut\p{L}*|uyuşturucu\p{L}*|intihar\p{L}*|cinayet\p{L}*|öldür\p{L}*|tecavüz\p{L}*|bağımlı\p{L}*)(?![\p{L}])`,
  String.raw`(?<![\p{L}])(?:jesus|christ(?:ian\p{L}*)?|god|allah|muslim\p{L}*|islam\p{L}*|bible\p{L}*|gospel|prayer|church|religio\p{L}*|spiritual\p{L}*|political\p{L}*|politic\p{L}*|protest\p{L}*|apartheid|vietnam|civil rights|assassinat\p{L}*|terror\p{L}*|nazi\p{L}*|dictator\p{L}*|siyas\p{L}*|din(?:i|î|sel)?|tanrı\p{L}*|cami\p{L}*|kilise\p{L}*)(?![\p{L}])`,
].join("|"), "giu");
const temaSayisi = (t) => (String(t || "").slice(0, 3000).match(TEMA_RE) || []).length;
const baslikNedeni = (t) => {
  if (ALKOL.test(t)) return "alkol"; if (KUMAR_PARA.test(t)) return "para"; if (SIDDET.test(t)) return "şiddet"; if (TARIH_YASAK.test(t)) return "tarih-yasak"; if (SAGLIK.test(t)) return "sağlık";
  const d = denetle(t); if (!d.ok) return `moderasyon:${d.tur}`;
  const k = konuYasak(t); if (k.length) return `konu:${k[0].kural}`;
  return "";
};
for (const a of adaylar) if (!a.red) { const bn = baslikNedeni(`${a.gorunen} ${a.sanatci}`); if (bn) ret(a, `başlık yasak (${bn})`); }

// ---------------------------------------------------------------- 3) kaynak metni (motor sırası: TR, kısaysa EN)
for (const a of adaylar) {
  if (a.red) continue;
  const e = ent.get(a.qid), sl = e?.sitelinks || {};
  a.wikiEn = a.enSonuc?.ok ? a.enSonuc.baslik : (sl.enwiki?.title || "");
  a.wikiTr = a.trSonuc?.ok ? a.trSonuc.baslik : (sl.trwiki?.title || "");
  if (!a.wikiEn && !a.wikiTr) { ret(a, "madde başlığı çözülemedi"); continue; }
  const parcalar = [];
  try {
    if (a.wikiTr) { await dur(300); parcalar.push((await maddeGetir("tr", a.wikiTr)).extract); }
    if (a.wikiEn && (!parcalar.length || parcalar[0].length < 1200)) { await dur(300); parcalar.push((await maddeGetir("en", a.wikiEn)).extract); }
  } catch (err) { a.durum.push(`kaynak hata:${String(err.message).slice(0, 20)}`); }
  a.kaynakMetin = parcalar.filter(Boolean).join("\n\n");
  a.kaynakUz = a.kaynakMetin.length;
  if (a.kaynakUz < 600) ret(a, `kaynak-yetersiz:${a.kaynakUz}`);
  else if (kaynakHassasMi(a.kaynakMetin)) ret(a, "kaynak-hassas");
  else if (temaSayisi(a.kaynakMetin) >= 3) ret(a, `tema-hassas:${temaSayisi(a.kaynakMetin)}`);
  if (!a.red) console.error("kaynak ok", a.gorunen, a.kaynakUz);
}

// ---------------------------------------------------------------- 4) sanatçı (P175) + fotoğraf (P18)
const uygunAdaylar = adaylar.filter((a) => !a.red && a.tur === "sarki");
const performerQ = new Set();
for (const a of uygunAdaylar) for (const q of idler(ent.get(a.qid)?.claims?.P175)) performerQ.add(q);
const sanatciEnt = await talepler([...performerQ]);
const SANATCI_SINIF_YOK = new Set(["Q4167410"]);
async function sanatciAra(ad) {
  const j = await getir(`https://www.wikidata.org/w/api.php?` + new URLSearchParams({ action: "wbsearchentities", search: ad, language: "en", uselang: "en", type: "item", limit: "8", format: "json" }));
  const tam = (j.search || []).filter((s) => katla(s.label || s.match?.text || "") === katla(ad)).map((s) => s.id);
  if (!tam.length) return null;
  const e2 = await talepler(tam);
  const iyi = tam.filter((q) => { const c = e2.get(q)?.claims || {}; const sinif = idler(c.P31); return !sinif.some((s) => SANATCI_SINIF_YOK.has(s)) && (sinif.includes("Q5") ? degerler(c.P106).length > 0 : degerler(c.P136).length > 0 || degerler(c.P571).length > 0 || degerler(c.P527).length > 0); });
  if (!iyi.length) return null;
  iyi.sort((x, y) => Object.keys(e2.get(y)?.sitelinks || {}).length - Object.keys(e2.get(x)?.sitelinks || {}).length);
  sanatciEnt.set(iyi[0], e2.get(iyi[0]));
  return iyi[0];
}
const sanatciOnb = new Map();
for (const a of uygunAdaylar) {
  const kos = idler(ent.get(a.qid)?.claims?.P175).filter((q) => { const l = katla(etiketEn(sanatciEnt.get(q))); const s = katla(a.sanatci); return l && (l === s || l.includes(s) || s.includes(l)); });
  let q = kos[0] || "";
  if (!q) { if (!sanatciOnb.has(a.sanatci)) sanatciOnb.set(a.sanatci, await sanatciAra(a.sanatci)); q = sanatciOnb.get(a.sanatci) || ""; if (q) a.durum.push("sanatçı: aramayla"); }
  if (q) {
    const e = sanatciEnt.get(q), insan = idler(e?.claims?.P31).includes("Q5");
    a.sanatciKimlik = { ad_en: etiketEn(e) || a.sanatci, qid: q, tur: insan ? "kisi" : "kurum" };
    const tr = e?.labels?.tr?.value; if (tr && katla(tr) !== katla(a.sanatciKimlik.ad_en)) a.sanatciKimlik.ad_tr = tr;
    a.p18 = metinler(e?.claims?.P18)[0] || "";
  } else a.durum.push("sanatçı bulunamadı");
}
// Commons dosya denetimi (P18)
const commonsKontrol = async (dosyalar) => {
  const harita = new Map();
  for (const grup of parcala([...new Set(dosyalar.filter(Boolean))], 40)) {
    const j = await api("commons.wikimedia.org", { action: "query", titles: grup.map((d) => "File:" + d.replace(/^File:/i, "")).join("|"), prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "1280", redirects: "1" });
    const norm = new Map((j.query?.normalized || []).map((x) => [x.from, x.to])), yon = new Map((j.query?.redirects || []).map((x) => [x.from, x.to]));
    const sayfa = new Map((j.query?.pages || []).map((p) => [p.title, p]));
    for (const d of grup) {
      let t = "File:" + d.replace(/^File:/i, ""); t = norm.get(t) || t; t = yon.get(t) || t;
      const p = sayfa.get(t);
      harita.set(d, p && !p.missing ? commonsAday({ title: p.title, imageinfo: p.imageinfo }, { ek: true, ust: true }) : null);
    }
    console.error("commons", grup.length);
  }
  return harita;
};
const fotoDurumu = (aday, tur, etiket) => {
  if (!aday) return "dosya yok/okunamadı";
  if (!lisansOk(aday.lisans)) return `lisans:${aday.lisans || "?"}`;
  if (muzikGorselRet(aday)) return "albüm kapağı/non-free";
  if (aday.w && aday.w < 600) return "küçük";
  const ad = new RegExp(String(etiket).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  if (yasakliMi(`${aday.metin} ${aday.yaratici || ""}`.replace(ad, " "))) return "yasaklı sözcük";
  if (tur === "kisi" && arsivMi(aday)) return "arşiv (<2005)";
  if (fotoDegilMi(`${aday.baslik || ""} ${aday.metin}`)) return "fotoğraf değil";
  return "";
};
const p18Harita = await commonsKontrol(uygunAdaylar.map((a) => a.p18));
for (const a of uygunAdaylar) {
  if (!a.sanatciKimlik) { a.foto = "sanatçı yok"; continue; }
  if (!a.p18) { a.foto = "P18 yok"; continue; }
  const nedeni = fotoDurumu(p18Harita.get(a.p18), a.sanatciKimlik.tur, a.sanatciKimlik.ad_en);
  a.foto = nedeni ? `ret:${nedeni}` : `ok:${a.p18}`;
}

// ---------------------------------------------------------------- 5) resmî video (Wikidata P1651 + oEmbed)
for (const a of adaylar) {
  if (a.red) continue;
  const adaylarId = metinler(ent.get(a.qid)?.claims?.P1651).filter((x) => /^[A-Za-z0-9_-]{11}$/.test(x));
  a.videoAdaylari = adaylarId.length;
  for (const id of adaylarId.slice(0, 3)) {
    const j = await getir(oembedUrl(id), { ms: 350 });
    if (j.__durum !== 200 || !j.author_name) { a.durum.push(`video ${id}: oEmbed ${j.__durum || j.__hata}`); continue; }
    const v = resmiVideoMu(j, { sanatci: a.sanatciKimlik?.ad_en || a.sanatci, baslik: a.wikiEn || a.gorunen });
    if (v.ok) { a.video = { id, kanal: j.author_name }; break; }
    a.durum.push(`video ${id} (${String(j.author_name).slice(0, 30)}): ${v.neden}`);
  }
}

// ---------------------------------------------------------------- 6) seri enstrüman / mekân yedekleri
// Her terim için Wikidata'da TAM etiket eşleşmesi aranır; insan olmayan, P18 dosyası lisans/kapak/boyut denetiminden geçen ve en çok dil sitesi olan öğe seçilir. ad_en = Wikidata etiketi (çalışma anında qid + etiket yeniden doğrulanır).
const ekGecerli = new Map();
for (const terim of ENSTRUMANLAR) {
  const j = await getir(`https://www.wikidata.org/w/api.php?` + new URLSearchParams({ action: "wbsearchentities", search: terim, language: "en", uselang: "en", type: "item", limit: "10", format: "json" }));
  const tam = (j.search || []).filter((x) => katla(x.label || "") === katla(terim)).map((x) => x.id);
  const entl = await talepler(tam);
  const dosyalar = tam.map((q) => metinler(entl.get(q)?.claims?.P18)[0] || "");
  const harita = await commonsKontrol(dosyalar);
  const iyi = [];
  tam.forEach((q, i) => {
    const sinif = idler(entl.get(q)?.claims?.P31);
    if (sinif.includes("Q5") || sinif.some((c) => SANATCI_SINIF_YOK.has(c)) || !dosyalar[i]) return;
    if (fotoDurumu(harita.get(dosyalar[i]), "nesne", terim)) return;
    iyi.push({ q, dil: Object.keys(entl.get(q)?.sitelinks || {}).length });
  });
  iyi.sort((x, y) => y.dil - x.dil);
  if (iyi.length) { ekGecerli.set(terim, { tur: "nesne", ad_en: etiketEn(entl.get(iyi[0].q)), qid: iyi[0].q }); console.error("enstrüman", terim, iyi[0].q); }
  else console.error("ENSTRÜMAN ELENDİ", terim, tam.join(","));
}

// ---------------------------------------------------------------- rapor
const oz = SERILER.map((s, i) => {
  const l = adaylar.filter((a) => a.si === i);
  const ok = l.filter((a) => !a.red);
  return { seri: s.yol[1], aday: l.length, gecen: ok.length, videolu: ok.filter((a) => a.video).length, fotolu: ok.filter((a) => a.foto?.startsWith("ok:")).length };
});
const elenen = adaylar.filter((a) => a.red).map((a) => ({ seri: a.yol[1], madde: a.en || a.tr, neden: a.red }));
const rapor = { zaman: new Date().toISOString(), istek, ozet: oz, enstruman: { gecerli: [...ekGecerli.entries()].map(([k, v]) => `${k}=${v.qid}`), toplam: ENSTRUMANLAR.length },
  dersler: adaylar.filter((a) => !a.red).map((a) => ({ seri: a.yol[1], id: slug(a.gorunen), wiki_en: a.wikiEn, wiki_tr: a.wikiTr, qid: a.qid, sanatci: a.sanatciKimlik || null, foto: a.foto || "-", video: a.video || null, videoAdaylari: a.videoAdaylari, notlar: a.durum })), elenen };
fs.writeFileSync(BURASI + "dogrulandi_muzik.json", JSON.stringify(rapor, null, 1));
onbellekYaz();
console.log(JSON.stringify({ ozet: oz, toplamGecen: oz.reduce((t, x) => t + x.gecen, 0), toplamVideolu: oz.reduce((t, x) => t + x.videolu, 0), toplamFotolu: oz.reduce((t, x) => t + x.fotolu, 0), elenen: elenen.length, istek }, null, 1));

// ---------------------------------------------------------------- üretim (--yaz)
if (YAZ) {
  const kullanilanId = new Set();
  const seriler = [], serilerHam = [];
  const SERI_UST = Number(process.env.MUZIK_SERI_UST || 30);
  for (const [si, seri] of SERILER.entries()) {
    const gecen = adaylar.filter((a) => a.si === si && !a.red);
    if (!gecen.length) continue;
    const ek = (seri.ek || []).filter((x) => ekGecerli.has(x)).map((x) => ekGecerli.get(x));
    const dersler = [];
    for (const a of gecen) {
      if (!a.sanatciKimlik && !ek.length) continue;
      let id = slug(a.gorunen); if (id.length < 2 || kullanilanId.has(id)) id = slug(`${a.gorunen} ${a.sanatci}`, 56);
      if (kullanilanId.has(id)) id = `${id.slice(0, 50)}-${a.qid.toLowerCase()}`.slice(0, 60);
      kullanilanId.add(id);
      const baslik = a.tur === "sarki" ? `${a.gorunen} · ${a.sanatci}` : a.gorunen;
      const d = {
        id, baslik_tr: baslik.slice(0, 88), baslik_en: baslik.slice(0, 88), tur: "bilgi",
        kaynak: { ...(a.wikiEn ? { wiki_en: a.wikiEn } : {}), ...(a.wikiTr ? { wiki_tr: a.wikiTr } : {}) },
        odak_tr: a.tur === "sarki"
          ? `${a.gorunen} şarkısının yazılış ve kayıt hikâyesini, kimden ya da neyden ilham alındığını ve ilginç bir olguyu kaynaktaki bilgilerle anlat; sözlerden alıntı yapma, tırnak kullanma.`
          : `${a.gorunen.split(" · ")[0]} eserinin bestelenişini, ilk seslendirilişini ve ilginç bir olguyu kaynaktaki bilgilerle anlat; kısa ve olgusal kal.`,
        ...(a.sanatciKimlik && a.foto?.startsWith("ok:") ? { sanatci: a.sanatciKimlik } : {}),
        ...(a.sanatciKimlik && !a.foto?.startsWith("ok:") ? { sanatci_foto: a.foto } : {}),
        ...(ek.length ? { gorsel_ek: ek } : {}),
        ...(a.video ? { video: a.video } : {}),
        gorsel: null, sabit: null,
      };
      if (!d.sanatci && !d.gorsel_ek) continue;
      delete d.sanatci_foto;
      dersler.push(d);
    }
    const puan = (d) => (d.sanatci ? 2 : 0) + (d.video ? 1 : 0);
    const SANATCI_UST = Number(process.env.MUZIK_SANATCI_UST || 6), sanatciSay = new Map();   // seri başına sanatçı çeşitliliği: aynı sanatçıdan en çok 6 ders
    const secili = dersler.map((d, i) => ({ d, i })).sort((x, y) => puan(y.d) - puan(x.d) || x.i - y.i).filter(({ d }) => { const k = d.baslik_tr.split(" · ")[1] || d.id; const n = (sanatciSay.get(k) || 0) + 1; sanatciSay.set(k, n); return n <= SANATCI_UST; }).slice(0, SERI_UST).sort((x, y) => x.i - y.i).map((x) => x.d);
    if (secili.length) serilerHam.push({ yol: seri.yol, aciklama_tr: seri.aciklama_tr, aciklama_en: seri.aciklama_en, dersler: secili });
  }
  // dönüşümlü sıra: her tur her seriden 2 ders (bir günlük kota); aynı yol tekrar eden parçalar halinde yazılır (motor seriSira'yı yol bazında sayar, açıklama yalnız ilk parçada)
  for (let tur = 0; serilerHam.some((x) => x.dersler.length > tur * 2); tur++) {
    for (const x of serilerHam) { const parca = x.dersler.slice(tur * 2, tur * 2 + 2); if (parca.length) seriler.push({ yol: x.yol, ...(tur === 0 ? { aciklama_tr: x.aciklama_tr, aciklama_en: x.aciklama_en } : {}), dersler: parca }); }
  }
  const m = {
    hesap: "op_muzik", kategori: "muzik", gunlukUst: 2, planlayici: false,
    aciklama: "Kült şarkıların ve müzik eserlerinin hikâyeleri: yazılış, kayıt, ilham ve ilginç olgular (sözler telifli olduğu için paylaşılmaz)",
    uzmanlik: "müzik tarihçisi ve radyo programcısı tadında anlatıcı (olgulara dayalı; şarkı sözü alıntısı yok, yalnız yazılış, kayıt ve ilham hikâyesi)",
    istem_eki: "ŞARKI SÖZLERİ TELİFLİDİR: tek bir dize bile alıntılama; TIRNAK İŞARETİ KULLANMA (şarkı adını da düz yaz, tırnaklama); sözleri satır satır, eğik çizgiyle ya da 'la la la' gibi nakarat kalıbıyla yazma; sözlerin konusunu yalnız kendi cümlelerinle anlat (örn. şarkı, bir dostluğun bitişini anlatır). Albüm kapağını ya da fotoğrafı tarif etme. Odak: şarkının yazılış hikâyesi, kayıt süreci, kimden ya da neyden ilham aldığı, ilginç bir olgu. Din, siyaset, uyuşturucu, şiddet, kaza ya da ölüm ayrıntılarını ATLA; olumlu, merak uyandıran bir dille yaz. Sanatçı hakkında yargı ya da dedikodu yazma, kişisel yaşam ayrıntılarına girme. Yalnız kaynaktaki olguları kullan.",
    son_not: SOZ_NOTU,
    seriler,
  };
  const govde = `// op_muzik: OP müfredat verisi (motor: lib/mufredat.mjs; üretici/doğrulayıcı: arac/muzik_dogrula.mjs --yaz; aday listesi: arac/aday/muzik_aday.mjs). ŞARKI SÖZÜ İÇERMEZ (telif).\n// sanatci.qid: Wikidata (P175) kimliği, gorsel_ek.qid: seri enstrüman/mekân yedekleri, video.id: Wikidata P1651 + YouTube oEmbed ile doğrulanmış RESMÎ video (model üretmez). Elle düzenlenebilir; yeni şarkı için önce aday listesine ekleyip aracı çalıştırın.\nexport default ${JSON.stringify(m, null, 1)};\n`;
  fs.writeFileSync(MUF + "op_muzik.mjs", govde);
  console.log(`yazıldı: lib/mufredat/op_muzik.mjs (${seriler.reduce((t, s) => t + s.dersler.length, 0)} ders)`);
}
