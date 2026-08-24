import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Stage } from "@/generated/prisma/enums";
import { buildTransitionTelegramMessage } from "@/lib/telegram-message";

const baseMessageInput = {
  code: "GOM-20260824-A3F2",
  productName: "Bình gốm men lam",
  quantity: 200,
  firingTemperatureC: 1280,
};

describe("Telegram transition messages", () => {
  it("nhấn mạnh nhiệt độ khi mẻ vào lò nung", () => {
    const message = buildTransitionTelegramMessage({
      ...baseMessageInput,
      fromStage: Stage.GLAZING,
      toStage: Stage.FIRING,
    });

    assert.match(message, /🔥 ĐÃ VÀO LÒ NUNG/);
    assert.match(message, /✅ Hoàn thành: Tráng men/);
    assert.match(message, /🔥 Công đoạn tiếp theo: Nung lò/);
    assert.match(message, /🌡 Nhiệt độ nung: 1280°C/);
  });

  it("hiển thị thông báo riêng khi hoàn tất quy trình", () => {
    const message = buildTransitionTelegramMessage({
      ...baseMessageInput,
      fromStage: Stage.PACKING,
      toStage: Stage.COMPLETED,
    });

    assert.match(message, /🎉 MẺ GỐM ĐÃ HOÀN THÀNH QUY TRÌNH/);
    assert.match(message, /✅ Hoàn thành: Đóng gói/);
    assert.match(message, /🏁 Trạng thái: Hoàn thành/);
  });
});
