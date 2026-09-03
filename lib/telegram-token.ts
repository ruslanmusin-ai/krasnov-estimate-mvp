import { createHmac, timingSafeEqual } from "node:crypto";
import type { BathroomWallFinish, EstimateInput, FloorFinish, WallFinish, CeilingFinish } from "./types";

const floorCodes: Record<FloorFinish, string> = { none: "0", laminate: "l", quartz_vinyl: "q", tile: "t", unsupported: "u" };
const wallCodes: Record<WallFinish, string> = { none: "0", paint: "p", wallpaper: "w", tile: "t" };
const ceilingCodes: Record<CeilingFinish, string> = { none: "0", paint: "p" };
const bathroomWallCodes: Record<BathroomWallFinish, string> = { none: "0", tile: "t" };
const reverse = <T extends string>(map: Record<T, string>, value: string, fallback: T): T =>
  (Object.entries(map).find(([, code]) => code === value)?.[0] as T | undefined) ?? fallback;
const n = (value: number | null) => (value == null ? "x" : Math.round(value * 10).toString(36));
const readN = (value: string) => (value === "x" ? null : parseInt(value, 36) / 10);

function secret() {
  const value = process.env.TELEGRAM_LINK_SECRET;
  if (!value) throw new Error("TELEGRAM_LINK_SECRET не настроен");
  return value;
}

export function createTelegramToken(input: EstimateInput): string {
  const payload = [
    "1",
    n(input.totalArea),
    n(input.ceilingHeight),
    n(input.bathroomArea),
    n(input.wallArea),
    n(input.bathroomWallArea),
    bathroomWallCodes[input.bathroomWallFinish],
    n(input.ceilingArea),
    wallCodes[input.wallFinish],
    floorCodes[input.roomFloorFinish],
    floorCodes[input.bathroomFloorFinish],
    ceilingCodes[input.ceilingFinish],
  ].join("-");
  const signature = createHmac("sha256", secret()).update(payload).digest().subarray(0, 8).toString("base64url");
  const token = `${payload}_${signature}`;
  if (token.length > 64) throw new Error("Ссылка Telegram получилась слишком длинной");
  return token;
}

export function readTelegramToken(token: string): EstimateInput | null {
  const separator = token.length - 12;
  if (separator < 1 || token[separator] !== "_") return null;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = createHmac("sha256", secret()).update(payload).digest().subarray(0, 8);
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  const values = payload.split("-");
  if (values.length !== 12 || values[0] !== "1") return null;
  return {
    objectType: "Квартира",
    totalArea: readN(values[1]),
    ceilingHeight: readN(values[2]),
    bathroomArea: readN(values[3]),
    wallArea: readN(values[4]),
    bathroomWallArea: readN(values[5]),
    bathroomWallFinish: reverse(bathroomWallCodes, values[6], "none"),
    ceilingArea: readN(values[7]),
    wallFinish: reverse(wallCodes, values[8], "none"),
    roomFloorFinish: reverse(floorCodes, values[9], "none"),
    bathroomFloorFinish: reverse(floorCodes, values[10], "none"),
    ceilingFinish: reverse(ceilingCodes, values[11], "none"),
    wishes: "",
  };
}
