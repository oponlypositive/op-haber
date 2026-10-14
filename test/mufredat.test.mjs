// Müfredat motoru (lib/mufredat.mjs): şema + veri dosyaları, ilerleme kalıcılığı, sıra/bitiş/günlük üst, sabit ve model yolu, yazım doğrulaması (10+ örnek),
// sağlık iddiası denetimi (huzur/gelisim/yasam), öğretmen planlayıcı (doğrulama, kalıcılık, bütçe), entegrasyon (ozel.mjs, bulut yükü, ayar).
// Ağ yok: sahte Vikipedi/Commons + sahte model + bellek içi bulut.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DERS_ISTEMI, EK_DERS_UST, MUFREDAT_DIZIN, PLAN_ISTEMI, SAGLIK_IDDIA, UZMANLIK, dersAnahtari, dersDogrula, dersleriBirlestir, dersleriDuzle, gonderiKimligi, ilerlemeOku, imlecAnahtari,
  mufredatDogrula, mufredatIsleriCalistir, mufredatUret, mufredatUstAyristir, mufredatlariYukle, ogretmenPlanla, planAnahtari, planDogrula, planGerekli, planTazele, planYukundenDersler, saglikKumesi,
} from "../lib/mufredat.mjs";
import { yayinYuku } from "../lib/bulut.mjs";
import { ayarOku } from "../lib/ayar.mjs";
import { ozelIsleriCalistir } from "../lib/ozel.mjs";
import { konuYasak } from "../lib/on_eleme.mjs";
import { denetle } from "../lib/moderasyon.mjs";
import { SAGLIK, TARIH_YASAK } from "../lib/konu_yasak.mjs";

const bekle = async () => {};
const SIMDI = Date.UTC(2026, 9, 14, 10, 0, 0);       // 13:00 Türkiye: saat penceresi içinde

// ---------------------------------------------------------------- sahte dünya
const TR_KAYNAK = "Felsefe, varlık, bilgi, değer, akıl, zihin ve dil gibi konulardaki genel ve temel sorunları inceleyen bir alandır. Felsefe, sorular sormayı ve bu soruların cevaplarını akıl yürüterek aramayı öne çıkarır. Eski Yunan'da ortaya çıkan bu düşünce geleneği, daha sonra pek çok farklı yöne ayrılmıştır. Felsefede bir görüşü savunan kişi, bunu gerekçeleriyle birlikte ortaya koyar ve karşı görüşlere cevap verir. Mantık, felsefenin en önemli araçlarından biridir; çünkü doğru akıl yürütmenin kurallarını inceler. Etik, doğru ve yanlış üzerine düşünürken estetik güzellik ve beğeni üzerine düşünür. Bilgi kuramı bilginin sınırlarını ve kaynaklarını sorar. Metafizik ise var olmanın ne demek olduğunu araştırır. Felsefe dersleri bugün birçok okulda ve üniversitede okutulmaktadır ve düşünme becerilerini geliştirmeyi amaçlar. Bu alanda çalışanlar, kavramları açık ve tutarlı kullanmaya özen gösterir.";
const EN_KAYNAK = "Philosophy is the systematic study of general and fundamental questions concerning topics like existence, knowledge, values, reason, mind and language. It is distinguished from other ways of addressing such questions by its critical and generally systematic approach and its reliance on rational argument. Philosophy emerged in ancient Greece and later branched in many directions. Logic examines the rules of correct reasoning while ethics studies right and wrong and aesthetics studies beauty and taste. Epistemology asks about the limits and sources of knowledge and metaphysics asks what it means to exist. Philosophy courses are taught in many schools and universities today and aim to develop thinking skills.";
const MODEL_TR = "Felsefe, dünyaya ve insana dair sorular sormanın düzenli bir yoludur. Önce bir sorunun ne anlama geldiği netleştirilir, sonra farklı cevaplar akılla karşılaştırılır. Mantık bu sırada rehber olur, çünkü bir düşüncenin neden güçlü ya da zayıf kaldığını görmemizi sağlar. Böylece alışkanlıkla verdiğimiz cevapları yeniden gözden geçirebiliriz. Sizce iyi bir soru nasıl olmalı?";
const MODEL_EN = "Philosophy is an orderly way of asking questions about the world and about people. First the meaning of a question is clarified, then different answers are compared by reasoning. Logic acts as a guide here, because it shows why a thought stays strong or weak. In this way we can look again at answers we usually give out of habit. What do you think a good question looks like?";

function sahteFetch({ yok = new Set(), ayrim = new Set(), ozet = {}, cagrilar = [] } = {}) {
  return async (url) => {
    const u = new URL(String(url));
    cagrilar.push(u.host);
    const json = (g) => ({ ok: true, status: 200, json: async () => g, text: async () => JSON.stringify(g), headers: new Map() });
    if (/wikipedia\.org$/.test(u.host)) {
      const baslik = u.searchParams.get("titles") || "";
      if (yok.has(baslik)) return json({ query: { pages: [{ title: baslik, missing: true }] } });
      const extract = ozet[baslik] ?? (u.host.startsWith("tr.") ? TR_KAYNAK : EN_KAYNAK);
      return json({ query: { pages: [{ title: baslik, extract, fullurl: `https://${u.host}/wiki/${encodeURIComponent(baslik)}`, ...(ayrim.has(baslik) ? { pageprops: { disambiguation: "" } } : {}) }] } });
    }
    return json({ query: { pages: [] }, entities: {}, search: [], results: [] });
  };
}
function sahteBulut({ reddet = null, hata = null } = {}) {
  const kayit = new Map(), yayin = [];
  return {
    kayit, yayin,
    async bilinenler(ozetler) { const m = new Map(); for (const o of ozetler) if (kayit.has(o)) m.set(o, kayit.get(o)); return m; },
    async isaretle(liste) { for (const k of liste) kayit.set(k.ozet, { ozet: k.ozet, durum: k.durum, deneme: k.deneme || 0, yuk: k.yuk ?? null, neden: k.neden }); return { yazildi: liste.length }; },
    async yayinla(haber, ozet, gorsel) {
      if (hata && hata(haber)) throw new Error("haber-yukle yayinla: HTTP 400");
      const r = reddet?.(haber); if (r) return { durum: "red", neden: r };
      if (kayit.get(ozet)?.durum === "yayinlandi") return { durum: "var" };
      yayin.push({ haber, ozet, gorsel }); kayit.set(ozet, { ozet, durum: "yayinlandi", yuk: null }); return { durum: "eklendi" };
    },
  };
}
function sahteModel(cevap, say = { n: 0 }) {
  return { say, async yaz(sistem, girdi, secenek = {}) { say.n++; say.sonSistem = sistem; say.sonGirdi = girdi; const c = typeof cevap === "function" ? cevap(sistem, girdi, secenek) : cevap; return { metin: typeof c === "string" ? c : JSON.stringify(c), saglayici: "gemini-test" }; } };
}
const dersCevap = { uygun: true, tr: { ozet: MODEL_TR }, en: { ozet: MODEL_EN }, gorsel_adaylari: [] };
const dersNesne = (id, ek = {}) => ({ id, baslik_tr: `Ders ${id}`, baslik_en: `Lesson ${id}`, kaynak: { wiki_en: "Philosophy", wiki_tr: "Felsefe" }, odak_tr: "Felsefeyi sade ve sıcak anlat.", tur: "bilgi", gorsel: null, sabit: null, ...ek });
function muf(hesap, dersler, ek = {}) {
  const m = { hesap, kategori: ek.kategori || "felsefe", gunlukUst: ek.gunlukUst ?? 2, seriler: [{ yol: ek.yol || ["Felsefeye Giriş"], aciklama_tr: "Seri açıklaması burada.", aciklama_en: "Series description.", dersler }], ...ek.ek };
  return { ...m, dersler: dersleriDuzle(m) };
}
const ayarT = (ek = {}) => ({ ...ayarOku({}, []), mufredatTurUst: 3, mufredatCagriUst: 8, mufredatDenemeUst: 6, ogretmenPlan: false, ...ek });

