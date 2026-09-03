import { PRICE_SOURCE, PRICES } from "./prices";
import type { Estimate, EstimateInput, EstimateLine, MissingLine } from "./types";

const roundArea = (value: number) => Math.round(value * 100) / 100;

function line(id: string, title: string, area: number, unitPrice: number): EstimateLine {
  return {
    id,
    title,
    area: roundArea(area),
    unit: "м²",
    unitPrice,
    cost: Math.round(area * unitPrice),
    priceNote: `от ${unitPrice.toLocaleString("ru-RU")} ₽/м²`,
  };
}

function need(missing: MissingLine[], work: string, field: string, label: string) {
  missing.push({ work, field, reason: `${label} не указана — стоимость не рассчитана.` });
}

export function calculateEstimate(input: EstimateInput): Estimate {
  const lines: EstimateLine[] = [];
  const missing: MissingLine[] = [];

  if (input.roomFloorFinish !== "none") {
    if (input.totalArea == null) {
      need(missing, "Напольное покрытие вне санузлов", "totalArea", "Общая площадь объекта");
    } else if (input.roomFloorFinish === "unsupported") {
      missing.push({
        work: "Напольное покрытие",
        field: "roomFloorFinish",
        reason: "Укладка линолеума не представлена в прайсе — стоимость не рассчитана.",
      });
    } else if (input.bathroomArea == null) {
      need(missing, "Напольное покрытие вне санузлов", "bathroomArea", "Площадь санузлов");
    } else if (input.bathroomArea >= input.totalArea) {
      missing.push({
        work: "Напольное покрытие вне санузлов",
        field: "bathroomArea",
        reason: "Площадь санузлов должна быть меньше общей площади объекта.",
      });
    } else {
      const area = input.totalArea - input.bathroomArea;
      if (input.roomFloorFinish === "tile") {
        lines.push(line("room-floor-tile", PRICES.floorTile.title, area, PRICES.floorTile.price));
      } else {
        const material = input.roomFloorFinish === "laminate" ? "ламината" : "кварцвинила";
        lines.push(line("room-floor", `Укладка ${material}`, area, PRICES.laminateOrVinyl.price));
      }
    }
  }

  if (input.bathroomFloorFinish !== "none") {
    if (input.bathroomArea == null) {
      need(missing, "Напольное покрытие в санузлах", "bathroomArea", "Площадь санузлов");
    } else if (input.bathroomFloorFinish === "unsupported") {
      missing.push({
        work: "Линолеум в санузле",
        field: "bathroomFloorFinish",
        reason: "Укладка линолеума в санузле не представлена в прайсе — стоимость не рассчитана.",
      });
    } else if (input.bathroomFloorFinish === "tile") {
      lines.push(line("bath-floor-tile", PRICES.floorTile.title, input.bathroomArea, PRICES.floorTile.price));
    } else {
      missing.push({
        work: "Напольное покрытие в санузлах",
        field: "bathroomFloorFinish",
        reason: "Для выбранного покрытия санузла нет позиции в демонстрационном прайсе.",
      });
    }
  }

  if (
    input.roomFloorFinish !== "none" &&
    input.bathroomArea != null &&
    input.bathroomArea > 0 &&
    input.bathroomFloorFinish === "none"
  ) {
    missing.push({
      work: "Напольное покрытие в санузлах",
      field: "bathroomFloorFinish",
      reason: "Материал пола в санузлах не указан — стоимость не рассчитана.",
    });
  }

  if (input.wallFinish !== "none") {
    const isBathTile = input.wallFinish === "tile";
    const hasBathroomTile = input.bathroomWallFinish === "tile";
    const area = isBathTile
      ? input.bathroomWallArea
      : hasBathroomTile && input.bathroomWallArea != null && input.wallArea != null
        ? input.wallArea - input.bathroomWallArea
        : input.wallArea;
    if (area == null) {
      need(
        missing,
        isBathTile ? "Плитка на стенах санузлов" : "Отделка стен",
        isBathTile ? "bathroomWallArea" : "wallArea",
        isBathTile ? "Площадь стен санузлов" : "Площадь стен",
      );
    } else if (hasBathroomTile && !isBathTile && input.bathroomWallArea == null) {
      missing.push({
        work: "Отделка стен вне санузла",
        field: "bathroomWallArea",
        reason: "Укажите площадь стен санузла, чтобы не включать их в отделку остальных стен.",
      });
    } else if (area <= 0) {
      missing.push({
        work: "Отделка стен вне санузла",
        field: "bathroomWallArea",
        reason: "Площадь стен санузла должна быть меньше общей площади стен.",
      });
    } else if (input.wallFinish === "paint") {
      lines.push(line("wall-paint", PRICES.wallPaint.title, area, PRICES.wallPaint.price));
    } else if (input.wallFinish === "wallpaper") {
      lines.push(line("wallpaper", PRICES.wallpaper.title, area, PRICES.wallpaper.price));
    } else {
      lines.push(line("wall-tile", PRICES.wallTile.title, area, PRICES.wallTile.price));
    }
  }

  if (input.bathroomWallFinish === "tile" && input.wallFinish !== "tile") {
    if (input.bathroomWallArea == null) {
      if (input.wallFinish === "none") {
        need(missing, "Плитка на стенах санузла", "bathroomWallArea", "Площадь стен санузла");
      }
    } else {
      lines.push(line("bathroom-wall-tile", PRICES.wallTile.title, input.bathroomWallArea, PRICES.wallTile.price));
    }
  }

  if (input.ceilingFinish === "paint") {
    if (input.totalArea == null) {
      need(missing, "Окрашивание потолка", "totalArea", "Площадь пола");
    } else {
      lines.push(line("ceiling-primer", PRICES.ceilingPrimer.title, input.totalArea, PRICES.ceilingPrimer.price));
      lines.push(line("ceiling-paint", PRICES.ceilingPaint.title, input.totalArea, PRICES.ceilingPaint.price));
    }
  }

  if (lines.length === 0 && missing.length === 0) {
    missing.push({
      work: "Перечень работ",
      field: "scope",
      reason: "Опишите конкретный перечень работ: демонтаж, электрика, сантехника, стены, потолки, пол, двери и окна. Укажите, что именно нужно сделать в каждом разделе.",
    });
  }

  return {
    input,
    lines,
    missing,
    total: lines.reduce((sum, item) => sum + item.cost, 0),
  };
}

