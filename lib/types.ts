export type WallFinish = "paint" | "wallpaper" | "tile" | "none";
export type FloorFinish = "laminate" | "quartz_vinyl" | "tile" | "unsupported" | "none";
export type CeilingFinish = "paint" | "none";
export type BathroomWallFinish = "tile" | "none";

export interface EstimateInput {
  objectType: string | null;
  totalArea: number | null;
  ceilingHeight: number | null;
  bathroomArea: number | null;
  wallArea: number | null;
  bathroomWallArea: number | null;
  bathroomWallFinish: BathroomWallFinish;
  ceilingArea: number | null;
  wallFinish: WallFinish;
  roomFloorFinish: FloorFinish;
  bathroomFloorFinish: FloorFinish;
  ceilingFinish: CeilingFinish;
  wishes: string;
}

export interface EstimateLine {
  id: string;
  title: string;
  area: number;
  unit: string;
  unitPrice: number;
  cost: number;
  priceNote: string;
}

export interface MissingLine {
  work: string;
  reason: string;
  field: string;
}

export interface Estimate {
  input: EstimateInput;
  lines: EstimateLine[];
  missing: MissingLine[];
  total: number;
  telegramToken?: string;
}
