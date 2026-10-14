// op_spor (spor dalları eğitici seri müfredatı) + op_psikoloji (üniversite giriş düzeyi psikoloji) müfredat verisi: şema, boyut, yasak taramalar, egzersiz-reçetesi yasağı, klinik yasak. Ağsız.
import { test } from "node:test";
import assert from "node:assert/strict";
import { UZMANLIK, mufredatDogrula, mufredatlariYukle, saglikKumesi, uzmanlikMetni } from "../lib/mufredat.mjs";
import { ALT_KONULAR } from "../lib/alt_konu.mjs";
import { BOT_ALANLARI, botAlani, soruTara } from "../lib/bot_yanit_kural.mjs";
import { botSistem } from "../lib/bot_yanit.mjs";
import { TARIH_YASAK } from "../lib/konu_yasak.mjs";
import { konuYasak } from "../lib/on_eleme.mjs";
import { denetle } from "../lib/moderasyon.mjs";

const { harita, hatalar } = await mufredatlariYukle();
const spor = harita.get("op_spor"), psi = harita.get("op_psikoloji");
const gruplar = (m) => { const g = new Map(); for (const d of m.dersler) { const k = d.yol.join(" > "); g.set(k, [...(g.get(k) || []), d]); } return g; };

test("op_spor: yüklenir, şema geçerli, >= 80 ders, ana seri 'Spor Dalları' altında >= 15 alt seri, her alt seride 4-8 ders", () => {
  assert.deepEqual(hatalar, []);
  assert.ok(spor, "op_spor yüklenmedi"); assert.deepEqual(mufredatDogrula(spor), []);
  assert.equal(spor.kategori, "spor"); assert.equal(spor.gunlukUst, 2);
  assert.ok(spor.dersler.length >= 80, `ders ${spor.dersler.length}`);
  const g = gruplar(spor);
  assert.ok(g.size >= 15, `alt seri ${g.size}`);
  for (const [yol, dersler] of g) { assert.ok(yol.startsWith("Spor Dalları > "), yol); assert.ok(dersler.length >= 4 && dersler.length <= 8, `${yol}: ${dersler.length} ders`); }
  for (const dal of ["Futbol", "Basketbol", "Voleybol", "Atletizm", "Yüzme", "Tenis", "Masa Tenisi", "Hentbol", "Bisiklet", "Jimnastik", "Güreş", "Okçuluk", "Satranç", "Fitness", "Kalistenik", "Pilates", "Yürüyüş ve Doğa Sporları"]) assert.ok(g.has(`Spor Dalları > ${dal}`), dal);
  assert.ok(spor.dersler.every((d) => d.tur === "bilgi" && (d.kaynak?.wiki_en || d.kaynak?.wiki_tr)), "her ders Vikipedi maddesine dayanır");
});
test("op_spor: her dersin alt_konu'su geçerli spor dalı (haber alt konu listesiyle aynı küme); güncel haber/maç dersi yok", () => {
  for (const d of spor.dersler) assert.ok(ALT_KONULAR.spor.includes(d.alt_konu), `${d.id}: ${d.alt_konu}`);
  const g = gruplar(spor);
  assert.equal(g.get("Spor Dalları > Futbol")[0].alt_konu, "futbol"); assert.equal(g.get("Spor Dalları > Fitness")[0].alt_konu, "fitness");
  for (const d of spor.dersler) assert.doesNotMatch(`${d.baslik_tr} ${d.baslik_en}`, /son dakika|transfer|derbi|şampiyon oldu|breaking/i, d.id);
});
test("op_spor: fitness / kalistenik / pilates derslerinde egzersiz reçetesi (set, tekrar, kilo, kas vaadi) YOK: başlıkta program sözcüğü yok, odakta olumsuz ('yok') kullanım var", () => {
  const g = gruplar(spor);
  for (const dal of ["Fitness", "Kalistenik", "Pilates"]) {
    const dersler = g.get(`Spor Dalları > ${dal}`);
    for (const d of dersler) {
      assert.doesNotMatch(`${d.baslik_tr} ${d.baslik_en}`, /program|set\b|tekrar|kilo|kas\b|reçete|workout plan|routine|reps/i, `${d.id}: başlık`);
      assert.match(d.odak_tr, /\byok\b/i, `${d.id}: odak reçete/vaat yasağını belirtmeli`);
      assert.doesNotMatch(d.odak_tr, /(\d+\s*(set|tekrar))|kilo ver|kas yap|zayıfla|yağ yak/i, `${d.id}: odak`);
    }
  }
});
test("op_spor yasak tarama: başlık/seri/odak din-siyaset-şiddet-sağlık iddiası temiz; güreşte şiddet öne çıkmaz", () => {
  const SAG = saglikKumesi(spor.kategori);
  for (const s of spor.seriler) {
    const seriMetin = `${s.yol.join(" ")} ${s.aciklama_tr} ${s.aciklama_en}`;
    assert.deepEqual(konuYasak(seriMetin), [], s.yol.join()); assert.doesNotMatch(seriMetin, SAG, s.yol.join());
    for (const d of s.dersler) {
      assert.equal(denetle(`${d.baslik_tr} ${d.baslik_en}`).ok, true, d.id);
      assert.doesNotMatch(`${d.baslik_tr} ${d.baslik_en}`, SAG, `${d.id}: başlık`);
      assert.doesNotMatch(`${d.baslik_tr} ${d.baslik_en} ${d.odak_tr}`, TARIH_YASAK, d.id);
      assert.doesNotMatch(`${d.baslik_tr} ${d.odak_tr.replace("Şiddeti öne çıkaran anlatım yok", "")}`, /dövüş|yumruk|boks|vuruş|kavga|şiddet|fight|punch|boxing/i, `${d.id}: şiddet`);
    }
  }
  const gures = gruplar(spor).get("Spor Dalları > Güreş");
  for (const d of gures) assert.match(d.odak_tr, /Şiddeti öne çıkaran anlatım yok/);
});
test("UZMANLIK: op_spor 'spor eğitmeni / spor tarihçisi', op_psikoloji 'psikoloji eğitmeni' tanımı var", () => {
  assert.match(UZMANLIK.op_spor, /spor eğitmeni/); assert.match(UZMANLIK.op_spor, /spor tarihçisi/);
  assert.match(uzmanlikMetni({ hesap: "op_psikoloji" }), /psikoloji eğitmeni/);
});

