// GÖRSEL UYGUNLUK ALTIN SETİ (2026-10-17): sahibin canlıda yakaladığı hatalı haber-fotoğraf eşleşmeleri KALICI regresyon testi + karşı örnekler (doğru eşleşmeler geçmeli).
// Örnekler test/altin/gorsel_ornekler.json; her biri lib/gorsel_kapi.mjs gorselKapi ile sınanır. Yeni canlı hata bulununca önce buraya örnek ekle (kırmızı), sonra kuralı yaz.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gorselKapi, kurumAdayiOk, kurumOdakliMi, somutTerimler, SOYUT_KELIME, kisiAdiBenzerleri, dosyaCifti, tarihler, yedekYerYasakMi } from "../lib/gorsel_kapi.mjs";
import { anahtarKelimeler, sorgular, gorselBul, vlDegerlendir, vlSorusu, vlOzneSorusu, vlPlanSorusu, VL_BEKLENEN, VL_OZNE_BEKLENEN } from "../lib/gorsel.mjs";
import { adaylariAyikla } from "../lib/gorsel_aday.mjs";

const burasi = join(dirname(fileURLToPath(import.meta.url)), "altin");
const { haberler, ornekler } = JSON.parse(readFileSync(join(burasi, "gorsel_ornekler.json"), "utf8"));

test("görsel altın seti: yapı (kimlik benzersiz, her grupta ret ve karşı örnek; her canlı örnek mevcut)", () => {
  const idler = new Set();
  for (const o of ornekler) { assert.ok(o.id && o.grup && haberler[o.haber] && o.aday && o.ctx && o.beklenen?.karar, `eksik alan: ${o.id}`); assert.ok(!idler.has(o.id), `yinelenen: ${o.id}`); idler.add(o.id); }
  assert.ok(ornekler.filter((o) => o.beklenen.karar === "ret").length >= 30);
  assert.ok(ornekler.filter((o) => o.beklenen.karar === "gec").length >= 9);
  for (const g of ["kisi", "spor", "olumsuz", "stok", "bina"]) assert.ok(ornekler.some((o) => o.grup === g && o.beklenen.karar === "ret"), `grup ${g}: ret yok`);
  assert.ok(ornekler.some((o) => /Hansi_Flick/.test(o.aday.baslik)) && ornekler.some((o) => /Katie_Ledecky/.test(o.aday.baslik)) && ornekler.some((o) => /Perseverance_selfie/.test(o.aday.baslik)), "doğru örnekler (karşı) eksik");
});

for (const o of ornekler) {
  test(`görsel altın [${o.grup}] ${o.id}: ${o.beklenen.karar}${o.beklenen.kod ? " " + o.beklenen.kod : ""}`, () => {
    const metin = `${o.aday.baslik} ${o.aday.aciklama || ""}`.trim();
    const aday = { baslik: o.aday.baslik, metin, ustMetin: metin, lisans: "CC BY-SA 4.0", w: 1280, h: 853 };
    const k = gorselKapi(aday, haberler[o.haber], o.ctx);
    if (o.beklenen.karar === "gec") return assert.equal(k, "", `${o.aciklama || o.id} -> beklenmeyen ret: ${k}`);
    assert.notEqual(k, "", `${o.aciklama || o.id} -> geçti ama RET beklenirdi`);
    if (o.beklenen.kod) assert.ok(k.includes(o.beklenen.kod), `ret kodu "${k}" ${o.beklenen.kod} içermiyor`);
  });
}

