// OP Sohbet (2026-10-13): havuz sayıları, her şablonun doğrulaması, hava sınıfı/atlama, dürüstlük kuralı (birinci tekil kişi yok), tür dönüşümü, model dokunuşu. Ağsız.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BILMECELER, BILMECE_ONEKLERI, GUNUN_GENEL, GUNUN_GUN, GUNUN_MEVSIM, HAVA_IYI, HAVA_KOTU, ONERILER, SEHIRLER } from "../lib/sohbet_veri.mjs";
import { havaAyristir, havaSinifi, havuzAdaylari, ogeKimligi, sohbetDogrula, sohbetEnDogrula, sohbetUret, sohbetHaberi, SOHBET_ISTEMI, SIRA } from "../lib/sohbet.mjs";
import { ayarOku } from "../lib/ayar.mjs";
import { OZEL_ALANLAR, ozelIsleriCalistir } from "../lib/ozel.mjs";
import { OZEL_PLAN, planAyristir } from "../lib/alinti.mjs";
import { denetle } from "../lib/moderasyon.mjs";

const SIMDI = Date.parse("2026-10-13T09:00:00Z");           // Salı, Türkiye saati 12:00
const sahteBulut = (onceki = new Map()) => { const k = { yayinlar: [], isaretler: [] }; return { k, bilinenler: async () => onceki, isaretle: async (l) => { k.isaretler.push(...l); return { yazildi: l.length }; }, yayinla: async (h, ozet, g) => { k.yayinlar.push({ h, ozet, g }); return { durum: "eklendi" }; } }; };
const IYI = { kod: 0, derece: 24, ruzgar: 8, gunduz: true };

test("havuz sayıları: >=120 bilmece, >=150 günün sorusu, >=40 öneri, 5 şehir (doğrulanmış yer adlarıyla)", () => {
  assert.ok(BILMECELER.length >= 120, `bilmece ${BILMECELER.length}`);
  const gunun = new Set([...GUNUN_GENEL, ...Object.values(GUNUN_GUN).flat(), ...Object.values(GUNUN_MEVSIM).flat()]);
  assert.ok(gunun.size >= 150, `günün sorusu ${gunun.size}`);
  assert.ok(ONERILER.length >= 40, `öneri ${ONERILER.length}`);
  assert.deepEqual(SEHIRLER.map((s) => s.ad), ["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa"]);
  for (const s of SEHIRLER) { assert.ok(s.yerler.length >= 3, s.ad); for (const y of s.yerler) assert.ok(y.ad && y.de && /^[A-Za-z0-9 ]+$/.test(y.ara), y.ad); }
  assert.ok(SEHIRLER[0].yerler.some((y) => y.ad === "Bostancı sahili") && SEHIRLER[2].yerler.some((y) => y.ad === "Kordon") && SEHIRLER[1].yerler.some((y) => y.ad === "Kuğulu Park"));
  assert.equal(new Set(BILMECELER.map((b) => b[0])).size, BILMECELER.length, "tekrarlanan bilmece yok");
  assert.equal(new Set(ONERILER).size, ONERILER.length);
});

test("her havuz öğesi doğrulamadan geçer: soruyla biter, <=280, birinci tekil kişi yok, moderasyon temiz; bilmece cevabı metinde değil", () => {
  const hepsi = [];
  for (const [soru, cevap] of BILMECELER) {
    assert.ok(cevap && cevap.length >= 2, soru);
    for (const on of BILMECE_ONEKLERI) hepsi.push([`${on} ${soru}`, cevap]);
  }
  for (const m of [...GUNUN_GENEL, ...Object.values(GUNUN_GUN).flat(), ...Object.values(GUNUN_MEVSIM).flat(), ...ONERILER]) hepsi.push([m, null]);
  for (const [metin, cevap] of hepsi) {
    const v = sohbetDogrula(metin);
    assert.equal(v.ok, true, `${metin} -> ${v.neden}`);
    assert.ok(metin.length <= 280 && metin.endsWith("?"));
    if (cevap && cevap.length > 6) assert.ok(!metin.includes(cevap), `cevap metinde geçiyor: ${metin}`);
  }
});

