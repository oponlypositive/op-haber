// Alan haberleri (spor, sanat, bilim, teknoloji, gökbilim), kaynak şeması, alan dengesi, kota; çevrilmiş özel ad kapısı; görsel yer/kurum uyumu.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ALANLAR, alanOnEleme, alanDengele, kotaAyristir, alanKalan } from "../lib/alanlar.mjs";
import { onEleme, guvenilirMi } from "../lib/on_eleme.mjs";
import { rssAyristir } from "../lib/rss.mjs";
import { ozelAdSuphesi, ciktiDogrula } from "../lib/dogrula.mjs";
import { haberYaz, ozelAdKapisi, istemKur } from "../lib/yaz.mjs";
import { vlDegerlendir, VL_BEKLENEN, vlSorusu } from "../lib/gorsel.mjs";
import { ayarOku } from "../lib/ayar.mjs";

const burasi = dirname(fileURLToPath(import.meta.url));
const kaynaklar = JSON.parse(readFileSync(join(burasi, "..", "kaynaklar.json"), "utf8"));

test("alan ön elemesi: kabul/ret tablosu", () => {
  const T = [
    ["spor", "Voleybol takımı finalde rakibini yendi", "", true],
    ["spor", "Süper Lig'de 7. hafta sonuçları ve puan durumu", "", true],
    ["spor", "Swimmer wins gold and sets national record", "", true],
    ["spor", "Futbolcular arasında kavga çıktı, ceza geldi", "kazandı", false],
    ["spor", "Transfer iddiası: bonservis pazarlığı", "kazandı", false],
    ["spor", "Star player injured, out for season", "won", false],
    ["spor", "Betting odds for the final", "won", false],
    ["spor", "Teknik direktörün açıklaması", "", false],                          // sonuç/başarı işareti yok
    ["sanat", "Museum opens new ceramics exhibition", "", true],
    ["sanat", "Festival announces its lineup of young orchestras", "", true],
    ["sanat", "Artist caught in scandal over fake paintings", "", false],
    ["sanat", "Stolen painting sold at auction", "", false],
    ["gokbilim", "Webb telescope finds new galaxy cluster", "", true],
    ["gokbilim", "Horoscope for Mars retrograde", "", false],
    ["bilim", "Researchers grow coral nursery on restored reef", "", true],
    ["teknoloji", "Engineers build a solar powered sensor", "", true],
    ["teknoloji", "Best deals on laptops this week", "", false],
    ["teknoloji", "Hack exposes data breach at large company", "", false],
  ];
  for (const [alan, baslik, ozet, beklenen] of T) assert.equal(alanOnEleme({ alan, baslik, ozet }).ok, beklenen, `${alan}: ${baslik}`);
  assert.equal(alanOnEleme({ baslik: "Her şey serbest", ozet: "" }).ok, true);   // alan yok = iyi haber sitesi, bu kapı uygulanmaz
});

test("alan haberi tüm ön elemeden geçer: tazelik override + hassas konu hâlâ ret", () => {
  const simdi = Date.parse("2026-10-13T12:00:00Z");
  const a = { baslik: "Telescope finds new galaxy cluster", ozet: "", link: "https://www.eso.org/x", zaman: "2026-10-05T12:00:00Z", alan: "gokbilim" };
  assert.equal(onEleme(a, { simdi, tazelikSaat: 24 }).ok, false);                       // 8 gün: varsayılan tazelik dışı
  assert.equal(onEleme({ ...a, tazelikSaat: 720 }, { simdi, tazelikSaat: 24 }).ok, true);   // kaynak özel süresi
  assert.equal(onEleme({ ...a, tazelikSaat: 720, baslik: "Government funds new telescope" }, { simdi }).ok, false);   // devlet icraatı
  assert.equal(guvenilirMi({ link: "https://baska.example/a", kaynakGuvenilir: true }, []), true);
  assert.equal(guvenilirMi({ link: "https://baska.example/a" }, []), false);
});

