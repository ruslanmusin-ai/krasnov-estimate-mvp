import OpenAI from "openai";
import type { EstimateInput } from "./types";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    objectType: { type: ["string", "null"] },
    totalArea: { type: ["number", "null"] },
    ceilingHeight: { type: ["number", "null"] },
    bathroomArea: { type: ["number", "null"] },
    wallArea: { type: ["number", "null"] },
    bathroomWallArea: { type: ["number", "null"] },
    bathroomWallFinish: { type: "string", enum: ["tile", "none"] },
    ceilingArea: { type: ["number", "null"] },
    wallFinish: { type: "string", enum: ["paint", "wallpaper", "tile", "none"] },
    roomFloorFinish: { type: "string", enum: ["laminate", "quartz_vinyl", "tile", "unsupported", "none"] },
    bathroomFloorFinish: { type: "string", enum: ["laminate", "quartz_vinyl", "tile", "unsupported", "none"] },
    ceilingFinish: { type: "string", enum: ["paint", "none"] },
    wishes: { type: "string" },
  },
  required: [
    "objectType",
    "totalArea",
    "ceilingHeight",
    "bathroomArea",
    "wallArea",
    "bathroomWallArea",
    "bathroomWallFinish",
    "ceilingArea",
    "wallFinish",
    "roomFloorFinish",
    "bathroomFloorFinish",
    "ceilingFinish",
    "wishes",
  ],
} as const;

const instructions = `Ты извлекаешь только явно указанные параметры объекта для предварительной сметы.
Никогда не вычисляй и не предполагай площади, материалы или размеры.
Если значение не сказано явно, верни null для числа и none для варианта.
«Стены под покраску» означает wallFinish=paint. «Обои» — wallpaper.
«Плитка на стенах санузла» означает bathroomWallFinish=tile. Если пользователь говорит «на стенах и полу», верни одновременно bathroomWallFinish=tile и bathroomFloorFinish=tile.
Плитка в санузле без уточнения поверхности означает bathroomFloorFinish=tile; не делай вывод о стенах.
Если пользователь явно называет материал или услугу, которых нет среди вариантов прайса (например, линолеум), верни unsupported для соответствующего поля, а не none. Не подменяй его похожей услугой.
Кварцвинил или ламинат «в комнатах/остальных помещениях» относится к roomFloorFinish.
Сохрани нераспознанные пожелания кратко в wishes. Не добавляй новые сведения.`;

export async function extractFromDescription(description: string): Promise<EstimateInput> {
  if (!description.trim()) {
    return {
      objectType: null,
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
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    store: false,
    instructions,
    input: description,
    text: {
      format: {
        type: "json_schema",
        name: "estimate_input",
        strict: true,
        schema,
      },
    },
  });

  if (!response.output_text) throw new Error("Модель не вернула результат");
  return JSON.parse(response.output_text) as EstimateInput;
}

export function mergeInputs(explicit: EstimateInput, extracted: EstimateInput): EstimateInput {
  const preferNumber = (manual: number | null, ai: number | null) => manual ?? ai;
  const preferChoice = <T extends string>(manual: T, ai: T) => (manual === "none" ? ai : manual);

  return {
    objectType: explicit.objectType || extracted.objectType,
    totalArea: preferNumber(explicit.totalArea, extracted.totalArea),
    ceilingHeight: preferNumber(explicit.ceilingHeight, extracted.ceilingHeight),
    bathroomArea: preferNumber(explicit.bathroomArea, extracted.bathroomArea),
    wallArea: preferNumber(explicit.wallArea, extracted.wallArea),
    bathroomWallArea: preferNumber(explicit.bathroomWallArea, extracted.bathroomWallArea),
    bathroomWallFinish: preferChoice(explicit.bathroomWallFinish, extracted.bathroomWallFinish),
    ceilingArea: preferNumber(explicit.ceilingArea, extracted.ceilingArea),
    wallFinish: preferChoice(explicit.wallFinish, extracted.wallFinish),
    roomFloorFinish: preferChoice(explicit.roomFloorFinish, extracted.roomFloorFinish),
    bathroomFloorFinish: preferChoice(explicit.bathroomFloorFinish, extracted.bathroomFloorFinish),
    ceilingFinish: preferChoice(explicit.ceilingFinish, extracted.ceilingFinish),
    wishes: [explicit.wishes, extracted.wishes].filter(Boolean).join("; "),
  };
}
