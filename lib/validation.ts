import { z } from "zod";

const nullableNumber = z.number().positive().max(10000).nullable();

export const estimateInputSchema = z.object({
  objectType: z.string().max(80).nullable(),
  totalArea: nullableNumber,
  ceilingHeight: z.number().min(1.5).max(10).nullable(),
  bathroomArea: nullableNumber,
  wallArea: nullableNumber,
  bathroomWallArea: nullableNumber,
  bathroomWallFinish: z.enum(["tile", "none"]),
  ceilingArea: nullableNumber,
  wallFinish: z.enum(["paint", "wallpaper", "tile", "none"]),
  roomFloorFinish: z.enum(["laminate", "quartz_vinyl", "tile", "unsupported", "none"]),
  bathroomFloorFinish: z.enum(["laminate", "quartz_vinyl", "tile", "unsupported", "none"]),
  ceilingFinish: z.enum(["paint", "none"]),
  wishes: z.string().max(2000),
});

export const requestSchema = z.object({
  explicit: estimateInputSchema,
  description: z.string().max(2000),
});

export type EstimateRequest = z.infer<typeof requestSchema>;
