# DORM-PAY ระบบจ่ายค่าหอพัก

ระบบจัดการหอพักและรับชำระค่าหอ เจ้าของหอจดมิเตอร์น้ำ-ไฟ แล้วระบบออกบิลให้อัตโนมัติ
ผู้เช่าสแกน **QR PromptPay** แล้วกด "โอนเงินเสร็จสิ้น" บิลเปลี่ยนเป็น "ชำระแล้ว" ทันที
(การชำระเงินเป็น**โหมดสาธิต** ไม่มีการตรวจสอบเงินเข้าจริง)

| ส่วน | เทคโนโลยี |
|---|---|
| Backend (REST API) | Node.js · **Express** · **mysql2** (เขียน SQL เอง) · **JWT** (jsonwebtoken) · bcryptjs · cookie-parser · dotenv |
| Database | **MySQL 8** (ตาราง + constraints + views ใน `backend/db/schema.sql`) |
| Frontend | Next.js 15 · Tailwind CSS · Recharts · qrcode |
| Testing | **Jest** (unit) · **supertest** (API) · **Postman** collection |
| DevOps | **Docker** / docker-compose · **Git** |

## โครงสร้างโปรเจค (MVC)

```
dorm-pay/
├─ backend/                    Express REST API
│  ├─ src/
│  │  ├─ app.js                สร้าง Express app + ลง middleware
│  │  ├─ server.js             เปิดพอร์ต
│  │  ├─ config/db.js          MySQL connection pool + transaction helper
│  │  ├─ routes/               Express Router (URL -> controller)
│  │  ├─ controllers/          รับ request, validate, เรียก model, ตอบ JSON   ← Controller
│  │  ├─ models/               SQL ทั้งหมดอยู่ที่นี่                         ← Model
│  │  ├─ middleware/           auth (JWT), requireRole, logger, errorHandler
│  │  └─ utils/                คำนวณบิล, PromptPay QR, validation (pure functions)
│  ├─ db/schema.sql            CREATE TABLE + CONSTRAINT + VIEW
│  ├─ db/seed.js, db/init.js   ข้อมูลตัวอย่าง / สร้างฐานข้อมูล
│  └─ tests/                   unit/ (Jest) + api/ (supertest)
├─ frontend/                   Next.js (หน้าเว็บ)                            ← View
│  └─ src/lib/api.ts           เรียก backend พร้อมแนบ JWT
├─ postman/                    DORM-PAY.postman_collection.json
└─ docker-compose.yml          mysql + adminer + backend + frontend
```

ลำดับการทำงานของ 1 request เช่น ผู้เช่ากดจ่ายเงิน:

```
POST /api/bills/43/pay
  → logger → express.json() → cookieParser()             (middleware ทุก request)
  → routes/index.js → requireAuth (ตรวจ JWT) → billRoutes → requireRole("TENANT")
  → billController.pay → withTransaction:
        billModel.lockForPayment   SELECT ... FOR UPDATE   (กันกดจ่ายซ้ำพร้อมกัน)
        paymentModel.create        INSERT INTO payments
        billModel.markPaid         UPDATE bills SET status = 'PAID'
  → 201 { reference: "DP20261116-000043-1420" }
```

## วิธีรัน

### แบบที่ 1: Docker ทีเดียวทั้งระบบ

```bash
docker compose up -d --build
```

- เว็บ: http://localhost:3000 · API: http://localhost:4000/api · Adminer: http://localhost:8081
- ครั้งแรก backend จะสร้างตาราง + ข้อมูลตัวอย่างให้เอง
- ถ้าพอร์ต 3000 ไม่ว่าง: `FRONTEND_PORT=3002 docker compose up -d --build`

### แบบที่ 2: รันแยกตอนพัฒนา (Node.js 20+)

```bash
# 1) ฐานข้อมูล
docker compose up -d mysql adminer

# 2) backend  → http://localhost:4000/api
cd backend
cp .env.example .env          # ใส่ JWT_SECRET
npm install
npm run db:seed               # สร้างตาราง + ข้อมูลตัวอย่าง (รันซ้ำเพื่อรีเซ็ตได้)
npm run dev

# 3) frontend → http://localhost:3000   (อีก terminal)
cd frontend
cp .env.example .env          # JWT_SECRET ต้องตรงกับ backend
npm install
npm run dev
```