test("alan dengesi: aynı alandan art arda en çok 2; kota ayrıştırma ve kalan hak", () => {
  const l = ["spor", "spor", "spor", "spor", "sanat", "bilim"].map((alan, i) => ({ alan, baslik: String(i) }));
  const d = alanDengele(l, 2).map((x) => x.alan);
  assert.deepEqual(d, ["spor", "spor", "sanat", "spor", "spor", "bilim"]);
  assert.deepEqual(alanDengele(l.slice(0, 3), 2).map((x) => x.baslik), ["0", "1", "2"]);   // başka alan yoksa devam eder
  const k = kotaAyristir("spor:2, sanat:9, yok:3, bilim:x");
  assert.equal(k.spor, 2); assert.equal(k.sanat, 9); assert.equal(k.bilim, 6); assert.ok(!("yok" in k));
  const durum = new Map([["spor", { son24: 3 }], ["sanat", { son24: 1 }]]);
  const kalan = alanKalan(k, durum);
  assert.equal(kalan.spor, 0); assert.equal(kalan.sanat, 8); assert.equal(kalan.gokbilim, 3);
  assert.equal(ayarOku({}, []).turBasinaEn, 4);
  assert.equal(ayarOku({ ALAN_KOTALARI: "spor:1" }, []).alanKotalari.spor, 1);
});

