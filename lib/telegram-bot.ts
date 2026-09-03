import { calculateEstimate, formatTelegramEstimate } from "./calculator";
import { readTelegramToken } from "./telegram-token";

export type TelegramUpdate = {
  update_id?: number;
  message?: { chat?: { id?: number }; text?: string };
};

export async function sendTelegramMessage(chatId: number, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN не настроен");
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`Telegram API: ${response.status}`);
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim() || "";
  if (!chatId) return;

  const token = text.startsWith("/start ") ? text.slice(7).trim() : "";
  if (!token) {
    await sendTelegramMessage(
      chatId,
      "Откройте ссылку «Получить расчёт в Telegram» на сайте KRASNOV — бот пришлёт подготовленную смету без повторного ввода данных.",
    );
    return;
  }

  const input = readTelegramToken(token);
  if (!input) {
    await sendTelegramMessage(chatId, "Ссылка расчёта недействительна. Вернитесь на сайт и сформируйте новый расчёт.");
    return;
  }

  await sendTelegramMessage(chatId, formatTelegramEstimate(calculateEstimate(input)));
}
