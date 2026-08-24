type QcCounts = {
  inspectedQuantity: number;
  defectQuantity: number;
};

type QcMetrics = {
  passedQuantity: number;
  defectRate: number;
};

export function calculateQcMetrics(
  batchQuantity: number,
  input: QcCounts,
): QcMetrics | null {
  if (
    !Number.isInteger(batchQuantity) ||
    batchQuantity <= 0 ||
    !Number.isInteger(input.inspectedQuantity) ||
    input.inspectedQuantity <= 0 ||
    !Number.isInteger(input.defectQuantity) ||
    input.defectQuantity < 0 ||
    input.defectQuantity > input.inspectedQuantity ||
    input.inspectedQuantity > batchQuantity
  ) {
    return null;
  }

  return {
    passedQuantity: input.inspectedQuantity - input.defectQuantity,
    defectRate: (input.defectQuantity / input.inspectedQuantity) * 100,
  };
}