test("kaynaklar.json şeması: besleme adresi, alan, koşul işareti, hazır görsel lisansı", () => {
  const ADLAR = new Set();
  for (const k of kaynaklar.rss) {
    assert.ok(k.ad && !ADLAR.has(k.ad), `ad tekil: ${k.ad}`); ADLAR.add(k.ad);
    assert.match(k.url, /^https:\/\//, k.ad);
    assert.ok(["tr", "en"].includes(k.dil), k.ad);
    assert.equal(typeof k.guvenilir, "boolean", k.ad);
    if (k.alan) {
      assert.ok(k.alan in ALANLAR, `alan geçerli: ${k.ad}`);
      assert.ok(["dogrulandi", "dogrulanamadi"].includes(k.kosul), `koşul işareti: ${k.ad}`);
      assert.ok(k.kosul_not, `koşul notu: ${k.ad}`);
    }
    if (k.tazelik_saat) assert.ok(k.tazelik_saat >= 1 && k.tazelik_saat <= 2000, k.ad);
    if (k.hazir_gorsel) { assert.match(k.gorsel_lisans?.lisans || "", /^CC BY/, k.ad); assert.ok(k.gorsel_lisans.sahibi, k.ad); assert.equal(k.kosul, "dogrulandi", `hazır görsel yalnız doğrulanmış lisansla: ${k.ad}`); }
  }
  for (const a of Object.keys(ALANLAR)) assert.ok(kaynaklar.rss.some((k) => k.alan === a), `alan için kaynak var: ${a}`);
});

test("rss: enclosure ve açıklamadaki görsel (yalnız https)", () => {
  const xml = `<rss><channel><item><title>Bir galaksi</title><link>https://www.eso.org/a</link><pubDate>Mon, 12 Oct 2026 06:00:00 +0200</pubDate>
    <description>&lt;img src="https://cdn.eso.org/images/news/a.jpg" /&gt;&lt;p&gt;Metin&lt;/p&gt;</description><enclosure url="https://cdn.eso.org/images/screen/a.jpg" length="1" type="image/jpeg"></enclosure></item>
    <item><title>İkinci</title><link>https://x.example/b</link><description>&lt;img src="http://x.example/b.jpg"&gt;</description></item></channel></rss>`;
  const a = rssAyristir(xml, { kaynak: "k", dil: "en" });
  assert.equal(a[0].gorselUrl, "https://cdn.eso.org/images/screen/a.jpg");
  assert.equal(a[1].gorselUrl, "");
});

test("istem: alan haberinde 'iyi haber' şartı kalkar, alan ölçütü gelir; özel ad kuralı hep var", () => {
  assert.match(istemKur("spor"), /ŞART DEĞİL/);
  assert.match(istemKur("spor"), /bahis ve kumar/);
  assert.match(istemKur("spor"), /- kategori: spor\. yer:/);
  assert.match(istemKur(undefined), /yalnız mutlu, umut veren/);
  for (const a of [undefined, "spor"]) assert.match(istemKur(a), /ÖZEL ADLAR: .*ÖZGÜN dilinde/s);
});

test("alan haberi model akışı: kategori koda bağlı, uygun değilse ret", async () => {
  const EN = "Researchers at the observatory released a new image of a distant galaxy cluster this week. The picture combines many hours of exposure collected over several nights. " +
    "Astronomers say the cluster contains hundreds of galaxies bound together by gravity. The team plans further observations to measure the cluster mass more precisely. It is a good example of patient and careful work.";
  const TR = "Gözlemevindeki araştırmacılar bu hafta uzak bir gökada kümesinin yeni görüntüsünü yayımladı. Görüntü, birkaç gece boyunca toplanan çok saatlik pozlamaları bir araya getiriyor. " +
    "Gökbilimciler kümenin kütle çekimiyle birbirine bağlı yüzlerce gökada içerdiğini söylüyor. Ekip kütleyi daha hassas ölçmek için yeni gözlemler planlıyor. Bu, sabırlı ve özenli çalışmanın güzel bir örneği.";
  const yanit = JSON.stringify({ uygun: true, kategori: "bilim", yer: "Dünya", en: { baslik: "A new image of a distant galaxy cluster", ozet: EN }, tr: { baslik: "Uzak bir gökada kümesinin yeni görüntüsü", ozet: TR } });
  const model = { yaz: async () => ({ metin: yanit, saglayici: "t" }) };
  const KAYNAK = "A fresh picture of a faraway cluster was shared by astronomers from an observatory. It stacks long exposures taken across multiple nights and shows hundreds of galaxies. Follow-up work will refine the mass estimate of the group.";
  const aday = { baslik: "New image of galaxy cluster", ozet: KAYNAK, dil: "en", alan: "gokbilim" };
  const y = await haberYaz(model, aday, KAYNAK + " " + KAYNAK);
  assert.equal(y.durum, "ok");
  assert.equal(y.haber.kategori, "gokbilim");                       // model "bilim" dese de alan kategoriyi belirler
  const ret = await haberYaz({ yaz: async () => ({ metin: '{"uygun": false, "red_nedeni": "alan uygun değil"}' }) }, aday, KAYNAK + " " + KAYNAK);
  assert.equal(ret.durum, "ret");
});

// ---- Kural 1: çevrilmiş özel ad şüphesi (sahip şikâyeti: "Çizgide Uzlaş")
test("özel ad kapısı: 'Çizgide Uzlaş' yakalanır, yanlış pozitifler geçer", () => {
  const kaynak = "Schools adopt new lesson plans such as Draw the Line, a curriculum about conflict. Harvard University opened a center. The United Nations met in New York in October.";
  assert.deepEqual(ozelAdSuphesi("Çizgide Uzlaş adını taşıyanlar gibi yeni ders planları okullara girdi.", kaynak), ["Çizgide Uzlaş"]);
  assert.deepEqual(ozelAdSuphesi("Yeni ders planlarından biri olan Draw the Line okullarda kullanılıyor.", kaynak), []);   // özgün ad korunmuş
  assert.deepEqual(ozelAdSuphesi("Harvard Üniversitesi’nde bir merkez açıldı.", kaynak), []);                      // kaynakta Harvard geçer
  assert.deepEqual(ozelAdSuphesi("Birleşmiş Milletler Ekim ayında New York’ta toplandı.", kaynak), []);             // yaygın çeviri + ay + şehir
  assert.deepEqual(ozelAdSuphesi("Okullar yeni planlar kullanıyor. Çalışma Ocak Ayında başladı.", kaynak), []);
  assert.deepEqual(ozelAdSuphesi("Cümle başı büyük harf normaldir. Sonra küçük harfle devam eder.", kaynak), []);
});

test("özel ad kapısı akışı: model özgün adla yeniden yazarsa düzelir; düzelmezse cümle çıkar; çok cümle gidiyorsa haber atlanır", async () => {
  const kaynak = "Schools adopt new lesson plans such as Draw the Line, a curriculum about conflict. Teachers say the plans help students discuss disagreement calmly in class.";
  const hazir = () => ({ tr: { baslik: "Okullarda yeni ders planları", ozet: "Çizgide Uzlaş adını taşıyanlar gibi yeni ders planları okullara girdi. Öğretmenler planların sınıfta sakin tartışmaya yardım ettiğini söylüyor. Planlar çatışma konusunu ele alıyor. Okullar uygulamayı genişletmeyi düşünüyor." } });
  const duzgun = JSON.stringify({ baslik: "Okullarda yeni ders planları", ozet: "Draw the Line gibi yeni ders planları okullara girdi. Öğretmenler planların sınıfta sakin tartışmaya yardım ettiğini söylüyor. Planlar çatışma konusunu ele alıyor." });
  const h1 = hazir();
  const r1 = await ozelAdKapisi({ yaz: async () => ({ metin: duzgun }) }, h1, kaynak);
  assert.equal(r1.ok, true); assert.match(h1.tr.ozet, /Draw the Line/); assert.doesNotMatch(h1.tr.ozet, /Çizgide Uzlaş/);
  const h2 = hazir();
  const r2 = await ozelAdKapisi({ yaz: async () => ({ metin: "{}" }) }, h2, kaynak);        // model düzeltemedi: şüpheli cümle çıkarılır (3 cümle kalır)
  assert.equal(r2.ok, true); assert.doesNotMatch(h2.tr.ozet, /Çizgide/);
  const h3 = hazir(); h3.tr.ozet = "Çizgide Uzlaş adlı program başladı. Başka Bir Plan da vardı. Sonuç iyi oldu.";
  const r3 = await ozelAdKapisi({ yaz: async () => ({ metin: "{}" }) }, h3, kaynak);
  assert.equal(r3.ok, false);                                                              // geriye 3'ten az cümle kalıyor: atla
  const h4 = hazir();
  assert.equal((await ozelAdKapisi({ yaz: async () => { throw new Error("x"); } }, h4, kaynak)).ok, true);   // ağ hatası kapıyı kırmaz: cümle çıkarma yoluna düşer
});

// ---- Kural 2: görsel yer/kurum uyumu
test("görsel kontrolü: yer_ya_da_kurum_uyumsuz ve insan_ayirt_edilebilir ikisi de false olmalı", () => {
  const tamam = { ...VL_BEKLENEN, kisa_gerekce: "binanın kendisi" };
  assert.equal(vlDegerlendir(JSON.stringify(tamam)).ok, true);
  const yanlisUlke = vlDegerlendir(JSON.stringify({ ...tamam, yer_ya_da_kurum_uyumsuz: true }));
  assert.equal(yanlisUlke.ok, false); assert.match(yanlisUlke.neden, /yer\/kurum/);        // Harvard haberine başka ülkedeki bilgisayar sınıfı
  const insan = vlDegerlendir(JSON.stringify({ ...tamam, insan_ayirt_edilebilir: true }));
  assert.equal(insan.ok, false); assert.match(insan.neden, /insan/);
  const { yer_ya_da_kurum_uyumsuz, ...eksik } = tamam;
  assert.equal(vlDegerlendir(JSON.stringify(eksik)).ok, false);                           // alan eksikse ret
  assert.match(vlSorusu("Center opens", "text", false, "Harvard Graduate School of Education"), /Harvard Graduate School of Education/);
  assert.match(vlSorusu("Center opens", "text", false), /no specific place/);
});

test("yer_kurum_adi haber nesnesine taşınır ve görsel aramasında önce kullanılır", () => {
  const kay = "A study from Harvard Graduate School of Education examined teaching in many classrooms over several years. Teachers reacted warmly to the findings 2024.";
  const d = { uygun: true, kategori: "bilim", yer: "Dünya", yer_kurum_adi: "Harvard Graduate School of Education!", gorsel_arama: "classroom desk",
    en: { baslik: "A report on teaching", ozet: "Researchers at the school released a report on teaching. The report covers many classrooms and shows steady progress across several years of study. Teachers welcomed the results with great interest." },
    tr: { baslik: "Öğretim üzerine bir rapor", ozet: "Okuldaki araştırmacılar öğretim üzerine bir rapor yayımladı. Rapor birçok sınıfı kapsıyor ve yıllar boyunca düzenli ilerleme gösteriyor. Öğretmenler sonuçları büyük ilgiyle karşıladı ve çalışmayı destekledi." } };
  const v = ciktiDogrula(d, kay, "A report");
  assert.equal(v.ok, true, v.neden);
  assert.equal(v.haber.yerKurum, "Harvard Graduate School of Education");
});

test("görsel arama stratejisi: yer/kurum adı önce aranır", async () => {
  const { gorselBul } = await import("../lib/gorsel.mjs");
  const sorgular = [];
  const araFn = async (q) => { sorgular.push(q); return []; };
  const haber = { en: { baslik: "Center opens at Harvard", ozet: "A new teaching center opened." }, gorselAra: "classroom desk", yerKurum: "Harvard Graduate School of Education" };
  await gorselBul(haber, { model: { yaz: async () => ({ metin: "{}" }) }, araFn, bekleFn: async () => {} });
  assert.equal(sorgular[0], "Harvard Graduate School of Education building");
  assert.ok(sorgular.some((q) => /classroom|desk/.test(q)), "ardından insansız konu nesnesi");
});

test("alan ön elemesi: canlı beslemede görülen din/kimlik kaçakları elenir", () => {
  assert.equal(alanOnEleme({ alan: "sanat", baslik: "Medresesinden Fethiye İmam Hatip Ortaokulu'na", ozet: "" }).ok, false);
  assert.equal(alanOnEleme({ alan: "sanat", baslik: "Celebrate Indigenous Peoples' Day With 15 Dramatic Images", ozet: "" }).ok, false);
  assert.equal(alanOnEleme({ alan: "sanat", baslik: "Photographer shows desert dunes at dawn", ozet: "" }).ok, true);
});