// ---------------------------------------------------------------- veri dosyaları
test("veri: lib/mufredat/*.mjs hepsi bulunur, şema geçerli, kimlikler benzersiz, yol 1-3 ve ad <= 60", async () => {
  const { harita, hatalar } = await mufredatlariYukle();
  assert.deepEqual(hatalar, []);
  for (const h of ["op_felsefe", "op_mutfak", "op_hayvanlar", "op_antik", "op_ronesans", "op_klasikler", "op_icecek", "op_oyun", "op_sanat", "op_meditasyon", "op_yoga", "op_gelisim", "op_saglikli", "op_hareket"]) assert.ok(harita.has(h), `dosya/yükleme yok: ${h}`);
  assert.ok(readdirSync(MUFREDAT_DIZIN).filter((f) => /^op_.*\.mjs$/.test(f)).length >= harita.size);
  for (const [h, m] of harita) {
    assert.deepEqual(mufredatDogrula(m), [], h);
    const idler = new Set();
    for (const d of m.dersler) {
      assert.ok(!idler.has(d.id), `${h}: tekrar id ${d.id}`); idler.add(d.id);
      assert.ok(d.yol.length >= 1 && d.yol.length <= 3 && d.yol.every((y) => y.length <= 60), `${h}/${d.id}: yol`);
      assert.ok(d.seriSira >= 1);
    }
    assert.ok(m.gunlukUst >= 1 && m.gunlukUst <= 12);
  }
});
test("veri: boyutlar (felsefe >= 60, op_mutfak Türk >= 40 + dünya, hayvanlar 83 sabit, hepsi seri yoluna bağlı)", async () => {
  const { harita } = await mufredatlariYukle();
  assert.ok(harita.get("op_felsefe").dersler.length >= 60);
  const mut = harita.get("op_mutfak").dersler;
  assert.ok(mut.filter((d) => d.yol[0] === "Türk Mutfağı").length >= 40, "Türk mutfağı >= 40");
  assert.ok(mut.filter((d) => d.yol[0] === "Dünya Mutfakları").length >= 30);
  assert.equal(mut.findIndex((d) => d.yol[0] === "Dünya Mutfakları") > mut.findLastIndex((d) => d.yol[0] === "Türk Mutfağı"), true, "Türk mutfağı önce");
  for (const b of ["Ege Mutfağı", "Akdeniz Bölgesi Mutfağı", "Karadeniz Mutfağı", "İç Anadolu Mutfağı", "Doğu Anadolu Mutfağı", "Güneydoğu Anadolu Mutfağı", "Marmara Mutfağı", "Trakya Mutfağı"]) assert.ok(mut.some((d) => d.yol[1] === b), b);
  const hay = harita.get("op_hayvanlar").dersler;
  assert.ok(hay.length >= 80 && hay.every((d) => d.sabit && d.tur === "hayvan" && d.gorsel));
  assert.ok(hay.some((d) => d.yol[1] === "Uçan Memeliler"));
  assert.ok(harita.get("op_felsefe").dersler[0].yol[0] === "Felsefeye Giriş");
});
test("veri: yasak tarama (başlık, seri, odak, sabit): din/siyaset kapısı, moderasyon, sağlık iddiası (kategoriye göre)", async () => {
  const { harita } = await mufredatlariYukle();
  const SIYASET = /(?<![\p{L}])(?:ideoloji\p{L}*|devlet kuramı|genel seçim\p{L}*|seçmen\p{L}*|parti\p{L}*|hükümet\p{L}*|milliyetçi\p{L}*|sosyalizm|komünizm|faşizm|liberalizm)(?![\p{L}])/iu;
  for (const [h, m] of harita) {
    const SAG = saglikKumesi(m.kategori);
    for (const s of m.seriler) {
      const seriMetin = `${s.yol.join(" ")} ${s.aciklama_tr || ""} ${s.aciklama_en || ""}`;
      assert.deepEqual(konuYasak(seriMetin), [], `${h}: seri ${s.yol}`);
      assert.doesNotMatch(seriMetin, SAG, `${h}: seri sağlık iddiası ${s.yol}`);
      for (const d of s.dersler) {
        const metin = `${d.baslik_tr} ${d.baslik_en} ${d.odak_tr || ""}`;
        assert.equal(denetle(`${d.baslik_tr} ${d.baslik_en}`).ok, true, `${h}/${d.id}: moderasyon`);
        assert.doesNotMatch(`${d.baslik_tr} ${d.baslik_en}`, SIYASET, `${h}/${d.id}: siyaset`);
        assert.doesNotMatch(`${d.baslik_tr} ${d.baslik_en}`, SAG, `${h}/${d.id}: başlıkta sağlık iddiası`);   // odak yazara yönlendirmedir ve "iddia içermez" gibi olumsuz kullanım barındırabilir: yalnız başlık süzülür
        if (d.sabit) assert.deepEqual(konuYasak(`${d.sabit.tr} ${d.sabit.en}`), [], `${h}/${d.id}: sabit`);
        if (!["hayvan", "heykel", "tarif", "klasik"].includes(d.tur) && !/^(op_antik|op_ronesans)$/.test(h)) assert.doesNotMatch(metin, TARIH_YASAK, `${h}/${d.id}: din/ritüel/ölüm/savaş`);
      }
    }
  }
});
test("şema doğrulayıcı: bozuk örnekler yakalanır", () => {
  const iyi = { hesap: "op_xx", kategori: "huzur", gunlukUst: 2, seriler: [{ yol: ["A seri"], dersler: [dersNesne("d-bir")] }] };
  assert.deepEqual(mufredatDogrula(iyi), []);
  assert.ok(mufredatDogrula({ ...iyi, hesap: "x" }).length);
  assert.ok(mufredatDogrula({ ...iyi, gunlukUst: 0 }).length);
  assert.ok(mufredatDogrula({ ...iyi, seriler: [{ yol: ["a", "b", "c", "d"], dersler: [dersNesne("d-bir")] }] }).length, "yol 4 düzey");
  assert.ok(mufredatDogrula({ ...iyi, seriler: [{ yol: ["x".repeat(61)], dersler: [dersNesne("d-bir")] }] }).length, "ad > 60");
  assert.ok(mufredatDogrula({ ...iyi, seriler: [{ yol: ["Seri"], dersler: [dersNesne("d-bir"), dersNesne("d-bir")] }] }).length, "tekrar id");
  assert.ok(mufredatDogrula({ ...iyi, seriler: [{ yol: ["Seri"], dersler: [dersNesne("d-bir", { kaynak: {} })] }] }).length, "kaynak yok");
  assert.ok(mufredatDogrula({ ...iyi, seriler: [{ yol: ["Seri"], dersler: [dersNesne("d-bir", { odak_tr: "", sabit: null })] }] }).length, "odak yok");
  assert.deepEqual(mufredatDogrula({ ...iyi, seriler: [{ yol: ["Seri"], dersler: [dersNesne("d-bir", { odak_tr: undefined, sabit: { tr: "t".repeat(50), en: "e".repeat(50) } })] }] }), []);
});
test("yükleme: bozuk/eksik dosya o hesabı atlatır, diğerleri yüklenir", async () => {
  const dizin = mkdtempSync(join(tmpdir(), "muf-"));
  const iyi = { hesap: "op_iyi", kategori: "huzur", gunlukUst: 1, seriler: [{ yol: ["Seri"], dersler: [dersNesne("d-bir")] }] };
  writeFileSync(join(dizin, "op_iyi.mjs"), `export default ${JSON.stringify(iyi)};`);
  writeFileSync(join(dizin, "op_bozuk.mjs"), "export default { hesap: 'op_bozuk' };");
  writeFileSync(join(dizin, "op_sozdizim.mjs"), "export default {{{");
  writeFileSync(join(dizin, "op_yanlis_ad.mjs"), `export default ${JSON.stringify({ ...iyi, hesap: "op_baska" })};`);
  const { harita, hatalar } = await mufredatlariYukle({ dizin });
  assert.deepEqual([...harita.keys()], ["op_iyi"]);
  assert.equal(hatalar.length, 3);
  assert.deepEqual((await mufredatlariYukle({ dizin: join(dizin, "yok") })).harita.size, 0);
});