export function formatTelegramEstimate(estimate: Estimate): string {
  const money = (value: number) => value.toLocaleString("ru-RU");
  const known = [
    estimate.input.totalArea != null ? `Площадь: ${estimate.input.totalArea} м²` : null,
    estimate.input.ceilingHeight != null ? `Высота потолков: ${estimate.input.ceilingHeight} м` : null,
    estimate.input.bathroomArea != null ? `Санузлы: ${estimate.input.bathroomArea} м²` : null,
  ].filter(Boolean);

  const calculated = estimate.lines.length
    ? estimate.lines
        .map((item, index) => `${index + 1}. ${item.title}\n${item.area} м² × ${money(item.unitPrice)} ₽ = ${money(item.cost)} ₽`)
        .join("\n\n")
    : "Нет работ, для которых достаточно исходных данных.";

  const missing = estimate.missing.length
    ? estimate.missing.map((item) => `• ${item.reason}`).join("\n")
    : "Дополнительных уточнений для выбранных работ нет.";

  return [
    "Ваш предварительный расчёт KRASNOV",
    known.join("\n"),
    "РАССЧИТАННЫЕ РАБОТЫ",
    calculated,
    `Предварительная стоимость рассчитанных работ: ${money(estimate.total)} ₽`,
    "ТРЕБУЕТ УТОЧНЕНИЯ",
    missing,
    "В итог включены только работы, для которых достаточно исходных данных. Расчёт предварительный; цены указаны «от» и не являются офертой.",
    `Источник расценок: ${PRICE_SOURCE.company}, ${PRICE_SOURCE.checkedAt}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