// ---------------------------------------------------------------- yardımcılar
test("kisiAdiBenzerleri: iki Baş Harfli sözcük kişi adı sayılır; yer/kurum/ortak adlar sayılmaz", () => {
  assert.deepEqual(kisiAdiBenzerleri("Demis_Hassabis.jpg"), ["demis hassabis"]);
  assert.deepEqual(kisiAdiBenzerleri("Davy_Sundance_GQ_2018.jpg"), ["davy sundance"]);
  assert.deepEqual(kisiAdiBenzerleri("Gareth_Bale_-_CdR_-_RM_v_ATL.jpg"), ["gareth bale"]);
  assert.deepEqual(kisiAdiBenzerleri("Cardiff_University_main_building.jpg"), []);
  assert.deepEqual(kisiAdiBenzerleri("Trabzon,harbour.jpg"), []);
  assert.deepEqual(kisiAdiBenzerleri("Rotten_apple_under_the_tree.jpg"), []);
});
test("dosyaCifti: vs / v / skor / tire ile iki taraf; tek takım adı çift sayılmaz", () => {
  assert.deepEqual(dosyaCifti("Gareth_Bale_-_CdR_-_RM_v_ATL.jpg"), ["Gareth Bale - CdR - RM", "ATL"]);
  assert.deepEqual(dosyaCifti("TSG_Hoffenheim_6-0_Köln_2018.jpg"), ["TSG Hoffenheim", "Köln 2018"]);
  assert.deepEqual(dosyaCifti("Samsunspor-Çaykur_Rizespor.jpg"), ["Samsunspor", "Çaykur Rizespor"]);
  assert.equal(dosyaCifti("Jean-Pierre_Papin.jpg"), null);
  assert.equal(dosyaCifti("Medical_Park_Stadium.jpg"), null);
});
test("tarihler: dosya adındaki tam tarih biçimleri", () => {
  assert.deepEqual(tarihler("Match_2025-10-14.jpg"), [Date.UTC(2025, 9, 14)]);
  assert.deepEqual(tarihler("IMG 20251014 final"), [Date.UTC(2025, 9, 14)]);
  assert.deepEqual(tarihler("Final on 14 October 2025"), [Date.UTC(2025, 9, 14)]);
  assert.deepEqual(tarihler("Photo 8466765"), []);
});
test("spor: başka tarihli maç fotoğrafı ret; haberin tarihine yakın maç kabul; portre (maç ibaresi yok) yıla takılmaz", () => {
  const h = { ...haberler.trabzon, zaman: "2026-10-16T20:00:00Z" };
  const mac = (baslik) => gorselKapi({ baslik, metin: baslik, ustMetin: baslik }, h, { yol: "ozne", ozne: { ad: "Trabzonspor", tur: "kurum" } });
  assert.match(mac("Trabzonspor_vs_KuPS_2018.jpg"), /spor-eski-tarih/);
  assert.match(mac("Trabzonspor_vs_KuPS_2026-03-01.jpg"), /spor-baska-tarih/);
  assert.equal(mac("Trabzonspor_vs_KuPS_2026-10-16.jpg"), "");
  assert.equal(mac("Trabzonspor_fans_2024.jpg"), "", "maç ibaresi olmayan fotoğraf yıldan etkilenmez");
});
test("kurum odaklılık: açılış/ödül/bina olayı + kurum adı başlığın başında; 'araştırmacıları' değil", () => {
  assert.equal(kurumOdakliMi({ en: { baslik: "Cardiff University opens new campus building" } }), true);
  assert.equal(kurumOdakliMi({ en: { baslik: "Cardiff University researchers find a new coral" } }), false);
  assert.equal(kurumOdakliMi({ en: { baslik: "Stanford University wins award for teaching" } }, "Stanford University"), true);
  assert.equal(kurumOdakliMi({ en: { baslik: "Scientists at Stanford University win award" } }, "Stanford University"), false, "araştırmayı yapan kurum özne değil");
  assert.equal(kurumOdakliMi({ en: { baslik: "A new coral nursery thrives" } }), false);
  assert.equal(kurumAdayiOk({ tur: "kurum", ad_en: "Princeton University" }, { en: { baslik: "Princeton University team finds plasma trick" } }), false);
  assert.equal(kurumAdayiOk({ tur: "kurum", ad_en: "Galatasaray" }, { kategori: "spor", en: { baslik: "Galatasaray win" } }), true, "spor takımı serbest");
  assert.equal(kurumAdayiOk({ tur: "kurum", ad_en: "Bursaspor" }, { en: { baslik: "x" } }), true, "…spor ile biten takım adı");
  assert.equal(kurumAdayiOk({ tur: "kisi", ad_en: "Es Devlin" }, { en: { baslik: "x" } }), true);
});
test("adaylariAyikla: haber verilirse kurum adayı yalnız kurum odaklı haberde kalır; haber verilmezse eski davranış", () => {
  const havuz = "Princeton Plasma Physics Laboratory researchers tame plasma. The Laboratory opened a building.";
  const ham = [{ tur: "kurum", ad_en: "Princeton Plasma Physics Laboratory" }, { tur: "nesne", ad_en: "plasma" }];
  assert.deepEqual(adaylariAyikla(ham, havuz).map((x) => x.tur), ["kurum", "nesne"]);
  assert.deepEqual(adaylariAyikla(ham, havuz, { haber: { en: { baslik: "Princeton Plasma Physics Laboratory researchers tame plasma" }, kategori: "bilim" } }).map((x) => x.tur), ["nesne"]);
  assert.deepEqual(adaylariAyikla(ham, havuz, { haber: { en: { baslik: "Princeton Plasma Physics Laboratory opens a new plasma building" }, kategori: "bilim" } }).map((x) => x.tur), ["kurum", "nesne"]);
});

