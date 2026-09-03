import assert from "node:assert/strict";
import test from "node:test";
import catalog from "../data/remkontora-prices.json";
import { PRICE_CATALOG, PRICES } from "../lib/prices";

test("внутренняя база содержит полный прайс РемКонторы", () => {
  assert.equal(catalog.items.length, 114);
  assert.equal(new Set(catalog.items.map((item) => item.category)).size, 18);
  assert.equal(new Set(catalog.items.map((item) => item.id)).size, 114);
  assert.ok(catalog.items.every((item) => item.price > 0 && item.name && item.unit));
  assert.equal(PRICE_CATALOG.length, catalog.items.length);
  assert.ok(Object.values(PRICES).every((item) => item.price > 0));
});
