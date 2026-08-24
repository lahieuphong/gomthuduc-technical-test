import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateQcMetrics } from "@/lib/qc-rules";

describe("QC reporting rules", () => {
  it("calculates server-owned QC metrics within the batch quantity", () => {
    assert.deepEqual(
      calculateQcMetrics(200, {
        inspectedQuantity: 200,
        defectQuantity: 10,
      }),
      {
        passedQuantity: 190,
        defectRate: 5,
      },
    );
  });

  it("rejects inspected quantities above the batch quantity", () => {
    assert.equal(
      calculateQcMetrics(10, {
        inspectedQuantity: 11,
        defectQuantity: 1,
      }),
      null,
    );
  });
});
