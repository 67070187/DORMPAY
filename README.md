# DORM-PAY ระบบจ่ายค่าหอพัก

ระบบจัดการหอพักและรับชำระค่าหอออนไลน์ เจ้าของหอจดมิเตอร์น้ำ-ไฟ แล้วระบบออกบิลให้อัตโนมัติ
ผู้เช่าจ่ายผ่าน Stripe (บัตร / PromptPay) และระบบอัปเดตสถานะเป็น "ชำระแล้ว" ทันที ไม่ต้องแนบสลิป

**เทคโนโลยี:** Next.js 15 (App Router, TypeScript) · Prisma · MySQL 8 · Tailwind CSS · Stripe Checkout · Recharts

## ฟีเจอร์

| เจ้าของหอ (admin) | ผู้เช่า (tenant) |
|---|---|
| Dashboard: รายรับรายเดือน (กราฟ), ยอดค้าง, อัตราเข้าพัก | ดูห้องของตัวเองและยอดค้างชำระ |
| จัดการห้องพัก (เพิ่ม/ลบ/แก้ค่าเช่า) | ดูรายละเอียดบิล (ค่าเช่า / น้ำ / ไฟ) |
| จัดการผู้เช่า (เพิ่ม, ย้ายห้อง, ย้ายออก, รีเซ็ตรหัส) | ชำระเงินออนไลน์ผ่าน Stripe |
| จดมิเตอร์น้ำ-ไฟ → ออกบิลอัตโนมัติ | ดูประวัติการชำระ |
| ดูบิลทั้งหมด กรองตามเดือน/สถานะ | |
| ตั้งค่าอัตราค่าน้ำ ค่าไฟ วันครบกำหนด | |

## วิธีติดตั้งและรัน

ต้องมี **Node.js 20+** และ **MySQL 8** (ใช้ Docker หรือ XAMPP ก็ได้)

```bash
npm install
cp .env.example .env        # แล้วแก้ค่าในไฟล์ .env
```

### 1. เปิดฐานข้อมูล

**แบบ Docker:** `docker compose up -d` (MySQL ที่พอร์ต 3307, Adminer ดูข้อมูลที่ http://localhost:8081)

**แบบ XAMPP:** สร้างฐานข้อมูลชื่อ `dormpay` แล้วแก้ `.env` เป็น
`DATABASE_URL="mysql://root:@localhost:3306/dormpay"`

### 2. สร้างตารางและข้อมูลตัวอย่าง

```bash
npm run db:push    # สร้างตารางจาก prisma/schema.prisma
npm run db:seed    # ใส่ข้อมูลตัวอย่าง (10 ห้อง, 7 ผู้เช่า, บิลย้อนหลัง 6 เดือน)
```

### 3. ตั้งค่า Stripe (โหมดทดสอบ ไม่มีเงินจริง)

1. สมัคร https://dashboard.stripe.com (ฟรี) แล้วเปิด **Test mode**
2. คัดลอก **Secret key** (`sk_test_...`) จากหน้า Developers → API keys ใส่ใน `STRIPE_SECRET_KEY`
3. (ถ้าต้องการ PromptPay) เปิดที่ Settings → Payment methods — ใช้ได้กับบัญชี Stripe ประเทศไทย

### 4. รัน

```bash
npm run dev
```

เปิด http://localhost:3000 (ถ้าพอร์ตไม่ใช่ 3000 ให้แก้ `APP_URL` ใน `.env` ให้ตรง)

## บัญชีทดสอบ

| บทบาท | ชื่อผู้ใช้ | รหัสผ่าน |
|---|---|---|
| เจ้าของหอ | `admin` | `admin1234` |
| ผู้เช่า | `tenant1` – `tenant7` | `tenant1234` |

บัตรทดสอบ Stripe: `4242 4242 4242 4242` วันหมดอายุอะไรก็ได้ในอนาคต CVC อะไรก็ได้

## ลองใช้งาน (เดโม)

1. ล็อกอิน `admin` → เมนู **จดมิเตอร์** → กรอกเลข "ครั้งนี้" ของห้อง 101 → **บันทึกและออกบิล**
2. ออกจากระบบ ล็อกอิน `tenant1` → เห็นบิลเดือนนี้ → **ชำระเงิน**
3. จ่ายด้วยบัตรทดสอบ → กลับมาที่เว็บ บิลเปลี่ยนเป็น **ชำระแล้ว** ทันที
4. ล็อกอิน `admin` อีกครั้ง → Dashboard ยอดรับชำระเพิ่มขึ้น

## ระบบรู้ได้อย่างไรว่าจ่ายแล้ว

```
ผู้เช่ากด "ชำระเงิน" → สร้าง Stripe Checkout Session (แนบ billId ใน metadata)
   → หน้าจ่ายเงินของ Stripe → จ่ายสำเร็จ
   → Stripe พากลับมาที่ /tenant/bills/:id?session_id=...
   → เซิร์ฟเวอร์ถาม Stripe ว่า session นี้ payment_status = "paid" จริงไหม
   → บันทึก Payment + เปลี่ยน Bill เป็น PAID
```

นอกจากนี้ยังมี webhook ที่ `/api/stripe/webhook` สำรองไว้ กรณีผู้เช่าปิดหน้าเว็บก่อนถูกพากลับมา
ถ้าจะทดสอบ webhook บนเครื่อง ให้ใช้ [Stripe CLI](https://docs.stripe.com/stripe-cli):
`stripe listen --forward-to localhost:3000/api/stripe/webhook` แล้วนำ `whsec_...` ไปใส่ `STRIPE_WEBHOOK_SECRET`
ทั้งสองทางบันทึกซ้ำกันไม่ได้ (เช็กจาก `stripeSessionId` ที่ unique)

## โครงสร้างฐานข้อมูล

- **User** ผู้ใช้ (role = ADMIN / TENANT)
- **Room** ห้องพัก มีผู้เช่าได้ 1 คน (`tenantId`)
- **MeterReading** เลขมิเตอร์น้ำ-ไฟ ต่อห้องต่อเดือน
- **Bill** บิลรายเดือน ต่อห้องต่อเดือน (เก็บอัตราที่ใช้คิด ณ ตอนออกบิลไว้ด้วย)
- **Payment** การชำระเงินจาก Stripe
- **Setting** อัตราค่าน้ำ ค่าไฟ วันครบกำหนด

> เงินทุกช่องเก็บเป็น **สตางค์** (จำนวนเต็ม) เพื่อเลี่ยงปัญหาทศนิยม และตรงกับหน่วยที่ Stripe ใช้

## โครงสร้างโค้ด

```
prisma/schema.prisma        โครงสร้างฐานข้อมูล
prisma/seed.ts              ข้อมูลตัวอย่าง
src/middleware.ts           กันหน้า /admin และ /tenant ตามบทบาท
src/lib/                    auth (JWT cookie), billing, stripe, format
src/app/login               หน้าเข้าสู่ระบบ
src/app/admin/              หน้าของเจ้าของหอ + actions.ts (server actions)
src/app/tenant/             หน้าของผู้เช่า + actions.ts (สร้าง Stripe Checkout)
src/app/api/stripe/webhook  รับ webhook จาก Stripe
```