// ---------------------------------------------------------------- yazım doğrulaması (10+ örnek)
const SRC = `${TR_KAYNAK}\n\n${EN_KAYNAK}`;
const iyiCevap = (ek = {}) => ({ uygun: true, tr: { ozet: MODEL_TR }, en: { ozet: MODEL_EN }, ...ek });
test("dersDogrula: 12 gerçekçi örnek", () => {
  const bas = { baslik: "Felsefe nedir?", odak: "Merak ve akıl yürütme", kategori: "felsefe" };
  const dene = (d, kat = "felsefe") => dersDogrula(d, SRC, { ...bas, kategori: kat });
  assert.equal(dene(iyiCevap()).ok, true, "1 geçerli");
  assert.equal(dene({ ...iyiCevap(), uygun: false }).kalici, true, "2 model uygun değil");
  assert.match(dene(iyiCevap({ tr: { ozet: MODEL_TR.replace("Sizce iyi", "Harika! Sizce iyi") } })).neden, /ünlem|abartı/, "3 ünlem/abartı");
  assert.match(dene(iyiCevap({ tr: { ozet: MODEL_TR.replace("Sizce", "Ben bunu çocukken öğrendim. Sizce") } })).neden, /birinci tekil|cümle/, "4 birinci tekil");
  assert.match(dene(iyiCevap({ tr: { ozet: MODEL_TR.replace("düzenli bir yoludur", "1850 yılından beri düzenli bir yoludur") } })).neden, /rakam/, "5 uydurma rakam");
  assert.match(dene(iyiCevap({ tr: { ozet: "Felsefe kısa bir alandır. Sorular sorar." } })).neden, /cümle sayısı/, "6 az cümle");
  assert.match(dene(iyiCevap({ tr: { ozet: `Soru nedir? ${MODEL_TR}` } })).neden, /soru yalnız sonda/, "7 soru sonda değil");
  assert.match(dene(iyiCevap({ en: { ozet: MODEL_EN.replace("What do you", "Visit https://example.org now. What do you") } })).neden, /bağlantı|cümle/, "8 bağlantı");
  assert.match(dene(iyiCevap({ tr: { ozet: MODEL_TR.replace("Felsefe,", "Felsefe tanrı ve ritüel üzerine düşünür,") } })).neden, /yasağı|kapısı/, "9 din");
  assert.match(dene(iyiCevap({ tr: { ozet: TR_KAYNAK.split(". ").slice(0, 4).join(". ") + "." } })).neden, /kopya/, "10 kaynaktan kopya");
  assert.match(dene(iyiCevap({ tr: { ozet: MODEL_TR.replace("düzenli bir yoludur", "kesin bir tedavi yoludur") } }), "felsefe").neden, /sağlık/, "11 sağlık iddiası (felsefe: eski küme)");
  assert.match(dene(iyiCevap({ tr: { ozet: MODEL_TR.replace("düzenli bir yoludur", "kanseri önler ve tedavi eder") } }), "huzur").neden, /sağlık/, "12 sağlık iddiası (huzur: iddia kümesi)");
  assert.equal(dene({}).ok, false);
});
test("sağlık denetimi: huzur/gelisim/yasam kategorilerinde gündelik sözcükler serbest, iddia kalıpları yasak", () => {
  for (const kat of ["huzur", "gelisim", "yasam"]) assert.equal(saglikKumesi(kat), SAGLIK_IDDIA);
  assert.equal(saglikKumesi("felsefe"), SAGLIK);
  for (const s of ["Stres azaltmak için nefes almak", "Rahatlamak ve huzur bulmak", "Sağlıklı alışkanlıklar edinmek", "Sakin bir uyku düzeni", "Hafif bir yürüyüş ve esneme"]) assert.doesNotMatch(s, SAGLIK_IDDIA, s);
  for (const s of ["Bu egzersiz depresyonu tedavi eder", "Bağışıklığı güçlendirir", "Kilo vermenizi sağlar", "Diyet listesi", "Vitamin takviyesi", "kanseri önler", "Scientifically proven to cure", "boosts your immune system", "klinik olarak kanıtlanmış"]) assert.match(s, SAGLIK_IDDIA, s);
  // eski küme gündelik sözcükleri de keser (neden kategori bazlı küme gerekti)
  assert.match("stres ve rahatlatan sağlıklı alışkanlık", SAGLIK);
  // yazım istemi: kaçınılacak sözcük notu + uzman sesi + dürüstlük
  const istem = DERS_ISTEMI({ hesap: "op_yoga", kategori: "huzur" }, dersNesne("x"), "Yogaya Başlangıç");
  assert.match(istem, /savaşçı/); assert.match(istem, /yoga eğitmeni/); assert.match(istem, /yapay zekâ/); assert.match(istem, /Birinci tekil/i);
});
test("uzman sesi: her bilinen hesabın tanımı var; bilinmeyen hesap kategoriden türetilir", () => {
  for (const h of ["op_felsefe", "op_mutfak", "op_hayvanlar", "op_sanat", "op_meditasyon", "op_yoga", "op_gelisim", "op_saglikli", "op_hareket"]) assert.ok(UZMANLIK[h]);
  assert.match(DERS_ISTEMI({ hesap: "op_yeni", kategori: "bilim" }, dersNesne("x"), "S"), /bilim alanında deneyimli bir öğretmen/);
});

