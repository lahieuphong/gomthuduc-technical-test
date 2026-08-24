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

  it("rejects zero or invalid inspected quantities", () => {
    assert.equal(
      calculateQcMetrics(10, {
        inspectedQuantity: 0,
        defectQuantity: 0,
      }),
      null,
    );
    assert.equal(
      calculateQcMetrics(10, {
        inspectedQuantity: 1.5,
        defectQuantity: 0,
      }),
      null,
    );
  });

  it("rejects negative defects or defects above inspected quantity", () => {
    assert.equal(
      calculateQcMetrics(10, {
        inspectedQuantity: 5,
        defectQuantity: -1,
      }),
      null,
    );
    assert.equal(
      calculateQcMetrics(10, {
        inspectedQuantity: 5,
        defectQuantity: 6,
      }),
      null,
    );
  });
});
