import assert from "node:assert/strict";
import test from "node:test";
import { calculateEstimate } from "../lib/calculator";
import type { EstimateInput } from "../lib/types";

const base: EstimateInput = {
  objectType: "Квартира",
  totalArea: null,
  ceilingHeight: null,
  bathroomArea: null,
  wallArea: null,
  bathroomWallArea: null,
  bathroomWallFinish: "none",
  ceilingArea: null,
  wallFinish: "none",
  roomFloorFinish: "none",
  bathroomFloorFinish: "none",
  ceilingFinish: "none",
  wishes: "",
};

test("считает только однозначно известные площади пола", () => {
  const result = calculateEstimate({
    ...base,
    totalArea: 45,
    bathroomArea: 5,
    roomFloorFinish: "quartz_vinyl",
    bathroomFloorFinish: "tile",
    wallFinish: "paint",
  });
  assert.equal(result.lines[0].area, 40);
  assert.equal(result.lines[0].cost, 34_000);
  assert.equal(result.lines[1].cost, 14_000);
  assert.equal(result.total, 48_000);
  assert.equal(result.missing[0].field, "wallArea");
});

test("не выводит площадь стен из площади квартиры и высоты", () => {
  const result = calculateEstimate({ ...base, totalArea: 45, ceilingHeight: 2.7, wallFinish: "paint" });
  assert.equal(result.lines.length, 0);
  assert.equal(result.total, 0);
  assert.match(result.missing[0].reason, /Площадь стен не указана/);
});

test("отклоняет невозможную разницу площадей", () => {
  const result = calculateEstimate({ ...base, totalArea: 45, bathroomArea: 46, roomFloorFinish: "laminate" });
  assert.equal(result.lines.length, 0);
  assert.match(result.missing[0].reason, /должна быть меньше/);
});

test("принимает площадь потолка равной площади пола", () => {
  const result = calculateEstimate({ ...base, totalArea: 32.5, ceilingFinish: "paint" });
  assert.equal(result.lines.length, 2);
  assert.equal(result.total, 22_750);
});

test("не предполагает работы в санузле только из-за указанной площади", () => {
  const result = calculateEstimate({
    ...base,
    totalArea: 80,
    bathroomArea: 12,
    roomFloorFinish: "laminate",
  });
  assert.equal(result.total, 57_800);
  assert.equal(result.missing.length, 0);
});

test("честно сообщает об услуге, которой нет в прайсе", () => {
  const result = calculateEstimate({ ...base, totalArea: 45, bathroomArea: 5, bathroomFloorFinish: "unsupported" });
  assert.equal(result.total, 0);
  assert.match(result.missing[0].reason, /не представлена в прайсе/);
});

test("для расплывчатого запроса просит конкретный перечень работ", () => {
  const result = calculateEstimate(base);
  assert.equal(result.total, 0);
  assert.deepEqual(result.missing.map((item) => item.field), ["scope"]);
  assert.match(result.missing[0].reason, /демонтаж, электрика, сантехника/);
});