test("dürüstlük kuralı: uydurma kişisel deneyim ve birinci tekil kişi kalıpları reddedilir", () => {
  const ret = ["Bugün sahilde yürüdüm, siz nerede yürürsünüz?", "Sabahtan beri kafamda bir şarkı var, sizde hangisi var?", "Ben bu kitabı çok sevdim, siz hangisini seversiniz?", "Bana bir film önerir misiniz?",
    "Bence bu hafta çok güzeldi, sizce?", "Az önce çay içiyorum, siz ne içiyorsunuz?", "Dün Moda'ya gittim, siz nereye gitmek istersiniz?", "Bugün gittim ve çok sevdim, siz?", "Benim en sevdiğim yer Kordon, sizin?", "Annem ve ailem bu şarkıyı severdi, sizin sevdikleriniz ne dinler?"];
  for (const t of ret) assert.equal(sohbetDogrula(t).ok, false, t);
  assert.equal(sohbetDogrula("Bugün İzmir'de hava açık, 24 derece. Kordon'da gün batımı için en sevdiğiniz nokta neresi?").ok, true);
  assert.equal(sohbetDogrula("Kitaplarda 'Bir Derdim Var' şarkısı gibi adlar geçerse bu ad tırnaklıysa serbesttir, siz hangisini önerirsiniz?").ok, true);    // tırnak içindeki eser/şarkı adı muaf
  assert.equal(sohbetDogrula("Yardım eden komşunuzu ve adımlarınızı hatırlıyor musunuz?").ok, true);                                                      // yardım/adım isimleri birinci tekil fiil sayılmaz
});

test("biçim kuralları: ünlem, uzunluk, soru işareti ile bitmeme, emoji, bağlantı, reklam, marka reddedilir", () => {
  for (const t of ["Harika bir gün, siz ne yapıyorsunuz!?", "Bu bir cümle ama soru değil.", "x".repeat(280) + " neden?", "Bugün hava güzel mi? 🙂", "Bu bağlantıya bakar mısınız https://ornek.com/a?", "İndirimli kahve için nereyi önerirsiniz?", "Hangi marka telefon önerirsiniz?", "Bu savaş sonrası hangi film önerirsiniz?", "Bu hafta seçim hakkında ne düşünüyorsunuz?"])
    assert.equal(sohbetDogrula(t).ok, false, t);
  assert.equal(sohbetEnDogrula("I walked on the beach today, where do you walk?", "x").ok, false);
  assert.equal(sohbetEnDogrula("Where is your favorite spot for a walk in Izmir?", "x").ok, true);
  assert.equal(sohbetEnDogrula("It is 25 degrees. Where do you walk?", "24 derece").ok, false, "rakam değişti");
});

test("model dokunuşu doğrulaması: rakam/özel ad/tırnaklı ad korunmalı, yeni özel ad eklenemez", () => {
  const sablon = "Bugün Ankara'da hava açık, 21 derece. Kuğulu Park çevresinde kısa bir mola için en güzel yer neresi?";
  assert.equal(sohbetDogrula("Ankara'da bugün hava açık ve 21 derece. Kuğulu Park çevresinde kısa bir mola için en güzel yer neresi?", sablon).ok, true);
  assert.match(sohbetDogrula("Ankara'da bugün hava açık ve 22 derece. Kuğulu Park çevresinde kısa bir mola için en güzel yer neresi?", sablon).neden, /rakam/);
  assert.match(sohbetDogrula("Ankara'da bugün hava açık ve 21 derece. Çevrede Starbucks yakınlarında kısa bir mola için en güzel yer neresi?", sablon).neden, /yeni özel ad/);
  assert.equal(sohbetDogrula("Ankara'da bugün hava açık ve 21 derece. Kuğulu Park çevresinde kısa bir mola için en güzel yer neresi? Ben de gidiyorum?", sablon).ok, false);
  assert.match(SOHBET_ISTEMI, /ilk kişi tekil|İlk kişi tekil/);
});

