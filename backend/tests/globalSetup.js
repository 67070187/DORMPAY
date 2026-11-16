// รันครั้งเดียวก่อนเทสต์ทั้งหมด: สร้างฐานข้อมูล dormpay_test (ถ้าเทสต์ API ถูกรัน)
module.exports = async (globalConfig) => {
  const onlyUnit = globalConfig.testPathPatterns?.patterns?.every?.((p) => p.includes("unit"));
  if (onlyUnit) return;
  require("./setupEnv");
  const { initDatabase } = require("../db/init");
  await initDatabase({ database: "dormpay_test", withSeed: true });
};