// ---------------------------------------------------------------- motor: sıra, ilerleme, kalıcılık, bitiş
test("sıra: ders sırayla yayınlanır, yük seri {yol, sira} taşır, ilk derste seri_aciklama; yük yayinYuku'ndan geçer", async () => {
  const m = muf("op_felsefe", [dersNesne("bir"), dersNesne("iki"), dersNesne("uc")]);
  const bulut = sahteBulut(), model = sahteModel(dersCevap), f = sahteFetch();
  const r1 = await mufredatUret({ m, dersler: m.dersler, bulut, model, fetchFn: f, simdi: SIMDI, cagriHakki: 4, bekleFn: bekle });
  assert.equal(r1.durum, "yayinlandi", JSON.stringify(r1));
  const h1 = bulut.yayin[0].haber;
  assert.equal(h1.tr.baslik, "Ders bir");
  assert.deepEqual(h1.seri, { yol: ["Felsefeye Giriş"], sira: 1 });
  assert.equal(h1.seri_aciklama, "Seri açıklaması burada.");
  assert.equal(h1.editor, "op_felsefe"); assert.equal(h1.kategori, "felsefe");
  assert.match(h1.id, /^m-bir-[0-9a-f]{6}$/);
  assert.match(h1.tr.ozet, /Kaynak: Vikipedi · Felsefe/); assert.match(h1.en.ozet, /Source: Wikipedia · Philosophy/);
  const yuk = yayinYuku(h1, bulut.yayin[0].ozet, null);
  assert.deepEqual(yuk.haber.seri, h1.seri); assert.equal(yuk.haber.seri_aciklama, h1.seri_aciklama);
  assert.equal(yayinYuku({ ...h1, seri: undefined, seri_aciklama: undefined }, "x", null).haber.seri, undefined, "seri yoksa alan yok");
  // ikinci yayın: yeni gün yuvası
  const r2 = await mufredatUret({ m, dersler: m.dersler, bulut, model, fetchFn: f, simdi: Date.UTC(2026, 9, 14, 14, 0), cagriHakki: 4, bekleFn: bekle });
  assert.equal(r2.durum, "yayinlandi");
  assert.equal(bulut.yayin[1].haber.tr.baslik, "Ders iki");
  assert.equal(bulut.yayin[1].haber.seri.sira, 2);
  assert.equal(bulut.yayin[1].haber.seri_aciklama, undefined, "yalnız ilk derste");
  assert.deepEqual(r2.ilerleme, { sira: 2, toplam: 3 });
});
test("günlük üst: yuva dolunca 'kota-dolu', saat gelmeden 'aralik'; yeni günde sürer", async () => {
  const m = muf("op_felsefe", [dersNesne("bir"), dersNesne("iki"), dersNesne("uc"), dersNesne("dort")], { gunlukUst: 2 });
  const bulut = sahteBulut(), model = sahteModel(dersCevap), f = sahteFetch();
  const dene = (simdi) => mufredatUret({ m, dersler: m.dersler, bulut, model, fetchFn: f, simdi, cagriHakki: 4, bekleFn: bekle });
  assert.equal((await dene(SIMDI)).durum, "yayinlandi");
  assert.equal((await dene(SIMDI)).neden, "aralik");                        // ikinci yuva günün ortasında açılır (04:00 + 17/2 saat)
  assert.equal((await dene(Date.UTC(2026, 9, 14, 14, 0))).durum, "yayinlandi");
  assert.equal((await dene(Date.UTC(2026, 9, 14, 15, 0))).neden, "kota-dolu");
  assert.equal((await dene(Date.UTC(2026, 9, 15, 6, 0))).durum, "yayinlandi", "yeni gün");
  assert.deepEqual(bulut.yayin.map((y) => y.haber.tr.baslik), ["Ders bir", "Ders iki", "Ders uc"]);
});
test("kalıcılık: ders anahtarları 45 günde silinse bile imleç ilerlemeyi korur; ders anahtarı varsa imleçten sonra atlanır", async () => {
  const m = muf("op_felsefe", ["a1", "a2", "a3", "a4", "a5"].map((i) => dersNesne(i)));
  const bulut = sahteBulut(), model = sahteModel(dersCevap), f = sahteFetch();
  for (let g = 0; g < 3; g++) await mufredatUret({ m, dersler: m.dersler, bulut, model, fetchFn: f, simdi: Date.UTC(2026, 9, 14 + g, 6, 0), cagriHakki: 4, bekleFn: bekle });
  assert.equal(bulut.yayin.length, 3);
  assert.ok(bulut.kayit.has(imlecAnahtari("op_felsefe", 3)));
  // 45 günlük temizlik: ders anahtarlarının hepsi ve eski imleçler silindi; yalnız en son imleç yaşıyor
  for (const d of m.dersler) bulut.kayit.delete(dersAnahtari("op_felsefe", d.id));
  bulut.kayit.delete(imlecAnahtari("op_felsefe", 1)); bulut.kayit.delete(imlecAnahtari("op_felsefe", 2));
  assert.deepEqual(await ilerlemeOku({ bulut, hesap: "op_felsefe", dersler: m.dersler }), { n: 3, sira: 3, toplam: 5, bitti: false });
  const r = await mufredatUret({ m, dersler: m.dersler, bulut, model, fetchFn: f, simdi: Date.UTC(2026, 9, 20, 6, 0), cagriHakki: 4, bekleFn: bekle });
  assert.equal(r.durum, "yayinlandi"); assert.equal(bulut.yayin[3].haber.tr.baslik, "Ders a4", "tekrar başa dönmez");
  // imleç hiç yoksa ders anahtarlarından ilerleme okunur
  const b2 = sahteBulut(); b2.kayit.set(dersAnahtari("x", "a1"), { durum: "yayinlandi" }); b2.kayit.set(dersAnahtari("x", "a2"), { durum: "elendi" });
  assert.equal((await ilerlemeOku({ bulut: b2, hesap: "x", dersler: ["a1", "a2", "a3"].map((i) => dersNesne(i)) })).sira, 2);
});
test("bitiş: müfredat bitince baştan başlamaz (tekrar turu yok), hesap durur ve özet bildirir", async () => {
  const m = muf("op_felsefe", [dersNesne("bir"), dersNesne("iki")]);
  const bulut = sahteBulut(), model = sahteModel(dersCevap), f = sahteFetch();
  for (let g = 0; g < 2; g++) await mufredatUret({ m, dersler: m.dersler, bulut, model, fetchFn: f, simdi: Date.UTC(2026, 9, 14 + g, 6, 0), cagriHakki: 4, bekleFn: bekle });
  const r = await mufredatUret({ m, dersler: m.dersler, bulut, model, fetchFn: f, simdi: Date.UTC(2026, 9, 16, 6, 0), cagriHakki: 4, bekleFn: bekle });
  assert.equal(r.durum, "yok"); assert.equal(r.neden, "bitti"); assert.equal(bulut.yayin.length, 2);
  const tur = await mufredatIsleriCalistir({ ayar: ayarT(), bulut, model, fetchFn: f, simdi: Date.UTC(2026, 9, 16, 7, 0), bekleFn: bekle, yukleme: { harita: new Map([["op_felsefe", m]]), hatalar: [] } });
  assert.equal(tur.ozet, "op_felsefe:2/2!bitti"); assert.equal(tur.yayin, 0);
});
test("sabit yol: model çağrılmaz, metin dosyadan; fotoğraf atfı yoksa ek yok; kalıcı ret ilerlemeyi bloklamaz", async () => {
  const sabit = { tr: "Su samuru, bilinen hayvanlar arasında en yoğun tüye sahiptir ve tüyünü gün boyu özenle tarar.", en: "The sea otter has the densest fur of any animal and grooms it carefully throughout the day.", kaynak_tr: "Kaynak: Vikipedi · Sea otter", kaynak_en: "Source: Wikipedia · Sea otter" };
  const m = muf("op_hayvanlar", [dersNesne("su-samuru", { tur: "hayvan", sabit, kaynak: { wiki_en: "Sea otter" }, baslik_tr: "Su samuru: en yoğun tüylü hayvanlardan" }), dersNesne("iki", { sabit })], { kategori: "hayvanlar", yol: ["Hayvanlar Dünyası", "Kara Hayvanları"] });
  // hayvan/heykel için fotoğraf zorunlu: gorsel olmadan (testte Commons yok) ders geçici-ret olur, sıra korunur
  const bulut = sahteBulut(), model = sahteModel(dersCevap);
  m.dersler[0].gorsel = null;
  const r = await mufredatUret({ m, dersler: m.dersler, bulut, model, fetchFn: sahteFetch(), simdi: SIMDI, cagriHakki: 2, bekleFn: bekle });
  assert.equal(r.durum, "yayinlandi"); assert.equal(model.say.n, 0, "sabit: model çağrısı yok");
  assert.match(bulut.yayin[0].haber.tr.ozet, /Su samuru, bilinen/); assert.match(bulut.yayin[0].haber.tr.ozet, /Kaynak: Vikipedi · Sea otter$/);
  assert.equal(bulut.yayin[0].haber.model, "mufredat+sabit");
  assert.deepEqual(bulut.yayin[0].haber.seri, { yol: ["Hayvanlar Dünyası", "Kara Hayvanları"], sira: 1 });
  // sabit metinde yasak kalıp: ders kalıcı elenir, sıradaki yayınlanır
  const k = muf("op_hayvanlar", [dersNesne("kotu", { sabit: { tr: "Bu hayvan için ibadet ve dua çok önemlidir ve herkes bilir.", en: "x".repeat(60) } }), dersNesne("iyi", { sabit })], { kategori: "hayvanlar" });
  const b2 = sahteBulut(), r2 = await mufredatUret({ m: k, dersler: k.dersler, bulut: b2, model, fetchFn: sahteFetch(), simdi: SIMDI, cagriHakki: 2, bekleFn: bekle });
  assert.equal(r2.durum, "yayinlandi"); assert.equal(b2.yayin[0].haber.tr.baslik, "Ders iyi");
  assert.equal(b2.kayit.get(dersAnahtari("op_hayvanlar", "kotu")).durum, "elendi");
});
test("model yolu: kaynak kısa/yok -> kalıcı ret ve sıradakine geçilir; yazım reddi 2. denemede düzelir; çağrı hakkı bitince durur", async () => {
  const bulut = sahteBulut();
  const m = muf("op_felsefe", [dersNesne("yok-madde", { kaynak: { wiki_en: "Olmayan Madde" } }), dersNesne("iyi")]);
  const f = sahteFetch({ yok: new Set(["Olmayan Madde"]) });
  let n = 0;
  const model = sahteModel(() => (++n === 1 ? { uygun: true, tr: { ozet: "Kısa." }, en: { ozet: "Short." } } : dersCevap));
  const r = await mufredatUret({ m, dersler: m.dersler, bulut, model, fetchFn: f, simdi: SIMDI, cagriHakki: 4, bekleFn: bekle });
  assert.equal(r.durum, "yayinlandi");
  assert.equal(bulut.yayin[0].haber.tr.baslik, "Ders iyi");
  assert.equal(model.say.n, 2, "ilk yazım reddedildi, ikincisi geçti");
  assert.match(model.say.sonGirdi, /Önceki cevap geçersizdi/);
  assert.equal(bulut.kayit.get(dersAnahtari("op_felsefe", "yok-madde")).durum, "elendi");
  assert.match(model.say.sonSistem, /Ders iyi/); assert.match(model.say.sonSistem, /felsefe hocası/);
  const b2 = sahteBulut(), r2 = await mufredatUret({ m: muf("op_felsefe", [dersNesne("iyi")]), dersler: muf("op_felsefe", [dersNesne("iyi")]).dersler, bulut: b2, model: sahteModel(dersCevap), fetchFn: sahteFetch(), simdi: SIMDI, cagriHakki: 0, bekleFn: bekle });
  assert.equal(r2.neden, "cagri-yok"); assert.equal(b2.yayin.length, 0);
});
test("4xx/ağ hatası: yayınlama hatası veren hesap atlanır, tur diğer hesaplarla sürer; sunucu 'red' dönerse ders atlanmaz bu tur biter", async () => {
  const bozuk = muf("op_yoga", [dersNesne("y1")], { kategori: "huzur" }), iyi = muf("op_felsefe", [dersNesne("f1")]);
  const bulut = sahteBulut({ hata: (h) => h.editor === "op_yoga" });
  const tur = await mufredatIsleriCalistir({ ayar: ayarT(), bulut, model: sahteModel(dersCevap), fetchFn: sahteFetch(), simdi: SIMDI, bekleFn: bekle, yukleme: { harita: new Map([["op_yoga", bozuk], ["op_felsefe", iyi]]), hatalar: [] } });
  assert.equal(tur.yayin, 1);
  assert.deepEqual(bulut.yayin.map((y) => y.haber.editor), ["op_felsefe"]);
  assert.ok(tur.calisan.some((c) => c.alan === "op_yoga" && c.durum === "hata"));
  assert.match(tur.ozet, /op_felsefe:1\/1/);
  // hesap sunucuda tanımlı değil (red): bu tur atlanır, hata değil
  const b2 = sahteBulut({ reddet: (h) => (h.editor === "op_yoga" ? "editör yok" : "") });
  const t2 = await mufredatIsleriCalistir({ ayar: ayarT(), bulut: b2, model: sahteModel(dersCevap), fetchFn: sahteFetch(), simdi: SIMDI, bekleFn: bekle, yukleme: { harita: new Map([["op_yoga", bozuk], ["op_felsefe", iyi]]), hatalar: [] } });
  assert.equal(t2.yayin, 1);
});
test("tur: tur sınırı, saat penceresi, hesap başına üst sınır ortam değişkeniyle, kapalı hesap; özet satırı", async () => {
  const hesaplar = ["op_a", "op_b", "op_c"].map((h) => muf(h, [dersNesne("d1"), dersNesne("d2")], { kategori: "huzur" }));
  const harita = new Map(hesaplar.map((m) => [m.hesap, m]));
  const bulut = sahteBulut(), model = sahteModel(dersCevap), f = sahteFetch();
  const t = await mufredatIsleriCalistir({ ayar: ayarT({ mufredatTurUst: 2 }), bulut, model, fetchFn: f, simdi: SIMDI, bekleFn: bekle, yukleme: { harita, hatalar: [] } });
  assert.equal(t.yayin, 2); assert.equal(bulut.yayin.length, 2);
  const t2 = await mufredatIsleriCalistir({ ayar: ayarT(), bulut: sahteBulut(), model, fetchFn: f, simdi: Date.UTC(2026, 9, 14, 2, 0), bekleFn: bekle, yukleme: { harita, hatalar: [] } });
  assert.equal(t2.yayin, 0); assert.ok(t2.atlanan.every((a) => a.neden === "saat-disi"));
  const t3 = await mufredatIsleriCalistir({ ayar: ayarT({ mufredatUst: mufredatUstAyristir("op_a:0,op_b:1,op_z:3,op_c:99") }), bulut: sahteBulut(), model, fetchFn: f, simdi: SIMDI, bekleFn: bekle, yukleme: { harita, hatalar: [] } });
  assert.ok(t3.atlanan.some((a) => a.alan === "op_a" && a.neden === "kapali"));
  assert.deepEqual(mufredatUstAyristir("op_a:0,op_b:1,op_z:3,op_c:99,x:2,op_d:abc"), { op_a: 0, op_b: 1, op_z: 3 });
  const kuru = await mufredatIsleriCalistir({ ayar: { ...ayarT(), kuru: true }, bulut: null, model: null, simdi: SIMDI, yukleme: { harita, hatalar: [] } });
  assert.equal(kuru.ornekler.length, 3); assert.equal(kuru.yayin, 0);
});

