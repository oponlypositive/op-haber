import { test } from "node:test";
import assert from "node:assert/strict";
import { turkceDenetle } from "../lib/turkce_denetim.mjs";

test("ascii-cumle: Türkçe harfleri düşmüş uzun cümle yakalanır, doğru Türkçe ve kısa cümle geçer", () => {
  assert.ok(turkceDenetle("Izmir kofte, patates ve domates sosuyla firinda bisen yumusak etli geleneksel bir yemektir.").some((x) => x.startsWith("ascii-cumle")));
  assert.deepEqual(turkceDenetle("İzmir köfte, patates ve domates sosuyla fırında pişen yumuşak etli geleneksel bir yemektir.").filter((x) => x.startsWith("ascii-cumle")), []);
  assert.deepEqual(turkceDenetle("Seksek tek ayakla oynanan bir oyundur.").filter((x) => x.startsWith("ascii-cumle")), []);
  assert.deepEqual(turkceDenetle("Kaynak: Vikipedi. NASA Artemis III adli gorev 2027 yilinda planlanan bir ay inisi.").filter((x) => x.startsWith("ascii-cumle")).length, 1);
});