ใช้ XAMPP แทน Docker ได้: แก้ `backend/.env` เป็น `DB_PORT=3306`, `DB_PASSWORD=` (ว่าง)

## บัญชีทดสอบ

| บทบาท | ชื่อผู้ใช้ | รหัสผ่าน |
|---|---|---|
| เจ้าของหอ | `admin` | `admin1234` |
| ผู้เช่า | `tenant1` – `tenant7` | `tenant1234` |

ผู้เช่าที่มีบิลค้างในข้อมูลตัวอย่าง: `tenant3`, `tenant6`

## REST API

ทุก endpoint ขึ้นต้นด้วย `/api` · ส่ง/รับ JSON · **เงินเป็นสตางค์** (350000 = 3,500 บาท)
ยืนยันตัวตนด้วย JWT: ส่งใน header `Authorization: Bearer <token>` หรือ cookie `token` (httpOnly) — ถ้ามีทั้งสองอย่างจะใช้ header

| Method | Path | สิทธิ์ | ทำอะไร |
|---|---|---|---|
| POST | `/auth/login` | - | เข้าสู่ระบบ ได้ `token` + ตั้ง cookie |
| POST | `/auth/logout` | - | ลบ cookie |
| GET | `/auth/me` | ล็อกอิน | ข้อมูลผู้ใช้ปัจจุบัน |
| GET / POST | `/rooms` | admin | รายการห้อง (`?vacant=true`) / เพิ่มห้อง |
| GET / PUT / DELETE | `/rooms/:id` | admin | ดู / แก้ / ลบแบบ soft delete (เฉพาะห้องว่าง) |
| GET / POST | `/tenants` | admin | รายการผู้เช่า + ยอดค้าง / เพิ่มผู้เช่า |
| GET / PUT / DELETE | `/tenants/:id` | admin | ดู / แก้ชื่อ-เบอร์ / soft delete |
| PUT | `/tenants/:id/room` | admin | ย้ายห้อง (`roomId: null` = ย้ายออก) |
| PUT | `/tenants/:id/password` | admin | รีเซ็ตรหัสผ่าน |
| GET / POST | `/meters` | admin | ดูเลขมิเตอร์เดือน (`?month=YYYY-MM`) / บันทึก + ออกบิล |
| GET | `/bills` | ล็อกอิน | รายการบิล (`?month=&status=PAID\|UNPAID\|OVERDUE`) ผู้เช่าเห็นแค่ของตัวเอง |
| GET | `/bills/:id` | ล็อกอิน | รายละเอียดบิล + การชำระ |
| GET | `/bills/:id/promptpay` | ผู้เช่า | ข้อความ PromptPay สำหรับทำ QR |
| POST | `/bills/:id/pay` | ผู้เช่า | ยืนยันการโอน (สาธิต) ได้เลขอ้างอิง |
| DELETE | `/bills/:id` | admin | ลบบิลที่ยังไม่จ่าย |
| GET | `/dashboard` | admin | สรุปรายรับ ยอดค้าง อัตราเข้าพัก |
| GET / PUT | `/settings` | admin | อัตราค่าน้ำ-ไฟ วันครบกำหนด หมายเลขพร้อมเพย์ |
| GET | `/me` | ผู้เช่า | ห้อง ยอดค้าง และบิลทั้งหมดของตัวเอง |

รหัสสถานะที่ใช้: `200` สำเร็จ · `201` สร้างแล้ว · `204` ลบแล้ว · `400` ข้อมูลผิด · `401` ยังไม่ล็อกอิน · `403` ไม่มีสิทธิ์ · `404` ไม่พบ · `409` ข้อมูลซ้ำ/ขัดแย้ง

## การทดสอบ

```bash
cd backend
npm test            # ทั้งหมด (81 tests) — ใช้ฐานข้อมูลแยกชื่อ dormpay_test
npm run test:unit   # เฉพาะ unit test (ไม่ต้องมีฐานข้อมูล)
npm run test:api    # เฉพาะ API test ด้วย supertest
```

