# Prompt Studio — คู่มือระบบรหัส one-time (สำหรับเจ้าของ)

## โครงสร้างระบบ
```
ลูกค้าโอนเงิน → ส่งสลิปทาง LINE (@238tqjem) → พี่สร้าง+ส่งรหัสกลับ
→ ลูกค้าใส่รหัสในเว็บ → เว็บเรียก Apps Script → เช็ค Google Sheet → ปลดล็อก (ใช้ได้ครั้งเดียว)
```

## ไฟล์ที่เกี่ยวข้อง
- `apps-script/Code.gs` — โค้ด backend (deploy บน Google Apps Script แล้ว)
- Google Sheet "Onetime PW-PromptStudio" — ฐานข้อมูล (ชีต `Codes` = คลังรหัส, ชีต `Members` = รายชื่อสมาชิก)
- `index.html` — `STORE.api` เก็บ Web App URL

## การใช้งานประจำวัน

### เพิ่มรหัสใหม่
1. เปิด Apps Script project → เลือกฟังก์ชัน `addCodes` → แก้พารามิเตอร์ในบรรทัดรัน:
   ใช้หน้า editor พิมพ์: `addCodes('yearly', 10)` แล้วกด ▶ Run
   - plan มี 2 ค่า: `'monthly'` (30 วัน) หรือ `'yearly'` (365 วัน)
2. เปิด Google Sheet → ชีต `Codes` → copy รหัสใหม่ (status = unused) ส่งลูกค้าทาง LINE

### ดูรายงานสมาชิก (Admin)
เปิดในเบราว์เซอร์:
```
https://script.google.com/macros/s/AKfycbyB_n0TdsE8sPT2C7d0-yloErPKe4nTm34_PaWRTvueSJGknIiA5LJTM0cqnLiUUNyE/exec?action=admin&pw=CHANGE-ME-1234
```
(เปลี่ยน pw= ตาม ADMIN_PW ที่ตั้งไว้ใน Code.gs — ถ้ายังไม่เปลี่ยน อย่าลืมเปลี่ยนก่อนเปิดขายจริง!)
แสดง: สมาชิกทั้งหมด (วันสมัคร/แพ็ก/รหัส/วันหมดอายุ) + โค้ดคงเหลือ

### กฎ one-time
- รหัส 1 ตัว ใช้ได้ 1 ครั้ง ใครก็ได้ ใช้แล้ว status เปลี่ยนเป็น used ทันที
- ใช้ซ้ำ → ระบบปฏิเสธ "รหัสนี้ถูกใช้ไปแล้ว"
- ลูกค้าสลับเครื่อง/ล้าง browser ไม่กระทบ เพราะสิทธิ์ผูกกับรหัสไม่ใช่เครื่อง

## สำคัญ: ทุกครั้งที่แก้ Code.gs
ต้อง **Deploy → Manage deployments → ✏️ → New version → Deploy** ไม่งั้นเว็บยังใช้ของเก่า

## เพิ่มผู้ซื้อ (buyer) ในรายงาน
ช่อง buyer ว่างไว้ได้ — ถ้าอยากจับคู่รหัสกับลูกค้า ให้แก้ในชีต Members คอลัมน์ buyer เอง (เช่นชื่อ LINE ลูกค้า)