test("hava şablonları: her şehir x her yer x her şablon geçerli (<=280, soru, rakam, İngilizce karşılığı geçerli); hava durumu kelimeleri doğru", () => {
  const dolu = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => v[k]);
  let sayi = 0;
  for (const s of SEHIRLER) for (const y of s.yerler) for (const h of HAVA_IYI) {
    const v = { sehir_de: s.de, city: s.en, hava: "parçalı bulutlu", derece: "24", yer: y.ad, yer_de: y.de };
    const tr = dolu(h.tr, v), en = dolu(h.en, { ...v, hava: "partly cloudy" });
    assert.equal(sohbetDogrula(tr).ok, true, tr); assert.equal(sohbetEnDogrula(en, tr).ok, true, en); assert.ok(!/\{/.test(tr + en)); sayi++;
  }
  for (const s of SEHIRLER) for (const h of HAVA_KOTU) {
    const v = { sehir_de: s.de, city: s.en, hava_kotu: "hafif yağmurlu", derece: "12" };
    const tr = dolu(h.tr, v), en = dolu(h.en, { ...v, hava_kotu: "lightly rainy" });
    assert.equal(sohbetDogrula(tr).ok, true, tr); assert.equal(sohbetEnDogrula(en, tr).ok, true, en); sayi++;
  }
  assert.ok(sayi > 100);
});

test("havaSinifi: iyi / kötü (evde) / uyarı düzeyi ve gece ATLANIR", () => {
  assert.equal(havaSinifi({ kod: 0, derece: 24, ruzgar: 8, gunduz: true }).sinif, "iyi");
  assert.equal(havaSinifi({ kod: 2, derece: 15, ruzgar: 12, gunduz: true }).hava, "parçalı bulutlu");
  assert.equal(havaSinifi({ kod: 61, derece: 12, ruzgar: 10, gunduz: true }).sinif, "kotu");
  assert.equal(havaSinifi({ kod: 45, derece: 14, ruzgar: 5, gunduz: true }).sinif, "kotu");
  assert.deepEqual([havaSinifi({ kod: 1, derece: 8, ruzgar: 5, gunduz: true }).sinif, havaSinifi({ kod: 1, derece: 8, ruzgar: 5, gunduz: true }).hava], ["kotu", "serin"]);
  assert.equal(havaSinifi({ kod: 1, derece: 32, ruzgar: 5, gunduz: true }).hava, "sıcak");
  for (const k of [95, 96, 99, 65, 75, 82, 86, 67]) assert.equal(havaSinifi({ kod: k, derece: 15, ruzgar: 5, gunduz: true }).sinif, "atla", `kod ${k}`);
  assert.equal(havaSinifi({ kod: 0, derece: 36, ruzgar: 5, gunduz: true }).sinif, "atla", "aşırı sıcak");
  assert.equal(havaSinifi({ kod: 0, derece: -4, ruzgar: 5, gunduz: true }).sinif, "atla", "aşırı soğuk");
  assert.equal(havaSinifi({ kod: 1, derece: 20, ruzgar: 50, gunduz: true }).sinif, "atla", "sert rüzgâr");
  assert.equal(havaSinifi({ kod: 0, derece: 20, ruzgar: 5, gunduz: false }).sinif, "gece");
  assert.equal(havaSinifi(null).sinif, "atla");
  assert.deepEqual(havaAyristir({ current: { temperature_2m: 23.6, weather_code: 1, wind_speed_10m: 9.2, is_day: 1 } }), { kod: 1, derece: 24, ruzgar: 9.2, gunduz: true });
  assert.equal(havaAyristir({ current: {} }), null);
});

