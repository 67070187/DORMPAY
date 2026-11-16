-- DORM-PAY database schema (MySQL 8)
-- เงินทุกช่องเก็บเป็น "สตางค์" (INT) เช่น 3,500 บาท = 350000

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;
DROP VIEW IF EXISTS v_monthly_revenue;
DROP VIEW IF EXISTS v_bill_details;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bills;
DROP TABLE IF EXISTS meter_readings;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS settings;
SET FOREIGN_KEY_CHECKS = 1;

-- ผู้ใช้ (เจ้าของหอ / ผู้เช่า) ใช้ soft delete ผ่าน deleted_at
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(30)  NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  phone         VARCHAR(20)  NULL,
  role          ENUM('ADMIN', 'TENANT') NOT NULL DEFAULT 'TENANT',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at    DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ห้องพัก: 1 ห้องมีผู้เช่าได้ 1 คน (tenant_id UNIQUE)
-- number_active เป็น generated column ทำให้ "เลขห้องห้ามซ้ำเฉพาะห้องที่ยังไม่ถูกลบ"
CREATE TABLE rooms (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  number        VARCHAR(10) NOT NULL,
  floor         INT NOT NULL,
  rent          INT NOT NULL,
  tenant_id     INT NULL UNIQUE,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at    DATETIME NULL,
  number_active VARCHAR(10) AS (IF(deleted_at IS NULL, number, NULL)) STORED,
  CONSTRAINT uq_rooms_number_active UNIQUE (number_active),
  CONSTRAINT chk_rooms_floor CHECK (floor >= 1),
  CONSTRAINT chk_rooms_rent CHECK (rent >= 0),
  CONSTRAINT fk_rooms_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- เลขมิเตอร์น้ำ-ไฟ ต่อห้องต่อเดือน
CREATE TABLE meter_readings (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  room_id    INT NOT NULL,
  month      CHAR(7) NOT NULL, -- YYYY-MM
  water_prev INT NOT NULL,
  water_curr INT NOT NULL,
  elec_prev  INT NOT NULL,
  elec_curr  INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_meter_room_month UNIQUE (room_id, month),
  CONSTRAINT chk_meter_water CHECK (water_curr >= water_prev AND water_prev >= 0),
  CONSTRAINT chk_meter_elec CHECK (elec_curr >= elec_prev AND elec_prev >= 0),
  CONSTRAINT fk_meter_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- บิลรายเดือน (เก็บอัตราที่ใช้คิด ณ ตอนออกบิลไว้ด้วย)
CREATE TABLE bills (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  room_id      INT NOT NULL,
  tenant_id    INT NOT NULL,
  month        CHAR(7) NOT NULL,
  rent         INT NOT NULL,
  water_units  INT NOT NULL,
  water_rate   INT NOT NULL,
  water_amount INT NOT NULL,
  elec_units   INT NOT NULL,
  elec_rate    INT NOT NULL,
  elec_amount  INT NOT NULL,
  total        INT NOT NULL,
  due_date     DATETIME NOT NULL,
  status       ENUM('UNPAID', 'PAID') NOT NULL DEFAULT 'UNPAID',
  paid_at      DATETIME NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_bill_room_month UNIQUE (room_id, month),
  CONSTRAINT chk_bill_total CHECK (total = rent + water_amount + elec_amount),
  CONSTRAINT fk_bill_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_bill_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- การชำระเงิน (โหมดสาธิต PromptPay)
CREATE TABLE payments (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  bill_id   INT NOT NULL,
  amount    INT NOT NULL,
  reference VARCHAR(40) NOT NULL UNIQUE,
  method    VARCHAR(20) NOT NULL DEFAULT 'promptpay',
  paid_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_payment_amount CHECK (amount > 0),
  CONSTRAINT fk_payment_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตั้งค่าระบบ มีแถวเดียว (id = 1)
CREATE TABLE settings (
  id             INT PRIMARY KEY DEFAULT 1,
  water_rate     INT NOT NULL DEFAULT 1800, -- สตางค์ต่อหน่วย
  elec_rate      INT NOT NULL DEFAULT 800,
  due_day        INT NOT NULL DEFAULT 5,    -- ครบกำหนดวันที่ X ของเดือนถัดไป
  promptpay_id   VARCHAR(13)  NOT NULL DEFAULT '0812345678',
  promptpay_name VARCHAR(60)  NOT NULL DEFAULT 'หอพัก DORM-PAY',
  CONSTRAINT chk_settings_single CHECK (id = 1),
  CONSTRAINT chk_settings_due_day CHECK (due_day BETWEEN 1 AND 28)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- VIEW: บิลพร้อมเลขห้อง ชื่อผู้เช่า และสถานะเกินกำหนด (JOIN + CASE)
CREATE VIEW v_bill_details AS
SELECT
  b.*,
  r.number AS room_number,
  u.name   AS tenant_name,
  CASE
    WHEN b.status = 'PAID' THEN 'PAID'
    WHEN b.due_date < NOW() THEN 'OVERDUE'
    ELSE 'UNPAID'
  END AS display_status
FROM bills b
INNER JOIN rooms r ON r.id = b.room_id
INNER JOIN users u ON u.id = b.tenant_id;

-- VIEW: สรุปรายรับรายเดือน (Aggregate + GROUP BY)
CREATE VIEW v_monthly_revenue AS
SELECT
  month,
  COUNT(*)                                             AS bill_count,
  SUM(CASE WHEN status = 'PAID'   THEN total ELSE 0 END) AS paid_total,
  SUM(CASE WHEN status = 'UNPAID' THEN total ELSE 0 END) AS unpaid_total
FROM bills
GROUP BY month;

INSERT INTO settings (id) VALUES (1);
