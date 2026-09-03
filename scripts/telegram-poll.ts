import { handleTelegramUpdate, type TelegramUpdate } from "../lib/telegram-bot";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN не настроен");

let stopping = false;

process.on("SIGINT", () => {
  stopping = true;
});

async function main() {
  let offset = 0;
  console.log("Telegram-бот запущен в локальном режиме. Нажмите Ctrl+C для остановки.");

  while (!stopping) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getUpdates?timeout=20&offset=${offset}&allowed_updates=%5B%22message%22%5D`,
      );
      if (!response.ok) throw new Error(`Telegram getUpdates: ${response.status}`);
      const body = (await response.json()) as { ok: boolean; result: TelegramUpdate[] };
      for (const update of body.result || []) {
        if (typeof update.update_id === "number") offset = update.update_id + 1;
        await handleTelegramUpdate(update);
        console.log("Обработано сообщение Telegram.");
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Ошибка Telegram polling");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log("Telegram-бот остановлен.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
