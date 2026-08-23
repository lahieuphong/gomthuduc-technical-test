import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Stage } from "@/generated/prisma/enums";
import {
  canTransition,
  getNextStage,
  getStageLabel,
  isCompleted,
} from "@/lib/workflow";

describe("workflow state machine", () => {
  it("cho phép FORMING chuyển sang DRYING_REPAIR", () => {
    assert.equal(canTransition(Stage.FORMING, Stage.DRYING_REPAIR), true);
  });

  it("không cho phép FORMING nhảy sang FIRING", () => {
    assert.equal(canTransition(Stage.FORMING, Stage.FIRING), false);
  });

  it("cho phép QC chuyển sang PACKING", () => {
    assert.equal(canTransition(Stage.QC, Stage.PACKING), true);
  });

  it("cho phép PACKING chuyển sang COMPLETED", () => {
    assert.equal(canTransition(Stage.PACKING, Stage.COMPLETED), true);
  });

  it("COMPLETED không có công đoạn tiếp theo", () => {
    assert.equal(getNextStage(Stage.COMPLETED), null);
    assert.equal(canTransition(Stage.COMPLETED, Stage.FORMING), false);
    assert.equal(isCompleted(Stage.COMPLETED), true);
  });

  it("trả về đúng tên hiển thị tiếng Việt", () => {
    assert.equal(getStageLabel(Stage.DRYING_REPAIR), "Phơi sấy & Sửa mộc");
  });
});