// ---------------------------------------------------------------- soyut sorgu yasağı (Pixabay "victory/tournament/match")
test("soyut sözcükler (victory, tournament, match, success...) arama sorgusu ve anahtar olmaz; somut dal adları kalır", () => {
  for (const w of ["victory", "tournament", "success", "match", "champion", "achievement", "team", "celebration"]) assert.ok(SOYUT_KELIME.has(w), w);
  assert.deepEqual(anahtarKelimeler("Wrestling victory tournament match success"), ["wrestling"]);
  assert.deepEqual(sorgular("Wrestlers celebrate victory in tournament match", ""), ["wrestlers"]);
  assert.deepEqual(somutTerimler(["victory", "wrestling", "match"]), ["wrestling"]);
  assert.deepEqual(anahtarKelimeler("Victory tournament success"), []);
});
const jpeg = () => { const u = new Uint8Array(2500); u.set([0xff, 0xd8, 0xff, 0xc0, 0, 0x11, 8, 4, 0, 6, 0, 3], 0); return u; };
const fImg = async () => ({ ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => jpeg().buffer });
const vlHepsiTamam = () => ({ sorular: [], yaz: async function (s, g) { this.sorular.push(g); return { metin: JSON.stringify({ ...VL_BEKLENEN, kesin_uygun: true, kisa_gerekce: "ok" }) }; } });
const stokAday = (tags, url = "https://u/" + tags.replace(/\W+/g, "-")) => ({ url, w: 1280, h: 853, metin: tags, yaratici: "Pixabay user", lisans: "Pixabay Content License", lisans_url: "x", kaynak_url: "https://pixabay.com/x", saglayici: "pixabay" });
test("stok: başlıktan türeyen sorgu YOK (astronomi olimpiyatı 'victory/tournament' haberi stok aramaz); model somut terim verirse aranır", async () => {
  const soylu = { kategori: "bilim", en: { baslik: "Students win astronomy olympiad tournament victory", ozet: "A victory in the match of minds." }, tr: { baslik: "Öğrenciler astronomi olimpiyatını kazandı", ozet: "x" }, yer: "Dünya" };
  const cagrilar = [];
  const araFn = async (q, tur) => { cagrilar.push([tur, q]); return tur === "yedek" ? [stokAday("tournament victory match target archery")] : []; };
  const r = await gorselBul(soylu, { model: vlHepsiTamam(), araFn, fetchFn: fImg, bekleFn: async () => {}, pixabayAnahtar: "k", vlUst: 3 });
  assert.equal(r.sonuc, null);
  assert.ok(!cagrilar.some(([t]) => t === "yedek"), `stok aranmamalıydı: ${JSON.stringify(cagrilar)}`);
  assert.ok(r.notlar.some((n) => /somut sorgu yok/.test(n)));
  // model somut bir terim verirse stok aranır ve etiketleri uyuşan görsel kullanılır
  const somut = { ...soylu, gorselAra: "telescope" };
  const m = vlHepsiTamam();
  const araFn2 = async (q, tur) => (tur === "yedek" ? [stokAday("telescope night sky stars"), stokAday("tournament victory match target")] : []);
  const r2 = await gorselBul(somut, { model: m, araFn: araFn2, fetchFn: fImg, bekleFn: async () => {}, pixabayAnahtar: "k", vlUst: 3 });
  assert.ok(r2.sonuc, r2.notlar.join("|")); assert.equal(r2.sonuc.adayTur, "stok");
});
test("stok spor: güreş haberi için dalın adı (wrestling) aranır; okçuluk hedefi etiketli görsel RET, güreş etiketli kabul", async () => {
  const gh = { ...haberler.gures, en: { baslik: "Turkish wrestlers win team tournament victory", ozet: "A victory in the match." } };
  const sorgu = [];
  const araFn = async (q, tur) => { if (tur !== "yedek") return []; sorgu.push(q); return [stokAday("tournament victory match target archery bow"), stokAday("wrestling sport mat wrestlers")]; };
  const m = vlHepsiTamam();
  const r = await gorselBul(gh, { model: m, araFn, fetchFn: fImg, bekleFn: async () => {}, pixabayAnahtar: "k", vlUst: 3 });
  assert.ok(sorgu.includes("wrestling"), JSON.stringify(sorgu));
  assert.ok(r.sonuc, r.notlar.join("|")); assert.equal(m.sorular.length, 1, "okçuluk görseli model denetimine bile gitmedi");
  assert.ok(r.retKodlari["k.stok-brans-yok"] >= 1 || r.retKodlari["k.stok-brans"] >= 1, JSON.stringify(r.retKodlari));
});

