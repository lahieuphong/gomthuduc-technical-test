export type ApiErrorCode =
  | "INVALID_JSON"
  | "INVALID_INPUT"
  | "AI_INVALID_RESPONSE"
  | "AI_SERVICE_UNAVAILABLE"
  | "BATCH_NOT_FOUND"
  | "BATCH_CODE_CONFLICT"
  | "WORKFLOW_CONFLICT"
  | "WORKFLOW_COMPLETED"
  | "QC_STAGE_CONFLICT"
  | "QC_QUANTITY_EXCEEDED"
  | "INTERNAL_ERROR";

export type ApiWarning = {
  code: "TELEGRAM_FAILED";
  message: string;
};

type SuccessResponseInit = ResponseInit & {
  warning?: ApiWarning;
};

export function successResponse<T>(data: T, init?: SuccessResponseInit) {
  const { warning, ...responseInit } = init ?? {};

  return Response.json(
    warning
      ? {
          success: true,
          data,
          warning,
        }
      : {
          success: true,
          data,
        },
    responseInit,
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