// ---------------------------------------------------------------- ayar + entegrasyon
test("ayar: müfredat/öğretmen varsayılanları ve ortam değişkenleri", () => {
  const v = ayarOku({}, []);
  assert.equal(v.mufredatAcik, true); assert.equal(v.mufredatTurUst, 2); assert.equal(v.mufredatCagriUst, 4); assert.equal(v.ogretmenPlan, true); assert.equal(v.ogretmenEsik, 8); assert.equal(v.ogretmenGun, 7); assert.equal(v.ogretmenTurUst, 1); assert.equal(v.ogretmenEkUst, 40);
  assert.deepEqual(v.mufredatUst, {});
  const e = ayarOku({ MUFREDAT: "0", MUFREDAT_UST: "op_felsefe:3", MUFREDAT_TUR_UST: "1", OGRETMEN_PLAN: "0", OGRETMEN_ESIK: "5", MUFREDAT_SAAT: "6-20" }, []);
  assert.equal(e.mufredatAcik, false); assert.equal(e.mufredatUst.op_felsefe, 3); assert.equal(e.mufredatTurUst, 1); assert.equal(e.ogretmenPlan, false); assert.equal(e.ogretmenEsik, 5); assert.deepEqual(e.mufredatSaat, { bas: 6, son: 20 });
});
test("entegrasyon: ozel.mjs müfredatı çalıştırır, özet metni 'mufredat=' taşır, konu yolu o hesaplar için devre dışı, MUFREDAT=0 eski yola döner", async () => {
  const dizinHesaplar = (await mufredatlariYukle()).harita;
  const bulut = { ...sahteBulut(), async kota() { return new Map(); } };
  const model = sahteModel(dersCevap);
  const ayar = { ...ayarOku({}, []), ozelAcik: true, ozelTurUst: 0, ozelDenemeUst: 1, mufredatTurUst: 2, mufredatCagriUst: 6, ogretmenPlan: false, kuru: false };
  const o = await ozelIsleriCalistir({ ayar, bulut, model, fetchFn: sahteFetch(), simdi: SIMDI, kotaDurum: new Map(), bekleFn: bekle, rastgele: () => 0.5 });
  assert.ok(o.mufredatOzet, "özet var");
  const kayitli = new Set(bulut.yayin.map((y) => y.haber.editor));
  for (const h of kayitli) assert.ok(dizinHesaplar.has(h), `müfredat dışı yayın: ${h}`);
  assert.ok(o.yayin >= 1 && bulut.yayin.every((y) => y.haber.seri), "her müfredat gönderisi seriye bağlı");
  assert.ok(!o.calisan.some((c) => dizinHesaplar.has(c.alan)), "ozel= özet metni müfredat hesaplarıyla kirlenmez");
  const kapali = await ozelIsleriCalistir({ ayar: { ...ayar, mufredatAcik: false }, bulut: sahteBulut(), model, fetchFn: sahteFetch(), simdi: SIMDI, kotaDurum: new Map(), bekleFn: bekle, rastgele: () => 0.5 });
  assert.equal(kapali.mufredatOzet, undefined);
});

// ---------------------------------------------------------------- öğretmen planlayıcı
const planDers = (n, ek = {}) => ({ yol: ["Yeni Ünite"], baslik_tr: `Yeni konu ${n}`, baslik_en: `New topic ${n}`, wiki_en: `Topic ${n}`, wiki_tr: "", odak_tr: "Konuyu sade ve öğretici anlat.", ...ek });
const planCevap = (dersler, ek = {}) => ({ gerekce: "Önceki derslerin doğal devamı olarak sıralandı.", seri_aciklamalari: [{ yol: ["Yeni Ünite"], aciklama_tr: "Yeni ünite için kısa bir açıklama.", aciklama_en: "A short description." }], dersler, ...ek });
const planFetch = (ek = {}) => sahteFetch({ ozet: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`Topic ${i + 1}`, `${TR_KAYNAK}`])), ...ek });