// ---------------------------------------------------------------- yedek yer özne ve kişi haberi
test("spor KİŞİ haberi: haberdeki şehir adı yedek özne olarak aranmaz (Trabzon limanı olayı); bilim/sağlık haberinde de yer yedeği yok", async () => {
  assert.equal(yedekYerYasakMi(haberler.boksor), true);
  assert.equal(yedekYerYasakMi(haberler.bilim), true);
  assert.equal(yedekYerYasakMi(haberler.trabzon), false);
  const cagrilar = [];
  const araFn = async (q, tur) => { cagrilar.push([tur, q]); return []; };
  const h = { ...haberler.boksor, yer: "Trabzon, Türkiye", yerKurum: "Trabzon" };
  await gorselBul(h, { model: vlHepsiTamam(), araFn, fetchFn: fImg, bekleFn: async () => {}, plan: false, vlUst: 3 });
  assert.ok(!cagrilar.some(([, q]) => /Trabzon/.test(q)), `Trabzon aranmamalıydı: ${JSON.stringify(cagrilar)}`);
});

// ---------------------------------------------------------------- VL sorusu ve değerlendirme
test("VL: yüz alanları — kişi öznesinde baskın yüz için 'haberdeki kişi mi' sorulur; kişi dışında baskın yüz RET; belirsiz RET", () => {
  const kisi = { ad: "Katie Ledecky", tur: "kisi" }, nesne = { ad: "Perseverance", tur: "nesne" };
  const aday = { baslik: "x.jpg" };
  const sKisi = vlOzneSorusu(kisi, aday, "Katie Ledecky wins", "Gold."), sNesne = vlOzneSorusu(nesne, aday, "Rover finds rocks", "x");
  assert.match(sKisi, /taninabilir_yuz_baskin/); assert.match(sKisi, /yuz_haberdeki_kisi/); assert.match(sKisi, /Katie Ledecky/);
  assert.match(sNesne, /taninabilir_yuz_baskin/); assert.doesNotMatch(sNesne, /yuz_haberdeki_kisi/);
  assert.match(vlPlanSorusu(kisi, aday, "a", "b", "swimmer"), /yuz_haberdeki_kisi/);
  assert.match(vlSorusu("a", "b", false, "", {}), /selfie/);
  const tamam = { ...VL_OZNE_BEKLENEN, kisa_gerekce: "ok" };
  const d = (ek, secenek) => vlDegerlendir(JSON.stringify({ ...tamam, ...ek }), { ozne: true, ...secenek });
  assert.equal(d({ taninabilir_yuz_baskin: true, yuz_haberdeki_kisi: true }, { kisi: true }).ok, true);
  assert.equal(d({ taninabilir_yuz_baskin: true, yuz_haberdeki_kisi: false }, { kisi: true }).ok, false);
  assert.equal(d({ taninabilir_yuz_baskin: true }, { kisi: true }).ok, false, "belirsiz = ret");
  assert.equal(d({}, { kisi: true }).ok, false, "alan yok = ret");
  assert.equal(d({ taninabilir_yuz_baskin: true }, {}).kod, "yuz", "kişi dışı özne + baskın yüz = ret");
  assert.equal(d({ taninabilir_yuz_baskin: false }, { kisi: true }).ok, true);
});
test("VL: kurum binası, kesinlik (görsel zorunlu olmayanda emin değilse görselsiz) ve duruş/egzersiz alanları", () => {
  const ek = { bina: true, siki: true, poz: "Tree pose" };
  const s = vlSorusu("Researchers develop battery", "x", false, "", ek);
  assert.match(s, /kurum_binasi_baskin/); assert.match(s, /kesin_uygun/); assert.match(s, /poz_gosteriyor/); assert.match(s, /Tree pose/);
  assert.doesNotMatch(vlSorusu("a", "b", false, "", {}), /kurum_binasi_baskin|kesin_uygun|poz_gosteriyor/);
  const tamam = { ...VL_BEKLENEN, kisa_gerekce: "ok" };
  const d = (x, o) => vlDegerlendir(JSON.stringify({ ...tamam, ...x }), o);
  assert.equal(d({}, { bina: true }).ok, true);
  assert.equal(d({ kurum_binasi_baskin: true }, { bina: true }).kod, "kurum-binasi");
  assert.equal(d({ kurum_binasi_baskin: true }, {}).ok, true, "bina sorusu yalnız bilim/sağlık/teknoloji haberinde etkin");
  assert.equal(d({ kesin_uygun: false }, { siki: true }).kod, "emin-degil");
  assert.equal(d({ kesin_uygun: true }, { siki: true }).ok, true);
  assert.equal(d({ poz_gosteriyor: false }, { poz: true }).kod, "poz");
  assert.equal(d({}, { poz: true }).kod, "poz", "poz alanı yoksa ret (duruş görseli doğrulanmadan yayınlanmaz)");
  assert.equal(d({ poz_gosteriyor: true }, { poz: true }).ok, true);
});