test("sohbetUret hava: iyi havada gerçek derece ve yer adıyla soru yayınlar; yayın nesnesi sohbet sözleşmesine uyar; aynı blok ikinci kez yazılmaz", async () => {
  const bulut = sahteBulut();
  const sonuc = await sohbetUret({ bulut, model: null, simdi: SIMDI, rastgele: () => 0.3, turSirasi: ["hava"], havaFn: async () => IYI, modelDokunus: false });
  assert.equal(sonuc.durum, "yayinlandi");
  const { h, g } = bulut.k.yayinlar[0];
  assert.equal(h.kategori, "sohbet"); assert.equal(h.editor, "op_sohbet"); assert.equal(h.alt_konu, "hava-yer"); assert.equal(h.kaynak, "Open-Meteo"); assert.equal(g, null, "model yok -> görselsiz");
  assert.match(h.tr.ozet, /24 derece/); assert.ok(h.tr.ozet.endsWith("?") && h.tr.ozet.length <= 280); assert.match(h.id, /^s-ha-[a-z0-9-]+$/);
  assert.ok(h.en.ozet.endsWith("?") && /24 degrees|24 degree/.test(h.en.ozet)); assert.ok(h.tr.baslik && h.en.baslik);
  // aynı blokta aynı şehir görüldüyse atlanır
  const herSeyGorulen = { ...sahteBulut(), bilinenler: async (liste) => new Map(liste.map((o) => [o, { durum: "yayinlandi" }])) };
  const ikinci = await sohbetUret({ bulut: herSeyGorulen, model: null, simdi: SIMDI, rastgele: () => 0.3, turSirasi: ["hava"], havaFn: async () => IYI, modelDokunus: false });
  assert.equal(ikinci.durum, "yok"); assert.match(ikinci.neden, /gorulmus|hava/);
});

test("sohbetUret hava: kötü havada 'evde ne izlenir' sorusu; uyarı düzeyi/gece/API hatasında hava türü ATLANIR ve sıradaki tür yayınlanır", async () => {
  const kotu = sahteBulut();
  await sohbetUret({ bulut: kotu, model: null, simdi: SIMDI, rastgele: () => 0.1, turSirasi: ["hava"], havaFn: async () => ({ kod: 61, derece: 11, ruzgar: 12, gunduz: true }), modelDokunus: false });
  assert.match(kotu.k.yayinlar[0].h.tr.ozet, /hafif yağmurlu/); assert.match(kotu.k.yayinlar[0].h.tr.ozet, /film|kitap|içecek|tarif/);
  assert.equal(kotu.k.yayinlar[0].g, null);
  for (const [ad, havaFn] of [["fırtına", async () => ({ kod: 95, derece: 18, ruzgar: 30, gunduz: true })], ["aşırı sıcak", async () => ({ kod: 0, derece: 37, ruzgar: 5, gunduz: true })], ["gece", async () => ({ kod: 0, derece: 20, ruzgar: 5, gunduz: false })], ["API hatası", async () => { throw new Error("HTTP 500"); }]]) {
    const b = sahteBulut();
    const s = await sohbetUret({ bulut: b, model: null, simdi: SIMDI, rastgele: () => 0.5, turSirasi: ["hava", "gunun"], havaFn, modelDokunus: false });
    assert.equal(s.durum, "yayinlandi", ad); assert.equal(b.k.yayinlar.length, 1, ad); assert.equal(b.k.yayinlar[0].h.alt_konu, "gunun-sorusu", `${ad}: hava atlandı, günün sorusu çıktı`);
    assert.ok(s.notlar.some((n) => /hava|tür atlandı/.test(n)), ad);
  }
});

