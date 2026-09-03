import { mkdir, writeFile } from "node:fs/promises";

const sourceUrl = "https://remkontora.ru/czeny/";
const response = await fetch(sourceUrl);
if (!response.ok) throw new Error(`Не удалось загрузить прайс: HTTP ${response.status}`);

const html = await response.text();
const priceHeading = html.indexOf("Актуальный прайс-лист 2026 года");
const tableStart = html.indexOf('<div class="price__table">', priceHeading);
if (tableStart < 0) throw new Error("Таблица прайса не найдена");
const tableEnd = html.indexOf("</section>", tableStart);
const table = html.slice(tableStart, tableEnd);

const clean = (value) => value
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/\s+/g, " ")
  .trim();

const chunks = table.split(/<div class="price__table-row[^>]*>/).slice(2);
const items = [];
let category = "";

for (const chunk of chunks) {
  const cells = [...chunk.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].slice(0, 3).map((match) => clean(match[1]));
  if (cells.length < 3) continue;
  const [name, unit, priceText] = cells;
  if (!unit && !priceText && /^\d+\./.test(name)) {
    category = name.replace(/^\d+\.\s*/, "");
    continue;
  }
  const price = Number(priceText.replace(/\D/g, ""));
  if (!category || !name || !unit || !price) continue;
  items.push({ id: `rk-${String(items.length + 1).padStart(3, "0")}`, category, name, unit, price });
}

if (items.length < 50) throw new Error(`Импортировано подозрительно мало позиций: ${items.length}`);

const catalog = {
  source: { company: "РемКонтора", url: sourceUrl, priceYear: 2026, importedAt: new Date().toISOString() },
  disclaimer: "Цены указаны «от», носят рекомендательный характер и не являются публичной офертой.",
  items,
};

await mkdir("data", { recursive: true });
await writeFile("data/remkontora-prices.json", `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Импортировано: ${items.length} позиций в ${new Set(items.map((item) => item.category)).size} категориях.`);
