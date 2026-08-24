import "server-only";

import { z } from "zod";

export {
  buildQcTelegramMessage,
  buildTransitionTelegramMessage,
} from "@/lib/telegram-message";

const TELEGRAM_REQUEST_TIMEOUT_MS = 10_000;

const telegramResponseSchema = z.object({
  ok: z.boolean(),
});

type TelegramErrorCode =
  | "TELEGRAM_NOT_CONFIGURED"
  | "TELEGRAM_UNAVAILABLE";

export class TelegramServiceError extends Error {
  readonly code: TelegramErrorCode;

  constructor(code: TelegramErrorCode) {
    super(code);
    this.name = "TelegramServiceError";
    this.code = code;
  }
}

export async function sendTelegramMessage(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    throw new TelegramServiceError("TELEGRAM_NOT_CONFIGURED");
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          disable_web_page_preview: true,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
      },
    );

    const responseBody: unknown = await response.json().catch(() => null);
    const parsedResponse = telegramResponseSchema.safeParse(responseBody);

    if (!response.ok || !parsedResponse.success || !parsedResponse.data.ok) {
      throw new TelegramServiceError("TELEGRAM_UNAVAILABLE");
    }
  } catch (error: unknown) {
    if (error instanceof TelegramServiceError) {
      throw error;
    }

    throw new TelegramServiceError("TELEGRAM_UNAVAILABLE");
  }
}