test("op_psikoloji: yüklenir, >= 60 ders, 12 aşama sırasıyla, kategori psikoloji, her ders Vikipedi kaynaklı", () => {
  assert.ok(psi, "op_psikoloji yüklenmedi"); assert.deepEqual(mufredatDogrula(psi), []);
  assert.equal(psi.kategori, "psikoloji"); assert.equal(psi.gunlukUst, 2);
  assert.ok(psi.dersler.length >= 60, `ders ${psi.dersler.length}`);
  const sira = ["Psikolojiye Giriş", "Algı ve Duyular", "Dikkat ve Bellek", "Öğrenme", "Düşünme, Dil ve Karar Verme", "Duygular", "Motivasyon", "Gelişim Psikolojisi", "Sosyal Psikoloji", "Kişilik", "Olumlu Psikoloji", "Ünlü Deneyler ve Kuramcılar"];
  assert.deepEqual([...gruplar(psi).keys()], sira.map((s) => `Psikoloji > ${s}`));
  assert.ok(psi.dersler.every((d) => d.tur === "bilgi" && (d.kaynak?.wiki_en || d.kaynak?.wiki_tr)));
  const bilisselYol = gruplar(psi).get("Psikoloji > Düşünme, Dil ve Karar Verme").map((d) => d.baslik_tr).join(" | ");
  assert.match(bilisselYol, /Bilişsel Yanlılıklar/);
});
test("op_psikoloji klinik yasak: başlık/seri/odakta tanı, bozukluk, belirti, terapi, ilaç, kriz yok (yalnız odaktaki 'anlatma' yasağı cümlesi hariç); olumlu psikoloji bölümü op_gelisim ile aynı Vikipedi maddesini kullanmaz", () => {
  const KLINIK = /depresyon|anksiyete|bozukluk|şizofreni|travma|intihar|kendine zarar|psikiyatri|terapi|ilaç|tedavi|tanı koy|belirti|panik|bipolar|otizm|dehb|obsesif|eating disorder|disorder|therapy|suicide|diagnos/iu;
  const YASAK_CUMLE = "Tanı, bozukluk, belirti, terapi ya da ilaç anlatma;";
  for (const s of psi.seriler) {
    assert.doesNotMatch(`${s.yol.join(" ")} ${s.aciklama_tr} ${s.aciklama_en}`, KLINIK, s.yol.join());
    for (const d of s.dersler) {
      assert.doesNotMatch(`${d.baslik_tr} ${d.baslik_en}`, KLINIK, d.id);
      assert.ok(d.odak_tr.includes(YASAK_CUMLE), `${d.id}: klinik yasak cümlesi`);
      assert.doesNotMatch(d.odak_tr.replace(YASAK_CUMLE, "").replace("terapi tekniği anlatma", ""), KLINIK, `${d.id}: odak`);
      assert.equal(denetle(`${d.baslik_tr} ${d.baslik_en}`).ok, true, d.id);
      assert.doesNotMatch(`${d.baslik_tr} ${d.baslik_en} ${d.odak_tr}`, TARIH_YASAK, d.id);
    }
  }
  const gel = harita.get("op_gelisim");
  const gelMadde = new Set(gel.dersler.flatMap((d) => [d.kaynak?.wiki_en, d.kaynak?.wiki_tr].filter(Boolean)));
  for (const d of gruplar(psi).get("Psikoloji > Olumlu Psikoloji")) for (const k of [d.kaynak?.wiki_en, d.kaynak?.wiki_tr].filter(Boolean)) assert.equal(gelMadde.has(k), false, `${d.id}: op_gelisim ile aynı madde ${k}`);
});
test("op_psikoloji bot alanı: tabloda var, istem klinik/tanı/terapi konusunda yanıt yazmamayı söyler; kriz ve klinik sorular mevcut 'hassas/konu-saglik' atla kuralına takılır", () => {
  const a = botAlani("op_psikoloji");
  assert.equal(a.adTr, "OP Psikoloji"); assert.ok(BOT_ALANLARI.op_psikoloji);
  assert.match(a.not, /Tanı/); assert.match(a.not, /uzmana danışmanın önemli/);
  assert.match(botSistem({ bot: "op_psikoloji", dil: "tr" }), /psikoloji kavramını/);
  assert.equal(soruTara("@op_psikoloji kendime zarar vermek istiyorum", { bot: "op_psikoloji" }).neden, "hassas");
  assert.equal(soruTara("@op_psikoloji bende depresyon var mı, nasıl anlarım", { bot: "op_psikoloji" }).ok, false);
  assert.equal(soruTara("@op_psikoloji hangi ilaç iyi gelir", { bot: "op_psikoloji" }).ok, false);
  assert.equal(soruTara("@op_psikoloji bellek nasıl çalışır", { bot: "op_psikoloji" }).ok, true);
});
