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
  if (input.inspectedQuantity > batchQuantity) {
    return null;
  }

  return {
    passedQuantity: input.inspectedQuantity - input.defectQuantity,
    defectRate: (input.defectQuantity / input.inspectedQuantity) * 100,
  };
}