test("planDogrula: olmayan madde, anlam ayrımı, alan dışı, yasak konu, kopya madde, yol/ad sınırı atılır; en az 4 geçerli şart", async () => {
  const m = muf("op_felsefe", [dersNesne("a", { kaynak: { wiki_en: "Topic 9" } })]);
  const mevcut = m.dersler;
  const ham = planCevap([
    planDers(1), planDers(2), planDers(3), planDers(4, { wiki_en: "Olmayan" }), planDers(5, { wiki_en: "Belirsiz" }),
    planDers(6, { wiki_en: "Topic 9" }),                                           // mevcut derste kullanılmış madde
    planDers(7, { yol: ["a".repeat(61)] }), planDers(8, { baslik_tr: "Tedavi ve ibadet", baslik_en: "Healing and worship" }),
    planDers(10, { wiki_en: "Alan Dışı" }), planDers(11, { yol: [] }),
    planDers(12, { wiki_en: "Topic 1" }), planDers(13), planDers(14),                                          // plan içinde tekrar
  ]);
  const f = sahteFetch({ yok: new Set(["Olmayan"]), ayrim: new Set(["Belirsiz"]), ozet: { "Topic 1": TR_KAYNAK, "Topic 2": TR_KAYNAK, "Topic 3": TR_KAYNAK, "Topic 4": TR_KAYNAK, "Alan Dışı": "Bu madde yalnızca bir futbol takımının fikstürü ve maç sonuçlarıyla ilgilidir. ".repeat(20), "Topic 9": TR_KAYNAK } });
  const v = await planDogrula(ham, { m, mevcut, fetchFn: f, bekleFn: bekle });
  assert.equal(v.ok, true, JSON.stringify(v.atilan) + v.neden);
  assert.deepEqual(v.dersler.map((d) => d.baslik_tr), ["Yeni konu 1", "Yeni konu 2", "Yeni konu 3", "Yeni konu 13", "Yeni konu 14"]);
  const nedenler = v.atilan.map((a) => a.neden);
  for (const n of ["madde yok", "madde zaten kullanılmış", "yol", "yasak konu", "alan dışı"]) assert.ok(nedenler.includes(n), `neden yok: ${n} -> ${nedenler}`);
  assert.ok(v.dersler.every((d) => /^p-[a-z0-9-]+$/.test(d.id) && d.plan === true && d.yol.length >= 1));
  // geçerli ders 4'ten az -> plan reddedilir
  const az = await planDogrula(planCevap([planDers(1), planDers(2), planDers(3, { wiki_en: "Olmayan" })]), { m, mevcut, fetchFn: f, bekleFn: bekle });
  assert.equal(az.ok, false); assert.match(az.neden, /en az 4/);
  assert.equal((await planDogrula(null, { m, mevcut, fetchFn: f, bekleFn: bekle })).ok, false);
  // 12'den fazla ders gelse bile en çok 12 alınır
  const cok = await planDogrula(planCevap(Array.from({ length: 16 }, (_, i) => planDers(i % 15 + 1, { wiki_en: `Topic ${i % 15 + 1}`, baslik_en: `New topic ${i + 1}`, baslik_tr: `Yeni konu ${i + 1}` }))), { m: muf("op_felsefe", [dersNesne("z")]), mevcut: muf("op_felsefe", [dersNesne("z")]).dersler, fetchFn: planFetch(), bekleFn: bekle });
  assert.ok(cok.dersler.length <= 12);
});
test("planlayıcı: tek model çağrısı, kayıt (yuk) yazılır, sonraki turda okunur ve çekirdeğin ARDINA eklenir; yayınlanan serisi değişmez", async () => {
  const m = muf("op_felsefe", [dersNesne("a", { kaynak: { wiki_en: "Topic 9" } }), dersNesne("b", { kaynak: { wiki_en: "Topic 8" } })]);
  const bulut = sahteBulut(), model = sahteModel(planCevap([planDers(1), planDers(2), planDers(3), planDers(4), planDers(5)]));
  const p = await ogretmenPlanla({ m, dersler: m.dersler, planYuku: null, bulut, model, fetchFn: planFetch(), bekleFn: bekle, simdi: SIMDI, son: "Ders a" });
  assert.equal(p.durum, "eklendi"); assert.equal(p.eklenen, 5); assert.equal(p.cagri, 1); assert.equal(model.say.n, 1);
  const kayit = bulut.kayit.get(planAnahtari("op_felsefe"));
  assert.equal(kayit.durum, "bekliyor_gorsel"); assert.ok(kayit.yuk && JSON.stringify(kayit.yuk).length < 18000);
  assert.match(model.say.sonSistem, /felsefe hocası/); assert.match(model.say.sonSistem, /Ders a/); assert.match(model.say.sonSistem, /Felsefeye Giriş/); assert.match(model.say.sonSistem, /yapay zekâ/);
  // sonraki tur: yuk'tan okunur
  const birlesik = dersleriBirlestir(m, kayit.yuk);
  assert.equal(birlesik.length, 7);
  assert.deepEqual(birlesik.slice(0, 2).map((d) => d.id), ["a", "b"], "çekirdek önce, aynı sırada");
  assert.deepEqual(birlesik.slice(2).map((d) => d.baslik_tr), ["Yeni konu 1", "Yeni konu 2", "Yeni konu 3", "Yeni konu 4", "Yeni konu 5"]);
  assert.equal(birlesik[2].seriSira, 1); assert.equal(birlesik[2].seriAciklamaTr, "Yeni ünite için kısa bir açıklama."); assert.equal(birlesik[3].seriAciklamaTr, "");
  assert.deepEqual(birlesik[0].yol, ["Felsefeye Giriş"], "mevcut ağaç değişmedi"); assert.equal(birlesik[0].seriSira, 1);
  // ek ders yayınlanır ve seri bilgisini taşır
  const bulut2 = sahteBulut(); bulut2.kayit.set(planAnahtari("op_felsefe"), kayit);
  const r = await mufredatIsleriCalistir({ ayar: ayarT({ ogretmenPlan: true, ogretmenTurUst: 0 }), bulut: bulut2, model: sahteModel(dersCevap), fetchFn: planFetch(), simdi: SIMDI, bekleFn: bekle, yukleme: { harita: new Map([["op_felsefe", m]]), hatalar: [] } });
  assert.equal(r.yayin, 1); assert.equal(bulut2.yayin[0].haber.tr.baslik, "Ders a");
  assert.equal(planYukundenDersler(kayit.yuk).ekler.length, 5);
  // tazeleme: aynı yuk yeniden yazılır (45 gün / 3 gün temizliğine karşı)
  bulut2.kayit.delete(planAnahtari("op_felsefe"));
  assert.equal(await planTazele({ hesap: "op_felsefe", bulut: bulut2, yuk: kayit.yuk, simdi: SIMDI + 86400000 }), true);
  assert.equal(bulut2.kayit.get(planAnahtari("op_felsefe")).durum, "bekliyor_gorsel");
  assert.equal(bulut2.kayit.get(planAnahtari("op_felsefe")).yuk.e.length, 5);
});
test("planlayıcı tetik: kalan < eşik ya da 7 günde bir; ret sonrası 6 saat beklenir; ek kotası dolunca durur", async () => {
  assert.match(planGerekli({ kalan: 3, planZamani: null, simdi: SIMDI }), /kalan 3 < 8/);
  assert.equal(planGerekli({ kalan: 30, planZamani: null, simdi: SIMDI }), "");
  assert.match(planGerekli({ kalan: 30, planZamani: new Date(SIMDI - 8 * 86400000).toISOString(), simdi: SIMDI }), /günlük yenileme/);
  assert.equal(planGerekli({ kalan: 30, planZamani: new Date(SIMDI - 3 * 86400000).toISOString(), simdi: SIMDI }), "");
  assert.equal(planGerekli({ kalan: 3, planZamani: null, sonDeneme: new Date(SIMDI - 3600000).toISOString(), simdi: SIMDI }), "");
  assert.match(planGerekli({ kalan: 3, planZamani: null, sonDeneme: new Date(SIMDI - 7 * 3600000).toISOString(), simdi: SIMDI }), /kalan/);
  assert.equal(planGerekli({ kalan: 3, planZamani: null, simdi: SIMDI, ekSayi: EK_DERS_UST }), "");
  // ret: kayıt yazılır (r), aynı turda tekrar denenmez
  const m = muf("op_felsefe", [dersNesne("a", { kaynak: { wiki_en: "Topic 9" } })]);
  const bulut = sahteBulut(), model = sahteModel(planCevap([planDers(1, { wiki_en: "Olmayan" })]));
  const p = await ogretmenPlanla({ m, dersler: m.dersler, planYuku: null, bulut, model, fetchFn: sahteFetch({ yok: new Set(["Olmayan"]) }), bekleFn: bekle, simdi: SIMDI });
  assert.equal(p.durum, "ret");
  assert.ok(bulut.kayit.get(planAnahtari("op_felsefe")).yuk.r);
});
test("planlayıcı bütçesi: tur başına tüm hesaplar toplamında en çok ogretmenTurUst çağrı; kendi bütçesi, ders bütçesinden ayrı; OGRETMEN_PLAN=0 çağrı yapmaz; özet plan=", async () => {
  const kisa = (h) => muf(h, [dersNesne("d1", { kaynak: { wiki_en: "Topic 9" } }), dersNesne("d2", { kaynak: { wiki_en: "Topic 8" } })], { kategori: "felsefe" });
  const harita = new Map([["op_a", kisa("op_a")], ["op_b", kisa("op_b")]]);
  const yaz = (c) => sahteModel((sistem) => (/müfredat tasarlayan/.test(sistem) ? planCevap([1, 2, 3, 4].map((i) => planDers(i))) : c));
  const model = yaz(dersCevap), bulut = sahteBulut();
  const t = await mufredatIsleriCalistir({ ayar: ayarT({ ogretmenPlan: true, ogretmenTurUst: 1, mufredatCagriUst: 8 }), bulut, model, fetchFn: planFetch(), simdi: SIMDI, bekleFn: bekle, yukleme: { harita, hatalar: [] } });
  assert.equal(t.planCagri, 1, "iki hesap da eşik altında ama yalnız 1 plan çağrısı");
  assert.match(t.planOzet, /^op_[ab]:\+4$/);
  assert.ok(t.cagri <= 8 && t.cagri >= 2, "ders çağrıları plan çağrısından ayrı sayılır");
  assert.equal(model.say.n, t.cagri + 1);
  const kapali = yaz(dersCevap);
  const t2 = await mufredatIsleriCalistir({ ayar: ayarT({ ogretmenPlan: false }), bulut: sahteBulut(), model: kapali, fetchFn: planFetch(), simdi: SIMDI, bekleFn: bekle, yukleme: { harita, hatalar: [] } });
  assert.equal(t2.planCagri, 0); assert.equal(t2.planOzet, "");
  // ret özeti
  const ret = sahteModel((s) => (/müfredat tasarlayan/.test(s) ? planCevap([planDers(1, { wiki_en: "Olmayan" })]) : dersCevap));
  const t3 = await mufredatIsleriCalistir({ ayar: ayarT({ ogretmenPlan: true }), bulut: sahteBulut(), model: ret, fetchFn: sahteFetch({ yok: new Set(["Olmayan"]) }), simdi: SIMDI, bekleFn: bekle, yukleme: { harita, hatalar: [] } });
  assert.match(t3.planOzet, /^op_[ab]:ret:/);
});
test("planlayıcı istemi: alan, mevcut ağaç, yasaklar ve dürüstlük kuralı metinde", () => {
  const m = muf("op_yoga", [dersNesne("y1", { baslik_tr: "Yoga nedir?" })], { kategori: "huzur", yol: ["Yogaya Başlangıç"] });
  const s = PLAN_ISTEMI(m, { agac: "- Yogaya Başlangıç: Yoga nedir?", son: "Yoga nedir?" });
  for (const r of [/yoga eğitmeni/, /EN ÇOK 12 ders/, /Yogaya Başlangıç: Yoga nedir\?/, /yapay zekâ/, /din, tanrı/, /Vikipedi maddesi/, /DEĞİŞTİRME/, /gerekce/]) assert.match(s, r);
  assert.equal(gonderiKimligi("op_x", "a").id.length <= 80, true);
});

