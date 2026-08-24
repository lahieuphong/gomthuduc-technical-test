import type { ApiResult, ApiWarning } from "@/types/api";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function parseWarning(value: unknown): ApiWarning | undefined {
  if (
    !isRecord(value) ||
    value.code !== "TELEGRAM_FAILED" ||
    typeof value.message !== "string"
  ) {
    return undefined;
  }

  return {
    code: value.code,
    message: value.message,
  };
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);

  if (response.ok && isRecord(payload) && payload.success === true) {
    return {
      data: payload.data as T,
      warning: parseWarning(payload.warning),
    };
  }

  if (isRecord(payload) && isRecord(payload.error)) {
    const code =
      typeof payload.error.code === "string"
        ? payload.error.code
        : "UNKNOWN_ERROR";
    const message =
      typeof payload.error.message === "string"
        ? payload.error.message
        : "Yêu cầu không thể hoàn tất.";

    throw new ApiClientError(response.status, code, message);
  }

  throw new ApiClientError(
    response.status,
    "UNKNOWN_ERROR",
    "Không thể kết nối tới máy chủ. Vui lòng thử lại.",
  );
}