// ---------------------------------------------------------------- gorselBul tümleşik: plan yolunda kapı ve VL alanları
const cand = (baslik, ek = {}) => ({ baslik, metin: `${baslik} ${ek.aciklama || ""}`, ustMetin: `${baslik} ${ek.aciklama || ""}`, url: "https://u/" + baslik.replace(/\W+/g, "-"), w: 1280, h: 853, yaratici: "Foto Sahibi", lisans: "CC BY-SA 4.0", lisans_url: "x", kaynak_url: "https://commons.wikimedia.org/wiki/File:" + baslik, saglayici: "wikimedia", p18: true, ...ek });
const varlik = (etiket, gorselAdi, aciklama = "") => async () => ({ durum: "ok", varlik: { etiket, aciklama, gorselAdi, logoAdi: "", spor: false } });
test("plan yolu: bilim haberinde kurum/kampüs binası (P18) görsel denetimine bile gitmez; laboratuvar ekipmanı gider ve VL'ye bina + kesinlik soruları eklenir", async () => {
  const bilim = { ...haberler.bilim, gorselAdaylari: [{ tur: "mekan", ad_en: "Angell Hall" }, { tur: "nesne", ad_en: "scanning electron microscope" }] };
  const m = { sorular: [], yaz: async function (s, g) { this.sorular.push(g); return { metin: JSON.stringify({ ...VL_OZNE_BEKLENEN, taninabilir_yuz_baskin: false, kisa_gerekce: "ok" }) }; } };
  const wdFn = async (aday) => (aday.ad_en === "Angell Hall" ? varlik("Angell Hall", "AngellHall.jpg", "building in Ann Arbor")() : varlik("scanning electron microscope", "SEM.jpg", "microscope")());
  const dosyaFn = async (adlar) => adlar.map((a) => cand(a));
  const r = await gorselBul(bilim, { model: m, wdFn, dosyaFn, araFn: async () => [], fetchFn: fImg, bekleFn: async () => {}, vlUst: 3 });
  assert.ok(r.sonuc, r.notlar.join("|")); assert.equal(r.sonuc.adayTur, "nesne");
  assert.equal(r.retKodlari["k.kurum-binasi"], 1);
  assert.equal(m.sorular.length, 1); assert.match(m.sorular[0], /kurum_binasi_baskin/); assert.match(m.sorular[0], /taninabilir_yuz_baskin/);
  // VL "bina" derse ret; "emin değil" (özne yolunda siki yok) değil
  const m2 = { sorular: [], yaz: async function (s, g) { this.sorular.push(g); return { metin: JSON.stringify({ ...VL_OZNE_BEKLENEN, taninabilir_yuz_baskin: false, kurum_binasi_baskin: true, kisa_gerekce: "campus" }) }; } };
  const r2 = await gorselBul({ ...bilim, gorselAdaylari: [{ tur: "nesne", ad_en: "scanning electron microscope" }] }, { model: m2, wdFn, dosyaFn, araFn: async () => [], fetchFn: fImg, bekleFn: async () => {}, vlUst: 2 });
  assert.equal(r2.sonuc, null); assert.equal(r2.retKodlari["p.vl-kurum-binasi"], 1);
});
test("plan yolu: kişi öznesinde baskın yüz 'haberdeki kişi' demedikçe ret; kişi yüzü doğrulanırsa kabul; kurum adayı kurum odaklı değilse hiç sorulmaz", async () => {
  const wdCagri = [];
  const wdFn = async (aday) => { wdCagri.push(aday.tur); return varlik("Katie Ledecky", "Katie_Ledecky.jpg", "American swimmer")(); };
  const dosyaFn = async (adlar) => adlar.map((a) => cand(a, { aciklama: "Katie Ledecky" }));
  const model = (cevap) => ({ sorular: [], yaz: async function (s, g) { this.sorular.push(g); return { metin: JSON.stringify({ ...VL_OZNE_BEKLENEN, kisa_gerekce: "ok", ...cevap }) }; } });
  const h = { ...haberler.ledecky, gorselAdaylari: [{ tur: "kisi", ad_en: "Katie Ledecky" }, { tur: "kurum", ad_en: "Stanford University" }] };
  const belirsiz = model({ taninabilir_yuz_baskin: true });
  const r1 = await gorselBul(h, { model: belirsiz, wdFn, dosyaFn, araFn: async () => [], fetchFn: fImg, bekleFn: async () => {}, vlUst: 3 });
  assert.equal(r1.sonuc, null); assert.equal(r1.retKodlari["p.vl-yuz-kisi"], 1); assert.match(belirsiz.sorular[0], /yuz_haberdeki_kisi/);
  assert.deepEqual(wdCagri, ["kisi"], "kurum adayı (Stanford) kurum odaklı değil: Wikidata'da aranmadı");
  const dogru = model({ taninabilir_yuz_baskin: true, yuz_haberdeki_kisi: true });
  const r2 = await gorselBul(h, { model: dogru, wdFn, dosyaFn, araFn: async () => [], fetchFn: fImg, bekleFn: async () => {}, vlUst: 3 });
  assert.ok(r2.sonuc?.ozne); assert.equal(r2.sonuc.adayTur, "kisi");
  const yuzsuz = model({ taninabilir_yuz_baskin: false });
  assert.ok((await gorselBul(h, { model: yuzsuz, wdFn, dosyaFn, araFn: async () => [], fetchFn: fImg, bekleFn: async () => {}, vlUst: 3 })).sonuc);
});
test("plan yolu: duruş/egzersiz dersi — VL 'poz_gosteriyor' sorulur ve true olmadıkça görsel kabul edilmez", async () => {
  const ders = { en: { baslik: "Tree Pose", ozet: "A balance pose." }, tr: { baslik: "Ağaç Duruşu", ozet: "Denge duruşu." }, yer: "Dünya", gorselPoz: "Tree Pose", gorselZorunluDers: true, gorselAdaylari: [{ tur: "nesne", ad_en: "Tree Pose" }] };
  const wdFn = varlik("Tree Pose", "Vrikshasana.jpg", "yoga posture");
  const dosyaFn = async (adlar) => adlar.map((a) => cand(a, { aciklama: "Tree Pose yoga" }));
  const model = (poz) => ({ sorular: [], yaz: async function (s, g) { this.sorular.push(g); return { metin: JSON.stringify({ ...VL_OZNE_BEKLENEN, taninabilir_yuz_baskin: false, poz_gosteriyor: poz, kisa_gerekce: "ok" }) }; } });
  const yanlis = model(false);
  const r1 = await gorselBul(ders, { model: yanlis, wdFn, dosyaFn, araFn: async () => [], fetchFn: fImg, bekleFn: async () => {}, vlUst: 2 });
  assert.equal(r1.sonuc, null); assert.equal(r1.retKodlari["p.vl-poz"], 1); assert.match(yanlis.sorular[0], /poz_gosteriyor[\s\S]*Tree Pose/);
  const dogru = model(true);
  const r2 = await gorselBul(ders, { model: dogru, wdFn, dosyaFn, araFn: async () => [], fetchFn: fImg, bekleFn: async () => {}, vlUst: 2 });
  assert.ok(r2.sonuc);
});
test("nötr yol: görsel zorunlu OLMAYAN kategoride model 'kesin_uygun: false' derse görselsiz kalınır; görsel zorunlu kategoride bu soru sorulmaz", async () => {
  const nesne = { kategori: "bilim", en: { baslik: "Researchers develop a new battery material", ozet: "A lithium battery with a new anode." }, tr: { baslik: "Yeni pil", ozet: "x" }, yer: "Dünya", gorselAra: "lithium battery" };
  const araFn = async (q, tur) => (tur === "gercek" ? [{ ...stokAday("lithium battery cell laboratory", "https://u/battery"), saglayici: "wikimedia", baslik: "Lithium battery.jpg", yaratici: "x" }] : []);
  const emin = (kesin) => ({ sorular: [], yaz: async function (s, g) { this.sorular.push(g); return { metin: JSON.stringify({ ...VL_BEKLENEN, kesin_uygun: kesin, kisa_gerekce: "ok" }) }; } });
  const m1 = emin(false);
  const r1 = await gorselBul(nesne, { model: m1, araFn, fetchFn: fImg, bekleFn: async () => {}, vlUst: 3 });
  assert.equal(r1.sonuc, null); assert.equal(r1.retKodlari["n.emin-degil"], 1); assert.match(m1.sorular[0], /kesin_uygun/);
  const r2 = await gorselBul(nesne, { model: emin(true), araFn, fetchFn: fImg, bekleFn: async () => {}, vlUst: 3 });
  assert.ok(r2.sonuc);
  const zorunlu = { ...nesne, kategori: "doga" };
  const m3 = emin(false);
  const r3 = await gorselBul(zorunlu, { model: m3, araFn, fetchFn: fImg, bekleFn: async () => {}, vlUst: 3 });
  assert.ok(r3.sonuc, "görsel zorunlu kategoride sıkılık yok (bekletme kuralı aynen)"); assert.doesNotMatch(m3.sorular[0], /kesin_uygun/);
});