// ---------------------------------------------------------------- KALICI DURUM (gecis-020 hat_durum): imleç + öğretmen planı temizlenmeyen tabloda
// Sahte hat_durum: durumOku/durumYaz; hata anahtarlarıyla "uç yok" (eski işlev, HTTP 400) ve "yazılamadı" (HTTP 500) davranışları denenir.
import { imlecDurumAnahtari, planDurumAnahtari, planKaydet, planOku, durumOkuGuvenli, durumYazGuvenli } from "../lib/mufredat.mjs";
function durumluBulut({ okuHata = false, yazHata = false } = {}) {
  const b = sahteBulut(), durum = new Map();
  Object.assign(b, { durum, okuCagri: [], yazCagri: [] });
  b.durumOku = async (a) => { b.okuCagri.push(a); if (okuHata) throw new Error("haber-yukle durum_oku: HTTP 400"); const m = new Map(); for (const k of a) if (durum.has(k)) m.set(k, structuredClone(durum.get(k))); return m; };
  b.durumYaz = async (k, v) => { b.yazCagri.push([k, structuredClone(v)]); if (yazHata) throw new Error("haber-yukle durum_yaz: HTTP 500"); durum.set(k, structuredClone(v)); return true; };
  return b;
}
const bes = () => muf("op_felsefe", ["a1", "a2", "a3", "a4", "a5"].map((i) => dersNesne(i)));

