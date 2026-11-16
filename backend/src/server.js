require("dotenv").config({ quiet: true });
const app = require("./app");

if (!process.env.JWT_SECRET) {
  console.error("ยังไม่ได้ตั้งค่า JWT_SECRET ในไฟล์ .env");
  process.exit(1);
}

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`DORM-PAY API running at http://localhost:${port}/api`));
