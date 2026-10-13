import { test } from "node:test";
import assert from "node:assert/strict";

test("gnewsOneAl: doğrulanmış yerli Google News adayları saklı yüklülerin ardına, sıranın başına alınır", async () => {
  const { gnewsOneAl } = await import("../hat.mjs");
  const y = { id: "y", kayit: { yuk: { id: 1 }, durum: "bekliyor_gorsel" } };
  const a = { id: "a", dil: "en", baslik: "x" }, b = { id: "b", dil: "en", baslik: "y" };
  const g1 = { id: "g1", gnews: true, dil: "tr" }, g2 = { id: "g2", gnews: true, dil: "tr" }, g3 = { id: "g3", gnews: true, dil: "tr" }, gy = { id: "gy", gnews: true, dil: "en", baslik: "abroad" };
  const liste = [y, a, b, gy, g1, g2, g3];
  assert.deepEqual(gnewsOneAl(liste, 2).map((x) => x.id), ["y", "g1", "g2", "a", "b", "gy", "g3"]);
  assert.deepEqual(gnewsOneAl(liste, 3, (x) => x.id !== "g1").map((x) => x.id), ["y", "g2", "g3", "a", "b", "gy", "g1"]);
  assert.equal(gnewsOneAl(liste, 0), liste);
});