test("hat_durum: anahtarlar sunucu biçimine uyar (^[a-z0-9_:-]{3,80}$)", () => {
  for (const h of ["op_felsefe", "op_meditasyon", "op_antik"]) for (const a of [imlecDurumAnahtari(h), planDurumAnahtari(h)]) assert.match(a, /^[a-z0-9_:-]{3,80}$/);
  assert.equal(imlecDurumAnahtari("op_felsefe"), "mufredat:op_felsefe:imlec"); assert.equal(planDurumAnahtari("op_felsefe"), "mufredat:op_felsefe:plan");
});
test("hat_durum: yardımcılar uç yoksa/hata verirse null/false döner (atmaz); geçersiz anahtar çağrılmaz", async () => {
  assert.equal(await durumOkuGuvenli(sahteBulut(), ["mufredat:x:imlec"]), null, "bulut.durumOku yok");
  assert.equal(await durumOkuGuvenli(durumluBulut({ okuHata: true }), ["mufredat:x:imlec"]), null);
  const b = durumluBulut();
  assert.equal(await durumOkuGuvenli(b, ["Büyük Harf"]), null); assert.equal(b.okuCagri.length, 0, "geçersiz anahtar ağa çıkmaz");
  assert.equal(await durumYazGuvenli(b, "x", { n: 1 }), false); assert.equal(b.yazCagri.length, 0);
  assert.equal(await durumYazGuvenli(durumluBulut({ yazHata: true }), "mufredat:x:imlec", { n: 1 }), false);
  assert.equal(await durumYazGuvenli(b, "mufredat:x:imlec", { n: 1 }), true);
});
test("hat_durum: yayında imleç hat_durum'a yazılır (haber_gorulen imleci YAZILMAZ); 45 gün sonra ders anahtarları silinse de ilerleme kalır", async () => {
  const m = bes(), bulut = durumluBulut(), model = sahteModel(dersCevap), f = sahteFetch();
  for (let g = 0; g < 2; g++) await mufredatUret({ m, dersler: m.dersler, bulut, model, fetchFn: f, simdi: Date.UTC(2026, 9, 14 + g, 6, 0), cagriHakki: 4, bekleFn: bekle });
  assert.equal(bulut.yayin.length, 2);
  assert.equal(bulut.durum.get(imlecDurumAnahtari("op_felsefe")).n, 2);
  assert.match(bulut.durum.get(imlecDurumAnahtari("op_felsefe")).z, /^2026-10-15T/);
  assert.ok(!bulut.kayit.has(imlecAnahtari("op_felsefe", 1)) && !bulut.kayit.has(imlecAnahtari("op_felsefe", 2)), "eski yol kullanılmadı");
  // haber_gorulen'in tümü temizlendi (45 gün + 3 gün temizliği); hat_durum temizlenmez
  bulut.kayit.clear();
  const il = await ilerlemeOku({ bulut, hesap: "op_felsefe", dersler: m.dersler });
  assert.deepEqual(il, { n: 2, sira: 2, toplam: 5, bitti: false });
  // kalıcı imleç varken eski imleçler HİÇ sorulmaz (yalnız ders-anahtarı penceresi)
  bulut.kayit.clear();
  const sorulan = []; const orijinal = bulut.bilinenler; bulut.bilinenler = async (o) => { sorulan.push(...o); return orijinal(o); };
  await ilerlemeOku({ bulut, hesap: "op_felsefe", dersler: m.dersler });
  assert.ok(!sorulan.some((k) => k === imlecAnahtari("op_felsefe", 1) || k === imlecAnahtari("op_felsefe", 5)), "haber_gorulen imleci sorulmadı");
  // tekrar başa dönmez
  const r = await mufredatUret({ m, dersler: m.dersler, bulut, model, fetchFn: f, simdi: Date.UTC(2026, 9, 20, 6, 0), cagriHakki: 4, bekleFn: bekle });
  assert.equal(r.durum, "yayinlandi"); assert.equal(bulut.yayin[2].haber.tr.baslik, "Ders a3");
  assert.equal(bulut.durum.get(imlecDurumAnahtari("op_felsefe")).n, 3);
});
test("hat_durum: GERİYE UYUM — canlıdaki haber_gorulen imleci ilk okumada hat_durum'a taşınır (haber_gorulen kaydı silinmez)", async () => {
  const m = bes(), bulut = durumluBulut();
  bulut.kayit.set(imlecAnahtari("op_felsefe", 3), { ozet: imlecAnahtari("op_felsefe", 3), durum: "yayinlandi" });
  bulut.kayit.set(imlecAnahtari("op_felsefe", 1), { ozet: imlecAnahtari("op_felsefe", 1), durum: "yayinlandi" });
  const il = await ilerlemeOku({ bulut, hesap: "op_felsefe", dersler: m.dersler });
  assert.deepEqual(il, { n: 3, sira: 3, toplam: 5, bitti: false });
  assert.equal(bulut.durum.get(imlecDurumAnahtari("op_felsefe")).n, 3); assert.equal(bulut.durum.get(imlecDurumAnahtari("op_felsefe")).kaynak, "tasima");
  assert.ok(bulut.kayit.has(imlecAnahtari("op_felsefe", 3)), "eski kayıt silinmedi");
  // ikinci okuma artık hat_durum'dan: eski imleç silinse de n = 3
  bulut.kayit.clear();
  assert.equal((await ilerlemeOku({ bulut, hesap: "op_felsefe", dersler: m.dersler })).n, 3);
  // imleç hiç yok (yeni hesap): n = 0, hat_durum'a SIFIR yazılmaz
  const b2 = durumluBulut();
  assert.equal((await ilerlemeOku({ bulut: b2, hesap: "op_yeni", dersler: m.dersler })).n, 0); assert.equal(b2.yazCagri.length, 0);
});
test("hat_durum: uç yoksa/hata verirse haber_gorulen yoluna düşer — okuma (imleç) ve yazma (imleç + günlük yuva) aynen eski davranış", async () => {
  const m = bes(), model = sahteModel(dersCevap), f = sahteFetch();
  // okuma hatası (eski işlev: HTTP 400): imleç haber_gorulen'den, yazım haber_gorulen'e (durumYaz da denenir ama hata)
  const eski = durumluBulut({ okuHata: true, yazHata: true });
  eski.kayit.set(imlecAnahtari("op_felsefe", 2), { ozet: imlecAnahtari("op_felsefe", 2), durum: "yayinlandi" });
  assert.equal((await ilerlemeOku({ bulut: eski, hesap: "op_felsefe", dersler: m.dersler })).n, 2);
  assert.equal(eski.yazCagri.length, 0, "okuma hatasındaysa taşıma denenmez (hat_durum çalışmıyor)");
  const r = await mufredatUret({ m, dersler: m.dersler, bulut: eski, model, fetchFn: f, simdi: SIMDI, cagriHakki: 4, bekleFn: bekle });
  assert.equal(r.durum, "yayinlandi");
  assert.ok(eski.kayit.has(imlecAnahtari("op_felsefe", 3)), "imleç haber_gorulen'e yazıldı");
  // durumYaz tek başına hata verirse de imleç kaybolmaz
  const yarim = durumluBulut({ yazHata: true });
  const r2 = await mufredatUret({ m, dersler: m.dersler, bulut: yarim, model, fetchFn: f, simdi: SIMDI, cagriHakki: 4, bekleFn: bekle });
  assert.equal(r2.durum, "yayinlandi"); assert.ok(yarim.kayit.has(imlecAnahtari("op_felsefe", 1)));
  // hiç durum ucu olmayan eski bulut nesnesi (mevcut testler): değişmedi
  const duz = sahteBulut();
  await mufredatUret({ m, dersler: m.dersler, bulut: duz, model, fetchFn: f, simdi: SIMDI, cagriHakki: 4, bekleFn: bekle });
  assert.ok(duz.kayit.has(imlecAnahtari("op_felsefe", 1)));
});
test("hat_durum: öğretmen planı hat_durum'a yazılır, oradan okunur, temizlikten etkilenmez; haber_gorulen'deki eski plan taşınır", async () => {
  const m = muf("op_felsefe", [dersNesne("a", { kaynak: { wiki_en: "Topic 9" } }), dersNesne("b", { kaynak: { wiki_en: "Topic 8" } })]);
  const bulut = durumluBulut(), model = sahteModel(planCevap([planDers(1), planDers(2), planDers(3), planDers(4), planDers(5)]));
  const p = await ogretmenPlanla({ m, dersler: m.dersler, planYuku: null, bulut, model, fetchFn: planFetch(), bekleFn: bekle, simdi: SIMDI, son: "Ders a" });
  assert.equal(p.durum, "eklendi"); assert.equal(p.eklenen, 5);
  assert.ok(!bulut.kayit.has(planAnahtari("op_felsefe")), "plan haber_gorulen'e yazılmadı");
  const kayitli = bulut.durum.get(planDurumAnahtari("op_felsefe"));
  assert.equal(kayitli.v, 1); assert.equal(kayitli.e.length, 5);
  assert.ok(JSON.stringify(kayitli).length < 65536);
  // 3 gün sonra haber_gorulen boşalsa da plan yaşar; tur planı hat_durum'dan okur ve ek dersleri yayınlar
  bulut.kayit.clear();
  assert.deepEqual((await planOku({ bulut, hesap: "op_felsefe" })).kaynak, "durum");
  const r = await mufredatIsleriCalistir({ ayar: ayarT({ ogretmenPlan: true, ogretmenTurUst: 0 }), bulut, model: sahteModel(dersCevap), fetchFn: planFetch(), simdi: SIMDI, bekleFn: bekle, yukleme: { harita: new Map([["op_felsefe", m]]), hatalar: [] } });
  assert.equal(r.yayin, 1); assert.match(r.ozet, /op_felsefe:1\/7/, "çekirdek 2 + hat_durum'daki 5 ek ders = 7");
  // tazele: hat_durum'a yazar
  assert.equal(await planTazele({ hesap: "op_felsefe", bulut, yuk: kayitli, simdi: SIMDI + 86400000 }), true);
  assert.equal(bulut.durum.get(planDurumAnahtari("op_felsefe")).y, new Date(SIMDI + 86400000).toISOString()); assert.ok(!bulut.kayit.has(planAnahtari("op_felsefe")));
  // GERİYE UYUM: plan yalnız haber_gorulen'de (canlı) -> okunur ve hat_durum'a taşınır
  const eski = durumluBulut(); eski.kayit.set(planAnahtari("op_felsefe"), { ozet: planAnahtari("op_felsefe"), durum: "bekliyor_gorsel", yuk: kayitli });
  const o = await planOku({ bulut: eski, hesap: "op_felsefe" });
  assert.equal(o.kaynak, "gorulen"); assert.equal(o.yuk.e.length, 5); assert.equal(eski.durum.get(planDurumAnahtari("op_felsefe")).e.length, 5, "taşındı");
  assert.ok(eski.kayit.has(planAnahtari("op_felsefe")), "eski kayıt silinmedi");
});
test("hat_durum: plan yazımı uç yokken haber_gorulen'e (bekliyor_gorsel) düşer; ikisi de olmazsa hata atar; plan yok -> kaynak null", async () => {
  const bulut = durumluBulut({ yazHata: true }), yuk = { v: 1, z: "2026-10-14T00:00:00Z", y: "2026-10-14T00:00:00Z", g: "", s: [], e: [] };
  assert.equal(await planKaydet(bulut, "op_felsefe", yuk, "deneme"), "gorulen");
  assert.equal(bulut.kayit.get(planAnahtari("op_felsefe")).durum, "bekliyor_gorsel");
  const ikisiDe = { ...durumluBulut({ yazHata: true }), isaretle: async () => { throw new Error("haber-yukle isaretle: HTTP 500"); } };
  await assert.rejects(planKaydet(ikisiDe, "op_felsefe", yuk, "x"), /HTTP 500/);
  assert.deepEqual(await planOku({ bulut: durumluBulut(), hesap: "op_yok" }), { yuk: null, kaynak: null });
});
