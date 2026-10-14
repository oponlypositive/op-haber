import { test } from "node:test";
import assert from "node:assert/strict";
import { botYanitDogrula } from "../lib/bot_yanit_kural.mjs";

test("bot yanıtı: gündelik 'sağlıklı/faydalı' sözcüğü geçer, sağlık İDDİASI atlanır (canlı 2026-10-14 @op_spor)", () => {
  const q = { dil: "tr", soran: "drerdalerkoc", bot: "op_spor" };
  assert.equal(botYanitDogrula("Hava güzelse tempolu bir yürüyüş ya da bisiklet turu keyifli ve sağlıklı bir tercih olabilir. Sen hangisini daha çok seversin?", q).ok, true);
  assert.equal(botYanitDogrula("Her gün yüzersen bağışıklığın güçlenir ve hastalıklardan korunursun.", q).ok, false);
});

test("bot yanıtı: 'seçim' sözcüğü siyaset süzgecine takılır; istem 'tercih' kullanmasını söyler", async () => {
  const { botSistem } = await import("../lib/bot_yanit.mjs");
  const ist = typeof botSistem === "function" ? botSistem({ bot: "op_spor", dil: "tr" }) : "";
  assert.match(String(ist), /tercih/);
});