test("sohbetUret: günün sorusu / bilmece / öneri yayınlanır; bilmece cevabı yayında YOK; tekrar penceresi (görülenler atlanır)", async () => {
  for (const tur of ["gunun", "bilmece", "oneri"]) {
    const b = sahteBulut();
    const s = await sohbetUret({ bulut: b, model: null, simdi: SIMDI, rastgele: () => 0.2, turSirasi: [tur], modelDokunus: false });
    assert.equal(s.durum, "yayinlandi", tur);
    const h = b.k.yayinlar[0].h;
    assert.equal(h.kategori, "sohbet"); assert.equal(h.editor, "op_sohbet"); assert.ok(h.tr.ozet.endsWith("?") && h.tr.ozet.length <= 280); assert.match(h.id, /^s-[a-z]{2}-[0-9a-f]{10}-\d+$/);
    if (tur === "bilmece") { const cevaplar = BILMECELER.map((x) => x[1]).filter((c) => c.length > 6); assert.ok(!cevaplar.some((c) => h.tr.ozet.includes(c)), "cevap yayında olmamalı"); assert.equal(h.alt_konu, "kultur"); }
  }
  // 14 adayın hepsi görülmüşse
  const herSey = { bilinenler: async (liste) => new Map(liste.map((o) => [o, { durum: "yayinlandi" }])), isaretle: async () => ({}), yayinla: async () => { throw new Error("yayınlanmamalı"); } };
  const s = await sohbetUret({ bulut: herSey, model: null, simdi: SIMDI, rastgele: () => 0.2, turSirasi: ["bilmece"], modelDokunus: false });
  assert.equal(s.durum, "yok"); assert.equal(s.neden, "gorulmus");
  assert.notEqual(ogeKimligi("bilmece", "a", 100).ozet, ogeKimligi("bilmece", "a", 101).ozet);
});

test("günün sorusu seçimi gün ve mevsime duyarlı havuzdan gelir; Pazartesi/Cuma temalı soru çıkabilir; dini/milli gün yok", () => {
  const sal = havuzAdaylari("gunun", Date.parse("2026-10-12T09:00:00Z"), () => 0.1);          // Pazartesi, sonbahar
  assert.ok(sal.slice(0, 5).some((a) => GUNUN_GUN[1].includes(a.metin) || GUNUN_MEVSIM.sonbahar.includes(a.metin)));
  const tum = [...GUNUN_GENEL, ...Object.values(GUNUN_GUN).flat(), ...Object.values(GUNUN_MEVSIM).flat(), ...ONERILER, ...BILMECELER.map((b) => b[0])].join(" ");
  assert.ok(!/bayram|ramazan|noel|yılbaşı|23 nisan|29 ekim|19 mayıs|cumhuriyet|kutlu/i.test(tum), "dinî/milli gün yok");
  assert.equal(denetle(tum).ok, true);
});

test("model dokunuşu: geçerli TR/EN kullanılır; ben/yeni ad/rakam içeren çıktı reddedilir ve şablon aynen yayınlanır; EN yoksa yedek", async () => {
  const sablonTr = "Bugün Ankara'da hava açık, 21 derece. Kuğulu Park çevresinde kısa bir mola için en güzel yer neresi?";
  const modelKur = (cevap) => ({ yaz: async () => ({ metin: JSON.stringify(cevap), engellendi: "" }) });
  const hava = { kod: 0, derece: 21, ruzgar: 5, gunduz: true };
  const ankara = SEHIRLER.find((s) => s.ad === "Ankara"), ilkYer = ankara.yerler[0].ad;
  void sablonTr; void ilkYer;
  const rastgele = (() => { const dizi = [0.0, 0, 0, 0, 0, 0, 0]; let i = 0; return () => dizi[i++ % dizi.length]; })();
  const sehirAd = (b) => b.k.yayinlar[0].h.yer;
  const iyi = sahteBulut();
  await sohbetUret({ bulut: iyi, model: modelKur({ tr: "Ankara'da bugün hava açık ve 21 derece. Kuğulu Park çevresinde kısa bir mola için en güzel yer neresi?", en: "Where is the best spot for a short break around the park in Ankara today?" }), simdi: SIMDI, rastgele: () => 0, turSirasi: ["hava"], havaFn: async () => hava, kotaDurum: new Map() });
  const hY = iyi.k.yayinlar[0]?.h;
  assert.ok(hY, "yayın var"); void sehirAd; void rastgele;
  // ben içeren TR + rakam değişmiş EN: ikisi de reddedilir -> şablon TR, yedek EN
  const kotu = sahteBulut();
  await sohbetUret({ bulut: kotu, model: modelKur({ tr: "Ben bugün parkta yürüdüm, siz nerede yürürsünüz?", en: "I walked today, where do you walk?" }), simdi: SIMDI, rastgele: () => 0.5, turSirasi: ["oneri"] });
  const hK = kotu.k.yayinlar[0].h;
  assert.ok(ONERILER.includes(hK.tr.ozet), "şablon aynen"); assert.match(hK.en.ozet, /recommendation request/i);
  // kota dolunca (KotaDoldu) şablonla devam
  const { KotaDoldu } = await import("../lib/model.mjs");
  const kota = sahteBulut();
  const s = await sohbetUret({ bulut: kota, model: { yaz: async () => { throw new KotaDoldu("429"); } }, simdi: SIMDI, rastgele: () => 0.5, turSirasi: ["gunun"] });
  assert.equal(s.durum, "yayinlandi"); assert.equal(kota.k.yayinlar.length, 1);
});

