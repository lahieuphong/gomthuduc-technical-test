export type ApiErrorCode =
  | "INVALID_JSON"
  | "INVALID_INPUT"
  | "AI_INVALID_RESPONSE"
  | "AI_SERVICE_UNAVAILABLE"
  | "BATCH_NOT_FOUND"
  | "BATCH_CODE_CONFLICT"
  | "INTERNAL_ERROR";

export function successResponse<T>(data: T, init?: ResponseInit) {
  return Response.json(
    {
      success: true,
      data,
    },
    init,
  );
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
) {
  return Response.json(
    {
      success: false,
      error: { code, message },
    },
    { status },
  );
}
