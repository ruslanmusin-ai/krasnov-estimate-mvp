import assert from "node:assert/strict";
import test from "node:test";
import { createTelegramToken, readTelegramToken } from "../lib/telegram-token";
import type { EstimateInput } from "../lib/types";

process.env.TELEGRAM_LINK_SECRET = "test-secret-that-is-long-enough";

const input: EstimateInput = {
  objectType: "Квартира",
  totalArea: 45,
  ceilingHeight: 2.7,
  bathroomArea: 5,
  wallArea: null,
  bathroomWallArea: null,
  bathroomWallFinish: "none",
  ceilingArea: null,
  wallFinish: "paint",
  roomFloorFinish: "quartz_vinyl",
  bathroomFloorFinish: "tile",
  ceilingFinish: "none",
  wishes: "",
};

test("Telegram-токен помещается в deep link и восстанавливает расчёт", () => {
  const token = createTelegramToken(input);
  assert.ok(token.length <= 64);
  const decoded = readTelegramToken(token);
  assert.equal(decoded?.totalArea, 45);
  assert.equal(decoded?.roomFloorFinish, "quartz_vinyl");
  assert.equal(decoded?.wallFinish, "paint");
});

test("изменённый токен отклоняется", () => {
  const token = createTelegramToken(input);
  const replacement = token[0] === "1" ? "2" : "1";
  assert.equal(readTelegramToken(`${replacement}${token.slice(1)}`), null);
});
