// รันก่อนทุกไฟล์เทสต์: ใช้ฐานข้อมูลแยก dormpay_test จะได้ไม่ทับข้อมูลจริง
require("dotenv").config({ quiet: true });
process.env.NODE_ENV = "test";
process.env.DB_NAME = "dormpay_test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