- **Unit (Jest):** คำนวณบิล, วันครบกำหนด, แปลงเงิน, PromptPay payload + CRC16, middleware ตรวจ JWT/สิทธิ์
- **API (supertest):** login / 401 / 403, CRUD ห้องและผู้เช่า, soft delete, จดมิเตอร์ → ออกบิล → จ่าย, จ่ายซ้ำ 409, กดจ่ายพร้อมกัน 5 ครั้งบันทึกครั้งเดียว, dashboard, settings
- **Postman:** import `postman/DORM-PAY.postman_collection.json` แล้วกด Run collection (35 requests พร้อม test script) หลัง `npm run db:seed`
  หรือรันจาก terminal: `npx newman run postman/DORM-PAY.postman_collection.json`

## ฐานข้อมูล (`backend/db/schema.sql`)

| ตาราง | เก็บอะไร | จุดที่น่าสนใจ |
|---|---|---|
| `users` | admin / ผู้เช่า | `username UNIQUE`, `role ENUM`, soft delete (`deleted_at`) |
| `rooms` | ห้องพัก | `tenant_id UNIQUE` (1 ห้อง 1 คน), `CHECK (rent >= 0)`, generated column ทำให้เลขห้องห้ามซ้ำเฉพาะห้องที่ยังไม่ลบ |
| `meter_readings` | เลขมิเตอร์ต่อห้องต่อเดือน | `UNIQUE (room_id, month)`, `CHECK (water_curr >= water_prev)` |
| `bills` | บิลรายเดือน | `CHECK (total = rent + water_amount + elec_amount)`, FK ไปห้องและผู้เช่า |
| `payments` | การชำระ | `reference UNIQUE` |
| `settings` | ตั้งค่า (แถวเดียว) | `CHECK (id = 1)`, `CHECK (due_day BETWEEN 1 AND 28)` |
| `v_bill_details` (VIEW) | บิล + เลขห้อง + ชื่อผู้เช่า + สถานะเกินกำหนด | `INNER JOIN` + `CASE` |
| `v_monthly_revenue` (VIEW) | รายรับรายเดือนสำหรับกราฟ | `SUM(CASE ...)` + `GROUP BY` |

## การชำระเงิน (โหมดสาธิต)

1. ผู้เช่ากด **ชำระเงิน** → frontend เรียก `GET /api/bills/:id/promptpay`
2. backend สร้างข้อความ PromptPay ตามมาตรฐาน EMVCo (หมายเลขพร้อมเพย์ + ยอดบิล + CRC16) → แสดงเป็น QR
3. ปุ่ม **บันทึก QR** เซฟรูป PNG · ปุ่ม **โอนเงินเสร็จสิ้น** เรียก `POST /api/bills/:id/pay` → ได้เลขอ้างอิง

ระบบจริงต้องเชื่อมธนาคารหรือ payment gateway เพื่อยืนยันยอดเงินเข้าก่อนเปลี่ยนสถานะ
เปลี่ยนหมายเลขพร้อมเพย์ได้ที่หน้า **ตั้งค่า** (ค่าเริ่มต้น `0812345678`)

## หัวข้อที่เรียน → อยู่ตรงไหนในโปรเจค

| หัวข้อ | ไฟล์ / ส่วน |
|---|---|
| Git | ประวัติ commit ของโปรเจค |
| Docker | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` |
| Node.js, npm, async/await, CommonJS | `backend/` ทั้งหมด (`require`, `async` controllers), `package.json` scripts |
| Express + Router | `backend/src/app.js`, `backend/src/routes/` |
| Middleware | `backend/src/middleware/` (auth, requireRole, logger, errorHandler) + `express.json()`, `cookieParser()` |
| Environment Variables | `backend/.env.example`, `frontend/.env.example`, `src/config/db.js` |
| MySQL / SQL | `backend/db/schema.sql`, `backend/src/models/` (JOIN, GROUP BY, SUM/COUNT, CASE, subquery, VIEW, constraints, transaction) |
| CRUD + Soft Delete | `/api/rooms`, `/api/tenants` (`deleted_at`) |
| Unit Testing (Jest) | `backend/tests/unit/` |
| API Testing | `backend/tests/api/` (supertest), `postman/` |
| MVC | `routes/` → `controllers/` → `models/` และ `frontend/` เป็น View |
| Cookies | httpOnly cookie `token` (`authController.js`, `frontend/src/app/actions.ts`) |
| JWT | `backend/src/middleware/auth.js` (sign/verify), `frontend/src/middleware.ts` (ตรวจ role ก่อนเข้าหน้า) |
