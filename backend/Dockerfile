FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 4000
# ครั้งแรกที่ฐานข้อมูลยังว่าง จะสร้างตาราง + ข้อมูลตัวอย่างให้อัตโนมัติ
CMD ["sh", "-c", "node db/init.js --seed --if-empty && node src/server.js"]
