import catalog from "@/data/remkontora-prices.json";

export type PriceItem = (typeof catalog.items)[number];

export const PRICE_SOURCE = {
  company: catalog.source.company,
  url: catalog.source.url,
  checkedAt: "2 сентября 2026",
  disclaimer:
    "В демонстрационной версии используются открытые расценки сторонней компании. В рабочей версии они заменяются на актуальные внутренние расценки KRASNOV.",
} as const;

export const PRICE_CATALOG = catalog.items;

function price(category: string, name: string) {
  const item = PRICE_CATALOG.find((candidate) => candidate.category === category && candidate.name === name);
  if (!item) throw new Error(`В каталоге не найдена позиция: ${category} / ${name}`);
  return { title: item.name, price: item.price, unit: item.unit, id: item.id };
}

export const PRICES = {
  wallPaint: price("Чистовая отделка стен", "Покраска стен в 2 слоя"),
  wallpaper: price("Чистовая отделка стен", "Поклейка флизелиновых обоев без подбора рисунка"),
  wallTile: price("Плиточные работы (стены)", "Укладка керамогранита/плитки (формат до 60х60 см)"),
  floorTile: price("Плиточные работы (полы)", "Укладка керамогранита/плитки (формат до 60х60 см)"),
  laminateOrVinyl: price("Укладка чистовых напольных покрытий", "Укладка ламината или кварцвинила (замковый, прямая)"),
  ceilingPrimer: price("Потолки (чистовой этап)", "Грунтование потолка перед окрашиванием"),
  ceilingPaint: price("Потолки (чистовой этап)", "Окрашивание потолка в 2 слоя"),
} as const;
