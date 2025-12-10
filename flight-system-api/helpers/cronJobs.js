const cron = require("node-cron");
const { FlightInventory } = require("../models/flights");

const startCronJobs = () => {
  // Lên lịch: Chạy mỗi phút (* * * * *)
  cron.schedule("* * * * *", async () => {
    console.log("CRON JOB: Đang quét và dọn dẹp các ghế hết hạn giữ chỗ...");

    try {
      // Thời gian giới hạn: Hiện tại trừ đi 15 phút
      const expirationTime = new Date(Date.now() - 15 * 60 * 1000);

      // Tìm và Update tất cả các ghế thõa mãn 2 điều kiện:
      // 1. Status là 'held'
      // 2. Thời gian hold (heldAt) nhỏ hơn thời gian hết hạn
      const result = await FlightInventory.updateMany(
        { 
          "seats.status": "held", 
          "seats.heldAt": { $lt: expirationTime } 
        },
        {
          $set: {
            "seats.$[elem].status": "available",
            "seats.$[elem].heldBy": null,
            "seats.$[elem].heldAt": null
          }
        },
        {
          arrayFilters: [
            { "elem.status": "held", "elem.heldAt": { $lt: expirationTime } }
          ]
        }
      );

      if (result.nModified > 0) {
        console.log(`✅ Đã tự động nhả ${result.nModified} ghế quá hạn.`);
      }
    } catch (error) {
      console.error("❌ Lỗi trong Cron Job:", error);
    }
  });
};

module.exports = startCronJobs;