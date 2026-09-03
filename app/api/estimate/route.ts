import { NextRequest, NextResponse } from "next/server";
import { extractFromDescription, mergeInputs } from "@/lib/ai";
import { calculateEstimate } from "@/lib/calculator";
import { allowRequest } from "@/lib/rate-limit";
import { createTelegramToken } from "@/lib/telegram-token";
import { estimateInputSchema, requestSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowRequest(ip)) {
    return NextResponse.json({ error: "Слишком много запросов. Попробуйте позже." }, { status: 429 });
  }

  try {
    const parsed = requestSchema.parse(await request.json());
    const extracted = await extractFromDescription(parsed.description);
    const input = estimateInputSchema.parse(mergeInputs(parsed.explicit, extracted));
    if (input.wallArea == null) {
      return NextResponse.json({ error: "Укажите площадь стен." }, { status: 400 });
    }
    const estimate = calculateEstimate(input);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
    let telegramUrl: string | null = null;
    if (botUsername && process.env.TELEGRAM_LINK_SECRET) {
      const token = createTelegramToken(input);
      telegramUrl = `https://t.me/${botUsername}?start=${token}`;
    }
    return NextResponse.json({ estimate, telegramUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Не удалось подготовить расчёт. Проверьте введённые данные и повторите попытку." },
      { status: 400 },
    );
  }
}