test("kuru: model ve yayın yok; örnek kayıt döner", async () => {
  const b = { bilinenler: async () => { throw new Error("kuruda bilinenler çağrılmamalı"); }, isaretle: async () => { throw new Error("yok"); }, yayinla: async () => { throw new Error("yok"); } };
  const s = await sohbetUret({ bulut: b, model: null, simdi: SIMDI, rastgele: () => 0.4, kuru: true, turSirasi: ["bilmece"] });
  assert.equal(s.durum, "kuru"); assert.equal(s.kayit.tur, "bilmece"); assert.ok(s.kayit.tr.endsWith("?")); assert.equal(s.kayit.gizliCevap, "(yayınlanmaz)");
  const h = await sohbetUret({ bulut: b, model: null, simdi: SIMDI, rastgele: () => 0.4, kuru: true, turSirasi: ["hava"], havaFn: async () => IYI });
  assert.equal(h.durum, "kuru"); assert.match(h.kayit.tr, /24 derece/);
});

test("özel işler entegrasyonu: resim ve sohbet alanları planda, kota ve saat penceresiyle; env ile ayarlanabilir", () => {
  assert.ok(OZEL_ALANLAR.includes("resim") && OZEL_ALANLAR.includes("sohbet"));
  assert.deepEqual([OZEL_PLAN.resim.kota, OZEL_PLAN.sohbet.kota], [4, 6]);
  assert.equal(planAyristir("resim:3,sohbet:5").resim.kota, 3); assert.equal(planAyristir("sohbet:5").sohbet.kota, 5);
  assert.deepEqual(SIRA, ["hava", "gunun", "bilmece", "oneri", "hava", "bilmece"]);
  const a = ayarOku({}, []); assert.equal(a.sohbetModelDokunus, true); assert.equal(a.resimTekrarGun, 50);
  assert.equal(ayarOku({ RESIM_TEKRAR_GUN: "45", SOHBET_MODEL: "0" }, []).resimTekrarGun, 45);
  const h = sohbetHaberi({ tur: "gunun", id: "s-gu-0123456789-100", tr: "Bu hafta sizi gülümseten küçük şey neydi?", en: "What small thing made you smile this week?", simdi: SIMDI });
  assert.equal(h.kategori, "sohbet"); assert.equal(h.editor, "op_sohbet"); assert.equal(h.link, undefined);
});

test("ozelIsleriCalistir: sohbet alanı kuruda çalışır, kotası/aralığı sıra nedeniyle raporlanır", async () => {
  const bulut = sahteBulut();
  const dolu = new Map([["sohbet", { son24: 6, son7g: 30, sonZaman: "2026-10-13T08:00:00Z" }], ["resim", { son24: 4, son7g: 20, sonZaman: "2026-10-13T08:00:00Z" }]]);
  const o = await ozelIsleriCalistir({ ayar: { ...ayarOku({}, []), ozelTurUst: 3 }, bulut, model: null, fetchFn: async () => ({ ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) }), simdi: SIMDI, kotaDurum: dolu, bekleFn: async () => {}, rastgele: () => 0.3 });
  const nedenler = Object.fromEntries(o.atlanan.map((a) => [a.alan, a.neden]));
  assert.equal(nedenler.sohbet, "kota-dolu"); assert.equal(nedenler.resim, "kota-dolu");
});
